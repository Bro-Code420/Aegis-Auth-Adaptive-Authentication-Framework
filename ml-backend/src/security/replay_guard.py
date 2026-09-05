"""
Cryptographic Replay Defense & Monotonic Sequence Guard for AegisAuth Pro.
Guarantees requests, nonces, and telemetry cannot be replayed or processed out-of-order.
"""
import time
import hashlib
import threading
from typing import Dict, Any, Optional, Tuple, Set
from pydantic import BaseModel, Field
from fastapi import HTTPException
from src.utils.logger import logger


class ReplayEnvelope(BaseModel):
    tenant_id: str
    session_id: str
    request_id: str
    nonce: str = Field(..., min_length=16, description="Cryptographically random unique nonce")
    issued_at: float = Field(..., description="Client/Event timestamp (epoch seconds)")
    expires_at: float = Field(..., description="Expiration timestamp (epoch seconds)")
    sequence_number: int = Field(..., ge=0, description="Monotonically increasing sequence number")
    payload_hash: str = Field(..., min_length=32, description="SHA-256 hash of payload")
    key_id: Optional[str] = None
    algorithm_version: str = "AEG1"


class ReplayGuard:
    """
    Thread-safe, atomic Replay Defense Engine.
    Maintains a sliding-window cache of seen nonces, request IDs, and monotonic sequence numbers.
    """
    def __init__(self, max_clock_skew_seconds: float = 300.0):
        self.max_clock_skew_seconds = max_clock_skew_seconds
        self._lock = threading.Lock()
        
        # Maps nonce -> expiry_time
        self._seen_nonces: Dict[str, float] = {}
        
        # Maps request_id -> expiry_time
        self._seen_requests: Dict[str, float] = {}
        
        # Maps (tenant_id, session_id) -> highest_seen_sequence_number
        self._session_sequences: Dict[Tuple[str, str], int] = {}

    def _cleanup_expired(self, now: float) -> None:
        """Prunes expired entries from sliding window."""
        expired_nonces = [n for n, exp in self._seen_nonces.items() if exp < now]
        for n in expired_nonces:
            del self._seen_nonces[n]
            
        expired_reqs = [r for r, exp in self._seen_requests.items() if exp < now]
        for r in expired_reqs:
            del self._seen_requests[r]

    def validate_and_record(
        self,
        envelope: ReplayEnvelope,
        raw_payload_bytes: Optional[bytes] = None,
        expected_tenant_id: Optional[str] = None,
    ) -> Tuple[bool, Optional[str]]:
        """
        Atomically validates all replay invariants and records the nonce.
        
        Returns: (is_valid, error_reason)
        """
        now = time.time()
        
        with self._lock:
            self._cleanup_expired(now)
            
            # 1. Tenant match validation
            if expected_tenant_id and envelope.tenant_id != expected_tenant_id:
                reason = f"TENANT_MISMATCH: Envelope tenant '{envelope.tenant_id}' != context '{expected_tenant_id}'"
                logger.warning(f"[ReplayGuard] {reason}")
                return False, reason

            # 2. Timestamp Window & Expiration Validation
            if envelope.expires_at < now:
                reason = f"REQUEST_EXPIRED: Expired {now - envelope.expires_at:.1f}s ago"
                logger.warning(f"[ReplayGuard] {reason}")
                return False, reason
                
            if abs(now - envelope.issued_at) > self.max_clock_skew_seconds:
                reason = f"CLOCK_SKEW_EXCEEDED: Timestamp skew {abs(now - envelope.issued_at):.1f}s > allowed {self.max_clock_skew_seconds}s"
                logger.warning(f"[ReplayGuard] {reason}")
                return False, reason

            # 3. Payload Integrity Validation (if raw payload provided)
            if raw_payload_bytes:
                calculated_hash = hashlib.sha256(raw_payload_bytes).hexdigest()
                if not hmac.compare_digest(calculated_hash, envelope.payload_hash):
                    reason = "PAYLOAD_HASH_MISMATCH: Payload does not match envelope integrity hash"
                    logger.warning(f"[ReplayGuard] {reason}")
                    return False, reason

            # 4. Request ID Uniqueness Check
            if envelope.request_id in self._seen_requests:
                reason = f"DUPLICATE_REQUEST_ID: Request '{envelope.request_id}' has already been processed"
                logger.warning(f"[ReplayGuard] {reason}")
                return False, reason

            # 5. Nonce Uniqueness Check (Replay Detection)
            if envelope.nonce in self._seen_nonces:
                reason = f"REPLAY_DETECTED: Nonce '{envelope.nonce[:12]}...' already utilized"
                logger.warning(f"[ReplayGuard] {reason}")
                return False, reason

            # 6. Monotonic Sequence Number Validation
            seq_key = (envelope.tenant_id, envelope.session_id)
            current_highest_seq = self._session_sequences.get(seq_key, -1)
            
            if envelope.sequence_number <= current_highest_seq:
                reason = (
                    f"OUT_OF_ORDER_SEQUENCE: Received sequence {envelope.sequence_number} "
                    f"<= current sequence {current_highest_seq} for session {envelope.session_id}"
                )
                logger.warning(f"[ReplayGuard] {reason}")
                return False, reason

            # All checks passed — Atomically record state
            self._seen_nonces[envelope.nonce] = envelope.expires_at
            self._seen_requests[envelope.request_id] = envelope.expires_at
            self._session_sequences[seq_key] = envelope.sequence_number

            logger.info(
                f"[ReplayGuard] Verified request {envelope.request_id} "
                f"(Nonce: {envelope.nonce[:8]}..., Seq: {envelope.sequence_number}, Session: {envelope.session_id})"
            )
            return True, None


replay_guard = ReplayGuard()


def assert_replay_defense(
    envelope: ReplayEnvelope,
    expected_tenant_id: Optional[str] = None
) -> None:
    """Enforces replay defense or raises HTTP 409 Conflict."""
    is_valid, reason = replay_guard.validate_and_record(envelope, expected_tenant_id=expected_tenant_id)
    if not is_valid:
        raise HTTPException(
            status_code=409,
            detail={"error": "REPLAY_DEFENSE_TRIGGERED", "reason": reason}
        )
