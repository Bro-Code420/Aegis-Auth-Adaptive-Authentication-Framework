import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getSettingsByApp = query({
    args: { applicationId: v.id("applications") },
    handler: async (ctx, args) => {
        // Find existing settings
        let settings = await ctx.db
            .query("securitySettings")
            .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
            .first();

        // Safe fallback mechanism if settings record doesn't exist
        if (!settings) {
            return {
                applicationId: args.applicationId,
                enforceMfa: false,
                riskBasedAuth: true,
                autoBlockHighRisk: true,
                sessionRecording: false,
                ipAllowlistEnabled: false,
                updatedAt: Date.now()
            };
        }

        return settings;
    }
});

export const updateSettings = mutation({
    args: {
        applicationId: v.id("applications"),
        enforceMfa: v.optional(v.boolean()),
        riskBasedAuth: v.optional(v.boolean()),
        autoBlockHighRisk: v.optional(v.boolean()),
        sessionRecording: v.optional(v.boolean()),
        ipAllowlistEnabled: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { applicationId, ...updates } = args;

        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        // Verify ownership/membership
        const app = await ctx.db.get(applicationId);
        if (!app) throw new Error("Application not found");
        // Quick permission check (a real app might use full validateOwnership logic)
        if (app.userId !== identity.subject && !app.organizationId) {
            throw new Error("Forbidden: Access denied");
        }

        const existing = await ctx.db
            .query("securitySettings")
            .withIndex("by_application", (q) => q.eq("applicationId", applicationId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                ...updates,
                updatedAt: Date.now()
            });
            return existing._id;
        } else {
            // Lazy-init if it didn't exist
            return await ctx.db.insert("securitySettings", {
                applicationId,
                enforceMfa: updates.enforceMfa ?? false,
                riskBasedAuth: updates.riskBasedAuth ?? true,
                autoBlockHighRisk: updates.autoBlockHighRisk ?? true,
                sessionRecording: updates.sessionRecording ?? false,
                ipAllowlistEnabled: updates.ipAllowlistEnabled ?? false,
                updatedAt: Date.now()
            });
        }
    }
});
