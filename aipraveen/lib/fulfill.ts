import { cookies } from "next/headers";
import { getProduct } from "./catalog";
import { resolveLineItem } from "./checkout";
import {
  upsertUserByEmail,
  recordPurchase,
  recordRenewal,
  recordCompetitionOrder,
  createSession,
} from "./data";
import { SESSION_COOKIE, sessionCookieOptions, getCurrentUser } from "./auth";
import type { OrderMeta } from "./store/types";

export interface FulfillInput {
  email: string;
  product?: string;
  renew?: string;
  competition?: string;
}

export interface FulfillOutcome {
  ok: boolean;
  error?: string;
  redirect?: string;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** The success page URL for a given line item. */
export function checkoutSuccessPath(input: FulfillInput): string | null {
  const line = resolveLineItem({
    product: input.product,
    renew: input.renew,
    competition: input.competition,
  });
  if (!line) return null;
  const q = new URLSearchParams();
  if (line.kind === "competition") q.set("competition", line.refId);
  else q.set("product", line.slug!);
  if (line.kind === "renewal") q.set("renewed", "1");
  return `/checkout/success?${q.toString()}`;
}

/**
 * Grant access: create the order + 1-year entitlement (or renewal / competition
 * entry). No cookies or session — safe to call from the Razorpay webhook.
 */
export async function grantAccess(
  input: FulfillInput & { userId?: string; meta?: OrderMeta },
): Promise<FulfillOutcome & { userId?: string }> {
  const email = input.email?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Enter a valid email for your login and receipts." };
  }
  const line = resolveLineItem({
    product: input.product,
    renew: input.renew,
    competition: input.competition,
  });
  if (!line) return { ok: false, error: "That item is no longer available." };

  const userId = input.userId ?? (await upsertUserByEmail(email)).id;

  if (line.kind === "competition") {
    await recordCompetitionOrder(userId, email, line.refId, line.title, line.amount, input.meta);
  } else if (line.kind === "renewal") {
    await recordRenewal(userId, email, getProduct(line.refId)!, input.meta);
  } else {
    await recordPurchase(userId, email, getProduct(line.refId)!, input.meta);
  }

  return { ok: true, redirect: checkoutSuccessPath(input) ?? undefined, userId };
}

/**
 * Interactive fulfilment (mock checkout + verified Razorpay callback): grant
 * access and sign the buyer in on this device.
 */
export async function fulfillOrder(
  input: FulfillInput & { meta?: OrderMeta },
): Promise<FulfillOutcome> {
  const current = await getCurrentUser();
  const res = await grantAccess({ ...input, userId: current?.id });
  if (!res.ok) return { ok: false, error: res.error };
  if (!current && res.userId) {
    const token = await createSession(res.userId);
    const store = await cookies();
    store.set(SESSION_COOKIE, token, sessionCookieOptions);
  }
  return { ok: true, redirect: res.redirect };
}

/** Sign a returning buyer in (used when the webhook already granted access). */
export async function signInByEmail(email: string): Promise<void> {
  if (await getCurrentUser()) return;
  const clean = email.trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) return;
  const user = await upsertUserByEmail(clean);
  const token = await createSession(user.id);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);
}
