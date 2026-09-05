"""
Feature engineering for user baseline anomaly detection.
"""
import pandas as pd
import numpy as np
from typing import List


def extract_baseline_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract and engineer features for user baseline anomaly detection.
    
    Expected input columns:
    - login_hour_deviation: Deviation from usual login hour
    - session_duration_deviation: Deviation from usual session duration
    - api_call_deviation: Deviation from usual API call pattern
    - usual_country_flag: Usual country flag (0 or 1)
    - role_sensitivity_score: Role sensitivity score (0-1)
    
    Args:
        df: Input DataFrame with raw baseline data
    
    Returns:
        DataFrame with engineered features
    """
    features_df = df.copy()
    
    # Ensure all required columns exist
    required_cols = [
        "login_hour_deviation",
        "session_duration_deviation",
        "api_call_deviation",
        "usual_country_flag",
        "role_sensitivity_score",
    ]
    
    missing_cols = [col for col in required_cols if col not in features_df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")
    
    # Feature: Absolute deviations (magnitude matters)
    features_df["abs_login_hour_deviation"] = np.abs(features_df["login_hour_deviation"])
    features_df["abs_session_duration_deviation"] = np.abs(features_df["session_duration_deviation"])
    features_df["abs_api_call_deviation"] = np.abs(features_df["api_call_deviation"])
    
    # Feature: Combined deviation score
    features_df["combined_deviation"] = (
        features_df["abs_login_hour_deviation"] / 12.0  # Normalize by max possible (12 hours)
        + features_df["abs_session_duration_deviation"] / 240.0  # Normalize by max (4 hours)
        + features_df["abs_api_call_deviation"] / 50.0  # Normalize by max
    ) / 3.0
    
    # Feature: Country anomaly flag (inverse of usual_country_flag)
    features_df["country_anomaly"] = 1 - features_df["usual_country_flag"]
    
    # Feature: Risk-weighted deviation (higher risk for sensitive roles)
    features_df["risk_weighted_deviation"] = (
        features_df["combined_deviation"] * features_df["role_sensitivity_score"]
    )
    
    # Feature: Anomaly flags count
    features_df["anomaly_flags"] = (
        (features_df["abs_login_hour_deviation"] > 3).astype(int)
        + (features_df["abs_session_duration_deviation"] > 60).astype(int)
        + (features_df["abs_api_call_deviation"] > 20).astype(int)
        + features_df["country_anomaly"]
    )
    
    # Select final feature set
    feature_columns = [
        "login_hour_deviation",
        "session_duration_deviation",
        "api_call_deviation",
        "usual_country_flag",
        "role_sensitivity_score",
    ]
    
    return features_df[feature_columns]


def get_baseline_feature_names() -> List[str]:
    """
    Get list of feature names for baseline model.
    
    Returns:
        List of feature names
    """
    return [
        "login_hour_deviation",
        "session_duration_deviation",
        "api_call_deviation",
        "usual_country_flag",
        "role_sensitivity_score",
    ]
