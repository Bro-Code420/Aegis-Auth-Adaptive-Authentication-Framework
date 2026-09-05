import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Access Control Helper: Ensures user owns the application.
 */
async function validateOwnership(ctx: any, applicationId: any) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const app = await ctx.db.get(applicationId);
    if (!app || app.userId !== identity.subject) {
        throw new Error("Forbidden: Access denied");
    }
    return { identity, app };
}

export const list = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        return await ctx.db
            .query("applications")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();
    },
});

export const getApp = query({
  args: { id: v.id("applications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const app = await ctx.db.get(args.id);
    if (!app) return null;

    // Security Check
    const userId = identity.subject;
    if (app.userId !== userId && app.organizationId) {
        const membership = await ctx.db
            .query("organizationMembers")
            .withIndex("by_user", (q: any) => q.eq("userId", userId))
            .filter((q: any) => q.eq(q.field("organizationId"), app.organizationId))
            .first();
        if (!membership) return null;
    }

    return app;
  },
});

export const getApplicationsByOrg = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // ENFORCEMENT: Verify org membership
    const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user", (q: any) => q.eq("userId", identity.subject))
        .filter((q: any) => q.eq(q.field("organizationId"), args.organizationId))
        .first();
    if (!membership) return [];

    return await ctx.db
      .query("applications")
      .withIndex("by_org", q =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  }
});

export const create = mutation({
    args: {
        name: v.string(),
        environment: v.string(),
        riskPolicyId: v.id("riskPolicies"),
        type: v.string(),
        redirectUri: v.optional(v.string()),
        mlEnhancement: v.boolean(),
        organizationId: v.id("organizations"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        if (!args.name || args.name.trim() === "") {
            throw new Error("Application name is required.");
        }

        console.log("Creating app:", args.name);

        // Identity derived at signal entry
        const appId = `app_${Math.random().toString(36).substring(2, 8)}`;
        const apiKey = `ak_live_${Math.random().toString(36).substring(2, 10)}`;
        const secret = `sk_live_${Math.random().toString(36).substring(2, 10)}`;

        const id = await ctx.db.insert("applications", {
            ...args,
            name: args.name.trim(),
            status: "Active",
            appId,
            apiKey,
            secret,
            userId: identity.subject,
            appUrl: "http://localhost:3000",
            allowedOrigins: ["http://localhost:3000"]
        });

        // Part 9 - Create default security settings
        await ctx.db.insert("securitySettings", {
            applicationId: id,
            enforceMfa: false,
            riskBasedAuth: true,
            autoBlockHighRisk: true,
            sessionRecording: false,
            ipAllowlistEnabled: false,
            updatedAt: Date.now()
        });

        // Generate API_EVENT alert
        await ctx.db.insert("alerts", {
            userId: identity.subject,
            applicationId: id,
            type: "API_EVENT",
            message: `New application "${args.name}" registered and API key issued.`,
            severity: "LOW",
            isRead: false,
            createdAt: Date.now()
        });

        return await ctx.db.get(id);
    },
});

export const update = mutation({
    args: {
        id: v.id("applications"),
        name: v.string(),
        environment: v.string(),
        riskPolicyId: v.id("riskPolicies"),
    },
    handler: async (ctx, args) => {
        await validateOwnership(ctx, args.id);
        const { id, ...data } = args;
        await ctx.db.patch(id, data);
    },
});

export const toggleStatus = mutation({
    args: { id: v.id("applications") },
    handler: async (ctx, args) => {
        await validateOwnership(ctx, args.id);
        const app = await ctx.db.get(args.id);
        if (!app) throw new Error("Application not found");
        const newStatus = app.status === "Active" ? "Inactive" : "Active";
        await ctx.db.patch(args.id, {
            status: newStatus,
        });

        // Generate API_EVENT alert
        await ctx.db.insert("alerts", {
            userId: app.userId,
            applicationId: args.id,
            type: "API_EVENT",
            message: `Application "${app.name}" status changed to ${newStatus}.`,
            severity: "MEDIUM",
            isRead: false,
            createdAt: Date.now()
        });
    },
});

export const remove = mutation({
    args: { id: v.id("applications") },
    handler: async (ctx, args) => {
        await validateOwnership(ctx, args.id);

        // Delete associated sessions
        const sessions = await ctx.db
            .query("sessions")
            .withIndex("by_application", (q) => q.eq("applicationId", args.id))
            .collect();
        for (const s of sessions) {
            await ctx.db.delete(s._id);
        }

        // Delete associated securitySettings
        const settings = await ctx.db
            .query("securitySettings")
            .withIndex("by_application", (q) => q.eq("applicationId", args.id))
            .collect();
        for (const set of settings) {
            await ctx.db.delete(set._id);
        }

        // Delete associated activities
        const activities = await ctx.db
            .query("activities")
            .withIndex("by_application", (q) => q.eq("applicationId", args.id))
            .collect();
        for (const act of activities) {
            await ctx.db.delete(act._id);
        }

        // Delete associated alerts
        const alerts = await ctx.db
            .query("alerts")
            .filter((q) => q.eq(q.field("applicationId"), args.id))
            .collect();
        for (const alert of alerts) {
            await ctx.db.delete(alert._id);
        }

        // Delete the application itself
        await ctx.db.delete(args.id);
    },
});

export const getByApiKey = query({
    args: { apiKey: v.string(), appId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        // Master Key Bypass (for demo/development)
        if (args.apiKey === "aegis_master_key_2024") {
            if (args.appId) {
                const app = await ctx.db
                    .query("applications")
                    .filter(q => q.eq(q.field("appId"), args.appId))
                    .first();
                if (app) return app;
            }
            return await ctx.db
                .query("applications")
                .first();
        }

        if (args.appId) {
            const appByAppId = await ctx.db
                .query("applications")
                .filter(q => q.eq(q.field("appId"), args.appId))
                .first();
            if (appByAppId) return appByAppId;
        }

        return await ctx.db
            .query("applications")
            .withIndex("by_api_key", (q) => q.eq("apiKey", args.apiKey))
            .first();
    }
});
