import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { exampleItemTitle, normalizeExampleItemTitle } from "./lib/validators";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);

    return await ctx.db
      .query("exampleItems")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const create = mutation({
  args: {
    title: exampleItemTitle,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const title = normalizeExampleItemTitle(args.title);
    const now = Date.now();

    return await ctx.db.insert("exampleItems", {
      userId,
      title,
      completed: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const toggle = mutation({
  args: {
    itemId: v.id("exampleItems"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const item = await ctx.db.get(args.itemId);

    if (item === null || item.userId !== userId) {
      throw new Error("Item not found.");
    }

    await ctx.db.patch(args.itemId, {
      completed: !item.completed,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    itemId: v.id("exampleItems"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const item = await ctx.db.get(args.itemId);

    if (item === null || item.userId !== userId) {
      throw new Error("Item not found.");
    }

    await ctx.db.delete(args.itemId);
  },
});
