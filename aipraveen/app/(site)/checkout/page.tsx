import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { resolveLineItem } from "@/lib/checkout";
import { getCurrentUser } from "@/lib/auth";
import { isRazorpayConfigured } from "@/lib/payments";
import { CheckoutClient } from "@/components/checkout-client";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; renew?: string; competition?: string }>;
}) {
  const params = await searchParams;
  const line = resolveLineItem(params);
  const user = await getCurrentUser();

  if (!line) {
    return (
      <Container max="checkout" style={{ padding: "96px 28px" }}>
        <h1 className="display" style={{ fontWeight: 650, fontSize: 26, marginBottom: 10 }}>
          Nothing to check out.
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Head to the <Link href={routes.store}>store</Link> to pick a course or kit.
        </p>
      </Container>
    );
  }

  return (
    <CheckoutClient
      line={line}
      prefillEmail={user?.email ?? ""}
      query={params}
      razorpayConfigured={isRazorpayConfigured()}
    />
  );
}
