import { Router, type IRouter } from "express";
import { eq, and, desc, asc, inArray } from "drizzle-orm";
import {
  db,
  quizzesTable,
  quizQuestionsTable,
  quizAttemptsTable,
  usersTable,
  type Quiz,
  type QuizQuestion,
  type QuizAttempt,
  type QuizAnswer,
} from "@workspace/db";
import {
  ListQuizzesParams,
  ListQuizzesResponse,
  CreateQuizParams,
  CreateQuizBody,
  CreateQuizResponse,
  GetQuizParams,
  GetQuizResponse,
  UpdateQuizParams,
  UpdateQuizBody,
  UpdateQuizResponse,
  DeleteQuizParams,
  PublishQuizParams,
  PublishQuizResponse,
  PublishQuizResultsParams,
  PublishQuizResultsResponse,
  ListQuizAttemptsParams,
  ListQuizAttemptsResponse,
  CreateQuizAttemptParams,
  CreateQuizAttemptBody,
  CreateQuizAttemptResponse,
  GradeQuizAttemptParams,
  GradeQuizAttemptBody,
  GradeQuizAttemptResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { getCourse, canAccessCourse, isCourseTeacher, isEnrolled } from "../lib/authz";
import { gradeShortAnswer } from "../lib/grading";
import { logActivity } from "../lib/activityLog";
import { notifyCourseStudents, createNotifications } from "../lib/notifications";

const router: IRouter = Router();

type QuestionInput = {
  type: "multiple_choice" | "short_answer";
  prompt: string;
  options?: string[];
  correctOption?: number;
  points: number;
};

function validateQuestions(questions: QuestionInput[]): string | null {
  for (const q of questions) {
    if (q.type === "multiple_choice") {
      const options = q.options ?? [];
      if (options.length < 2) {
        return "Multiple-choice questions need at least two options";
      }
      if (
        q.correctOption == null ||
        q.correctOption < 0 ||
        q.correctOption >= options.length
      ) {
        return "Multiple-choice questions need a valid correct option";
      }
    }
  }
  return null;
}

function quizMaxScore(questions: QuizQuestion[]): number {
  return questions.reduce((sum, q) => sum + q.points, 0);
}

/** Strip correct answers for students. */
function sanitizeQuestions(
  questions: QuizQuestion[],
  revealAnswers: boolean,
): (QuizQuestion | (Omit<QuizQuestion, "correctOption"> & { correctOption: null }))[] {
  if (revealAnswers) return questions;
  return questions.map((q) => ({ ...q, correctOption: null }));
}

/** Strip scoring info from a student's own attempt until results are published. */
function sanitizeAttempt(attempt: QuizAttempt, revealScores: boolean): QuizAttempt {
  if (revealScores) return attempt;
  return {
    ...attempt,
    score: null,
    answers: attempt.answers.map((a) => ({
      questionId: a.questionId,
      selectedOption: a.selectedOption ?? null,
      textAnswer: a.textAnswer ?? null,
      autoScore: null,
      aiScore: null,
      aiFeedback: null,
      score: null,
    })),
  };
}

async function getQuizQuestions(quizId: number): Promise<QuizQuestion[]> {
  return db
    .select()
    .from(quizQuestionsTable)
    .where(eq(quizQuestionsTable.quizId, quizId))
    .orderBy(asc(quizQuestionsTable.position), asc(quizQuestionsTable.id));
}

async function loadQuizWithCourse(quizId: number) {
  const [quiz] = await db
    .select()
    .from(quizzesTable)
    .where(eq(quizzesTable.id, quizId));
  if (!quiz) return { quiz: undefined, course: undefined };
  const course = await getCourse(quiz.courseId);
  return { quiz, course };
}

async function insertQuestions(quizId: number, questions: QuestionInput[]) {
  await db.insert(quizQuestionsTable).values(
    questions.map((q, i) => ({
      quizId,
      position: i,
      type: q.type,
      prompt: q.prompt,
      options: q.type === "multiple_choice" ? (q.options ?? []) : [],
      correctOption: q.type === "multiple_choice" ? q.correctOption! : null,
      points: q.points,
    })),
  );
}

router.get(
  "/courses/:courseId/quizzes",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListQuizzesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const course = await getCourse(params.data.courseId);
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    if (!(await canAccessCourse(course, req.localUser!))) {
      res.status(403).json({ error: "Not a member of this course" });
      return;
    }
    const teacher = isCourseTeacher(course, req.localUser!);

    const quizzes = await db
      .select()
      .from(quizzesTable)
      .where(eq(quizzesTable.courseId, course.id))
      .orderBy(desc(quizzesTable.createdAt));

    const visible = teacher
      ? quizzes
      : quizzes.filter((q) => q.status === "published");

    const enriched = await Promise.all(
      visible.map(async (quiz) => {
        const questions = await getQuizQuestions(quiz.id);
        const attempts = await db
          .select()
          .from(quizAttemptsTable)
          .where(eq(quizAttemptsTable.quizId, quiz.id));
        const mine = attempts.find((a) => a.studentId === req.userId!);
        return {
          ...quiz,
          maxScore: quizMaxScore(questions),
          questionCount: questions.length,
          attemptCount: attempts.length,
          myAttempt: mine
            ? sanitizeAttempt(mine, !!quiz.resultsPublishedAt)
            : null,
        };
      }),
    );

    res.json(ListQuizzesResponse.parse(enriched));
  },
);

