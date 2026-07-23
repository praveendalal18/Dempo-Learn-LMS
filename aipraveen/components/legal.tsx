import { Container, Eyebrow } from "@/components/ui";

export function LegalShell({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <Container max="prose" style={{ padding: "64px 28px 88px" }}>
      <Eyebrow style={{ marginBottom: 14 }}>LEGAL</Eyebrow>
      <h1
        className="display"
        style={{ fontWeight: 650, fontSize: 38, letterSpacing: "-0.02em", margin: "0 0 8px" }}
      >
        {title}
      </h1>
      <div
        className="mono"
        style={{ fontSize: 10.5, letterSpacing: "0.1em", color: "var(--text-secondary)", marginBottom: 28 }}
      >
        LAST UPDATED: {updated}
      </div>
      {intro && (
        <p style={{ fontSize: 15.5, color: "var(--text-secondary)", margin: "0 0 8px", lineHeight: 1.7 }}>
          {intro}
        </p>
      )}
      <div style={{ maxWidth: 720 }}>{children}</div>
    </Container>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 32 }}>
      <h2 className="display" style={{ fontWeight: 650, fontSize: 20, margin: "0 0 12px" }}>
        {heading}
      </h2>
      {children}
    </section>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--ink)", margin: "0 0 12px" }}>
      {children}
    </p>
  );
}

export function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul style={{ margin: "0 0 12px", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
      {children}
    </ul>
  );
}

export function LI({ children }: { children: React.ReactNode }) {
  return <li style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)" }}>{children}</li>;
}
