"""
Global threat detection model definition.
Uses KMeans clustering for threat pattern detection.
"""
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from typing import Dict, Any

from src.features.global_features import get_global_feature_names


def create_global_model(
    n_clusters: int = 3,
    random_state: int = 42,
    n_init: int = 10,
    max_iter: int = 300,
) -> Pipeline:
    """
    Create global threat detection pipeline using KMeans clustering.
    
    Args:
        n_clusters: Number of clusters to form
        random_state: Random state for reproducibility
        n_init: Number of times to run with different centroid seeds
        max_iter: Maximum iterations for a single run
    
    Returns:
        Scikit-learn Pipeline with scaler and KMeans
    """
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", KMeans(
            n_clusters=n_clusters,
            random_state=random_state,
            n_init=n_init,
            max_iter=max_iter,
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
        "n_clusters": 3,
        "random_state": 42,
        "n_init": 10,
        "max_iter": 300,
        "features": get_global_feature_names(),
    }
