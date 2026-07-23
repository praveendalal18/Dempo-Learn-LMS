import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import {
  PRACTICE_PROJECTS,
  getPracticeProject,
  practiceLevelColor,
} from "@/lib/practice";
import { routes } from "@/lib/routes";

export function generateStaticParams() {
  return PRACTICE_PROJECTS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = getPracticeProject(id);
  if (!p) return { title: "Project not found" };
  return { title: `${p.title} — practice project`, description: p.blurb };
}

export default async function PracticeProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = getPracticeProject(id);
  if (!p) notFound();

  return (
    <Container max="prose" style={{ padding: "48px 28px 88px" }}>
      <div className="mono" style={{ fontSize: 10.5, letterSpacing: "0.1em", color: "var(--text-secondary)", marginBottom: 20 }}>
        <Link href={routes.practice} className="plain" style={{ color: "var(--accent)" }}>
          PRACTICE
        </Link>{" "}
        / {p.domain}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--text-secondary)" }}>
          {p.id} · {p.domain}
        </span>
        <span className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: practiceLevelColor(p.level) }}>
          {p.level}
        </span>
      </div>
      <h1 className="display" style={{ fontWeight: 650, fontSize: 36, letterSpacing: "-0.02em", margin: "0 0 20px" }}>
        {p.title}
      </h1>

      {/* Problem statement */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: "24px 28px", marginBottom: 20 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--accent)", marginBottom: 10 }}>
          THE PROBLEM
        </div>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6 }}>{p.problem}</p>
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 18, paddingTop: 14 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--text-secondary)", marginRight: 8 }}>
            WHO IT&apos;S FOR
          </span>
          <span style={{ fontSize: 14 }}>{p.forWho}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <HintCard title="PLAN IT" hints={p.planHints} />
        <HintCard title="BUILD IT — FREE" hints={p.buildHints} accent />
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: "20px 24px", marginBottom: 28 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--text-secondary)", marginBottom: 12 }}>
          A FREE STACK TO START WITH
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {p.starterStack.map((s) => (
            <span
              key={s}
              className="mono"
              style={{ fontSize: 10, letterSpacing: "0.06em", color: "var(--ink)", border: "1px solid var(--border)", borderRadius: "var(--r-chip)", padding: "5px 10px" }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: "var(--ink)", color: "#fff", borderRadius: "var(--r-card)", padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div className="display" style={{ fontWeight: 650, fontSize: 20, marginBottom: 4 }}>
            Built it? Add it to your portfolio.
          </div>
          <div style={{ color: "var(--on-navy-muted)", fontSize: 13.5 }}>
            Submit your build — you&apos;ll create a free profile, then it shows up on your shareable portfolio.
          </div>
        </div>
        <Link
          href={routes.practiceSubmit(p.id)}
          className="plain"
          style={{ background: "#fff", color: "var(--ink)", borderRadius: "var(--r-card)", padding: "13px 24px", fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}
        >
          Submit your build
        </Link>
      </div>
    </Container>
  );
}

function HintCard({ title, hints, accent }: { title: string; hints: string[]; accent?: boolean }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: "22px 24px" }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: accent ? "var(--accent)" : "var(--text-secondary)", marginBottom: 14 }}>
        {title}
      </div>
      <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
        {hints.map((h, i) => (
          <li key={i} style={{ display: "flex", gap: 12, fontSize: 14, lineHeight: 1.5 }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--accent)", flexShrink: 0 }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{h}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
