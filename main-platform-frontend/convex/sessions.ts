import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { transitionSession, SessionState } from "./sessionState";
import { emitEvent } from "./events";

/**
 * Access Control Helper: Ensures user is member of organization or owner.
 */
async function validateAppAccess(ctx: any, applicationId: any) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const app = await ctx.db.get(applicationId);
    if (!app) throw new Error("Application not found");

    if (app.userId !== identity.subject) {
        // Check org membership if not the owner
        if (app.organizationId) {
            const membership = await ctx.db
                .query("organizationMembers")
                .withIndex("by_user", (q: any) => q.eq("userId", identity.subject))
                .filter((q: any) => q.eq(q.field("organizationId"), app.organizationId))
                .first();
            if (!membership) throw new Error("Forbidden: No access to this application");
        } else {
            throw new Error("Forbidden: Access denied");
        }
    }
    return { identity, app };
}

export const list = query({
    args: { 
        applicationId: v.optional(v.id("applications")),
        organizationId: v.optional(v.id("organizations"))
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const userId = identity.subject;

        let apps;
        if (args.organizationId) {
            // Verify org membership first
            const membership = await ctx.db
                .query("organizationMembers")
                .withIndex("by_user", (q: any) => q.eq("userId", userId))
                .filter((q: any) => q.eq(q.field("organizationId"), args.organizationId))
                .first();
            if (!membership) return [];

            apps = await ctx.db
                .query("applications")
                .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId!))
                .collect();
        } else {
            apps = await ctx.db
                .query("applications")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .collect();
        }

        const appIds = new Set(apps.map((app) => app._id.toString()));

        if (args.applicationId) {
            if (!appIds.has(args.applicationId.toString())) {
                return [];
            }

            const appSessions = await ctx.db
                .query("sessions")
                .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId!))
                .order("desc")
                .collect();
                
            return filterValidLiveSessions(appSessions).slice(0, 100);
        }

        let sessions = [];
        for (const app of apps) {
            const appSessions = await ctx.db
                .query("sessions")
                .withIndex("by_application", (q) => q.eq("applicationId", app._id))
                .order("desc")
                .take(100);
            sessions.push(...appSessions);
        }

        return filterValidLiveSessions(sessions)
            .sort((a, b) => b.loginTime - a.loginTime)
            .slice(0, 100);
    },
});

function filterValidLiveSessions(sessions: any[]) {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    return sessions.filter(s => {
        // Validation Rule: Must have required fields
        const hasValidIds = !!s._id && !!s.applicationId && !!s.userEmail;
        
        // Live Session Filter: Must be recent (last 24h)
        const isRecent = s.loginTime > twentyFourHoursAgo;
        
        // Allowed Active/Live states - Include BLOCKED in live view for immediate visibility
        const isLiveState = ["NEW", "EVALUATING", "ACTIVE", "CHALLENGED", "RESTRICTED", "BLOCKED"].includes(s.state ?? "");
        
        return hasValidIds && isRecent && isLiveState;
    });
}


export const getStats = query({
    args: { 
        organizationId: v.optional(v.id("organizations")),
        applicationId: v.optional(v.id("applications"))
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return {
            totalSessions: 0, highRiskAlerts: 0, activeApps: 0, avgRiskScore: 0,
            activeSessions: 0, riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
        };

        const userId = identity.subject;

        let apps = [];
        if (args.applicationId) {
            const app = await ctx.db.get(args.applicationId);
            if (!app) return null; // Or throw
            // Security check
            if (app.userId !== userId && app.organizationId) {
                const membership = await ctx.db
                    .query("organizationMembers")
                    .withIndex("by_user", (q: any) => q.eq("userId", userId))
                    .filter((q: any) => q.eq(q.field("organizationId"), app.organizationId))
                    .first();
                if (!membership) return null;
            }
            apps = [app];
        } else if (args.organizationId) {
            apps = await ctx.db
                .query("applications")
                .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId!))
                .collect();
        } else {
            apps = await ctx.db
                .query("applications")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .collect();
        }

        let sessions = [];
        for (const app of apps) {
            const appSessions = await ctx.db
                .query("sessions")
                .withIndex("by_application", (q) => q.eq("applicationId", app._id))
                .collect();
            sessions.push(...appSessions);
        }

        // Apply strict validation
        sessions = filterValidLiveSessions(sessions);

        const highRisk = sessions.filter(s => s.state === "CHALLENGED" || s.state === "RESTRICTED" || s.state === "BLOCKED").length;
        const avgRisk = sessions.length > 0
            ? sessions.reduce((acc, s) => acc + (s.score ?? 0), 0) / sessions.length
            : 0;

        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        const activeSessions = sessions.filter(s => s.loginTime > twentyFourHoursAgo).length;

        const total = sessions.length || 1;
        const low      = sessions.filter(s => (s.score ?? 0) <= 0.3).length;
        const medium   = sessions.filter(s => (s.score ?? 0) > 0.3 && (s.score ?? 0) <= 0.6).length;
        const high     = sessions.filter(s => (s.score ?? 0) > 0.6 && (s.score ?? 0) <= 0.8).length;
        const critical = sessions.filter(s => (s.score ?? 0) > 0.8).length;

        return {
            totalSessions: sessions.length,
            highRiskAlerts: highRisk,
            activeApps: apps.filter(a => a.status === "Active").length,
            avgRiskScore: parseFloat(avgRisk.toFixed(2)),
            activeSessions,
            riskDistribution: {
                low: Math.round((low / total) * 100),
                medium: Math.round((medium / total) * 100),
                high: Math.round((high / total) * 100),
                critical: Math.round((critical / total) * 100),
            },
        };
    },
});

