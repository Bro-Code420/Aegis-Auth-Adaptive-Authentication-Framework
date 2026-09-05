"""
Device trust prediction model definition.
Uses LogisticRegression for binary classification.
"""
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from typing import Dict, Any

from src.features.device_features import get_device_feature_names


def create_device_model(
    random_state: int = 42,
    max_iter: int = 1000,
    C: float = 1.0,
    penalty: str = "l2",
    solver: str = "lbfgs",
) -> Pipeline:
    """
    Create device trust prediction pipeline.
    
    Args:
        random_state: Random state for reproducibility
        max_iter: Maximum iterations for convergence
        C: Inverse of regularization strength
        penalty: Regularization penalty type
        solver: Algorithm to use for optimization
    
    Returns:
        Scikit-learn Pipeline with scaler and LogisticRegression
    """
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", LogisticRegression(
            random_state=random_state,
            max_iter=max_iter,
            C=C,
            penalty=penalty,
            solver=solver,
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
        "random_state": 42,
        "max_iter": 1000,
        "C": 1.0,
        "penalty": "l2",
        "solver": "lbfgs",
        "features": get_device_feature_names(),
    }
