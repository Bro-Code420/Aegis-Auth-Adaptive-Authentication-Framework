# ML Backend Codebase Index

Comprehensive index of the Adaptive Auth ML Backend codebase — structure, files, and their purposes.

---

## 📁 Project Structure

```
ml-backend/
├── config/                     # Project-level configuration
├── src/
│   ├── api/                    # FastAPI application & routes
│   ├── config/                 # Application settings
│   ├── features/               # Feature engineering
│   ├── inference/              # ML prediction & aggregation
│   ├── models/                 # Model definitions
│   ├── training/               # Training scripts
│   └── utils/                  # Utilities (logging)
├── tests/                      # Test suite
├── weights/                    # Trained model files (.pkl)
├── data/                       # Training data
│   └── raw/                    # Raw CSV datasets
├── notebooks/                  # Jupyter notebooks
├── requirements.txt
├── run.py
├── test_client.py
└── Dockerfile
```

---

## 📂 Directory & File Reference

### `config/`

| File | Purpose |
|------|---------|
| `logging_config.py` | Logging setup with file/console handlers, `setup_logging()`, `get_logger()` |
| `settings.py` | *(if exists)* Project-level settings |

---

### `src/api/` — FastAPI Layer

| File | Purpose | Key Exports |
|------|---------|-------------|
| `main.py` | FastAPI app entry point, lifespan, CORS, routers | `app` |
| `schemas.py` | Pydantic request/response models | `LoginRequest`, `SessionRequest`, `DeviceRequest`, `BaselineRequest`, `GlobalRequest`, `UnifiedRiskRequest`, `RiskResponse`, `HealthResponse` |
| `routes_login.py` | Login anomaly prediction endpoint | `router`, `predict_login` |
| `routes_session.py` | Session drift prediction endpoint | `router`, `predict_session` |
| `routes_device.py` | Device trust prediction endpoint | `router`, `predict_device` |
| `routes_baseline.py` | Baseline anomaly prediction endpoint | `router`, `predict_baseline` |
| `routes_global.py` | Global threat prediction endpoint | `router`, `predict_global` |
| `routes_risk.py` | Unified risk aggregation endpoint | `router`, `predict_risk` |

**API Endpoints:**
- `GET /` — Root info
- `GET /health` — Health check
- `POST /predict/login` — Login anomaly
- `POST /predict/session` — Session drift
- `POST /predict/device` — Device trust
- `POST /predict/baseline` — Baseline anomaly
- `POST /predict/global` — Global threat
- `POST /predict/risk` — Unified risk

---

### `src/config/` — Application Configuration

| File | Purpose | Key Exports |
|------|---------|-------------|
| `settings.py` | API, model, and risk settings | `BASE_DIR`, `WEIGHTS_DIR`, `MODEL_FILES`, `RISK_WEIGHTS`, `RISK_THRESHOLDS`, `API_HOST`, `API_PORT` |

---

### `src/features/` — Feature Engineering

| File | Purpose | Key Functions |
|------|---------|---------------|
| `login_features.py` | Login feature extraction | `extract_login_features()`, `get_login_feature_names()` |
| `session_features.py` | Session feature extraction | `extract_session_features()`, `get_session_feature_names()` |
| `device_features.py` | Device feature extraction | `extract_device_features()`, `get_device_feature_names()` |
| `baseline_features.py` | Baseline feature extraction | `extract_baseline_features()`, `get_baseline_feature_names()` |
| `global_features.py` | Global threat feature extraction | `extract_global_features()`, `get_global_feature_names()` |

**Feature sets:**
- **Login:** `login_hour`, `device_known`, `country_changed`, `login_velocity`, `ip_reputation_score`, `asn_changed`, `failed_attempts`, `mfa_failures`
- **Session:** `api_calls_per_min`, `sensitive_endpoint_access`, `privilege_escalation_attempt`, `session_duration_minutes`, `request_entropy`, `data_download_mb`, `token_reuse_flag`
- **Device:** `successful_logins`, `failed_attempts`, `mfa_failures`, `device_age_days`, `days_since_last_seen`, `past_anomaly_count`, `password_reset_events`
- **Baseline:** `login_hour_deviation`, `session_duration_deviation`, `api_call_deviation`, `usual_country_flag`, `role_sensitivity_score`
- **Global:** `distinct_accounts_per_ip`, `failed_logins_per_ip`, `geo_spread_count`, `device_fingerprint_reuse_count`, `tor_usage_flag`, `vpn_usage_flag`, `credential_stuffing_pattern_flag`, `attack_wave_intensity`

---

### `src/inference/` — Prediction & Aggregation

