"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CURRICULUM, FLAT_LESSONS, LESSON_RESOURCES } from "@/lib/course";
import { routes } from "@/lib/routes";
import { setLesson } from "@/app/(app)/learn/actions";

export function PlayerClient({
  productId,
  slug,
  title,
  accessUntil,
  initialCompleted,
  initialLesson,
}: {
  productId: string;
  slug: string;
  title: string;
  accessUntil: string;
  initialCompleted: string[];
  initialLesson: number;
}) {
  const [completed, setCompleted] = useState<Set<string>>(new Set(initialCompleted));
  const [current, setCurrent] = useState(initialLesson);

  // Flat lessons with their module label + key (index string).
  const flat = FLAT_LESSONS;
  const total = flat.length;
  const percent = Math.round((completed.size / total) * 100);
  const lesson = flat[current];
  const key = String(current);

  // Build module → lessons with global indices for the sidebar.
  const grouped = useMemo(() => {
    let idx = 0;
    return CURRICULUM.map((m) => ({
      label: `${m.num} · ${m.title}`,
      lessons: m.lessons.map((l) => ({ ...l, index: idx++ })),
    }));
  }, []);

  function persist(k: string, done: boolean) {
    void setLesson(productId, k, done);
  }

  function toggleComplete() {
    const done = !completed.has(key);
    const next = new Set(completed);
    if (done) next.add(key);
    else next.delete(key);
    setCompleted(next);
    persist(key, done);
  }

  function nextLesson() {
    if (!completed.has(key)) {
      const next = new Set(completed);
      next.add(key);
      setCompleted(next);
      persist(key, true);
    }
    setCurrent((c) => Math.min(c + 1, total - 1));
  }

  const isDone = completed.has(key);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 56px)" }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 24px",
          borderBottom: "1px solid var(--border)",
          background: "var(--card)",
        }}
      >
        <Link href={routes.dashboard} className="plain" style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          ← Dashboard
        </Link>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
        <div className="mono" style={{ marginLeft: "auto", fontSize: 10, letterSpacing: "0.1em", color: "var(--text-secondary)" }}>
          ACCESS UNTIL {accessUntil.toUpperCase()} · {percent}% COMPLETE
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", flex: 1 }}>
        {/* Sidebar */}
        <aside style={{ borderRight: "1px solid var(--border)", background: "var(--card)", overflowY: "auto" }}>
          {grouped.map((m) => (
            <div key={m.label} style={{ borderBottom: "1px solid var(--border)", padding: "14px 0" }}>
              <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--text-secondary)", padding: "0 20px 8px" }}>
                {m.label}
              </div>
              {m.lessons.map((l) => {
                const done = completed.has(String(l.index));
                const active = l.index === current;
                return (
                  <button
                    key={l.index}
                    onClick={() => setCurrent(l.index)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      cursor: "pointer",
                      padding: "8px 20px",
                      background: active ? "var(--muted-fill)" : "transparent",
                      fontWeight: active ? 600 : 400,
                      color: active ? "var(--ink)" : "var(--text-secondary)",
                      fontSize: 13,
                    }}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        border: `1.5px solid ${done ? "var(--ink)" : "#C7CBD2"}`,
                        background: done ? "var(--ink)" : "transparent",
                        color: "#fff",
                        fontSize: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {done ? "✓" : ""}
                    </span>
                    <span style={{ flex: 1 }}>{l.title}</span>
                    <span className="mono" style={{ fontSize: 9 }}>{l.dur}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* Main */}
        <div style={{ padding: "28px 40px 60px", maxWidth: 820 }}>
          <VideoArea title={lesson.title} />
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--accent)", margin: "20px 0 6px" }}>
            {lesson.module}
          </div>
          <h1 className="display" style={{ fontWeight: 650, fontSize: 26, margin: "0 0 16px" }}>
            {lesson.title}
          </h1>
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <button
              onClick={toggleComplete}
              style={{
                background: isDone ? "var(--ink)" : "transparent",
                color: isDone ? "#fff" : "var(--ink)",
                border: "1px solid var(--ink)",
                borderRadius: "var(--r-card)",
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {isDone ? "✓ Completed" : "Mark complete"}
            </button>
            <button
              onClick={nextLesson}
              disabled={current >= total - 1}
              style={{
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--r-card)",
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: current >= total - 1 ? "not-allowed" : "pointer",
                opacity: current >= total - 1 ? 0.5 : 1,
              }}
            >
              Next lesson →
            </button>
          </div>
          {lesson.desc && (
            <p style={{ color: "var(--text-secondary)", fontSize: 14.5, margin: "0 0 28px", maxWidth: 640 }}>
              {lesson.desc}
            </p>
          )}

          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: 22, maxWidth: 480 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--text-secondary)", marginBottom: 12 }}>
              LESSON RESOURCES
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {LESSON_RESOURCES.map((r) => (
                <Link
                  key={r.title}
                  href={`${routes.viewer(slug)}?doc=${r.docIndex}`}
                  className="plain"
                  style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13.5, color: "var(--ink)" }}
                >
                  <span className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--accent)", width: 68 }}>
                    {r.kind}
                  </span>
                  <span>{r.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Provider-agnostic video area. Renders a stub until Cloudflare Stream is wired. */
function VideoArea({ title }: { title: string }) {
  return (
    <div
      style={{
        background: "var(--ink)",
        borderRadius: "var(--r-card)",
        aspectRatio: "16/9",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
      }}
      aria-label={`Video: ${title}`}
    >
      <div
        style={{
          width: 64,
          height: 64,
          border: "2px solid var(--accent-on-navy)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: 0, height: 0, borderLeft: "18px solid var(--accent-on-navy)", borderTop: "11px solid transparent", borderBottom: "11px solid transparent", marginLeft: 5 }} />
      </div>
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--accent-on-navy)" }}>
        STREAMING PLAYER · CONNECT CLOUDFLARE STREAM
      </div>
    </div>
  );
}
