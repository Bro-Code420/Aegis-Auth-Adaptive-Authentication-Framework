"""
Server-Side Authorization & Policy Enforcement Point (PEP / PDP) for AegisAuth Pro.
Authoritatively decides access based on Subject, Tenant, Resource, Action, Session State,
Assurance Level, and Advisory Risk Signals.

NON-NEGOTIABLE PRINCIPLE:
ML predictions are advisory intelligence only. The PDP makes the authoritative decision,
and the PEP enforces it on the server side.
"""
from typing import Dict, Any, List, Optional, Set
from pydantic import BaseModel, Field
from fastapi import Request, HTTPException, Depends
from src.security.tenant_guard import TenantContext, get_tenant_context
from src.utils.logger import logger


class SubjectContext(BaseModel):
    user_id: str
    roles: List[str] = Field(default_factory=lambda: ["USER"])
    permissions: Set[str] = Field(default_factory=set)
    assurance_level: str = Field(default="PASSWORD_ONLY", description="PASSWORD_ONLY, MFA_VERIFIED, WEBAUTHN_PASSKEY")
    is_phishing_resistant: bool = False


class ResourceContext(BaseModel):
    resource_id: str
    resource_type: str
    tenant_id: str
    sensitivity: str = Field(default="LOW", description="LOW, MEDIUM, HIGH, CRITICAL")


class ActionContext(BaseModel):
    action_name: str
    is_sensitive: bool = False
    amount: Optional[float] = None
    required_permission: Optional[str] = None


class AuthorizationDecision(BaseModel):
    decision: str = Field(..., description="ALLOW, STEP_UP, LIMIT, CONTAIN, REVOKE")
    enforced_state: str = Field(..., description="ACTIVE, CHALLENGED, RESTRICTED, CONTAINED, REVOKED")
    reasons: List[str]
    requires_step_up: bool
    assurance_level: str
    is_authoritative: bool = True
    authorized_tenant_id: str


# Sensitive actions requiring fresh high assurance (TOCTOU Defense)
SENSITIVE_ACTIONS = {
    "FACTOR_CHANGE",
    "PASSWORD_RESET",
    "EXPORT_DATA",
    "FUNDS_TRANSFER",
    "POLICY_MUTATION",
    "MEMBER_REMOVE",
    "API_KEY_ROTATE",
}

# Role-Based Access Control matrix
ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    "ADMIN": {
        "read:all", "write:all", "delete:all", "policy:mutate", "session:revoke", "tenant:manage"
    },
    "ANALYST": {
        "read:metrics", "read:logs", "read:sessions", "read:alerts", "export:reports"
    },
    "USER": {
        "read:self", "write:self", "session:self"
    }
}


