"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fieldStyle, primaryButtonStyle } from "@/components/form";
import { submitProject } from "@/app/(site)/practice/actions";

interface LinkRow {
  label: string;
  url: string;
}

export function ProjectSubmitForm({
  briefId,
  briefTitle,
  defaultTitle,
}: {
  briefId: string;
  briefTitle: string;
  defaultTitle: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState("");
  const [tech, setTech] = useState("");
  const [links, setLinks] = useState<LinkRow[]>([{ label: "Live demo", url: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setLink(i: number, patch: Partial<LinkRow>) {
    setLinks((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await submitProject({
      briefId,
      title,
      description,
      audience,
      techStack: tech.split(",").map((t) => t.trim()).filter(Boolean),
      links: links.filter((l) => l.url.trim()),
    });
    if (res.ok && res.redirect) {
      router.push(res.redirect);
    } else {
      setError(res.error ?? "Could not submit. Try again.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--text-secondary)" }}>
        BUILT FOR: {briefId} · {briefTitle}
      </div>

      <Field label="Project title" hint="Name your build — this shows on your portfolio.">
        <input required value={title} onChange={(e) => setTitle(e.target.value)} style={fieldStyle} placeholder="e.g. ReviewLens — weekly insight digest" />
      </Field>

      <Field label="What are you solving?" hint="A couple of sentences on the problem and what your build does.">
        <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...fieldStyle, resize: "vertical" }} placeholder="What problem does it solve, and how does your build solve it?" />
      </Field>

      <Field label="Who is it for?" hint="The people who'd actually use this.">
        <input value={audience} onChange={(e) => setAudience(e.target.value)} style={fieldStyle} placeholder="e.g. Founders at small D2C brands" />
      </Field>

      <Field label="Tech stack used" hint="Comma-separated — tools, models, frameworks.">
        <input value={tech} onChange={(e) => setTech(e.target.value)} style={fieldStyle} placeholder="Next.js, GPT-4o mini, Google Sheets, Vercel" />
      </Field>

      <Field label="Links" hint="Live demo, repo, a write-up — anything that shows the work. (https:// URLs)">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {links.map((l, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr auto", gap: 8 }}>
              <input value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} style={fieldStyle} placeholder="Label" />
              <input value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} style={fieldStyle} placeholder="https://…" />
              <button
                type="button"
                onClick={() => setLinks((rows) => rows.filter((_, idx) => idx !== i))}
                style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: "0 12px", cursor: "pointer", color: "var(--text-secondary)" }}
                aria-label="Remove link"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLinks((rows) => [...rows, { label: "", url: "" }])}
            style={{ alignSelf: "flex-start", background: "transparent", border: "1px dashed var(--border)", borderRadius: "var(--r-card)", padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--text-secondary)" }}
          >
            + Add another link
          </button>
        </div>
      </Field>

      {error && <div style={{ color: "var(--error)", fontSize: 13 }}>{error}</div>}

      <button type="submit" disabled={busy} style={{ ...primaryButtonStyle, opacity: busy ? 0.6 : 1 }}>
        {busy ? "Publishing…" : "Publish to my portfolio"}
      </button>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{hint}</span>}
    </label>
  );
}
