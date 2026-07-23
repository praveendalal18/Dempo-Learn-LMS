"use client";

import { useState } from "react";
import Link from "next/link";
import { KIT_CONTENTS } from "@/lib/course";
import { priceLabel, type Product } from "@/lib/catalog";
import { formatDate, oneYearFrom } from "@/lib/format";
import { routes } from "@/lib/routes";
import { Container } from "@/components/ui";

export function KitDetail({ product }: { product: Product }) {
  const [email, setEmail] = useState("");
  const [claimed, setClaimed] = useState(false);
  const isFree = product.price === 0;
  const accessUntil = formatDate(oneYearFrom());

  return (
    <Container max="detail" style={{ padding: "48px 28px 88px" }}>
      <div
        className="mono"
        style={{ fontSize: 10.5, letterSpacing: "0.1em", color: "var(--text-secondary)", marginBottom: 22 }}
      >
        <Link href={routes.store} className="plain" style={{ color: "var(--accent)" }}>
          STORE
        </Link>{" "}
        / STARTER KIT
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 48, alignItems: "start" }}>
        <div>
          <h1
            className="display"
            style={{ fontWeight: 650, fontSize: 38, letterSpacing: "-0.02em", margin: "0 0 12px" }}
          >
            {product.title}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 16, margin: "0 0 32px" }}>
            {product.outcome}
          </p>

          <h2 className="display" style={{ fontWeight: 650, fontSize: 22, margin: "0 0 16px" }}>
            What&apos;s inside
          </h2>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--r-card)",
              background: "var(--card)",
              overflow: "hidden",
              marginBottom: 40,
            }}
          >
            {KIT_CONTENTS.map((it, i) => (
              <div
                key={it.title}
                style={{
                  display: "grid",
                  gridTemplateColumns: "110px 1fr auto",
                  gap: 16,
                  alignItems: "center",
                  padding: "13px 20px",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                }}
              >
                <span className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--accent)" }}>
                  {it.kind}
                </span>
                <span style={{ fontSize: 14 }}>{it.title}</span>
                <span className="mono" style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--text-secondary)" }}>
                  {it.len}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              background: "var(--accent-tint)",
              border: "1px solid var(--accent-border)",
              borderRadius: "var(--r-card)",
              padding: 24,
            }}
          >
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--accent)", marginBottom: 8 }}>
              WHAT HAPPENS AFTER A YEAR
            </div>
            <p style={{ margin: 0, fontSize: 14, color: "var(--ink)" }}>
              Your access ends after one year, but nothing is deleted — your reading progress is saved. Renew any time to
              pick up exactly where you left off.
            </p>
          </div>
        </div>

        <aside style={{ position: "sticky", top: 88 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: 26 }}>
            <div className="display" style={{ fontWeight: 650, fontSize: 30, color: "var(--accent)" }}>
              {priceLabel(product)}
            </div>
            <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--text-secondary)", margin: "4px 0 18px" }}>
              1-YEAR ACCESS · ACCESS UNTIL {accessUntil.toUpperCase()}
            </div>

            {isFree ? (
              claimed ? (
                <div
                  style={{
                    border: "1px solid var(--success-border)",
                    background: "var(--success-bg)",
                    borderRadius: "var(--r-card)",
                    padding: 18,
                    fontSize: 14,
                  }}
                >
                  <strong style={{ color: "var(--success)" }}>Check your inbox.</strong> We sent a login link to{" "}
                  {email || "your email"} — open it to start reading.
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setClaimed(true);
                  }}
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <input
                    type="email"
                    required
                    placeholder="you@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                  />
                  <button type="submit" style={primaryBtn}>
                    Get free access
                  </button>
                </form>
              )
            ) : (
              <Link href={`${routes.checkout}?product=${product.slug}`} className="plain" style={{ ...primaryBtn, display: "block", textAlign: "center" }}>
                Buy — one year of access
              </Link>
            )}
            <p style={{ color: "var(--text-secondary)", fontSize: 11.5, margin: "16px 0 0" }}>
              {isFree
                ? "Your login and receipts go to this email. No password — a magic link signs you in."
                : "Payments via Razorpay — UPI, cards, netbanking. All sales final."}
            </p>
          </div>
        </aside>
      </div>
    </Container>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "var(--r-card)",
  padding: "12px 14px",
  fontSize: 14,
  background: "var(--card)",
  outlineColor: "var(--ink)",
};

const primaryBtn: React.CSSProperties = {
  background: "var(--ink)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--r-card)",
  padding: "14px",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};
