# PERFORMANCE_AND_SCALING.md — Performance characteristics (current implementation)

## Scope note
This document describes performance-relevant patterns present in code. It does not estimate production throughput/latency beyond what can be inferred.

## Throughput and latency (observed design)

### SDK → ML backend
- **Call pattern**: synchronous HTTP POST to `/predict/risk`
- **Client timeout**: configurable; default \(10s\) in SDK, demo uses \(15s\)
- **Retries**: default 1 retry, exponential backoff starting at 100ms
- **Monitoring mode**: repeated calls via `setInterval()` (default 5000ms)

### ML backend inference path
- **Model loading**: at startup; all models loaded into memory via joblib.
- **Per-request compute**:
  - runs five predictors per `/predict/risk` call and aggregates scores
- **Concurrency model**: FastAPI with uvicorn (async endpoints), predictors likely CPU-bound (scikit-learn).
- **Thread/process scaling**: not configured in repo; depends on uvicorn/gunicorn deployment (Unknown).

## Concurrency model

### SDK monitoring concurrency
- `startMonitoring` uses a single interval per JS runtime; it does not coordinate multiple sessions or multiple clients.
- Overlapping calls: possible if `checkRisk()` takes longer than the interval; no de-duplication is implemented.

### Convex concurrency
- Queries/mutations are executed in Convex runtime; some operations include:
  - full scans (`.collect()`)
  - multiple queries per request (loops fetching sessions per app)
  - randomized computations in analytics queries

## Background jobs / scheduling

### Implemented background work (Convex scheduler)
- `frontend/convex/sessions.ts` `createSession` schedules `ml.assessRisk` when `applications.mlEnhancement` is true:
  - `ctx.scheduler.runAfter(0, api.ml.assessRisk, { sessionId, context })`

### ML action behavior (platform)
- `ml.assessRisk` calls ML backend and writes results back to session via `syncMLResults`.
- Request body used by `ml.assessRisk` is mostly hard-coded/mock values, not derived from session telemetry.

## Queue usage
- No explicit queue/broker (Kafka/SQS/RabbitMQ) is implemented.
- Convex scheduler is used as an internal deferred execution mechanism.

## Caching

### SDK caching
- SDK caches:
  - `lastFingerprint`
  - `cachedRisk` (last risk response)
- Cache usage:
  - Exposed via `getCachedRisk()`
  - Not used for request suppression; monitoring still calls backend each tick.

### Backend caching
- ML backend caches models in memory after load.
- No response caching is implemented.

## Hot paths and potential bottlenecks (based on code patterns)

### Platform dashboard queries
Observed patterns that can become bottlenecks at scale:
- `.collect()` on entire tables in admin queries (applications, sessions, activities).
- For each application, fetch recent sessions and then merge/sort in memory (`sessions.list`).
- Analytics queries compute distributions via:
  - full session collection
  - additional random augmentation

## Rate limiting
- Not implemented in SDK.
- Not implemented in ML backend routes reviewed.
- Not implemented in Convex functions.

## Performance testability
- No load test harness found in repo.
- Convex queries with randomness are non-deterministic, reducing repeatability for testing.

## Known scaling constraints (inferred)
- As Convex tables grow, full scans and per-app loops can increase latency and cost.
- ML backend is CPU-bound for model inference; scaling would require process-level concurrency or multiple instances (deployment details Unknown).

