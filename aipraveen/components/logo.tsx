import type { CSSProperties } from "react";

type Variant = "onLight" | "onDark";
type Size = "sm" | "md";

/**
 * AIPD monogram + wordmark. A navy rounded tile with a stacked "AI / PD"
 * monogram (white AI over bronze PD), next to the "AIPD" wordmark and the
 * AIPRAVEEN.COM domain tag. The tile echoes the bronze motif from the avatar.
 */
export function Logo({
  variant = "onLight",
  size = "md",
  tagline = true,
}: {
  variant?: Variant;
  size?: Size;
  tagline?: boolean;
}) {
  const dark = variant === "onDark";
  const tile = size === "sm" ? 28 : 34;
  const wordSize = size === "sm" ? 16 : 18;

  const aiColor = dark ? "#ffffff" : "var(--ink)";
  const pdColor = dark ? "var(--accent-on-navy)" : "var(--accent)";
  const tagColor = dark ? "var(--on-navy-muted)" : "var(--accent)";

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <LogoMark size={tile} dark={dark} />
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
        <span
          className="display"
          style={{ fontWeight: 700, fontSize: wordSize, letterSpacing: "-0.01em", lineHeight: 1 }}
        >
          <span style={{ color: aiColor }}>AI</span>
          <span style={{ color: pdColor }}>PD</span>
        </span>
        {tagline && (
          <span
            className="mono"
            style={{ fontSize: size === "sm" ? 9 : 10, letterSpacing: "0.14em", color: tagColor }}
          >
            AIPRAVEEN.COM
          </span>
        )}
      </span>
    </span>
  );
}

/** The icon-only mark (rounded tile with the stacked AI/PD monogram). */
export function LogoMark({
  size = 34,
  dark = false,
  style,
}: {
  size?: number;
  dark?: boolean;
  style?: CSSProperties;
}) {
  const textStyle: CSSProperties = {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="AIPD"
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      <rect
        x="0.75"
        y="0.75"
        width="38.5"
        height="38.5"
        rx="9"
        fill="#12233F"
        stroke={dark ? "#2A3C5C" : "none"}
        strokeWidth={dark ? 1.5 : 0}
      />
      {/* bronze accent tick, top-right — echoes the avatar's square motif */}
      <rect x="27" y="7" width="6" height="6" rx="1.5" fill="#8A6D2B" />
      <text x="20" y="19" textAnchor="middle" fontSize="13.5" fill="#ffffff" style={textStyle}>
        AI
      </text>
      <text x="20" y="33" textAnchor="middle" fontSize="13.5" fill="#C9B37E" style={textStyle}>
        PD
      </text>
    </svg>
  );
}
