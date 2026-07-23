import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  coursesTable,
  coursePlanItemsTable,
  assignmentsTable,
  submissionsTable,
  quizzesTable,
  quizAttemptsTable,
  studentTasksTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { getActiveEnrolledCourseIds } from "../lib/authz";

const router: IRouter = Router();

// GET /me/focus — everything a student should focus on, across their courses.
router.get("/me/focus", requireAuth, async (req: Request, res: Response) => {
  const me = req.localUser!;
  const courseIds = await getActiveEnrolledCourseIds(me.id);
  if (courseIds.length === 0) {
    res.json({ sessions: [], assignments: [], quizzes: [] });
    return;
  }

  const courses = await db.select().from(coursesTable).where(inArray(coursesTable.id, courseIds));
  const courseById = new Map(courses.map((c) => [c.id, c]));

  const items = await db
    .select({ courseId: coursePlanItemsTable.courseId, hourNumber: coursePlanItemsTable.hourNumber, title: coursePlanItemsTable.title, preWork: coursePlanItemsTable.preWork, postWork: coursePlanItemsTable.postWork })
    .from(coursePlanItemsTable)
    .where(inArray(coursePlanItemsTable.courseId, courseIds));

  // course:day -> aggregated item text
  type Agg = { titles: string[]; preWork: string[]; postWork: string[] };
  const byDay = new Map<string, Agg>();
  for (const it of items) {
    const c = courseById.get(it.courseId);
    const hpd = c?.planHoursPerDay ?? 1;
    const day = Math.ceil(it.hourNumber / hpd);
    const key = `${it.courseId}:${day}`;
    if (!byDay.has(key)) byDay.set(key, { titles: [], preWork: [], postWork: [] });
    const a = byDay.get(key)!;
    a.titles.push(it.title);
    if (it.preWork) a.preWork.push(it.preWork);
    if (it.postWork) a.postWork.push(it.postWork);
  }

  const sessions: any[] = [];
  for (const c of courses) {
    const dates = c.planDayDates ?? {};
    const times = c.planDayTimes ?? {};
    const defaultTime = c.planStartTime ?? "09:00";
    const locked = new Set(c.lockedPlanDays ?? []);
    for (const [dayStr, date] of Object.entries(dates)) {
      const day = Number(dayStr);
      if (!Number.isInteger(day)) continue;
      const a = byDay.get(`${c.id}:${day}`);
      const time = times[dayStr] || defaultTime;
      const isLocked = locked.has(day);
      sessions.push({
        courseId: c.id,
        courseTitle: c.title,
        day,
        date,
        time,
        when: `${date}T${time}:00`,
        title: a && a.titles.length ? a.titles.join(", ") : `Session ${day}`,
        preWork: isLocked ? null : (a && a.preWork.length ? a.preWork.join("\n\n") : null),
        postWork: isLocked ? null : (a && a.postWork.length ? a.postWork.join("\n\n") : null),
        locked: isLocked,
      });
    }
  }
  sessions.sort((x, y) => x.when.localeCompare(y.when));

  // Assignments not yet submitted (by me)
  const asgs = await db
    .select({ id: assignmentsTable.id, courseId: assignmentsTable.courseId, title: assignmentsTable.title, dueDate: assignmentsTable.dueDate })
    .from(assignmentsTable)
    .where(inArray(assignmentsTable.courseId, courseIds));
  const asgIds = asgs.map((a) => a.id);
  const mySubs = asgIds.length
    ? await db.select({ assignmentId: submissionsTable.assignmentId }).from(submissionsTable).where(and(inArray(submissionsTable.assignmentId, asgIds), eq(submissionsTable.studentId, me.id)))
    : [];
  const submitted = new Set(mySubs.map((s) => s.assignmentId));
  const assignments = asgs
    .filter((a) => !submitted.has(a.id))
    .map((a) => ({ id: a.id, courseId: a.courseId, courseTitle: courseById.get(a.courseId)?.title ?? "", title: a.title, dueDate: a.dueDate, link: `/assignment/${a.id}` }));

  // Published quizzes I haven't attempted
  const quizzes = await db
    .select({ id: quizzesTable.id, courseId: quizzesTable.courseId, title: quizzesTable.title, dueDate: quizzesTable.dueDate })
    .from(quizzesTable)
    .where(and(inArray(quizzesTable.courseId, courseIds), eq(quizzesTable.status, "published")));
  const quizIds = quizzes.map((q) => q.id);
  const myAttempts = quizIds.length
    ? await db.select({ quizId: quizAttemptsTable.quizId }).from(quizAttemptsTable).where(and(inArray(quizAttemptsTable.quizId, quizIds), eq(quizAttemptsTable.studentId, me.id)))
    : [];
  const attempted = new Set(myAttempts.map((a) => a.quizId));
  const quizzesDue = quizzes
    .filter((q) => !attempted.has(q.id))
    .map((q) => ({ id: q.id, courseId: q.courseId, courseTitle: courseById.get(q.courseId)?.title ?? "", title: q.title, dueDate: q.dueDate, link: `/quiz/${q.id}` }));

  res.json({ sessions, assignments, quizzes: quizzesDue });
});

