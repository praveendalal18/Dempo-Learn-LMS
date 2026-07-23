/** Indian number + currency + date formatting (en-IN). */

const inr0 = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** ₹4,999 · ₹1,00,000 (Indian grouping, no decimals). */
export function formatINR(amount: number): string {
  return inr0.format(amount);
}

/** Plain grouped number without the ₹ sign. */
export function formatNumberIN(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** 15 Aug 2026 */
export function formatDate(d: Date | string | number): string {
  return dateFmt.format(new Date(d));
}

/** One year from `from` (defaults to today), used for access-until dates. */
export function oneYearFrom(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

/** Days between now and `date` (negative if past). */
export function daysUntil(date: Date | string | number): number {
  const ms = new Date(date).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

/**
 * Renewal price rule from the design:
 * renewPrice = round(fullPrice × pct/100 / 10) × 10  (nearest ₹10)
 * Free products renew free.
 */
export function renewalPrice(fullPrice: number, pct: number): number {
  if (fullPrice <= 0) return 0;
  return Math.round((fullPrice * pct) / 100 / 10) * 10;
}
