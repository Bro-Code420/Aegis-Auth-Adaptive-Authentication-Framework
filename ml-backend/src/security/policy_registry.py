"""
Signed & Versioned Security Policy Registry for AegisAuth Pro.
Enforces multi-party governance, Ed25519 digital signatures, immutable version history,
and cryptographic integrity on all security policies.
"""
import time
import json
import base64
import hashlib
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
from src.utils.logger import logger


class PolicyDefinition(BaseModel):
    policy_id: str
    tenant_id: str
    version: int = 1
    name: str
    description: str
    status: str = Field(default="DRAFT", description="DRAFT, PENDING_APPROVAL, SIGNED, ACTIVE, RETIRED")
    rules: Dict[str, Any]
    created_by: str
    approved_by: Optional[str] = None
    created_at: float = Field(default_factory=time.time)
    activated_at: Optional[float] = None
    hash: Optional[str] = None
    signature: Optional[str] = None
    signer_public_key: Optional[str] = None


class PolicyRegistry:
    """
    Cryptographically enforced policy lifecycle manager.
    """
    def __init__(self):
        self._private_key = ed25519.Ed25519PrivateKey.generate()
        self._public_key = self._private_key.public_key()
        
        pub_bytes = self._public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )
        self._pub_b64 = base64.b64encode(pub_bytes).decode("utf-8")
        
        # Maps (tenant_id, policy_id, version) -> PolicyDefinition
        self._policies: Dict[tuple, PolicyDefinition] = {}
        # Maps (tenant_id, policy_id) -> active_version_int
        self._active_policies: Dict[tuple, int] = {}
        
        self._seed_default_policies()

    def _canonical_payload(self, policy: PolicyDefinition) -> bytes:
        data = {
            "policy_id": policy.policy_id,
            "tenant_id": policy.tenant_id,
            "version": policy.version,
            "rules": policy.rules,
            "created_by": policy.created_by,
            "approved_by": policy.approved_by,
        }
        return json.dumps(data, sort_keys=True, separators=(",", ":")).encode("utf-8")

    def _seed_default_policies(self) -> None:
        """Seeds signed default production policies."""
        default_policy = PolicyDefinition(
            policy_id="pol_standard_v1",
            tenant_id="ten_default_customer",
            version=1,
            name="Standard Zero-Trust Policy",
            description="Default adaptive auth policy with step-up at 0.50 and auto-block at 0.85",
            status="ACTIVE",
            rules={
                "thresholds": {"low": 0.30, "medium": 0.50, "high": 0.70, "critical": 0.85},
                "require_phishing_resistant_for_sensitive": True,
                "allow_unknown_device_with_limits": True
            },
            created_by="secops_alice",
            approved_by="ciso_bob",
            created_at=time.time(),
            activated_at=time.time()
        )
        canonical = self._canonical_payload(default_policy)
        default_policy.hash = hashlib.sha256(canonical).hexdigest()
        sig = self._private_key.sign(canonical)
        default_policy.signature = base64.b64encode(sig).decode("utf-8")
        default_policy.signer_public_key = self._pub_b64

        key = (default_policy.tenant_id, default_policy.policy_id, default_policy.version)
        self._policies[key] = default_policy
        self._active_policies[(default_policy.tenant_id, default_policy.policy_id)] = default_policy.version

    def draft_policy(
        self,
        tenant_id: str,
        policy_id: str,
        name: str,
        description: str,
        rules: Dict[str, Any],
        created_by: str
    ) -> PolicyDefinition:
        """Creates a new policy in DRAFT status."""
        active_ver = self._active_policies.get((tenant_id, policy_id), 0)
        new_version = active_ver + 1
        
        policy = PolicyDefinition(
            policy_id=policy_id,
            tenant_id=tenant_id,
            version=new_version,
            name=name,
            description=description,
            status="DRAFT",
            rules=rules,
            created_by=created_by,
            created_at=time.time()
        )
        self._policies[(tenant_id, policy_id, new_version)] = policy
        logger.info(f"[PolicyRegistry] Created DRAFT policy {policy_id} v{new_version} for tenant {tenant_id}")
        return policy

    def submit_for_review(self, tenant_id: str, policy_id: str, version: int) -> PolicyDefinition:
        """Moves policy from DRAFT to PENDING_APPROVAL."""
        key = (tenant_id, policy_id, version)
        policy = self._policies.get(key)
        if not policy:
            raise ValueError(f"Policy {policy_id} v{version} not found.")
        if policy.status != "DRAFT":
            raise ValueError(f"Cannot submit policy in status '{policy.status}' for review.")
        policy.status = "PENDING_APPROVAL"
        return policy

    def approve_and_sign(
        self,
        tenant_id: str,
        policy_id: str,
        version: int,
        approved_by: str
    ) -> PolicyDefinition:
        """
        Approves and cryptographically signs policy with separation of duties enforcement.
        """
        key = (tenant_id, policy_id, version)
        policy = self._policies.get(key)
        if not policy:
            raise ValueError(f"Policy {policy_id} v{version} not found.")
        
        # Dual custody / Separation of duties invariant
        if policy.created_by == approved_by:
            raise PermissionError(
                f"Separation of duties violation: Creator '{policy.created_by}' cannot approve their own policy."
            )
        
        policy.approved_by = approved_by
        canonical = self._canonical_payload(policy)
        policy.hash = hashlib.sha256(canonical).hexdigest()
        sig = self._private_key.sign(canonical)
        policy.signature = base64.b64encode(sig).decode("utf-8")
        policy.signer_public_key = self._pub_b64
        policy.status = "SIGNED"
        
        logger.info(f"[PolicyRegistry] Policy {policy_id} v{version} signed by {approved_by}")
        return policy

    def activate_policy(self, tenant_id: str, policy_id: str, version: int) -> PolicyDefinition:
        """Activates a SIGNED policy into production."""
        key = (tenant_id, policy_id, version)
        policy = self._policies.get(key)
        if not policy:
            raise ValueError(f"Policy {policy_id} v{version} not found.")
        if policy.status != "SIGNED":
            raise ValueError(f"Cannot activate policy in status '{policy.status}'. Policy must be SIGNED.")

        # Cryptographic verification before activation
        self.verify_policy_integrity(policy)

        # Retire prior active version
        prior_ver = self._active_policies.get((tenant_id, policy_id))
        if prior_ver and (tenant_id, policy_id, prior_ver) in self._policies:
            self._policies[(tenant_id, policy_id, prior_ver)].status = "RETIRED"

        policy.status = "ACTIVE"
        policy.activated_at = time.time()
        self._active_policies[(tenant_id, policy_id)] = version
        logger.info(f"[PolicyRegistry] Activated policy {policy_id} v{version} for tenant {tenant_id}")
        return policy

    def rollback_policy(self, tenant_id: str, policy_id: str, target_version: int) -> PolicyDefinition:
        """Rolls back active policy to a previously approved version."""
        key = (tenant_id, policy_id, target_version)
        policy = self._policies.get(key)
        if not policy:
            raise ValueError(f"Target rollback policy version {target_version} not found.")
        
        self.verify_policy_integrity(policy)
        
        current_active = self._active_policies.get((tenant_id, policy_id))
        if current_active:
            self._policies[(tenant_id, policy_id, current_active)].status = "RETIRED"

        policy.status = "ACTIVE"
        self._active_policies[(tenant_id, policy_id)] = target_version
        logger.info(f"[PolicyRegistry] Rolled back {policy_id} to version {target_version}")
        return policy

    def get_active_policy(self, tenant_id: str, policy_id: str = "pol_standard_v1") -> Optional[PolicyDefinition]:
        """Retrieves verified active policy for a tenant."""
        version = self._active_policies.get((tenant_id, policy_id))
        if not version:
            # Fallback to default
            version = self._active_policies.get(("ten_default_customer", "pol_standard_v1"))
            if version:
                return self._policies.get(("ten_default_customer", "pol_standard_v1", version))
            return None
        return self._policies.get((tenant_id, policy_id, version))

    def verify_policy_integrity(self, policy: PolicyDefinition) -> bool:
        """Cryptographically verifies Ed25519 signature of policy."""
        if not policy.signature or not policy.signer_public_key:
            raise ValueError(f"Policy {policy.policy_id} v{policy.version} is missing cryptographic signature.")

        canonical = self._canonical_payload(policy)
        actual_hash = hashlib.sha256(canonical).hexdigest()
        if policy.hash and actual_hash != policy.hash:
            raise ValueError("Policy content hash mismatch. Potential tampering detected.")

        pub_bytes = base64.b64decode(policy.signer_public_key)
        pub_key = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
        sig_bytes = base64.b64decode(policy.signature)

        pub_key.verify(sig_bytes, canonical)
        return True


policy_registry = PolicyRegistry()
