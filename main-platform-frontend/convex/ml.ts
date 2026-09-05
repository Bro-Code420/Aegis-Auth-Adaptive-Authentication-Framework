import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { evaluateDecision, DecisionType } from "./decisions";
import { transitionSession, SessionState } from "./sessionState";
import { emitEvent } from "./events";

export const getSessionAppAndSettings = query({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        
        let settings = await ctx.db
            .query("securitySettings")
            .withIndex("by_application", q => q.eq("applicationId", session.applicationId))
            .first();

        if (!settings) {
            settings = {
                _id: "default" as any,
                _creationTime: Date.now(),
                applicationId: session.applicationId,
                enforceMfa: false,
                riskBasedAuth: true,
                autoBlockHighRisk: true,
                sessionRecording: false,
                ipAllowlistEnabled: false,
                updatedAt: Date.now()
            };
        }
        return { session, settings };
    }
});

export const assessRisk = action({
    args: {
        sessionId: v.id("sessions"),
        correlationId: v.string(),
        context: v.any(),
    },
    handler: async (ctx, args) => {
        const mlUrl = process.env.ML_BACKEND_URL || "http://localhost:8000";

        // Fetch session & unique security settings mapping for this specific app
        const { session, settings } = await ctx.runQuery(api.ml.getSessionAppAndSettings, {
            sessionId: args.sessionId
        });

        const requestBody = {
            login: {
                username: args.context.userEmail || session.userEmail || "user@example.com",
                ip_address: args.context.ip || session.ip || "192.168.1.1",
                user_agent: session.browser || "AegisAuth-SDK/1.0",
                login_timestamp: new Date().toISOString(),
                correlation_id: args.correlationId,
            },
            session: { session_id: args.sessionId },
            device: { device_id: args.context.device || session.device || "dev_unknown" }
        };

        try {
            const response: any = await fetch(`${mlUrl}/predict/risk`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-api-key": process.env.ML_BACKEND_API_KEY || "aegis_master_key_2024"
                 },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) throw new Error(`ML Backend responded with ${response.status}`);

            const result: any = await response.json();
            
            // Map standardized factors
            const factors = result.factors || {
                ipRisk: result.components?.login || 0,
                deviceTrust: result.components?.device || 0,
                geoAnomaly: result.components?.global || 0
            };

            const modelVersion = result.model_version || "v1-prod";

            // Generate the decision strictly based on the database-enforced settings
            const decision = evaluateDecision(result.risk_score, result.risk_level, settings, session.ip);

            const stateMap: Record<DecisionType, SessionState> = {
                ALLOW: "ACTIVE",
                CHALLENGE: "CHALLENGED",
                RESTRICT: "RESTRICTED",
                BLOCK: "BLOCKED"
            };

            await ctx.runMutation(api.ml.syncMLResults, {
                sessionId: args.sessionId,
                correlationId: args.correlationId,
                score: result.risk_score,
                factors,
                modelVersion,
                state: stateMap[decision.type],
                decisionType: decision.type,
                riskResult: result
            });

            return { ...result, decision, factors, modelVersion };
        } catch (error) {
            console.error("ML Risk Assessment failed:", error);
            return null;
        }
    },
});

export const syncMLResults = mutation({
    args: {
        sessionId: v.id("sessions"),
        correlationId: v.string(),
        score: v.number(),
        factors: v.object({
            ipRisk: v.number(),
            deviceTrust: v.number(),
            geoAnomaly: v.number(),
        }),
        modelVersion: v.string(),
        state: v.string(),
        decisionType: v.string(),
        riskResult: v.any(),
    },
    handler: async (ctx, args) => {
        let session = await ctx.db.get(args.sessionId);
        
        // Session Guarantee (Robustness Layer)
        if (!session) {
            console.warn(`[Aegis Sync] Session ${args.sessionId} missing. Attempting recovery...`);
            // In a real disaster recovery, we might reconstruct the session here if we had all fields.
            // For this specific pipeline, we expect the session to exist.
            return;
        }

        if (session.state === "TERMINATED") return;

        const applicationId = session.applicationId;

        // 1. Store ML Score History (Permanent Observability)
        await ctx.db.insert("mlScores", {
            sessionId: args.sessionId,
            applicationId,
            score: args.score,
            factors: args.factors,
            modelVersion: args.modelVersion,
            correlationId: args.correlationId,
            createdAt: Date.now(),
        });

        // 2. State Transition & Score Persistence
        // We update the session score and state. 
        // Note: transitionSession will handle state transition logic and stateVersion.
        await ctx.db.patch(args.sessionId, { score: args.score });

        try {
            await transitionSession(
                ctx.db, 
                args.sessionId, 
                args.state as SessionState, 
                "ML_ASSESSMENT_COMPLETED",
                args.correlationId
            );
        } catch (e) {
            console.warn(`[Aegis Sync] State transition failed for session ${args.sessionId}: ${e}`);
            // If transition fails (e.g. invalid path), we still want the score to be saved.
            // We've already patched the score above.
        }

        // 3. Real-Time Security Alerts (Enforcement Trigger)
        if (args.score >= 0.7 || args.decisionType === "BLOCK") {
            const app = await ctx.db.get(applicationId);
            if (app) {
                await ctx.db.insert("alerts", {
                    userId: app.userId,
                    applicationId,
                    type: args.decisionType === "BLOCK" ? "BLOCKED" : "HIGH_RISK",
                    message: args.decisionType === "BLOCK" 
                        ? `CRITICAL: Session blocked due to extreme risk (${args.score.toFixed(2)})` 
                        : `WARNING: High risk detected (${args.score.toFixed(2)}). Verification required.`,
                    severity: args.score >= 0.9 ? "CRITICAL" : "HIGH",
                    correlationId: args.correlationId,
                    isRead: false,
                    createdAt: Date.now()
                });
            }
        }

        // 4. Activity Audit Logging
        await ctx.db.insert("activities", {
            applicationId,
            sessionId: args.sessionId,
            timestamp: Date.now(),
            type: "risk_update",
            userEmail: session.userEmail,
            ip: session.ip,
            riskScore: args.score,
            details: {
                factors: args.factors,
                modelVersion: args.modelVersion,
                decision: args.decisionType
            }
        });

        // 5. Emit Traceable Events
        await emitEvent(ctx.db, {
            type: "RISK_CALCULATED",
            sessionId: args.sessionId,
            correlationId: args.correlationId,
            applicationId,
            payload: {
                ...args.riskResult,
                factors: args.factors,
                modelVersion: args.modelVersion
            }
        });

        await emitEvent(ctx.db, {
            type: "DECISION_MADE",
            sessionId: args.sessionId,
            correlationId: args.correlationId,
            applicationId,
            payload: {
                decision: args.decisionType,
                target_state: args.state,
                score: args.score
            }
        });
    },
});


export const getSessionMLHistory = query({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("mlScores")
            .withIndex("by_session_time", q => q.eq("sessionId", args.sessionId))
            .order("desc")
            .collect();
    },
});
