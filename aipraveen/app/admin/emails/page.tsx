import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatINR, formatDate, oneYearFrom, renewalPrice } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Email templates" };

interface EmailTemplate {
  label: string;
  subject: string;
  heading: string;
  body: string;
  rows?: { k: string; v: string }[];
  cta: string;
  ctaVariant: "primary" | "bronze";
  foot: string;
}

function buildEmails(): EmailTemplate[] {
  const oneYear = formatDate(oneYearFrom());
  const careerRenew = formatINR(renewalPrice(699, 45));
  const in30 = formatDate(new Date(Date.now() + 30 * 86400000));
  const in30plusYear = formatDate(new Date(Date.now() + (30 + 365) * 86400000));

  return [
    {
      label: "EMAIL 1 · PURCHASE RECEIPT",
      subject: "Your receipt — and your first year starts now",
      heading: "You're in, Asha.",
      body: "Payment received. Your access to Build with AI: The Studio Course is live right now and runs for a full year. Everything streams on the platform — nothing to set up.",
      rows: [
        { k: "Order", v: "#AP-2141" },
        { k: "Amount", v: "₹4,999" },
        { k: "Access until", v: oneYear },
      ],
      cta: "Start learning",
      ctaVariant: "primary",
      foot: "Need an invoice with GST details? Reply to this email.",
    },
    {
      label: "EMAIL 2 · MAGIC LINK",
      subject: "Your login link (works for 15 minutes)",
      heading: "Sign in with one click.",
      body: "You asked to log in to aipraveen.com. The button below signs you straight in — no password. If this wasn't you, ignore this email and nothing happens.",
      cta: "Log me in",
      ctaVariant: "primary",
      foot: "Link expires in 15 minutes. Requested from Goa, India.",
    },
    {
      label: "EMAIL 3 · 30-DAY REMINDER",
      subject: "30 days left on your Career Kit — finish strong",
      heading: "One month of access left.",
      body: `Your year with the Student AI Career Kit ends on ${in30}. You've read 14 of 22 resources — a comfortable month's work. Want more time? Renew for ${careerRenew} and keep everything, progress included.`,
      cta: `Renew for ${careerRenew}`,
      ctaVariant: "bronze",
      foot: `Renewing extends you to ${in30plusYear}. No action needed if you're done.`,
    },
    {
      label: "EMAIL 4 · 7-DAY REMINDER",
      subject: "7 days left — your progress is safe either way",
      heading: "Final week of access.",
      body: "Your Career Kit access ends this Sunday. If the year gave you what you needed — that's a win, and you need to do nothing. If you want another year, renew below; your progress is preserved either way, even after expiry.",
      cta: `Renew — ${careerRenew} for one more year`,
      ctaVariant: "primary",
      foot: "You can also renew any time after expiry. Nothing is deleted.",
    },
    {
      label: "EMAIL 5 · COURSE COMPLETE",
      subject: "You finished. That puts you in rare company.",
      heading: "100%. Well done.",
      body: "You completed Build with AI: The Studio Course — every session, including the capstone. Most people never finish online courses; you did. If the course earned it, would you tell future learners what you can do now that you couldn't before? Two sentences is plenty. Every testimonial is read and approved by me personally.",
      cta: "Share a testimonial",
      ctaVariant: "bronze",
      foot: `Your access continues until ${oneYear} — revisit any session, any time.`,
    },
  ];
}

export default async function EmailsPage() {
  await requireAdmin();
  const emails = buildEmails();

  return (
    <div style={{ maxWidth: "var(--w-wide)", margin: "0 auto", padding: "40px 28px 80px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <h1 className="display" style={{ fontWeight: 650, fontSize: 26, margin: 0 }}>
          Transactional emails
        </h1>
        <Link href={routes.admin} style={{ fontSize: 13.5, fontWeight: 600 }}>
          ← Back to admin
        </Link>
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 32px" }}>
        The five templates sent from the platform. In production these send via MSG91 (India); in dev they print to the
        server console.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 28 }}>
        {emails.map((e) => (
          <div key={e.label}>
            <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--text-secondary)", marginBottom: 8 }}>
              {e.label}
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r-card)", overflow: "hidden", background: "var(--card)" }}>
              <div style={{ background: "var(--ink)", color: "#fff", padding: "18px 24px" }}>
                <div className="mono" style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--accent-on-navy)" }}>
                  AIPRAVEEN.COM
                </div>
              </div>
              <div style={{ padding: "24px" }}>
                <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--text-secondary)", marginBottom: 12 }}>
                  SUBJECT: {e.subject}
                </div>
                <div className="display" style={{ fontWeight: 650, fontSize: 20, marginBottom: 12 }}>
                  {e.heading}
                </div>
                <p style={{ fontSize: 14, color: "var(--ink)", margin: "0 0 18px", lineHeight: 1.6 }}>{e.body}</p>
                {e.rows && (
                  <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: "12px 16px", marginBottom: 18 }}>
                    {e.rows.map((r) => (
                      <div key={r.k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                        <span style={{ color: "var(--text-secondary)" }}>{r.k}</span>
                        <span style={{ fontWeight: 600 }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div
                  style={{
                    display: "inline-block",
                    background: e.ctaVariant === "primary" ? "var(--ink)" : "transparent",
                    color: e.ctaVariant === "primary" ? "#fff" : "var(--accent)",
                    border: `1px solid ${e.ctaVariant === "primary" ? "var(--ink)" : "var(--accent)"}`,
                    borderRadius: "var(--r-card)",
                    padding: "11px 20px",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {e.cta}
                </div>
              </div>
              <div className="mono" style={{ borderTop: "1px solid var(--border)", padding: "14px 24px", fontSize: 8.5, letterSpacing: "0.1em", color: "var(--text-secondary)" }}>
                {e.foot}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