router.post(
  "/courses/:courseId/quizzes",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = CreateQuizParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = CreateQuizBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const course = await getCourse(params.data.courseId);
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    if (!isCourseTeacher(course, req.localUser!)) {
      res.status(403).json({ error: "Only the course teacher can create quizzes" });
      return;
    }
    const problem = validateQuestions(parsed.data.questions as QuestionInput[]);
    if (problem) {
      res.status(400).json({ error: problem });
      return;
    }

    const [quiz] = await db
      .insert(quizzesTable)
      .values({
        courseId: course.id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        status: "draft",
      })
      .returning();
    await insertQuestions(quiz.id, parsed.data.questions as QuestionInput[]);
    const questions = await getQuizQuestions(quiz.id);

    void logActivity({
      user: req.localUser!,
      action: "quiz.created",
      message: `${req.localUser!.email} created quiz "${quiz.title}" in course "${course.title}"`,
      metadata: { quizId: quiz.id, courseId: course.id },
    });

    res.status(201).json(
      CreateQuizResponse.parse({
        ...quiz,
        maxScore: quizMaxScore(questions),
        questionCount: questions.length,
        attemptCount: 0,
        questions,
        myAttempt: null,
      }),
    );
  },
);

router.get(
  "/quizzes/:quizId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetQuizParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const { quiz, course } = await loadQuizWithCourse(params.data.quizId);
    if (!quiz || !course) {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }
    if (!(await canAccessCourse(course, req.localUser!))) {
      res.status(403).json({ error: "Not a member of this course" });
      return;
    }
    const teacher = isCourseTeacher(course, req.localUser!);
    if (!teacher && quiz.status !== "published") {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }

    const questions = await getQuizQuestions(quiz.id);
    const attempts = await db
      .select()
      .from(quizAttemptsTable)
      .where(eq(quizAttemptsTable.quizId, quiz.id));
    const mine = attempts.find((a) => a.studentId === req.userId!);
    const revealAnswers =
      teacher || (!!quiz.resultsPublishedAt && !!mine);

    res.json(
      GetQuizResponse.parse({
        ...quiz,
        maxScore: quizMaxScore(questions),
        questionCount: questions.length,
        attemptCount: attempts.length,
        questions: sanitizeQuestions(questions, revealAnswers),
        myAttempt: mine
          ? sanitizeAttempt(mine, !!quiz.resultsPublishedAt)
          : null,
      }),
    );
  },
);

