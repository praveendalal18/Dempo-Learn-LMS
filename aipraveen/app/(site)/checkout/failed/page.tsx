import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Payment failed" };

export default async function FailedPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; competition?: string }>;
}) {
  const { product, competition } = await searchParams;
  const retry = competition
    ? `${routes.checkout}?competition=${competition}`
    : product
      ? `${routes.checkout}?product=${product}`
      : routes.store;

  return (
    <Container max="success" style={{ padding: "96px 28px 120px", textAlign: "center" }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--error-bg)",
          border: "1px solid var(--error-border)",
          color: "var(--error)",
          fontSize: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        ✕
      </div>
      <h1 className="display" style={{ fontWeight: 650, fontSize: 28, margin: "0 0 10px" }}>
        That payment didn&apos;t go through.
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 15, margin: "0 0 8px" }}>
        <strong>You have not been charged.</strong> If any amount was debited, it is automatically reversed within 5–7
        working days.
      </p>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 28px" }}>
        Nothing else is needed from you. You can try again whenever you like.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link
          href={retry}
          className="plain"
          style={{ background: "var(--ink)", color: "#fff", borderRadius: "var(--r-card)", padding: "13px 24px", fontSize: 15, fontWeight: 600 }}
        >
          Try again
        </Link>
        <a
          href="mailto:support@aipraveen.com"
          className="plain"
          style={{ border: "1px solid var(--ink)", color: "var(--ink)", borderRadius: "var(--r-card)", padding: "12px 22px", fontSize: 15, fontWeight: 600 }}
        >
          Email support
        </a>
      </div>
    </Container>
  );
}
