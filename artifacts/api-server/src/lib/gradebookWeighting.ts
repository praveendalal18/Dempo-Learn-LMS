import { eq } from "drizzle-orm";
import { db, gradebookCategoriesTable, gradeItemCategoriesTable } from "@workspace/db";

export type WeightConfig = {
  categories: { id: number; weight: number }[];
  itemCategory: Map<string, number>; // `${itemType}:${itemId}` -> categoryId
};

export type ItemPct = { key: string; pct: number };

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Load a course's gradebook weighting, or null when it isn't configured. */
export async function loadWeightConfig(courseId: number): Promise<WeightConfig | null> {
  const categories = await db
    .select()
    .from(gradebookCategoriesTable)
    .where(eq(gradebookCategoriesTable.courseId, courseId));
  if (categories.length === 0) return null;
  const maps = await db
    .select()
    .from(gradeItemCategoriesTable)
    .where(eq(gradeItemCategoriesTable.courseId, courseId));
  return {
    categories: categories.map((c) => ({ id: c.id, weight: c.weight })),
    itemCategory: new Map(maps.map((m) => [`${m.itemType}:${m.itemId}`, m.categoryId])),
  };
}

/**
 * A student's overall percentage. With a weight config, it's the weighted
 * average of category averages (normalized over categories that have graded
 * items). Without one — or when no graded item is category-mapped — it falls
 * back to a flat average of all graded items. Returns null when nothing graded.
 */
export function weightedOverall(items: ItemPct[], cfg: WeightConfig | null): number | null {
  if (items.length === 0) return null;
  const flat = () => Math.round(mean(items.map((i) => i.pct))! * 10) / 10;
  if (!cfg) return flat();

  const byCat = new Map<number, number[]>();
  for (const it of items) {
    const catId = cfg.itemCategory.get(it.key);
    if (catId == null) continue;
    if (!byCat.has(catId)) byCat.set(catId, []);
    byCat.get(catId)!.push(it.pct);
  }
  let wsum = 0;
  let wused = 0;
  for (const c of cfg.categories) {
    const vals = byCat.get(c.id);
    if (!vals || vals.length === 0 || c.weight <= 0) continue;
    wsum += mean(vals)! * c.weight;
    wused += c.weight;
  }
  if (wused === 0) return flat();
  return Math.round((wsum / wused) * 10) / 10;
}
