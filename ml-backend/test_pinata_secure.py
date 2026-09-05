import os
import json
from src.utils.encryption import encrypt_metadata, decrypt_metadata
from src.utils.pinata import pin_metadata_to_ipfs

def test_secure_storage():
    print("--- Starting Secure Storage Test ---")
    
    # 1. Test Data
    mock_meta = {
        "user_email": "tester@pinata.test",
        "secret_flag": "CONFIDENTIAL",
        "timestamp": "2026-04-04 15:45:00"
    }
    
    # 2. Test Encryption
    print("\n[Step 1] Testing Encryption...")
    encrypted = encrypt_metadata(mock_meta)
    print(f"Encrypted String (Base64): {encrypted[:40]}...")
    
    decrypted = decrypt_metadata(encrypted)
    print(f"Decrypted Data: {decrypted}")
    
    assert decrypted["secret_flag"] == "CONFIDENTIAL", "Decryption failed!"
    print("Encryption/Decryption SUCCESS.")
    
    # 3. Test Pinata Pinning
    print("\n[Step 2] Testing Pinata Pinning...")
    cid = pin_metadata_to_ipfs(encrypted, filename="test_encrypted_meta.enc.json")
    
    if cid:
        print(f"Pinning SUCCESS. CID: {cid}")
        print(f"Verify at: https://gateway.pinata.cloud/ipfs/{cid}")
    else:
        print("Pinning FAILED. Check logs for details.")

if __name__ == "__main__":
    test_secure_storage()
