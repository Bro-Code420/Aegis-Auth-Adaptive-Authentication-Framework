# DATA_FLOW_AND_EVENTS.md — AegisAuth data movement (current implementation)

## Overview of data types

### Risk request/response (ML backend)
- **Input**: `SDKRiskRequest` (flat) or `UnifiedRiskRequest` (nested)
- **Output**: `RiskResponse`
  - `risk_score`: float in range \(0..1\)
  - `risk_level`: `"LOW" | "MEDIUM" | "HIGH" | "CRITICAL"`
  - `components`: flat object containing model component scores
  - `model_predictions`: optional per-model prediction details

### Platform persistent records (Convex, `frontend/`)
- **applications**
  - Includes generated `apiKey`, `secret`, and metadata including `mlEnhancement` and `riskPolicyId`.
- **sessions**
  - Includes `riskScore` (type is numeric; scale is inconsistent across components; see limitations).
  - Includes `status` (string such as `"suspicious"` or `"blocked"` in some computations).
- **activities**
  - Logs “Login Attempt” and “Risk Update” events.
- **riskPolicies**
  - Stores threshold ranges as strings (e.g., `"0-30"`).

## Login Data Flow (demo app)

### Trigger
User submits the form in `aegis-demo-app/app/login/page.tsx`.

### Input data
- `userId` and `email` from Clerk `useUser()` if present, otherwise demo placeholders.
- Simulation flags:
  - `newDevice`, `countryChange`, `vpn`
- Metadata:
  - `ip` is set to `"45.12.33.1"` when simulating country change, otherwise `"127.0.0.1"`.
- SDK fingerprint payload from `collectFingerprint()`.

### Processing steps
1. Demo calls SDK `aegisClient.protectLogin(payload)`.
2. SDK collects fingerprint and posts `RiskAssessmentPayload` to:
   - `POST {endpoint}/predict/risk`
3. ML backend maps SDK request to unified features (`map_sdk_to_unified`) using:
   - Simulation flags
   - Certain metadata keys for session signals
4. ML backend runs predictors and aggregates risk.
5. SDK validates response shape and returns it to demo.
6. Demo decides whether to navigate to `/dashboard` based on risk level.

### Output data
- `RiskResponse` used for UI decisions.

### Side effects
- Demo updates in-memory risk context and logs.
- No persistent “login event” is stored by the demo login page itself (based on reviewed file).

### Sequence diagram (text)
```text
User -> Demo UI: submit login form
Demo UI -> SDK (AegisAuth.protectLogin): payload + simulation flags
SDK -> ML Backend: POST /predict/risk (SDKRiskRequest)
ML Backend -> ML Backend: map_sdk_to_unified + run predictors + aggregate_risk
ML Backend -> SDK: RiskResponse
SDK -> Demo UI: RiskResponse
Demo UI -> Demo UI: if HIGH/CRITICAL then restrict else route to /dashboard
```

## Session Monitoring Flow (SDK polling)

### Trigger
SDK consumer calls `AegisAuth.startMonitoring(handler)`.

### Input data
- No explicit session state is tracked; each tick calls `checkRisk()` with:
  - `userId/email` set to defaults unless provided by caller.
  - fingerprint from `collectFingerprint()`.

### Processing steps
1. SDK starts `setInterval` loop.
2. Each interval:
   - SDK calls `checkRisk()`.
   - SDK posts to `POST /predict/risk`.
   - SDK calls the provided callback with returned risk.

### Output data
- Repeated `RiskResponse` callback invocations.

### Side effects
- None in storage; purely network calls and client-side state.

### Sequence diagram (text)
```text
App -> SDK: startMonitoring(handler)
loop every N ms
  SDK -> ML Backend: POST /predict/risk
  ML Backend -> SDK: RiskResponse
  SDK -> App: handler(RiskResponse)
end
```

## Risk Scoring Flow (ML backend `/predict/risk`)

### Trigger
Any caller posts to `POST /predict/risk`.

### Input data
- `SDKRiskRequest` or `UnifiedRiskRequest`
- `SDKRiskRequest` includes:
  - `userId`, `email`, `fingerprint`, optional `metadata`, optional `simulateFlags`

