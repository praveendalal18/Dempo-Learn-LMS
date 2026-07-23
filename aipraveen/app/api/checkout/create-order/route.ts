import { NextResponse, type NextRequest } from "next/server";
import { resolveLineItem } from "@/lib/checkout";
import { isRazorpayConfigured, createRazorpayOrder } from "@/lib/payments";

/**
 * Creates a Razorpay order for a line item. The amount is resolved on the
 * server from the item id — never taken from the client — so it can't be
 * tampered with. Returns the order + public key for the checkout widget.
 */
export async function POST(req: NextRequest) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  let body: { product?: string; renew?: string; competition?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const line = resolveLineItem(body);
  if (!line) return NextResponse.json({ error: "Unknown item" }, { status: 404 });
  if (line.amount <= 0) {
    return NextResponse.json({ error: "Free items don't need payment" }, { status: 400 });
  }

  // Notes are echoed on the payment webhook so the backstop can fulfil the
  // exact same line item + buyer even if the browser callback never fires.
  const notes: Record<string, string> = {};
  if (body.email) notes.email = body.email.trim().toLowerCase();
  if (body.product) notes.product = body.product;
  if (body.renew) notes.renew = body.renew;
  if (body.competition) notes.competition = body.competition;

  try {
    const receipt = `aipd_${line.kind}_${line.refId}_${Date.now()}`.slice(0, 40);
    const order = await createRazorpayOrder(line.amount, receipt, notes);
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      name: "AIPD",
      description: line.title,
    });
  } catch (e) {
    console.error("create-order failed", e);
    return NextResponse.json({ error: "Could not start payment" }, { status: 502 });
  }
}
