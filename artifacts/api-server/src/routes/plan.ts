import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  coursesTable,
  coursePlanItemsTable,
  coursePlanExtrasTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import {
  getCourse,
  isCourseTeacher,
  canAccessCourse,
  getActiveEnrolledCourseIds,
  getCoordinatorCourseIds,
} from "../lib/authz";

const router: IRouter = Router();

const HOURS_PER_DAY = 5;
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const attachmentSchema = z.object({
  path: z.string(),
  name: z.string(),
  size: z.number().optional(),
});

// GET /courses/:courseId/plan-extras — day dates + per-hour links/attachments
router.get(
  "/courses/:courseId/plan-extras",
  requireAuth,
  async (req: Request, res: Response) => {
    const courseId = Number(req.params.courseId);
    if (!Number.isInteger(courseId)) {
      res.status(400).json({ error: "Invalid course id" });
      return;
    }
    const course = await getCourse(courseId);
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    if (!(await canAccessCourse(course, req.localUser!))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const extras = await db
      .select()
      .from(coursePlanExtrasTable)
      .where(eq(coursePlanExtrasTable.courseId, courseId));
    res.json({
      dayDates: course.planDayDates ?? {},
      hours: extras.map((e) => ({
        hourNumber: e.hourNumber,
        links: e.links,
        attachments: e.attachments,
      })),
    });
  },
);

// PUT /courses/:courseId/plan-extras — teacher saves dates + links/attachments
const putSchema = z.object({
  dayDates: z.record(z.string(), dateSchema).optional().default({}),
  hours: z
    .array(
      z.object({
        hourNumber: z.number().int().positive(),
        links: z.array(z.string().trim()).optional().default([]),
        attachments: z.array(attachmentSchema).optional().default([]),
      }),
    )
    .optional()
    .default([]),
});

router.put(
  "/courses/:courseId/plan-extras",
  requireAuth,
  async (req: Request, res: Response) => {
    const courseId = Number(req.params.courseId);
    if (!Number.isInteger(courseId)) {
      res.status(400).json({ error: "Invalid course id" });
      return;
    }
    const course = await getCourse(courseId);
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    if (!isCourseTeacher(course, req.localUser!)) {
      res.status(403).json({ error: "Only the course teacher can edit the plan" });
      return;
    }
    const parsed = putSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(coursesTable)
        .set({ planDayDates: parsed.data.dayDates })
        .where(eq(coursesTable.id, courseId));
      await tx
        .delete(coursePlanExtrasTable)
        .where(eq(coursePlanExtrasTable.courseId, courseId));
      const rows = parsed.data.hours
        .map((h) => ({
          courseId,
          hourNumber: h.hourNumber,
          links: h.links.filter((l) => l.trim().length > 0),
          attachments: h.attachments,
        }))
        .filter((r) => r.links.length > 0 || r.attachments.length > 0);
      if (rows.length) await tx.insert(coursePlanExtrasTable).values(rows);
    });

    res.json({ ok: true });
  },
);

// GET /calendar/plan-days — dated plan days for the user's courses
router.get(
  "/calendar/plan-days",
  requireAuth,
  async (req: Request, res: Response) => {
    const user = req.localUser!;
    let courseIds: number[];
    if (user.role === "teacher") {
      const owned = await db
        .select({ id: coursesTable.id })
        .from(coursesTable)
        .where(eq(coursesTable.teacherId, user.id));
      courseIds = owned.map((c) => c.id);
    } else if (user.role === "course_coordinator") {
      courseIds = await getCoordinatorCourseIds(user.id);
    } else {
      courseIds = await getActiveEnrolledCourseIds(user.id);
    }
    if (courseIds.length === 0) {
      res.json([]);
      return;
    }

    const courses = await db
      .select()
      .from(coursesTable)
      .where(inArray(coursesTable.id, courseIds));
    const withDates = courses.filter(
      (c) => c.planDayDates && Object.keys(c.planDayDates).length > 0,
    );
    if (withDates.length === 0) {
      res.json([]);
      return;
    }

    const items = await db
      .select({
        courseId: coursePlanItemsTable.courseId,
        hourNumber: coursePlanItemsTable.hourNumber,
        title: coursePlanItemsTable.title,
      })
      .from(coursePlanItemsTable)
      .where(inArray(coursePlanItemsTable.courseId, withDates.map((c) => c.id)));

    // (courseId -> day -> [titles])
    const topics = new Map<string, string[]>();
    for (const it of items) {
      const day = Math.ceil(it.hourNumber / HOURS_PER_DAY);
      const key = `${it.courseId}:${day}`;
      if (!topics.has(key)) topics.set(key, []);
      topics.get(key)!.push(it.title);
    }

    const events: Array<{
      courseId: number;
      courseTitle: string;
      day: number;
      date: string;
      title: string;
    }> = [];
    for (const c of withDates) {
      for (const [dayStr, date] of Object.entries(c.planDayDates ?? {})) {
        const day = Number(dayStr);
        if (!Number.isInteger(day)) continue;
        const t = topics.get(`${c.id}:${day}`) ?? [];
        events.push({
          courseId: c.id,
          courseTitle: c.title,
          day,
          date,
          title: t.length ? t.join(", ") : `Day ${day}`,
        });
      }
    }
    res.json(events);
  },
);

export default router;
