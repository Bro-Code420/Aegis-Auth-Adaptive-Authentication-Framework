# SYSTEM_OVERVIEW.md — AegisAuth (current implementation)

## Project Description
AegisAuth is a multi-repo-in-one codebase containing:

- A **platform dashboard** (`frontend/`) built with Next.js + Convex + Clerk.
- A **TypeScript SDK** (`sdk/`) that collects basic browser fingerprint signals and calls a risk-scoring API.
- An **ML backend** (`ml-backend/`) implemented with FastAPI that exposes risk scoring endpoints and loads multiple serialized scikit-learn models.
- A **demo application** (`aegis-demo-app/`) built with Next.js + Convex + Clerk that calls the SDK and records session/risk state into Convex.

What it does today (based on code):

- Computes a **risk score and risk level** by calling `POST /predict/risk` on the ML backend.
- The SDK can also perform **periodic risk checks** (“monitoring”) by running `setInterval()` and calling the same risk endpoint.
- Convex stores and displays **applications**, **sessions**, **activities**, **risk policies**, and **support tickets/messages**. Some analytics are derived from these tables; some are mocked/randomized.

## System Goals
Documented in code and behavior (not marketing intent):

- Provide a **client SDK** that can request a **risk score** for a login or ongoing session context.
- Provide a **dashboard** that can list applications, sessions, activities, and risk policies stored in Convex.
- Provide an ML service that can run **five model predictors** and aggregate them into a single response.

Unknown / Not implemented (in current repo):

- A complete authentication product (password verification, MFA enforcement, credential issuance) is **not implemented** in this repo; Clerk is used for dashboard/demo identity, but no first-party auth is present.
- API key management beyond storing generated strings on `applications` is **partially implemented**.

## Primary Actors
- **Developer (platform user)**: signs in to `frontend/` via Clerk; creates “applications” and risk policies in Convex.
- **End user (demo user)**: uses `aegis-demo-app/` UI; Clerk identity may be present, but the demo login form does not validate credentials.
- **SDK consumer**: an app importing `@aegis/auth-sdk` and calling `protectLogin()` / `checkRisk()` / monitoring APIs.
- **Admin (platform “admin” UI)**: reads global stats and threat logs via `frontend/convex/admin.ts`. Access control is minimal (see limitations).
- **Support user**: creates tickets and messages via `frontend/convex/support.ts`; ML backend also exposes support endpoints using Twilio/Gemini (see `ml-backend/src/api/routes_support.py`).

## Core Responsibilities
- **SDK**
  - Collect a basic fingerprint (user agent, platform, screen resolution, timezone, etc.).
  - Send `POST {endpoint}/predict/risk` with `x-api-key` header and JSON body.
  - Optionally poll risk on an interval (“monitoring”) and invoke a callback.
- **ML backend**
  - Load serialized ML models from `ml-backend/weights/`.
  - Expose `POST /predict/risk` that accepts either a nested “unified” schema or a flat “SDK” schema.
  - Map flat SDK payloads into model feature schemas with defaults and simulation flags.
  - Aggregate model outputs into a `risk_score` and `risk_level`.
- **Platform dashboard**
  - Read/write data stored in Convex: applications, sessions, activities, risk policies, orgs, support tickets/messages.
  - Trigger a Convex action (`ml.assessRisk`) to call the ML backend and persist results to sessions (currently uses a mock request body).
- **Demo app**
  - Call the SDK to get a risk score during “login” and during attack simulation.
  - Write session risk updates into Convex (demo app has its own Convex project structure).

## System Components
- **`frontend/`** (Next.js + Convex + Clerk)
  - Convex tables: `applications`, `sessions`, `activities`, `riskPolicies`, `organizations`, `organizationMembers`, `supportTickets`, `supportMessages`, `systemSettings`, `messages`.
  - Convex functions implement CRUD and read models for dashboard pages.
- **`sdk/`** (TypeScript library)
  - `AegisAuth` client class.
  - Fingerprint collection and comparison.
  - Monitoring interval implementation.
- **`ml-backend/`** (FastAPI)
  - `POST /predict/risk` and other `/predict/*` endpoints.
  - Risk aggregation and predictors (scikit-learn pipelines loaded via joblib).
  - Support endpoints integrating Twilio + Gemini (package deprecation warning present at runtime).
- **`aegis-demo-app/`** (Next.js + Convex + Clerk)
  - Demo UI that calls SDK functions.
  - Convex tables/functions for sessions/analytics (implementation differs from `frontend/` Convex).

## High-Level Architecture Diagram
```text
                ┌─────────────────────────────┐
                │  Platform Dashboard          │
                │  Next.js (frontend/)         │
                │  Clerk + Convex              │
                └──────────────┬──────────────┘
                               │ Convex queries/mutations/actions
                               ▼
                      ┌──────────────────┐
                      │ Convex backend   │
                      │ (hosted service) │
                      └───────┬──────────┘
                              │ action fetch() to ML backend
                              ▼
                      ┌──────────────────┐
                      │ ML Backend       │
                      │ FastAPI          │
                      │ /predict/risk    │
                      └──────────────────┘

  ┌─────────────────────────────┐
  │ Demo App (aegis-demo-app/)   │
  │ Next.js + Clerk + Convex     │
  └──────────────┬──────────────┘
                 │ imports
                 ▼
          ┌──────────────┐
          │ SDK (sdk/)    │
          │ AegisAuth     │
          └──────┬────────┘
                 │ HTTP POST /predict/risk (x-api-key header)
                 ▼
            ┌──────────────┐
            │ ML Backend    │
            └──────────────┘
```

## System Boundaries
- AegisAuth **does not** implement first-party user credential authentication. Clerk provides identity for the platform and demo.
- “Risk scoring” is implemented as an HTTP API call to `ml-backend`. Convex stores and displays resulting values.
- Convex is the persistence layer for the platform and demo. Traditional SQL/NoSQL databases are not used in this repository.

## External Services Used
Evidence in code/config:

- **Convex**: data storage and serverless functions (`frontend/convex/*`, `aegis-demo-app/convex/*`).
- **Clerk**: authentication/identity provider for Next.js apps (`@clerk/nextjs`, Convex auth config).
- **Twilio**: used by ML backend support routes (`twilio`).
- **Google Generative AI (Gemini)**: used by ML backend support routes (`google.generativeai`) and is currently emitting a deprecation warning at runtime.

Unknown:

- Production hosting provider(s) for Next.js apps and ML backend (no Dockerfiles or IaC found in repo).

## Deployment Model
Observed local/dev model:

- `frontend/`: `next dev` (Next.js dev server).
- Convex: `npx convex dev` using `.env.local` `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`.
- `ml-backend/`: `uvicorn main:app --reload --port 8000` (FastAPI + autoreload).
- `aegis-demo-app/`: `next dev` plus its own Convex dev workflow.

Not implemented / Unknown:

- Containerization, orchestration, CI/CD, production environment separation.

## Current Scope
Implemented:

- Risk scoring API and SDK wrapper around `POST /predict/risk`.
- Dashboard data model in Convex (apps, sessions, activities, policies, orgs).
- Demo UI for login risk evaluation and simulated attack flags, persisting session risk updates.

Partially implemented / Prototype:

- Convex action `ml.assessRisk` constructs a mostly mocked request body and does not use actual session metrics.
- Some analytics are randomized or simplified rather than derived from historical datasets.

