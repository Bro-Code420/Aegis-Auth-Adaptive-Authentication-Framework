# DEPLOYMENT_AND_INFRASTRUCTURE.md — Operational model (current implementation)

## Scope note
This repository contains application code but limited explicit production infrastructure configuration. This document records what is present and marks the rest as **Unknown**.

## Services and deployables

### Platform dashboard (`frontend/`)
- **Type**: Next.js web application
- **Runs**: `next dev` / `next build` / `next start`
- **Dependencies**:
  - Convex deployment (external)
  - Clerk configuration (external)

### Demo app (`aegis-demo-app/`)
- **Type**: Next.js web application
- **Dependencies**:
  - Convex deployment (external)
  - Clerk configuration (external)
  - SDK (`@aegis/auth-sdk` via local file dependency in demo)

### SDK (`sdk/`)
- **Type**: TypeScript library
- **Build**: `tsup` (configured in repo)
- **Distribution**: `dist/` (build output; not necessarily committed)

### ML backend (`ml-backend/`)
- **Type**: FastAPI service
- **Runs**: `uvicorn main:app --reload --port 8000` (dev)
- **Runtime dependencies**:
  - Model weights in `ml-backend/weights/`
  - Optional: Twilio + Gemini keys for support routes

## Environment configuration

### Platform env (`frontend/.env.local`)
Observed keys:
- Convex:
  - `CONVEX_DEPLOYMENT`
  - `NEXT_PUBLIC_CONVEX_URL`
  - `NEXT_PUBLIC_CONVEX_SITE_URL`
- Clerk:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
- Support/AI:
  - `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_PHONE_ID`
  - `GEMINI_API_KEY`

### ML backend env (`ml-backend/.env.local`)
Observed keys:
- `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_PHONE_ID`, `GEMINI_API_KEY`

### ML backend endpoint configuration
- `frontend/convex/ml.ts` reads:
  - `process.env.ML_BACKEND_URL` else defaults to `http://localhost:8000`

## Containers and orchestration
- **Dockerfiles**: not present in repo.
- **Kubernetes manifests**: not present.
- **Terraform/IaC**: not present.
- **Status**: **Unknown / Not implemented**

## CI/CD
- No CI pipeline config observed in files reviewed.
- **Status**: **Unknown**

## Secrets handling
- Secrets are stored in `.env.local` files in the workspace.
- Secret distribution mechanism for production: **Unknown**.

## Monitoring and alerting infrastructure
- Not represented in repo (no metrics exporters, no tracing setup, no alert rules).
- **Status**: **Unknown / Not implemented**

## Local development topology (as implemented)
```text
Developer machine
  - Next.js platform dev server (frontend/)
  - Next.js demo dev server (aegis-demo-app/)
  - Convex dev (hosted deployment configured by CONVEX_DEPLOYMENT)
  - FastAPI risk engine (ml-backend/) on :8000
```

