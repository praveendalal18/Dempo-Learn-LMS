import Link from "next/link";
import { Container, Eyebrow, ButtonLink } from "@/components/ui";
import { routes } from "@/lib/routes";
import { STATS, HOME_STEPS, HOME_TESTIMONIALS } from "@/lib/content";
import { featuredProducts, priceLabel } from "@/lib/catalog";

/** 10×6 course-structure grid: navy foundation (0–2), bronze build/capstone (44,52,57–59). */
function gridCells() {
  const cells: { bg: string; border: string }[] = [];
  for (let i = 0; i < 60; i++) {
    let bg = "var(--muted-fill)";
    let border = "var(--border)";
    if (i < 3) {
      bg = "var(--ink)";
      border = "var(--ink)";
    }
    if (i === 44 || i === 52 || i >= 57) {
      bg = "var(--accent)";
      border = "var(--accent)";
    }
    cells.push({ bg, border });
  }
  return cells;
}

export default function HomePage() {
  const featured = featuredProducts();

  return (
    <>
      {/* Hero */}
      <Container style={{ padding: "84px 28px 72px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 1fr",
            gap: 64,
            alignItems: "center",
          }}
        >
          <div>
            <Eyebrow style={{ marginBottom: 18 }}>
              AI EDUCATION FOR STUDENTS · ACROSS INDIA
            </Eyebrow>
            <h1
              className="display"
              style={{
                fontWeight: 650,
                fontSize: 54,
                lineHeight: 1.06,
                letterSpacing: "-0.02em",
                margin: "0 0 22px",
              }}
            >
              Learn AI. Build real things. Get seen.
            </h1>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: 17,
                maxWidth: 480,
                margin: "0 0 30px",
              }}
            >
              Self-paced courses, 100 industry practice projects, national build
              competitions, and a reviewed portfolio recruiters can open. One
              year of access with every purchase — the book comes free with the
              annual course.
            </p>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <ButtonLink href={routes.store} variant="primary">
                Browse the store
              </ButtonLink>
              <ButtonLink href={routes.competitions} variant="bronze">
                See live competitions
              </ButtonLink>
            </div>
          </div>
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(10, 1fr)",
                gap: 5,
                maxWidth: 420,
              }}
            >
              {gridCells().map((c, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 2,
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                  }}
                />
              ))}
            </div>
            <div
              className="mono"
              style={{
                display: "flex",
                gap: 18,
                marginTop: 16,
                fontSize: 10.5,
                letterSpacing: "0.08em",
                color: "var(--text-secondary)",
              }}
            >
              <LegendDot color="var(--ink)" label="FOUNDATION" />
              <LegendDot
                color="var(--muted-fill)"
                border="var(--border)"
                label="STUDIO"
              />
              <LegendDot color="var(--accent)" label="BUILD & CAPSTONE" />
            </div>
            <p
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: "0.06em",
                color: "var(--text-secondary)",
                margin: "10px 0 0",
              }}
            >
              ONE 30-HOUR COURSE · 60 SESSIONS · MOSTLY STUDIO
            </p>
          </div>
        </div>
      </Container>

      {/* Stats strip */}
      <section
        style={{
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          background: "var(--card)",
        }}
      >
        <Container
          style={{
            padding: "26px 28px",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 24,
          }}
        >
          {STATS.map((s) => (
            <div key={s.label}>
              <div
                className="display"
                style={{ fontWeight: 650, fontSize: 28 }}
              >
                {s.n}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 10.5,
                  letterSpacing: "0.12em",
                  color: "var(--text-secondary)",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </Container>
      </section>

      {/* Featured products */}
      <Container style={{ padding: "72px 28px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <h2 className="display" style={{ fontWeight: 650, fontSize: 30, margin: 0 }}>
            Start building this week
          </h2>
          <Link href={routes.store} style={{ fontSize: 14, fontWeight: 600 }}>
            See all products →
          </Link>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 22,
          }}
        >
          {featured.map((p) => (
            <Link
              key={p.id}
              href={routes.product(p.slug)}
              className="plain"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-card)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                color: "var(--ink)",
              }}
            >
              <div
                style={{
                  background: p.thumbBg,
                  padding: "26px 22px",
                  minHeight: 130,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    color: "var(--accent-on-navy)",
                  }}
                >
                  {p.kindLabel}
                </div>
                <div
                  className="display"
                  style={{
                    fontWeight: 650,
                    fontSize: 21,
                    lineHeight: 1.15,
                    color: "#fff",
                  }}
                >
                  {p.title}
                </div>
              </div>
              <div
                style={{
                  padding: "18px 22px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  flex: 1,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-secondary)",
                    fontSize: 13.5,
                    flex: 1,
                  }}
                >
                  {p.outcome}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{ fontWeight: 600, fontSize: 17, color: "var(--accent)" }}
                    >
                      {priceLabel(p)}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 9.5,
                        letterSpacing: "0.14em",
                        color: "var(--text-secondary)",
                      }}
                    >
                      1-YEAR ACCESS
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      border: "1px solid var(--ink)",
                      borderRadius: "var(--r-card)",
                      padding: "7px 14px",
                    }}
                  >
                    View
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Container>

      {/* 3-step strip */}
      <section
        style={{
          background: "var(--card)",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Container
          style={{
            padding: "56px 28px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 32,
          }}
        >
          {HOME_STEPS.map((st) => (
            <div key={st.n} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div
                className="mono"
                style={{
                  fontSize: 12,
                  color: "var(--accent)",
                  border: "1px solid var(--accent)",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {st.n}
              </div>
              <div>
                <div
                  className="display"
                  style={{ fontWeight: 600, fontSize: 17, marginBottom: 4 }}
                >
                  {st.t}
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>
                  {st.d}
                </div>
              </div>
            </div>
          ))}
        </Container>
      </section>

      {/* Compete & get seen */}
      <Container style={{ padding: "72px 28px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 56,
            alignItems: "center",
          }}
        >
          <div>
            <Eyebrow style={{ marginBottom: 14 }}>COMPETE &amp; GET SEEN</Eyebrow>
            <h2
              className="display"
              style={{ fontWeight: 650, fontSize: 30, margin: "0 0 14px" }}
            >
              Build-offs with real prizes, judged by industry.
            </h2>
            <p
              style={{
                color: "var(--text-secondary)",
                margin: "0 0 24px",
                maxWidth: 440,
              }}
            >
              Register for national student competitions, ship your entry from
              your portfolio, and put your work in front of the companies
              sponsoring the prize.
            </p>
            <ButtonLink
              href={routes.competitions}
              variant="secondary"
              style={{ padding: "12px 22px", fontSize: 14 }}
            >
              Explore competitions
            </ButtonLink>
          </div>
          <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 56 }}>
            {HOME_TESTIMONIALS.map((t) => (
              <div key={t.who} style={{ marginBottom: 26 }}>
                <p style={{ margin: "0 0 8px", fontSize: 15 }}>“{t.text}”</p>
                <div
                  className="mono"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: "0.1em",
                    color: "var(--text-secondary)",
                  }}
                >
                  {t.who}
                </div>
              </div>
            ))}
            <Link
              href={routes.testimonials}
              style={{ fontSize: 13.5, fontWeight: 600 }}
            >
              All testimonials →
            </Link>
          </div>
        </div>
      </Container>

      {/* Book strip */}
      <section style={{ background: "var(--ink)", color: "#fff" }}>
        <Container
          style={{
            padding: "52px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 32,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              className="mono"
              style={{
                fontSize: 10.5,
                letterSpacing: "0.16em",
                color: "var(--accent-on-navy)",
                marginBottom: 8,
              }}
            >
              THE BOOK · COMING 2027
            </div>
            <div className="display" style={{ fontWeight: 650, fontSize: 24 }}>
              Applied AI, Actually Applied
            </div>
            <div
              style={{ color: "var(--on-navy-muted)", fontSize: 14, marginTop: 4 }}
            >
              Free with the annual Studio Course — or join the waitlist.
            </div>
          </div>
          <ButtonLink
            href={routes.book}
            style={{ background: "#fff", color: "var(--ink)", border: "none" }}
          >
            Join waitlist
          </ButtonLink>
        </Container>
      </section>
    </>
  );
}

function LegendDot({
  color,
  border,
  label,
}: {
  color: string;
  border?: string;
  label: string;
}) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 9,
          height: 9,
          background: color,
          border: border ? `1px solid ${border}` : undefined,
          borderRadius: 2,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}
