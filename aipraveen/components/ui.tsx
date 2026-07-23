import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

type MaxWidth =
  | "wide"
  | "detail"
  | "prose"
  | "email"
  | "form"
  | "checkout"
  | "success"
  | "narrow";

const MAX: Record<MaxWidth, string> = {
  wide: "var(--w-wide)",
  detail: "var(--w-detail)",
  prose: "var(--w-prose)",
  email: "var(--w-email)",
  form: "var(--w-form)",
  checkout: "var(--w-checkout)",
  success: "var(--w-success)",
  narrow: "var(--w-narrow)",
};

/** Centered content column at one of the design's fixed max-widths. */
export function Container({
  max = "wide",
  children,
  style,
  className,
}: {
  max?: MaxWidth;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        maxWidth: MAX[max],
        margin: "0 auto",
        paddingLeft: 28,
        paddingRight: 28,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Mono uppercase bronze eyebrow label. */
export function Eyebrow({
  children,
  color = "var(--accent)",
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className="mono"
      style={{
        fontSize: 11,
        letterSpacing: "0.16em",
        color,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Small mono uppercase meta label. */
export function Mono({
  children,
  size = 10,
  color = "var(--text-secondary)",
  style,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className="mono"
      style={{ fontSize: size, letterSpacing: "0.14em", color, ...style }}
    >
      {children}
    </span>
  );
}

type ButtonVariant = "primary" | "secondary" | "bronze";

const BTN_BASE: CSSProperties = {
  borderRadius: "var(--r-card)",
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-block",
  textDecoration: "none",
  textAlign: "center",
  lineHeight: 1.2,
};

function variantStyle(variant: ButtonVariant): CSSProperties {
  switch (variant) {
    case "secondary":
      return {
        background: "transparent",
        color: "var(--ink)",
        border: "1px solid var(--ink)",
      };
    case "bronze":
      return {
        background: "transparent",
        color: "var(--accent)",
        border: "1px solid var(--accent)",
      };
    default:
      return {
        background: "var(--ink)",
        color: "#fff",
        border: "1px solid var(--ink)",
      };
  }
}

/** Link styled as a button (primary/secondary/bronze). */
export function ButtonLink({
  href,
  variant = "primary",
  children,
  style,
}: {
  href: string;
  variant?: ButtonVariant;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <Link
      href={href}
      className="plain"
      style={{
        ...BTN_BASE,
        ...variantStyle(variant),
        padding: "13px 24px",
        fontSize: 15,
        ...style,
      }}
    >
      {children}
    </Link>
  );
}

/** Status/kind chip: mono uppercase, tinted background with matching border. */
export function Chip({
  children,
  color = "var(--text-secondary)",
  border = "var(--border)",
  bg = "var(--muted-fill)",
  style,
}: {
  children: ReactNode;
  color?: string;
  border?: string;
  bg?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className="mono"
      style={{
        fontSize: 9.5,
        letterSpacing: "0.1em",
        color,
        border: `1px solid ${border}`,
        background: bg,
        borderRadius: "var(--r-chip)",
        padding: "3px 9px",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
