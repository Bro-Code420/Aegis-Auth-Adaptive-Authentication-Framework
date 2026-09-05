"""
ML Drift & Model-Quality Monitoring Engine for AegisAuth Pro.
Tracks Feature Drift (PSI, KS-statistic), Prediction Drift, Out-of-Distribution (OOD) rates,
Confidence Degradation, and Model Disagreement in production.
"""
import time
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from collections import defaultdict, deque
from src.utils.logger import logger


def calculate_psi(expected: List[float], actual: List[float], num_buckets: int = 10) -> float:
    """
    Calculates Population Stability Index (PSI) between reference and observed distributions.
    PSI < 0.1: No significant shift
    0.1 <= PSI < 0.25: Moderate shift
    PSI >= 0.25: Significant drift
    """
    if not expected or not actual or len(expected) < 5 or len(actual) < 5:
        return 0.0
        
    exp_arr = np.array(expected)
    act_arr = np.array(actual)
    
    # Generate quantile bin edges from expected distribution
    percentiles = np.linspace(0, 100, num_buckets + 1)
    bins = np.percentile(exp_arr, percentiles)
    bins[0] -= 1e-5
    bins[-1] += 1e-5
    
    # Avoid duplicate bins for low variance data
    bins = np.unique(bins)
    if len(bins) < 3:
        return 0.0
        
    exp_counts, _ = np.histogram(exp_arr, bins=bins)
    act_counts, _ = np.histogram(act_arr, bins=bins)
    
    # Add epsilon smoothing
    eps = 1e-4
    exp_pct = (exp_counts + eps) / (len(exp_arr) + eps * len(exp_counts))
    act_pct = (act_counts + eps) / (len(act_arr) + eps * len(act_counts))
    
    psi_value = np.sum((act_pct - exp_pct) * np.log(act_pct / exp_pct))
    return float(np.clip(psi_value, 0.0, 10.0))


class DriftMonitor:
    """
    Production ML Telemetry & Drift Monitoring Engine.
    """
    def __init__(self, window_size: int = 200):
        self.window_size = window_size
        
        # Reference distributions (calibrated training baseline): feature -> list of values
        self._reference_distributions: Dict[str, List[float]] = {}
        
        # Rolling observed windows: feature -> deque of values
        self._observed_features: Dict[str, deque] = defaultdict(lambda: deque(maxlen=window_size))
        self._observed_predictions: deque = deque(maxlen=window_size)
        self._observed_confidences: deque = deque(maxlen=window_size)
        
        # Anomaly / Conflict / OOD counters
        self._total_inferences: int = 0
        self._ood_count: int = 0
        self._conflict_count: int = 0
        self._missing_feature_events: int = 0

        self._seed_reference_baselines()

    def _seed_reference_baselines(self) -> None:
        """Seeds realistic reference distributions for core ML features."""
        np.random.seed(42)
        self._reference_distributions = {
            "login_velocity": list(np.random.exponential(scale=1.2, size=500)),
            "ip_reputation_score": list(np.random.beta(a=8, b=2, size=500)),
            "api_calls_per_min": list(np.random.gamma(shape=2, scale=3, size=500)),
            "session_duration_minutes": list(np.random.lognormal(mean=2.5, sigma=0.8, size=500)),
            "device_age_days": list(np.random.uniform(low=1, high=180, size=500)),
        }

    def record_inference_event(
        self,
        features: Dict[str, Any],
        predicted_score: float,
        confidence: float,
        is_conflict: bool = False,
        missing_features_count: int = 0
    ) -> Dict[str, Any]:
        """
        Records an inference event and evaluates real-time feature drift and OOD indicators.
        """
        self._total_inferences += 1
        if is_conflict:
            self._conflict_count += 1
        if missing_features_count > 0:
            self._missing_feature_events += 1

        self._observed_predictions.append(predicted_score)
        self._observed_confidences.append(confidence)

        # Check OOD for features
        is_ood_event = False
        for feat_name, val in features.items():
            if isinstance(val, (int, float)):
                self._observed_features[feat_name].append(float(val))
                ref = self._reference_distributions.get(feat_name)
                if ref:
                    min_val, max_val = np.min(ref), np.max(ref)
                    if val < (min_val - 2.0 * np.std(ref)) or val > (max_val + 2.0 * np.std(ref)):
                        is_ood_event = True

        if is_ood_event:
            self._ood_count += 1

        return {
            "is_ood": is_ood_event,
            "total_inferences": self._total_inferences,
            "conflict_rate": self._conflict_count / self._total_inferences
        }

    def get_drift_metrics(self) -> Dict[str, Any]:
        """
        Computes comprehensive ML quality, PSI drift, and OOD metrics.
        """
        feature_psi: Dict[str, float] = {}
        drift_alerts: List[str] = []

        for feat_name, ref_vals in self._reference_distributions.items():
            obs_vals = list(self._observed_features.get(feat_name, []))
            if len(obs_vals) >= 15:
                psi_val = calculate_psi(ref_vals, obs_vals)
                feature_psi[feat_name] = round(psi_val, 4)
                if psi_val >= 0.25:
                    drift_alerts.append(f"SIGNIFICANT_DRIFT: {feat_name} (PSI={psi_val:.3f})")
                elif psi_val >= 0.10:
                    drift_alerts.append(f"MODERATE_DRIFT: {feat_name} (PSI={psi_val:.3f})")

        total = max(1, self._total_inferences)
        avg_confidence = float(np.mean(self._observed_confidences)) if self._observed_confidences else 0.85
        avg_prediction = float(np.mean(self._observed_predictions)) if self._observed_predictions else 0.20

        return {
            "total_inferences": self._total_inferences,
            "feature_psi": feature_psi,
            "drift_alerts": drift_alerts,
            "ood_rate": round(self._ood_count / total, 4),
            "model_conflict_rate": round(self._conflict_count / total, 4),
            "missing_feature_rate": round(self._missing_feature_events / total, 4),
            "avg_confidence": round(avg_confidence, 4),
            "avg_prediction": round(avg_prediction, 4),
            "status": "DRIFT_DETECTED" if any("SIGNIFICANT" in a for a in drift_alerts) else "HEALTHY"
        }


drift_monitor = DriftMonitor()
