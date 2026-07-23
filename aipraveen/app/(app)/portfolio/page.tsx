import type { Metadata } from "next";
import Link from "next/link";
import { Container, Chip } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listUserProjects } from "@/lib/data";
import { portfolioChip } from "@/lib/portfolio";
import { formatDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { CopyLink } from "@/components/copy-link";

export const metadata: Metadata = { title: "Your portfolio" };

export default async function PortfolioPage() {
  const user = await requireUser(routes.portfolio);
  const projects = await listUserProjects(user.id);
  const shareUrl = `aipraveen.com/p/${user.slug}`;

  return (
    <Container max="detail" style={{ padding: "40px 28px 80px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 8 }}>
        <h1 className="display" style={{ fontWeight: 650, fontSize: 30, margin: 0 }}>
          Your portfolio
        </h1>
        <Link href={routes.recruiter(user.slug)} style={{ fontSize: 13.5, fontWeight: 600 }}>
          View as a recruiter →
        </Link>
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 18px" }}>
        Every build you submit shows up here and on your public, shareable page — a running record of what you ship with
        AI.
      </p>

      <div style={{ maxWidth: 520, marginBottom: 32 }}>
        <CopyLink url={shareUrl} />
      </div>

      {projects.length === 0 ? (
        <div style={{ border: "1px dashed var(--border)", borderRadius: "var(--r-card)", padding: 40, textAlign: "center", maxWidth: 520 }}>
          <div className="display" style={{ fontWeight: 650, fontSize: 18, marginBottom: 8 }}>
            No projects yet.
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 18px" }}>
            Pick a problem from the practice library, build it, and submit — it&apos;ll appear here instantly.
          </p>
          <Link href={routes.practice} className="plain" style={{ background: "var(--ink)", color: "#fff", borderRadius: "var(--r-card)", padding: "11px 20px", fontSize: 14, fontWeight: 600 }}>
            Browse practice projects
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {projects.map((p) => {
            const chip = portfolioChip(!!p.feedback);
            return (
              <div key={p.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: "22px 24px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--text-secondary)" }}>
                    {p.briefId} · {p.briefTitle}
                  </div>
                  <Chip color={chip.color} border={chip.border} bg={chip.bg}>
                    {chip.label}
                  </Chip>
                </div>
                <div className="display" style={{ fontWeight: 650, fontSize: 18, margin: "6px 0 6px" }}>
                  {p.title}
                </div>
                <p style={{ margin: "0 0 10px", fontSize: 14, color: "var(--ink)" }}>{p.description}</p>
                {p.audience && (
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>
                    <strong style={{ color: "var(--ink)" }}>For:</strong> {p.audience}
                  </div>
                )}
                {p.techStack.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {p.techStack.map((t) => (
                      <span key={t} className="mono" style={{ fontSize: 9, letterSpacing: "0.06em", color: "var(--ink)", border: "1px solid var(--border)", borderRadius: "var(--r-chip)", padding: "4px 8px" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {p.feedback && (
                  <div style={{ background: "var(--accent-tint)", border: "1px solid var(--accent-border)", borderRadius: "var(--r-card)", padding: "14px 18px", marginBottom: 12 }}>
                    <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--accent)", marginBottom: 6 }}>
                      FEEDBACK FROM PRAVEEN
                    </div>
                    <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "var(--ink)" }}>{p.feedback}</p>
                    <div style={{ marginTop: 10 }}>
                      <Link
                        href={routes.practiceSubmit(p.briefId)}
                        className="plain"
                        style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent)" }}
                      >
                        Improve &amp; resubmit →
                      </Link>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  {p.links.map((l) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600 }}>
                      {l.label} ↗
                    </a>
                  ))}
                  <span className="mono" style={{ marginLeft: "auto", fontSize: 9, letterSpacing: "0.1em", color: "var(--text-secondary)" }}>
                    ADDED {formatDate(p.createdAt).toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
          <Link href={routes.practice} className="plain" style={{ border: "1px dashed var(--border)", borderRadius: "var(--r-card)", padding: "18px 24px", textAlign: "center", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600 }}>
            + Add a project from the practice library
          </Link>
        </div>
      )}
    </Container>
  );
}
