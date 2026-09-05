"""
User baseline anomaly predictor using IsolationForest model.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any

from src.inference.model_loader import get_model
from src.utils.logger import logger


def predict_baseline_anomaly(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predict user baseline anomaly score.
    
    Expected features:
    - login_hour_deviation: float
    - session_duration_deviation: float
    - api_call_deviation: float
    - usual_country_flag: int (0 or 1)
    - role_sensitivity_score: float (0-1)
    
    Args:
        features: Dictionary containing baseline features
    
    Returns:
        Dictionary with model name, anomaly score (0-1), and confidence
    """
    try:
        model = get_model("baseline")
        
        # Convert features to DataFrame
        feature_order = [
            "login_hour_deviation",
            "session_duration_deviation",
            "api_call_deviation",
            "usual_country_flag",
            "role_sensitivity_score",
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
            f"Baseline prediction - Raw score: {raw_score:.4f}, "
            f"Anomaly score: {anomaly_score:.4f}, Confidence: {confidence:.4f}"
        )
        
        return {
            "model": "baseline",
            "score": round(anomaly_score, 4),
            "confidence": round(confidence, 4),
            "raw_score": round(raw_score, 4),
        }
    
    except Exception as e:
        logger.error(f"Error in baseline prediction: {e}")
        raise
