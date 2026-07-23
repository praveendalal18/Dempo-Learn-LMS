"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Container } from "@/components/ui";
import { fieldStyle, primaryButtonStyle } from "@/components/form";
import { ConsentCheckbox } from "@/components/consent-checkbox";

export function LoginClient() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container max="narrow" style={{ padding: "96px 28px 120px" }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: 32 }}>
        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✉</div>
            <h1 className="display" style={{ fontWeight: 650, fontSize: 24, margin: "0 0 8px" }}>
              Check your inbox.
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 20px" }}>
              We sent a one-click login link to <strong>{email}</strong>. It works for 15 minutes. No password needed.
            </p>
            <button
              onClick={send}
              disabled={busy}
              style={{
                background: "transparent",
                color: "var(--ink)",
                border: "1px solid var(--ink)",
                borderRadius: "var(--r-card)",
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {busy ? "Sending…" : "Resend link"}
            </button>
          </div>
        ) : (
          <>
            <h1 className="display" style={{ fontWeight: 650, fontSize: 26, margin: "0 0 6px" }}>
              Log in
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 22px" }}>
              Enter your email and we&apos;ll send a magic link — no password.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <input
                type="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={fieldStyle}
              />
              <ConsentCheckbox checked={agreed} onChange={setAgreed} />
              {error && <div style={{ color: "var(--error)", fontSize: 13 }}>{error}</div>}
              <button
                type="submit"
                disabled={busy || !agreed}
                style={{ ...primaryButtonStyle, opacity: busy || !agreed ? 0.5 : 1, cursor: busy || !agreed ? "not-allowed" : "pointer" }}
              >
                {busy ? "Sending…" : "Send login link"}
              </button>
            </form>
            <p style={{ color: "var(--text-secondary)", fontSize: 12, margin: "16px 0 0", textAlign: "center" }}>
              Tip: in local dev the link is printed to the server console.
            </p>
          </>
        )}
      </div>
    </Container>
  );
}
