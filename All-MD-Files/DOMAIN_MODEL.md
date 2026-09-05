# DOMAIN_MODEL.md — AegisAuth domain model (current implementation)

## Scope note
This document describes **domain entities** (business concepts) as they exist in code today. It is intentionally not a database-table listing, although it references tables/modules when needed to show where the entity is represented.

Where behavior or ownership is not clearly implemented, it is marked **Unknown**, **Not implemented**, or **Partially implemented**.

## Domain Entities

### User (Platform user / Demo user)
- **What it is**
  - An authenticated identity provided by **Clerk** for the Next.js apps.
- **Representation in code**
  - Platform and demo UIs use Clerk hooks/components.
  - Convex functions commonly call `ctx.auth.getUserIdentity()` and use `identity.subject` as the user identifier.
  - There is **no Convex `users` table** in `frontend/convex/schema.ts`.
- **Responsibilities (current)**
  - Own applications/projects (via `applications.userId`).
  - Own risk policies (via `riskPolicies.userId`).
  - Own organizations indirectly (via membership and `organizations.ownerId`).
  - Initiate support tickets/messages (but the current support API does not enforce caller identity; see below).
- **Unknown**
  - Whether user profile data beyond Clerk identity exists anywhere (not in platform Convex schema).

### Organization (Workspace)
- **What it is**
  - A grouping container for applications (“projects”), backed by `organizations` and `organizationMembers` records in the platform Convex schema.
- **Representation in code**
  - `frontend/convex/schema.ts`: `organizations`, `organizationMembers`
  - `frontend/convex/organizations.ts`: membership lookup and org creation mutation.
- **Responsibilities (current)**
  - Provide an optional tenant grouping for applications (via `applications.organizationId`).
- **Unknown / Partially implemented**
  - Authorization checks enforcing membership are inconsistent; some queries filter by org id without validating that the caller is a member.

### Project / Application
- **What it is**
  - A developer-managed integration target. The platform names this concept **“application”**.
- **Representation in code**
  - `frontend/convex/schema.ts`: `applications` table
  - `frontend/convex/applications.ts`: create/list/update/toggle/demo app creation
- **Responsibilities (current)**
  - Store integration credentials:
    - `apiKey`, `secret`, and `appId` (generated at creation time).
  - Determine whether platform schedules ML assessments:
    - `mlEnhancement` flag checked by `sessions.createSession`.
  - Link to a risk policy (`riskPolicyId`) and optionally an organization (`organizationId`).

### API Key (Application credential)
- **What it is**
  - A string value stored on an application record (`applications.apiKey`), sent by the SDK in `x-api-key`.
- **Representation in code**
  - Generated in `frontend/convex/applications.ts` and stored on `applications`.
  - Sent by SDK in `sdk/src/client.ts` via axios default headers.
- **Responsibilities (current)**
  - Client-side request identification (header included in requests).
- **Not implemented / Unknown**
  - Server-side validation and authorization based on API key is not shown in the ML backend routes reviewed.
  - Rotation, revocation, scoping, and multiple keys per application are not present in the platform Convex schema.

### Session (Observed session record)
- **What it is**
  - A stored record representing a login/session observation for an application.
- **Representation in code**
  - `frontend/convex/schema.ts`: `sessions` table (platform)
  - `frontend/convex/sessions.ts`: create, list, update risk, analytics/stats
  - `aegis-demo-app/convex/sessions.ts`: demo-specific sessions logic
- **Responsibilities (current)**
  - Store attributes: `userEmail`, `device`, `browser`, `location`, `ip`, `loginTime`.
  - Store risk evaluation output:
    - `riskScore` (numeric)
    - `status` (string)
  - Act as the unit of record for dashboard analytics and “threat” counting.
- **Domain ambiguity (current)**
  - The scale and meaning of `riskScore` differs across code paths:
    - ML backend `risk_score` is \(0..1\)
    - Platform analytics compare `riskScore` to \(0..100\)-style thresholds (e.g. `> 70`, buckets at 30/60/85).

### Device (Observed device identity)
- **What it is**
  - A device descriptor and/or fingerprint used for risk scoring.
- **Representation in code**
  - SDK fingerprint payload in `sdk/src/fingerprint.ts`.
  - Sessions store a `device` string field; no first-class device entity/table exists in platform schema.
- **Responsibilities (current)**
  - Provide client environment signals to the risk engine.
- **Not implemented**
  - Persistent device registry, device history, and device-level lifecycle management.

### Risk Score (Evaluation output)
- **What it is**
  - The output of the risk engine: a numeric score and categorical level.
- **Representation in code**
  - ML backend response schema `RiskResponse` in `ml-backend/src/api/schemas.py`
  - SDK `RiskResponse` type in `sdk/src/types.ts` (note: SDK version omits `model_predictions`).
  - Stored into Convex sessions by:
    - Demo app `updateSessionRisk`
    - Platform `ml.syncMLResults` (called by `ml.assessRisk`)
    - Platform `sessions.updateSessionRisk`
- **Responsibilities (current)**
  - Drive UI behavior (demo blocks navigation on high risk).
  - Drive dashboard classification and “threat” counts (platform).

### Event (Activity)
- **What it is**
  - An event-like record stored for audit/log display (“Login Attempt”, “Risk Update”).
- **Representation in code**
  - `frontend/convex/schema.ts`: `activities` table
  - Written by `frontend/convex/sessions.ts` in `createSession` and `updateSessionRisk`.
- **Responsibilities (current)**
  - Provide a list of recent actions for dashboard/admin views (`admin.getThreatLogs`).
- **Not implemented**
  - A generalized event bus or event schema versioning; events are stored as rows with string fields.

