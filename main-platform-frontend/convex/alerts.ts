import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

export const getAlerts = query({
    args: {
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const limit = args.limit ?? 50;

        const alerts = await ctx.db
            .query("alerts")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .order("desc")
            .take(limit);

        // Fetch application names for context
        const alertsWithApps = await Promise.all(
            alerts.map(async (alert) => {
                let appName = "System";
                if (alert.applicationId) {
                    const app = await ctx.db.get(alert.applicationId);
                    if (app) appName = app.name;
                }
                return { ...alert, appName };
            })
        );

        return alertsWithApps;
    }
});

export const markAsRead = mutation({
    args: { alertId: v.id("alerts") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const alert = await ctx.db.get(args.alertId);
        if (!alert) return;

        if (alert.userId !== identity.subject) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(args.alertId, { isRead: true });
    }
});

export const markAllAsRead = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const unreadAlerts = await ctx.db
            .query("alerts")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .filter((q) => q.eq(q.field("isRead"), false))
            .collect();

        await Promise.all(
            unreadAlerts.map(alert => ctx.db.patch(alert._id, { isRead: true }))
        );
    }
});

export const createInternalAlert = internalMutation({
    args: {
        userId: v.string(),
        applicationId: v.optional(v.id("applications")),
        type: v.union(v.literal("HIGH_RISK"), v.literal("LOGIN"), v.literal("BLOCKED"), v.literal("API_EVENT")),
        message: v.string(),
        severity: v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH"), v.literal("CRITICAL")),
        correlationId: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        // Internal mutation, no auth check needed as it's triggered by server logic
        await ctx.db.insert("alerts", {
            userId: args.userId,
            applicationId: args.applicationId,
            type: args.type,
            message: args.message,
            severity: args.severity,
            correlationId: args.correlationId,
            isRead: false,
            createdAt: Date.now()
        });
    }
});
