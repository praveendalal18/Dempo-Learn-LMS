import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserBySlug, listPublishedProjects, displayName } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { routes } from "@/lib/routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const user = await getUserBySlug(slug);
  if (!user) return { title: "Portfolio not found" };
  const name = displayName(user);
  return {
    title: `${name} — AI project portfolio`,
    description: `${name} builds real things with AI. A portfolio of shipped projects, from problem to working build.`,
  };
}

export default async function RecruiterView({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getUserBySlug(slug);
  if (!user) notFound();

  const projects = await listPublishedProjects(user.id);
  const name = displayName(user);
  const initials = name
    .split(/[\s.@]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Skill chips = the tools they've actually used across published builds.
  const skills = Array.from(new Set(projects.flatMap((p) => p.techStack))).slice(0, 10);

  return (
    <>
      <div style={{ background: "var(--ink)", color: "#fff" }}>
        <div className="mono" style={{ maxWidth: "var(--w-detail)", margin: "0 auto", padding: "14px 28px", fontSize: 10, letterSpacing: "0.16em", color: "var(--accent-on-navy)" }}>
          AI PROJECT PORTFOLIO · AIPRAVEEN.COM
        </div>
      </div>

      {/* Profile */}
      <div style={{ maxWidth: "var(--w-detail)", margin: "0 auto", padding: "48px 28px 24px" }}>
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div className="display" style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--ink)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 650, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 className="display" style={{ fontWeight: 650, fontSize: 30, margin: "0 0 4px" }}>
              {name}
            </h1>
            <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              Builds real things with AI · {projects.length} shipped {projects.length === 1 ? "project" : "projects"}
            </div>
          </div>
          <a href={`mailto:${user.email}`} className="plain" style={{ background: "var(--ink)", color: "#fff", borderRadius: "var(--r-card)", padding: "11px 20px", fontSize: 14, fontWeight: 600 }}>
            Contact
          </a>
        </div>
        {skills.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
            {skills.map((s) => (
              <span key={s} className="mono" style={{ fontSize: 10, letterSpacing: "0.06em", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "var(--r-chip)", padding: "5px 10px" }}>
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Trust banner */}
      <div style={{ maxWidth: "var(--w-detail)", margin: "0 auto", padding: "0 28px 24px" }}>
        <div style={{ background: "var(--accent-tint)", border: "1px solid var(--accent-border)", borderRadius: "var(--r-card)", padding: "14px 20px", fontSize: 13.5, color: "var(--ink)" }}>
          Every project below was built against a real industry brief from the AIPD practice library.
        </div>
      </div>

      {/* Projects */}
      <div style={{ maxWidth: "var(--w-detail)", margin: "0 auto", padding: "0 28px 40px", display: "flex", flexDirection: "column", gap: 22 }}>
        {projects.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>No published projects yet.</p>
        ) : (
          projects.map((p) => (
            <div key={p.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: "28px 32px" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
                <h2 className="display" style={{ fontWeight: 650, fontSize: 20, margin: 0 }}>
                  {p.title}
                </h2>
                <span className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--accent)", whiteSpace: "nowrap" }}>
                  {p.briefId} · {p.briefTitle}
                </span>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 14.5, lineHeight: 1.6 }}>{p.description}</p>
              {p.audience && (
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
                  <strong style={{ color: "var(--ink)" }}>Built for:</strong> {p.audience}
                </div>
              )}
              {p.techStack.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {p.techStack.map((t) => (
                    <span key={t} className="mono" style={{ fontSize: 9, letterSpacing: "0.06em", color: "var(--ink)", border: "1px solid var(--border)", borderRadius: "var(--r-chip)", padding: "4px 8px" }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                {p.links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600 }}>
                    {l.label} ↗
                  </a>
                ))}
                <span className="mono" style={{ marginLeft: "auto", fontSize: 9.5, letterSpacing: "0.12em", color: "var(--text-secondary)" }}>
                  SHIPPED {formatDate(p.createdAt).toUpperCase()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Hiring CTA */}
      <div style={{ maxWidth: "var(--w-detail)", margin: "0 auto", padding: "0 28px 80px" }}>
        <div style={{ textAlign: "center", padding: "32px", borderTop: "1px solid var(--border)" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 14px" }}>
            Want to hire students who ship, or run a competition of your own?
          </p>
          <Link href={routes.companies} className="plain" style={{ background: "var(--ink)", color: "#fff", borderRadius: "var(--r-card)", padding: "11px 20px", fontSize: 14, fontWeight: 600 }}>
            For companies →
          </Link>
        </div>
      </div>
    </>
  );
}