### Threat (Derived classification)
- **What it is**
  - A derived concept used in platform admin/dashboard queries:
    - “threat detected” may mean `riskScore > 70` or `status in {"suspicious","blocked"}` depending on the query.
- **Representation in code**
  - `frontend/convex/admin.ts`: `threatsDetected = sessions.filter(s => s.riskScore > 70)`
  - `frontend/convex/sessions.ts`: high-risk alerts count uses `status` string comparison.
- **Responsibilities (current)**
  - A reporting/analytics label; no dedicated “Threat” entity/table exists.

### Restriction / Block (Access control outcome)
- **What it is**
  - The system’s notion of restricting a session/user based on risk.
- **Representation in code**
  - Demo app UI checks risk level and restricts navigation.
  - Platform stores a `sessions.status` string; some analytics interpret it.
- **Not implemented**
  - Server-side enforcement, policy execution, or a first-class restriction entity.

### Risk Policy
- **What it is**
  - A configurable policy record attached to an application.
- **Representation in code**
  - `frontend/convex/schema.ts`: `riskPolicies` table
  - `frontend/convex/riskPolicies.ts`: CRUD + seed
  - `applications.riskPolicyId` references a policy.
- **Responsibilities (current)**
  - Stored policy metadata and thresholds strings.
- **Partially implemented**
  - Thresholds exist but are not used to classify risk in the ML backend (ML backend uses `ml-backend/src/config/settings.py` thresholds).

### Support Ticket / Message
- **What it is**
  - A support interaction record.
- **Representation in code**
  - Convex tables: `supportTickets`, `supportMessages`
  - Convex functions in `frontend/convex/support.ts`
  - ML backend support routes optionally query/mutate Convex `support:*` functions.
- **Responsibilities (current)**
  - Store user-submitted issues and messages; store AI-generated initial response.
- **Security boundary issue (current)**
  - Support functions accept `userId` as an argument and do not derive it from Convex auth identity.

## Entity Responsibilities (summary table)
```text
Entity           Primary responsibility (as implemented)
--------------  ----------------------------------------
User            Owns apps/policies; identity from Clerk
Organization    Optional grouping for applications
Application     Stores credentials + config; links policy/org
API Key         Client-side credential header; server validation unknown
Session         Stores observed session + risk output
Device          Transient fingerprint + session field; no registry
Risk Score      Output of risk engine; stored and displayed
Event(Activity) Stored audit-style records for UI
Threat          Derived label from session risk/status
Restriction     Mostly UI-level; no enforcement entity
Risk Policy     Stored thresholds/flags; not wired to scoring engine
Support Ticket  Stores support lifecycle in Convex
```

## Relationships Between Entities
```text
User (Clerk identity)
  ├─ owns ──> Organization (ownerId)           [platform]
  ├─ member of ──> OrganizationMembers         [platform]
  ├─ owns ──> Application (applications.userId)
  ├─ owns ──> RiskPolicy (riskPolicies.userId)
  └─ creates ──> SupportTicket (supportTickets.userId)  [not enforced]

Organization
  └─ contains ──> Application (applications.organizationId)

Application
  ├─ has ──> API Key / Secret (fields on Application)
  ├─ references ──> RiskPolicy (applications.riskPolicyId)
  └─ has many ──> Session (sessions.applicationId)

Session
  ├─ has ──> RiskScore + status
  └─ has many ──> Activity(Event) (activities.applicationId + userEmail)
```

## Ownership of Data
- **Identity data**: Clerk (external). Convex stores `identity.subject` on records but does not store user profiles in schema.
- **Platform domain data**: Convex tables under `frontend/convex/schema.ts`.
- **Demo domain data**: Demo Convex tables (separate from platform).
- **Risk computation**: ML backend in-memory models + request mapping; no persistence in ML backend.

## Lifecycle of Each Entity (as implemented)

### Application lifecycle
- Created via `applications.create` (or `applications.getOrCreateDemoApp`).
- Updated via `applications.update`.
- Activated/deactivated via `applications.toggleStatus`.
- Deleted: **Not implemented** (no delete mutation observed for applications).

### API key lifecycle
- Created during application creation.
- Rotation/revocation: **Not implemented**.

### Session lifecycle
- Created via `sessions.createSession`.
- Risk updated via:
  - `sessions.updateSessionRisk`
  - `ml.syncMLResults` (writes `riskScore/status`)
- Termination: **Not implemented** (no session end mutation observed).

### Risk score lifecycle
- Generated by ML backend per request.
- Optionally stored into Convex session record.
- Expiration: **Not implemented**.

### Risk policy lifecycle
- Created/updated/removed via `riskPolicies.*`.
- Seeded via `riskPolicies.seed`.
- Enforcement in risk engine: **Not implemented** (policy thresholds not applied to ML thresholds).

### Organization lifecycle
- Created on-demand in `applications.getOrCreateDemoApp` and in `organizations.create`.
- Membership management beyond insert-on-create: **Unknown**.

## Business Rules (implemented rules only)
- Applications are created only when Convex identity exists (`applications.create`).
- Some queries return empty lists if unauthenticated (e.g., `applications.list`); others throw `"Unauthorized"`.
- `sessions.createSession` schedules ML assessment only when `app.mlEnhancement` is true.
- SDK config must include:
  - `endpoint` starting with `http`
  - `apiKey` length >= 10 (validation rule)

## Invariants (implemented or implied)
- Application records include an `apiKey`, `secret`, and `appId` generated at creation time.
- ML backend risk thresholds are fixed in `ml-backend/src/config/settings.py` at runtime (no dynamic configuration shown).
- Support ticket/messages store timestamps as floats/ints (Convex uses `v.float64()` and `Date.now()` in writes).

