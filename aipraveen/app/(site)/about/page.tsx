import type { Metadata } from "next";
import { Container, Eyebrow } from "@/components/ui";
import { ROADMAP } from "@/lib/content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Praveen Dalal designs AI curriculum and builds with AI — and teaches both. Goa, India.",
};

export default function AboutPage() {
  return (
    <>
      <Container
        max="prose"
        style={{ padding: "72px 28px 56px", display: "grid", gridTemplateColumns: "220px 1fr", gap: 56, alignItems: "start" }}
      >
        <div>
          <Avatar />
          <p className="mono" style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--text-secondary)", margin: "10px 0 0", textAlign: "center" }}>
            DIGITAL AVATAR · GOA, INDIA
          </p>
        </div>
        <div>
          <Eyebrow style={{ marginBottom: 14 }}>ABOUT</Eyebrow>
          <h1 className="display" style={{ fontWeight: 650, fontSize: 40, letterSpacing: "-0.02em", margin: "0 0 18px" }}>
            Praveen Dalal
          </h1>
          <p style={{ fontSize: 15.5, margin: "0 0 14px" }}>
            I design AI curriculum and build with AI — and I teach both. Visiting Faculty at an AI business school, where
            I designed six AI-integrated management courses totalling 180+ hours. Alongside teaching, I build enterprise
            apps and websites with AI, including this platform, which runs on the exact stack I teach.
          </p>
          <p style={{ fontSize: 15.5, color: "var(--text-secondary)", margin: "0 0 24px" }}>
            The site is the proof of the thesis: one person, working with AI, can design, build and run a complete
            learning platform.
          </p>
          <a
            href="https://www.linkedin.com/in/praveen-dalal/"
            target="_blank"
            rel="noreferrer"
            className="mono plain"
            style={{
              fontSize: 11,
              letterSpacing: "0.1em",
              color: "var(--accent)",
              border: "1px solid var(--accent)",
              borderRadius: "var(--r-card)",
              padding: "9px 16px",
              display: "inline-block",
            }}
          >
            CONNECT ON LINKEDIN ↗
          </a>
        </div>
      </Container>

      <section style={{ background: "var(--card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <Container max="prose" style={{ padding: "56px 28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56 }}>
          <div>
            <h2 className="display" style={{ fontWeight: 650, fontSize: 22, margin: "0 0 12px" }}>
              Why self-paced, why no calls
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 10px" }}>
              Live cohorts optimise for the teacher&apos;s calendar, not your learning. Everything I sell is self-paced by
              design: you get the complete material on day one, a full year to work through it, and courses built so the
              material itself answers your questions.
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>
              No live calls and no Q&amp;A sessions — ever. That constraint forces me to make the content genuinely
              complete.
            </p>
          </div>
          <div>
            <h2 className="display" style={{ fontWeight: 650, fontSize: 22, margin: "0 0 12px" }}>
              What&apos;s next
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ROADMAP.map((rm) => (
                <div key={rm.when} style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
                  <span className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--accent)", whiteSpace: "nowrap" }}>
                    {rm.when}
                  </span>
                  <span style={{ fontSize: 14 }}>{rm.what}</span>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <Container max="prose" style={{ padding: "48px 28px 88px", textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>
          Questions? Write to <a href="mailto:hello@aipraveen.com">hello@aipraveen.com</a> — I read everything.
        </p>
      </Container>
    </>
  );
}

function Avatar() {
  return (
    <svg
      viewBox="0 0 200 200"
      style={{ width: "100%", borderRadius: "var(--r-card)", border: "1px solid var(--border)", background: "var(--ink)", display: "block" }}
    >
      <rect x="0" y="0" width="200" height="200" fill="#12233F" />
      <circle cx="100" cy="82" r="38" fill="#D9A06B" />
      <path d="M62 82 Q60 40 100 38 Q140 40 138 82 Q138 58 100 54 Q62 58 62 82 Z" fill="#1B1B22" />
      <path d="M84 104 Q100 116 116 104 L114 118 Q100 128 86 118 Z" fill="#1B1B22" />
      <ellipse cx="86" cy="82" rx="4" ry="4.5" fill="#1B1B22" />
      <ellipse cx="114" cy="82" rx="4" ry="4.5" fill="#1B1B22" />
      <path d="M40 200 Q42 148 78 138 L100 150 L122 138 Q158 148 160 200 Z" fill="#3E4756" />
      <path d="M88 132 L100 150 L112 132 L112 142 L100 158 L88 142 Z" fill="#F2DC8E" />
      <rect x="150" y="150" width="34" height="34" fill="none" stroke="#8A6D2B" strokeWidth="2" />
      <rect x="158" y="158" width="18" height="18" fill="#8A6D2B" />
    </svg>
  );
}
