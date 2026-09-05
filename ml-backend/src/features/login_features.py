"""
Feature engineering for login anomaly detection.
"""
import pandas as pd
import numpy as np
from typing import List, Optional


def extract_login_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract and engineer features for login anomaly detection.
    
    Expected input columns:
    - login_hour: Hour of login (0-23)
    - device_known: Whether device is known (0 or 1)
    - country_changed: Whether country changed (0 or 1)
    - login_velocity: Login velocity (logins per hour)
    - ip_reputation_score: IP reputation score (0-1)
    - asn_changed: Whether ASN changed (0 or 1)
    - failed_attempts: Number of failed login attempts
    - mfa_failures: Number of MFA failures
    
    Args:
        df: Input DataFrame with raw login data
    
    Returns:
        DataFrame with engineered features
    """
    features_df = df.copy()
    
    # Ensure all required columns exist
    required_cols = [
        "login_hour",
        "device_known",
        "country_changed",
        "login_velocity",
        "ip_reputation_score",
        "asn_changed",
        "failed_attempts",
        "mfa_failures",
    ]
    
    missing_cols = [col for col in required_cols if col not in features_df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")
    
    # Feature: Time-based risk (off-hours are riskier)
    features_df["is_off_hours"] = (
        (features_df["login_hour"] < 6) | (features_df["login_hour"] > 22)
    ).astype(int)
    
    # Feature: Combined suspicious flags
    features_df["suspicious_flags_count"] = (
        features_df["country_changed"]
        + features_df["asn_changed"]
        + (features_df["device_known"] == 0).astype(int)
    )
    
    # Feature: Risk score combination
    features_df["combined_risk_score"] = (
        (1 - features_df["ip_reputation_score"]) * 0.4
        + (features_df["failed_attempts"] / 10).clip(0, 1) * 0.3
        + (features_df["mfa_failures"] / 5).clip(0, 1) * 0.3
    )
    
    # Feature: Velocity risk (high velocity = suspicious)
    features_df["velocity_risk"] = np.where(
        features_df["login_velocity"] > 5, 1, 0
    )
    
    # Select final feature set
    feature_columns = [
        "login_hour",
        "device_known",
        "country_changed",
        "login_velocity",
        "ip_reputation_score",
        "asn_changed",
        "failed_attempts",
        "mfa_failures",
    ]
    
    return features_df[feature_columns]


def get_login_feature_names() -> List[str]:
    """
    Get list of feature names for login model.
    
    Returns:
        List of feature names
    """
    return [
        "login_hour",
        "device_known",
        "country_changed",
        "login_velocity",
        "ip_reputation_score",
        "asn_changed",
        "failed_attempts",
        "mfa_failures",
    ]
