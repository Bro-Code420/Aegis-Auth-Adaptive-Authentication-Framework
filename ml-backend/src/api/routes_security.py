"""
FastAPI Security Operations Endpoints for AegisAuth Pro.
Exposes Policy Registry, Audit Hash Chain Verification, and ML Drift Telemetry.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

from src.security.tenant_guard import TenantContext, get_tenant_context
from src.security.authorization import PolicyEnforcementPoint, PolicyDecisionPoint, SubjectContext, ResourceContext, ActionContext
from src.security.policy_registry import policy_registry, PolicyDefinition
from src.security.audit_log import audit_chain, AuditRecord
from src.security.drift_monitor import drift_monitor
from src.security.replay_guard import replay_guard, ReplayEnvelope, assert_replay_defense
from src.utils.logger import logger

router = APIRouter(prefix="/security", tags=["Security Operations & Governance"])


class PolicyDraftRequest(BaseModel):
    policy_id: str
    name: str
    description: str
    rules: Dict[str, Any]


class PolicyApprovalRequest(BaseModel):
    policy_id: str
    version: int


class AuditVerificationResponse(BaseModel):
    is_intact: bool
    message: str
    total_records: int
    latest_hash: Optional[str] = None


@router.get("/policy/active", response_model=PolicyDefinition)
async def get_active_policy(tenant_ctx: TenantContext = Depends(get_tenant_context)):
    """Retrieves the active, cryptographically verified security policy for the tenant."""
    policy = policy_registry.get_active_policy(tenant_ctx.tenant_id)
    if not policy:
        raise HTTPException(status_code=404, detail="No active policy found for tenant.")
    return policy


@router.post("/policy/draft", response_model=PolicyDefinition)
async def draft_policy(
    req: PolicyDraftRequest,
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Creates a new policy draft."""
    return policy_registry.draft_policy(
        tenant_id=tenant_ctx.tenant_id,
        policy_id=req.policy_id,
        name=req.name,
        description=req.description,
        rules=req.rules,
        created_by=f"user_{tenant_ctx.api_key_id}"
    )


@router.post("/policy/approve", response_model=PolicyDefinition)
async def approve_and_sign_policy(
    req: PolicyApprovalRequest,
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """
    Approves and digitally signs policy with separation of duties enforcement.
    """
    try:
        policy = policy_registry.approve_and_sign(
            tenant_id=tenant_ctx.tenant_id,
            policy_id=req.policy_id,
            version=req.version,
            approved_by=f"approver_{tenant_ctx.api_key_id}"
        )
        return policy
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.post("/policy/activate", response_model=PolicyDefinition)
async def activate_policy(
    req: PolicyApprovalRequest,
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Activates a verified signed policy into production."""
    try:
        return policy_registry.activate_policy(
            tenant_id=tenant_ctx.tenant_id,
            policy_id=req.policy_id,
            version=req.version
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/audit/verify", response_model=AuditVerificationResponse)
async def verify_audit_log(tenant_ctx: TenantContext = Depends(get_tenant_context)):
    """
    Cryptographically verifies the append-only hash chain integrity of the audit log.
    """
    is_intact, msg, tampered_idx = audit_chain.verify_chain_integrity()
    records = audit_chain.get_records(1)
    latest_hash = records[-1].current_hash if records else None

    return AuditVerificationResponse(
        is_intact=is_intact,
        message=msg or "Integrity verified",
        total_records=len(audit_chain._chain),
        latest_hash=latest_hash
    )


@router.get("/drift/metrics")
async def get_drift_metrics(tenant_ctx: TenantContext = Depends(get_tenant_context)):
    """Retrieves real-time ML feature drift (PSI), OOD rates, and calibration metrics."""
    return drift_monitor.get_drift_metrics()


@router.post("/replay/verify")
async def verify_replay_envelope(
    envelope: ReplayEnvelope,
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Validates envelope against replay guard, nonce registry, and sequence tracking."""
    assert_replay_defense(envelope, expected_tenant_id=tenant_ctx.tenant_id)
    return {"status": "SUCCESS", "message": "Envelope is valid, unique, and monotonically sequenced"}
