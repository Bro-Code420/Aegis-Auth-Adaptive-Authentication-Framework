"""
Pydantic schemas for request/response validation.
"""
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, validator


# ============================================================================
# Request Schemas
# ============================================================================

class LoginRequest(BaseModel):
    """Login anomaly detection request schema."""
    login_hour: int = Field(..., ge=0, le=23, description="Hour of login (0-23)")
    device_known: int = Field(..., ge=0, le=1, description="Device known flag (0 or 1)")
    country_changed: int = Field(..., ge=0, le=1, description="Country changed flag (0 or 1)")
    login_velocity: float = Field(..., ge=0.0, description="Login velocity (logins per hour)")
    ip_reputation_score: float = Field(..., ge=0.0, le=1.0, description="IP reputation score (0-1)")
    asn_changed: int = Field(..., ge=0, le=1, description="ASN changed flag (0 or 1)")
    failed_attempts: int = Field(..., ge=0, description="Number of failed login attempts")
    mfa_failures: int = Field(..., ge=0, description="Number of MFA failures")
    
    class Config:
        json_schema_extra = {
            "example": {
                "login_hour": 14,
                "device_known": 1,
                "country_changed": 0,
                "login_velocity": 2.5,
                "ip_reputation_score": 0.85,
                "asn_changed": 0,
                "failed_attempts": 0,
                "mfa_failures": 0,
            }
        }


class SessionRequest(BaseModel):
    """Session drift anomaly detection request schema."""
    api_calls_per_min: float = Field(..., ge=0.0, description="API calls per minute")
    sensitive_endpoint_access: int = Field(..., ge=0, le=1, description="Sensitive endpoint access flag (0 or 1)")
    privilege_escalation_attempt: int = Field(..., ge=0, le=1, description="Privilege escalation attempt flag (0 or 1)")
    session_duration_minutes: float = Field(..., ge=0.0, description="Session duration in minutes")
    request_entropy: float = Field(..., ge=0.0, description="Request entropy score")
    data_download_mb: float = Field(..., ge=0.0, description="Data downloaded in MB")
    token_reuse_flag: int = Field(..., ge=0, le=1, description="Token reuse flag (0 or 1)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "api_calls_per_min": 15.5,
                "sensitive_endpoint_access": 0,
                "privilege_escalation_attempt": 0,
                "session_duration_minutes": 45.0,
                "request_entropy": 3.2,
                "data_download_mb": 2.5,
                "token_reuse_flag": 0,
            }
        }


class DeviceRequest(BaseModel):
    """Device trust prediction request schema."""
    successful_logins: int = Field(..., ge=0, description="Number of successful logins")
    failed_attempts: int = Field(..., ge=0, description="Number of failed attempts")
    mfa_failures: int = Field(..., ge=0, description="Number of MFA failures")
    device_age_days: int = Field(..., ge=0, description="Device age in days")
    days_since_last_seen: int = Field(..., ge=0, description="Days since device was last seen")
    past_anomaly_count: int = Field(..., ge=0, description="Past anomaly count")
    password_reset_events: int = Field(..., ge=0, description="Password reset events")
    
    class Config:
        json_schema_extra = {
            "example": {
                "successful_logins": 150,
                "failed_attempts": 2,
                "mfa_failures": 0,
                "device_age_days": 90,
                "days_since_last_seen": 1,
                "past_anomaly_count": 0,
                "password_reset_events": 1,
            }
        }


class BaselineRequest(BaseModel):
    """User baseline anomaly detection request schema."""
    login_hour_deviation: float = Field(..., description="Deviation from usual login hour")
    session_duration_deviation: float = Field(..., description="Deviation from usual session duration")
    api_call_deviation: float = Field(..., description="Deviation from usual API call pattern")
    usual_country_flag: int = Field(..., ge=0, le=1, description="Usual country flag (0 or 1)")
    role_sensitivity_score: float = Field(..., ge=0.0, le=1.0, description="Role sensitivity score (0-1)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "login_hour_deviation": 2.5,
                "session_duration_deviation": 10.0,
                "api_call_deviation": 5.0,
                "usual_country_flag": 1,
                "role_sensitivity_score": 0.7,
            }
        }


class GlobalRequest(BaseModel):
    """Global threat detection request schema."""
    distinct_accounts_per_ip: int = Field(..., ge=0, description="Distinct accounts per IP")
    failed_logins_per_ip: int = Field(..., ge=0, description="Failed logins per IP")
    geo_spread_count: int = Field(..., ge=0, description="Geographic spread count")
    device_fingerprint_reuse_count: int = Field(..., ge=0, description="Device fingerprint reuse count")
    tor_usage_flag: int = Field(..., ge=0, le=1, description="TOR usage flag (0 or 1)")
    vpn_usage_flag: int = Field(..., ge=0, le=1, description="VPN usage flag (0 or 1)")
    credential_stuffing_pattern_flag: int = Field(..., ge=0, le=1, description="Credential stuffing pattern flag (0 or 1)")
    attack_wave_intensity: float = Field(..., ge=0.0, description="Attack wave intensity")
    
    class Config:
        json_schema_extra = {
            "example": {
                "distinct_accounts_per_ip": 1,
                "failed_logins_per_ip": 0,
                "geo_spread_count": 1,
                "device_fingerprint_reuse_count": 0,
                "tor_usage_flag": 0,
                "vpn_usage_flag": 0,
                "credential_stuffing_pattern_flag": 0,
                "attack_wave_intensity": 0.0,
            }
        }


