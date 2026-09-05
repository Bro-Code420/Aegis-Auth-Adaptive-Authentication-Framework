import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { GenericDatabaseWriter } from "convex/server";
import { emitEvent } from "./events";

export type SessionState = 
    | "NEW" 
    | "EVALUATING" 
    | "ACTIVE" 
    | "CHALLENGED" 
    | "RESTRICTED" 
    | "BLOCKED" 
    | "TERMINATED";

const VALID_TRANSITIONS: Record<SessionState, SessionState[]> = {
    NEW: ["EVALUATING"],
    EVALUATING: ["ACTIVE", "CHALLENGED", "RESTRICTED", "BLOCKED"],
    ACTIVE: ["EVALUATING", "CHALLENGED", "RESTRICTED", "BLOCKED", "TERMINATED"],
    CHALLENGED: ["ACTIVE", "RESTRICTED", "BLOCKED", "TERMINATED"],
    RESTRICTED: ["EVALUATING", "CHALLENGED", "BLOCKED", "TERMINATED"],
    BLOCKED: ["TERMINATED"],
    TERMINATED: [],
};

/**
 * Centralized manager for session state transitions.
 * Enforces validation, increments state version, and logs action execution.
 */
export async function transitionSession(
    db: GenericDatabaseWriter<any>,
    sessionId: Id<"sessions">,
    nextState: SessionState,
    reason: string,
    correlationId: string
): Promise<void> {
    const session = await db.get(sessionId);
    if (!session) throw new Error("Session not found");

    const currentState = session.state as SessionState;

    // 1. Terminal State Enforcement (Backend Protected Layer)
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

    // 2. State Machine Logic Validation
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

    // 3. Persistence
    await db.patch(sessionId, {
        state: nextState,
        stateVersion: (session.stateVersion ?? 0) + 1,
        updatedAt: Date.now(),
    });

    // 4. ACTION_EXECUTED Event (Deterministic Outcome)
    await emitEvent(db, {
        type: "ACTION_EXECUTED",
        sessionId,
        correlationId,
        applicationId: session.applicationId,
        payload: { action: "STATE_TRANSITION", result: "SUCCESS", from: currentState, to: nextState }
    });

    // 5. Emit Traceable Event
    await emitEvent(db, {
        type: "STATE_TRANSITIONED",
        sessionId: sessionId,
        correlationId: correlationId,
        applicationId: session.applicationId,
        payload: {
            from: currentState,
            to: nextState,
            reason: reason,
            state_version: (session.stateVersion ?? 0) + 1
        }
    });

    console.log(`[Aegis State Machine] Transitioned session ${sessionId}: ${currentState} -> ${nextState} (Correlation: ${correlationId})`);
}
