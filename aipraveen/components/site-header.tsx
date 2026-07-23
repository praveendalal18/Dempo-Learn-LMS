"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV, routes } from "@/lib/routes";
import { Logo } from "@/components/logo";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "rgba(252,252,250,.94)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          maxWidth: "var(--w-wide)",
          margin: "0 auto",
          padding: "0 28px",
          height: 64,
          display: "flex",
          alignItems: "center",
          gap: 28,
        }}
      >
        <Link href={routes.home} className="plain" style={{ display: "flex" }}>
          <Logo variant="onLight" tagline={false} />
        </Link>
        <nav
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 18,
            whiteSpace: "nowrap",
          }}
        >
          {PRIMARY_NAV.map((item) => {
            const active =
              item.href === routes.home
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="plain"
                style={{
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: active ? "var(--ink)" : "var(--text-secondary)",
                }}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href={routes.login}
            className="plain"
            style={{
              fontSize: 13,
              fontWeight: 600,
              border: "1px solid var(--ink)",
              borderRadius: "var(--r-card)",
              padding: "7px 16px",
            }}
          >
            Log in
          </Link>
        </nav>
      </div>
    </header>
  );
}