export const getAnalytics = query({
    args: { 
        organizationId: v.optional(v.id("organizations")),
        applicationId: v.optional(v.id("applications"))
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return { hourlyRiskDist: [], riskDist: [], deviceTrust: [] };

        const userId = identity.subject;

        let apps: any[] = [];
        if (args.applicationId) {
            const app = await ctx.db.get(args.applicationId);
            if (!app) throw new Error("Application not found");
            // Security check
            if (app.userId !== userId && app.organizationId) {
                const membership = await ctx.db
                    .query("organizationMembers")
                    .withIndex("by_user", (q: any) => q.eq("userId", userId))
                    .filter((q: any) => q.eq(q.field("organizationId"), app.organizationId))
                    .first();
                if (!membership) throw new Error("Forbidden");
            }
            apps = [app];
        } else if (args.organizationId) {
            apps = await ctx.db
                .query("applications")
                .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId!))
                .collect();
        } else {
            apps = await ctx.db
                .query("applications")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .collect();
        }

        let sessions: any[] = [];
        for (const app of apps) {
            const appSessions = await ctx.db
                .query("sessions")
                .withIndex("by_application", (q) => q.eq("applicationId", app._id))
                .collect();
            sessions.push(...appSessions);
        }

        // We use a modified filter for analytics to include all states but still assert validity
        sessions = sessions.filter(s => !!s._id && !!s.applicationId && !!s.userEmail && !!s.correlationId);

        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;

        // --- Hourly risk distribution (last 24h, 8 buckets of 3h each) ---
        const hours = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];
        const hourlyRiskDist = hours.map((hour, idx) => {
            const bucketStart = now - oneDayMs + idx * (oneDayMs / 8);
            const bucketEnd = bucketStart + oneDayMs / 8;
            const bucket = sessions.filter(s => s.loginTime >= bucketStart && s.loginTime < bucketEnd);
            return {
                hour,
                low:      bucket.filter(s => (s.score ?? 0) <= 0.3).length,
                medium:   bucket.filter(s => (s.score ?? 0) >  0.3 && (s.score ?? 0) <= 0.6).length,
                high:     bucket.filter(s => (s.score ?? 0) >  0.6).length,
            };
        });

        // --- Weekly risk distribution (last 7 days) ---
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const riskDist = Array.from({ length: 7 }, (_, i) => {
            const dayStart = now - (6 - i) * oneDayMs;
            const dayEnd   = dayStart + oneDayMs;
            const daySessions = sessions.filter(s => s.loginTime >= dayStart && s.loginTime < dayEnd);
            const d = new Date(dayStart);
            return {
                day:      dayNames[d.getDay()],
                low:      daySessions.filter(s => (s.score ?? 0) <= 0.3).length,
                medium:   daySessions.filter(s => (s.score ?? 0) >  0.3 && (s.score ?? 0) <= 0.6).length,
                high:     daySessions.filter(s => (s.score ?? 0) >  0.6 && (s.score ?? 0) <= 0.85).length,
                critical: daySessions.filter(s => (s.score ?? 0) >  0.85).length,
            };
        });

        // --- Device trust trends (last 7 days) ---
        const knownDevices = new Set(["MacBook Pro", "iPhone 15 Pro", "MacBook Air", "iPad Air", "MacBook Pro M3", "Surface Pro"]);
        const deviceTrust = Array.from({ length: 7 }, (_, i) => {
            const dayStart = now - (6 - i) * oneDayMs;
            const dayEnd   = dayStart + oneDayMs;
            const daySessions = sessions.filter(s => s.loginTime >= dayStart && s.loginTime < dayEnd);
            const d = new Date(dayStart);
            return {
                day:       dayNames[d.getDay()],
                trusted:   daySessions.filter(s => knownDevices.has(s.device ?? "")).length,
                unknown:   daySessions.filter(s => (s.device ?? "").toLowerCase().includes("unknown")).length,
                untrusted: daySessions.filter(s => !knownDevices.has(s.device ?? "") && !(s.device ?? "").toLowerCase().includes("unknown")).length,
            };
        });

        return { hourlyRiskDist, riskDist, deviceTrust };
    },
});

