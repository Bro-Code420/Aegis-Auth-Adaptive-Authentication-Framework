import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { transitionSession, SessionState } from "./sessionState";
import { emitEvent } from "./events";

/**
 * Convex Safety Controller & Policy Decision Point.
 * Ensures ML advisory scores are mapped to deterministic policy decisions.
 */
export const enforcePolicyDecision = mutation({
    args: {
        sessionId: v.id("sessions"),
        correlationId: v.string(),
        riskScore: v.float64(),
        evidenceState: v.optional(v.string()), // "TRUSTED" | "SUSPICIOUS" | "UNKNOWN" | "COMPROMISED"
        actionType: v.string(),
        isPhishingResistant: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");

        const evidenceState = args.evidenceState || "UNKNOWN";
        let decision: "ALLOW" | "STEP_UP" | "LIMIT" | "CONTAIN" | "REVOKE" = "ALLOW";
        let targetState: SessionState = "ACTIVE";
        let reason = "NORMAL_AUTHENTICATION";

        // 1. High Risk / Compromised Evidence
        if (evidenceState === "COMPROMISED" || args.riskScore >= 0.85) {
            decision = "CONTAIN";
            targetState = "CONTAINED";
            reason = "HIGH_RISK_COMPROMISE_DETECTED";
        }
        // 2. Sensitive Action Invariant
        else if (["FACTOR_CHANGE", "PASSWORD_RESET", "EXPORT_DATA"].includes(args.actionType)) {
            if (!args.isPhishingResistant || args.riskScore > 0.30) {
                decision = "STEP_UP";
                targetState = "CHALLENGED";
                reason = "SENSITIVE_ACTION_STEP_UP_REQUIRED";
            }
        }
        // 3. Uncertainty / Cold Start
        else if (evidenceState === "UNKNOWN") {
            if (args.riskScore > 0.50) {
                decision = "STEP_UP";
                targetState = "CHALLENGED";
                reason = "UNCERTAIN_TELEMETRY_STEP_UP";
            } else {
                decision = "LIMIT";
                targetState = "RESTRICTED";
                reason = "UNVERIFIED_DEVICE_LIMITED_ACCESS";
            }
        }
        // 4. Suspicious / Elevated Risk
        else if (args.riskScore > 0.45) {
            decision = "STEP_UP";
            targetState = "CHALLENGED";
            reason = "ELEVATED_RISK_STEP_UP";
        }

        // Apply state transition through centralized state machine
        await transitionSession(
            ctx.db,
            args.sessionId,
            targetState,
            reason,
            args.correlationId,
            session.stateVersion
        );

        // Record DECISION_MADE event
        await emitEvent(ctx.db, {
            type: "DECISION_MADE",
            sessionId: args.sessionId,
            correlationId: args.correlationId,
            applicationId: session.applicationId,
            payload: {
                decision,
                targetState,
                riskScore: args.riskScore,
                evidenceState,
                reason,
            }
        });

        return {
            decision,
            targetState,
            reason,
            version: (session.stateVersion ?? 0) + 1,
        };
    }
});
