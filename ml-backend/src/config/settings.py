"""
Configuration settings for the ML Backend Service.
"""
import os
from pathlib import Path
from typing import Optional

# Base directory (ml-backend root)
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Weights directory - weights are in ml-backend/weights
WEIGHTS_DIR = BASE_DIR / "weights"

# Model file names
MODEL_FILES = {
    "login": "login_model_v1.pkl",
    "session": "session_model_v1.pkl",
    "device": "device_trust_model_v1.pkl",
    "baseline": "baseline_model_v1.pkl",
    "global": "global_threat_model_v1.pkl",
}

# Risk aggregation weights
RISK_WEIGHTS = {
    "login": 0.20,
    "session": 0.20,
    "device": 0.15,
    "baseline": 0.15,
    "global": 0.10,
    "rule_based": 0.20,  # Placeholder for rule-based component
}

# Risk level thresholds (0-1 scale)
RISK_THRESHOLDS = {
    "LOW": (0.0, 0.30),
    "MEDIUM": (0.31, 0.60),
    "HIGH": (0.61, 0.80),
    "CRITICAL": (0.81, 1.0),
}

# API Settings
API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
API_PORT: int = int(os.getenv("API_PORT", "8000"))
API_RELOAD: bool = os.getenv("API_RELOAD", "false").lower() == "true"

# Logging
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