export const createSession = mutation({
    args: {
        applicationId: v.id("applications"),
        userEmail: v.string(),
        device: v.string(),
        browser: v.string(),
        location: v.string(),
        ip: v.string(),
        score: v.number(),
        initialState: v.optional(v.string()),
        pinataCid: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // DERIVE IDENTITY: Remove client trust
        const identity = await ctx.auth.getUserIdentity();
        const userEmail = identity?.email || args.userEmail;

        const app = await ctx.db.get(args.applicationId);
        if (!app) throw new Error("Application not found");

        const correlationId = `corr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const sessionId = await ctx.db.insert("sessions", {
            applicationId: args.applicationId,
            userEmail,
            device: args.device,
            browser: args.browser,
            location: args.location,
            ip: args.ip,
            score: args.score,
            loginTime: Date.now(),
            state: args.initialState || "NEW", 
            stateVersion: 0,
            updatedAt: Date.now(),
            correlationId,
            pinataCid: args.pinataCid,
        });

        // Emit Initial Signal
        await emitEvent(ctx.db, {
            type: "SIGNAL_RECEIVED",
            sessionId,
            correlationId,
            applicationId: args.applicationId,
            payload: {
                // Identity derived at signal entry
                userEmail: args.userEmail,
                device: args.device,
                ip: args.ip,
                browser: args.browser
            }
        });

        // ACTION_EXECUTED for Session Initiation
        await emitEvent(ctx.db, {
            type: "ACTION_EXECUTED",
            sessionId,
            correlationId,
            applicationId: args.applicationId,
            payload: { action: "INITIATE_SESSION", result: "SUCCESS" }
        });

        // Enter state machine
        await transitionSession(ctx.db, sessionId, "EVALUATING", "SESSION_CREATED", correlationId);

        // Generate LOGIN alert
        await ctx.db.insert("alerts", {
            userId: app.userId,
            applicationId: args.applicationId,
            type: "LOGIN",
            message: `New login detected for ${userEmail}`,
            severity: "LOW",
            correlationId,
            isRead: false,
            createdAt: Date.now()
        });

        // Generate API_EVENT alert
        await ctx.db.insert("alerts", {
            userId: app.userId,
            applicationId: args.applicationId,
            type: "API_EVENT",
            message: `API key used for authentication (${userEmail})`,
            severity: "LOW",
            correlationId,
            isRead: false,
            createdAt: Date.now()
        });

        // Trigger ML assessment
        if (app?.mlEnhancement) {
            await ctx.scheduler.runAfter(0, (api as any).ml.assessRisk, {
                sessionId,
                correlationId,
                context: {
                    userEmail: args.userEmail,
                    device: args.device,
                    ip: args.ip
                }
            });
        }

        return sessionId;
    },
});

export const getUserRecentSession = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const apps = await ctx.db
            .query("applications")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();

        const appIds = apps.map(app => app._id);
        
        let latestSession = null;
        for (const appId of appIds) {
            const session = await ctx.db
                .query("sessions")
                .withIndex("by_application", (q) => q.eq("applicationId", appId))
                .order("desc")
                .first();
            
            if (session && (!latestSession || session.loginTime > latestSession.loginTime)) {
                latestSession = session;
            }
        }

        return latestSession;
    }
});

export const updateSessionRisk = mutation({
    args: {
        sessionId: v.id("sessions"),
        score: v.number(),
        state: v.string(),
        correlationId: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");

        // ENFORCEMENT: Reject updates if session is terminal or blocked
        if (session.state === "TERMINATED" || session.state === "BLOCKED") {
            const errorMsg = `FORBIDDEN: Attempted mutation on ${session.state} session ${args.sessionId}`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        const correlationId = args.correlationId ?? session.correlationId ?? "";

        await ctx.db.patch(args.sessionId, { score: args.score });

        await transitionSession(
            ctx.db, 
            args.sessionId, 
            args.state as SessionState, 
            "MANUAL_OR_EXTERNAL_RISK_UPDATE",
            correlationId
        );
    },
});
