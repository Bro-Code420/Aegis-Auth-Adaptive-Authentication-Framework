"""
Alert Governor & Spending Quota Guard for AegisAuth Pro.
Prevents SMS/Voice Alert Bombing (Twilio), LLM Analysis Cost Amplification,
and Inference Flooding through sliding-window deduplication, tenant budgets, and rate limiting.
"""
import time
from typing import Dict, Any, Optional, Tuple
from collections import defaultdict, deque
from fastapi import HTTPException
from src.utils.logger import logger


class AlertGovernor:
    """
    In-memory / distributed rate limiter, quota governor, and deduplication engine.
    """
    def __init__(
        self,
        cooldown_seconds: int = 300,            # 5 minutes per user/incident
        max_alerts_per_tenant_hour: int = 20,   # Max voice/SMS calls per tenant per hour
        max_inferences_per_ip_minute: int = 60, # Max ML requests per IP per minute
        max_llm_calls_per_user_hour: int = 30,  # Max LLM queries per user per hour
    ):
        self.cooldown_seconds = cooldown_seconds
        self.max_alerts_per_tenant_hour = max_alerts_per_tenant_hour
        self.max_inferences_per_ip_minute = max_inferences_per_ip_minute
        self.max_llm_calls_per_user_hour = max_llm_calls_per_user_hour
        
        # Maps (tenant_id, incident_type, identifier) -> last_dispatched_timestamp
        self._last_dispatched: Dict[str, float] = {}
        # Maps tenant_id -> list of dispatch timestamps in the past hour
        self._tenant_hourly_counts: Dict[str, list] = defaultdict(list)
        # Maps ip_address -> deque of timestamps in the past minute
        self._ip_minute_counts: Dict[str, deque] = defaultdict(lambda: deque())
        # Maps user_id -> deque of timestamps in the past hour
        self._user_llm_counts: Dict[str, deque] = defaultdict(lambda: deque())

    def can_dispatch_alert(
        self,
        tenant_id: str,
        incident_type: str,
        identifier: str,  # e.g., user_email or ip
        severity: str = "HIGH",
    ) -> Tuple[bool, Optional[str]]:
        """
        Evaluates whether an alert (Voice/SMS/External) can be dispatched.
        """
        now = time.time()
        key = f"{tenant_id}:{incident_type}:{identifier}"

        # 1. Cooldown deduplication check
        last_time = self._last_dispatched.get(key, 0.0)
        time_since = now - last_time
        
        if time_since < self.cooldown_seconds:
            # Critical alerts bypass soft cooldown only if > 60s has passed
            if severity != "CRITICAL" or time_since < 60:
                reason = f"ALERT_COOLDOWN_ACTIVE: Last dispatched {time_since:.1f}s ago (Cooldown: {self.cooldown_seconds}s)"
                logger.warning(f"[AlertGovernor] Blocked alert for {key}: {reason}")
                return False, reason

        # 2. Clean up hourly window for tenant
        one_hour_ago = now - 3600
        recent_dispatches = [t for t in self._tenant_hourly_counts[tenant_id] if t > one_hour_ago]
        self._tenant_hourly_counts[tenant_id] = recent_dispatches

        # 3. Tenant budget quota check
        if len(recent_dispatches) >= self.max_alerts_per_tenant_hour:
            reason = f"TENANT_QUOTA_EXCEEDED: Reached max {self.max_alerts_per_tenant_hour} dispatches/hr"
            logger.error(f"[AlertGovernor] Blocked alert for tenant {tenant_id}: {reason}")
            return False, reason

        return True, None

    def record_dispatch(
        self,
        tenant_id: str,
        incident_type: str,
        identifier: str,
    ):
        """Records a successful alert dispatch to update state."""
        now = time.time()
        key = f"{tenant_id}:{incident_type}:{identifier}"
        self._last_dispatched[key] = now
        self._tenant_hourly_counts[tenant_id].append(now)
        logger.info(f"[AlertGovernor] Recorded alert dispatch for {key}")

    def check_inference_rate_limit(self, ip_address: str) -> None:
        """
        Rate limits expensive ML inference calls per IP to prevent compute exhaustion.
        Raises HTTP 429 if limit exceeded.
        """
        now = time.time()
        one_min_ago = now - 60.0
        q = self._ip_minute_counts[ip_address]
        
        while q and q[0] < one_min_ago:
            q.popleft()
            
        if len(q) >= self.max_inferences_per_ip_minute:
            reason = f"IP_RATE_LIMIT_EXCEEDED: Max {self.max_inferences_per_ip_minute} inferences/min for {ip_address}"
            logger.warning(f"[AlertGovernor] {reason}")
            raise HTTPException(status_code=429, detail=reason)
            
        q.append(now)

    def check_llm_rate_limit(self, user_id: str) -> None:
        """
        Rate limits LLM / Gemini queries per user to prevent API quota/budget exhaustion.
        Raises HTTP 429 if limit exceeded.
        """
        now = time.time()
        one_hour_ago = now - 3600.0
        q = self._user_llm_counts[user_id]
        
        while q and q[0] < one_hour_ago:
            q.popleft()
            
        if len(q) >= self.max_llm_calls_per_user_hour:
            reason = f"LLM_BUDGET_EXCEEDED: Max {self.max_llm_calls_per_user_hour} AI chat queries/hr for {user_id}"
            logger.warning(f"[AlertGovernor] {reason}")
            raise HTTPException(status_code=429, detail=reason)
            
        q.append(now)


alert_governor = AlertGovernor()
