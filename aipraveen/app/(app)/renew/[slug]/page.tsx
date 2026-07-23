import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { getProduct, renewLabelFor } from "@/lib/catalog";
import { requireUser } from "@/lib/auth";
import { getEntitlement } from "@/lib/data";
import { formatINR, formatDate } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Renew" };

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export default async function RenewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const user = await requireUser(routes.renew(slug));
  const ent = await getEntitlement(user.id, product.id);
  if (!ent) redirect(routes.product(slug));

  const now = Date.now();
  const base = Math.max(ent.expiresAt.getTime(), now);
  const newEnd = new Date(base + YEAR_MS);

  return (
    <Container max="checkout" style={{ padding: "64px 28px 96px" }}>
      <h1 className="display" style={{ fontWeight: 650, fontSize: 30, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
        Renew your access
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 24px" }}>
        Your progress and notes are preserved — renewing picks up exactly where you left off.
      </p>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: 24 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: "var(--r-card)", background: product.thumbBg, flexShrink: 0 }} />
          <div style={{ fontWeight: 600, fontSize: 15 }}>{product.title}</div>
        </div>

        <Row label="Current access ends" value={formatDate(ent.expiresAt)} />
        <Row label="New access ends" value={formatDate(newEnd)} highlight />
        <div style={{ borderTop: "1px solid var(--border)", margin: "14px 0", paddingTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Renewal price</span>
            <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
              {product.price > 0 && (
                <span style={{ textDecoration: "line-through", color: "var(--faint)", fontSize: 14 }}>
                  {formatINR(product.price)}
                </span>
              )}
              <span className="display" style={{ fontWeight: 650, fontSize: 22, color: "var(--accent)" }}>
                {product.price === 0 ? "Free" : renewLabelFor(product)}
              </span>
            </div>
          </div>
          <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--text-secondary)", marginTop: 4 }}>
            {product.price === 0 ? "FREE RENEWAL" : `${product.renewPercent}% OF FULL PRICE · ONE YEAR`}
          </div>
        </div>

        <Link
          href={`${routes.checkout}?renew=${product.slug}`}
          className="plain"
          style={{
            display: "block",
            textAlign: "center",
            background: "var(--ink)",
            color: "#fff",
            borderRadius: "var(--r-card)",
            padding: 14,
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Renew for another year
        </Link>
      </div>
    </Container>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14 }}>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontWeight: highlight ? 600 : 400, color: highlight ? "var(--ink)" : undefined }}>{value}</span>
    </div>
  );
}
