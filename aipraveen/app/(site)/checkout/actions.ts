"use server";

import { fulfillOrder, type FulfillInput, type FulfillOutcome } from "@/lib/fulfill";

export type CheckoutInput = FulfillInput & { coupon?: string };
export type CheckoutOutcome = FulfillOutcome;

/**
 * Dev/mock checkout + free products: no real charge. Fulfils immediately.
 * Paid checkout with Razorpay keys configured goes through the widget +
 * /api/checkout/verify instead (see components/checkout-client.tsx).
 */
export async function completeCheckout(
  input: CheckoutInput,
): Promise<CheckoutOutcome> {
  return fulfillOrder({
    email: input.email,
    product: input.product,
    renew: input.renew,
    competition: input.competition,
  });
}
