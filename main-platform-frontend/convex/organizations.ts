import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getUserOrganizations = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    // The UI may render before Clerk auth is ready (or when the user is signed out).
    // Returning an empty list prevents the whole app from crashing with an Unauthorised error.
    if (!identity) return [];

    const userId = identity.subject;

    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect();

    const orgIds = memberships.map(m => m.organizationId);

    const organizations = [];

    for (const id of orgIds) {
      const org = await ctx.db.get(id);
      if (org) organizations.push(org);
    }

    return organizations;
  }
});

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const userId = identity.subject;

    const organizationId = await ctx.db.insert("organizations", {
      name: args.name,
      ownerId: userId,
      createdAt: Date.now(),
    });

    await ctx.db.insert("organizationMembers", {
      organizationId,
      userId: userId,
      role: "owner",
    });

    return organizationId;
  }
});
