import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments";
import { claimPayment, revokeByPayment } from "@/lib/data";
import { grantAccess } from "@/lib/fulfill";

interface PaymentEntity {
  id: string;
  order_id?: string;
  notes?: Record<string, string>;
}
interface RefundEntity {
  payment_id?: string;
}
interface WebhookEvent {
  event: string;
  payload?: {
    payment?: { entity?: PaymentEntity };
    refund?: { entity?: RefundEntity };
  };
}

/**
 * Razorpay webhook. Verifies the signature, then reconciles:
 *  - payment.captured  → grant access (idempotent; backstop if the browser
 *    callback never fired), using the email + line item from the order notes.
 *  - refund.processed   → mark the order refunded and revoke the entitlement.
 * Active only when RAZORPAY_WEBHOOK_SECRET is set.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const body = await req.text();

  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  try {
    switch (event.event) {
      case "payment.captured": {
        const p = event.payload?.payment?.entity;
        const notes = p?.notes ?? {};
        // Only the first caller (this webhook or the browser callback) grants.
        if (p?.id && notes.email && (await claimPayment(p.id))) {
          await grantAccess({
            email: notes.email,
            product: notes.product,
            renew: notes.renew,
            competition: notes.competition,
            meta: { razorpayOrderId: p.order_id, razorpayPaymentId: p.id },
          });
        }
        break;
      }
      case "refund.processed":
      case "refund.created": {
        const paymentId =
          event.payload?.refund?.entity?.payment_id ?? event.payload?.payment?.entity?.id;
        if (paymentId) await revokeByPayment(paymentId);
        break;
      }
      // payment.failed: nothing was granted, so nothing to reconcile.
      default:
        break;
    }
  } catch (e) {
    console.error("razorpay webhook handling failed", e);
    // 200 anyway so Razorpay doesn't hammer retries on a transient error we've logged.
  }

  return NextResponse.json({ ok: true });
}
