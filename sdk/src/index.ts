// Public API Export (Step 18)

// 1. Configuration and Initialization (Step 1)
export { initAegisAuth, getConfig } from "./core/config";

// 2. Authentication and Decisions (Step 4 & 5)
export { signup, login, logout, getCurrentUser } from "./auth/auth";
export { handleDecision } from "./decision/decision";

// 3. Multi-Factor Authentication & WebAuthn / Passkeys (Step 6)
export { initiateMFA, verifyMFA, completeMFA } from "./mfa/mfa";
export { registerPasskey, authenticatePasskey } from "./webauthn/webauthn";

// 4. Session State and Route Protection (Step 7 & 11)
export { 
  getCurrentSession, 
  protectRoute, 
  onSessionChange, 
  updateSessionState 
} from "./session/session";

// 5. Signal Collection and continuous Monitoring (Step 8 & 9)
export { collectSignal, startMonitoring, stopMonitoring } from "./signals/signals";
export { setTracking } from "./api/client";

// 6. Action Execution (Step 10)
export { executeAction, onAction } from "./actions/actions";

// 7. Standard Observability (Step 13)
export { onSessionChange as onSessionUpdate } from "./session/session";
export { onAction as onPolicyAction } from "./actions/actions";

// 8. Types and Errors (Step 15)
export * from "./types";

// 9. React Integration (Step 12)
export * from "./hooks/useAegisAuth";
