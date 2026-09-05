import { api, setTracking } from "../api/client";
import { AuthResponse, Decision, LoginPayload, SignupPayload } from "../types";
import { setSession, getCurrentSession } from "../session/session";
import { handleDecision } from "../decision/decision";

/**
 * Sign up a new user
 */
export async function signup(payload: SignupPayload): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/signup", payload);
    
    if (response.sessionId) {
        setSession(response.sessionId, "NEW", response.correlationId || "init");
        setTracking(response.sessionId, response.correlationId || "init");
    }

    return response;
}

/**
 * Log in an existing user
 * On Login Flow:
 * 1. send credentials with API key
 * 2. receive session_id, correlation_id, decision, state
 * 3. DO NOT finalize login until decision is handled
 */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await api.post<any>("/auth/login", payload);

    const sessionId = response.sessionId;
    const correlationId = response.correlationId;
    const decision: Decision = response.decision;
    const state = response.state || "NEW";

    // Track the session instantly
    setSession(sessionId, state, correlationId);
    setTracking(sessionId, correlationId);

    // Decision Handling (Step 5)
    // NEVER interpret risk, ONLY act on decision.type
    await handleDecision(decision);

    return response as AuthResponse;
}

/**
 * Log out the current user
 */
export async function logout(): Promise<void> {
    const session = getCurrentSession();
    if (session) {
        await api.post("/auth/logout", { sessionId: session.id });
    }
    setSession(null, "TERMINATED", "");
    setTracking(null, null);
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<any> {
    return await api.get("/auth/me");
}