### Processing steps
1. If request is `SDKRiskRequest`, map into unified features with defaults:
   - login/session/device/baseline/global feature objects
2. Run predictors:
   - `predict_login_anomaly`
   - `predict_session_anomaly`
   - `predict_device_trust`
   - `predict_baseline_anomaly`
   - `predict_global_threat`
3. Aggregate:
   - Weighted sum using `RISK_WEIGHTS` and thresholds `RISK_THRESHOLDS` (from `ml-backend/src/config/settings`).
4. Return `RiskResponse`.

### Output data
- `RiskResponse` with \(risk_score\) \(0..1\), and a categorical `risk_level`.

### Side effects
- Logging (structured logger) but no database storage.

### Sequence diagram (text)
```text
Caller -> ML Backend: POST /predict/risk (SDKRiskRequest or UnifiedRiskRequest)
ML Backend -> ML Backend: (optional) map_sdk_to_unified
ML Backend -> ModelLoader: use loaded models in memory
ML Backend -> Predictors: compute 5 model scores
ML Backend -> RiskAggregator: aggregate_risk(scores, rule_based_score)
ML Backend -> Caller: RiskResponse
```

## Threat Detection Flow (demo attack simulator)

### Trigger
User toggles an attack flag in `aegis-demo-app/components/AttackSimulator.tsx`.

### Input data
- Simulation flags: `apiBurst`, `privilegeEscalation` (passed in `simulateFlags`)
- Metadata keys:
  - `sensitive_route_access`, `token_replay_attempt`, `bulk_download`

### Processing steps
1. Demo calls `aegisClient.checkRisk()` with flags + metadata.
2. SDK posts to `/predict/risk`.
3. ML backend uses flags/metadata mapping to set:
   - `api_calls_per_min`, `privilege_escalation_attempt`
   - `sensitive_endpoint_access`, `data_download_mb`, `token_reuse_flag`
4. Demo updates UI risk context.
5. If a `sessionId` exists, demo calls Convex mutation:
   - `api.sessions.updateSessionRisk({ sessionId, riskScore, status })`

### Output data
- Risk response in UI.
- Updated session record in demo Convex (if `sessionId` present).

### Side effects
- Writes to demo Convex `sessions` and inserts `activities` on risk update (per demo `convex/sessions.ts`).

## Dashboard Flow (platform)

### Trigger
User navigates to platform dashboard pages (queries via Convex).

### Inputs
- Convex queries for applications/sessions/activities/risk policies.
- In some cases, an organization ID is used to filter by `applications.organizationId`.

### Processing steps (representative)
- Queries frequently use `.collect()` (full table/index reads) and then compute derived stats in memory.
- `sessions.createSession` can schedule `ml.assessRisk` when `applications.mlEnhancement` is true.
- `ml.assessRisk`:
  - fetches `ML_BACKEND_URL/predict/risk` with a request body that is mostly hard-coded/mock values
  - writes results back via `ml.syncMLResults`.

### Outputs
- Lists, stats, and analytics data rendered in UI.

### Side effects
- `sessions.createSession` and `sessions.updateSessionRisk` insert `activities` rows.

## Events generated (current implementation)

### Stored events (Convex `activities`)
Event-like records are stored in `activities` with:
- `action` (e.g. `"Login Attempt"`, `"Risk Update"`)
- `risk` (string status)
- `timestamp`
- `applicationId`, `userEmail`, `device`, `location`

### Event triggers
- `sessions.createSession` inserts:
  - `"Login Attempt"`
- `sessions.updateSessionRisk` inserts:
  - `"Risk Update"`

### Consumers
- Platform admin query `admin.getThreatLogs` reads `activities` for display.
- Platform analytics queries read `sessions` and sometimes use randomized augmentation.

## Logging Flow
- SDK logs via a configurable logger (`createLogger`) and `console.warn` for fallback behavior.
- ML backend logs risk aggregation outputs and error tracebacks via `src.utils.logger`.
- Convex functions do not show a dedicated logging subsystem beyond returning values and occasional comments.

