"use client";

import { useState } from "react";
import Link from "next/link";
import { Container, Eyebrow } from "@/components/ui";
import { routes } from "@/lib/routes";
import {
  PRACTICE_FILTERS,
  PRACTICE_PROJECTS,
  PRACTICE_TOTAL,
  practiceLevelColor,
} from "@/lib/practice";

export function PracticeClient() {
  const [filter, setFilter] = useState<string>("All");
  const shown = PRACTICE_PROJECTS.filter(
    (p) => filter === "All" || p.domain === filter.toUpperCase(),
  );

  return (
    <>
      <Container max="detail" style={{ padding: "88px 28px 32px", textAlign: "center" }}>
        <Eyebrow style={{ marginBottom: 16 }}>PRACTICE LIBRARY</Eyebrow>
        <h1 className="display" style={{ fontWeight: 650, fontSize: 46, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
          100 real projects to AI-enable.
        </h1>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "var(--accent-tint)",
            border: "1px solid var(--accent-border)",
            borderRadius: "var(--r-chip)",
            padding: "6px 14px",
          }}
        >
          <span className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--accent)" }}>
            INCLUDED FREE WITH ANY PAID COURSE · SUBMISSIONS NEED AN ACTIVE COURSE
          </span>
        </div>
      </Container>

      <Container max="detail" style={{ padding: "24px 28px 8px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {PRACTICE_FILTERS.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: active ? "var(--ink)" : "transparent",
                  color: active ? "#fff" : "var(--text-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-card)",
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
      </Container>

      <Container max="detail" style={{ padding: "24px 28px 12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
          {shown.map((p) => (
            <Link
              key={p.id}
              href={routes.practiceProject(p.id)}
              className="plain"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-card)",
                padding: 22,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                color: "var(--ink)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--text-secondary)" }}>
                  {p.id} · {p.domain}
                </span>
                <span className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: practiceLevelColor(p.level) }}>
                  {p.level}
                </span>
              </div>
              <div className="display" style={{ fontWeight: 650, fontSize: 17 }}>
                {p.title}
              </div>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13.5, flex: 1 }}>{p.blurb}</p>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>View problem &amp; build →</span>
            </Link>
          ))}
        </div>
        <div className="mono" style={{ marginTop: 20, fontSize: 10, letterSpacing: "0.12em", color: "var(--text-secondary)", textAlign: "center" }}>
          SHOWING {shown.length} OF {PRACTICE_TOTAL} PROJECTS
        </div>
      </Container>

      <section style={{ background: "var(--ink)", color: "#fff", marginTop: 40 }}>
        <Container max="detail" style={{ padding: "48px 28px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
          {[
            { n: "01", t: "Build", d: "Pick a project, use what you learned in the courses, and ship something that works." },
            { n: "02", t: "Submit", d: "Submit from your portfolio. Personal review from Praveen — usually about 5 days." },
            { n: "03", t: "Get seen", d: "Approved projects publish to your reviewed, recruiter-facing portfolio." },
          ].map((s) => (
            <div key={s.n}>
              <div className="mono" style={{ fontSize: 12, color: "var(--accent-on-navy)", marginBottom: 8 }}>
                {s.n}
              </div>
              <div className="display" style={{ fontWeight: 600, fontSize: 18, marginBottom: 6 }}>
                {s.t}
              </div>
              <div style={{ color: "var(--on-navy-muted)", fontSize: 13.5 }}>{s.d}</div>
            </div>
          ))}
        </Container>
      </section>
    </>
  );
}
