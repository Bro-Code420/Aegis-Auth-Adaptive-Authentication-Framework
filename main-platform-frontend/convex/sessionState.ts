import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { GenericDatabaseWriter } from "convex/server";
import { emitEvent } from "./events";

export type SessionState = 
    | "NEW" 
    | "EVALUATING" 
    | "ACTIVE" 
    | "SUSPICIOUS" 
    | "CHALLENGED" 
    | "RESTRICTED" 
    | "CONTAINED" 
    | "REVOKED" 
    | "BLOCKED" 
    | "RECOVERY" 
    | "TERMINATED";

const VALID_TRANSITIONS: Record<SessionState, SessionState[]> = {
    NEW: ["EVALUATING", "ACTIVE", "CHALLENGED", "RESTRICTED", "CONTAINED", "BLOCKED"],
    EVALUATING: ["ACTIVE", "SUSPICIOUS", "CHALLENGED", "RESTRICTED", "CONTAINED", "REVOKED", "BLOCKED"],
    ACTIVE: ["EVALUATING", "SUSPICIOUS", "CHALLENGED", "RESTRICTED", "CONTAINED", "BLOCKED", "TERMINATED"],
    SUSPICIOUS: ["EVALUATING", "ACTIVE", "CHALLENGED", "RESTRICTED", "CONTAINED", "BLOCKED", "TERMINATED"],
    CHALLENGED: ["ACTIVE", "RESTRICTED", "CONTAINED", "REVOKED", "BLOCKED", "TERMINATED"],
    RESTRICTED: ["EVALUATING", "ACTIVE", "CHALLENGED", "CONTAINED", "BLOCKED", "TERMINATED"],
    CONTAINED: ["RECOVERY", "REVOKED", "TERMINATED"],
    REVOKED: ["TERMINATED"],
    BLOCKED: ["TERMINATED"],
    RECOVERY: ["ACTIVE", "CHALLENGED", "REVOKED", "TERMINATED"],
    TERMINATED: [],
};

/**
 * Hardened centralized manager for session state transitions.
 * Enforces validation, rejects stale decisions via monotonic versioning, and logs audit events.
 */
export async function transitionSession(
    db: GenericDatabaseWriter<any>,
    sessionId: Id<"sessions">,
    nextState: SessionState,
    reason: string,
    correlationId: string,
    expectedVersion?: number
): Promise<void> {
    const session = await db.get(sessionId);
    if (!session) throw new Error("Session not found");

    const currentState = (session.state as SessionState) || "NEW";
    const currentVersion = session.stateVersion ?? 0;

    // 1. Stale-Decision Race Protection
    if (expectedVersion !== undefined && expectedVersion < currentVersion) {
        const errorMsg = `STALE_DECISION_REJECTED: Received transition with version ${expectedVersion} < currentVersion ${currentVersion}`;
        console.warn(`[Aegis State Machine] ${errorMsg}`);
        
        await emitEvent(db, {
            type: "ACTION_FAILED",
            sessionId,
            correlationId,
            applicationId: session.applicationId,
            payload: { action: "STATE_TRANSITION", reason: "STALE_VERSION_REJECTED", from: currentState, attempted: nextState }
        });
        return;
    }

    // 2. Terminal State Enforcement
    if (currentState === "TERMINATED") {
        const errorMsg = `FORBIDDEN: Attempted mutation from terminal state ${currentState} for session ${sessionId}`;
        console.error(errorMsg);
        
        await emitEvent(db, {
            type: "ACTION_FAILED",
            sessionId,
            correlationId,
            applicationId: session.applicationId,
            payload: { action: "STATE_TRANSITION", reason: "TERMINAL_STATE_VIOLATION", from: currentState, to: nextState }
        });
        
        throw new Error(errorMsg);
    }

    if (currentState === nextState) return;

    // 3. State Machine Logic Validation
    const allowed = VALID_TRANSITIONS[currentState] || [];
    if (!allowed.includes(nextState)) {
        const errorMsg = `Invalid transition: ${currentState} -> ${nextState} for session ${sessionId}`;
        console.error(`[Aegis State Machine Violation] ${errorMsg}`);
        
        await emitEvent(db, {
            type: "ACTION_FAILED",
            sessionId,
            correlationId,
            applicationId: session.applicationId,
            payload: { action: "STATE_TRANSITION", reason: "INVALID_TRANSITION_PATH", from: currentState, to: nextState }
        });

        throw new Error(errorMsg);
    }

    const nextVersion = currentVersion + 1;

    // 4. Persistence with Monotonic Version Increment
    await db.patch(sessionId, {
        state: nextState,
        stateVersion: nextVersion,
        updatedAt: Date.now(),
    });

    // 5. ACTION_EXECUTED & STATE_TRANSITIONED Events
    await emitEvent(db, {
        type: "ACTION_EXECUTED",
        sessionId,
        correlationId,
        applicationId: session.applicationId,
        payload: { action: "STATE_TRANSITION", result: "SUCCESS", from: currentState, to: nextState }
    });

    await emitEvent(db, {
        type: "STATE_TRANSITIONED",
        sessionId: sessionId,
        correlationId: correlationId,
        applicationId: session.applicationId,
        payload: {
            from: currentState,
            to: nextState,
            reason: reason,
            state_version: nextVersion
        }
    });

    console.log(`[Aegis State Machine] Transitioned session ${sessionId}: ${currentState} -> ${nextState} (v${nextVersion}, Correlation: ${correlationId})`);
}
