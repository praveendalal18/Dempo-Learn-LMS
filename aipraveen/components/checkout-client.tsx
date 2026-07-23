"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui";
import { fieldStyle, primaryButtonStyle } from "@/components/form";
import { formatINR } from "@/lib/format";
import { routes } from "@/lib/routes";
import { ConsentCheckbox } from "@/components/consent-checkbox";
import type { LineItem } from "@/lib/checkout";
import { completeCheckout } from "@/app/(site)/checkout/actions";

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (e: unknown) => void) => void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

/** Load the Razorpay checkout SDK once. */
function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const existing = document.getElementById("razorpay-sdk") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("sdk")));
      return;
    }
    const s = document.createElement("script");
    s.id = "razorpay-sdk";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("sdk"));
    document.body.appendChild(s);
  });
}

export function CheckoutClient({
  line,
  prefillEmail,
  query,
  razorpayConfigured,
}: {
  line: LineItem;
  prefillEmail: string;
  query: { product?: string; renew?: string; competition?: string };
  razorpayConfigured: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(prefillEmail);
  const [coupon, setCoupon] = useState("");
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const failedUrl = `/checkout/failed?${new URLSearchParams(
    Object.entries(query).filter(([, v]) => v) as [string, string][],
  ).toString()}`;

  /** Free items and dev/no-keys mode: fulfil directly, no charge. */
  async function payMock() {
    const res = await completeCheckout({ email, coupon, ...query });
    if (res.ok && res.redirect) router.push(res.redirect);
    else {
      setError(res.error ?? "Payment could not be completed.");
      setBusy(false);
    }
  }

  /** Real Razorpay: create order -> widget -> verify signature -> fulfil. */
  async function payRazorpay() {
    const orderRes = await fetch("/api/checkout/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...query, email }),
    });
    if (!orderRes.ok) {
      const d = await orderRes.json().catch(() => ({}));
      setError(d.error ?? "Could not start payment.");
      setBusy(false);
      return;
    }
    const order = await orderRes.json();

    try {
      await loadRazorpay();
    } catch {
      setError("Couldn't load the payment window. Check your connection and retry.");
      setBusy(false);
      return;
    }

    const rzp = new window.Razorpay!({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      prefill: { email },
      theme: { color: "#12233F" },
      handler: async (resp: RazorpayResponse) => {
        const vr = await fetch("/api/checkout/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...resp, email, ...query }),
        });
        const data = await vr.json().catch(() => ({}));
        if (vr.ok && data.redirect) router.push(data.redirect);
        else router.push(failedUrl);
      },
      modal: { ondismiss: () => setBusy(false) },
    });
    rzp.on("payment.failed", () => router.push(failedUrl));
    rzp.open();
  }

  async function pay() {
    setBusy(true);
    setError(null);
    if (line.isFree || !razorpayConfigured) {
      await payMock();
    } else {
      await payRazorpay();
    }
  }

  const payLabel = line.isFree
    ? "Get free access"
    : `Pay ${formatINR(line.amount)}`;

  return (
    <Container max="checkout" style={{ padding: "64px 28px 96px" }}>
      <h1 className="display" style={{ fontWeight: 650, fontSize: 30, letterSpacing: "-0.02em", margin: "0 0 24px" }}>
        Checkout
      </h1>

      {/* Order summary */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-card)",
          padding: 22,
          display: "flex",
          gap: 16,
          alignItems: "center",
          marginBottom: 22,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "var(--r-card)",
            background: line.thumbBg,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{line.title}</div>
          <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--text-secondary)", marginTop: 4 }}>
            {line.accessLine}
          </div>
        </div>
        <div className="display" style={{ fontWeight: 650, fontSize: 20, color: "var(--accent)" }}>
          {line.isFree ? "Free" : formatINR(line.amount)}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void pay();
        }}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Email</span>
          <input
            type="email"
            required
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={fieldStyle}
          />
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Your login and receipts go here.
          </span>
        </label>

        {!line.isFree && (
          <input
            placeholder="Coupon code (optional)"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            style={fieldStyle}
          />
        )}

        <ConsentCheckbox checked={agreed} onChange={setAgreed} includeRefund={!line.isFree} />

        {error && <div style={{ color: "var(--error)", fontSize: 13 }}>{error}</div>}

        <button
          type="submit"
          disabled={busy || !agreed}
          style={{ ...primaryButtonStyle, opacity: busy || !agreed ? 0.5 : 1, cursor: busy || !agreed ? "not-allowed" : "pointer" }}
        >
          {busy ? "Processing…" : payLabel}
        </button>
      </form>

      <p style={{ color: "var(--text-secondary)", fontSize: 12, margin: "16px 0 0" }}>
        {line.isFree
          ? "No card needed — we email you a magic link to sign in."
          : razorpayConfigured
            ? "Secured by Razorpay — UPI, cards, netbanking."
            : "Test mode — no real charge (Razorpay keys not configured)."}
      </p>
      {line.isFree ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 12, margin: "6px 0 0" }}>
          By continuing you agree to our <Link href={routes.terms}>Terms</Link> and{" "}
          <Link href={routes.privacy}>Privacy Policy</Link>.
        </p>
      ) : (
        <p style={{ color: "var(--text-secondary)", fontSize: 12, margin: "6px 0 0" }}>
          <strong>All sales are final — no refunds once purchased.</strong> By paying you agree to our{" "}
          <Link href={routes.terms}>Terms</Link> and{" "}
          <Link href={routes.refund}>Refund Policy</Link>.
        </p>
      )}
    </Container>
  );
}
