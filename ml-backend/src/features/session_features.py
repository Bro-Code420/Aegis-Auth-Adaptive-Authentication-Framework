"""
Feature engineering for session drift anomaly detection.
"""
import pandas as pd
import numpy as np
from typing import List


def extract_session_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract and engineer features for session drift detection.
    
    Expected input columns:
    - api_calls_per_min: API calls per minute
    - sensitive_endpoint_access: Sensitive endpoint access flag (0 or 1)
    - privilege_escalation_attempt: Privilege escalation attempt flag (0 or 1)
    - session_duration_minutes: Session duration in minutes
    - request_entropy: Request entropy score
    - data_download_mb: Data downloaded in MB
    - token_reuse_flag: Token reuse flag (0 or 1)
    
    Args:
        df: Input DataFrame with raw session data
    
    Returns:
        DataFrame with engineered features
    """
    features_df = df.copy()
    
    # Ensure all required columns exist
    required_cols = [
        "api_calls_per_min",
        "sensitive_endpoint_access",
        "privilege_escalation_attempt",
        "session_duration_minutes",
        "request_entropy",
        "data_download_mb",
        "token_reuse_flag",
    ]
    
    missing_cols = [col for col in required_cols if col not in features_df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")
    
    # Feature: API call rate risk (very high or very low = suspicious)
    features_df["api_rate_risk"] = np.where(
        (features_df["api_calls_per_min"] > 50) | (features_df["api_calls_per_min"] < 1),
        1, 0
    )
    
    # Feature: Combined security flags
    features_df["security_flags_count"] = (
        features_df["sensitive_endpoint_access"]
        + features_df["privilege_escalation_attempt"]
        + features_df["token_reuse_flag"]
    )
    
    # Feature: Data exfiltration risk
    features_df["data_exfiltration_risk"] = np.where(
        features_df["data_download_mb"] > 100, 1, 0
    )
    
    # Feature: Session duration risk (very long sessions = suspicious)
    features_df["duration_risk"] = np.where(
        features_df["session_duration_minutes"] > 480, 1, 0
    )
    
    # Feature: Entropy risk (low entropy = suspicious pattern)
    features_df["entropy_risk"] = np.where(
        features_df["request_entropy"] < 2.0, 1, 0
    )
    
    # Select final feature set
    feature_columns = [
        "api_calls_per_min",
        "sensitive_endpoint_access",
        "privilege_escalation_attempt",
        "session_duration_minutes",
        "request_entropy",
        "data_download_mb",
        "token_reuse_flag",
    ]
    
    return features_df[feature_columns]


def get_session_feature_names() -> List[str]:
    """
    Get list of feature names for session model.
    
    Returns:
        List of feature names
    """
    return [
        "api_calls_per_min",
        "sensitive_endpoint_access",
        "privilege_escalation_attempt",
        "session_duration_minutes",
        "request_entropy",
        "data_download_mb",
        "token_reuse_flag",
    ]
