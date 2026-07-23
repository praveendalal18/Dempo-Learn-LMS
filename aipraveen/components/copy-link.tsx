"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        border: "1px solid var(--border)",
        borderRadius: "var(--r-card)",
        background: "var(--card)",
        padding: "10px 10px 10px 16px",
      }}
    >
      <span className="mono" style={{ fontSize: 12, letterSpacing: "0.04em", color: "var(--text-secondary)", flex: 1 }}>
        {url}
      </span>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(`https://${url}`).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        style={{
          background: copied ? "transparent" : "var(--ink)",
          color: copied ? "var(--accent)" : "#fff",
          border: `1px solid ${copied ? "var(--accent)" : "var(--ink)"}`,
          borderRadius: "var(--r-card)",
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {copied ? "✓ Copied" : "Copy link"}
      </button>
    </div>
  );
}