router.put(
  "/quizzes/:quizId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UpdateQuizParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateQuizBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { quiz, course } = await loadQuizWithCourse(params.data.quizId);
    if (!quiz || !course) {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }
    if (!isCourseTeacher(course, req.localUser!)) {
      res.status(403).json({ error: "Only the course teacher can edit quizzes" });
      return;
    }
    const problem = validateQuestions(parsed.data.questions as QuestionInput[]);
    if (problem) {
      res.status(400).json({ error: problem });
      return;
    }

    const attempts = await db
      .select()
      .from(quizAttemptsTable)
      .where(eq(quizAttemptsTable.quizId, quiz.id));
    if (attempts.length > 0) {
      res.status(409).json({
        error: "Questions cannot change after students have taken the quiz",
      });
      return;
    }

    const [updated] = await db
      .update(quizzesTable)
      .set({
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      })
      .where(eq(quizzesTable.id, quiz.id))
      .returning();
    await db
      .delete(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quizId, quiz.id));
    await insertQuestions(quiz.id, parsed.data.questions as QuestionInput[]);
    const questions = await getQuizQuestions(quiz.id);

    res.json(
      UpdateQuizResponse.parse({
        ...updated,
        maxScore: quizMaxScore(questions),
        questionCount: questions.length,
        attemptCount: 0,
        questions,
        myAttempt: null,
      }),
    );
  },
);

router.delete(
  "/quizzes/:quizId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = DeleteQuizParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const { quiz, course } = await loadQuizWithCourse(params.data.quizId);
    if (!quiz || !course) {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }
    if (!isCourseTeacher(course, req.localUser!)) {
      res.status(403).json({ error: "Only the course teacher can delete quizzes" });
      return;
    }
    await db.delete(quizAttemptsTable).where(eq(quizAttemptsTable.quizId, quiz.id));
    await db.delete(quizQuestionsTable).where(eq(quizQuestionsTable.quizId, quiz.id));
    await db.delete(quizzesTable).where(eq(quizzesTable.id, quiz.id));

    void logActivity({
      user: req.localUser!,
      action: "quiz.deleted",
      message: `${req.localUser!.email} deleted quiz "${quiz.title}"`,
      metadata: { quizId: quiz.id, courseId: course.id },
    });

    res.status(204).end();
  },
);

router.post(
  "/quizzes/:quizId/publish",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = PublishQuizParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const { quiz, course } = await loadQuizWithCourse(params.data.quizId);
    if (!quiz || !course) {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }
    if (!isCourseTeacher(course, req.localUser!)) {
      res.status(403).json({ error: "Only the course teacher can publish quizzes" });
      return;
    }

    const [updated] = await db
      .update(quizzesTable)
      .set({ status: "published" })
      .where(eq(quizzesTable.id, quiz.id))
      .returning();
    const questions = await getQuizQuestions(quiz.id);

    if (quiz.status !== "published") {
      void notifyCourseStudents(course.id, {
        type: "quiz.published",
        title: `New quiz: ${quiz.title}`,
        body: `Posted in ${course.title}${quiz.dueDate ? ` — due ${quiz.dueDate.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC` : ""}`,
        link: `/quiz/${quiz.id}`,
        refId: quiz.id,
      });
    }

    res.json(
      PublishQuizResponse.parse({
        ...updated,
        maxScore: quizMaxScore(questions),
        questionCount: questions.length,
      }),
    );
  },
);

