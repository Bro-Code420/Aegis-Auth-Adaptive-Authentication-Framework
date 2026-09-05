# 🛡️ AegisAuth SDK

**AegisAuth** is an adaptive authentication platform that combines modern authentication (like Clerk/Auth0) with **real-time risk-based security and continuous session monitoring**.

This SDK allows developers to integrate:

* 🔐 Authentication (login, signup, session)
* 🧠 Adaptive authentication (risk + decision engine)
* ⚡ Real-time session monitoring
* 🔑 API-key–based multi-tenant integration
* 🔒 Decision-driven MFA (2FA)
* 🧾 Event-driven security pipeline

---

# 🚀 Core Concept

AegisAuth operates on a strict pipeline:

```
Signal → Risk → Decision → Action → State → Event
```

The SDK:

* ✔ Sends signals
* ✔ Receives decisions
* ✔ Executes actions

The SDK **does NOT**:

* ❌ Calculate risk
* ❌ Interpret risk
* ❌ Make security decisions

---

# 📦 Installation

```bash
npm install aegis-auth
```

---

# ⚙️ Initialization

```ts
import { initAegisAuth } from "aegis-auth";

const aegis = initAegisAuth({
  apiKey: "your_project_api_key",
  baseUrl: "https://api.aegisauth.com",
  appId: "your_app_id",
});
```

> ⚠️ The API key defines your project boundary.
> All requests are scoped to this key.

---

# 🔐 Authentication

## Signup

```ts
await aegis.signup(email, password);
```

## Login

```ts
const result = await aegis.login(email, password);
```

Login is **adaptive** — it may trigger MFA depending on risk.

---

# 🔑 MFA (2FA)

MFA is **decision-driven**, not manually triggered.

## Flow

```
Login → Decision: CHALLENGE → MFA_REQUIRED → Verify → ACTIVE
```

## Example

```ts
if (result.decision.type === "CHALLENGE") {
  await aegis.initiateMFA();

  await aegis.verifyMFA(code);
}
```

---

# 👤 Session

```ts
const session = await aegis.getSession();
```

Session includes:

* session_id
* state (ACTIVE, CHALLENGED, BLOCKED, etc.)
* correlation_id

---

# 🧠 Decision Handling

The SDK automatically handles decisions from backend:

| Decision  | Behavior          |
| --------- | ----------------- |
| ALLOW     | Continue session  |
| CHALLENGE | Trigger MFA       |
| RESTRICT  | Limit access      |
| BLOCK     | Terminate session |

You can also listen manually:

```ts
aegis.onDecision((decision) => {
  console.log("Decision:", decision.type);
});
```

---

# 📡 Signals (Core Feature)

Send user activity signals to enable adaptive authentication:

```ts
aegis.collectSignal("page_view", {
  path: "/dashboard",
});
```

Examples:

* page_view
* api_call
* user_action
* location_change

---

# ⚡ Continuous Monitoring

```ts
aegis.startMonitoring();
```

This enables:

* real-time risk evaluation
* session re-evaluation
* automatic enforcement

---

# 🔒 Route Protection

```ts
aegis.protectRoute();
```

Enforces session state:

| State      | Behavior       |
| ---------- | -------------- |
| ACTIVE     | allow          |
| CHALLENGED | require MFA    |
| RESTRICTED | limited access |
| BLOCKED    | deny           |
| TERMINATED | logout         |

---

# ⚙️ Actions

SDK executes backend actions automatically:

* SESSION_TERMINATE → logout
* MFA_REQUIRED → trigger MFA
* ACCESS_RESTRICT → limit UI

---

# ⚛️ React Integration

## Hooks

```ts
const { user, session } = useAegisAuth();
```

```ts
const mfa = useMFA();
```

### useMFA

```ts
mfa.startMFA();
mfa.verifyCode(code);
```

---

# 🧾 Event-Driven Architecture

Every request is traceable via:

* correlation_id
* session_id

You can debug full lifecycle:

```
Signal → Risk → Decision → Action → State
```

---

# 🔐 Security Model

AegisAuth follows **zero-trust architecture**:

* API key defines project boundary
* Backend enforces all rules
* SDK is not trusted
* Session state controls access
* All events are immutable

---

# ⚠️ Important Rules

* Do NOT interpret risk score in client
* Do NOT bypass SDK decision handling
* Do NOT trigger MFA manually
* Always rely on backend decisions

---

# 🧪 Example

```ts
const aegis = initAegisAuth({ apiKey });

await aegis.login(email, password);

aegis.startMonitoring();

aegis.collectSignal("user_action", {
  action: "clicked_button",
});
```

---

# 📊 Features

* ✔ Adaptive Authentication
* ✔ Continuous Monitoring
* ✔ Decision Engine Integration
* ✔ MFA (2FA)
* ✔ Session State Enforcement
* ✔ Event-driven architecture
* ✔ Multi-tenant API key model

---

# 🧭 Why AegisAuth?

Traditional auth systems:

```
Login → Access → Done
```

AegisAuth:

```
Login → Continuous Monitoring → Real-Time Decisions → Enforcement
```

---

# 📌 Roadmap

* Policy engine (custom rules)
* Advanced analytics dashboard
* Rate limiting & anomaly detection
* Multi-factor options (biometric, WebAuthn)

---

# 🤝 Contributing

Contributions are welcome. Please follow:

* clean architecture principles
* no client-side decision logic
* maintain SDK thinness

---

# 📄 License

MIT License
