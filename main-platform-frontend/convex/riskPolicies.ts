import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }
        return await ctx.db
            .query("riskPolicies")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();
    },
});

export const create = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        thresholds: v.object({
            low: v.string(),
            medium: v.string(),
            high: v.string(),
            critical: v.string(),
        }),
        mlEnabled: v.boolean(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }
        return await ctx.db.insert("riskPolicies", {
            ...args,
            userId: identity.subject,
        });
    },
});

export const seed = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return { success: false, reason: "Not authenticated" };
        }

        const existing = await ctx.db
            .query("riskPolicies")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .first();

        if (existing) return;

        const initialPolicies = [
            {
                name: "Standard Risk Model",
                description: "Default risk assessment model for general web applications.",
                thresholds: { low: "0-30", medium: "31-60", high: "61-85", critical: "86-100" },
                mlEnabled: true,
            },
            {
                name: "High Security Model (Finance)",
                description: "Strict risk model optimized for financial applications.",
                thresholds: { low: "0-20", medium: "21-45", high: "46-70", critical: "71-100" },
                mlEnabled: true,
            },
        ];

        for (const policy of initialPolicies) {
            await ctx.db.insert("riskPolicies", {
                ...policy,
                userId: identity.subject,
            });
        }
    },
});

export const update = mutation({
    args: {
        id: v.id("riskPolicies"),
        name: v.string(),
        description: v.string(),
        thresholds: v.object({
            low: v.string(),
            medium: v.string(),
            high: v.string(),
            critical: v.string(),
        }),
        mlEnabled: v.boolean(),
    },
    handler: async (ctx, args) => {
        const { id, ...data } = args;
        await ctx.db.patch(id, data);
    },
});

export const remove = mutation({
    args: { id: v.id("riskPolicies") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
