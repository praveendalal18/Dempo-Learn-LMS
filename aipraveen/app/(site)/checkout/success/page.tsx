import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getEntitlement } from "@/lib/data";
import { getProduct } from "@/lib/catalog";
import { COMPETITIONS } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "You're in" };

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; competition?: string; renewed?: string }>;
}) {
  const { product: slug, competition, renewed } = await searchParams;
  const user = await getCurrentUser();

  const isCompetition = !!competition;
  const comp = competition ? COMPETITIONS.find((c) => c.id === competition) : null;
  const product = slug ? getProduct(slug) : null;
  const entitlement =
    user && product ? await getEntitlement(user.id, product.id) : null;

  return (
    <Container max="success" style={{ padding: "96px 28px 120px", textAlign: "center" }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--success-bg)",
          border: "1px solid var(--success-border)",
          color: "var(--success)",
          fontSize: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        ✓
      </div>
      <h1 className="display" style={{ fontWeight: 650, fontSize: 30, margin: "0 0 10px" }}>
        You&apos;re in.
      </h1>

      {isCompetition ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 15, margin: "0 0 28px" }}>
          Your entry to <strong>{comp?.name}</strong> is registered. Build your project and submit it from your
          portfolio before the deadline — {comp?.deadline.replace("ENTRIES CLOSE ", "")}.
        </p>
      ) : (
        <p style={{ color: "var(--text-secondary)", fontSize: 15, margin: "0 0 28px" }}>
          {renewed ? "Your access is renewed" : "Payment received"} and your access is live.
          {entitlement && (
            <>
              {" "}
              You have access until <strong>{formatDate(entitlement.expiresAt)}</strong>.
            </>
          )}{" "}
          A receipt is on its way to your email.
        </p>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        {isCompetition ? (
          <Link href={routes.portfolio} className="plain" style={primaryBtn}>
            Go to your portfolio
          </Link>
        ) : product && product.kind === "course" ? (
          <Link href={routes.learn(product.slug)} className="plain" style={primaryBtn}>
            Start learning →
          </Link>
        ) : (
          <Link href={routes.dashboard} className="plain" style={primaryBtn}>
            Open your dashboard →
          </Link>
        )}
        <Link href={routes.dashboard} className="plain" style={secondaryBtn}>
          Dashboard
        </Link>
      </div>
    </Container>
  );
}

const primaryBtn: React.CSSProperties = {
  background: "var(--ink)",
  color: "#fff",
  borderRadius: "var(--r-card)",
  padding: "13px 24px",
  fontSize: 15,
  fontWeight: 600,
};
const secondaryBtn: React.CSSProperties = {
  background: "transparent",
  color: "var(--ink)",
  border: "1px solid var(--ink)",
  borderRadius: "var(--r-card)",
  padding: "12px 22px",
  fontSize: 15,
  fontWeight: 600,
};
