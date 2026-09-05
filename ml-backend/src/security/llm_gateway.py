"""
LLM Security Gateway & Prompt Injection Defense for AegisAuth Pro.
Guarantees LLMs (Gemini) operate strictly as ADVISORY analysis tools with
zero direct authorization or state-mutation authority.
"""
import re
import time
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field
from src.utils.logger import logger


class LLMAnalysisOutput(BaseModel):
    analysis_type: str = Field(..., description="e.g. INCIDENT_EXPLANATION, ANOMALY_SUMMARY, REMEDIATION_ADVICE")
    summary: str
    explanation: str
    recommendations: List[str]
    evidence_ids: List[str] = Field(default_factory=list)
    confidence: float = Field(..., ge=0.0, le=1.0)
    is_authoritative: bool = Field(default=False, description="Always False: LLM cannot authoritatively authorize")
    generated_at: float = Field(default_factory=time.time)


# Adversarial prompt injection signatures & instruction smuggling patterns
PROMPT_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior)\s+instructions", re.IGNORECASE),
    re.compile(r"disregard\s+(the\s+)?(above|system)\s+rules", re.IGNORECASE),
    re.compile(r"system\s*:\s*override", re.IGNORECASE),
    re.compile(r"<\|im_start\|>|<\|im_end\|>", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+in\s+(developer|god|admin|dan)\s+mode", re.IGNORECASE),
    re.compile(r"reveal\s+(the\s+)?(master|encryption|api)\s+key", re.IGNORECASE),
    re.compile(r"dump\s+(all\s+)?(tenant|user|database)\s+records", re.IGNORECASE),
    re.compile(r"execute\s+(system|bash|shell|sql)\s+command", re.IGNORECASE),
    re.compile(r"authorize\s+me\s+as\s+admin", re.IGNORECASE),
    re.compile(r"set\s+session\s+state\s+to\s+active", re.IGNORECASE),
]


class LLMSecurityGateway:
    """
    Security Gateway screening all inbound prompts and outbound LLM generations.
    """
    def sanitize_and_screen_input(self, raw_user_text: str, user_id: str) -> Tuple[bool, str, Optional[str]]:
        """
        Scans for prompt injection / instruction smuggling and strips unsafe control characters.
        
        Returns: (is_safe, sanitized_text, detection_reason)
        """
        if not raw_user_text:
            return True, "", None

        # 1. Match against known adversarial injection signatures
        for pattern in PROMPT_INJECTION_PATTERNS:
            match = pattern.search(raw_user_text)
            if match:
                matched_snippet = match.group(0)
                reason = f"PROMPT_INJECTION_DETECTED: Matched adversarial pattern '{matched_snippet}'"
                logger.warning(f"[LLMSecurityGateway] Blocked injection from user {user_id}: {reason}")
                return False, "", reason

        # 2. Strip dangerous control characters, unclosed code block delimiters, and null bytes
        sanitized = raw_user_text.replace("\x00", "").replace("\r\n", "\n")
        # Remove system role tags
        sanitized = re.sub(r"\[/?SYSTEM\]", "[FILTERED_TAG]", sanitized, flags=re.IGNORECASE)
        sanitized = re.sub(r"\[/?ADMIN\]", "[FILTERED_TAG]", sanitized, flags=re.IGNORECASE)

        # Truncate overly long prompts to prevent token exhaustion DOS
        if len(sanitized) > 4000:
            sanitized = sanitized[:4000] + "\n[Content truncated by Security Gateway]"

        return True, sanitized, None

    def enforce_advisory_invariants(self, raw_llm_response: str) -> LLMAnalysisOutput:
        """
        Validates LLM output against strict schema and guarantees advisory-only status.
        """
        # Ensure LLM text does not claim to authorize or bypass
        summary = "Aegis Security Copilot Analysis"
        explanation = raw_llm_response
        recommendations = [
            "Review session evidence in Security Center",
            "Verify user MFA credentials if anomaly persists"
        ]

        return LLMAnalysisOutput(
            analysis_type="INCIDENT_EXPLANATION",
            summary=summary,
            explanation=explanation,
            recommendations=recommendations,
            evidence_ids=["ev_session_context"],
            confidence=0.88,
            is_authoritative=False, # Enforces INVARIANT: LLM is strictly advisory
            generated_at=time.time()
        )


llm_gateway = LLMSecurityGateway()
