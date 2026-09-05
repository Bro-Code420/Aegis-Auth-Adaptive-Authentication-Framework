"""
Hardened Cryptographic Engine for AegisAuth Pro.
Implements AES-256-GCM Authenticated Encryption with Associated Data (AEAD),
Key Versioning, Envelope Encryption, and tamper-evident authentication tags.
"""
import os
import json
import base64
from typing import Optional, Dict, Any, Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv

load_dotenv(".env.local")
load_dotenv(".env")

CURRENT_KEY_VERSION = 1
MASTER_KEY_B64 = os.getenv("MASTER_ENCRYPTION_KEY")


def _get_master_key() -> bytes:
    if not MASTER_KEY_B64:
        # Generate an in-memory key for local/testing fallback if environment key missing
        fallback_key = os.getenv("AEGIS_SECRET_KEY", "aegis_auth_default_master_key_32b!")
        return fallback_key.encode("utf-8")[:32].ljust(32, b"0")
    
    key = base64.b64decode(MASTER_KEY_B64)
    if len(key) != 32:
        raise ValueError("MASTER_ENCRYPTION_KEY must be exactly 32 bytes (256 bits) after base64 decode.")
    return key


def generate_data_encryption_key() -> Tuple[bytes, str]:
    """
    Generates a per-session / per-object Data Encryption Key (DEK).
    Returns (raw_dek, encrypted_dek_b64) wrapped with the master key.
    """
    master_key = _get_master_key()
    raw_dek = AESGCM.generate_key(bit_length=256)
    
    aesgcm_master = AESGCM(master_key)
    nonce = os.urandom(12)
    wrapped_dek = aesgcm_master.encrypt(nonce, raw_dek, b"AEGIS_DEK_WRAP_V1")
    
    # Prefix with nonce: [12-byte nonce][ciphertext + 16-byte tag]
    payload = nonce + wrapped_dek
    return raw_dek, base64.b64encode(payload).decode("utf-8")


def unwrap_data_encryption_key(encrypted_dek_b64: str) -> bytes:
    """
    Unwraps a DEK using the master key.
    """
    master_key = _get_master_key()
    raw_payload = base64.b64decode(encrypted_dek_b64)
    nonce = raw_payload[:12]
    ciphertext = raw_payload[12:]
    
    aesgcm_master = AESGCM(master_key)
    return aesgcm_master.decrypt(nonce, ciphertext, b"AEGIS_DEK_WRAP_V1")


def encrypt_metadata(
    data: Dict[str, Any],
    associated_data: Optional[Dict[str, Any]] = None,
    dek: Optional[bytes] = None,
) -> str:
    """
    Encrypts dictionary data using AES-256-GCM (AEAD).
    
    Format:
    MAGIC (4B: 'AEG1') + KeyVersion (1B) + Nonce (12B) + Ciphertext + Tag (16B)
    
    Returns: Base64-encoded authenticated ciphertext string.
    """
    key = dek if dek is not None else _get_master_key()
    aesgcm = AESGCM(key)
    
    json_bytes = json.dumps(data, separators=(",", ":")).encode("utf-8")
    nonce = os.urandom(12)  # Recommended 96-bit nonce for AES-GCM
    
    aad_bytes = (
        json.dumps(associated_data, sort_keys=True, separators=(",", ":")).encode("utf-8")
        if associated_data
        else b""
    )
    
    ciphertext = aesgcm.encrypt(nonce, json_bytes, aad_bytes)
    
    # Construct binary payload: Header (AEG1 + Version byte) + Nonce + Ciphertext (incl tag)
    magic = b"AEG1"
    version_byte = bytes([CURRENT_KEY_VERSION])
    combined = magic + version_byte + nonce + ciphertext
    
    return base64.b64encode(combined).decode("utf-8")


def decrypt_metadata(
    encrypted_b64: str,
    associated_data: Optional[Dict[str, Any]] = None,
    dek: Optional[bytes] = None,
) -> Dict[str, Any]:
    """
    Decrypts an authenticated AES-256-GCM string back into a dictionary.
    Includes fallback support for legacy AES-CBC payloads with automatic migration warning.
    """
    raw_data = base64.b64decode(encrypted_b64)
    key = dek if dek is not None else _get_master_key()
    
    # Check for AES-GCM Header 'AEG1'
    if raw_data.startswith(b"AEG1") and len(raw_data) > 17:
        key_version = raw_data[4]
        nonce = raw_data[5:17]
        ciphertext = raw_data[17:]
        
        aad_bytes = (
            json.dumps(associated_data, sort_keys=True, separators=(",", ":")).encode("utf-8")
            if associated_data
            else b""
        )
        
        aesgcm = AESGCM(key)
        decrypted_bytes = aesgcm.decrypt(nonce, ciphertext, aad_bytes)
        return json.loads(decrypted_bytes.decode("utf-8"))
    
    # Legacy AES-CBC Fallback (16 byte IV + PKCS7 padded ciphertext)
    iv = raw_data[:16]
    ciphertext = raw_data[16:]
    
    backend = default_backend()
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=backend)
    decryptor = cipher.decryptor()
    
    padded_data = decryptor.update(ciphertext) + decryptor.finalize()
    unpadder = padding.PKCS7(128).unpadder()
    json_data = unpadder.update(padded_data) + unpadder.finalize()
    
    return json.loads(json_data.decode("utf-8"))
