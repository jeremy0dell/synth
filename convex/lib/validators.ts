import { v } from "convex/values";

export const exampleItemTitle = v.string();

export function normalizeExampleItemTitle(title: string) {
  const trimmed = title.trim();

  if (trimmed.length === 0) {
    throw new Error("Title is required.");
  }

  if (trimmed.length > 120) {
    throw new Error("Title must be 120 characters or less.");
  }

  return trimmed;
}
