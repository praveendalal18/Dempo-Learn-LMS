"use client";

import { useState } from "react";
import Link from "next/link";
import {
  RESOURCE_DOCS,
  DATASET_ROWS,
  DATASET_TOTAL_ROWS,
} from "@/lib/course";
import { routes } from "@/lib/routes";

export function ViewerClient({
  slug,
  email,
  initialDoc,
}: {
  slug: string;
  email: string;
  initialDoc: number;
}) {
  const [docIndex, setDocIndex] = useState(
    Math.min(Math.max(initialDoc, 0), RESOURCE_DOCS.length - 1),
  );
  const [copied, setCopied] = useState(false);
  const doc = RESOURCE_DOCS[docIndex];

  function copyPrompt() {
    if (doc.prompt) {
      navigator.clipboard?.writeText(doc.prompt).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", minHeight: "calc(100vh - 56px)" }}>
      {/* Contents sidebar */}
      <aside style={{ borderRight: "1px solid var(--border)", background: "var(--card)", padding: "20px 0" }}>
        <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--text-secondary)", padding: "0 20px 12px" }}>
          CONTENTS
        </div>
        {RESOURCE_DOCS.map((d, i) => {
          const active = i === docIndex;
          return (
            <button
              key={d.title}
              onClick={() => {
                setDocIndex(i);
                setCopied(false);
              }}
              style={{
                display: "block",
                width: "calc(100% - 20px)",
                textAlign: "left",
                margin: "2px 10px",
                border: `1px solid ${active ? "var(--border)" : "transparent"}`,
                background: active ? "var(--card)" : "transparent",
                borderRadius: "var(--r-card)",
                padding: "10px 12px",
                cursor: "pointer",
                fontWeight: active ? 600 : 400,
              }}
            >
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--accent)", marginBottom: 2 }}>
                {d.kind}
              </div>
              <div style={{ fontSize: 13 }}>{d.title}</div>
            </button>
          );
        })}
      </aside>

      {/* Document view */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
          <Link href={routes.dashboard} className="plain" style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            ← Dashboard
          </Link>
        </div>

        <div style={{ padding: "36px 48px", flex: 1, maxWidth: 820 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--accent)", marginBottom: 8 }}>
            {doc.kind}
          </div>
          <h1 className="display" style={{ fontWeight: 650, fontSize: 28, margin: "0 0 20px" }}>
            {doc.title}
          </h1>

          {doc.isTable ? (
            <DatasetTable />
          ) : (
            <>
              {doc.p1 && <p style={{ fontSize: 15, margin: "0 0 14px" }}>{doc.p1}</p>}
              {doc.p2 && <p style={{ fontSize: 15, color: "var(--text-secondary)", margin: "0 0 24px" }}>{doc.p2}</p>}
              {doc.prompt && (
                <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r-card)", overflow: "hidden" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 16px",
                      background: "var(--muted-fill)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <span className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--text-secondary)" }}>
                      PROMPT BLOCK
                    </span>
                    <button
                      onClick={copyPrompt}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        color: copied ? "var(--accent)" : "var(--ink)",
                      }}
                    >
                      {copied ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: 16,
                      fontFamily: "var(--font-mono)",
                      fontSize: 12.5,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      background: "var(--card)",
                    }}
                  >
                    {doc.prompt}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>

        {/* Watermark footer */}
        <div
          className="mono"
          style={{
            borderTop: "1px solid var(--border)",
            padding: "12px 24px",
            fontSize: 9,
            letterSpacing: "0.12em",
            color: "var(--faint)",
            textAlign: "center",
          }}
        >
          LICENSED TO {email.toUpperCase()} · VIEW-ONLY · AIPRAVEEN.COM
        </div>
      </div>
    </div>
  );
}

function DatasetTable() {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r-card)", overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--ink)", color: "#fff", textAlign: "left" }}>
              <Th>ID</Th>
              <Th>FEEDBACK</Th>
              <Th>COURSE</Th>
              <Th>TERM</Th>
              <Th>RATING</Th>
            </tr>
          </thead>
          <tbody>
            {DATASET_ROWS.map((r, i) => (
              <tr key={r.id} style={{ background: i % 2 ? "var(--bg)" : "var(--card)" }}>
                <Td>{r.id}</Td>
                <Td>{r.text}</Td>
                <Td>{r.course}</Td>
                <Td>{r.term}</Td>
                <Td>{r.rating}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        className="mono"
        style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", fontSize: 9.5, letterSpacing: "0.1em", color: "var(--text-secondary)" }}
      >
        SHOWING {DATASET_ROWS.length} OF {DATASET_TOTAL_ROWS} ROWS
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", padding: "10px 14px", fontWeight: 600 }}>
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "10px 14px", borderTop: "1px solid var(--border)" }}>{children}</td>;
}
