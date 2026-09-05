import { v } from "convex/values";
import { query } from "./_generated/server";

export const list = query({
    args: { 
        applicationId: v.optional(v.id("applications")),
        organizationId: v.optional(v.id("organizations"))
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const userId = identity.subject;

        // Fetch apps matching organization or fallback to user
        let apps;
        if (args.organizationId) {
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
            // Verify ownership explicitly if requesting a specific app
            if (!appIds.has(args.applicationId.toString())) {
                throw new Error("Unauthorized access to this application");
            }

            return await ctx.db
                .query("activities")
                .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId!))
                .order("desc")
                .take(50);
        }

        // Fetch all activities for owned apps (simplified gather)
        let activities = [];
        for (const app of apps) {
            const appActivities = await ctx.db
                .query("activities")
                .withIndex("by_application", (q) => q.eq("applicationId", app._id))
                .order("desc")
                .take(50); // limit per app to avoid unbounded fetch initially
            activities.push(...appActivities);
        }

        // Return combined activities sorted locally by stamp
        return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
    },
});
