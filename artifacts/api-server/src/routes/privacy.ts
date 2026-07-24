import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  enrollmentsTable,
  submissionsTable,
  quizAttemptsTable,
  journalEntriesTable,
  studentTasksTable,
  studentNotesTable,
  discussionPostsTable,
  attendanceTable,
  notificationsTable,
  courseFeedbackTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router: IRouter = Router();

/**
 * DPDP Act right-to-access: a signed-in user can download a copy of the
 * personal data we hold about them, as a single JSON file. (Erasure is handled
 * by admin-mediated account deletion, which fully removes the user's rows.)
 */
router.get("/me/export", requireAuth, async (req: Request, res: Response) => {
  const uid = req.userId!;

  const [profile] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, uid));

  const [
    enrollments,
    submissions,
    quizAttempts,
    journal,
    tasks,
    notes,
    discussionPosts,
    attendance,
    notifications,
    courseFeedback,
  ] = await Promise.all([
    db.select().from(enrollmentsTable).where(eq(enrollmentsTable.studentId, uid)),
    db.select().from(submissionsTable).where(eq(submissionsTable.studentId, uid)),
    db.select().from(quizAttemptsTable).where(eq(quizAttemptsTable.studentId, uid)),
    db.select().from(journalEntriesTable).where(eq(journalEntriesTable.studentId, uid)),
    db.select().from(studentTasksTable).where(eq(studentTasksTable.studentId, uid)),
    db.select().from(studentNotesTable).where(eq(studentNotesTable.authorId, uid)),
    db.select().from(discussionPostsTable).where(eq(discussionPostsTable.authorId, uid)),
    db.select().from(attendanceTable).where(eq(attendanceTable.studentId, uid)),
    db.select().from(notificationsTable).where(eq(notificationsTable.userId, uid)),
    db.select().from(courseFeedbackTable).where(eq(courseFeedbackTable.studentId, uid)),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    profile: profile ?? null,
    enrollments,
    submissions,
    quizAttempts,
    journal,
    tasks,
    notes,
    discussionPosts,
    attendance,
    notifications,
    courseFeedback,
  };

  void logActivity({
    user: req.localUser ?? null,
    action: "privacy.data_export",
    message: `${req.localUser?.email ?? uid} exported their personal data`,
  });

  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="dempo-learn-my-data.json"',
  );
  res.send(JSON.stringify(payload, null, 2));
});

export default router;
