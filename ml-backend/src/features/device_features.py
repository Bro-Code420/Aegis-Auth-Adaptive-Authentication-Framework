"""
Feature engineering for device trust prediction.
"""
import pandas as pd
import numpy as np
from typing import List


def extract_device_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract and engineer features for device trust prediction.
    
    Expected input columns:
    - successful_logins: Number of successful logins
    - failed_attempts: Number of failed attempts
    - mfa_failures: Number of MFA failures
    - device_age_days: Device age in days
    - days_since_last_seen: Days since device was last seen
    - past_anomaly_count: Past anomaly count
    - password_reset_events: Password reset events
    
    Args:
        df: Input DataFrame with raw device data
    
    Returns:
        DataFrame with engineered features
    """
    features_df = df.copy()
    
    # Ensure all required columns exist
    required_cols = [
        "successful_logins",
        "failed_attempts",
        "mfa_failures",
        "device_age_days",
        "days_since_last_seen",
        "past_anomaly_count",
        "password_reset_events",
    ]
    
    missing_cols = [col for col in required_cols if col not in features_df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")
    
    # Feature: Success rate
    total_attempts = features_df["successful_logins"] + features_df["failed_attempts"]
    features_df["success_rate"] = np.where(
        total_attempts > 0,
        features_df["successful_logins"] / total_attempts,
        0.0
    )
    
    # Feature: Failure rate
    features_df["failure_rate"] = np.where(
        total_attempts > 0,
        features_df["failed_attempts"] / total_attempts,
        0.0
    )
    
    # Feature: MFA failure rate
    features_df["mfa_failure_rate"] = np.where(
        features_df["successful_logins"] > 0,
        features_df["mfa_failures"] / features_df["successful_logins"],
        0.0
    )
    
    # Feature: Device recency (inverse of days since last seen)
    features_df["device_recency"] = 1.0 / (features_df["days_since_last_seen"] + 1)
    
    # Feature: Trust score (combination of factors)
    features_df["trust_score"] = (
        features_df["success_rate"] * 0.4
        + (1 - features_df["failure_rate"]) * 0.3
        + (features_df["device_age_days"] / 365).clip(0, 1) * 0.2
        + features_df["device_recency"] * 0.1
    )
    
    # Feature: Risk indicators count
    features_df["risk_indicators"] = (
        (features_df["failed_attempts"] > 5).astype(int)
        + (features_df["mfa_failures"] > 2).astype(int)
        + (features_df["past_anomaly_count"] > 0).astype(int)
        + (features_df["password_reset_events"] > 3).astype(int)
    )
    
    # Select final feature set
    feature_columns = [
        "successful_logins",
        "failed_attempts",
        "mfa_failures",
        "device_age_days",
        "days_since_last_seen",
        "past_anomaly_count",
        "password_reset_events",
    ]
    
    return features_df[feature_columns]


def get_device_feature_names() -> List[str]:
    """
    Get list of feature names for device model.
    
    Returns:
        List of feature names
    """
    return [
        "successful_logins",
        "failed_attempts",
        "mfa_failures",
        "device_age_days",
        "days_since_last_seen",
        "past_anomaly_count",
        "password_reset_events",
    ]
