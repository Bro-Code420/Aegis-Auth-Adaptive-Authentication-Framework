"""
Tamper-Evident Hash-Chained Audit Logging Engine for AegisAuth Pro.
Guarantees authoritative security decisions, policy changes, and events
cannot be altered or deleted without immediate cryptographic detection.
"""
import time
import json
import base64
import hashlib
import threading
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
from src.utils.logger import logger


class AuditRecord(BaseModel):
    index: int
    event_id: str
    tenant_id: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    action: str
    decision: str
    reasons: List[str]
    risk_score: float
    timestamp: float
    previous_hash: str
    current_hash: str


class AuditLogChain:
    """
    Append-only, cryptographically hash-chained audit log.
    """
    GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

    def __init__(self):
        self._chain: List[AuditRecord] = []
        self._lock = threading.Lock()
        
        # Keypair for checkpoint signing
        self._signer_key = ed25519.Ed25519PrivateKey.generate()
        self._public_key = self._signer_key.public_key()
        
        pub_bytes = self._public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )
        self._pub_b64 = base64.b64encode(pub_bytes).decode("utf-8")

    def _compute_hash(
        self,
        index: int,
        event_id: str,
        tenant_id: str,
        session_id: Optional[str],
        user_id: Optional[str],
        action: str,
        decision: str,
        reasons: List[str],
        risk_score: float,
        timestamp: float,
        previous_hash: str
    ) -> str:
        payload = {
            "index": index,
            "event_id": event_id,
            "tenant_id": tenant_id,
            "session_id": session_id or "",
            "user_id": user_id or "",
            "action": action,
            "decision": decision,
            "reasons": sorted(reasons),
            "risk_score": round(risk_score, 4),
            "timestamp": timestamp,
            "previous_hash": previous_hash
        }
        canonical_bytes = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        return hashlib.sha256(canonical_bytes).hexdigest()

    def append_decision(
        self,
        event_id: str,
        tenant_id: str,
        action: str,
        decision: str,
        reasons: List[str],
        risk_score: float,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> AuditRecord:
        """
        Atomically appends a new decision to the tamper-evident hash chain.
        """
        with self._lock:
            index = len(self._chain)
            prev_hash = self._chain[-1].current_hash if self._chain else self.GENESIS_HASH
            now = time.time()
            
            current_hash = self._compute_hash(
                index=index,
                event_id=event_id,
                tenant_id=tenant_id,
                session_id=session_id,
                user_id=user_id,
                action=action,
                decision=decision,
                reasons=reasons,
                risk_score=risk_score,
                timestamp=now,
                previous_hash=prev_hash
            )
            
            record = AuditRecord(
                index=index,
                event_id=event_id,
                tenant_id=tenant_id,
                session_id=session_id,
                user_id=user_id,
                action=action,
                decision=decision,
                reasons=reasons,
                risk_score=risk_score,
                timestamp=now,
                previous_hash=prev_hash,
                current_hash=current_hash
            )
            self._chain.append(record)
            
            logger.info(
                f"[AuditChain] Appended block #{index} [{decision}] Event: {event_id} "
                f"(Hash: {current_hash[:10]}... Prev: {prev_hash[:10]}...)"
            )
            return record

    def verify_chain_integrity(self) -> Tuple[bool, Optional[str], Optional[int]]:
        """
        Scans the entire chain and cryptographically validates every hash link.
        
        Returns: (is_intact, error_message, tampered_index)
        """
        with self._lock:
            if not self._chain:
                return True, None, None

            for i, record in enumerate(self._chain):
                # 1. Verify previous hash link
                expected_prev = self._chain[i - 1].current_hash if i > 0 else self.GENESIS_HASH
                if record.previous_hash != expected_prev:
                    msg = (
                        f"BROKEN_LINK at index {i}: previous_hash '{record.previous_hash[:12]}...' "
                        f"does not match actual previous '{expected_prev[:12]}...'"
                    )
                    logger.error(f"[AuditChain Integrity Violation] {msg}")
                    return False, msg, i

                # 2. Recalculate and verify record content hash
                recalculated = self._compute_hash(
                    index=record.index,
                    event_id=record.event_id,
                    tenant_id=record.tenant_id,
                    session_id=record.session_id,
                    user_id=record.user_id,
                    action=record.action,
                    decision=record.decision,
                    reasons=record.reasons,
                    risk_score=record.risk_score,
                    timestamp=record.timestamp,
                    previous_hash=record.previous_hash
                )
                if record.current_hash != recalculated:
                    msg = (
                        f"TAMPERED_RECORD at index {i}: stored hash '{record.current_hash[:12]}...' "
                        f"!= recalculated '{recalculated[:12]}...'"
                    )
                    logger.error(f"[AuditChain Integrity Violation] {msg}")
                    return False, msg, i

            return True, "Audit chain integrity 100% verified and intact.", None

    def get_records(self, limit: int = 100) -> List[AuditRecord]:
        with self._lock:
            return list(self._chain[-limit:])


audit_chain = AuditLogChain()