router.post(
  "/quizzes/:quizId/publish-results",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = PublishQuizResultsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const { quiz, course } = await loadQuizWithCourse(params.data.quizId);
    if (!quiz || !course) {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }
    if (!isCourseTeacher(course, req.localUser!)) {
      res.status(403).json({ error: "Only the course teacher can publish results" });
      return;
    }

    // Finalize every attempt: any answer without a teacher-set score falls
    // back to its AI suggestion (short answer) or auto score (multiple choice).
    const attempts = await db
      .select()
      .from(quizAttemptsTable)
      .where(eq(quizAttemptsTable.quizId, quiz.id));
    const now = new Date();
    for (const attempt of attempts) {
      // Finalize with the teacher's manual score, else the deterministic
      // auto-score for objective questions. The AI suggestion (aiScore) is
      // NEVER auto-finalized — it can be steered by prompt injection in the
      // student's answer, so a short answer with no human/auto score stays 0
      // until a teacher grades it.
      const answers = attempt.answers.map((a) => ({
        ...a,
        score: a.score ?? a.autoScore ?? 0,
      }));
      const total = answers.reduce((sum, a) => sum + (a.score ?? 0), 0);
      await db
        .update(quizAttemptsTable)
        .set({ answers, score: total, status: "graded", gradedAt: now })
        .where(eq(quizAttemptsTable.id, attempt.id));
    }

    const [updated] = await db
      .update(quizzesTable)
      .set({ resultsPublishedAt: now })
      .where(eq(quizzesTable.id, quiz.id))
      .returning();
    const questions = await getQuizQuestions(quiz.id);

    void logActivity({
      user: req.localUser!,
      action: "quiz.results_published",
      message: `${req.localUser!.email} published results for quiz "${quiz.title}"`,
      metadata: { quizId: quiz.id, courseId: course.id },
    });

    void createNotifications(
      attempts.map((a) => ({
        userId: a.studentId,
        type: "quiz.results_published",
        title: `Results published: ${quiz.title}`,
        body: `Your quiz score is now available in ${course.title}.`,
        link: `/quiz/${quiz.id}`,
        courseId: course.id,
        refId: quiz.id,
      })),
    );

    res.json(
      PublishQuizResultsResponse.parse({
        ...updated,
        maxScore: quizMaxScore(questions),
        questionCount: questions.length,
        attemptCount: attempts.length,
      }),
    );
  },
);

router.get(
  "/quizzes/:quizId/attempts",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListQuizAttemptsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const { quiz, course } = await loadQuizWithCourse(params.data.quizId);
    if (!quiz || !course) {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }
    if (!isCourseTeacher(course, req.localUser!)) {
      res.status(403).json({ error: "Only the course teacher can view all attempts" });
      return;
    }

    const attempts = await db
      .select()
      .from(quizAttemptsTable)
      .where(eq(quizAttemptsTable.quizId, quiz.id))
      .orderBy(desc(quizAttemptsTable.submittedAt));

    const studentIds = attempts.map((a) => a.studentId);
    const students = studentIds.length
      ? await db
          .select()
          .from(usersTable)
          .where(inArray(usersTable.id, studentIds))
      : [];
    const nameById = new Map(students.map((s) => [s.id, s.name ?? s.email]));

    res.json(
      ListQuizAttemptsResponse.parse(
        attempts.map((a) => ({
          ...a,
          studentName: nameById.get(a.studentId) ?? null,
        })),
      ),
    );
  },
);

