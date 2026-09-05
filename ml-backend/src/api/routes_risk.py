"""
FastAPI routes for unified risk assessment with Rate Limiting, Drift Telemetry, and Replay Defense.
"""
from fastapi import APIRouter, HTTPException, Request
from typing import Dict, Any, Union
import traceback

from src.api.schemas import UnifiedRiskRequest, SDKRiskRequest, RiskResponse, ModelPredictionResponse, \
    LoginRequest, SessionRequest, DeviceRequest, BaselineRequest, GlobalRequest
from src.inference.login_predictor import predict_login_anomaly
from src.inference.session_predictor import predict_session_anomaly
from src.inference.device_predictor import predict_device_trust
from src.inference.baseline_predictor import predict_baseline_anomaly
from src.inference.global_predictor import predict_global_threat
from src.inference.risk_aggregator import aggregate_risk
from src.security.drift_monitor import drift_monitor
from src.utils.alert_governor import alert_governor
from src.utils.logger import logger

router = APIRouter(prefix="/predict", tags=["Risk"])


def map_sdk_to_unified(sdk_req: SDKRiskRequest) -> UnifiedRiskRequest:
    """Maps flat SDK request to nested UnifiedRiskRequest with defaults and simulation logic."""
    
    country_changed = 1 if (sdk_req.simulateFlags and sdk_req.simulateFlags.countryChange) else 0
    device_known = 0 if (sdk_req.simulateFlags and sdk_req.simulateFlags.newDevice) else 1
    
    login = LoginRequest(
        login_hour=14,
        device_known=device_known,
        country_changed=country_changed,
        login_velocity=1.0,
        ip_reputation_score=1.0,
        asn_changed=0,
        failed_attempts=0,
        mfa_failures=0
    )

    api_burst = 1 if (sdk_req.simulateFlags and sdk_req.simulateFlags.apiBurst) else 0
    priv_esc = 1 if (sdk_req.simulateFlags and sdk_req.simulateFlags.privilegeEscalation) else 0
    
    sensitive_access = 0
    data_spike = 0
    token_replay = 0
    
    if sdk_req.metadata:
        if sdk_req.metadata.get("sensitive_route_access"): sensitive_access = 1
        if sdk_req.metadata.get("bulk_download"): data_spike = 1
        if sdk_req.metadata.get("token_replay_attempt"): token_replay = 1

    session = SessionRequest(
        api_calls_per_min=50.0 if api_burst else 5.0,
        sensitive_endpoint_access=sensitive_access,
        privilege_escalation_attempt=priv_esc,
        session_duration_minutes=10.0,
        request_entropy=3.0,
        data_download_mb=500.0 if data_spike else 1.0,
        token_reuse_flag=token_replay
    )

    device = DeviceRequest(
        successful_logins=10,
        failed_attempts=0,
        mfa_failures=0,
        device_age_days=30 if device_known else 0,
        days_since_last_seen=0,
        past_anomaly_count=0,
        password_reset_events=0
    )

    baseline = BaselineRequest(
        login_hour_deviation=0.0,
        session_duration_deviation=0.0,
        api_call_deviation=0.0,
        usual_country_flag=1 if not country_changed else 0,
        role_sensitivity_score=0.5
    )

    global_threat = GlobalRequest(
        distinct_accounts_per_ip=1,
        failed_logins_per_ip=0,
        geo_spread_count=1,
        device_fingerprint_reuse_count=1,
        tor_usage_flag=0,
        vpn_usage_flag=1 if (sdk_req.simulateFlags and sdk_req.simulateFlags.vpn) else 0,
        credential_stuffing_pattern_flag=0,
        attack_wave_intensity=0.0
    )

    return UnifiedRiskRequest(
        login=login,
        session=session,
        device=device,
        baseline=baseline,
        global_threat=global_threat
    )


@router.post("/risk", response_model=RiskResponse)
async def predict_risk(
    request: Union[UnifiedRiskRequest, SDKRiskRequest],
    raw_request: Request
) -> RiskResponse:
    """
    Unified risk assessment combining all models with Rate Limiting & Drift Telemetry.
    """
    try:
        # 1. DDoS / Cost Amplification Defense: IP rate limiting
        client_ip = raw_request.client.host if raw_request.client else "127.0.0.1"
        alert_governor.check_inference_rate_limit(client_ip)

        # 2. Convert SDK request to Unified if needed
        if isinstance(request, SDKRiskRequest):
            logger.info("SDK risk request detected, mapping to unified schema")
            unified_request = map_sdk_to_unified(request)
        else:
            logger.info("Standard unified risk assessment request received")
            unified_request = request
            
        # 3. Run all predictors (Advisory signals)
        login_result = predict_login_anomaly(unified_request.login.dict())
        session_result = predict_session_anomaly(unified_request.session.dict())
        device_result = predict_device_trust(unified_request.device.dict())
        baseline_result = predict_baseline_anomaly(unified_request.baseline.dict())
        global_result = predict_global_threat(unified_request.global_threat.dict())
        
        # 4. Evidence Fusion & Risk Aggregation
        risk_result = aggregate_risk(
            login_result=login_result,
            session_result=session_result,
            device_result=device_result,
            baseline_result=baseline_result,
            global_result=global_result,
            rule_based_score=unified_request.rule_based_score,
        )
        
        # 5. ML Drift & Telemetry Monitoring
        drift_monitor.record_inference_event(
            features={
                "login_velocity": unified_request.login.login_velocity,
                "ip_reputation_score": unified_request.login.ip_reputation_score,
                "api_calls_per_min": unified_request.session.api_calls_per_min,
                "session_duration_minutes": unified_request.session.session_duration_minutes,
                "device_age_days": unified_request.device.device_age_days,
            },
            predicted_score=risk_result["risk_score"],
            confidence=risk_result["assurance"]["confidence"],
            is_conflict=risk_result["assurance"]["model_conflict"]
        )

        model_predictions = {
            "login": ModelPredictionResponse(**login_result),
            "session": ModelPredictionResponse(**session_result),
            "device": ModelPredictionResponse(**device_result),
            "baseline": ModelPredictionResponse(**baseline_result),
            "global": ModelPredictionResponse(**global_result),
        }
        
        logger.info(
            f"Risk assessment completed - Score: {risk_result['risk_score']:.2f}, "
            f"Level: {risk_result['risk_level']}"
        )
        
        factors = {
            "ipRisk": login_result.get("score", 0.0),
            "deviceTrust": 1.0 - device_result.get("score", 0.0),
            "geoAnomaly": global_result.get("score", 0.0)
        }
        
        return RiskResponse(
            risk_score=risk_result["risk_score"],
            risk_level=risk_result["risk_level"],
            components=risk_result["components"],
            model_predictions=model_predictions,
            factors=factors,
            model_version="v1-verified-signed",
            timestamp=risk_result.get("timestamp")
        )
    
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error in risk assessment: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in risk assessment: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
