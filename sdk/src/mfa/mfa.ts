import { api } from "../api/client";
import { getCurrentSession, updateSessionState } from "../session/session";
import { AegisError, AuthResponse } from "../types";

/**
 * Initiate MFA (Decision-driven)
 */
export async function initiateMFA(): Promise<void> {
    const session = getCurrentSession();
    if (!session) throw new AegisError("No active session found", "SESSION_EXPIRED");

    await api.post("/auth/mfa/initiate", { sessionId: session.id, correlationId: session.correlationId });
    console.log("[Aegis MFA] MFA challenge initiated");
}

/**
 * Verify the MFA code
 * If successful, the backend will update the session state.
 */
export async function verifyMFA(code: string): Promise<AuthResponse> {
    const session = getCurrentSession();
    if (!session) throw new AegisError("No active session found", "SESSION_EXPIRED");

    try {
        const response = await api.post<AuthResponse>("/auth/mfa/verify", { 
            sessionId: session.id, 
            correlationId: session.correlationId,
            code 
        });

        // Backend validates and session state → ACTIVE
        updateSessionState("ACTIVE");
        console.log("[Aegis MFA] MFA verification successful");
        
        return response;
    } catch (error) {
        console.error("[Aegis MFA] MFA verification failed", error);
        throw error;
    }
}

/**
 * Complete MFA (Finalization)
 */
export async function completeMFA(): Promise<void> {
    console.log("[Aegis MFA] MFA completed successfully");
}