router.post(
  "/quizzes/:quizId/attempts",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = CreateQuizAttemptParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = CreateQuizAttemptBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { quiz, course } = await loadQuizWithCourse(params.data.quizId);
    if (!quiz || !course) {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }
    if (!(await isEnrolled(course.id, req.userId!))) {
      res.status(403).json({ error: "Not enrolled in this course" });
      return;
    }
    if (quiz.status !== "published") {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }
    if (quiz.resultsPublishedAt) {
      res.status(409).json({
        error: "Results have been published; this quiz is closed",
      });
      return;
    }

    const [existing] = await db
      .select()
      .from(quizAttemptsTable)
      .where(
        and(
          eq(quizAttemptsTable.quizId, quiz.id),
          eq(quizAttemptsTable.studentId, req.userId!),
        ),
      );
    if (existing) {
      res.status(409).json({ error: "You have already taken this quiz" });
      return;
    }

    const questions = await getQuizQuestions(quiz.id);
    const byId = new Map(questions.map((q) => [q.id, q]));
    const answerByQuestion = new Map(
      parsed.data.answers.map((a) => [a.questionId, a]),
    );
    for (const a of parsed.data.answers) {
      if (!byId.has(a.questionId)) {
        res.status(400).json({ error: "Answer references an unknown question" });
        return;
      }
    }

    // Score every question: MC instantly, short answers via AI (best-effort).
    const answers: QuizAnswer[] = await Promise.all(
      questions.map(async (q) => {
        const a = answerByQuestion.get(q.id);
        if (q.type === "multiple_choice") {
          const selected =
            a?.selectedOption != null &&
            a.selectedOption >= 0 &&
            a.selectedOption < q.options.length
              ? a.selectedOption
              : null;
          const autoScore =
            selected != null && selected === q.correctOption ? q.points : 0;
          return {
            questionId: q.id,
            selectedOption: selected,
            textAnswer: null,
            autoScore,
            aiScore: null,
            aiFeedback: null,
            score: null,
          };
        }
        const text = a?.textAnswer?.trim() ?? "";
        const graded = await gradeShortAnswer(q.prompt, q.points, text);
        return {
          questionId: q.id,
          selectedOption: null,
          textAnswer: text || null,
          autoScore: null,
          aiScore: graded.aiScore,
          aiFeedback: graded.aiFeedback,
          score: null,
        };
      }),
    );

    const [attempt] = await db
      .insert(quizAttemptsTable)
      .values({
        quizId: quiz.id,
        studentId: req.userId!,
        answers,
        score: null,
        maxScore: quizMaxScore(questions),
        status: "submitted",
      })
      .returning();

    void logActivity({
      user: req.localUser!,
      action: "quiz.attempted",
      message: `${req.localUser!.email} took quiz "${quiz.title}"`,
      metadata: { quizId: quiz.id, attemptId: attempt.id },
    });

    res.status(201).json(
      CreateQuizAttemptResponse.parse(
        sanitizeAttempt(attempt, !!quiz.resultsPublishedAt),
      ),
    );
  },
);

router.patch(
  "/quiz-attempts/:attemptId/grade",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GradeQuizAttemptParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = GradeQuizAttemptBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [attempt] = await db
      .select()
      .from(quizAttemptsTable)
      .where(eq(quizAttemptsTable.id, params.data.attemptId));
    if (!attempt) {
      res.status(404).json({ error: "Attempt not found" });
      return;
    }
    const { quiz, course } = await loadQuizWithCourse(attempt.quizId);
    if (!quiz || !course || !isCourseTeacher(course, req.localUser!)) {
      res.status(403).json({ error: "Only the course teacher can grade" });
      return;
    }

    const questions = await getQuizQuestions(quiz.id);
    const pointsById = new Map(questions.map((q) => [q.id, q.points]));
    const overrides = new Map<number, number>();
    for (const s of parsed.data.scores) {
      const max = pointsById.get(s.questionId);
      if (max == null) {
        res.status(400).json({ error: "Score references an unknown question" });
        return;
      }
      overrides.set(s.questionId, Math.max(0, Math.min(max, s.score)));
    }

    const answers = attempt.answers.map((a) => {
      const override = overrides.get(a.questionId);
      const score =
        override != null ? override : a.score ?? a.autoScore ?? 0;
      return { ...a, score };
    });
    const total = answers.reduce((sum, a) => sum + (a.score ?? 0), 0);

    const [updated] = await db
      .update(quizAttemptsTable)
      .set({
        answers,
        score: total,
        status: "graded",
        gradedAt: new Date(),
      })
      .where(eq(quizAttemptsTable.id, attempt.id))
      .returning();

    void logActivity({
      user: req.localUser!,
      action: "quiz.attempt_graded",
      message: `${req.localUser!.email} adjusted a quiz attempt for "${quiz.title}" (${total}/${updated.maxScore})`,
      metadata: { quizId: quiz.id, attemptId: attempt.id, score: total },
    });

    res.json(GradeQuizAttemptResponse.parse(updated));
  },
);

export default router;
