# USE_CASES_AND_FLOWS.md — AegisAuth operational scenarios (current implementation)

## Scope note
This document describes behaviors observable from code in:

- `frontend/` (platform dashboard)
- `sdk/` (TypeScript SDK)
- `ml-backend/` (FastAPI service)
- `aegis-demo-app/` (demo app)

Where behavior is not clearly implemented, this document explicitly states **Unknown**, **Not implemented**, or **Partially implemented**.

## Developer lifecycle

### Use case: Developer creates project (application)
- **Actor**: Developer (signed in via Clerk in `frontend/`)
- **Trigger**: Developer uses platform UI to create an “application”
- **Steps** (backend behavior)
  - Client calls Convex mutation `applications.create` with:
    - `name`, `environment`, `type`, `redirectUri?`, `mlEnhancement`, `riskPolicyId`, `organizationId`
  - Convex mutation:
    - Requires `ctx.auth.getUserIdentity()`; otherwise throws `"Not authenticated"`.
    - Generates:
      - `appId = "app_" + random`
      - `apiKey = "ak_live_" + random`
      - `secret = "sk_live_" + random`
    - Inserts into `applications` table with `status: "Active"` and `userId = identity.subject`.
- **System actions**
  - Persist `applications` document in Convex.
- **Outputs**
  - Returns inserted application document ID.
- **Failure scenarios**
  - Not signed in: throws `"Not authenticated"`.
  - Invalid `riskPolicyId` / `organizationId`: type validation failure in Convex args.

### Use case: Developer generates API key
- **Actor**: Developer
- **Trigger**: Creating an application (`applications.create`) or creating a demo app (`applications.getOrCreateDemoApp`)
- **Steps**
  - API key is generated as a random string and stored on the `applications` record (`applications.apiKey`).
- **System actions**
  - No separate “API key” table exists in `frontend/convex/schema.ts`.
  - No dedicated Convex module `apiKeys.ts` exists (file not found).
- **Outputs**
  - API key string returned indirectly as part of the application document when queried.
- **Failure scenarios**
  - Not signed in for creation flows: error.
- **Status**
  - **Partially implemented** (keys are generated and stored, but rotation, revocation, scoping, and enforcement are not shown in this repo).

### Use case: Developer integrates SDK
- **Actor**: Developer integrating their app
- **Trigger**: Importing `@aegis/auth-sdk` and instantiating `new AegisAuth({ apiKey, endpoint, ... })`
- **Steps**
  - SDK validates config (via `validateConfig`).
  - SDK uses `axios` with default headers including `x-api-key` and `User-Agent: aegis-auth-sdk/1.0.0`.
  - Developer calls one of:
    - `protectLogin(payload)`
    - `checkRisk(payload?)`
    - `startMonitoring(handler)` / `stopMonitoring()`
- **System actions**
  - SDK calls `POST {endpoint}/predict/risk` with JSON body including fingerprint and metadata.
- **Outputs**
  - `RiskResponse` object with `risk_score`, `risk_level`, `components`, and optional `timestamp`.
- **Failure scenarios**
  - Network/backend errors: SDK may fall back to a LOW risk response for some error types (see `AegisAuth.handleError`).
  - Invalid backend response shape: throws `InvalidResponseError`.

## User lifecycle (demo app)

### Use case: User registers
- **Actor**: End user
- **Trigger**: User attempts to create an account
- **Implementation status**: **Unknown / Not implemented in repo**
  - Clerk is configured, but no explicit registration flow is documented here.

### Use case: User logs in (demo app “login” screen)
- **Actor**: End user
- **Trigger**: Submitting the form at `aegis-demo-app/app/login/page.tsx`
- **Steps**
  - Demo UI reads Clerk user if present via `useUser()`.
  - Demo calls `aegisClient.protectLogin({ userId, email, simulateFlags, metadata })`.
  - The email/password fields on the page are not used for authentication in code.
  - If risk is `HIGH` or `CRITICAL`, demo logs “Access restricted”; otherwise navigates to `/dashboard`.
- **System actions**
  - SDK posts to ML backend `/predict/risk`.
  - Demo updates local risk context state.
- **Outputs**
  - A displayed risk level/score and navigation decision.
- **Failure scenarios**
  - Backend unavailable: demo logs “Login protection service unavailable.”
  - Risk response invalid: SDK throws; demo catches and logs error.

### Use case: User logout
- **Actor**: End user
- **Trigger**: Sign-out from Clerk
- **Implementation status**: **Unknown**
  - No specific logout handler in code reviewed; Clerk likely provides it via UI components/routes.

## Session lifecycle

