import { Router, type IRouter } from "express";
import { eq, and, isNull, inArray, desc, gte, lte, count } from "drizzle-orm";
import {
  db,
  notificationsTable,
  classSessionsTable,
  coursesTable,
  enrollmentsTable,
  studentTasksTable,
} from "@workspace/db";
import {
  ListNotificationsResponse,
  MarkNotificationsReadBody,
  MarkNotificationsReadResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { createNotifications } from "../lib/notifications";
import { getActiveEnrolledCourseIds } from "../lib/authz";

const router: IRouter = Router();

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Lazily generates "upcoming class" reminder notifications for sessions that
 * start within the next 24 hours, deduped per (user, session).
 */
async function ensureClassReminders(
  userId: string,
  role: string,
): Promise<void> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  let courseIds: number[];
  if (role === "teacher") {
    const owned = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.teacherId, userId));
    courseIds = owned.map((c) => c.id);
  } else {
    courseIds = await getActiveEnrolledCourseIds(userId);
  }
  if (courseIds.length === 0) return;

  const upcoming = await db
    .select()
    .from(classSessionsTable)
    .where(
      and(
        inArray(classSessionsTable.courseId, courseIds),
        gte(classSessionsTable.startsAt, now),
        lte(classSessionsTable.startsAt, windowEnd),
      ),
    );
  if (upcoming.length === 0) return;

  const existing = await db
    .select()
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.type, "class.reminder"),
        inArray(
          notificationsTable.refId,
          upcoming.map((s) => s.id),
        ),
      ),
    );
  const alreadyNotified = new Set(existing.map((n) => n.refId));

  const courses = await db
    .select()
    .from(coursesTable)
    .where(inArray(coursesTable.id, courseIds));
  const courseById = new Map(courses.map((c) => [c.id, c]));

  await createNotifications(
    upcoming
      .filter((s) => !alreadyNotified.has(s.id))
      .map((s) => ({
        userId,
        type: "class.reminder",
        title: `Upcoming class: ${s.title}`,
        body: `${courseById.get(s.courseId)?.title ?? "Course"} — starts ${s.startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC`,
        link: "/calendar",
        courseId: s.courseId,
        refId: s.id,
      })),
  );
}

/** Fires in-app notifications for personal tasks whose reminder time has passed. */
async function ensureTaskReminders(userId: string): Promise<void> {
  const now = new Date();
  const due = await db
    .select()
    .from(studentTasksTable)
    .where(
      and(
        eq(studentTasksTable.studentId, userId),
        eq(studentTasksTable.reminded, false),
        lte(studentTasksTable.remindAt, now),
      ),
    );
  if (due.length === 0) return;
  await createNotifications(
    due.map((t) => ({
      userId,
      type: "reminder",
      title: `Reminder: ${t.title}`,
      body: t.note ?? undefined,
      link: t.courseId ? `/course/${t.courseId}` : "/my-plan",
      courseId: t.courseId ?? undefined,
      refId: t.id,
    })),
  );
  await db.update(studentTasksTable).set({ reminded: true }).where(inArray(studentTasksTable.id, due.map((t) => t.id)));
}

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;

  await ensureClassReminders(userId, req.localUser!.role).catch(() => {});
  await ensureTaskReminders(userId).catch(() => {});

  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(30);

  const [{ value: unreadCount }] = await db
    .select({ value: count() })
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, userId),
        isNull(notificationsTable.readAt),
      ),
    );

  res.json(
    ListNotificationsResponse.parse({
      unreadCount,
      notifications: rows,
    }),
  );
});

router.post(
  "/notifications/read",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = MarkNotificationsReadBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const userId = req.userId!;

    if (parsed.data.all) {
      await db
        .update(notificationsTable)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notificationsTable.userId, userId),
            isNull(notificationsTable.readAt),
          ),
        );
    } else if (parsed.data.ids && parsed.data.ids.length > 0) {
      await db
        .update(notificationsTable)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notificationsTable.userId, userId),
            inArray(notificationsTable.id, parsed.data.ids),
          ),
        );
    }

    res.json(MarkNotificationsReadResponse.parse({ ok: true }));
  },
);

export default router;
