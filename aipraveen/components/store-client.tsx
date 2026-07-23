"use client";

import { useState } from "react";
import Link from "next/link";
import {
  STORE_FILTERS,
  filterProducts,
  priceLabel,
  type Product,
  type StoreFilter,
} from "@/lib/catalog";
import { routes } from "@/lib/routes";
import { Container } from "@/components/ui";

type DemoState = "default" | "loading" | "error";

export function StoreClient() {
  const [filter, setFilter] = useState<StoreFilter>("All");
  const [demo, setDemo] = useState<DemoState>("default");

  const items = filterProducts(filter);

  return (
    <>
      <Container style={{ padding: "64px 28px 0" }}>
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.16em",
            color: "var(--accent)",
            marginBottom: 14,
          }}
        >
          STORE
        </div>
        <h1
          className="display"
          style={{
            fontWeight: 650,
            fontSize: 42,
            letterSpacing: "-0.02em",
            margin: "0 0 10px",
          }}
        >
          Courses and kits.
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 15, margin: "0 0 28px" }}>
          Everything includes one year of full on-platform access.
        </p>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            borderBottom: "1px solid var(--border)",
            paddingBottom: 18,
          }}
        >
          {STORE_FILTERS.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: active ? "var(--ink)" : "transparent",
                  color: active ? "#fff" : "var(--text-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-card)",
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {f}
              </button>
            );
          })}
          <div
            className="mono"
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontSize: 9.5,
              letterSpacing: "0.08em",
              color: "var(--faint)",
            }}
          >
            DEMO:
            <DemoLink label="OK" onClick={() => setDemo("default")} />·
            <DemoLink label="LOADING" onClick={() => setDemo("loading")} />·
            <DemoLink label="ERROR" onClick={() => setDemo("error")} />
          </div>
        </div>
      </Container>

      <Container style={{ padding: "28px 28px 40px", minHeight: 420 }}>
        {demo === "loading" && <SkeletonGrid />}
        {demo === "error" && <ErrorCard onReload={() => setDemo("default")} />}
        {demo === "default" && <ProductGrid items={items} />}
      </Container>

      <section style={{ borderTop: "1px solid var(--border)", background: "var(--card)" }}>
        <Container
          className="mono"
          style={{
            padding: "20px 28px",
            display: "flex",
            justifyContent: "center",
            gap: 36,
            flexWrap: "wrap",
            fontSize: 10.5,
            letterSpacing: "0.1em",
            color: "var(--text-secondary)",
          }}
        >
          <span>INSTANT ACCESS</span>
          <span>LEARN ON ANY DEVICE</span>
          <span>SECURE CHECKOUT</span>
          <span>UPI · CARDS · NETBANKING</span>
        </Container>
      </section>
    </>
  );
}

function DemoLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "var(--accent)",
        font: "inherit",
        padding: 0,
      }}
    >
      {label}
    </button>
  );
}

function ProductGrid({ items }: { items: Product[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
      {items.map((p) => (
        <div
          key={p.id}
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-card)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Link
            href={routes.product(p.slug)}
            className="plain"
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
              style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--accent-on-navy)" }}
            >
              {p.kindLabel}
            </div>
            <div
              className="display"
              style={{ fontWeight: 650, fontSize: 21, lineHeight: 1.15, color: "#fff" }}
            >
              {p.title}
            </div>
          </Link>
          <div
            style={{
              padding: "18px 22px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              flex: 1,
            }}
          >
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13.5, flex: 1 }}>
              {p.outcome}
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 17, color: "var(--accent)" }}>
                  {priceLabel(p)}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--text-secondary)" }}
                >
                  1-YEAR ACCESS
                </div>
              </div>
              <Link
                href={`${routes.checkout}?product=${p.slug}`}
                className="plain"
                style={{
                  background: p.price === 0 ? "transparent" : "var(--ink)",
                  color: p.price === 0 ? "var(--accent)" : "#fff",
                  border: `1px solid ${p.price === 0 ? "var(--accent)" : "var(--ink)"}`,
                  borderRadius: "var(--r-card)",
                  padding: "9px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {p.price === 0 ? "Get free" : "Buy"}
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
      {[1, 2, 3, 4, 5, 6].map((k) => (
        <div key={k} style={{ border: "1px solid var(--border)", borderRadius: "var(--r-card)", overflow: "hidden" }}>
          <div style={{ height: 130, background: "var(--skeleton)", animation: "pulse 1.4s infinite" }} />
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ height: 12, width: "80%", background: "var(--skeleton)", borderRadius: 3, animation: "pulse 1.4s infinite" }} />
            <div style={{ height: 12, width: "50%", background: "var(--skeleton)", borderRadius: 3, animation: "pulse 1.4s infinite" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorCard({ onReload }: { onReload: () => void }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--r-card)",
        background: "var(--card)",
        padding: 48,
        textAlign: "center",
        maxWidth: 480,
        margin: "20px auto",
      }}
    >
      <div className="display" style={{ fontWeight: 650, fontSize: 20, marginBottom: 8 }}>
        The store didn&apos;t load.
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 20px" }}>
        Your connection dropped while fetching products. Nothing was charged. Reload to try again.
      </p>
      <button
        onClick={onReload}
        style={{
          background: "var(--ink)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--r-card)",
          padding: "12px 22px",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Reload store
      </button>
    </div>
  );
}
