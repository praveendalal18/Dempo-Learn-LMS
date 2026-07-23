"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CURRICULUM,
  STUDIO_OUTCOMES,
  STUDIO_FAQS,
  STUDIO_FOR_YOU,
  STUDIO_NOT_FOR_YOU,
  STUDIO_PRODUCT_TESTIMONIALS,
} from "@/lib/course";
import {
  priceLabel,
  renewLabelFor,
  type Product,
} from "@/lib/catalog";
import { formatDate, oneYearFrom } from "@/lib/format";
import { routes } from "@/lib/routes";
import { Container } from "@/components/ui";

export function CourseDetail({ product }: { product: Product }) {
  const [openModule, setOpenModule] = useState(-1);
  const [openFaq, setOpenFaq] = useState(-1);
  const isFlagship = product.id === "flagship";
  const renew = renewLabelFor(product);
  const accessUntil = formatDate(oneYearFrom());

  const faqs = [
    {
      q: "What happens after a year?",
      a: `Your access ends. You can renew for ${renew} any time — even months later — and renewing restores everything, including your progress, exactly where you left it.`,
    },
    ...STUDIO_FAQS.slice(1),
  ];

  return (
    <Container max="detail" style={{ padding: "48px 28px 88px" }}>
      <div
        className="mono"
        style={{ fontSize: 10.5, letterSpacing: "0.1em", color: "var(--text-secondary)", marginBottom: 22 }}
      >
        <Link href={routes.store} className="plain" style={{ color: "var(--accent)" }}>
          STORE
        </Link>{" "}
        / {product.kind === "course" ? "VIDEO COURSE" : "STARTER KIT"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 48, alignItems: "start" }}>
        {/* Main column */}
        <div>
          <h1
            className="display"
            style={{ fontWeight: 650, fontSize: 38, letterSpacing: "-0.02em", margin: "0 0 12px" }}
          >
            {product.title}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 16, margin: "0 0 26px" }}>
            {product.outcome}
          </p>

          {/* Preview video block */}
          <div
            style={{
              background: "var(--ink)",
              borderRadius: "var(--r-card)",
              aspectRatio: "16/9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 12,
              marginBottom: 36,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                border: "2px solid var(--accent-on-navy)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "18px solid var(--accent-on-navy)",
                  borderTop: "11px solid transparent",
                  borderBottom: "11px solid transparent",
                  marginLeft: 5,
                }}
              />
            </div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--accent-on-navy)" }}>
              WATCH THE 2-MINUTE PREVIEW
            </div>
          </div>

          {isFlagship && (
            <>
              <SectionHeading>After this course, you can</SectionHeading>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px 24px",
                  marginBottom: 40,
                }}
              >
                {STUDIO_OUTCOMES.map((o) => (
                  <div key={o} style={{ display: "flex", gap: 10, fontSize: 14 }}>
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>✓</span>
                    <span>{o}</span>
                  </div>
                ))}
              </div>

              <SectionHeading>Curriculum</SectionHeading>
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-card)",
                  background: "var(--card)",
                  overflow: "hidden",
                  marginBottom: 40,
                }}
              >
                {CURRICULUM.map((m, i) => {
                  const open = openModule === i;
                  return (
                    <div key={m.num} style={{ borderBottom: "1px solid var(--border)" }}>
                      <button
                        onClick={() => setOpenModule(open ? -1 : i)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "16px 20px",
                          cursor: "pointer",
                          width: "100%",
                          background: "none",
                          border: "none",
                          textAlign: "left",
                        }}
                      >
                        <span className="mono" style={{ fontSize: 10, color: "var(--accent)", width: 24 }}>
                          {m.num}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: 14.5, flex: 1 }}>{m.title}</span>
                        <span className="mono" style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                          {m.dur}
                        </span>
                        <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                          {open ? "▲" : "▼"}
                        </span>
                      </button>
                      {open && (
                        <div style={{ padding: "0 20px 16px 58px", display: "flex", flexDirection: "column", gap: 6 }}>
                          {m.lessons.map((l) => (
                            <div
                              key={l.title}
                              style={{
                                fontSize: 13.5,
                                color: "var(--text-secondary)",
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span>{l.title}</span>
                              <span className="mono" style={{ fontSize: 10 }}>
                                {l.dur}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginBottom: 40 }}>
                <ForYouCard heading="THIS IS FOR YOU IF" items={STUDIO_FOR_YOU} accent />
                <ForYouCard heading="NOT FOR YOU IF" items={STUDIO_NOT_FOR_YOU} />
              </div>

              <SectionHeading>From learners</SectionHeading>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginBottom: 40 }}>
                {STUDIO_PRODUCT_TESTIMONIALS.map((t) => (
                  <div
                    key={t.who}
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--r-card)",
                      padding: 22,
                    }}
                  >
                    <div style={{ color: "var(--accent)", fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>
                      {t.stars}
                    </div>
                    <p style={{ margin: "0 0 10px", fontSize: 13.5 }}>“{t.text}”</p>
                    <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-secondary)" }}>
                      {t.who}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <SectionHeading>Questions, answered plainly</SectionHeading>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--r-card)",
              background: "var(--card)",
              overflow: "hidden",
            }}
          >
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} style={{ borderBottom: "1px solid var(--border)" }}>
                  <button
                    onClick={() => setOpenFaq(open ? -1 : i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "16px 20px",
                      cursor: "pointer",
                      width: "100%",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14.5, flex: 1 }}>{f.q}</span>
                    <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
                  </button>
                  {open && (
                    <p style={{ padding: "0 20px 18px", margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>
                      {f.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sticky sidebar */}
        <aside style={{ position: "sticky", top: 88 }}>
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-card)",
              padding: 26,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div className="display" style={{ fontWeight: 650, fontSize: 30, color: "var(--accent)" }}>
                {priceLabel(product)}
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>· one year</div>
            </div>
            <Link
              href={`${routes.checkout}?product=${product.slug}`}
              className="plain"
              style={{
                display: "block",
                textAlign: "center",
                background: "var(--ink)",
                color: "#fff",
                borderRadius: "var(--r-card)",
                padding: "14px",
                fontSize: 15,
                fontWeight: 600,
                margin: "18px 0 10px",
              }}
            >
              {product.price === 0 ? "Get free access" : "Buy — one year of access"}
            </Link>
            {product.price > 0 && (
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-secondary)", marginBottom: 16 }}>
                RENEW LATER FROM {renew}/YR
              </div>
            )}
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, margin: 0, padding: 0 }}>
              {product.price > 0 && <Bullet>Bonus course: Create Videos with AI, free</Bullet>}
              {isFlagship && <Bullet>The book Applied AI, Actually Applied, free</Bullet>}
              <Bullet>Access to the 100-project practice library</Bullet>
              <Bullet>Access until {accessUntil}</Bullet>
              {product.price > 0 && <Bullet>No auto-renewal — you&apos;re never charged automatically</Bullet>}
            </ul>
            <p style={{ color: "var(--text-secondary)", fontSize: 11.5, margin: "16px 0 0" }}>
              Payments via Razorpay — UPI, cards, netbanking.
            </p>
          </div>
        </aside>
      </div>
    </Container>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="display" style={{ fontWeight: 650, fontSize: 22, margin: "0 0 16px" }}>
      {children}
    </h2>
  );
}

function ForYouCard({ heading, items, accent }: { heading: string; items: string[]; accent?: boolean }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: 24 }}>
      <div
        className="mono"
        style={{ fontSize: 10, letterSpacing: "0.14em", color: accent ? "var(--accent)" : "var(--text-secondary)", marginBottom: 12 }}
      >
        {heading}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5, color: accent ? undefined : "var(--text-secondary)" }}>
        {items.map((it) => (
          <span key={it}>· {it}</span>
        ))}
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ display: "flex", gap: 10, fontSize: 13.5 }}>
      <span style={{ color: "var(--accent)", fontWeight: 600 }}>✓</span>
      <span>{children}</span>
    </li>
  );
}
