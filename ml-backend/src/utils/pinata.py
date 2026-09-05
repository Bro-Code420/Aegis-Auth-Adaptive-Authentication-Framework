import os
import requests
import json
from dotenv import load_dotenv
from src.utils.logger import logger

# Environment variables should be managed at the application level or via host/docker
# load_dotenv() is called in the main entry point if needed

PINATA_JWT = os.getenv("PINATA_JWT")
PINATA_API_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS"

def pin_metadata_to_ipfs(encrypted_data: str, filename: str = "metadata.enc.json") -> str:
    """
    Pins encrypted metadata string to IPFS via Pinata.
    Returns: The IPFS CID (Hash)
    """
    if not PINATA_JWT:
        logger.error("PINATA_JWT not found in environment.")
        return None

    headers = {
        "Authorization": f"Bearer {PINATA_JWT}",
        "Content-Type": "application/json"
    }

    # Data to pin
    payload = {
        "pinataContent": {
            "encryptedMetadata": encrypted_data,
            "info": "This data is AES-256 encrypted. Access requires the AegisAuth Master Key."
        },
        "pinataMetadata": {
            "name": filename
        }
    }

    try:
        response = requests.post(PINATA_API_URL, headers=headers, json=payload, timeout=15)
        response.raise_for_status()
        
        result = response.json()
        cid = result.get("IpfsHash")
        logger.info(f"Successfully pinned metadata to IPFS. CID: {cid}")
        return cid
    except Exception as e:
        logger.error(f"Failed to pin metadata to Pinata: {str(e)}")
        return None
