import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  db,
  assignmentsTable,
  submissionsTable,
  submissionMemberGradesTable,
  courseGroupMembersTable,
  usersTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { getCourse, isCourseTeacher } from "../lib/authz";
import { createNotifications } from "../lib/notifications";
import { logActivity } from "../lib/activityLog";

const router: IRouter = Router();

/**
 * Per-member grading of a group submission. The group's shared submission
 * (submissionsTable) keeps the base score/feedback; rows here let the teacher
 * override an individual member's mark and/or note to reflect uneven
 * contribution. Built inline (raw zod, hand-written fetch on the client) to
 * avoid an orval regen, mirroring the rubric endpoints.
 */

type SubmissionCtx = {
  submission: typeof submissionsTable.$inferSelect;
  assignment: typeof assignmentsTable.$inferSelect;
  course: NonNullable<Awaited<ReturnType<typeof getCourse>>>;
};

async function submissionCtx(submissionId: number): Promise<SubmissionCtx | null> {
  const [submission] = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.id, submissionId));
  if (!submission) return null;
  const [assignment] = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.id, submission.assignmentId));
  if (!assignment) return null;
  const course = await getCourse(assignment.courseId);
  if (!course) return null;
  return { submission, assignment, course };
}

/** Roster of the submission's group, with leader flags and display names. */
async function groupRoster(groupId: number) {
  const members = await db
    .select({
      studentId: courseGroupMembersTable.studentId,
      isLeader: courseGroupMembersTable.isLeader,
      name: usersTable.name,
      email: usersTable.email,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(courseGroupMembersTable)
    .leftJoin(usersTable, eq(usersTable.id, courseGroupMembersTable.studentId))
    .where(eq(courseGroupMembersTable.groupId, groupId));
  return members;
}

// GET per-member grades for a group submission.
// Teacher, or any member of the group, may read; each sees the whole roster's
// effective scores (peers already see the shared submission and roster today).
router.get(
  "/submissions/:submissionId/member-grades",
  requireAuth,
  async (req: Request, res: Response) => {
    const submissionId = Number(req.params.submissionId);
    if (!Number.isInteger(submissionId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const ctx = await submissionCtx(submissionId);
    if (!ctx) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }
    if (ctx.submission.groupId == null) {
      res.status(400).json({ error: "Not a group submission" });
      return;
    }
    const user = req.localUser!;
    const roster = await groupRoster(ctx.submission.groupId);
    const isMember = roster.some((m) => m.studentId === user.id);
    const isTeacher = isCourseTeacher(ctx.course, user);
    if (!isMember && !isTeacher) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const overrides = await db
      .select()
      .from(submissionMemberGradesTable)
      .where(eq(submissionMemberGradesTable.submissionId, submissionId));
    const overrideByStudent = new Map(overrides.map((o) => [o.studentId, o]));

    const groupScore = ctx.submission.score;
    // Teachers see the whole roster; a student sees only their own individual
    // grade (another member's override is private to them).
    const visibleRoster = isTeacher
      ? roster
      : roster.filter((m) => m.studentId === user.id);
    const members = visibleRoster.map((m) => {
      const o = overrideByStudent.get(m.studentId);
      const overrideScore = o?.score ?? null;
      return {
        studentId: m.studentId,
        name: m.name,
        email: m.email,
        avatarUrl: m.avatarUrl,
        isLeader: m.isLeader,
        overrideScore,
        feedback: o?.feedback ?? null,
        // What this member actually earns: their override, else the group score.
        effectiveScore: overrideScore ?? groupScore,
      };
    });

    res.json({
      isGroup: true,
      groupScore,
      maxScore: ctx.assignment.maxScore,
      graded: ctx.submission.status === "graded",
      members,
    });
  },
);

const putSchema = z.object({
  grades: z
    .array(
      z.object({
        studentId: z.string().min(1),
        // null clears any override for this member (they revert to the group score)
        score: z.number().min(0).nullable(),
        feedback: z.string().trim().max(4000).nullable().optional(),
      }),
    )
    .max(100),
});

// PUT per-member grade overrides (course teacher only).
router.put(
  "/submissions/:submissionId/member-grades",
  requireAuth,
  async (req: Request, res: Response) => {
    const submissionId = Number(req.params.submissionId);
    if (!Number.isInteger(submissionId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const ctx = await submissionCtx(submissionId);
    if (!ctx) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }
    if (ctx.submission.groupId == null) {
      res.status(400).json({ error: "Not a group submission" });
      return;
    }
    if (!isCourseTeacher(ctx.course, req.localUser!)) {
      res.status(403).json({ error: "Only the course professor can grade" });
      return;
    }
    const parsed = putSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    // Only members of this submission's group may be graded here.
    const roster = await groupRoster(ctx.submission.groupId);
    const memberIds = new Set(roster.map((m) => m.studentId));
    const maxScore = ctx.assignment.maxScore;

    const notify: string[] = [];
    for (const g of parsed.data.grades) {
      if (!memberIds.has(g.studentId)) continue; // ignore non-members silently
      const feedback = g.feedback?.trim() ? g.feedback.trim() : null;
      const score =
        g.score == null ? null : Math.max(0, Math.min(maxScore, g.score));

      if (score == null && !feedback) {
        // Nothing individual to store → drop any existing override.
        await db
          .delete(submissionMemberGradesTable)
          .where(
            and(
              eq(submissionMemberGradesTable.submissionId, submissionId),
              eq(submissionMemberGradesTable.studentId, g.studentId),
            ),
          );
        continue;
      }

      await db
        .insert(submissionMemberGradesTable)
        .values({ submissionId, studentId: g.studentId, score, feedback })
        .onConflictDoUpdate({
          target: [
            submissionMemberGradesTable.submissionId,
            submissionMemberGradesTable.studentId,
          ],
          set: { score, feedback, gradedAt: new Date() },
        });
      if (score != null) notify.push(g.studentId);
    }

    void logActivity({
      user: req.localUser!,
      action: "submission.member_graded",
      message: `${req.localUser!.email} set per-member grades for "${ctx.assignment.title}"`,
      metadata: { submissionId, assignmentId: ctx.assignment.id },
    });

    if (notify.length) {
      void createNotifications(
        notify.map((userId) => ({
          userId,
          type: "submission.graded",
          title: `Individual grade: ${ctx.assignment.title}`,
          body: `Your professor set an individual grade for your group work.`,
          link: `/submission/${submissionId}`,
          courseId: ctx.course.id,
          refId: submissionId,
        })),
      );
    }

    res.json({ ok: true });
  },
);

export default router;
