# INTEGRATION_AND_SDK_FLOW.md — SDK integration and runtime coupling (current implementation)

## Scope note
This document describes how integration works **today**, based on `sdk/`, the ML backend request/response schemas, and the demo app usage.

## Developer Integration Flow

### Step 1: Install/import SDK
- **What happens**
  - Consumer app imports `AegisAuth` from `@aegis/auth-sdk`.
- **Code artifacts**
  - SDK public exports: `sdk/src/index.ts`.

### Step 2: Initialize SDK client
- **Inputs**
  - `apiKey` (string)
  - `endpoint` (string URL, must start with `http`)
  - Optional:
    - `autoMonitor` (default false)
    - `monitorInterval` (default 5000ms)
    - `timeout` (default 10000ms)
    - `retries` (default 1)
    - `debug` (default false)
- **Behavior**
  - SDK validates config:
    - `apiKey` must be a string and at least 10 characters.
    - `endpoint` must be a string and start with `http`.
  - SDK configures axios client with default headers:
    - `x-api-key: {apiKey}`
    - `Content-Type: application/json`
    - `User-Agent: aegis-auth-sdk/1.0.0`
- **Outputs**
  - `new AegisAuth(config)` instance.

### Step 3: Call risk APIs

#### Option A: `protectLogin(payload)`
- **Purpose (as implemented)**
  - Run a risk check and return a `RiskResponse`.
  - Optionally start monitoring automatically if `autoMonitor` is enabled.
- **Inputs**
  - `LoginPayload`:
    - `userId`, `email`
    - optional `metadata` (`Record<string, any>`)
    - optional `simulateFlags`:
      - `newDevice`, `countryChange`, `vpn`, `apiBurst`, `privilegeEscalation`
- **System actions**
  - Collect fingerprint via `collectFingerprint()`.
  - POST JSON to `{endpoint}/predict/risk`.
- **Output**
  - `RiskResponse` containing:
    - `risk_score` (number)
    - `risk_level` ("LOW"|"MEDIUM"|"HIGH"|"CRITICAL")
    - `components` (`Record<string, number>`)
    - optional `timestamp` (SDK adds `Date.now()` if missing)

#### Option B: `checkRisk(payload?)`
- **Purpose**
  - Run a risk check without requiring the full login flow.
- **Inputs**
  - Optional partial login payload.
  - Defaults used if missing:
    - `userId = "anonymous"`
    - `email = "anonymous@aegis.local"`
- **Actions/Output**
  - Same backend call and `RiskResponse` output as `protectLogin`.

### Step 4: Optional continuous monitoring

#### `startMonitoring(handler)`
- **Purpose**
  - Periodically call `checkRisk()` and pass each response into a callback.
- **Behavior**
  - Uses `setInterval()` inside `sdk/src/session.ts`.
  - Each tick calls `checkRisk()` and then `handler(risk)`.
  - The SDK tracks monitoring state using a module-scoped interval handle.
- **Output**
  - Returns a generated monitoring id string (request id).

#### `stopMonitoring()`
- **Purpose**
  - Stop the `setInterval()` loop.

## SDK Lifecycle
```text
Construct AegisAuth
  -> validateConfig()
  -> axios client created with headers
  -> (optional) protectLogin() call caches last risk + fingerprint
  -> (optional) startMonitoring() begins interval loop
  -> stopMonitoring() clears interval
  -> destroy() stops monitoring and clears cached values
```

## API Communication

### Endpoint
- SDK posts to:
  - `POST {endpoint}/predict/risk`

### Request payload shape (SDK → ML backend)
SDK sends `RiskAssessmentPayload`:
- `userId: string`
- `email: string`
- `fingerprint: FingerprintPayload`
- optional `metadata: Record<string, any>`
- optional `simulateFlags`

ML backend accepts:
- `SDKRiskRequest` (flat) and maps it internally to `UnifiedRiskRequest`.

### Headers
- `x-api-key` is always sent by the SDK.
- Server-side enforcement in ML backend: **Unknown / Not implemented** (no validation observed in reviewed ML routes).

### Response payload shape (ML backend → SDK)
ML backend `RiskResponse` includes:
- `risk_score`, `risk_level`, `components`
- optional `model_predictions`

SDK `RiskResponse` type does **not** include `model_predictions`; this field will be ignored at the SDK typing layer.

## Event sending and duplication

### “Events” stored by platform (Convex activities)
- Platform stores events as `activities` rows when:
  - sessions are created (“Login Attempt”)
  - session risk is updated (“Risk Update”)

### SDK “events”
- SDK does not write events to Convex; it logs to console (debug) and returns `RiskResponse`.

### Demo app persistence
- Demo attack simulator writes risk updates to demo Convex sessions, and demo Convex `updateSessionRisk` writes an activity row.

## Failure Handling

### SDK error handling behavior
In `AegisAuth.handleError()`:
- **Network failure** (axios error with no response):
  - returns fallback `RiskResponse` with `risk_score: 0.2`, `risk_level: "LOW"`, `components: { fallback: 1 }`
- **HTTP 5xx**
  - returns same LOW-risk fallback
- **Other HTTP errors**
  - throws `NetworkError` including status code
- **Timeout**
  - throws `TimeoutError` if the error message includes `"timeout"`
- **Other errors**
  - throws `AegisError`

### Demo app failure handling
- Demo UI catches errors and logs a message; it does not persist failure events.

## Retry Logic
- SDK uses `withRetry()`:
  - exponential backoff starting at 100ms
  - attempts = `maxRetries + 1`
  - default `retries = 1` in SDK constructor

## Rate Limiting
- **Not implemented** in SDK or ML backend routes reviewed.
- Any practical rate limiting would depend on infrastructure or proxy layers (Unknown in this repo).

## Versioning
- SDK sets `User-Agent: aegis-auth-sdk/1.0.0` in requests.
- There is no explicit API versioning in ML backend routes (`/predict/*`).

## Hidden coupling (explicitly present in code)
- Demo app sends metadata keys that ML backend mapping recognizes:
  - `sensitive_route_access`
  - `bulk_download`
  - `token_replay_attempt`
- Simulation flags in demo map directly to ML backend mapping booleans:
  - `apiBurst`, `privilegeEscalation`, `vpn`, etc.

