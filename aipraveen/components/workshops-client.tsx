"use client";

import { useState } from "react";
import Link from "next/link";
import { Container, Eyebrow } from "@/components/ui";
import { PROGRAMMES, WORKSHOP_STEPS } from "@/lib/content";
import { fieldStyle, primaryButtonStyle, ConfirmationCard } from "@/components/form";
import { routes } from "@/lib/routes";

export function WorkshopsClient() {
  const [sent, setSent] = useState(false);

  return (
    <>
      <Container max="prose" style={{ padding: "88px 28px 56px", textAlign: "center" }}>
        <Eyebrow style={{ marginBottom: 16 }}>STUDENT WORKSHOPS · ACROSS INDIA</Eyebrow>
        <h1 className="display" style={{ fontWeight: 650, fontSize: 46, letterSpacing: "-0.02em", margin: "0 0 18px" }}>
          One day. Your city. You ship something.
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 17, maxWidth: 560, margin: "0 auto" }}>
          In-person build days for students, city by city. No lectures — you arrive with an idea and leave with a
          working, deployed project in your portfolio.
        </p>
      </Container>

      <Container max="detail" style={{ padding: "0 28px 64px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {PROGRAMMES.map((pg) => (
          <div
            key={pg.name}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-card)",
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--accent)" }}>
              {pg.len}
            </div>
            <h3 className="display" style={{ fontWeight: 650, fontSize: 20, margin: 0 }}>
              {pg.name}
            </h3>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13.5, flex: 1 }}>{pg.desc}</p>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--text-secondary)", marginBottom: 6 }}>
                OUTCOMES
              </div>
              <p style={{ margin: 0, fontSize: 13 }}>{pg.outcomes}</p>
            </div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "var(--accent)" }}>{pg.price}</div>
          </div>
        ))}
      </Container>

      <section style={{ background: "var(--card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <Container max="prose" style={{ padding: "56px 28px" }}>
          <h2 className="display" style={{ fontWeight: 650, fontSize: 26, margin: "0 0 28px" }}>
            How a workshop day runs
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {WORKSHOP_STEPS.map((s) => (
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

      <Container max="form" style={{ padding: "64px 28px 88px" }}>
        <h2 className="display" style={{ fontWeight: 650, fontSize: 26, margin: "0 0 8px" }}>
          Bring a workshop to your city
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 24px" }}>
          Students, club leads and placement cells welcome. I reply personally within three working days.
        </p>
        {sent ? (
          <ConfirmationCard title="Inquiry received.">
            You will hear from me within three working days. In the meantime, the{" "}
            <Link href={routes.work}>case studies</Link> show how past engagements ran.
          </ConfirmationCard>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <input required placeholder="Your name" style={fieldStyle} />
              <input required placeholder="You are a… (student, club lead, placement cell)" style={fieldStyle} />
            </div>
            <input required placeholder="College / institution" style={fieldStyle} />
            <input required type="email" placeholder="Email" style={fieldStyle} />
            <textarea placeholder="Which city, and roughly how many students?" rows={4} style={{ ...fieldStyle, resize: "vertical" }} />
            <button type="submit" style={primaryButtonStyle}>
              Send inquiry
            </button>
          </form>
        )}
      </Container>
    </>
  );
}
