import { Session, SessionState, AegisError } from "../types";

let currentSession: Session | null = null;
const sessionObservers: Array<(session: Session | null) => void> = [];

/**
 * Update the active session details
 */
export function setSession(id: string | null, state: SessionState, correlationId: string): void {
  if (id === null) {
      currentSession = null;
  } else {
      currentSession = { id, state, correlationId };
  }
  
  notifyObservers();
}

/**
 * Retrieve the current session
 */
export function getCurrentSession(): Session | null {
  return currentSession;
}

/**
 * Update current session state
 */
export function updateSessionState(state: SessionState): void {
  if (currentSession) {
    currentSession.state = state;
    notifyObservers();
  }
}

/**
 * Step 11: Route Protection
 * Enforce session state for protected operations.
 */
export function protectRoute(): boolean {
  if (!currentSession) {
      throw new AegisError("Authentication required. Redirecting to login.", "AUTH_ERROR");
  }

  // BLOCKED → deny access
  if (currentSession.state === "BLOCKED") {
    throw new AegisError("Your account is blocked for security reasons.", "ACCESS_DENIED");
  }

  // TERMINATED → logout
  if (currentSession.state === "TERMINATED") {
    throw new AegisError("Session expired. Please log in again.", "SESSION_EXPIRED");
  }

  // CHALLENGED → require MFA
  if (currentSession.state === "CHALLENGED") {
    throw new AegisError("MFA Verification required.", "MFA_REQUIRED");
  }

  return true;
}

/**
 * Subsidary: Observe session changes
 */
export function onSessionChange(callback: (session: Session | null) => void): () => void {
  sessionObservers.push(callback);
  return () => {
    const index = sessionObservers.indexOf(callback);
    if (index !== -1) sessionObservers.splice(index, 1);
  };
}

function notifyObservers() {
  sessionObservers.forEach(cb => cb(currentSession));
}
