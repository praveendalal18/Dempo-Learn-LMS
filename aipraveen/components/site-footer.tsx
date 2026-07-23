import Link from "next/link";
import { routes } from "@/lib/routes";
import { Logo } from "@/components/logo";

const COL_LINK: React.CSSProperties = {
  fontSize: 13,
  color: "var(--text-secondary)",
  textDecoration: "none",
};

function ColHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mono"
      style={{
        fontSize: 10,
        letterSpacing: "0.14em",
        color: "var(--text-secondary)",
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", background: "var(--card)" }}>
      <div
        style={{
          maxWidth: "var(--w-wide)",
          margin: "0 auto",
          padding: "48px 28px 36px",
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 32,
        }}
      >
        <div>
          <Logo variant="onLight" tagline={false} />
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 13,
              maxWidth: 280,
              margin: "8px 0 0",
            }}
          >
            AI educator, curriculum designer and builder. Goa, India. Every
            purchase includes one year of on-platform access.
          </p>
          <a
            href="https://www.linkedin.com/in/praveen-dalal/"
            target="_blank"
            rel="noreferrer"
            className="mono"
            style={{
              display: "inline-block",
              marginTop: 12,
              fontSize: 11,
              letterSpacing: "0.1em",
              color: "var(--accent)",
              textDecoration: "none",
            }}
          >
            LINKEDIN ↗
          </a>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ColHeading>LEARN</ColHeading>
          <Link href={routes.store} style={COL_LINK}>
            Store
          </Link>
          <Link href={routes.login} style={COL_LINK}>
            Log in
          </Link>
          <Link href={routes.dashboard} style={COL_LINK}>
            My dashboard
          </Link>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ColHeading>FOR STUDENTS</ColHeading>
          <Link href={routes.competitions} style={COL_LINK}>
            Competitions
          </Link>
          <Link href={routes.practice} style={COL_LINK}>
            Practice projects
          </Link>
          <Link href={routes.workshops} style={COL_LINK}>
            Workshops
          </Link>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ColHeading>MORE</ColHeading>
          <Link href={routes.book} style={COL_LINK}>
            Book &amp; Insights
          </Link>
          <Link href={routes.companies} style={COL_LINK}>
            For companies
          </Link>
          <Link href={routes.about} style={COL_LINK}>
            About
          </Link>
          <Link href={routes.testimonials} style={COL_LINK}>
            Testimonials
          </Link>
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <div
          className="mono"
          style={{
            maxWidth: "var(--w-wide)",
            margin: "0 auto",
            padding: "16px 28px",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            fontSize: 10,
            letterSpacing: "0.1em",
            color: "var(--text-secondary)",
          }}
        >
          <span>© 2026 PRAVEEN DALAL · GOA, INDIA</span>
          <span style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link href={routes.terms} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
              TERMS
            </Link>
            <Link href={routes.privacy} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
              PRIVACY
            </Link>
            <Link href={routes.refund} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
              REFUNDS
            </Link>
            <Link href={routes.cookies} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
              COOKIES
            </Link>
          </span>
          <span>UPI · CARDS · NETBANKING</span>
        </div>
      </div>
    </footer>
  );
}
