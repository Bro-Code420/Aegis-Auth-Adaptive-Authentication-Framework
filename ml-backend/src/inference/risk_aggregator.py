"""
Evidence Fusion & Risk Aggregation Engine for AegisAuth Pro.
Combines sub-model predictions, telemetry assurance, evidence quality,
and anomaly velocity with explicit uncertainty and MODEL_CONFLICT handling.
"""
import numpy as np
from typing import Dict, Any, Optional, List
from src.config.settings import RISK_WEIGHTS, RISK_THRESHOLDS
from src.utils.logger import logger


def aggregate_risk(
    login_result: Dict[str, Any],
    session_result: Dict[str, Any],
    device_result: Dict[str, Any],
    baseline_result: Dict[str, Any],
    global_result: Dict[str, Any],
    rule_based_score: Optional[float] = None,
    evidence_metadata: Optional[Dict[str, Any]] = None,
    is_new_user: bool = False,
    historical_risk_scores: Optional[List[float]] = None,
) -> Dict[str, Any]:
    """
    Evidence Fusion & Risk Evaluation Algorithm.
    
    Invariants:
    1. ML predictions are advisory signals weighted by confidence and evidence quality.
    2. Separates uncertainty (cold-start, missing signals) from maliciousness.
    3. Detects model disagreement (`MODEL_CONFLICT`).
    4. Computes risk velocity and temporal trend.
    """
    try:
        evidence_meta = evidence_metadata or {}
        
        # 1. Extract raw scores (clamped to 0.0 - 1.0)
        login_score = float(np.clip(login_result.get("score", 0.0), 0.0, 1.0))
        session_score = float(np.clip(session_result.get("score", 0.0), 0.0, 1.0))
        device_score = float(np.clip(device_result.get("score", 0.0), 0.0, 1.0))
        baseline_score = float(np.clip(baseline_result.get("score", 0.0), 0.0, 1.0))
        global_score = float(np.clip(global_result.get("score", 0.0), 0.0, 1.0))
        rule_score = float(np.clip(rule_based_score if rule_based_score is not None else 0.0, 0.0, 1.0))

        # 2. Extract confidence scores
        login_conf = float(login_result.get("confidence", 0.85))
        session_conf = float(session_result.get("confidence", 0.85))
        device_conf = float(device_result.get("confidence", 0.90))
        baseline_conf = float(baseline_result.get("confidence", 0.50 if is_new_user else 0.85))
        global_conf = float(global_result.get("confidence", 0.80))
        
        # 3. Model Disagreement Detection (MODEL_CONFLICT)
        active_scores = [login_score, session_score, device_score, baseline_score, global_score]
        score_std = float(np.std(active_scores))
        score_range = float(np.max(active_scores) - np.min(active_scores))
        
        model_conflict = False
        conflict_reason = None
        if score_range > 0.65 or (score_std > 0.30 and np.max(active_scores) > 0.75):
            model_conflict = True
            conflict_reason = (
                f"High variance among models (range={score_range:.2f}, std={score_std:.2f}). "
                f"Max signal: {np.max(active_scores):.2f}, Min signal: {np.min(active_scores):.2f}"
            )
            logger.warning(f"[EvidenceFusion] MODEL_CONFLICT detected: {conflict_reason}")

        # 4. Confidence-Weighted Fusion
        weights = RISK_WEIGHTS.copy()
        
        # If new user / cold start, attenuate baseline weight and re-distribute to global & device
        if is_new_user:
            baseline_conf = 0.20
            weights["baseline"] = 0.05
            weights["global"] = 0.20
            weights["device"] = 0.25

        total_weight = sum(weights.values())
        raw_weighted = (
            (weights.get("login", 0.20) * login_score * login_conf) +
            (weights.get("session", 0.20) * session_score * session_conf) +
            (weights.get("device", 0.15) * device_score * device_conf) +
            (weights.get("baseline", 0.15) * baseline_score * baseline_conf) +
            (weights.get("global", 0.10) * global_score * global_conf) +
            (weights.get("rule_based", 0.20) * rule_score)
        ) / total_weight

        # 5. Risk Velocity & Temporal Trend
        risk_velocity = 0.0
        if historical_risk_scores and len(historical_risk_scores) > 0:
            recent_avg = np.mean(historical_risk_scores[-3:])
            risk_velocity = float(raw_weighted - recent_avg)

        # 6. Overall Evidence Quality & Confidence
        avg_confidence = float(np.mean([login_conf, session_conf, device_conf, baseline_conf, global_conf]))
        evidence_quality = "HIGH" if (avg_confidence > 0.80 and not is_new_user) else ("MEDIUM" if avg_confidence > 0.55 else "LOW")

        # 7. First-Class Security State Mapping
        # TRUSTED | SUSPICIOUS | UNKNOWN | COMPROMISED
        if raw_weighted > 0.80 or rule_score >= 0.90:
            evidence_state = "COMPROMISED"
        elif model_conflict or is_new_user:
            evidence_state = "UNKNOWN"
        elif raw_weighted > 0.45 or risk_velocity > 0.10:
            evidence_state = "SUSPICIOUS"
        else:
            evidence_state = "TRUSTED"

        final_risk_score = round(float(np.clip(raw_weighted, 0.0, 1.0)), 4)
        risk_level = _classify_risk_level(final_risk_score)

        components = {
            "login": login_score,
            "session": session_score,
            "device": device_score,
            "baseline": baseline_score,
            "global": global_score,
            "rule_based": rule_score,
        }

        assurance_metadata = {
            "evidence_state": evidence_state,
            "confidence": round(avg_confidence, 3),
            "evidence_quality": evidence_quality,
            "model_conflict": model_conflict,
            "conflict_reason": conflict_reason,
            "risk_velocity": round(risk_velocity, 4),
            "is_new_user": is_new_user,
        }

        logger.info(
            f"[EvidenceFusion] Score={final_risk_score:.4f}, State={evidence_state}, "
            f"Confidence={avg_confidence:.2f}, Conflict={model_conflict}"
        )

        return {
            "risk_score": final_risk_score,
            "risk_level": risk_level,
            "components": components,
            "assurance": assurance_metadata,
        }

    except Exception as e:
        logger.error(f"Error in evidence fusion aggregation: {e}", exc_info=True)
        raise


def _classify_risk_level(risk_score: float) -> str:
    if risk_score <= RISK_THRESHOLDS["LOW"][1]:
        return "LOW"
    elif risk_score <= RISK_THRESHOLDS["MEDIUM"][1]:
        return "MEDIUM"
    elif risk_score <= RISK_THRESHOLDS["HIGH"][1]:
        return "HIGH"
    else:
        return "CRITICAL"
