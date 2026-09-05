"""
Safety Controller & Policy Decision Point (PDP) for AegisAuth Pro.
Authoritative policy evaluation layer separating advisory risk predictions
from deterministic enforcement actions.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from src.utils.logger import logger

router = APIRouter(prefix="/policy", tags=["Safety Controller & Policy Engine"])


class PolicyEvaluationRequest(BaseModel):
    session_id: str
    tenant_id: str
    user_id: Optional[str] = None
    action_type: str = Field(..., description="e.g. LOGIN, API_CALL, FUNDS_TRANSFER, FACTOR_CHANGE")
    risk_score: float = Field(..., ge=0.0, le=1.0)
    evidence_state: str = Field(default="UNKNOWN", description="TRUSTED, SUSPICIOUS, UNKNOWN, COMPROMISED")
    is_phishing_resistant_auth: bool = False
    is_device_attested: bool = False
    risk_velocity: float = 0.0
    action_amount: Optional[float] = None
    custom_policy_thresholds: Optional[Dict[str, float]] = None


class PolicyDecisionResponse(BaseModel):
    decision: str = Field(..., description="ALLOW, STEP_UP, LIMIT, CONTAIN, REVOKE")
    enforced_state: str = Field(..., description="ACTIVE, CHALLENGED, RESTRICTED, CONTAINED, REVOKED")
    reasons: List[str]
    requires_step_up: bool
    assurance_level: str
    is_authoritative: bool = True


@router.post("/evaluate", response_model=PolicyDecisionResponse)
async def evaluate_policy_decision(req: PolicyEvaluationRequest):
    """
    Authoritatively evaluates security policy against risk signals and action context.
    
    Invariants:
    1. Sensitive actions (FACTOR_CHANGE, FUNDS_TRANSFER > 1000) require STEP_UP if risk > 0.35.
    2. Evidence state COMPROMISED leads to CONTAIN / REVOKE.
    3. Missing evidence / UNKNOWN triggers STEP_UP instead of catastrophic permanent blocking.
    """
    try:
        reasons = []
        requires_step_up = False
        
        # 1. Hard-Deny / Compromise Invariants
        if req.evidence_state == "COMPROMISED" or req.risk_score >= 0.85:
            reasons.append("HIGH_RISK_COMPROMISE_DETECTED")
            return PolicyDecisionResponse(
                decision="CONTAIN",
                enforced_state="CONTAINED",
                reasons=reasons,
                requires_step_up=True,
                assurance_level="LOW",
                is_authoritative=True,
            )

        # 2. Sensitive Action Protection (TOCTOU Defense)
        sensitive_actions = ["FACTOR_CHANGE", "PASSWORD_RESET", "EXPORT_DATA", "FUNDS_TRANSFER"]
        if req.action_type in sensitive_actions:
            if not req.is_phishing_resistant_auth or req.risk_score > 0.30 or req.evidence_state != "TRUSTED":
                reasons.append("SENSITIVE_TRANSACTION_REQUIRES_FRESH_STEP_UP")
                return PolicyDecisionResponse(
                    decision="STEP_UP",
                    enforced_state="CHALLENGED",
                    reasons=reasons,
                    requires_step_up=True,
                    assurance_level="MEDIUM",
                    is_authoritative=True,
                )

        # 3. Uncertainty & Cold-Start Defense
        if req.evidence_state == "UNKNOWN":
            if req.risk_score > 0.50:
                reasons.append("UNCERTAIN_TELEMETRY_STEP_UP_REQUIRED")
                return PolicyDecisionResponse(
                    decision="STEP_UP",
                    enforced_state="CHALLENGED",
                    reasons=reasons,
                    requires_step_up=True,
                    assurance_level="LOW_UNCERTAIN",
                    is_authoritative=True,
                )
            else:
                reasons.append("UNVERIFIED_DEVICE_LIMITED_ACCESS")
                return PolicyDecisionResponse(
                    decision="LIMIT",
                    enforced_state="RESTRICTED",
                    reasons=reasons,
                    requires_step_up=False,
                    assurance_level="MEDIUM_UNVERIFIED",
                    is_authoritative=True,
                )

        # 4. Elevated Risk / Suspicious Behavior
        if req.risk_score > 0.50 or req.risk_velocity > 0.30:
            reasons.append("ELEVATED_RISK_ANOMALY_STEP_UP")
            return PolicyDecisionResponse(
                decision="STEP_UP",
                enforced_state="CHALLENGED",
                reasons=reasons,
                requires_step_up=True,
                assurance_level="MEDIUM_SUSPICIOUS",
                is_authoritative=True,
            )

        # 5. Low Risk & Verified Assurance
        reasons.append("POLICY_CHECKS_PASSED")
        return PolicyDecisionResponse(
            decision="ALLOW",
            enforced_state="ACTIVE",
            reasons=reasons,
            requires_step_up=False,
            assurance_level="HIGH_TRUSTED",
            is_authoritative=True,
        )

    except Exception as e:
        logger.error(f"[SafetyController] Error evaluating policy: {e}", exc_info=True)
        # Fail-Safe Default: Step-up authentication on internal policy error (never fail silently open)
        return PolicyDecisionResponse(
            decision="STEP_UP",
            enforced_state="CHALLENGED",
            reasons=["FAIL_SAFE_DEFAULT_TRIGGERED"],
            requires_step_up=True,
            assurance_level="FAIL_SAFE",
            is_authoritative=True,
        )
