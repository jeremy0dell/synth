import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type AuthCtx = QueryCtx | MutationCtx;

function configuredAllowedEmails() {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function assertAllowedEmailIfConfigured(email?: string) {
  const allowedEmails = configuredAllowedEmails();
  if (allowedEmails.length === 0) {
    return;
  }

  if (!email || !allowedEmails.includes(email.toLowerCase())) {
    throw new Error("Unauthorized");
  }
}

export async function requireUser(ctx: AuthCtx): Promise<{
  userId: Id<"users">;
  user: Doc<"users">;
}> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Unauthenticated");
  }

  const user = await ctx.db.get(userId);
  if (user === null) {
    throw new Error("Authenticated user record was not found.");
  }

  assertAllowedEmailIfConfigured(user.email);
  return { userId, user };
}
