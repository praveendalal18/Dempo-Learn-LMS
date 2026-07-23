import type { Metadata } from "next";
import { Container, Eyebrow } from "@/components/ui";
import { CASES } from "@/lib/content";

export const metadata: Metadata = {
  title: "Selected work",
  description:
    "Four case studies — a course rebuild, a six-course curriculum system, an enterprise approvals app, and this platform.",
};

export default function WorkPage() {
  return (
    <>
      <Container max="prose" style={{ padding: "72px 28px 40px" }}>
        <Eyebrow style={{ marginBottom: 14 }}>SELECTED WORK</Eyebrow>
        <h1
          className="display"
          style={{ fontWeight: 650, fontSize: 42, letterSpacing: "-0.02em", margin: "0 0 14px" }}
        >
          Things I have actually built.
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 16, maxWidth: 560, margin: 0 }}>
          Four case studies. Each one follows the same shape: a real problem, what I built, and what changed.
        </p>
      </Container>
      <Container
        max="prose"
        style={{ padding: "0 28px 80px", display: "flex", flexDirection: "column", gap: 28 }}
      >
        {CASES.map((c) => (
          <div
            key={c.title}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-card)",
              padding: "36px 40px",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
              <h2 className="display" style={{ fontWeight: 650, fontSize: 24, margin: 0 }}>
                {c.title}
              </h2>
              <span className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--accent)", whiteSpace: "nowrap" }}>
                {c.tag}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28 }}>
              <CaseCol label="PROBLEM" text={c.problem} />
              <CaseCol label="WHAT I BUILT" text={c.built} />
              <CaseCol label="OUTCOME" text={c.outcome} />
            </div>
          </div>
        ))}
      </Container>
    </>
  );
}

function CaseCol({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--text-secondary)", marginBottom: 8 }}>
        {label}
      </div>
      <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink)" }}>{text}</p>
    </div>
  );
}
