# RISK_ENGINE_LOGIC.md — Risk engine logic (current implementation)

## Scope note
This document describes **risk decision logic** as implemented in:
- `ml-backend/src/api/routes_risk.py`
- `ml-backend/src/api/schemas.py`
- `ml-backend/src/inference/risk_aggregator.py`
- `ml-backend/src/config/settings.py`

It does **not** document model training code internals, only how signals are mapped and combined at runtime.

## Risk Signals

### SDK-level signals (inputs sent by SDK)
SDK sends `SDKRiskRequest` containing:
- `userId`, `email`
- `fingerprint`:
  - `userAgent`, `platform`, `screenResolution`, `timezone`, `hardwareConcurrency`, `language`, `cookieEnabled`, `doNotTrack`, `timestamp`
- optional `metadata` (free-form dictionary)
- optional `simulateFlags`:
  - `newDevice`
  - `countryChange`
  - `vpn`
  - `apiBurst`
  - `privilegeEscalation`

### Metadata keys used by current mapping logic
The ML backend mapping (`map_sdk_to_unified`) reads these metadata keys (if present) to set binary session features:
- `sensitive_route_access` → `sensitive_endpoint_access = 1`
- `bulk_download` → `data_download_mb` elevated (see mapping)
- `token_replay_attempt` → `token_reuse_flag = 1`

## Feature Engineering (mapping logic)

### Two request schemas supported
`POST /predict/risk` accepts:
- `UnifiedRiskRequest` (nested objects: login/session/device/baseline/global_threat)
- `SDKRiskRequest` (flat payload from SDK)

If the request is a `SDKRiskRequest`, the ML backend maps it into a `UnifiedRiskRequest` via `map_sdk_to_unified`.

### SDKRiskRequest → UnifiedRiskRequest mapping (as implemented)
The mapping uses defaults and simulation flags. Key rules:

#### Login feature mapping
- `country_changed = 1` if `simulateFlags.countryChange` else `0`
- `device_known = 0` if `simulateFlags.newDevice` else `1`
- Other login features are currently hard-coded defaults:
  - `login_hour = 14`
  - `login_velocity = 1.0`
  - `ip_reputation_score = 1.0`
  - `asn_changed = 0`
  - `failed_attempts = 0`
  - `mfa_failures = 0`

#### Session feature mapping
- `api_burst = 1` if `simulateFlags.apiBurst` else `0`
- `priv_esc = 1` if `simulateFlags.privilegeEscalation` else `0`
- Metadata-derived flags (defaults to 0 if not provided):
  - `sensitive_endpoint_access = 1` if metadata contains `sensitive_route_access`
  - `data_spike = 1` if metadata contains `bulk_download`
  - `token_reuse_flag = 1` if metadata contains `token_replay_attempt`
- Session numeric features are set as:
  - `api_calls_per_min = 50.0` if `api_burst` else `5.0`
  - `privilege_escalation_attempt = priv_esc`
  - `session_duration_minutes = 10.0`
  - `request_entropy = 3.0`
  - `data_download_mb = 500.0` if `data_spike` else `1.0`

#### Device feature mapping
- `device_age_days = 30` if `device_known` else `0`
- Other device fields are hard-coded defaults:
  - `successful_logins = 10`
  - `failed_attempts = 0`
  - `mfa_failures = 0`
  - `days_since_last_seen = 0`
  - `past_anomaly_count = 0`
  - `password_reset_events = 0`

#### Baseline feature mapping
Hard-coded defaults:
- `login_hour_deviation = 0.0`
- `session_duration_deviation = 0.0`
- `api_call_deviation = 0.0`
- `usual_country_flag = 1` if not `country_changed` else `0`
- `role_sensitivity_score = 0.5`

#### Global threat feature mapping
Hard-coded defaults plus VPN flag:
- `vpn_usage_flag = 1` if `simulateFlags.vpn` else `0`
- Defaults:
  - `distinct_accounts_per_ip = 1`
  - `failed_logins_per_ip = 0`
  - `geo_spread_count = 1`
  - `device_fingerprint_reuse_count = 1`
  - `tor_usage_flag = 0`
  - `credential_stuffing_pattern_flag = 0`
  - `attack_wave_intensity = 0.0`

### Notes on feature extraction
- The SDK fingerprint payload is accepted by the schema but is **not used** by the current mapping logic in `map_sdk_to_unified`.
- Most numeric features are static defaults; the primary dynamic inputs are simulation flags and a small set of metadata booleans.

## Model Pipeline

### Predictors invoked (per request)
On `POST /predict/risk`, the ML backend calls all of:
- `predict_login_anomaly(login_features)`
- `predict_session_anomaly(session_features)`
- `predict_device_trust(device_features)`
- `predict_baseline_anomaly(baseline_features)`
- `predict_global_threat(global_features)`

Each predictor returns a dict used to construct `ModelPredictionResponse`:
- `model` (string)
- `score` (0..1)
- `confidence` (0..1)
- optional: `raw_score`, `cluster_label`, `distance_to_center`

### Model artifact loading
- Models are loaded at app startup via `get_models()` (lifespan hook).
- Files are loaded from `ml-backend/weights/`:
  - `login_model_v1.pkl`
  - `session_model_v1.pkl`
  - `device_trust_model_v1.pkl`
  - `baseline_model_v1.pkl`
  - `global_threat_model_v1.pkl`

## Risk Score Calculation

### Aggregation function
Aggregation is performed by `aggregate_risk()` which:
- Reads per-model `score` values (assumed 0..1).
- Computes a weighted sum using `RISK_WEIGHTS`:
  - login: 0.20
  - session: 0.20
  - device: 0.15
  - baseline: 0.15
  - global: 0.10
  - rule_based: 0.20
- Interprets “device score” as probability of low trust; it is used directly as risk contribution.
- Produces:
  - `risk_score`: rounded to 4 decimals, clamped to [0, 1]
  - `risk_level`: classification by thresholds
  - `components`: flat map including `"rule_based"` (defaults to 0.0 when absent)

### Threshold logic
`risk_level` uses fixed thresholds from `ml-backend/src/config/settings.py`:
- LOW: \(0.00..0.30\)
- MEDIUM: \(0.31..0.60\)
- HIGH: \(0.61..0.80\)
- CRITICAL: \(0.81..1.00\)

## Decision Rules

### ML backend decisions
- The ML backend does not enforce actions; it returns a risk score/level.
- It does not persist results itself.

### SDK decisions (helper methods)
SDK provides helpers:
- `isHighRisk(risk)` returns true if level is HIGH or CRITICAL.
- `isCritical(risk)` returns true if CRITICAL.
- `isLowRisk(risk)` returns true if LOW.

## Action Mapping (current system behavior)

### Demo application UI gating
- Demo login page blocks navigation to `/dashboard` when risk level is HIGH or CRITICAL.
- Demo attack simulator may update Convex session risk but does not enforce backend restrictions.

### Platform dashboard
- Platform records session risk/status and derives “threat” counts and analytics.
- Platform does not implement enforcement actions (e.g., blocking API calls) based on risk.

## Fallback Logic

### SDK fallback behavior
When the SDK cannot reach the backend (network error) or receives an HTTP 5xx:
- Returns a fallback LOW risk response:
  - `risk_score: 0.2`
  - `risk_level: "LOW"`
  - `components: { fallback: 1 }`
  - `timestamp: Date.now()`

Other failures:
- Non-5xx HTTP errors: SDK throws `NetworkError`.
- Timeout-like errors: SDK throws `TimeoutError` (based on message matching).
- Invalid response shape: SDK throws `InvalidResponseError`.

