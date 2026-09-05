# PROBLEMS_AND_LIMITATIONS.md — AegisAuth (current weaknesses)

This document is intentionally blunt. It lists structural and architectural weaknesses present in the current repository, based on code inspection. It does not propose redesigns.

## Structural problems

### Problem: Risk score scale mismatch across components
- **Where it occurs**
  - ML backend returns `risk_score` in range \(0..1\).
  - Platform/admin logic treats `sessions.riskScore` as if it were \(0..100\) (e.g., `riskScore > 70` and buckets like `<= 30`, `<= 60`, etc.).
  - Demo app stores `risk_score` directly into Convex session `riskScore` as well.
- **Impact**
  - Threat counts, dashboards, and policy thresholds can be incorrect or misleading.
- **Frequency**
  - High (affects normal scoring and analytics code paths).
- **Severity**
  - High (core metric inconsistency).

### Problem: Multiple independent “backends” and schemas with diverging behavior
- **Where it occurs**
  - `frontend/convex/*` and `aegis-demo-app/convex/*` implement similar concepts (sessions, analytics) but not the same access control or logic.
- **Impact**
  - Increased maintenance cost; features/bug fixes must be duplicated.
  - Confusing system boundaries for audits/refactors.
- **Frequency**
  - Medium to high (cross-cutting).
- **Severity**
  - Medium.

### Problem: Convex functions violate stated Convex best practices in-repo
- **Where it occurs**
  - Convex guidelines warn against `.filter` and recommend index-based queries; code uses `.filter` in multiple places (e.g., `applications.getOrCreateDemoApp`, `admin.getModelSettings`).
  - Widespread use of `.collect()` without pagination or bounding.
- **Impact**
  - Performance and scalability risks as tables grow.
  - Higher cost and higher latency under load.
- **Frequency**
  - High (common pattern).
- **Severity**
  - Medium.

## Design problems

### Problem: Incomplete/placeholder ML integration in platform ML action
- **Where it occurs**
  - `frontend/convex/ml.ts` `assessRisk` action constructs a request body with hard-coded values (e.g., fixed IP, user agent, counts), not real session telemetry.
- **Impact**
  - Platform-triggered assessments do not reflect actual user/session behavior.
  - Results stored in Convex may be disconnected from UI/session context.
- **Frequency**
  - High when `mlEnhancement` is enabled and `sessions.createSession` triggers assessments.
- **Severity**
  - High for correctness.

### Problem: “Rule-based score” is present but not used meaningfully
- **Where it occurs**
  - ML schema supports `rule_based_score` and aggregator weights include a rule-based component; mapping and action code often omit or hardcode it.
- **Impact**
  - Indicates an incomplete scoring pipeline; unclear expectations vs implementation.
- **Frequency**
  - High (always part of aggregation, often zero).
- **Severity**
  - Low to medium.

### Problem: Demo “login” is not an authentication flow
- **Where it occurs**
  - `aegis-demo-app/app/login/page.tsx` renders email/password inputs but does not validate them; it only calls risk scoring and routes based on risk.
- **Impact**
  - Demo behavior can be mistaken for actual auth behavior.
  - Makes it hard to test real auth+session lifecycles.
- **Frequency**
  - High (core demo path).
- **Severity**
  - Medium (demo-only but affects understanding).

## Performance problems

### Problem: Full table scans / unbounded reads in Convex queries
- **Where it occurs**
  - `admin.getGlobalStats`, `admin.getUsers`, `admin.getProjects` call `.collect()` on entire tables.
  - `sessions.getAnalytics` and others collect sessions and then compute in memory.
- **Impact**
  - Performance degradation with data growth; potential Convex limits/timeout risks.
- **Frequency**
  - High (dashboard loads).
- **Severity**
  - Medium to high depending on dataset size.

### Problem: N+1 reads in Convex org resolution
- **Where it occurs**
  - `organizations.getUserOrganizations` reads memberships then loops `ctx.db.get` for each org id.
- **Impact**
  - Increased latency for users with many organizations.
- **Frequency**
  - Low to medium (depends on org count).
- **Severity**
  - Low to medium.

## Maintainability problems

### Problem: Mixed semantics and ad-hoc status fields
- **Where it occurs**
  - `sessions.status` is a string and is used as `"suspicious"`, `"blocked"`, and also sometimes set from `risk_level.toLowerCase()`.
