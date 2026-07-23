"use client";

import { useState } from "react";

export function BookWaitlist() {
  const [joined, setJoined] = useState(false);

  if (joined) {
    return (
      <div style={{ border: "1px solid var(--navy-border)", borderRadius: "var(--r-card)", padding: "18px 22px", display: "inline-block" }}>
        <span style={{ color: "var(--accent-on-navy)", fontWeight: 600 }}>You&apos;re on the list.</span>{" "}
        <span style={{ color: "var(--on-navy-muted)" }}>You&apos;ll get the first chapter before anyone else.</span>
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setJoined(true);
        }}
        style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
      >
        <input
          type="email"
          required
          placeholder="you@college.edu"
          style={{
            background: "var(--ink-deep-3)",
            border: "1px solid var(--navy-border)",
            borderRadius: "var(--r-card)",
            color: "#fff",
            padding: "13px 16px",
            fontSize: 14,
            width: 260,
            outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            background: "#fff",
            color: "var(--ink)",
            border: "none",
            borderRadius: "var(--r-card)",
            padding: "13px 22px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Join the waitlist
        </button>
      </form>
      <p className="mono" style={{ fontSize: 10.5, letterSpacing: "0.08em", color: "var(--on-navy-muted)", margin: "12px 0 0" }}>
        FREE WITH THE ANNUAL STUDIO COURSE · FIRST CHAPTER FREE AT LAUNCH
      </p>
    </>
  );
}