### Use case: Session creation (platform)
- **Actor**: Platform backend (Convex), or platform UI calling it
- **Trigger**: Convex mutation `sessions.createSession`
- **Steps**
  - Inserts a `sessions` document with:
    - `applicationId`, `userEmail`, `device`, `browser`, `location`, `ip`, `riskScore`, `status`
    - `loginTime = Date.now()`
  - Inserts an `activities` row “Login Attempt”.
  - If `applications.mlEnhancement` is true:
    - schedules Convex action `ml.assessRisk` immediately.
- **System actions**
  - Writes into `sessions` and `activities`.
  - Optionally triggers ML action.
- **Outputs**
  - Returns the new `sessionId`.
- **Failure scenarios**
  - Invalid `applicationId`: `app` lookup returns null; session insert still proceeds (no explicit rejection).

### Use case: Session monitoring (SDK)
- **Actor**: SDK consumer (demo app or external app)
- **Trigger**: Calling `AegisAuth.startMonitoring(handler)`
- **Steps**
  - SDK sets a `setInterval()` loop (default 5000ms).
  - Each tick calls `checkRisk()` which posts to `/predict/risk`.
  - SDK invokes the provided callback with the returned risk response.
- **System actions**
  - Periodic network calls to ML backend.
- **Outputs**
  - Repeated `RiskResponse` values passed to callback.
- **Failure scenarios**
  - Callback throws: caught and logged to console in `session.ts`.
  - Network errors: handled by `AegisAuth.handleError` (may fallback to LOW risk for network/server errors).

## Threat detection lifecycle

### Use case: Anomaly detection (ML backend)
- **Actor**: ML backend
- **Trigger**: `POST /predict/risk`
- **Steps**
  - If request matches `SDKRiskRequest`:
    - ML backend maps flat request into a nested `UnifiedRiskRequest` using `map_sdk_to_unified`.
    - Mapping uses fixed defaults + simulation flags + certain metadata keys (e.g. `sensitive_route_access`, `bulk_download`, `token_replay_attempt`).
  - ML backend runs predictors:
    - login/session/device/baseline/global
  - Aggregates results using `aggregate_risk()`
  - Returns `RiskResponse`
- **System actions**
  - Reads pre-loaded models from memory; no database writes.
- **Outputs**
  - Risk score \(0..1\), risk level string, components, model predictions.
- **Failure scenarios**
  - Validation errors: HTTP 400
  - Unexpected errors: HTTP 500 with traceback logged

### Use case: Account restriction (demo app)
- **Actor**: Demo app UI
- **Trigger**: Risk level from SDK is `HIGH` or `CRITICAL`
- **Steps**
  - Demo login page does not route to dashboard for `HIGH/CRITICAL`.
  - Attack simulator prevents toggling when `isLocked` is true (lock source is in demo risk context; details not reviewed here).
- **Outputs**
  - UI-level restriction (no backend enforcement shown).
- **Failure scenarios**
  - **Not implemented**: there is no server-side enforcement tied to risk score in the demo app beyond UI state.

## Admin lifecycle (platform)

### Use case: Admin views global stats
- **Actor**: Admin user (platform)
- **Trigger**: Calls `admin.getGlobalStats`
- **Steps**
  - Reads all applications, sessions, activities from Convex.
  - Computes:
    - `totalDevelopers` (unique `applications.userId`)
    - `totalProjects` (applications count)
    - `apiRequestsToday` (activities within last 24h)
    - `threatsDetected` (sessions where `riskScore > 70`)
- **Outputs**
  - Stats object.
- **Failure scenarios**
  - Large tables: performance depends on `.collect()` full scans (no pagination).
- **Access control**
  - **Not implemented**: no auth/role check is present in `admin.ts`.

### Use case: Admin unblocks user
- **Actor**: Admin user
- **Trigger**: Admin action to unblock a user/session
- **Implementation status**: **Not implemented**
  - No Convex mutation found that changes a user status or unblocks sessions by admin authority.

## Edge cases and error scenarios

## Edge case: Unauthenticated platform render triggers “Unauthorized”
- **Actor**: Platform UI
- **Trigger**: UI mounts providers that run authenticated Convex queries before auth state is ready
- **Current behavior**
  - Some Convex queries throw `"Unauthorized"` when no identity exists (e.g., `sessions.list`, `sessions.getAnalytics`, `activities.list`).
  - Some return empty/zero objects when unauthenticated (e.g., `applications.list`, `sessions.getStats`, `riskPolicies.list`).
- **Impact**
  - Can crash pages at runtime depending on which queries are invoked during initial render.

## Security scenarios (as implemented)
- **API key enforcement**
  - SDK always sends `x-api-key`.
  - ML backend routes reviewed do not validate `x-api-key`. Enforcement is **Unknown / Not implemented**.
- **Convex authorization**
  - Many platform functions use `ctx.auth.getUserIdentity()`.
  - Some functions accept `userId` as an argument (e.g., support queries) and do not derive identity from auth; this is a security risk in the current implementation.