- **Impact**
  - Downstream code needs to guess meaning of status values.
  - Threat logic is brittle and inconsistent.
- **Frequency**
  - High.
- **Severity**
  - Medium.

### Problem: Weak typing and `any` use in Convex function invocation
- **Where it occurs**
  - `sessions.createSession` schedules `(api as any).ml.assessRisk` and passes a `context: v.any()`.
- **Impact**
  - Reduces compile-time guarantees; increases refactor risk.
- **Frequency**
  - Medium.
- **Severity**
  - Medium.

## Scalability problems

### Problem: No clear multi-tenant isolation model
- **Where it occurs**
  - Some platform queries filter by `identity.subject` (user-based), others allow org filtering without verifying membership, and admin queries read global tables.
- **Impact**
  - Hard to reason about data ownership and boundaries at scale.
- **Frequency**
  - High (core queries).
- **Severity**
  - High for correctness/security.

## Security gaps

### Problem: Convex support functions accept `userId` as an argument
- **Where it occurs**
  - `frontend/convex/support.ts` functions like `getTickets`, `createTicket`, `getUserContext` accept `userId` as an argument and do not derive it from `ctx.auth.getUserIdentity()`.
- **Impact**
  - Any caller who can invoke these functions could read/write other users’ support data by providing arbitrary `userId`.
- **Frequency**
  - High (all support flows).
- **Severity**
  - Critical.

### Problem: Admin functions have no auth/role checks
- **Where it occurs**
  - `frontend/convex/admin.ts` does not call `ctx.auth.getUserIdentity()` or check roles.
- **Impact**
  - Any caller could access global stats/projects/logs depending on how the UI exposes these functions.
- **Frequency**
  - High if routes are reachable.
- **Severity**
  - Critical.

### Problem: API key appears unused for server-side authorization on ML backend
- **Where it occurs**
  - SDK always sends `x-api-key`.
  - ML backend `/predict/risk` route as reviewed does not validate the key.
- **Impact**
  - Risk engine may be callable without authorization, depending on deployment network controls.
- **Frequency**
  - High (every request).
- **Severity**
  - High.

### Problem: Secrets are present in repo-local `.env.local` files
- **Where it occurs**
  - `frontend/.env.local` and `ml-backend/.env.local` contain API keys (Clerk, Gemini, ElevenLabs/Twilio-related).
  - This repo currently includes these files in the workspace.
- **Impact**
  - Secrets should be treated as compromised once stored in code repositories or shared workspaces.
- **Frequency**
  - One-time but persistent exposure.
- **Severity**
  - Critical.

## Data consistency issues

### Problem: Sessions and activities can be created without validating application existence/ownership
- **Where it occurs**
  - `sessions.createSession` reads `app = ctx.db.get(applicationId)` but does not reject if `app` is missing.
  - Some queries do not consistently verify org membership or ownership.
- **Impact**
  - Orphan records and cross-tenant data contamination are possible in current logic.
- **Frequency**
  - Medium.
- **Severity**
  - High.

## Observability gaps

### Problem: No centralized tracing/correlation across SDK → ML backend → Convex writes
- **Where it occurs**
  - SDK has a `generateRequestId()` and internal logger, but request IDs are not propagated through ML backend to Convex activity/session records.
- **Impact**
  - Hard to audit a single end-to-end decision path.
- **Frequency**
  - High (all runtime flows).
- **Severity**
  - Medium.

## Areas that are confusing / tightly coupled / duplicated

### Confusing: Two separate definitions of “analytics”
- **Where it occurs**
  - Both platform and demo implement analytics with partial randomness and partial real data.
- **Impact**
  - Difficult to validate correctness or compare outputs across environments.
- **Severity**
  - Medium.

### Tightly coupled: Demo UI logic depends directly on ML backend simulation mapping keys
- **Where it occurs**
  - Demo uses metadata keys (`sensitive_route_access`, `bulk_download`, `token_replay_attempt`) that the ML backend mapping recognizes.
- **Impact**
  - Changes to mapping keys require demo UI changes and vice versa.
- **Severity**
  - Medium.

### Hard to test: Convex functions with global scans and randomness
- **Where it occurs**
  - Analytics functions include randomness and full scans, making deterministic tests difficult.
- **Impact**
  - Limits automated verification and refactor safety.
- **Severity**
  - Medium.

