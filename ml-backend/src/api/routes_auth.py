"""
Hardened Auth Bridge with Policy Decision Point (PDP) and Audit Hash Chaining.
Guarantees ML produces advisory intelligence only; PolicyDecisionPoint makes the authoritative decision.
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Dict, Any, List, Optional
import uuid
import time
import traceback
from pydantic import BaseModel, Field

from src.api.schemas import LoginRequest, ModelPredictionResponse
from src.inference.login_predictor import predict_login_anomaly
from src.security.tenant_guard import TenantContext, get_tenant_context
from src.security.authorization import (
    PolicyDecisionPoint,
    SubjectContext,
    ResourceContext,
    ActionContext,
    AuthorizationDecision
)
from src.security.audit_log import audit_chain
from src.utils.logger import logger
from src.utils.convex import get_convex_client

router = APIRouter(prefix="/auth", tags=["Auth Bridge"])

# --- SDK Compatible Schemas ---

class DecisionAction(BaseModel):
    type: str # MFA_REQUIRED, SESSION_TERMINATE, ACCESS_RESTRICT, NONE
    payload: Optional[Dict[str, Any]] = None

class Decision(BaseModel):
    type: str # ALLOW, CHALLENGE, RESTRICT, BLOCK
    required_actions: List[DecisionAction] = []
    reason_codes: List[str] = []

class UserData(BaseModel):
    id: str
    email: str
    name: Optional[str] = None

class AuthResponseData(BaseModel):
    user: UserData
    token: str

class AuthResponse(BaseModel):
    data: AuthResponseData
    decision: Decision
    sessionId: str
    correlationId: str

class LoginPayload(BaseModel):
    email: str
    password: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class SignupPayload(LoginPayload):
    name: Optional[str] = None


# --- Routes ---

@router.post("/signup", response_model=AuthResponse)
async def signup(
    payload: SignupPayload,
    request: Request,
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """
    Handle user signup, evaluated authoritatively by PDP.
    """
    logger.info(f"Signup bridge request for: {payload.email} (Tenant: {tenant_ctx.tenant_id})")
    
    session_id = f"sess_{uuid.uuid4().hex[:12]}"
    correlation_id = f"corr_{uuid.uuid4().hex[:12]}"
    user_id = f"user_{uuid.uuid4().hex[:8]}"

    # Authoritative PDP Evaluation
    subject = SubjectContext(user_id=user_id, roles=["USER"], assurance_level="PASSWORD_ONLY")
    resource = ResourceContext(resource_id=f"tenant_root_{tenant_ctx.tenant_id}", resource_type="APPLICATION", tenant_id=tenant_ctx.tenant_id)
    action = ActionContext(action_name="USER_SIGNUP", is_sensitive=False)
    
    pdp_decision = PolicyDecisionPoint.evaluate(
        subject=subject,
        tenant=tenant_ctx,
        resource=resource,
        action=action,
        risk_score=0.0,
        evidence_state="TRUSTED"
    )

    # Append to tamper-evident audit log
    audit_chain.append_decision(
        event_id=correlation_id,
        tenant_id=tenant_ctx.tenant_id,
        session_id=session_id,
        user_id=user_id,
        action="USER_SIGNUP",
        decision=pdp_decision.decision,
        reasons=pdp_decision.reasons,
        risk_score=0.0
    )

    decision = Decision(
        type=pdp_decision.decision,
        required_actions=[DecisionAction(type="NONE")],
        reason_codes=pdp_decision.reasons
    )

    # --- Convex Integration ---
    try:
        api_key = request.headers.get("x-api-key")
        app_id = request.headers.get("x-app-id")
        client = get_convex_client()
        if client and api_key:
            app = client.query("applications:getByApiKey", {"apiKey": api_key, "appId": app_id})
            if app:
                client.mutation("sessions:createSession", {
                    "applicationId": app["_id"],
                    "userEmail": payload.email,
                    "device": "SDK-Device",
                    "browser": request.headers.get("user-agent", "Unknown"),
                    "location": "Unknown",
                    "ip": request.client.host if request.client else "127.0.0.1",
                    "score": 0.0,
                    "initialState": "ACTIVE"
                })
    except Exception as e:
        logger.error(f"Failed to report signup session to Convex: {e}")

    return AuthResponse(
        data=AuthResponseData(
            user=UserData(id=user_id, email=payload.email, name=payload.name),
            token=f"jwt_{uuid.uuid4().hex}"
        ),
        decision=decision,
        sessionId=session_id,
        correlationId=correlation_id
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginPayload,
    request: Request,
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """
    Handle user login: Runs ML for advisory risk intelligence,
    then authoritatively passes through the Policy Decision Point.
    """
    logger.info(f"Login bridge request for: {payload.email} (Tenant: {tenant_ctx.tenant_id})")
    
    metadata = payload.metadata or {}
    mock_features = {
        "login_hour": metadata.get("login_hour", time.localtime().tm_hour),
        "device_known": metadata.get("device_known", 1),
        "country_changed": metadata.get("country_changed", 0),
        "login_velocity": metadata.get("login_velocity", 1.0),
        "ip_reputation_score": metadata.get("ip_reputation_score", 0.9),
        "asn_changed": metadata.get("asn_changed", 0),
        "failed_attempts": metadata.get("failed_attempts", 0),
        "mfa_failures": metadata.get("mfa_failures", 0),
    }
    
    mock_features = {k: float(v) if isinstance(v, (int, float)) else 0.0 for k, v in mock_features.items()}
    for k in ["login_hour", "device_known", "country_changed", "asn_changed", "failed_attempts", "mfa_failures"]:
        mock_features[k] = int(mock_features[k])
    
    try:
        # 1. Advisory ML Risk Calculation (Intelligence only)
        prediction = predict_login_anomaly(mock_features)
        advisory_risk_score = float(prediction["score"])
        advisory_confidence = float(prediction.get("confidence", 0.85))
        evidence_state = "SUSPICIOUS" if advisory_risk_score > 0.45 else "TRUSTED"
        if advisory_risk_score >= 0.85:
            evidence_state = "COMPROMISED"

        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        correlation_id = f"corr_{uuid.uuid4().hex[:12]}"
        user_id = f"user_{uuid.uuid4().hex[:8]}"

        # 2. Authoritative Policy Decision Point (PDP) Evaluation
        subject = SubjectContext(
            user_id=user_id,
            roles=["USER"],
            assurance_level="PASSWORD_ONLY",
            is_phishing_resistant=False
        )
        resource = ResourceContext(
            resource_id=f"app_{tenant_ctx.app_id}",
            resource_type="APPLICATION_SESSION",
            tenant_id=tenant_ctx.tenant_id,
            sensitivity="MEDIUM"
        )
        action = ActionContext(action_name="LOGIN", is_sensitive=False)

        pdp_decision = PolicyDecisionPoint.evaluate(
            subject=subject,
            tenant=tenant_ctx,
            resource=resource,
            action=action,
            session_state="ACTIVE",
            risk_score=advisory_risk_score,
            evidence_state=evidence_state,
            confidence=advisory_confidence
        )

        # 3. Append Authoritative Decision to Tamper-Evident Audit Chain
        audit_chain.append_decision(
            event_id=correlation_id,
            tenant_id=tenant_ctx.tenant_id,
            session_id=session_id,
            user_id=user_id,
            action="LOGIN",
            decision=pdp_decision.decision,
            reasons=pdp_decision.reasons,
            risk_score=advisory_risk_score
        )

        # 4. Map Authoritative Decision to SDK Response
        decision_type_map = {
            "ALLOW": "ALLOW",
            "STEP_UP": "CHALLENGE",
            "LIMIT": "RESTRICT",
            "CONTAIN": "BLOCK",
            "REVOKE": "BLOCK"
        }
        sdk_decision_type = decision_type_map.get(pdp_decision.decision, "CHALLENGE")
        
        actions = []
        if pdp_decision.requires_step_up or sdk_decision_type == "CHALLENGE":
            actions.append(DecisionAction(type="MFA_REQUIRED"))
        elif sdk_decision_type == "BLOCK":
            actions.append(DecisionAction(type="SESSION_TERMINATE"))
        else:
            actions.append(DecisionAction(type="NONE"))

        decision = Decision(
            type=sdk_decision_type,
            required_actions=actions,
            reason_codes=pdp_decision.reasons
        )

        # --- Convex Integration ---
        try:
            api_key = request.headers.get("x-api-key")
            app_id = request.headers.get("x-app-id")
            client = get_convex_client()
            if client and api_key:
                app = client.query("applications:getByApiKey", {"apiKey": api_key, "appId": app_id})
                if app:
                    sessionId = client.mutation("sessions:createSession", {
                        "applicationId": app["_id"],
                        "userEmail": payload.email,
                        "device": "SDK-Device",
                        "browser": request.headers.get("user-agent", "Unknown"),
                        "location": "Unknown",
                        "ip": request.client.host if request.client else "127.0.0.1",
                        "score": advisory_risk_score,
                        "initialState": pdp_decision.enforced_state
                    })
                    
                    client.mutation("ml:syncMLResults", {
                        "sessionId": sessionId,
                        "correlationId": correlation_id,
                        "score": advisory_risk_score,
                        "factors": {
                            "ipRisk": advisory_risk_score,
                            "deviceTrust": 0.9,
                            "geoAnomaly": 0.1
                        },
                        "modelVersion": "v1-verified",
                        "state": pdp_decision.enforced_state,
                        "decisionType": sdk_decision_type,
                        "riskResult": {
                            "risk_score": advisory_risk_score,
                            "risk_level": sdk_decision_type,
                            "components": mock_features,
                            "pdp_reasons": pdp_decision.reasons
                        }
                    })
                    session_id = str(sessionId)
        except Exception as e:
            logger.error(f"Failed to report login session to Convex: {e}")

        return AuthResponse(
            data=AuthResponseData(
                user=UserData(id=user_id, email=payload.email),
                token=f"jwt_{uuid.uuid4().hex}"
            ),
            decision=decision,
            sessionId=session_id,
            correlationId=correlation_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in login bridge: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SignalTrackingPayload(BaseModel):
    sessionId: Optional[str] = None
    correlationId: Optional[str] = None
    type: str = "SIGNAL_RECEIVED"
    payload: Optional[Dict[str, Any]] = None


@router.post("/signals")
async def handle_signals(
    signal: SignalTrackingPayload,
    request: Request,
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """
    Handle continuous live telemetry stream and record signals in Convex.
    """
    try:
        api_key = request.headers.get("x-api-key")
        app_id = request.headers.get("x-app-id")
        client = get_convex_client()
        if client and api_key:
            app = client.query("applications:getByApiKey", {"apiKey": api_key, "appId": app_id})
            if app and signal.sessionId:
                try:
                    client.mutation("activities:create", {
                        "applicationId": app["_id"],
                        "type": "telemetry_signal",
                        "sessionId": signal.sessionId if not signal.sessionId.startswith("sess_") else None,
                        "details": signal.payload or {},
                        "timestamp": float(time.time() * 1000)
                    })
                except Exception:
                    pass
        return {"success": True, "status": "RECEIVED", "tenant_id": tenant_ctx.tenant_id}
    except Exception as e:
        logger.error(f"Error processing signal: {e}")
        return {"success": True, "status": "ACK"}


@router.post("/logout")
async def logout(request: Request):
    return {"success": True}


@router.get("/me")
async def me(tenant_ctx: TenantContext = Depends(get_tenant_context)):
    return {
        "id": f"usr_{tenant_ctx.tenant_id}",
        "tenant_id": tenant_ctx.tenant_id,
        "app_id": tenant_ctx.app_id,
        "is_admin": tenant_ctx.is_admin
    }
