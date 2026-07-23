"use client";

import { useState } from "react";
import { fieldStyle, selectStyle, primaryButtonStyle } from "@/components/form";
import { TESTIMONIAL_PRODUCT_OPTIONS } from "@/lib/content";

export function TestimonialForm() {
  const [sent, setSent] = useState(false);
  const [consent, setConsent] = useState(false);

  if (sent) {
    return (
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--r-card)",
          padding: 32,
          textAlign: "center",
          background: "var(--bg)",
        }}
      >
        <div className="display" style={{ fontWeight: 650, fontSize: 20, marginBottom: 6 }}>
          Thank you.
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>
          Your testimonial is in the review queue. If approved, it appears on this page within a few days.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (consent) setSent(true);
      }}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <input required placeholder="Name" style={fieldStyle} />
        <input required placeholder="Role" style={fieldStyle} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <select style={selectStyle} defaultValue="">
          <option value="" disabled>
            Which product?
          </option>
          {TESTIMONIAL_PRODUCT_OPTIONS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select style={selectStyle} defaultValue="">
          <option value="" disabled>
            Rating
          </option>
          <option>★★★★★</option>
          <option>★★★★</option>
          <option>★★★</option>
        </select>
      </div>
      <textarea
        required
        placeholder="What could you do afterwards that you couldn't before?"
        rows={4}
        style={{ ...fieldStyle, resize: "vertical" }}
      />
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
        I consent to my name, role and words being published on aipraveen.com.
      </label>
      <button type="submit" disabled={!consent} style={{ ...primaryButtonStyle, opacity: consent ? 1 : 0.5, cursor: consent ? "pointer" : "not-allowed" }}>
        Submit for review
      </button>
    </form>
  );
}
