# STATE_MACHINE.md — AegisAuth states and transitions (current implementation)

## Scope note
This file documents **explicit states** present in code and storage today, and the transitions triggered by current flows.

Some example states (e.g., account lock/disable) are mentioned as **Not implemented** if the codebase does not implement them.

## Risk State Machine

### States (implemented)
Risk state is represented as a categorical level from the ML backend and SDK:
- **LOW**
- **MEDIUM**
- **HIGH**
- **CRITICAL**

### State source of truth
- ML backend `RiskResponse.risk_level` returned by `POST /predict/risk`.
- SDK uses the same enum type (`sdk/src/types.ts`).

### Transitions
Risk transitions are not stored as explicit state transitions; they occur whenever a new risk evaluation is produced.

- **Trigger**: SDK call (`protectLogin` or `checkRisk`) OR platform Convex action `ml.assessRisk`.
- **Action**: recompute risk and return/store new level.
- **Output**: `RiskResponse` and (optionally) Convex session update.

### Invalid transitions
- None enforced; any request can yield any risk level.

## Session State Machine (platform)

### States (as stored today)
The platform stores a `sessions.status` string, but it is not constrained to a finite enum in schema.

Observed/used values in code:
- `"suspicious"` (checked in stats)
- `"blocked"` (checked in stats)
- `risk_level.toLowerCase()` (set by some callers, e.g., `"low"`, `"medium"`, `"high"`, `"critical"`)
- **Unknown**: other values may exist (schema does not restrict).

### State source of truth
- Convex document `sessions.status` in `frontend/convex/schema.ts`.

### Transitions (implemented)

#### Transition: Session created
- **From**: (no state; session does not exist)
- **To**: `sessions.status = args.status` (caller-provided)
- **Trigger**: `frontend/convex/sessions.ts` mutation `createSession`
- **Actions**
  - Insert into `sessions` with provided status + riskScore and `loginTime = Date.now()`
  - Insert `activities` event `"Login Attempt"`
  - If `app.mlEnhancement` is true, schedule ML assessment

#### Transition: Session risk updated
- **From**: any prior status
- **To**: `sessions.status = args.status` (caller-provided) and `sessions.riskScore = args.riskScore`
- **Trigger**: `frontend/convex/sessions.ts` mutation `updateSessionRisk`
- **Actions**
  - Patch session doc with new risk + status
  - Insert `activities` event `"Risk Update"`

#### Transition: Session risk updated via ML action
- **From**: any prior status
- **To**: `sessions.status = result.risk_level.toLowerCase()` and `sessions.riskScore = result.risk_score`
- **Trigger**: `frontend/convex/ml.ts` action `assessRisk` calling mutation `syncMLResults`
- **Actions**
  - Patch session doc in `syncMLResults` (no activity insert in `ml.syncMLResults`)

### Invalid transitions
- Not enforced. Any status string may be written.

### Not implemented session states
The following session lifecycle states are not implemented as explicit states in platform Convex:
- NEW / AUTHENTICATED / ACTIVE / TERMINATED
- RESTRICTED (as an enforced backend state)

## Session State Machine (demo app)

### States
Demo Convex `sessions.status` is also a free string (based on `aegis-demo-app/convex/sessions.ts` usage).
Demo UI also maintains an in-memory lock state (`isLocked`) in a risk context (implementation not reviewed here).

### Transitions
- Similar to platform: create session and update risk.
- Additional UI transition: “locked/unlocked” is controlled by demo state logic (Unknown details).

## Account State Machine

### Account states
- **ACTIVE / LOCKED / DISABLED**: **Not implemented** as persistent account states in platform Convex schema.
- The system relies on Clerk for authentication; account disable/lock may exist in Clerk, but it is **Unknown** in this repo (not represented as a first-class concept).

## Combined state view (what the system actually uses)
```text
Risk state:     LOW | MEDIUM | HIGH | CRITICAL  (ML backend output)
Session status: free-form string; used as:
                  - suspicious/blocked (analytics checks)
                  - or risk_level.toLowerCase() (some writes)
Account state:  Not implemented in Convex schema
```

## Transition Triggers and Actions (summary)
```text
Trigger: SDK protectLogin/checkRisk
  -> Action: ML backend /predict/risk
  -> Output: RiskResponse (no persistence unless app writes it)

Trigger: Convex createSession (platform)
  -> Action: write session + activity; optionally schedule ml.assessRisk
  -> Output: sessionId

Trigger: Convex ml.assessRisk (platform)
  -> Action: fetch ML backend; patch session with risk
  -> Output: stored risk in session

Trigger: Demo attack simulator toggle
  -> Action: SDK checkRisk; optionally patch demo session with risk
  -> Output: UI risk update + stored session risk (if sessionId exists)
```

