"""
Global threat predictor using KMeans clustering model.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any

from sklearn.metrics import pairwise_distances

from src.inference.model_loader import get_model
from src.utils.logger import logger


def predict_global_threat(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predict global threat score using KMeans clustering.
    
    Expected features:
    - distinct_accounts_per_ip: int
    - failed_logins_per_ip: int
    - geo_spread_count: int
    - device_fingerprint_reuse_count: int
    - tor_usage_flag: int (0 or 1)
    - vpn_usage_flag: int (0 or 1)
    - credential_stuffing_pattern_flag: int (0 or 1)
    - attack_wave_intensity: float
    
    Args:
        features: Dictionary containing global threat features
    
    Returns:
        Dictionary with model name, threat score (0-1), cluster label, and confidence
    """
    try:
        model = get_model("global")
        
        # Convert features to DataFrame
        feature_order = [
            "distinct_accounts_per_ip",
            "failed_logins_per_ip",
            "geo_spread_count",
            "device_fingerprint_reuse_count",
            "tor_usage_flag",
            "vpn_usage_flag",
            "credential_stuffing_pattern_flag",
            "attack_wave_intensity",
        ]
        
        # Ensure all features are present
        missing_features = [f for f in feature_order if f not in features]
        if missing_features:
            raise ValueError(f"Missing required features: {missing_features}")
        
        # Create DataFrame with single row
        df = pd.DataFrame([features])[feature_order]
        
        # Get scaler and clusterer from pipeline
        scaler = model.named_steps["scaler"]
        clusterer = model.named_steps["model"]
        
        # Transform features
        scaled_features = scaler.transform(df)
        
        # Predict cluster
        cluster_label = int(clusterer.predict(scaled_features)[0])
        
        # Calculate distance to cluster center
        cluster_center = clusterer.cluster_centers_[cluster_label]
        distance = float(np.linalg.norm(scaled_features[0] - cluster_center))
        
        # Calculate distance to all cluster centers
        distances_to_all = pairwise_distances(scaled_features, clusterer.cluster_centers_)[0]
        min_distance = float(np.min(distances_to_all))
        max_distance = float(np.max(distances_to_all))
        
        # Normalize distance to threat score (0-1)
        # Higher distance from center = higher threat
        if max_distance > min_distance:
            threat_score = (distance - min_distance) / (max_distance - min_distance)
        else:
            threat_score = 0.5  # Default if all distances are similar
        
        # Clamp to [0, 1]
        threat_score = max(0.0, min(1.0, threat_score))
        
        # Confidence based on how close to cluster center
        # Closer to center = higher confidence
        avg_distance = float(np.mean(distances_to_all))
        confidence = 1.0 - min(1.0, distance / (avg_distance + 1e-6))
        confidence = max(0.5, min(1.0, confidence))
        
        logger.info(
            f"Global prediction - Cluster: {cluster_label}, Distance: {distance:.4f}, "
            f"Threat score: {threat_score:.4f}, Confidence: {confidence:.4f}"
        )
        
        return {
            "model": "global",
            "score": round(threat_score, 4),
            "confidence": round(confidence, 4),
            "cluster_label": cluster_label,
            "distance_to_center": round(distance, 4),
        }
    
    except Exception as e:
        logger.error(f"Error in global prediction: {e}")
        raise
