import { CURRICULUM } from "../course";
import type { AppUser, EntitlementStatus } from "./types";

export const MAGIC_TTL_MS = 15 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** A readable display name: the set name, else a title-cased email local part. */
export function displayName(user: { name: string | null; email: string }): string {
  if (user.name) return user.name;
  const local = user.email.split("@")[0].replace(/[._-]+/g, " ").trim();
  return local.replace(/\b\w/g, (c) => c.toUpperCase()) || "Learner";
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "learner"
  );
}

/** Flat lesson keys ("0".."n") for a course, in curriculum order. */
export function lessonKeysFor(_productId: string): string[] {
  const total = CURRICULUM.reduce((n, m) => n + m.lessons.length, 0);
  return Array.from({ length: total }, (_, i) => String(i));
}

export function computeStatus(expiresAt: Date): EntitlementStatus {
  const days = (expiresAt.getTime() - Date.now()) / DAY_MS;
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "active";
}

/** Author-info sort: unreviewed projects first, then newest. */
export function adminProjectSort(
  a: { reviewedAt: Date | null; createdAt: Date },
  b: { reviewedAt: Date | null; createdAt: Date },
): number {
  const ar = a.reviewedAt ? 1 : 0;
  const br = b.reviewedAt ? 1 : 0;
  if (ar !== br) return ar - br;
  return b.createdAt.getTime() - a.createdAt.getTime();
}
