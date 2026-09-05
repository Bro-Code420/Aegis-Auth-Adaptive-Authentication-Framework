# AegisAuth Refactor Instructions

You are working on a production-grade adaptive authentication system.

This project is currently inconsistent and must be refactored into a clean, use-case-driven architecture.

## Core Principle

The system MUST follow this pipeline:

Signal → Risk → Decision → Action → State → Monitoring

No component is allowed to bypass this pipeline.

---

## Non-Negotiable Rules

1. Single Source of Truth
- Risk is calculated ONLY by the ML backend
- Decision is made ONLY by the Decision Engine
- No other layer can reinterpret risk

2. No Duplicate Logic
- Do not duplicate risk thresholds or logic in multiple places
- Remove all conflicting implementations

3. Explicit State Management
- Session states must be defined and controlled
- No free-form status strings

4. Strict Separation of Concerns
- SDK = signal collection only
- ML backend = risk scoring only
- Decision engine = action selection only
- Platform = visualization only

5. No Silent Assumptions
- Every transformation must be explicit
- No hidden mapping logic

6. No Mock Logic in Core Flow
- Remove hardcoded defaults used in production paths
- Simulation logic must be isolated

7. Security First
- Every request must be authenticated
- No userId passed as argument for authorization

---

## What NOT to do

- Do not introduce new features
- Do not redesign UI
- Do not change libraries unless necessary
- Do not write placeholder logic

---

## Expected Output Style

- Clear function responsibility
- Explicit data flow
- Typed data contracts
- No ambiguous naming

---

## Refactor Goal

Transform the system into:

A deterministic, explainable, real-time risk decision engine

---

## When unsure

- Prefer removing logic over keeping unclear logic
- Prefer explicit over implicit
- Prefer correctness over completeness