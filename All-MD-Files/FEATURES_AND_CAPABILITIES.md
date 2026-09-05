# FEATURES_AND_CAPABILITIES.md — AegisAuth (implemented features)

## Status scale
- **Implemented**: present in code and used in runtime paths.
- **Partially implemented**: present but incomplete, mocked, or missing enforcement.
- **Prototype**: demo-only or clearly placeholder behavior.
- **Not production-ready**: implemented in a way that is unsafe/incomplete for production use.
- **Deprecated**: implemented but relies on deprecated dependency/API.

## Authentication features

### Clerk-based sign-in for platform and demo
- **Description**: Next.js apps use Clerk for identity (`@clerk/nextjs`), and Convex is configured with a Clerk issuer in `frontend/convex/auth.config.ts`.
- **Status**: **Implemented** (for platform; demo Convex auth config is **Unknown**)

### First-party credential authentication (password verification, MFA, etc.)
- **Description**: Standard authentication system owned by AegisAuth.
- **Status**: **Not implemented**

## Security features

### Risk scoring endpoint (`POST /predict/risk`)
- **Description**: ML backend endpoint that returns `risk_score` and `risk_level` and model component outputs.
- **Status**: **Implemented**

### Risk scoring aggregation
- **Description**: Weighted aggregation of five model predictors plus an optional rule-based placeholder into \(0..1\) risk score and categorical level.
- **Status**: **Implemented**

### Device fingerprint collection (SDK)
- **Description**: Collects non-PII browser signals (user agent, platform, resolution, timezone, etc.) and includes them in risk requests.
- **Status**: **Implemented**

### Fingerprint hashing
- **Description**: SHA-256 hash via Web Crypto when available; fallback non-crypto hash otherwise.
- **Status**: **Implemented**

### API key enforcement on ML backend
- **Description**: Server verifies `x-api-key` and rejects unauthorized calls.
- **Status**: **Unknown / Not implemented** (SDK sends header; ML routes reviewed do not validate it)

### Account restriction / blocking
- **Description**: Server-side enforcement preventing access when risk is high.
- **Status**: **Not implemented** (demo does UI gating; platform does not show enforcement)

## Monitoring features

### Continuous session monitoring (SDK polling)
- **Description**: SDK `startMonitoring()` uses `setInterval` to call `checkRisk()` and invoke a callback with results.
- **Status**: **Implemented**

### Session anomaly simulation (demo)
- **Description**: Demo UI toggles flags/metadata that influence ML request mapping.
- **Status**: **Implemented** (demo-only)

## Developer platform features (platform dashboard)

### Application/project creation
- **Description**: Convex `applications.create` inserts `applications` row and generates `appId`, `apiKey`, `secret`.
- **Status**: **Implemented**

### Application listing
- **Description**: Convex `applications.list` returns applications for current user.
- **Status**: **Implemented**

### Application activation toggle
- **Description**: Convex `applications.toggleStatus` flips `Active`/`Inactive`.
- **Status**: **Implemented**

### API key management (rotation, revocation, multiple keys)
- **Description**: Dedicated API key entities and lifecycle management.
- **Status**: **Partially implemented**
  - Keys exist as fields on `applications`, but no key rotation/revocation module was found (`frontend/convex/apiKeys.ts` is missing).

### Organization/workspace membership
- **Description**: Convex tables `organizations` and `organizationMembers`; `applications` may be associated with an org.
- **Status**: **Implemented** (minimal)

## Admin platform features

### Global stats view
- **Description**: Convex `admin.getGlobalStats` aggregates across applications/sessions/activities.
- **Status**: **Implemented**

### Threat log view
- **Description**: Convex `admin.getThreatLogs` reads `activities` and maps to simplified risk values.
- **Status**: **Implemented** (mapping is simplified)

### Admin authorization/role enforcement
- **Description**: Only privileged users can call admin functions.
- **Status**: **Not implemented** (no auth checks observed in `frontend/convex/admin.ts`)

## Infrastructure features

### Convex persistence and serverless backend
- **Description**: Data storage and backend functions for platform and demo.
- **Status**: **Implemented**

### Containerization / IaC
- **Description**: Dockerfiles, terraform, k8s manifests, etc.
- **Status**: **Not implemented / Unknown** (no files found)

## Analytics features

### Session stats and risk distribution (platform)
- **Description**: Convex `sessions.getStats` computes totals and distributions.
- **Status**: **Implemented** (data model is limited)

### Time-series analytics (platform and demo)
- **Description**: Convex `sessions.getAnalytics` returns risk distributions and device trust series.
- **Status**: **Prototype**
  - Uses randomized values and partial incorporation of real sessions.

## Support features

### Support ticket/message storage (platform)
- **Description**: Convex `supportTickets`/`supportMessages` tables and functions (`frontend/convex/support.ts`).
- **Status**: **Implemented**

### AI support response (ML backend)
- **Description**: ML backend support route uses Gemini to generate a structured response and optionally writes back to Convex.
- **Status**: **Partially implemented / Not production-ready**
  - Uses deprecated `google.generativeai` package (runtime warning).
  - Convex integration depends on environment configuration.

### Voice support via Twilio (ML backend)
- **Description**: ML backend initiates Twilio calls (mocked when env vars are placeholders).
- **Status**: **Partially implemented**

## Limitations and known constraints (observed)
- **Risk score scale inconsistency**: ML backend returns `risk_score` in \(0..1\), while some Convex analytics treat `riskScore` as \(0..100\) thresholds (e.g., `> 70`).
- **Mocked/placeholder data in risk assessment action**: `frontend/convex/ml.ts` constructs a hard-coded request body rather than using real session telemetry.
- **Randomized analytics**: Some analytics responses are partially randomized (prototype behavior).
- **Access control gaps**: Some Convex functions lack auth/role checks; some accept `userId` as an argument.
- **Secrets in repo**: `.env.local` files contain API keys (values should be treated as compromised); this is a current-state observation, not a recommendation.

## Performance characteristics (observed from code patterns)
- Many Convex queries use `.collect()` over tables/indexes and then compute derived stats in memory.
  - **Status**: Implemented, but scalability characteristics are constrained by full scans and joins performed in application code.

