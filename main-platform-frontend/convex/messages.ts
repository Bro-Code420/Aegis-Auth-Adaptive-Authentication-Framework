import { query } from "./_generated/server";

export const getForCurrentUser = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        const email = identity?.email;
        if (!email) {
            throw new Error("Not authenticated or missing email");
        }
        return await ctx.db
            .query("messages")
            .withIndex("by_author", (q) => q.eq("author", email))
            .collect();
    },
});