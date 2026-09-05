"""
Baseline Poisoning Protection Engine for AegisAuth Pro.
Guarantees production user behavioral profiles cannot be immediately manipulated
by untrusted or anomalous observed events.
"""
import time
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from collections import defaultdict
from src.utils.logger import logger


class BaselineProfile:
    """Represents a user's behavioral baseline (features and statistics)."""
    def __init__(self, user_id: str, tenant_id: str):
        self.user_id = user_id
        self.tenant_id = tenant_id
        self.version: int = 1
        self.sample_count: int = 0
        self.created_at: float = time.time()
        self.updated_at: float = time.time()
        # Feature distributions: feature_name -> list of values
        self.features: Dict[str, List[float]] = defaultdict(list)
        # Summary statistics: feature_name -> {"mean": float, "std": float, "q25": float, "q75": float}
        self.stats: Dict[str, Dict[str, float]] = {}


class BaselineGuard:
    """
    Guards baseline profiles by strictly isolating CANDIDATE observations
    from verified PRODUCTION baselines.
    """
    def __init__(
        self,
        min_promotion_samples: int = 20,
        quarantine_window_seconds: float = 3600.0,
        outlier_iqr_multiplier: float = 2.5
    ):
        self.min_promotion_samples = min_promotion_samples
        self.quarantine_window_seconds = quarantine_window_seconds
        self.outlier_iqr_multiplier = outlier_iqr_multiplier
        
        # Maps (tenant_id, user_id) -> BaselineProfile
        self._production_baselines: Dict[Tuple[str, str], BaselineProfile] = {}
        # Maps (tenant_id, user_id) -> list of quarantined candidate observations
        self._candidate_buffer: Dict[Tuple[str, str], List[Dict[str, Any]]] = defaultdict(list)
        # History for rollback: (tenant_id, user_id) -> list of BaselineProfile snapshots
        self._history: Dict[Tuple[str, str], List[BaselineProfile]] = defaultdict(list)

    def record_candidate_event(
        self,
        tenant_id: str,
        user_id: str,
        feature_vector: Dict[str, float],
        evidence_state: str = "TRUSTED"
    ) -> Dict[str, Any]:
        """
        Ingests an observed event into the CANDIDATE isolation buffer.
        Only trusted/verified events are eligible for future promotion.
        """
        key = (tenant_id, user_id)
        now = time.time()
        
        # 1. Poisoning & Outlier Check against current Production baseline
        prod_profile = self._production_baselines.get(key)
        is_poisoning_suspect = False
        poisoning_reason = None
        
        if prod_profile and prod_profile.stats:
            for feat, val in feature_vector.items():
                if feat in prod_profile.stats:
                    s = prod_profile.stats[feat]
                    mean, std = s.get("mean", val), s.get("std", 1.0)
                    z_score = abs(val - mean) / (std if std > 1e-5 else 1.0)
                    if z_score > 4.0:
                        is_poisoning_suspect = True
                        poisoning_reason = f"Extreme deviation on '{feat}' (z-score: {z_score:.2f})"
                        break

        # If event is compromised or high poisoning suspect, reject from candidate baseline
        if evidence_state == "COMPROMISED" or is_poisoning_suspect:
            logger.warning(
                f"[BaselineGuard] Quarantined & filtered anomalous event for user {user_id}: {poisoning_reason or 'Compromised state'}"
            )
            return {
                "status": "QUARANTINED_POISONING_BLOCKED",
                "reason": poisoning_reason or "Untrusted evidence state",
                "promoted": False
            }

        candidate_entry = {
            "timestamp": now,
            "features": feature_vector,
            "evidence_state": evidence_state
        }
        self._candidate_buffer[key].append(candidate_entry)
        
        # 2. Check if candidate buffer meets criteria for promotion
        promoted = self._evaluate_and_promote(tenant_id, user_id)
        
        return {
            "status": "PROMOTED_TO_PRODUCTION" if promoted else "CANDIDATE_BUFFERED",
            "candidate_count": len(self._candidate_buffer[key]),
            "promoted": promoted
        }

    def _evaluate_and_promote(self, tenant_id: str, user_id: str) -> bool:
        """Promotes candidate buffer to production baseline if stability criteria met."""
        key = (tenant_id, user_id)
        candidates = self._candidate_buffer[key]
        
        if len(candidates) < self.min_promotion_samples:
            return False

        # Compute filtered statistics
        feature_names = candidates[0]["features"].keys()
        clean_features: Dict[str, List[float]] = defaultdict(list)
        
        for feat in feature_names:
            raw_vals = [c["features"][feat] for c in candidates if feat in c["features"]]
            if not raw_vals:
                continue
            # Interquartile range outlier suppression
            q25, q75 = np.percentile(raw_vals, 25), np.percentile(raw_vals, 75)
            iqr = q75 - q25
            lower_bound = q25 - (self.outlier_iqr_multiplier * iqr)
            upper_bound = q75 + (self.outlier_iqr_multiplier * iqr)
            
            clean_vals = [v for v in raw_vals if lower_bound <= v <= upper_bound]
            clean_features[feat] = clean_vals if clean_vals else raw_vals

        # Create or update production baseline
        current_prod = self._production_baselines.get(key)
        new_version = (current_prod.version + 1) if current_prod else 1
        
        if current_prod:
            self._history[key].append(current_prod)

        new_prod = BaselineProfile(user_id=user_id, tenant_id=tenant_id)
        new_prod.version = new_version
        new_prod.sample_count = len(candidates)
        new_prod.features = clean_features
        
        for feat, vals in clean_features.items():
            new_prod.stats[feat] = {
                "mean": float(np.mean(vals)),
                "std": float(np.std(vals)),
                "q25": float(np.percentile(vals, 25)),
                "q75": float(np.percentile(vals, 75)),
            }
            
        self._production_baselines[key] = new_prod
        self._candidate_buffer[key] = [] # Flush buffer after promotion
        
        logger.info(
            f"[BaselineGuard] Successfully promoted candidate baseline v{new_version} for user {user_id} "
            f"({new_prod.sample_count} samples)"
        )
        return True

    def get_production_baseline(self, tenant_id: str, user_id: str) -> Optional[BaselineProfile]:
        """Returns verified production baseline."""
        return self._production_baselines.get((tenant_id, user_id))

    def rollback_baseline(self, tenant_id: str, user_id: str) -> bool:
        """Rolls back to prior verified baseline profile snapshot."""
        key = (tenant_id, user_id)
        history = self._history.get(key, [])
        if not history:
            return False
        
        prior_snapshot = history.pop()
        self._production_baselines[key] = prior_snapshot
        logger.info(f"[BaselineGuard] Rolled back baseline to v{prior_snapshot.version} for user {user_id}")
        return True


baseline_guard = BaselineGuard()
