# OBSERVABILITY_AND_LOGGING.md — Observability (current implementation)

## Scope note
This document describes logging and observability mechanisms that exist in code today. Where metrics/tracing/alerts are not present, it states **Not implemented** or **Unknown**.

## Logs

### SDK logs
- **Where**: `sdk/src/utils.ts` `createLogger(debug)`
- **Behavior**
  - When `debug` is true:
    - `logger.log()` writes to `console.log`
    - `logger.error()` writes to `console.error`
- **Fallback warnings**
  - `AegisAuth.handleError()` uses `console.warn` for network/server fallback behavior.

### ML backend logs
- **Where**:
  - `ml-backend/src/utils/logger.py` sets up Python logging to stdout.
  - Routes log incoming requests and outputs.
  - Risk aggregator logs component scores and final risk.
- **Behavior**
  - Startup logs model loading success/failure.
  - Errors include stack traces via `traceback.format_exc()` in some places.

### Convex logs
- No dedicated logging module was found for Convex functions.
- Some actions/mutations use `console.error` (e.g., `frontend/convex/ml.ts`).
- **Status**: **Partially implemented**

## Metrics
- **Not implemented** in the repo:
  - No Prometheus/OpenTelemetry metrics exporters found.
  - No structured metric emission in SDK, ML backend, or Convex functions.

## Tracing
- **Not implemented**:
  - No distributed tracing instrumentation found.
  - SDK can generate a request id (`generateRequestId`) but does not propagate it as a header to the ML backend, and it is not stored in Convex records.

## Alerts
- **Not implemented / Unknown**:
  - No alerting rules/config present in the repo.

## Error handling

### SDK
- Retries with exponential backoff via `withRetry`.
- Timeouts via `withTimeout`.
- Fallback “LOW risk” response on network/5xx failures.

### ML backend
- Validations return HTTP 400.
- Unexpected failures return HTTP 500 and log stack traces.
- Global exception handler wraps exceptions into JSON response.

### Platform Convex
- Mixed patterns:
  - some queries throw `"Unauthorized"`
  - some return empty/zero objects for unauthenticated callers
- Effects:
  - front-end runtime errors can occur if unauthenticated queries throw during render.

## Audit logging (event storage)

### Implemented audit-style records
- `activities` table in platform Convex stores:
  - `action` (e.g., `"Login Attempt"`, `"Risk Update"`)
  - `timestamp`
  - `applicationId`, `userEmail`, `device`, `location`, `risk`

### Consumers
- Admin threat log view (`admin.getThreatLogs`) reads and formats these activity rows.

## Known observability gaps (current state)
- No stable correlation IDs across SDK → ML backend → Convex session/activity records.
- No metrics for request volume, latency, or failure rates across services.
- No explicit retention/rotation policies for logs or activity records.

