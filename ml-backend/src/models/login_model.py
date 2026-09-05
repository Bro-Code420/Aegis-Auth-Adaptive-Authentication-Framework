"""
Login anomaly detection model definition.
Uses IsolationForest for anomaly detection.
"""
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from typing import Dict, Any

from src.features.login_features import get_login_feature_names


def create_login_model(
    contamination: float = 0.05,
    random_state: int = 42,
    n_estimators: int = 100,
    max_samples: str = "auto",
) -> Pipeline:
    """
    Create login anomaly detection pipeline.
    
    Args:
        contamination: Expected proportion of anomalies (0-0.5)
        random_state: Random state for reproducibility
        n_estimators: Number of trees in IsolationForest
        max_samples: Number of samples to draw for each tree
    
    Returns:
        Scikit-learn Pipeline with scaler and IsolationForest
    """
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", IsolationForest(
            contamination=contamination,
            random_state=random_state,
            n_estimators=n_estimators,
            max_samples=max_samples,
        )),
    ])
    
    return pipeline


def get_model_config() -> Dict[str, Any]:
    """
    Get default model configuration.
    
    Returns:
        Dictionary with model configuration parameters
    """
    return {
        "contamination": 0.05,
        "random_state": 42,
        "n_estimators": 100,
        "max_samples": "auto",
        "features": get_login_feature_names(),
    }
