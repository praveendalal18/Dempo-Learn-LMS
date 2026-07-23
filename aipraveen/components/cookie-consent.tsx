"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { routes } from "@/lib/routes";

const STORAGE_KEY = "aip_cookie_ack";

/**
 * Cookie notice. We only use an essential session cookie, so this is an
 * acknowledgement rather than a tracking opt-in. Shown once until accepted;
 * the acknowledgement is stored locally in the browser.
 */
export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
    } catch {
      /* localStorage unavailable — skip the banner */
    }
  }, []);

  if (!show) return null;

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 60,
        maxWidth: 640,
        margin: "0 auto",
        background: "var(--ink)",
        color: "#fff",
        borderRadius: "var(--r-card)",
        boxShadow: "var(--shadow-panel)",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: "var(--on-navy-muted)", flex: 1, minWidth: 240, lineHeight: 1.5 }}>
        We use a single essential cookie to keep you signed in — no ads or tracking. See our{" "}
        <Link href={routes.cookies} style={{ color: "var(--accent-on-navy)" }}>
          Cookie Policy
        </Link>
        .
      </p>
      <button
        onClick={accept}
        style={{
          background: "#fff",
          color: "var(--ink)",
          border: "none",
          borderRadius: "var(--r-card)",
          padding: "9px 20px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Got it
      </button>
    </div>
  );
}
