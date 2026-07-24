import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  coursesTable,
  enrollmentsTable,
  usersTable,
  assignmentsTable,
  submissionsTable,
  quizzesTable,
  quizAttemptsTable,
  gradebookCategoriesTable,
  gradeItemCategoriesTable,
  type Course,
  type User,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { getCourse, isCourseTeacher, isAssignedCoordinator } from "../lib/authz";

const router: IRouter = Router();

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round = (n: number | null) => (n == null ? null : Math.round(n));

async function canView(course: Course, user: User): Promise<boolean> {
  if (user.role === "dean") return true;
  if (user.role === "course_coordinator") return isAssignedCoordinator(course.id, user);
  return isCourseTeacher(course, user);
}

// item -> [studentId -> pct]. Loads all graded work as percentages.
async function loadItemPercents(courseId: number) {
  const assignments = await db
    .select({ id: assignmentsTable.id, title: assignmentsTable.title, maxScore: assignmentsTable.maxScore })
    .from(assignmentsTable)
    .where(eq(assignmentsTable.courseId, courseId));
  const asgById = new Map(assignments.map((a) => [a.id, a]));
  const asgIds = assignments.map((a) => a.id);

  const quizzes = await db
    .select({ id: quizzesTable.id, title: quizzesTable.title })
    .from(quizzesTable)
    .where(eq(quizzesTable.courseId, courseId));
  const quizIds = quizzes.map((q) => q.id);

  // key = `${itemType}:${itemId}` -> Map<studentId, pct>
  const pcts = new Map<string, Map<string, number>>();
  const items: { itemType: string; itemId: number; title: string; maxScore: number }[] = [];

  for (const a of assignments) items.push({ itemType: "assignment", itemId: a.id, title: a.title, maxScore: a.maxScore });
  for (const q of quizzes) items.push({ itemType: "quiz", itemId: q.id, title: q.title, maxScore: 100 });

  if (asgIds.length) {
    const subs = await db.select().from(submissionsTable).where(inArray(submissionsTable.assignmentId, asgIds));
    for (const s of subs) {
      const a = asgById.get(s.assignmentId);
      if (!a || s.status !== "graded" || s.score == null || !a.maxScore) continue;
      const key = `assignment:${s.assignmentId}`;
      if (!pcts.has(key)) pcts.set(key, new Map());
      pcts.get(key)!.set(s.studentId, (s.score / a.maxScore) * 100);
    }
  }
  if (quizIds.length) {
    const attempts = await db.select().from(quizAttemptsTable).where(inArray(quizAttemptsTable.quizId, quizIds));
    for (const at of attempts) {
      if (at.score == null || !at.maxScore) continue;
      const key = `quiz:${at.quizId}`;
      if (!pcts.has(key)) pcts.set(key, new Map());
      pcts.get(key)!.set(at.studentId, (at.score / at.maxScore) * 100);
    }
  }
  return { items, pcts };
}

async function loadConfig(courseId: number) {
  const categories = await db
    .select()
    .from(gradebookCategoriesTable)
    .where(eq(gradebookCategoriesTable.courseId, courseId))
    .orderBy(gradebookCategoriesTable.position);
  const maps = await db
    .select()
    .from(gradeItemCategoriesTable)
    .where(eq(gradeItemCategoriesTable.courseId, courseId));
  const catByItem = new Map(maps.map((m) => [`${m.itemType}:${m.itemId}`, m.categoryId]));
  return { categories, catByItem };
}

// Compute each student's per-category average and weighted final.
function computeGrid(
  students: { id: string; name: string | null; email: string }[],
  categories: { id: number; name: string; weight: number }[],
  catByItem: Map<string, number>,
  items: { itemType: string; itemId: number }[],
  pcts: Map<string, Map<string, number>>,
) {
  const itemsByCat = new Map<number, string[]>();
  for (const it of items) {
    const key = `${it.itemType}:${it.itemId}`;
    const catId = catByItem.get(key);
    if (catId == null) continue;
    if (!itemsByCat.has(catId)) itemsByCat.set(catId, []);
    itemsByCat.get(catId)!.push(key);
  }

  return students.map((s) => {
    const catScores: Record<number, number | null> = {};
    let weightedSum = 0;
    let weightUsed = 0;
    for (const c of categories) {
      const keys = itemsByCat.get(c.id) ?? [];
      const vals: number[] = [];
      for (const k of keys) {
        const v = pcts.get(k)?.get(s.id);
        if (v != null) vals.push(v);
      }
      const avg = mean(vals);
      catScores[c.id] = round(avg);
      if (avg != null && c.weight > 0) { weightedSum += avg * c.weight; weightUsed += c.weight; }
    }
    const finalPct = weightUsed > 0 ? Math.round(weightedSum / weightUsed) : null;
    return { id: s.id, name: s.name || s.email, email: s.email, categories: catScores, finalPct };
  });
}

