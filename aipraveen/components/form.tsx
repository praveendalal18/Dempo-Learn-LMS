import type { CSSProperties, ReactNode } from "react";

export const fieldStyle: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "var(--r-card)",
  padding: "12px 14px",
  fontSize: 14,
  background: "var(--card)",
  outlineColor: "var(--ink)",
  width: "100%",
};

export const selectStyle: CSSProperties = {
  ...fieldStyle,
  color: "var(--text-secondary)",
};

export const primaryButtonStyle: CSSProperties = {
  background: "var(--ink)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--r-card)",
  padding: "14px",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};

/** Inline confirmation card shown after a form submits. */
export function ConfirmationCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-card)",
        padding: 32,
        textAlign: "center",
      }}
    >
      <div className="display" style={{ fontWeight: 650, fontSize: 20, marginBottom: 6 }}>
        {title}
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>{children}</p>
    </div>
  );
}
