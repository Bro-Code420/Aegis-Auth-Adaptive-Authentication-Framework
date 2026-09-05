"""
Login anomaly predictor using IsolationForest model.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any

from src.inference.model_loader import get_model
from src.utils.logger import logger


def predict_login_anomaly(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predict login anomaly score.
    
    Expected features:
    - login_hour: int (0-23)
    - device_known: int (0 or 1)
    - country_changed: int (0 or 1)
    - login_velocity: float
    - ip_reputation_score: float (0-1)
    - asn_changed: int (0 or 1)
    - failed_attempts: int
    - mfa_failures: int
    
    Args:
        features: Dictionary containing login features
    
    Returns:
        Dictionary with model name, anomaly score (0-1), and confidence
    """
    try:
        model = get_model("login")
        
        # Convert features to DataFrame
        feature_order = [
            "login_hour",
            "device_known",
            "country_changed",
            "login_velocity",
            "ip_reputation_score",
            "asn_changed",
            "failed_attempts",
            "mfa_failures",
        ]
        
        # Ensure all features are present
        missing_features = [f for f in feature_order if f not in features]
        if missing_features:
            raise ValueError(f"Missing required features: {missing_features}")
        
        # Create DataFrame with single row
        df = pd.DataFrame([features])[feature_order]
        
        # Get anomaly score using decision_function
        # IsolationForest returns negative scores for anomalies
        # Lower scores = more anomalous
        anomaly_scores = model.decision_function(df)
        raw_score = float(anomaly_scores[0])
        
        # Normalize to 0-1 range (anomaly score)
        # IsolationForest typically returns scores in range [-0.5, 0.5]
        # We'll normalize: score = (raw_score - min) / (max - min)
        # For anomaly: lower score = higher risk
        # We'll invert: anomaly_score = 1 - normalized_score
        min_score = -0.5
        max_score = 0.5
        normalized = (raw_score - min_score) / (max_score - min_score)
        anomaly_score = 1.0 - normalized  # Invert: lower decision_function = higher anomaly
        
        # Clamp to [0, 1]
        anomaly_score = max(0.0, min(1.0, anomaly_score))
        
        # Confidence based on distance from decision boundary
        confidence = abs(raw_score) * 2  # Scale to 0-1
        confidence = max(0.5, min(1.0, confidence))
        
        logger.info(
            f"Login prediction - Raw score: {raw_score:.4f}, "
            f"Anomaly score: {anomaly_score:.4f}, Confidence: {confidence:.4f}"
        )
        
        return {
            "model": "login",
            "score": round(anomaly_score, 4),
            "confidence": round(confidence, 4),
            "raw_score": round(raw_score, 4),
        }
    
    except Exception as e:
        logger.error(f"Error in login prediction: {e}")
        raise
