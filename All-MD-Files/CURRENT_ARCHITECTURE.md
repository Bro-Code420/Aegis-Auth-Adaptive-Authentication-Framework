# CURRENT_ARCHITECTURE.md — AegisAuth (as implemented)

## System Components
This repository contains four deployable components:

- **Platform dashboard**: `frontend/` (Next.js, Convex, Clerk)
- **Demo application**: `aegis-demo-app/` (Next.js, Convex, Clerk)
- **SDK library**: `sdk/` (TypeScript, axios)
- **Risk engine**: `ml-backend/` (FastAPI, scikit-learn model inference)

## Responsibilities per component

### `frontend/` (Platform dashboard)
- **UI**
  - Next.js App Router pages under `frontend/app/*`.
  - Client components use `convex/react` hooks to call Convex functions.
- **State and persistence**
  - Convex tables defined in `frontend/convex/schema.ts`:
    - `applications`, `sessions`, `activities`, `riskPolicies`
    - `organizations`, `organizationMembers`
    - `supportTickets`, `supportMessages`
    - `systemSettings`, `messages`
- **Business logic**
  - Lives primarily in Convex functions:
    - `applications.ts`: create/update apps, toggle status, create demo app.
    - `sessions.ts`: create sessions, compute stats/analytics, update session risk.
    - `ml.ts`: action fetch to ML backend and mutation to sync results (request body currently mocked).
    - `riskPolicies.ts`: CRUD and seeding.
    - `support.ts`: ticket and message storage, “user context” read.
    - `admin.ts`: platform-wide aggregated views (no auth checks observed).

### `aegis-demo-app/` (Demo app)
- **UI**
  - Demo “login” calls SDK to compute risk and decides whether to navigate.
  - “Attack simulator” toggles flags, calls SDK `checkRisk()`, and writes updates to demo Convex sessions.
- **Persistence**
  - Has its own Convex functions and schema (not fully enumerated in this document).
- **Auth**
  - Uses Clerk for user identity in UI; demo login form does not validate credentials in code reviewed.

### `sdk/` (TypeScript SDK)
- **Responsibilities**
  - HTTP client wrapper around `POST {endpoint}/predict/risk`.
  - Fingerprint collection:
    - Uses `navigator.*`, screen resolution, timezone, and basic flags.
  - Session monitoring:
    - Uses `setInterval()` to repeatedly call `checkRisk()`.
  - Error handling:
    - For some network/server errors returns a LOW-risk fallback response.

### `ml-backend/` (FastAPI risk engine)
- **Responsibilities**
  - Expose `/predict/*` endpoints, including `POST /predict/risk` as the unified risk endpoint.
  - Load serialized model artifacts from `ml-backend/weights/`.
  - Run predictors and aggregate results.
  - Provide support endpoints that integrate Twilio and Gemini.

## Communication model

### Client ↔ Service communication
- **SDK → ML backend**: HTTP `POST /predict/risk`
  - Headers include `x-api-key` (sent by SDK); server-side verification is not shown in routes reviewed.
- **Platform frontend → Convex**: Convex React client calls queries/mutations/actions.
- **Convex action → ML backend**: `fetch()` from `frontend/convex/ml.ts` to `ML_BACKEND_URL/predict/risk`.
- **Demo app → Convex**: Convex hooks call demo Convex mutations (e.g., `updateSessionRisk`).

## Internal dependencies

### `frontend/` internal dependencies
- UI components depend on:
  - Convex generated API bindings `frontend/convex/_generated/api`
  - Clerk React hooks (`useAuth`, `useUser`)
- Convex functions depend on:
  - Tables and indexes defined in `frontend/convex/schema.ts`
  - Scheduler for async ML assessment in `sessions.createSession`

### `ml-backend/` internal dependencies
- FastAPI routes call predictor modules:
  - `src/inference/*_predictor.py` and `risk_aggregator.py`
- Model loader reads `WEIGHTS_DIR` and `MODEL_FILES` from `src/config/settings`.

### `sdk/` internal dependencies
- `client.ts` depends on:
  - `fingerprint.ts` for signal collection
  - `session.ts` for monitoring
  - `types.ts` (response typing and validation)

## External dependencies

### Authentication/identity
- **Clerk**
  - Platform and demo Next.js apps use Clerk.
  - Convex is configured to accept Clerk JWTs via `frontend/convex/auth.config.ts`.
  - Unknown whether demo Convex deployment is configured similarly (not verified here).

### Data/storage/runtime
- **Convex**
  - Used as database + serverless function runtime for platform and demo.

### ML + support integrations
- **scikit-learn / joblib**
  - Used to load and run serialized estimators.
- **Twilio**
  - ML backend support routes create calls (or mock calls based on env vars).
- **Google Generative AI**
  - ML backend uses `google.generativeai`; runtime prints a deprecation warning.

## Runtime architecture

### Component diagram (text)
```text
┌───────────────────────────────┐
│ Browser (platform frontend)    │
│ Next.js UI                     │
│ Clerk session                  │
└───────────────┬───────────────┘
                │ Convex client (authenticated)
                ▼
        ┌───────────────────┐
        │ Convex deployment  │
        │ tables + functions │
        └─────────┬─────────┘
                  │ action fetch()
                  ▼
        ┌───────────────────┐
        │ ML backend         │
        │ FastAPI            │
        └───────────────────┘

┌───────────────────────────────┐
│ Browser (demo app)             │
│ Next.js UI + SDK               │
│ Clerk session (optional)       │
└───────────────┬───────────────┘
                │ HTTP POST /predict/risk
                ▼
        ┌───────────────────┐
        │ ML backend         │
        └───────────────────┘
                │ (separately)
                ▼
        ┌───────────────────┐
        │ Demo Convex        │
        │ sessions/activity  │
        └───────────────────┘
```

### Service interaction diagram (text)
```text
Platform UI
  -> Convex query/mutation (applications, sessions, activities)
  -> Convex scheduler triggers action ml.assessRisk
  -> ml.assessRisk fetch() -> ML backend /predict/risk
  -> Convex mutation syncMLResults updates session risk

Demo UI
  -> SDK protectLogin/checkRisk
  -> ML backend /predict/risk
  -> Demo UI updates local state
  -> (optional) Demo Convex mutation updateSessionRisk persists to Convex
```

## Infrastructure architecture
Unknown:
- No Dockerfiles or IaC were found in this repository.
- Production hosting/infra topology is not documented in code.

## Architecture classification

### Is this monolith or microservices?
- **Multi-component system**:
  - Next.js apps (`frontend`, `aegis-demo-app`) are separate deployables.
  - `ml-backend` is a separate HTTP service.
  - `sdk` is a library used by apps.
  - Convex is an external hosted backend for storage and serverless execution.

### How components communicate
- HTTP between SDK/Convex action and the ML backend.
- Convex RPC (queries/mutations/actions) between Next.js clients and Convex.

### Where business logic exists
- Platform business logic: primarily in `frontend/convex/*.ts`.
- Risk calculation: primarily in `ml-backend/src/inference/*` and `ml-backend/src/api/routes_risk.py`.
- SDK logic: in `sdk/src/client.ts` and helpers.

### Where risk calculation happens
- ML backend `/predict/risk` runs model predictors and aggregates the score.
- Convex `ml.assessRisk` also calls `/predict/risk` but constructs a mock request body.

### Where session logic exists
- Platform session storage and updates: `frontend/convex/sessions.ts`.
- Demo session storage and updates: `aegis-demo-app/convex/sessions.ts`.
- SDK “session monitoring” is client-side polling and does not manage server sessions.

