import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { getProduct, renewLabelFor } from "@/lib/catalog";
import { requireUser } from "@/lib/auth";
import { getEntitlement, courseProgress } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Access expired" };

export default async function ExpiredPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const user = await requireUser(routes.expired(slug));
  const ent = await getEntitlement(user.id, product.id);
  if (!ent) redirect(routes.product(slug));
  if (ent.status !== "expired") redirect(routes.learn(slug));

  const progress =
    product.kind === "course" ? await courseProgress(user.id, product.id) : null;
  const percent = progress?.percent ?? 0;
  const filled = Math.round((percent / 100) * 12);

  return (
    <Container max="success" style={{ padding: "88px 28px 120px", textAlign: "center" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, maxWidth: 220, margin: "0 auto 28px" }}>
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "1",
              borderRadius: 2,
              background: i < filled ? "var(--ink)" : "var(--muted-fill)",
              border: `1px solid ${i < filled ? "var(--ink)" : "var(--border)"}`,
            }}
          />
        ))}
      </div>
      <h1 className="display" style={{ fontWeight: 650, fontSize: 26, margin: "0 0 10px" }}>
        Your year with this course ended on {formatDate(ent.expiresAt)}.
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 15, margin: "0 0 28px" }}>
        You finished {percent}% — every bit of that progress is saved. Renew any time and pick up exactly where you left
        off.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link
          href={routes.renew(slug)}
          className="plain"
          style={{ background: "var(--ink)", color: "#fff", borderRadius: "var(--r-card)", padding: "13px 24px", fontSize: 15, fontWeight: 600 }}
        >
          Renew — {renewLabelFor(product)}
        </Link>
        <Link
          href={routes.dashboard}
          className="plain"
          style={{ border: "1px solid var(--ink)", color: "var(--ink)", borderRadius: "var(--r-card)", padding: "12px 22px", fontSize: 15, fontWeight: 600 }}
        >
          Back to dashboard
        </Link>
      </div>
    </Container>
  );
}
