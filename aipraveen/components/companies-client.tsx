"use client";

import { useState } from "react";
import Link from "next/link";
import { Container, Eyebrow } from "@/components/ui";
import { INDUSTRY_OFFERS } from "@/lib/content";
import { fieldStyle, selectStyle, primaryButtonStyle, ConfirmationCard } from "@/components/form";
import { routes } from "@/lib/routes";

export function CompaniesClient() {
  const [sent, setSent] = useState(false);

  return (
    <>
      <Container max="detail" style={{ padding: "88px 28px 48px", textAlign: "center" }}>
        <Eyebrow style={{ marginBottom: 16 }}>FOR COMPANIES</Eyebrow>
        <h1 className="display" style={{ fontWeight: 650, fontSize: 46, letterSpacing: "-0.02em", margin: "0 0 18px" }}>
          1,200+ students building with AI. Put them to work.
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 17, maxWidth: 560, margin: "0 auto" }}>
          Sponsor a competition, post scoped paid projects, or hire from reviewed portfolios. Every student deliverable
          passes a personal review first.
        </p>
      </Container>

      <Container max="detail" style={{ padding: "0 28px 56px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {INDUSTRY_OFFERS.map((o) => (
          <div
            key={o.tag}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-card)",
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--accent)" }}>
              {o.tag}
            </div>
            <h3 className="display" style={{ fontWeight: 650, fontSize: 20, margin: 0 }}>
              {o.name}
            </h3>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13.5, flex: 1 }}>{o.desc}</p>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, fontWeight: 600, fontSize: 14, color: "var(--accent)" }}>
              {o.detail}
            </div>
          </div>
        ))}
      </Container>

      <Container max="form" style={{ padding: "24px 28px 88px" }}>
        <h2 className="display" style={{ fontWeight: 650, fontSize: 26, margin: "0 0 8px" }}>
          Tell me what you need
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 24px" }}>
          A short note is enough to start. I reply personally within three working days.
        </p>
        {sent ? (
          <ConfirmationCard title="Thanks — I'll be in touch.">
            I&apos;ll reply within three working days. Meanwhile, here&apos;s a{" "}
            <Link href={routes.recruiter("asha-menon")}>sample reviewed portfolio</Link> so you can see the standard.
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
              <input required placeholder="Company" style={fieldStyle} />
            </div>
            <input required type="email" placeholder="Work email" style={fieldStyle} />
            <select style={selectStyle} defaultValue="">
              <option value="" disabled>
                What are you interested in?
              </option>
              <option>Run a competition</option>
              <option>Post paid projects</option>
              <option>Hire &amp; internships</option>
            </select>
            <textarea placeholder="A line or two about the brief, the timeline, or the roles." rows={4} style={{ ...fieldStyle, resize: "vertical" }} />
            <button type="submit" style={primaryButtonStyle}>
              Send inquiry
            </button>
          </form>
        )}
      </Container>
    </>
  );
}
