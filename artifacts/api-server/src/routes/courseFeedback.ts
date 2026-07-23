import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, coursesTable, enrollmentsTable, courseFeedbackTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { getCourse } from "../lib/authz";

const router: IRouter = Router();

async function isEnrolled(courseId: number, studentId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: enrollmentsTable.id })
    .from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.courseId, courseId), eq(enrollmentsTable.studentId, studentId)));
  return !!row;
}

const rating = z.number().int().min(1).max(5);
const bodySchema = z.object({
  overallRating: rating,
  contentRating: rating.optional(),
  teachingRating: rating.optional(),
  workloadRating: rating.optional(),
  comment: z.string().trim().max(4000).optional(),
});

// Student submits or updates their feedback for a course they're enrolled in.
router.put(
  "/courses/:courseId/feedback",
  requireAuth,
  async (req: Request, res: Response) => {
    const courseId = Number(req.params.courseId);
    if (!Number.isInteger(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
    const user = req.localUser!;
    if (user.role !== "student") { res.status(403).json({ error: "Only students can rate a course" }); return; }
    const course = await getCourse(courseId);
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }
    if (!(await isEnrolled(courseId, user.id))) {
      res.status(403).json({ error: "You must be enrolled to rate this course" }); return;
    }
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    await db
      .insert(courseFeedbackTable)
      .values({
        courseId,
        studentId: user.id,
        overallRating: parsed.data.overallRating,
        contentRating: parsed.data.contentRating ?? null,
        teachingRating: parsed.data.teachingRating ?? null,
        workloadRating: parsed.data.workloadRating ?? null,
        comment: parsed.data.comment?.trim() || null,
      })
      .onConflictDoUpdate({
        target: [courseFeedbackTable.courseId, courseFeedbackTable.studentId],
        set: {
          overallRating: parsed.data.overallRating,
          contentRating: parsed.data.contentRating ?? null,
          teachingRating: parsed.data.teachingRating ?? null,
          workloadRating: parsed.data.workloadRating ?? null,
          comment: parsed.data.comment?.trim() || null,
          updatedAt: new Date(),
        },
      });

    res.json({ ok: true });
  },
);

// Student reads back their own feedback (to prefill the form).
router.get(
  "/courses/:courseId/feedback/mine",
  requireAuth,
  async (req: Request, res: Response) => {
    const courseId = Number(req.params.courseId);
    if (!Number.isInteger(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
    const [row] = await db
      .select()
      .from(courseFeedbackTable)
      .where(and(eq(courseFeedbackTable.courseId, courseId), eq(courseFeedbackTable.studentId, req.localUser!.id)));
    res.json(row ?? null);
  },
);

export default router;
