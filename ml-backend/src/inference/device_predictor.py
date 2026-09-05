"""
Device trust predictor using LogisticRegression model.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any

from src.inference.model_loader import get_model
from src.utils.logger import logger


def predict_device_trust(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predict device trust score (probability of low trust).
    
    Expected features:
    - successful_logins: int
    - failed_attempts: int
    - mfa_failures: int
    - device_age_days: int
    - days_since_last_seen: int
    - past_anomaly_count: int
    - password_reset_events: int
    
    Args:
        features: Dictionary containing device features
    
    Returns:
        Dictionary with model name, low trust probability (0-1), and confidence
    """
    try:
        model = get_model("device")
        
        # Convert features to DataFrame
        feature_order = [
            "successful_logins",
            "failed_attempts",
            "mfa_failures",
            "device_age_days",
            "days_since_last_seen",
            "past_anomaly_count",
            "password_reset_events",
        ]
        
        # Ensure all features are present
        missing_features = [f for f in feature_order if f not in features]
        if missing_features:
            raise ValueError(f"Missing required features: {missing_features}")
        
        # Create DataFrame with single row
        df = pd.DataFrame([features])[feature_order]
        
        # Get probability of low trust (class 1)
        probabilities = model.predict_proba(df)
        low_trust_prob = float(probabilities[0][1])  # Probability of class 1 (low trust)
        
        # Confidence is the difference between probabilities
        confidence = abs(probabilities[0][1] - probabilities[0][0])
        confidence = max(0.5, min(1.0, confidence))
        
        logger.info(
            f"Device prediction - Low trust probability: {low_trust_prob:.4f}, "
            f"Confidence: {confidence:.4f}"
        )
        
        return {
            "model": "device",
            "score": round(low_trust_prob, 4),
            "confidence": round(confidence, 4),
        }
    
    except Exception as e:
        logger.error(f"Error in device prediction: {e}")
        raise
