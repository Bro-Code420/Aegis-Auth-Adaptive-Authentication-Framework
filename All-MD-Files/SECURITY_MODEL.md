# SECURITY_MODEL.md — Security model (current implementation)

## Scope note
This document describes security-relevant behavior present in code. It intentionally highlights gaps where controls are absent or unclear.

## Authentication methods

### Platform (`frontend/`)
- **Method**: Clerk for Next.js authentication (`@clerk/nextjs`)
- **Convex integration**: `frontend/convex/auth.config.ts` configures a Clerk issuer domain and `applicationID: "convex"`.
- **Convex identity usage**: Many Convex functions call `ctx.auth.getUserIdentity()` and use `identity.subject` as a user identifier.

### Demo app (`aegis-demo-app/`)
- **Method**: Clerk hooks are used in UI (`useUser()`), but the “login” form does not verify credentials in code reviewed.
- **Status**: **Partially implemented** (identity is external; app-level credential auth is not implemented here).

### ML backend (`ml-backend/`)
- **Method**: None observed (no auth middleware in reviewed routes).
- **Status**: **Not implemented / Unknown**

## Token handling

### Clerk ↔ Convex
- **Mechanism**: Convex client provider uses `ConvexProviderWithClerk` and Clerk’s `useAuth` hook (`frontend/components/ConvexClientProvider.tsx`).
- **Token storage**: Handled by Clerk/Convex client libraries (implementation details not in this repo).
- **Unknown**: Token lifetime/refresh policy and transport security for production.

## API key handling

### Generation and storage
- **Generated in**: `frontend/convex/applications.ts`
- **Stored as**: plain string fields in `applications` table:
  - `apiKey` and `secret`
- **Rotation/revocation**: **Not implemented**

### Transmission
- **SDK sends**: `x-api-key` header on requests (`sdk/src/client.ts`).

### Verification
- **ML backend verification**: **Unknown / Not implemented**
  - The reviewed ML backend endpoints do not validate `x-api-key`.

## Access control model (Convex)

### Pattern used
- Some functions:
  - derive identity from `ctx.auth.getUserIdentity()`
  - use `identity.subject` to scope queries by user
- Other functions:
  - accept `userId` as an argument and do not authenticate/authorize it

### Areas with missing or inconsistent access control (observed)
- **Admin functions** (`frontend/convex/admin.ts`)
  - Do not check identity or roles.
- **Support functions** (`frontend/convex/support.ts`)
  - Accept `userId` as a function arg and do not derive it from auth identity.
- **Org-scoped queries**
  - Some queries accept `organizationId` and return data without verifying membership.

## Encryption
- **In transit**
  - Expected via HTTPS in production for Clerk/Convex endpoints; enforcement is **Unknown** in this repo (no infra config).
- **At rest**
  - Convex handles storage encryption details (not represented here).
- **Application-level encryption**
  - Not implemented for stored API keys/secrets in Convex schema (plain strings).

## Secrets management
- `.env.local` files exist and contain secrets in this workspace (Clerk/Gemini/ElevenLabs).
- Whether these files are committed to git is unknown from this document alone; the current workspace contains them.

## Audit logging

### Implemented audit-style records
- `activities` table stores event-like records (“Login Attempt”, “Risk Update”).
- These records are used for dashboard/admin “threat logs”.

### Not implemented
- No cryptographic audit trail, immutability guarantees, or structured security event taxonomy.
- No centralized correlation IDs across SDK → ML backend → Convex writes.

## Threat model assumptions (implicit)
- SDK provides client-side fingerprinting and metadata, but the backend mapping currently uses only a small subset of those inputs.
- Risk scoring is advisory; enforcement is mostly UI-level in the demo app.