class UnifiedRiskRequest(BaseModel):
    """Unified risk assessment request containing all sub-objects."""
    login: LoginRequest
    session: SessionRequest
    device: DeviceRequest
    baseline: BaselineRequest
    global_threat: GlobalRequest
    rule_based_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Optional rule-based score (0-1)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "login": {
                    "login_hour": 14,
                    "device_known": 1,
                    "country_changed": 0,
                    "login_velocity": 2.5,
                    "ip_reputation_score": 0.85,
                    "asn_changed": 0,
                    "failed_attempts": 0,
                    "mfa_failures": 0,
                },
                "session": {
                    "api_calls_per_min": 15.5,
                    "sensitive_endpoint_access": 0,
                    "privilege_escalation_attempt": 0,
                    "session_duration_minutes": 45.0,
                    "request_entropy": 3.2,
                    "data_download_mb": 2.5,
                    "token_reuse_flag": 0,
                },
                "device": {
                    "successful_logins": 150,
                    "failed_attempts": 2,
                    "mfa_failures": 0,
                    "device_age_days": 90,
                    "days_since_last_seen": 1,
                    "past_anomaly_count": 0,
                    "password_reset_events": 1,
                },
                "baseline": {
                    "login_hour_deviation": 2.5,
                    "session_duration_deviation": 10.0,
                    "api_call_deviation": 5.0,
                    "usual_country_flag": 1,
                    "role_sensitivity_score": 0.7,
                },
                "global_threat": {
                    "distinct_accounts_per_ip": 1,
                    "failed_logins_per_ip": 0,
                    "geo_spread_count": 1,
                    "device_fingerprint_reuse_count": 0,
                    "tor_usage_flag": 0,
                    "vpn_usage_flag": 0,
                    "credential_stuffing_pattern_flag": 0,
                    "attack_wave_intensity": 0.0,
                },
                "rule_based_score": None,
            }
        }


class FingerprintPayload(BaseModel):
    """Device fingerprint payload from SDK."""
    userAgent: str
    platform: str
    screenResolution: str
    timezone: str
    hardwareConcurrency: int
    language: str
    cookieEnabled: bool
    doNotTrack: Optional[str] = None
    timestamp: int


class SDKSimulateFlags(BaseModel):
    """Simulation flags from SDK."""
    newDevice: Optional[bool] = None
    countryChange: Optional[bool] = None
    vpn: Optional[bool] = None
    apiBurst: Optional[bool] = None
    privilegeEscalation: Optional[bool] = None


class SDKRiskRequest(BaseModel):
    """Flat risk request from SDK."""
    userId: str
    email: str
    fingerprint: FingerprintPayload
    metadata: Optional[Dict[str, Any]] = None
    simulateFlags: Optional[SDKSimulateFlags] = None


# ============================================================================
# Response Schemas
# ============================================================================

class ModelPredictionResponse(BaseModel):
    """Individual model prediction response."""
    model: str
    score: float = Field(..., ge=0.0, le=1.0, description="Prediction score (0-1)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0-1)")
    raw_score: Optional[float] = None
    cluster_label: Optional[int] = None
    distance_to_center: Optional[float] = None


class ComponentScore(BaseModel):
    """Component score breakdown."""
    score: float
    weight: float
    contribution: float


class RiskResponse(BaseModel):
    """Risk assessment response."""
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Aggregated risk score (0-1)")
    risk_level: str = Field(..., description="Risk level (LOW, MEDIUM, HIGH, CRITICAL)")
    components: Dict[str, float] = Field(..., description="Individual model scores (flat)")
    model_predictions: Optional[Dict[str, ModelPredictionResponse]] = None
    factors: Optional[Dict[str, float]] = None
    model_version: Optional[str] = "v1-prod"
    timestamp: Optional[int] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "risk_score": 0.455,
                "risk_level": "MEDIUM",
                "components": {
                    "login": 0.3,
                    "session": 0.4,
                    "device": 0.2,
                    "baseline": 0.5,
                    "global": 0.3,
                    "rule_based": 0.0,
                },
                "factors": {
                    "ipRisk": 0.3,
                    "deviceTrust": 0.2,
                    "geoAnomaly": 0.5
                },
                "model_version": "v1-prod",
                "timestamp": 123456789,
            }
        }


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    models_loaded: bool
    models_count: int
    message: str
