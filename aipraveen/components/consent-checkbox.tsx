import Link from "next/link";
import { routes } from "@/lib/routes";

const linkStyle: React.CSSProperties = { fontWeight: 600 };

/**
 * Required agreement checkbox for signup and checkout. `includeRefund` adds the
 * Refund Policy + "all sales are final" acknowledgement for purchases.
 */
export function ConsentCheckbox({
  checked,
  onChange,
  includeRefund = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  includeRefund?: boolean;
}) {
  return (
    <label
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        fontSize: 12.5,
        lineHeight: 1.5,
        color: "var(--text-secondary)",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 2, flexShrink: 0 }}
      />
      <span>
        I agree to the <Link href={routes.terms} style={linkStyle}>Terms</Link>,{" "}
        {includeRefund && (
          <>
            <Link href={routes.refund} style={linkStyle}>Refund Policy</Link>,{" "}
          </>
        )}
        <Link href={routes.privacy} style={linkStyle}>Privacy Policy</Link> and{" "}
        <Link href={routes.cookies} style={linkStyle}>Cookie Policy</Link>
        {includeRefund ? ", and understand all sales are final." : "."}
      </span>
    </label>
  );
}
