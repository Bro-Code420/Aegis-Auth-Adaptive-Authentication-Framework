"""
Session drift anomaly predictor using IsolationForest model.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any

from src.inference.model_loader import get_model
from src.utils.logger import logger


def predict_session_anomaly(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predict session drift anomaly score.
    
    Expected features:
    - api_calls_per_min: float
    - sensitive_endpoint_access: int (0 or 1)
    - privilege_escalation_attempt: int (0 or 1)
    - session_duration_minutes: float
    - request_entropy: float
    - data_download_mb: float
    - token_reuse_flag: int (0 or 1)
    
    Args:
        features: Dictionary containing session features
    
    Returns:
        Dictionary with model name, anomaly score (0-1), and confidence
    """
    try:
        model = get_model("session")
        
        # Convert features to DataFrame
        feature_order = [
            "api_calls_per_min",
            "sensitive_endpoint_access",
            "privilege_escalation_attempt",
            "session_duration_minutes",
            "request_entropy",
            "data_download_mb",
            "token_reuse_flag",
        ]
        
        # Ensure all features are present
        missing_features = [f for f in feature_order if f not in features]
        if missing_features:
            raise ValueError(f"Missing required features: {missing_features}")
        
        # Create DataFrame with single row
        df = pd.DataFrame([features])[feature_order]
        
        # Get anomaly score using decision_function
        anomaly_scores = model.decision_function(df)
        raw_score = float(anomaly_scores[0])
        
        # Normalize to 0-1 range (anomaly score)
        min_score = -0.5
        max_score = 0.5
        normalized = (raw_score - min_score) / (max_score - min_score)
        anomaly_score = 1.0 - normalized  # Invert: lower decision_function = higher anomaly
        
        # Clamp to [0, 1]
        anomaly_score = max(0.0, min(1.0, anomaly_score))
        
        # Confidence based on distance from decision boundary
        confidence = abs(raw_score) * 2
        confidence = max(0.5, min(1.0, confidence))
        
        logger.info(
            f"Session prediction - Raw score: {raw_score:.4f}, "
            f"Anomaly score: {anomaly_score:.4f}, Confidence: {confidence:.4f}"
        )
        
        return {
            "model": "session",
            "score": round(anomaly_score, 4),
            "confidence": round(confidence, 4),
            "raw_score": round(raw_score, 4),
        }
    
    except Exception as e:
        logger.error(f"Error in session prediction: {e}")
        raise