async function loadStudents(courseId: number) {
  return db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(enrollmentsTable)
    .innerJoin(usersTable, eq(usersTable.id, enrollmentsTable.studentId))
    .where(eq(enrollmentsTable.courseId, courseId))
    .orderBy(usersTable.name);
}

// GET config: categories + items with current category mapping
router.get("/courses/:courseId/gradebook/config", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (!(await canView(course, req.localUser!))) { res.status(403).json({ error: "Forbidden" }); return; }
  const { categories, catByItem } = await loadConfig(courseId);
  const { items } = await loadItemPercents(courseId);
  res.json({
    categories: categories.map((c) => ({ id: c.id, name: c.name, weight: c.weight, position: c.position })),
    items: items.map((it) => ({ ...it, categoryId: catByItem.get(`${it.itemType}:${it.itemId}`) ?? null })),
  });
});

// PUT config: replace categories + item mappings (teacher only).
// Items reference a category by its index in the categories array.
const putConfig = z.object({
  categories: z.array(z.object({ name: z.string().trim().min(1).max(60), weight: z.number().int().min(0).max(100) })).max(20),
  items: z.array(z.object({ itemType: z.enum(["assignment", "quiz"]), itemId: z.number().int().positive(), categoryIndex: z.number().int().min(0).nullable() })).max(500),
});

router.put("/courses/:courseId/gradebook/config", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (!isCourseTeacher(course, req.localUser!)) { res.status(403).json({ error: "Only the course teacher can edit the gradebook" }); return; }
  const parsed = putConfig.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  await db.transaction(async (tx) => {
    await tx.delete(gradeItemCategoriesTable).where(eq(gradeItemCategoriesTable.courseId, courseId));
    await tx.delete(gradebookCategoriesTable).where(eq(gradebookCategoriesTable.courseId, courseId));
    const insertedIds: number[] = [];
    for (let i = 0; i < parsed.data.categories.length; i++) {
      const c = parsed.data.categories[i];
      const [row] = await tx.insert(gradebookCategoriesTable).values({ courseId, name: c.name, weight: c.weight, position: i }).returning();
      insertedIds.push(row.id);
    }
    const rows = parsed.data.items
      .filter((it) => it.categoryIndex != null && insertedIds[it.categoryIndex] != null)
      .map((it) => ({ courseId, itemType: it.itemType, itemId: it.itemId, categoryId: insertedIds[it.categoryIndex as number] }));
    if (rows.length) await tx.insert(gradeItemCategoriesTable).values(rows);
  });
  res.json({ ok: true });
});

// GET computed gradebook grid
router.get("/courses/:courseId/gradebook", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (!(await canView(course, req.localUser!))) { res.status(403).json({ error: "Forbidden" }); return; }

  const { categories, catByItem } = await loadConfig(courseId);
  const { items, pcts } = await loadItemPercents(courseId);
  const students = await loadStudents(courseId);
  const grid = computeGrid(students, categories, catByItem, items, pcts);
  res.json({
    categories: categories.map((c) => ({ id: c.id, name: c.name, weight: c.weight })),
    students: grid,
    configured: categories.length > 0,
  });
});

// GET transcript CSV
router.get("/courses/:courseId/gradebook/export.csv", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (!(await canView(course, req.localUser!))) { res.status(403).json({ error: "Forbidden" }); return; }

  const { categories, catByItem } = await loadConfig(courseId);
  const { items, pcts } = await loadItemPercents(courseId);
  const students = await loadStudents(courseId);
  const grid = computeGrid(students, categories, catByItem, items, pcts);

  const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const header = ["Student", "Email", ...categories.map((c) => `${c.name} (%)`), "Final (%)"];
  const lines = [header.map(esc).join(",")];
  for (const r of grid) {
    lines.push([r.name, r.email, ...categories.map((c) => r.categories[c.id] ?? ""), r.finalPct ?? ""].map(esc).join(","));
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="dempo-${course.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-transcript.csv"`);
  res.send(lines.join("\n"));
});

export default router;
