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

const DEFAULT_HOURS_PER_DAY = 5;
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "expected HH:MM");
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
      dayTimes: course.planDayTimes ?? {},
      hoursPerDay: course.planHoursPerDay ?? DEFAULT_HOURS_PER_DAY,
      startTime: course.planStartTime ?? "09:00",
      sessionMinutes: course.planSessionMinutes ?? 60,
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
  dayTimes: z.record(z.string(), timeSchema).optional().default({}),
  hoursPerDay: z.number().int().min(1).max(12).optional(),
  startTime: timeSchema.optional(),
  sessionMinutes: z.number().int().min(15).max(600).optional(),
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

    const coursePatch: {
      planDayDates: Record<string, string>;
      planDayTimes: Record<string, string>;
      planHoursPerDay?: number;
      planStartTime?: string;
      planSessionMinutes?: number;
    } = {
      planDayDates: parsed.data.dayDates,
      planDayTimes: parsed.data.dayTimes,
    };
    if (parsed.data.hoursPerDay !== undefined) coursePatch.planHoursPerDay = parsed.data.hoursPerDay;
    if (parsed.data.startTime !== undefined) coursePatch.planStartTime = parsed.data.startTime;
    if (parsed.data.sessionMinutes !== undefined) coursePatch.planSessionMinutes = parsed.data.sessionMinutes;

    await db.transaction(async (tx) => {
      await tx
        .update(coursesTable)
        .set(coursePatch)
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

// PUT /courses/:courseId/plan/session/:hour — save ONE session in place
// (its topic/notes, date, time, links, attachments) without touching the rest.
const sessionSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().nullish(),
  preWork: z.string().nullish(),
  caseStudy: z.string().nullish(),
  postWork: z.string().nullish(),
  date: dateSchema.nullable().optional(),
  time: timeSchema.nullable().optional(),
  links: z.array(z.string().trim()).optional().default([]),
  attachments: z.array(attachmentSchema).optional().default([]),
});

router.put(
  "/courses/:courseId/plan/session/:hour",
  requireAuth,
  async (req: Request, res: Response) => {
    const courseId = Number(req.params.courseId);
    const hour = Number(req.params.hour);
    if (!Number.isInteger(courseId) || !Number.isInteger(hour) || hour < 1) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const course = await getCourse(courseId);
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }
    if (!isCourseTeacher(course, req.localUser!)) {
      res.status(403).json({ error: "Only the course teacher can edit the plan" }); return;
    }
    if (hour > course.planHours) {
      res.status(400).json({ error: `Session ${hour} is beyond the plan's length` }); return;
    }
    const parsed = sessionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const d = parsed.data;
    const key = String(hour);

    await db.transaction(async (tx) => {
      // Upsert the plan item (no unique index on course+hour, so update-or-insert).
      const [existing] = await tx
        .select({ id: coursePlanItemsTable.id })
        .from(coursePlanItemsTable)
        .where(and(eq(coursePlanItemsTable.courseId, courseId), eq(coursePlanItemsTable.hourNumber, hour)));
      const itemValues = {
        title: d.title,
        description: d.description ?? null,
        preWork: d.preWork ?? null,
        caseStudy: d.caseStudy ?? null,
        postWork: d.postWork ?? null,
      };
      if (existing) {
        await tx.update(coursePlanItemsTable).set(itemValues).where(eq(coursePlanItemsTable.id, existing.id));
      } else {
        await tx.insert(coursePlanItemsTable).values({ courseId, hourNumber: hour, ...itemValues });
      }

      // Merge this session's date/time into the course's per-day maps.
      const dayDates = { ...(course.planDayDates ?? {}) };
      const dayTimes = { ...(course.planDayTimes ?? {}) };
      if (d.date !== undefined) {
        if (d.date) dayDates[key] = d.date; else delete dayDates[key];
      }
      if (d.time !== undefined) {
        if (d.time && d.time !== (course.planStartTime ?? "09:00")) dayTimes[key] = d.time; else delete dayTimes[key];
      }
      await tx.update(coursesTable).set({ planDayDates: dayDates, planDayTimes: dayTimes }).where(eq(coursesTable.id, courseId));

      // Upsert (or clear) this session's links/attachments.
      const links = d.links.filter((l) => l.trim().length > 0);
      if (links.length > 0 || d.attachments.length > 0) {
        await tx
          .insert(coursePlanExtrasTable)
          .values({ courseId, hourNumber: hour, links, attachments: d.attachments })
          .onConflictDoUpdate({
            target: [coursePlanExtrasTable.courseId, coursePlanExtrasTable.hourNumber],
            set: { links, attachments: d.attachments, updatedAt: new Date() },
          });
      } else {
        await tx.delete(coursePlanExtrasTable).where(and(eq(coursePlanExtrasTable.courseId, courseId), eq(coursePlanExtrasTable.hourNumber, hour)));
      }
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

    const hoursPerDayByCourse = new Map<number, number>(
      withDates.map((c) => [c.id, c.planHoursPerDay ?? DEFAULT_HOURS_PER_DAY]),
    );

    // (courseId -> day -> [titles]), grouped by each course's own hours/day.
    const topics = new Map<string, string[]>();
    for (const it of items) {
      const hpd = hoursPerDayByCourse.get(it.courseId) ?? DEFAULT_HOURS_PER_DAY;
      const day = Math.ceil(it.hourNumber / hpd);
      const key = `${it.courseId}:${day}`;
      if (!topics.has(key)) topics.set(key, []);
      topics.get(key)!.push(it.title);
    }

    const events: Array<{
      courseId: number;
      courseTitle: string;
      day: number;
      date: string;
      time: string;
      durationMins: number;
      hoursPerDay: number;
      title: string;
    }> = [];
    for (const c of withDates) {
      const hpd = c.planHoursPerDay ?? DEFAULT_HOURS_PER_DAY;
      const times = c.planDayTimes ?? {};
      const defaultTime = c.planStartTime ?? "09:00";
      const duration = c.planSessionMinutes ?? 60;
      for (const [dayStr, date] of Object.entries(c.planDayDates ?? {})) {
        const day = Number(dayStr);
        if (!Number.isInteger(day)) continue;
        const t = topics.get(`${c.id}:${day}`) ?? [];
        events.push({
          courseId: c.id,
          courseTitle: c.title,
          day,
          date,
          time: times[dayStr] || defaultTime,
          durationMins: duration,
          hoursPerDay: hpd,
          title: t.length ? t.join(", ") : (hpd === 1 ? `Session ${day}` : `Day ${day}`),
        });
      }
    }
    res.json(events);
  },
);

export default router;
