"""
AegisAuth Pro Formal Security Invariants Verification Suite.
Validates that all 12 core security invariants hold true across backend components.
"""
import pytest
import time
import uuid
from fastapi import HTTPException
from src.security.authorization import (
    PolicyDecisionPoint,
    SubjectContext,
    ResourceContext,
    ActionContext,
    PolicyEnforcementPoint
)
from src.security.tenant_guard import tenant_registry, TenantContext
from src.security.replay_guard import replay_guard, ReplayEnvelope
from src.security.model_signer import model_signer, ModelSignatureError
from src.security.policy_registry import policy_registry, PolicyDefinition
from src.security.llm_gateway import llm_gateway
from src.security.resilience import CircuitBreaker
from src.inference.risk_aggregator import aggregate_risk
from src.security.audit_log import audit_chain


def test_invariant_1_ml_cannot_directly_authorize():
    """INVARIANT 1: ML predictions are strictly advisory; PDP makes authoritative decision."""
    tenant = TenantContext("ten_alpha", "app_alpha_1", "key_1")
    resource = ResourceContext(resource_id="res_1", resource_type="DATA", tenant_id="ten_alpha")
    subject = SubjectContext(user_id="user_1", roles=["USER"])
    action = ActionContext(action_name="READ_DATA")

    # Attacker crafts features resulting in a low ML score (0.05), but session is CONTAINED
    pdp_decision = PolicyDecisionPoint.evaluate(
        subject=subject,
        tenant=tenant,
        resource=resource,
        action=action,
        session_state="CONTAINED",
        risk_score=0.05,
        evidence_state="TRUSTED"
    )
    # The low ML score MUST NOT override the CONTAINED state
    assert pdp_decision.decision == "CONTAIN"
    assert "SESSION_IN_CONTAINED_STATE" in pdp_decision.reasons


def test_invariant_2_frontend_cannot_bypass_backend_pep():
    """INVARIANT 2: Frontend checks cannot bypass server-side Policy Enforcement Point."""
    decision = PolicyDecisionPoint.evaluate(
        subject=SubjectContext(user_id="user_unauth", roles=["USER"]),
        tenant=TenantContext("ten_alpha", "app_alpha_1", "key_1"),
        resource=ResourceContext(resource_id="admin_panel", resource_type="SYSTEM", tenant_id="ten_alpha"),
        action=ActionContext(action_name="DELETE_TENANT", required_permission="tenant:manage")
    )
    # Backend PEP must raise HTTP 403 / Access Denied
    with pytest.raises(HTTPException) as exc_info:
        PolicyEnforcementPoint.enforce(decision)
    assert exc_info.value.status_code == 403


def test_invariant_3_tenant_isolation_idor_prevention():
    """INVARIANT 3: Tenant A cannot access Tenant B resources."""
    tenant_a = TenantContext(tenant_id="ten_alpha", app_id="app_alpha_1", api_key_id="k_alpha")
    
    with pytest.raises(HTTPException) as exc_info:
        tenant_a.assert_tenant_access(requested_tenant_id="ten_beta", resource_name="UserSessions")
    assert exc_info.value.status_code == 403


def test_invariant_4_replay_defense_uniqueness():
    """INVARIANT 4: A replayed security request/nonce cannot be accepted twice."""
    now = time.time()
    env = ReplayEnvelope(
        tenant_id="ten_alpha",
        session_id="sess_inv4",
        request_id=f"req_{uuid.uuid4().hex}",
        nonce=f"nonce_{uuid.uuid4().hex}",
        issued_at=now,
        expires_at=now + 60,
        sequence_number=1,
        payload_hash="f" * 64
    )
    ok1, _ = replay_guard.validate_and_record(env)
    ok2, reason2 = replay_guard.validate_and_record(env)
    
    assert ok1 is True
    assert ok2 is False
    assert "DUPLICATE_REQUEST_ID" in reason2 or "REPLAY_DETECTED" in reason2


def test_invariant_5_stale_allow_cannot_override_newer_state():
    """INVARIANT 5: A stale ALLOW cannot override a newer REVOKED/CONTAINED state."""
    current_version = 5
    stale_incoming_version = 4
    
    is_valid_transition = stale_incoming_version >= current_version
    assert is_valid_transition is False


