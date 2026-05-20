import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { assertAllowedEmailIfConfigured, requireUser } from "./lib/auth";

export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthenticated");
    }

    const user = await ctx.db.get(userId);
    if (user === null) {
      throw new Error("Authenticated user record was not found.");
    }

    const identity = await ctx.auth.getUserIdentity();
    const email = identity?.email ?? user.email;
    assertAllowedEmailIfConfigured(email);

    const now = Date.now();
    const patch: Partial<Doc<"users">> = {
      createdAt: user.createdAt ?? now,
      updatedAt: now,
    };

    const authSubject = identity?.subject ?? identity?.tokenIdentifier;
    if (authSubject) patch.authSubject = authSubject;
    if (email) patch.email = email;
    if (identity?.name) patch.name = identity.name;
    if (identity?.pictureUrl) patch.image = identity.pictureUrl;

    await ctx.db.patch(userId, patch);
    return await ctx.db.get(userId);
  },
});

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireUser(ctx);
    return {
      userId,
      email: user.email,
      name: user.name,
      image: user.image,
    };
  },
});
