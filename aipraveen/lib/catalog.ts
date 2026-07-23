/**
 * Product catalog — the copy source of truth from the design handoff.
 * In production these rows live in the database; this module is the seed
 * and the shape the UI reads. Prices are INR; price 0 means free.
 */
import { formatINR, renewalPrice } from "./format";

export type ProductKind = "course" | "kit";

export interface Product {
  id: string;
  slug: string;
  /** Display label as shown on the thumbnail, e.g. "VIDEO COURSE · BONUS". */
  kindLabel: string;
  kind: ProductKind;
  title: string;
  outcome: string;
  /** INR. 0 = free. */
  price: number;
  hours?: string;
  resourceCount: number;
  thumbBg: string;
  /** Renewal percentage of full price (default 45). */
  renewPercent: number;
  /** Included free with any paid course. */
  bonus?: boolean;
}

export const DEFAULT_RENEW_PERCENT = 45;

export const PRODUCTS: Product[] = [
  {
    id: "flagship",
    slug: "studio-course",
    kindLabel: "VIDEO COURSE",
    kind: "course",
    title: "Build with AI: The Studio Course",
    outcome:
      "Ship a working AI-powered app — no code required — in 30 hours of hands-on studio sessions.",
    price: 4999,
    hours: "30 hours",
    resourceCount: 18,
    thumbBg: "#12233F",
    renewPercent: DEFAULT_RENEW_PERCENT,
  },
  {
    id: "placements",
    slug: "ai-for-placements",
    kindLabel: "VIDEO COURSE",
    kind: "course",
    title: "AI for Placements & Interviews",
    outcome:
      "Build a recruiter-ready portfolio, a sharper resume, and interview answers you can defend — with AI as your prep partner.",
    price: 3499,
    hours: "16 hours",
    resourceCount: 14,
    thumbBg: "#0E1B31",
    renewPercent: DEFAULT_RENEW_PERCENT,
  },
  {
    id: "prompt",
    slug: "prompt-to-product",
    kindLabel: "VIDEO COURSE",
    kind: "course",
    title: "Prompt to Product",
    outcome:
      "Go from a one-line idea to a deployed internal tool your team actually uses.",
    price: 2999,
    hours: "14 hours",
    resourceCount: 10,
    thumbBg: "#16294A",
    renewPercent: DEFAULT_RENEW_PERCENT,
  },
  {
    id: "career",
    slug: "student-ai-career-kit",
    kindLabel: "STARTER KIT",
    kind: "kit",
    title: "Student AI Career Kit",
    outcome:
      "Portfolio briefs, prompt libraries and datasets to make your first AI projects employer-ready.",
    price: 699,
    resourceCount: 22,
    thumbBg: "#12233F",
    renewPercent: DEFAULT_RENEW_PERCENT,
  },
  {
    id: "research",
    slug: "ai-research-assistant-kit",
    kindLabel: "STARTER KIT",
    kind: "kit",
    title: "AI Research Assistant Kit",
    outcome:
      "Templates and workflows to research faster and write sharper reports, papers and project docs — AI does the grunt work, you do the thinking.",
    price: 999,
    resourceCount: 16,
    thumbBg: "#0E1B31",
    renewPercent: DEFAULT_RENEW_PERCENT,
  },
  {
    id: "starterkit",
    slug: "student-ai-starter-kit",
    kindLabel: "STARTER KIT · FREE",
    kind: "kit",
    title: "Student AI Starter Kit",
    outcome:
      "Five hands-on AI exercises and a prompt pack to ship your first real project this weekend. Free with your email.",
    price: 0,
    resourceCount: 8,
    thumbBg: "#16294A",
    renewPercent: DEFAULT_RENEW_PERCENT,
  },
  {
    id: "video",
    slug: "create-videos-with-ai",
    kindLabel: "VIDEO COURSE · BONUS",
    kind: "course",
    title: "Create Videos with AI",
    outcome:
      "Script, generate and edit sharp explainer videos with AI. Included free with any paid course.",
    price: 1499,
    hours: "8 hours",
    resourceCount: 6,
    thumbBg: "#0E1B31",
    renewPercent: DEFAULT_RENEW_PERCENT,
    bonus: true,
  },
];

export function getProduct(idOrSlug: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
}

export const FEATURED_IDS = ["flagship", "video", "career"];
export function featuredProducts(): Product[] {
  return FEATURED_IDS.map((id) => getProduct(id)!).filter(Boolean);
}

export type StoreFilter = "All" | "Video courses" | "Starter kits";

export const STORE_FILTERS: StoreFilter[] = [
  "All",
  "Video courses",
  "Starter kits",
];

export function filterProducts(filter: StoreFilter): Product[] {
  switch (filter) {
    case "Video courses":
      return PRODUCTS.filter((p) => p.kind === "course");
    case "Starter kits":
      return PRODUCTS.filter((p) => p.kind === "kit");
    default:
      return PRODUCTS;
  }
}

export function priceLabel(p: Product): string {
  return p.price === 0 ? "Free" : formatINR(p.price);
}

export function renewLabelFor(p: Product): string {
  return formatINR(renewalPrice(p.price || 999, p.renewPercent));
}