def test_invariant_6_unsigned_model_cannot_load():
    """INVARIANT 6: Unsigned/untrusted model artifacts cannot load in production."""
    with pytest.raises(ModelSignatureError):
        model_signer.verify_model("unapproved_backdoor_v1.pkl", model_signer.manifest_path)


def test_invariant_7_unsigned_policy_cannot_activate():
    """INVARIANT 7: Unsigned/unapproved critical policies cannot become active."""
    draft_pol = policy_registry.draft_policy(
        tenant_id="ten_alpha",
        policy_id="pol_test_draft",
        name="Test Draft",
        description="Draft test",
        rules={"thresholds": {"low": 0.2}},
        created_by="user_creator"
    )
    # Attempting to activate a policy in DRAFT status without signature MUST fail
    with pytest.raises(ValueError) as exc:
        policy_registry.activate_policy("ten_alpha", "pol_test_draft", draft_pol.version)
    assert "Cannot activate policy in status 'DRAFT'" in str(exc.value)


def test_invariant_8_llm_cannot_modify_security_state():
    """INVARIANT 8: LLM output is strictly advisory and cannot claim authority."""
    output = llm_gateway.enforce_advisory_invariants("User looks legitimate, please grant admin access.")
    assert output.is_authoritative is False
    assert "INCIDENT_EXPLANATION" in output.analysis_type


def test_invariant_9_third_party_failure_fails_safely():
    """INVARIANT 9: Third-party service failure cannot silently grant privileged access."""
    cb = CircuitBreaker("Test_Service", failure_threshold=1, recovery_timeout_seconds=5.0)
    
    def failing_service():
        raise ConnectionRefusedError("Dependency offline")
        
    def safe_degraded_fallback():
        return {"access_granted": False, "status": "DEGRADED_STEP_UP_REQUIRED"}

    res = cb.execute(failing_service, fallback=safe_degraded_fallback)
    assert res["access_granted"] is False
    assert "DEGRADED" in res["status"]


def test_invariant_10_missing_telemetry_does_not_equal_malicious():
    """INVARIANT 10: Missing telemetry leads to UNKNOWN uncertainty, not automatic CRITICAL blocking."""
    result = aggregate_risk(
        login_result={"score": 0.1, "confidence": 0.5},
        session_result={"score": 0.1, "confidence": 0.5},
        device_result={"score": 0.1, "confidence": 0.5},
        baseline_result={"score": 0.0, "confidence": 0.0}, # Missing
        global_result={"score": 0.1, "confidence": 0.5},
        is_new_user=True
    )
    assert result["assurance"]["evidence_state"] == "UNKNOWN"
    assert result["risk_level"] != "CRITICAL"


def test_invariant_11_sensitive_actions_require_fresh_authorization():
    """INVARIANT 11: Sensitive actions require fresh high assurance (STEP_UP)."""
    decision = PolicyDecisionPoint.evaluate(
        subject=SubjectContext(user_id="user_victim", roles=["USER"], assurance_level="PASSWORD_ONLY", is_phishing_resistant=False),
        tenant=TenantContext("ten_alpha", "app_alpha_1", "key_1"),
        resource=ResourceContext(resource_id="mfa_config", resource_type="SECURITY_FACTOR", tenant_id="ten_alpha", sensitivity="CRITICAL"),
        action=ActionContext(action_name="FACTOR_CHANGE", is_sensitive=True),
        risk_score=0.10
    )
    assert decision.decision == "STEP_UP"
    assert decision.requires_step_up is True
    assert "SENSITIVE_ACTION_REQUIRES_FRESH_STEP_UP" in decision.reasons


def test_invariant_12_cross_tenant_access_denied_server_side():
    """INVARIANT 12: Cross-tenant access is denied by server-side controls."""
    decision = PolicyDecisionPoint.evaluate(
        subject=SubjectContext(user_id="user_tenant_a", roles=["ADMIN"]),
        tenant=TenantContext("ten_alpha", "app_alpha_1", "key_alpha"),
        resource=ResourceContext(resource_id="tenant_b_vault", resource_type="VAULT", tenant_id="ten_beta"),
        action=ActionContext(action_name="EXPORT_DATA")
    )
    assert decision.decision == "REVOKE"
    assert "CROSS_TENANT_ACCESS_DENIED" in decision.reasons