/* ---------- Personal tasks ---------- */

router.get("/me/tasks", requireAuth, async (req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(studentTasksTable)
    .where(eq(studentTasksTable.studentId, req.localUser!.id))
    .orderBy(asc(studentTasksTable.done), desc(studentTasksTable.createdAt));
  res.json(rows);
});

const taskBody = z.object({
  title: z.string().trim().min(1).max(300),
  note: z.string().trim().max(4000).nullish(),
  dueAt: z.coerce.date().nullish(),
  remindAt: z.coerce.date().nullish(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  courseId: z.number().int().positive().nullish(),
  sourceType: z.string().max(20).nullish(),
  sourceRef: z.string().max(120).nullish(),
});

router.post("/me/tasks", requireAuth, async (req: Request, res: Response) => {
  const parsed = taskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data;
  const [row] = await db
    .insert(studentTasksTable)
    .values({
      studentId: req.localUser!.id,
      title: d.title,
      note: d.note ?? null,
      dueAt: d.dueAt ?? null,
      remindAt: d.remindAt ?? null,
      tags: d.tags ?? [],
      courseId: d.courseId ?? null,
      sourceType: d.sourceType ?? null,
      sourceRef: d.sourceRef ?? null,
    })
    .returning();
  res.status(201).json(row);
});

const taskPatch = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  note: z.string().trim().max(4000).nullish(),
  dueAt: z.coerce.date().nullish(),
  remindAt: z.coerce.date().nullish(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  done: z.boolean().optional(),
});

router.patch("/me/tasks/:id", requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select().from(studentTasksTable).where(eq(studentTasksTable.id, id));
  if (!existing || existing.studentId !== req.localUser!.id) { res.status(404).json({ error: "Task not found" }); return; }
  const parsed = taskPatch.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data;
  const patch: Record<string, unknown> = {};
  if (d.title !== undefined) patch.title = d.title;
  if (d.note !== undefined) patch.note = d.note ?? null;
  if (d.dueAt !== undefined) patch.dueAt = d.dueAt ?? null;
  if (d.remindAt !== undefined) { patch.remindAt = d.remindAt ?? null; patch.reminded = false; }
  if (d.tags !== undefined) patch.tags = d.tags;
  if (d.done !== undefined) patch.done = d.done;
  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }
  const [row] = await db.update(studentTasksTable).set(patch).where(eq(studentTasksTable.id, id)).returning();
  res.json(row);
});

router.delete("/me/tasks/:id", requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select().from(studentTasksTable).where(eq(studentTasksTable.id, id));
  if (!existing || existing.studentId !== req.localUser!.id) { res.status(404).json({ error: "Task not found" }); return; }
  await db.delete(studentTasksTable).where(eq(studentTasksTable.id, id));
  res.json({ ok: true });
});

export default router;
