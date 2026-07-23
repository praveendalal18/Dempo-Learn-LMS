import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { POSTS } from "@/lib/content";
import { BookWaitlist } from "@/components/book-waitlist";

export const metadata: Metadata = {
  title: "Book & Insights",
  description:
    "Applied AI, Actually Applied (2027) — working notes from six courses, four products, and one very busy year. Free with the annual Studio Course.",
};

export default function BookPage() {
  return (
    <>
      <section style={{ background: "var(--ink)", color: "#fff" }}>
        <Container
          max="detail"
          style={{ padding: "88px 28px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 64, alignItems: "center" }}
        >
          <div>
            <div className="mono" style={{ fontSize: 11, letterSpacing: "0.16em", color: "var(--accent-on-navy)", marginBottom: 16 }}>
              THE BOOK · COMING 2027
            </div>
            <h1 className="display" style={{ fontWeight: 650, fontSize: 44, letterSpacing: "-0.02em", margin: "0 0 18px" }}>
              Applied AI, Actually Applied
            </h1>
            <p style={{ color: "var(--on-navy-muted)", fontSize: 16, maxWidth: 520, margin: "0 0 28px" }}>
              Most AI writing tells you what is possible. This book shows what is practical: how one educator used AI to
              design six courses, build enterprise software, and run a business — with the working process for each, not
              the highlight reel.
            </p>
            <BookWaitlist />
          </div>
          <div
            style={{
              background: "var(--ink-deep-3)",
              border: "1px solid var(--navy-border)",
              borderRadius: "var(--r-card)",
              aspectRatio: "3/4",
              padding: 28,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--accent-on-navy)" }}>
              PRAVEEN DALAL
            </div>
            <div>
              <div className="display" style={{ fontWeight: 650, fontSize: 26, lineHeight: 1.15, color: "#fff" }}>
                Applied AI, Actually Applied
              </div>
              <div style={{ width: 36, height: 3, background: "var(--accent)", margin: "16px 0" }} />
              <div style={{ fontSize: 12, color: "var(--on-navy-muted)" }}>
                Working notes from six courses, four products, and one very busy year.
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Container max="detail" style={{ padding: "64px 28px 88px" }}>
        <h2 className="display" style={{ fontWeight: 650, fontSize: 28, margin: "0 0 28px" }}>
          Insights
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 22 }}>
          {POSTS.map((po) => (
            <div
              key={po.title}
              style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: 28 }}
            >
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--accent)", marginBottom: 10 }}>
                {po.meta}
              </div>
              <h3 className="display" style={{ fontWeight: 650, fontSize: 19, margin: "0 0 8px" }}>
                {po.title}
              </h3>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13.5 }}>{po.blurb}</p>
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
