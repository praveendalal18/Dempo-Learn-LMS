"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ADMIN_TABS,
  type AdminTab,
  KPIS,
  REVENUE_BARS,
  EXPIRING_SOON,
  ADMIN_PRODUCTS,
  ADMIN_ORDERS,
  ACCESS_ROWS,
  TESTIMONIAL_QUEUE,
  INDUSTRY_PIPELINE,
  type OrderChip,
  type AccessChip,
} from "@/lib/admin";
import { routes } from "@/lib/routes";
import { Logo } from "@/components/logo";
import { sendFeedback } from "@/app/admin/actions";

export interface AdminSubmission {
  id: string;
  title: string;
  briefId: string;
  briefTitle: string;
  description: string;
  userName: string;
  userEmail: string;
  techStack: string[];
  links: { label: string; url: string }[];
  feedback: string | null;
  reviewed: boolean;
}

export function AdminClient({ submissions }: { submissions: AdminSubmission[] }) {
  const [tab, setTab] = useState<AdminTab>("Dashboard");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside style={{ background: "var(--ink)", color: "#fff", padding: "24px 0" }}>
        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          <Logo variant="onDark" size="sm" tagline={false} />
          <div className="mono" style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--accent-on-navy)" }}>
            ADMIN
          </div>
        </div>
        {ADMIN_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              border: "none",
              cursor: "pointer",
              padding: "11px 24px",
              fontSize: 13.5,
              fontWeight: tab === t ? 600 : 400,
              color: tab === t ? "#fff" : "var(--on-navy-muted)",
              background: tab === t ? "var(--ink-hover)" : "transparent",
            }}
          >
            {t}
          </button>
        ))}
        <div style={{ padding: "24px 24px 0" }}>
          <Link href={routes.emails} className="plain" style={{ color: "var(--on-navy-muted)", fontSize: 12 }}>
            Email templates →
          </Link>
        </div>
      </aside>

      {/* Content */}
      <div style={{ padding: "32px 40px 60px", background: "var(--bg)" }}>
        <h1 className="display" style={{ fontWeight: 650, fontSize: 26, margin: "0 0 24px" }}>
          {tab}
        </h1>
        {tab === "Dashboard" && <Dashboard onSeeAccess={() => setTab("Access")} />}
        {tab === "Products" && <Products />}
        {tab === "Orders" && <Orders />}
        {tab === "Access" && <Access />}
        {tab === "Submissions" && <Submissions submissions={submissions} />}
        {tab === "Testimonials" && <Testimonials />}
        {tab === "Industry" && <Industry />}
      </div>
    </div>
  );
}