| File | Purpose | Key Functions |
|------|---------|---------------|
| `model_loader.py` | Load and cache models (singleton) | `ModelLoader`, `get_models()`, `get_model()` |
| `login_predictor.py` | Login anomaly prediction | `predict_login_anomaly()` |
| `session_predictor.py` | Session drift prediction | `predict_session_anomaly()` |
| `device_predictor.py` | Device trust prediction | `predict_device_trust()` |
| `baseline_predictor.py` | Baseline anomaly prediction | `predict_baseline_anomaly()` |
| `global_predictor.py` | Global threat prediction | `predict_global_threat()` |
| `risk_aggregator.py` | Weighted risk aggregation | `aggregate_risk()`, `_classify_risk_level()` |

**Note:** `predict_*.py` and `risk_aggregateor.py` (typo) are legacy/duplicates; use `*_predictor.py` and `risk_aggregator.py`.

---

### `src/models/` — Model Definitions

| File | Purpose | Key Functions |
|------|---------|---------------|
| `login_model.py` | IsolationForest login anomaly model | `create_login_model()`, `get_model_config()` |
| `session_model.py` | IsolationForest session drift model | `create_session_model()`, `get_model_config()` |
| `device_trust_model.py` | LogisticRegression device trust model | `create_device_model()`, `get_model_config()` |
| `baseline_model.py` | IsolationForest baseline anomaly model | `create_baseline_model()`, `get_model_config()` |
| `global_threat_model.py` | KMeans global threat model | `create_global_model()`, `get_model_config()` |

**Used by:** `src/training/*.py` for retraining.

---

### `src/training/` — Training Scripts

| File | Purpose | Data Source |
|------|---------|-------------|
| `train_login.py` | Train login model | `data/raw/login_anomaly_synthetic_10000.csv` |
| `train_session.py` | Train session model | `data/raw/session_drift_synthetic_10000.csv` |
| `train_device.py` | Train device model | `data/raw/device_trust_synthetic_10000.csv` |
| `train_baseline.py` | Train baseline model | `data/raw/user_baseline_synthetic_10000.csv` |
| `train_global.py` | Train global model | `data/raw/global_threat_synthetic_10000.csv` |

**Each script:** `load_data()` → `train_model()` → `evaluate_model()` → `save_model()` → `main()`  
**Output:** `weights/*_v1.pkl`

---

### `src/utils/` — Utilities

| File | Purpose | Key Functions |
|------|---------|---------------|
| `logger.py` | Structured logging | `setup_logger()`, `logger` |

---

### `weights/` — Trained Models

| File | Model |
|------|-------|
| `login_model_v1.pkl` | Login anomaly (IsolationForest) |
| `session_model_v1.pkl` | Session drift (IsolationForest) |
| `device_trust_model_v1.pkl` | Device trust (LogisticRegression) |
| `baseline_model_v1.pkl` | Baseline anomaly (IsolationForest) |
| `global_threat_model_v1.pkl` | Global threat (KMeans) |

---

### `tests/` — Test Suite

| File | Purpose |
|------|---------|
| `test_api.py` | FastAPI endpoint tests (health, predict, risk) |
| `test_login.py` | Login model and feature tests |
| `test_session.py` | Session model and feature tests |

---

### Root Files

| File | Purpose |
|------|---------|
| `run.py` | Start the API server via uvicorn |
| `test_client.py` | Manual API test script |
| `requirements.txt` | Python dependencies |
| `Dockerfile` | Container image definition |

---

## 🔗 Data Flow

### Inference (Production)

```
Client Request
    → src/api/routes_*.py (validation)
    → src/inference/*_predictor.py (prediction)
    → src/inference/model_loader.py (load weights/*.pkl)
    → src/inference/risk_aggregator.py (for /predict/risk)
    → Response
```

### Training (Offline)

```
data/raw/*.csv
    → src/features/*.py (extract features)
    → src/models/*.py (define pipeline)
    → src/training/*.py (fit, evaluate, save)
    → weights/*.pkl
```

---

## 📋 Quick Reference: Main Entry Points

| Action | Entry Point |
|--------|-------------|
| Start API | `python run.py` or `uvicorn src.api.main:app` |
| Health check | `GET /health` |
| Risk assessment | `POST /predict/risk` |
| Train a model | `python src/training/train_*.py` |
| Test API | `python test_client.py` |
| Run tests | `pytest tests/` |

---

## 📚 Related Documentation

| Document | Description |
|----------|-------------|
| `USAGE.md` | Usage and run instructions |
| `QUICKSTART.md` | Quick setup |
| `MODEL_LIFECYCLE.md` | Training vs inference roles |
| `FRONTEND_INTEGRATION.md` | Next.js 16 integration guide |

---

*Last updated: Codebase index for ML Backend adaptive authentication service.*
