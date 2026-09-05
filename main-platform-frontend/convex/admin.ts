import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { GenericQueryCtx } from "convex/server";

/**
 * Access Control Helper: Ensured only ADMINs can access global operations.
 */
async function isAdmin(ctx: GenericQueryCtx<any>) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    
    // In production, roles would be stored in a 'users' table or custom claims.
    // For this build, we use a curated list of admin emails from environment.
    const admins = (process.env.ADMIN_EMAILS || "omkar@aegis.auth,admin@aegis.auth").split(",");
    return admins.includes(identity.email ?? "");
}

export const getGlobalStats = query({
    args: {},
    handler: async (ctx) => {
        if (!await isAdmin(ctx)) throw new Error("Forbidden: Admin access required");
        
        const applications = await ctx.db.query("applications").collect();
        const sessions = await ctx.db.query("sessions").collect();
        const events = await ctx.db.query("events").collect();

        const developerIds = new Set(applications.map(app => app.userId));
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        
        const requestsToday = events.filter(e => e.type === "SIGNAL_RECEIVED" && e.timestamp > twentyFourHoursAgo).length;
        const threatsDetected = sessions.filter(s => (s.score ?? 0) > 0.7).length;

        return {
            totalDevelopers: developerIds.size,
            totalProjects: applications.length,
            apiRequestsToday: requestsToday,
            threatsDetected: threatsDetected,
        };
    },
});

export const getUsers = query({
    args: {},
    handler: async (ctx) => {
        if (!await isAdmin(ctx)) throw new Error("Forbidden: Admin access required");
        
        const applications = await ctx.db.query("applications").collect();
        const userMap = new Map();
        
        applications.forEach(app => {
            const userId = app.userId;
            if (!userMap.has(userId)) {
                userMap.set(userId, {
                    email: `user_${userId.substring(0, 5)}@clerk.user`,
                    plan: "Pro",
                    projectsCount: 0,
                    status: "Active",
                });
            }
            const userData = userMap.get(userId);
            userData.projectsCount += 1;
        });

        return Array.from(userMap.values());
    },
});

export const getProjects = query({
    args: {},
    handler: async (ctx) => {
        if (!await isAdmin(ctx)) throw new Error("Forbidden: Admin access required");
        const apps = await ctx.db.query("applications").collect();
        const sessions = await ctx.db.query("sessions").collect();

        return apps.map(app => {
            const appSessions = sessions.filter(s => s.applicationId === app._id);
            const threats = appSessions.filter(s => (s.score ?? 0) > 0.7).length;
            
            return {
                id: app._id,
                name: app.name,
                owner: app.userId,
                requests: appSessions.length.toString(),
                threats: threats,
                status: app.status,
            };
        });
    },
});

export const getThreatLogs = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        if (!await isAdmin(ctx)) throw new Error("Forbidden: Admin access required");

        const logs = await ctx.db
            .query("events")
            .filter(q => q.or(
                q.eq(q.field("type"), "STATE_TRANSITIONED"),
                q.eq(q.field("type"), "DECISION_MADE"),
                q.eq(q.field("type"), "SIGNAL_RECEIVED")
            ))
            .order("desc")
            .take(args.limit ?? 50);

        const apps = await ctx.db.query("applications").collect();
        const appMap = new Map(apps.map(a => [a._id, a.name]));
        const sessions = await ctx.db.query("sessions").collect();
        const sessionMap = new Map(sessions.map(s => [s._id, s]));

        return logs.map(log => {
            const session = sessionMap.get(log.sessionId);
            return {
                id: log._id,
                timestamp: new Date(log.timestamp).toLocaleTimeString(),
                project: appMap.get(log.applicationId) ?? "Unknown",
                score: session?.score ?? 0,
                type: log.type,
                status: session?.state ?? "UNKNOWN",
                correlationId: log.correlationId
            };
        });
    },
});

export const getModelSettings = query({
    args: {},
    handler: async (ctx) => {
        if (!await isAdmin(ctx)) throw new Error("Forbidden: Admin access required");
        const settings = await ctx.db
            .query("systemSettings")
            .filter(q => q.or(
                q.eq(q.field("key"), "model_weights"),
                q.eq(q.field("key"), "risk_thresholds")
            ))
            .collect();
        
        return settings.find(s => s.key === "model_weights")?.value ?? [
            { id: "1", name: "Login Anomaly Model", version: "v2.4.1", status: "Active", weight: 85 },
            { id: "2", name: "Session Hijack Detector", version: "v1.8.2", status: "Active", weight: 92 },
            { id: "3", name: "Device Trust Engine", version: "v3.1.0", status: "Warning", weight: 64 },
            { id: "4", name: "Global Threat Intelligence", version: "v5.0.4", status: "Active", weight: 45 },
        ];
    },
});

export const updateModelWeight = mutation({
    args: { id: v.string(), weight: v.number() },
    handler: async (ctx, args) => {
        if (!await isAdmin(ctx)) throw new Error("Forbidden: Admin access required");
        
        const settings = await ctx.db
            .query("systemSettings")
            .withIndex("by_key", q => q.eq("key", "model_weights"))
            .first();

        let weights = settings?.value ?? [];
        if (!settings) {
            weights = [
                { id: "1", name: "Login Anomaly Model", version: "v2.4.1", status: "Active", weight: 85 },
                { id: "2", name: "Session Hijack Detector", version: "v1.8.2", status: "Active", weight: 92 },
                { id: "3", name: "Device Trust Engine", version: "v3.1.0", status: "Warning", weight: 64 },
                { id: "4", name: "Global Threat Intelligence", version: "v5.0.4", status: "Active", weight: 45 },
            ];
            const weightIdx = weights.findIndex((w: any) => w.id === args.id);
            if (weightIdx !== -1) weights[weightIdx].weight = args.weight;
            
            await ctx.db.insert("systemSettings", {
                key: "model_weights",
                value: weights,
            });
        } else {
            const weightIdx = weights.findIndex((w: any) => w.id === args.id);
            if (weightIdx !== -1) {
                weights[weightIdx].weight = args.weight;
                await ctx.db.patch(settings._id, { value: weights });
            }
        }
    },
});
