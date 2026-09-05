"""
Feature engineering for global threat detection.
"""
import pandas as pd
import numpy as np
from typing import List


def extract_global_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract and engineer features for global threat detection.
    
    Expected input columns:
    - distinct_accounts_per_ip: Distinct accounts per IP
    - failed_logins_per_ip: Failed logins per IP
    - geo_spread_count: Geographic spread count
    - device_fingerprint_reuse_count: Device fingerprint reuse count
    - tor_usage_flag: TOR usage flag (0 or 1)
    - vpn_usage_flag: VPN usage flag (0 or 1)
    - credential_stuffing_pattern_flag: Credential stuffing pattern flag (0 or 1)
    - attack_wave_intensity: Attack wave intensity
    
    Args:
        df: Input DataFrame with raw global threat data
    
    Returns:
        DataFrame with engineered features
    """
    features_df = df.copy()
    
    # Ensure all required columns exist
    required_cols = [
        "distinct_accounts_per_ip",
        "failed_logins_per_ip",
        "geo_spread_count",
        "device_fingerprint_reuse_count",
        "tor_usage_flag",
        "vpn_usage_flag",
        "credential_stuffing_pattern_flag",
        "attack_wave_intensity",
    ]
    
    missing_cols = [col for col in required_cols if col not in features_df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")
    
    # Feature: Account diversity risk (multiple accounts from same IP)
    features_df["account_diversity_risk"] = np.where(
        features_df["distinct_accounts_per_ip"] > 3, 1, 0
    )
    
    # Feature: Failed login rate
    features_df["failed_login_rate"] = np.where(
        features_df["failed_logins_per_ip"] > 10, 1, 0
    )
    
    # Feature: Geographic anomaly (unusual geo spread)
    features_df["geo_anomaly"] = np.where(
        features_df["geo_spread_count"] > 5, 1, 0
    )
    
    # Feature: Device fingerprint reuse risk
    features_df["fingerprint_reuse_risk"] = np.where(
        features_df["device_fingerprint_reuse_count"] > 2, 1, 0
    )
    
    # Feature: Privacy tool usage (TOR + VPN)
    features_df["privacy_tool_usage"] = (
        features_df["tor_usage_flag"] + features_df["vpn_usage_flag"]
    )
    
    # Feature: Attack pattern indicators
    features_df["attack_indicators"] = (
        features_df["credential_stuffing_pattern_flag"]
        + (features_df["attack_wave_intensity"] > 0.5).astype(int)
    )
    
    # Feature: Combined threat score
    features_df["threat_score"] = (
        features_df["account_diversity_risk"] * 0.2
        + features_df["failed_login_rate"] * 0.2
        + features_df["geo_anomaly"] * 0.15
        + features_df["fingerprint_reuse_risk"] * 0.15
        + (features_df["privacy_tool_usage"] / 2.0) * 0.1
        + features_df["attack_indicators"] * 0.2
    )
    
    # Select final feature set
    feature_columns = [
        "distinct_accounts_per_ip",
        "failed_logins_per_ip",
        "geo_spread_count",
        "device_fingerprint_reuse_count",
        "tor_usage_flag",
        "vpn_usage_flag",
        "credential_stuffing_pattern_flag",
        "attack_wave_intensity",
    ]
    
    return features_df[feature_columns]


def get_global_feature_names() -> List[str]:
    """
    Get list of feature names for global threat model.
    
    Returns:
        List of feature names
    """
    return [
        "distinct_accounts_per_ip",
        "failed_logins_per_ip",
        "geo_spread_count",
        "device_fingerprint_reuse_count",
        "tor_usage_flag",
        "vpn_usage_flag",
        "credential_stuffing_pattern_flag",
        "attack_wave_intensity",
    ]