function Dashboard({ onSeeAccess }: { onSeeAccess: () => void }) {
  const max = Math.max(...REVENUE_BARS);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, marginBottom: 32 }}>
        {KPIS.map((k) => (
          <div key={k.label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: 20 }}>
            <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--text-secondary)", marginBottom: 10 }}>
              {k.label}
            </div>
            <div className="display" style={{ fontWeight: 650, fontSize: 28 }}>
              {k.value}
            </div>
            <div style={{ fontSize: 12, color: k.positive ? "var(--success)" : "var(--text-secondary)", marginTop: 4 }}>
              {k.delta}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 24 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: 24 }}>
          <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--text-secondary)", marginBottom: 20 }}>
            REVENUE · LAST 8 WEEKS
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 160 }}>
            {REVENUE_BARS.map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${(h / max) * 100}%`,
                  background: i === REVENUE_BARS.length - 1 ? "var(--accent)" : "var(--ink)",
                  borderRadius: "3px 3px 0 0",
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--text-secondary)" }}>
              EXPIRING SOON
            </div>
            <button onClick={onSeeAccess} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
              See all →
            </button>
          </div>
          {EXPIRING_SOON.map((e) => (
            <div key={e.who} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--border)", fontSize: 13 }}>
              <span>{e.who}</span>
              <span className="mono" style={{ fontSize: 10, color: "var(--accent)" }}>{e.when}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-card)", overflow: "hidden" }}>
      {children}
    </div>
  );
}

function Products() {
  return (
    <Card>
      <Table head={["PRODUCT", "KIND", "PRICE", "SALES", "RENEWAL"]}>
        {ADMIN_PRODUCTS.map((p) => (
          <tr key={p.title} style={{ borderTop: "1px solid var(--border)" }}>
            <Td>{p.title}</Td>
            <Td muted>{p.kind}</Td>
            <Td>{p.price}</Td>
            <Td>{p.sales}</Td>
            <Td>{p.renew}</Td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

const ORDER_CHIP: Record<OrderChip, { c: string; b: string; bg: string }> = {
  PAID: { c: "var(--success)", b: "var(--success-border)", bg: "var(--success-bg)" },
  RENEWAL: { c: "var(--accent)", b: "var(--accent-border)", bg: "var(--accent-tint)" },
  REFUNDED: { c: "var(--text-secondary)", b: "var(--border)", bg: "var(--muted-fill)" },
  FREE: { c: "var(--text-secondary)", b: "var(--border)", bg: "var(--muted-fill)" },
  FAILED: { c: "var(--error)", b: "var(--error-border)", bg: "var(--error-bg)" },
};

function Orders() {
  return (
    <Card>
      <Table head={["ORDER", "CUSTOMER", "PRODUCT", "AMOUNT", "STATUS", ""]}>
        {ADMIN_ORDERS.map((o) => {
          const chip = ORDER_CHIP[o.status];
          return (
            <tr key={o.id} style={{ borderTop: "1px solid var(--border)" }}>
              <Td>{o.id}</Td>
              <Td muted>{o.who}</Td>
              <Td>{o.product}</Td>
              <Td>{o.amount}</Td>
              <Td>
                <Pill c={chip.c} b={chip.b} bg={chip.bg}>{o.status}</Pill>
              </Td>
              <Td>{o.canRefund && <SmallBtn>Refund</SmallBtn>}</Td>
            </tr>
          );
        })}
      </Table>
    </Card>
  );
}

const ACCESS_CHIP: Record<AccessChip, { c: string; b: string; bg: string }> = {
  ACTIVE: { c: "var(--success)", b: "var(--success-border)", bg: "var(--success-bg)" },
  EXPIRING: { c: "var(--accent)", b: "var(--accent-border)", bg: "var(--accent-tint)" },
  EXPIRED: { c: "var(--text-secondary)", b: "var(--border)", bg: "var(--muted-fill)" },
};

function Access() {
  return (
    <Card>
      <Table head={["LEARNER", "PRODUCT", "EXPIRES", "STATUS", ""]}>
        {ACCESS_ROWS.map((r, i) => {
          const chip = ACCESS_CHIP[r.status];
          return (
            <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
              <Td muted>{r.email}</Td>
              <Td>{r.product}</Td>
              <Td>{r.expires}</Td>
              <Td>
                <Pill c={chip.c} b={chip.b} bg={chip.bg}>{r.status}</Pill>
              </Td>
              <Td><SmallBtn>Extend +1y</SmallBtn></Td>
            </tr>
          );
        })}
      </Table>
    </Card>
  );
}

function Submissions({ submissions }: { submissions: AdminSubmission[] }) {
  if (submissions.length === 0) {
    return <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No submissions yet.</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {submissions.map((s) => (
        <SubmissionCard key={s.id} sub={s} />
      ))}
    </div>
  );
}

function SubmissionCard({ sub }: { sub: AdminSubmission }) {
  const [text, setText] = useState(sub.feedback ?? "");
  const [reviewed, setReviewed] = useState(sub.reviewed);
  const [busy, setBusy] = useState(false);
  const [justSent, setJustSent] = useState(false);

  async function send() {
    setBusy(true);
    const res = await sendFeedback(sub.id, text);
    setBusy(false);
    if (res.ok) {
      setReviewed(true);
      setJustSent(true);
      setTimeout(() => setJustSent(false), 2500);
    }
  }

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--accent)" }}>
          {sub.briefId} · {sub.briefTitle}
        </div>
        <Pill
          c={reviewed ? "var(--accent)" : "var(--text-secondary)"}
          b={reviewed ? "var(--accent-border)" : "var(--border)"}
          bg={reviewed ? "var(--accent-tint)" : "var(--muted-fill)"}
        >
          {reviewed ? "REVIEWED" : "AWAITING REVIEW"}
        </Pill>
      </div>
      <div className="display" style={{ fontWeight: 650, fontSize: 17, marginBottom: 4 }}>{sub.title}</div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
        {sub.userName} · {sub.userEmail}
      </div>
      <p style={{ fontSize: 13.5, margin: "0 0 10px" }}>{sub.description}</p>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
        {sub.links.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 600 }}>
            {l.label} ↗
          </a>
        ))}
      </div>
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--text-secondary)", marginBottom: 8 }}>
          FEEDBACK TO THE STUDENT
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="What's strong, and the one change that would make this recruiter-ready…"
          style={{ width: "100%", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: "10px 12px", fontSize: 13.5, resize: "vertical", outlineColor: "var(--ink)" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
          <button
            onClick={send}
            disabled={busy || !text.trim()}
            style={{ background: "var(--ink)", color: "#fff", border: "none", borderRadius: "var(--r-card)", padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: busy || !text.trim() ? "not-allowed" : "pointer", opacity: busy || !text.trim() ? 0.5 : 1 }}
          >
            {busy ? "Sending…" : reviewed ? "Update feedback" : "Send feedback"}
          </button>
          {justSent && (
            <span className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--success)" }}>
              ✓ SENT — STUDENT CAN SEE IT
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Testimonials() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {TESTIMONIAL_QUEUE.map((t) => (
        <div key={t.name} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: 22 }}>
          <div style={{ color: "var(--accent)", fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>{t.stars}</div>
          <p style={{ margin: "0 0 10px", fontSize: 14 }}>“{t.text}”</p>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
          <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--text-secondary)", margin: "2px 0 16px" }}>{t.meta}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <PrimaryBtn>Approve &amp; publish</PrimaryBtn>
            <SmallBtn>Decline</SmallBtn>
          </div>
        </div>
      ))}
    </div>
  );
}

function Industry() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
      {INDUSTRY_PIPELINE.map((col) => (
        <div key={col.label}>
          <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--text-secondary)", marginBottom: 12 }}>
            {col.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {col.cards.map((c) => (
              <div key={c.inst} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.inst}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: "2px 0 8px" }}>{c.who}</div>
                <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--accent)" }}>{c.prog}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- small presentational helpers ---- */
function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--strip)", textAlign: "left" }}>
            {head.map((h, i) => (
              <th key={i} className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function Td({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <td style={{ padding: "12px 16px", color: muted ? "var(--text-secondary)" : undefined }}>{children}</td>;
}
function Pill({ children, c, b, bg }: { children: React.ReactNode; c: string; b: string; bg: string }) {
  return (
    <span className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: c, border: `1px solid ${b}`, background: bg, borderRadius: "var(--r-chip)", padding: "3px 8px" }}>
      {children}
    </span>
  );
}
function SmallBtn({ children }: { children: React.ReactNode }) {
  return (
    <button style={{ background: "transparent", color: "var(--ink)", border: "1px solid var(--ink)", borderRadius: "var(--r-card)", padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
      {children}
    </button>
  );
}
function PrimaryBtn({ children }: { children: React.ReactNode }) {
  return (
    <button style={{ background: "var(--ink)", color: "#fff", border: "none", borderRadius: "var(--r-card)", padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
      {children}
    </button>
  );
}
