/** Presentation helpers for portfolio projects. Data lives in lib/data.ts. */

/**
 * Owner-view chip. Self-published projects show PUBLISHED (green) until Praveen
 * leaves feedback, then FEEDBACK RECEIVED (bronze) so the student acts on it.
 */
export function portfolioChip(hasFeedback: boolean): {
  label: string;
  color: string;
  border: string;
  bg: string;
} {
  if (hasFeedback) {
    return {
      label: "FEEDBACK RECEIVED",
      color: "var(--accent)",
      border: "var(--accent-border)",
      bg: "var(--accent-tint)",
    };
  }
  return {
    label: "PUBLISHED",
    color: "var(--success)",
    border: "var(--success-border)",
    bg: "var(--success-bg)",
  };
}
