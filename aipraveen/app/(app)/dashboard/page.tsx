import type { Metadata } from "next";
import Link from "next/link";
import { Container, Chip } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listEntitlements, courseProgress, displayName, type EntitlementView } from "@/lib/data";
import { renewLabelFor } from "@/lib/catalog";
import { FLAT_LESSONS } from "@/lib/course";
import { formatDate, daysUntil } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const ents = await listEntitlements(user.id);

  // Progress for course entitlements.
  const withProgress = await Promise.all(
    ents.map(async (e) => ({
      ent: e,
      progress:
        e.product.kind === "course" ? await courseProgress(user.id, e.productId) : null,
    })),
  );

  const continueItem = withProgress.find(
    (x) => x.ent.product.kind === "course" && x.ent.status !== "expired" && x.progress && x.progress.percent < 100,
  );
  const firstName = displayName(user).split(" ")[0];

  return (
    <Container max="wide" style={{ padding: "40px 28px 80px" }}>
      <h1 className="display" style={{ fontWeight: 650, fontSize: 30, margin: "0 0 24px" }}>
        {greeting()}, {firstName}.
      </h1>

      {ents.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {continueItem && continueItem.progress && (
            <div
              style={{
                background: "var(--ink)",
                color: "#fff",
                borderRadius: "var(--r-card)",
                padding: "28px 32px",
                marginBottom: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 24,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 280 }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--accent-on-navy)", marginBottom: 8 }}>
                  CONTINUE LEARNING
                </div>
                <div className="display" style={{ fontWeight: 650, fontSize: 20, marginBottom: 4 }}>
                  {continueItem.ent.product.title}
                </div>
                <div style={{ color: "var(--on-navy-muted)", fontSize: 13.5, marginBottom: 14 }}>
                  Next: {FLAT_LESSONS[continueItem.progress.nextLessonIndex]?.title} · {continueItem.progress.percent}% complete
                </div>
                <div style={{ height: 6, background: "var(--navy-border)", borderRadius: 3, maxWidth: 360, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${continueItem.progress.percent}%`, background: "var(--accent-on-navy)" }} />
                </div>
              </div>
              <Link
                href={routes.learn(continueItem.ent.product.slug)}
                className="plain"
                style={{ background: "#fff", color: "var(--ink)", borderRadius: "var(--r-card)", padding: "12px 24px", fontSize: 15, fontWeight: 600 }}
              >
                Resume
              </Link>
            </div>
          )}

          <h2 className="display" style={{ fontWeight: 650, fontSize: 20, margin: "0 0 16px" }}>
            Your library
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
            {withProgress.map(({ ent, progress }) => (
              <LibraryCard key={ent.id} ent={ent} percent={progress?.percent ?? null} />
            ))}
          </div>

          <div style={{ marginTop: 32, display: "flex", gap: 24, fontSize: 13.5 }}>
            <Link href={routes.dashboard}>View receipts</Link>
            <a href="mailto:support@aipraveen.com">Contact support</a>
          </div>
        </>
      )}
    </Container>
  );
}

function LibraryCard({ ent, percent }: { ent: EntitlementView; percent: number | null }) {
  const { product, status } = ent;
  const expired = status === "expired";
  const expiring = status === "expiring";
  const days = daysUntil(ent.expiresAt);

  const chip = expired ? (
    <Chip>EXPIRED {formatDate(ent.expiresAt).toUpperCase()}</Chip>
  ) : expiring ? (
    <Chip color="var(--accent)" border="var(--accent)" bg="var(--accent-tint)">
      EXPIRES IN {days} DAYS — {formatDate(ent.expiresAt).toUpperCase()}
    </Chip>
  ) : (
    <Chip bg="transparent">ACCESS UNTIL {formatDate(ent.expiresAt).toUpperCase()}</Chip>
  );

  const openHref = expired
    ? routes.expired(product.slug)
    : product.kind === "course"
      ? routes.learn(product.slug)
      : routes.viewer(product.slug);

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-card)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ position: "relative" }}>
        <Link
          href={openHref}
          className="plain"
          style={{
            display: "block",
            background: product.thumbBg,
            padding: "24px 22px",
            minHeight: 110,
            opacity: expired ? 0.92 : 1,
          }}
        >
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--accent-on-navy)" }}>
            {product.kindLabel}
          </div>
          <div className="display" style={{ fontWeight: 650, fontSize: 18, color: "#fff", marginTop: 8 }}>
            {product.title}
          </div>
        </Link>
        {expired && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              background: "rgba(12,25,48,.35)",
            }}
          >
            🔒
          </div>
        )}
      </div>
      <div style={{ padding: "16px 20px 18px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {product.kind === "course"
            ? expired
              ? `${percent ?? 0}% complete — progress saved`
              : `${percent ?? 0}% complete`
            : `${product.resourceCount} resources`}
        </div>
        <div style={{ marginTop: "auto" }}>{chip}</div>
        {(expiring || expired) && (
          <Link
            href={routes.renew(product.slug)}
            className="plain"
            style={{
              marginTop: 8,
              display: "inline-block",
              background: "transparent",
              color: "var(--accent)",
              border: "1px solid var(--accent)",
              borderRadius: "var(--r-card)",
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              width: "fit-content",
            }}
          >
            Renew — {renewLabelFor(product)}
          </Link>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        border: "1px dashed var(--border)",
        borderRadius: "var(--r-card)",
        padding: 48,
        textAlign: "center",
        maxWidth: 520,
      }}
    >
      <div className="display" style={{ fontWeight: 650, fontSize: 20, marginBottom: 8 }}>
        Nothing here yet.
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 20px" }}>
        Buy a course or grab a free kit and it&apos;ll show up here with your progress.
      </p>
      <Link href={routes.store} className="plain" style={{ background: "var(--ink)", color: "#fff", borderRadius: "var(--r-card)", padding: "11px 20px", fontSize: 14, fontWeight: 600 }}>
        Browse the store
      </Link>
    </div>
  );
}
