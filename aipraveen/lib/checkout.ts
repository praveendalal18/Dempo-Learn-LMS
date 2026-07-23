import { getProduct } from "./catalog";
import { COMPETITIONS } from "./content";
import { formatDate, oneYearFrom, renewalPrice } from "./format";

export interface LineItem {
  kind: "product" | "renewal" | "competition";
  refId: string; // product id or competition id
  slug?: string;
  title: string;
  amount: number; // INR, 0 = free
  thumbBg: string;
  accessLine: string;
  isFree: boolean;
}

/**
 * Resolve the checkout line item from query params:
 *   ?product=<slug>  · ?renew=<slug>  · ?competition=<id>
 */
export function resolveLineItem(params: {
  product?: string;
  renew?: string;
  competition?: string;
}): LineItem | null {
  if (params.competition) {
    const c = COMPETITIONS.find((x) => x.id === params.competition);
    if (!c) return null;
    return {
      kind: "competition",
      refId: c.id,
      title: c.name,
      amount: c.fee,
      thumbBg: "#0E1B31",
      accessLine: "One entry · submit from your portfolio before the deadline",
      isFree: false,
    };
  }

  const slug = params.renew ?? params.product;
  if (!slug) return null;
  const p = getProduct(slug);
  if (!p) return null;

  if (params.renew) {
    return {
      kind: "renewal",
      refId: p.id,
      slug: p.slug,
      title: p.title,
      amount: renewalPrice(p.price, p.renewPercent),
      thumbBg: p.thumbBg,
      accessLine: "Renewal extends your access by one year — progress preserved",
      isFree: p.price === 0,
    };
  }

  return {
    kind: "product",
    refId: p.id,
    slug: p.slug,
    title: p.title,
    amount: p.price,
    thumbBg: p.thumbBg,
    accessLine: `Access until ${formatDate(oneYearFrom())} — one year from today`,
    isFree: p.price === 0,
  };
}
