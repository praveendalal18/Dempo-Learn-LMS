import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared page scaffolding so every screen inherits the same width, padding,
 * and heading rhythm instead of hand-rolling it. Notion-style: a calm,
 * centered column with generous but not excessive width.
 */
export function PageContainer({
  children,
  className,
  width = "default",
}: {
  children: ReactNode;
  className?: string;
  width?: "default" | "wide" | "narrow";
}) {
  const max =
    width === "wide" ? "max-w-6xl" : width === "narrow" ? "max-w-3xl" : "max-w-5xl";
  return (
    <div className={cn("mx-auto w-full px-5 py-8 md:px-8 md:py-10", max, className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
