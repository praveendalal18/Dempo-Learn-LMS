import type { Metadata } from "next";
import { Container, Eyebrow } from "@/components/ui";
import { TESTIMONIAL_WALL } from "@/lib/content";
import { TestimonialForm } from "@/components/testimonial-form";

export const metadata: Metadata = {
  title: "Testimonials",
  description:
    "In their words — submitted by learners, reviewed and approved before publishing.",
};

export default function TestimonialsPage() {
  return (
    <>
      <Container max="detail" style={{ padding: "72px 28px 32px" }}>
        <Eyebrow style={{ marginBottom: 14 }}>TESTIMONIALS</Eyebrow>
        <h1 className="display" style={{ fontWeight: 650, fontSize: 42, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
          In their words.
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 15, margin: 0 }}>
          Submitted by learners, reviewed and approved before publishing.
        </p>
      </Container>

      <Container max="detail" style={{ padding: "24px 28px 56px", columns: 3, columnGap: 22 }}>
        {TESTIMONIAL_WALL.map((t) => (
          <div
            key={t.name}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-card)",
              padding: 24,
              marginBottom: 22,
              breakInside: "avoid",
            }}
          >
            <div style={{ color: "var(--accent)", fontSize: 13, letterSpacing: 2, marginBottom: 10 }}>{t.stars}</div>
            <p style={{ margin: "0 0 14px", fontSize: 14 }}>“{t.text}”</p>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-secondary)", marginTop: 2 }}>
              {t.meta}
            </div>
          </div>
        ))}
      </Container>

      <section style={{ background: "var(--card)", borderTop: "1px solid var(--border)" }}>
        <Container max="form" style={{ padding: "56px 28px 80px" }}>
          <h2 className="display" style={{ fontWeight: 650, fontSize: 26, margin: "0 0 6px" }}>
            Share your experience
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13.5, margin: "0 0 22px" }}>
            Every submission is reviewed before publishing.
          </p>
          <TestimonialForm />
        </Container>
      </section>
    </>
  );
}
