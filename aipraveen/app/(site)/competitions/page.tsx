import type { Metadata } from "next";
import Link from "next/link";
import { Container, Eyebrow, ButtonLink } from "@/components/ui";
import { COMPETITIONS, COMP_STEPS, WINNERS } from "@/lib/content";
import { formatINR } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Competitions",
  description:
    "National build-offs for students across India. Register, build from a real brief, submit from your portfolio, and get judged by industry.",
};

export default function CompetitionsPage() {
  return (
    <>
      <Container max="detail" style={{ padding: "88px 28px 48px", textAlign: "center" }}>
        <Eyebrow style={{ marginBottom: 16 }}>COMPETITIONS · ACROSS INDIA</Eyebrow>
        <h1
          className="display"
          style={{ fontWeight: 650, fontSize: 46, letterSpacing: "-0.02em", margin: "0 0 18px" }}
        >
          Build-offs for students across India.
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 17, maxWidth: 560, margin: "0 auto" }}>
          Register, build from a real brief over four to six weeks, submit from your portfolio, and put your work in
          front of the companies sponsoring the prize.
        </p>
      </Container>

      <Container max="detail" style={{ padding: "0 28px 64px", display: "flex", flexDirection: "column", gap: 22 }}>
        {COMPETITIONS.map((c) => (
          <div
            key={c.id}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-card)",
              padding: "32px 36px",
              display: "grid",
              gridTemplateColumns: "1fr 220px",
              gap: 32,
              alignItems: "center",
            }}
          >
            <div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--accent)", marginBottom: 10 }}>
                {c.sponsor}
              </div>
              <h2 className="display" style={{ fontWeight: 650, fontSize: 24, margin: "0 0 10px" }}>
                {c.name}
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 16px", maxWidth: 560 }}>
                {c.brief}
              </p>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <Meta>{c.prize}</Meta>
                <Meta>{c.deadline}</Meta>
                <Meta>{c.spots}</Meta>
              </div>
            </div>
            <div
              style={{
                borderLeft: "1px solid var(--border)",
                paddingLeft: 28,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div className="display" style={{ fontWeight: 650, fontSize: 22, color: "var(--accent)" }}>
                {formatINR(c.fee)}
              </div>
              <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--text-secondary)" }}>
                ENTRY FEE
              </div>
              <Link
                href={`${routes.checkout}?competition=${c.id}`}
                className="plain"
                style={{
                  background: "var(--ink)",
                  color: "#fff",
                  borderRadius: "var(--r-card)",
                  padding: "11px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                Register
              </Link>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--text-secondary)" }}>
                SUBMIT VIA YOUR PORTFOLIO
              </div>
            </div>
          </div>
        ))}
      </Container>

      {/* How it works */}
      <section style={{ background: "var(--card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <Container max="prose" style={{ padding: "56px 28px" }}>
          <h2 className="display" style={{ fontWeight: 650, fontSize: 26, margin: "0 0 28px" }}>
            How it works
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {COMP_STEPS.map((s) => (
              <div key={s.n}>
                <div className="mono" style={{ fontSize: 12, color: "var(--accent)", marginBottom: 8 }}>
                  {s.n}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 4 }}>{s.t}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Winners */}
      <Container max="detail" style={{ padding: "64px 28px 40px" }}>
        <h2 className="display" style={{ fontWeight: 650, fontSize: 26, margin: "0 0 24px" }}>
          Last season&apos;s winners
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
          {WINNERS.map((w) => (
            <div key={w.project} style={{ background: "var(--ink)", color: "#fff", borderRadius: "var(--r-card)", padding: 26 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--accent-on-navy)", marginBottom: 14 }}>
                {w.place}
              </div>
              <div className="display" style={{ fontWeight: 650, fontSize: 18, marginBottom: 8 }}>
                {w.project}
              </div>
              <div style={{ color: "var(--on-navy-muted)", fontSize: 13, marginBottom: 12 }}>{w.who}</div>
              <div style={{ fontSize: 13, color: "var(--accent-on-navy)" }}>{w.won}</div>
            </div>
          ))}
        </div>
      </Container>

      {/* Sponsor CTA */}
      <Container max="detail" style={{ padding: "0 28px 80px" }}>
        <div
          style={{
            background: "var(--accent-tint)",
            border: "1px solid var(--accent-border)",
            borderRadius: "var(--r-card)",
            padding: "32px 36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="display" style={{ fontWeight: 650, fontSize: 22, marginBottom: 6 }}>
              Sponsor a competition
            </div>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14, maxWidth: 520 }}>
              Set the brief and the prize; I run registration, the build window, and first-round judging. You see the
              shortlist.
            </p>
          </div>
          <ButtonLink href={routes.companies} variant="secondary" style={{ padding: "12px 22px", fontSize: 14 }}>
            For companies →
          </ButtonLink>
        </div>
      </Container>
    </>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <span className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-secondary)" }}>
      {children}
    </span>
  );
}