class PolicyDecisionPoint:
    """
    Authoritative Policy Decision Engine (PDP).
    Separates advisory risk calculations from deterministic access enforcement.
    """
    @staticmethod
    def evaluate(
        subject: SubjectContext,
        tenant: TenantContext,
        resource: ResourceContext,
        action: ActionContext,
        session_state: str = "ACTIVE",
        risk_score: float = 0.0,
        evidence_state: str = "TRUSTED",
        confidence: float = 0.85,
        model_conflict: bool = False,
        policy_thresholds: Optional[Dict[str, float]] = None,
    ) -> AuthorizationDecision:
        reasons = []
        
        # 1. Strict Tenant Boundary Isolation
        if not tenant.is_admin and resource.tenant_id != tenant.tenant_id:
            logger.warning(
                f"[PDP] Cross-tenant boundary violation: Subject {subject.user_id} (Tenant {tenant.tenant_id}) "
                f"attempted to access Resource {resource.resource_id} (Tenant {resource.tenant_id})"
            )
            return AuthorizationDecision(
                decision="REVOKE",
                enforced_state="REVOKED",
                reasons=["CROSS_TENANT_ACCESS_DENIED"],
                requires_step_up=False,
                assurance_level="NONE",
                authorized_tenant_id=tenant.tenant_id
            )

        # 2. Hard Session State Guards (Revoked, Contained, Terminated sessions cannot act)
        if session_state in ["REVOKED", "CONTAINED", "BLOCKED", "TERMINATED"]:
            reasons.append(f"SESSION_IN_{session_state}_STATE")
            return AuthorizationDecision(
                decision="REVOKE" if session_state in ["REVOKED", "TERMINATED"] else "CONTAIN",
                enforced_state=session_state,
                reasons=reasons,
                requires_step_up=False,
                assurance_level="NONE",
                authorized_tenant_id=tenant.tenant_id
            )

        # 3. RBAC / ABAC Permission Verification
        effective_permissions = set(subject.permissions)
        for role in subject.roles:
            effective_permissions.update(ROLE_PERMISSIONS.get(role, set()))

        if action.required_permission and action.required_permission not in effective_permissions:
            logger.warning(
                f"[PDP] RBAC Denial: User {subject.user_id} missing required permission '{action.required_permission}'"
            )
            return AuthorizationDecision(
                decision="REVOKE",
                enforced_state="RESTRICTED",
                reasons=["INSUFFICIENT_RBAC_PERMISSIONS"],
                requires_step_up=False,
                assurance_level=subject.assurance_level,
                authorized_tenant_id=tenant.tenant_id
            )

        # 4. Critical Compromise / High Risk Invariant
        if evidence_state == "COMPROMISED" or risk_score >= 0.85:
            reasons.append("HIGH_RISK_COMPROMISE_DETECTED")
            return AuthorizationDecision(
                decision="CONTAIN",
                enforced_state="CONTAINED",
                reasons=reasons,
                requires_step_up=True,
                assurance_level="LOW",
                authorized_tenant_id=tenant.tenant_id
            )

        # 5. Sensitive Action Protection (TOCTOU & Step-Up Defense)
        if action.action_name in SENSITIVE_ACTIONS or action.is_sensitive or resource.sensitivity in ["HIGH", "CRITICAL"]:
            if not subject.is_phishing_resistant or risk_score > 0.30 or evidence_state != "TRUSTED":
                reasons.append("SENSITIVE_ACTION_REQUIRES_FRESH_STEP_UP")
                return AuthorizationDecision(
                    decision="STEP_UP",
                    enforced_state="CHALLENGED",
                    reasons=reasons,
                    requires_step_up=True,
                    assurance_level="MEDIUM",
                    authorized_tenant_id=tenant.tenant_id
                )

        # 6. Uncertainty & Model Disagreement Handling
        if model_conflict or evidence_state == "UNKNOWN":
            if risk_score > 0.45:
                reasons.append("MODEL_CONFLICT_UNCERTAINTY_STEP_UP")
                return AuthorizationDecision(
                    decision="STEP_UP",
                    enforced_state="CHALLENGED",
                    reasons=reasons,
                    requires_step_up=True,
                    assurance_level="LOW_UNCERTAIN",
                    authorized_tenant_id=tenant.tenant_id
                )
            else:
                reasons.append("UNVERIFIED_TELEMETRY_LIMITED_ACCESS")
                return AuthorizationDecision(
                    decision="LIMIT",
                    enforced_state="RESTRICTED",
                    reasons=reasons,
                    requires_step_up=False,
                    assurance_level="MEDIUM_UNVERIFIED",
                    authorized_tenant_id=tenant.tenant_id
                )

        # 7. Elevated Risk Anomaly
        if risk_score > 0.50:
            reasons.append("ELEVATED_RISK_STEP_UP_REQUIRED")
            return AuthorizationDecision(
                decision="STEP_UP",
                enforced_state="CHALLENGED",
                reasons=reasons,
                requires_step_up=True,
                assurance_level="MEDIUM_SUSPICIOUS",
                authorized_tenant_id=tenant.tenant_id
            )

        # 8. All Security Checks Passed
        reasons.append("AUTHORIZATION_GRANTED")
        return AuthorizationDecision(
            decision="ALLOW",
            enforced_state="ACTIVE",
            reasons=reasons,
            requires_step_up=False,
            assurance_level="HIGH_TRUSTED",
            authorized_tenant_id=tenant.tenant_id
        )


class PolicyEnforcementPoint:
    """
    Policy Enforcement Point (PEP) executing on the server side.
    Guarantees unauthorized requests never reach protected business logic.
    """
    @staticmethod
    def enforce(decision: AuthorizationDecision) -> None:
        if decision.decision in ["REVOKE", "BLOCK"]:
            raise HTTPException(
                status_code=403,
                detail={"error": "ACCESS_DENIED", "reasons": decision.reasons}
            )
        if decision.decision == "CONTAIN":
            raise HTTPException(
                status_code=423, # Locked
                detail={"error": "SESSION_CONTAINED", "reasons": decision.reasons, "requires_recovery": True}
            )
        if decision.decision == "STEP_UP":
            raise HTTPException(
                status_code=401, # Challenge required
                detail={"error": "STEP_UP_REQUIRED", "reasons": decision.reasons, "mfa_required": True}
            )
