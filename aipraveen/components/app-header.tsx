import Link from "next/link";
import { routes } from "@/lib/routes";
import { Logo } from "@/components/logo";

const NAV = [
  { label: "Dashboard", href: routes.dashboard },
  { label: "Portfolio", href: routes.portfolio },
  { label: "Practice", href: routes.practice },
  { label: "Store", href: routes.store },
];

/** Navy 56px learner-app header. */
export function AppHeader({ email }: { email: string }) {
  return (
    <header style={{ background: "var(--ink)", color: "#fff", height: 56, display: "flex", alignItems: "center" }}>
      <div
        style={{
          maxWidth: "var(--w-wide)",
          margin: "0 auto",
          width: "100%",
          padding: "0 28px",
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        <Link href={routes.home} className="plain" style={{ display: "flex" }}>
          <Logo variant="onDark" size="sm" tagline={false} />
        </Link>
        <nav style={{ display: "flex", gap: 18, marginLeft: 8 }}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="plain" style={{ color: "var(--on-navy-muted)", fontSize: 13.5, fontWeight: 500 }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: "0.06em", color: "var(--on-navy-muted)" }}>
            {email}
          </span>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              style={{
                background: "transparent",
                color: "#fff",
                border: "1px solid var(--navy-border)",
                borderRadius: "var(--r-card)",
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
