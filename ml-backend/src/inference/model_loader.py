"""
Hardened Model Loader with Cryptographic Integrity Verification & Provenance Tracking.
Guards against untrusted serialized artifacts and supply-chain tampering.
"""
import hashlib
import joblib
from pathlib import Path
from typing import Dict, Any, Optional

from src.config.settings import WEIGHTS_DIR, MODEL_FILES
from src.security.model_signer import model_signer
from src.utils.logger import logger


def calculate_file_sha256(filepath: Path) -> str:
    """Calculates the SHA-256 checksum of a model file."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


class ModelLoader:
    """
    Hardened singleton for loading and managing verified ML models.
    """
    _instance: Optional['ModelLoader'] = None
    _models: Dict[str, Any] = {}
    _provenance: Dict[str, Dict[str, Any]] = {}
    _loaded: bool = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
        return cls._instance
    
    def load_models(self) -> Dict[str, Any]:
        """
        Load and verify all models from the weights directory.
        """
        if self._loaded:
            logger.info("Models already loaded and verified, returning cached models")
            return self._models
        
        logger.info(f"Loading and verifying models from: {WEIGHTS_DIR}")
        
        if not WEIGHTS_DIR.exists():
            raise FileNotFoundError(
                f"Weights directory not found: {WEIGHTS_DIR}. "
                f"Please ensure model weights are saved in this location."
            )
        
        self._models = {}
        self._provenance = {}
        missing_files = []
        
        for model_name, filename in MODEL_FILES.items():
            model_path = WEIGHTS_DIR / filename
            
            if not model_path.exists():
                missing_files.append(str(model_path))
                continue
            
            try:
                # 1. Cryptographic Ed25519 digital signature & integrity check
                verification_result = model_signer.verify_model(filename, model_path)
                file_size = model_path.stat().st_size
                sha256_hash = verification_result["sha256"]
                
                logger.info(f"Verified {model_name} (Signer: {verification_result['signer']}, SHA256: {sha256_hash[:12]}...)")
                
                # 2. Deserialization after signature verification passed
                model = joblib.load(model_path)
                self._models[model_name] = model
                self._provenance[model_name] = {
                    "filename": filename,
                    "sha256": sha256_hash,
                    "signer": verification_result["signer"],
                    "version": verification_result["version"],
                    "size_bytes": file_size,
                    "status": "VERIFIED_ACTIVE"
                }
                logger.info(f"Successfully loaded and verified {model_name} model")
            except Exception as e:
                logger.error(f"Failed to load/verify {model_name} model: {e}")
                raise Exception(f"Cryptographic provenance rejection for {model_name}: {e}")
        
        if missing_files:
            raise FileNotFoundError(
                f"Missing model files: {', '.join(missing_files)}. "
                f"Please ensure all models are trained and saved."
            )
        
        self._loaded = True
        logger.info(f"Successfully verified and loaded {len(self._models)} models")
        return self._models
    
    def get_models(self) -> Dict[str, Any]:
        if not self._loaded:
            return self.load_models()
        return self._models
    
    def get_model(self, model_name: str) -> Any:
        models = self.get_models()
        if model_name not in models:
            raise KeyError(
                f"Model '{model_name}' not found. Available models: {list(models.keys())}"
            )
        return models[model_name]
    
    def get_provenance(self) -> Dict[str, Dict[str, Any]]:
        """Returns model provenance and integrity verification metadata."""
        if not self._loaded:
            self.load_models()
        return self._provenance
    
    def reload_models(self) -> Dict[str, Any]:
        logger.info("Force reloading all models")
        self._loaded = False
        self._models = {}
        self._provenance = {}
        return self.load_models()


_model_loader = ModelLoader()


def get_models() -> Dict[str, Any]:
    return _model_loader.get_models()


def get_model(model_name: str) -> Any:
    return _model_loader.get_model(model_name)


def get_provenance() -> Dict[str, Dict[str, Any]]:
    return _model_loader.get_provenance()
