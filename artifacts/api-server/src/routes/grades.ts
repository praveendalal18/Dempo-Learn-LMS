import { Router, type IRouter } from "express";
import { eq, and, inArray, desc } from "drizzle-orm";
import {
  db,
  enrollmentsTable,
  assignmentsTable,
  submissionsTable,
  quizzesTable,
  quizAttemptsTable,
  usersTable,
  courseGroupMembersTable,
  submissionMemberGradesTable,
} from "@workspace/db";
import {
  GetCourseMyStatsParams,
  GetCourseMyStatsResponse,
  GetCourseLeaderboardParams,
  GetCourseLeaderboardResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import {
  getCourse,
  canAccessCourse,
  getTargetsByAssignment,
  getGroupTargetsByAssignment,
} from "../lib/authz";
import { loadWeightConfig, weightedOverall, type WeightConfig, type ItemPct } from "../lib/gradebookWeighting";
import { or } from "drizzle-orm";

const router: IRouter = Router();

type Sub = typeof submissionsTable.$inferSelect;

/**
 * Per-member grade overrides for group submissions, keyed
 * `${submissionId}:${studentId}`. Applied when crediting a group submission to
 * a member so an individually-adjusted mark flows into their overall score.
 */
async function loadMemberOverrides(submissionIds: number[]) {
  const map = new Map<string, { score: number | null; feedback: string | null }>();
  if (!submissionIds.length) return map;
  try {
    const rows = await db
      .select()
      .from(submissionMemberGradesTable)
      .where(inArray(submissionMemberGradesTable.submissionId, submissionIds));
    for (const r of rows) {
      map.set(`${r.submissionId}:${r.studentId}`, {
        score: r.score,
        feedback: r.feedback,
      });
    }
  } catch {
    // Fail open: if the per-member grades table hasn't been migrated yet,
    // fall back to the shared group score rather than breaking the gradebook.
  }
  return map;
}

/**
 * The submission a specific member is credited with: for a group submission
 * with a per-member override, a shallow copy carrying the member's own
 * score/feedback; otherwise the submission unchanged.
 */
function subForMember(
  s: Sub,
  memberId: string,
  overrides: Map<string, { score: number | null; feedback: string | null }>,
): Sub {
  if (s.groupId == null) return s;
  const o = overrides.get(`${s.id}:${memberId}`);
  if (!o || (o.score == null && o.feedback == null)) return s;
  return {
    ...s,
    score: o.score ?? s.score,
    feedback: o.feedback ?? s.feedback,
  };
}
type Assignment = typeof assignmentsTable.$inferSelect;
type QuizRow = typeof quizzesTable.$inferSelect;
type QuizAttemptRow = typeof quizAttemptsTable.$inferSelect;

/**
 * Compute per-student aggregates from their submissions.
 * Overall score = average of (score / assignment maxScore * 100) across
 * graded submissions with a numeric score. Null when nothing is graded.
 */
function computeStats(
  subs: Sub[],
  assignmentById: Map<number, Assignment>,
  quizAttempts: QuizAttemptRow[] = [],
  quizById: Map<number, QuizRow> = new Map(),
  weightCfg: WeightConfig | null = null,
) {
  const completed = new Set(subs.map((s) => s.assignmentId));
  const itemPcts: ItemPct[] = [];
  for (const s of subs) {
    if (s.status !== "graded" || s.score == null) continue;
    const maxScore = assignmentById.get(s.assignmentId)?.maxScore;
    if (!maxScore || maxScore <= 0) continue;
    itemPcts.push({ key: `assignment:${s.assignmentId}`, pct: (s.score / maxScore) * 100 });
  }
  // Quizzes count once results are published (score finalized by teacher).
  let quizCompleted = 0;
  for (const a of quizAttempts) {
    const quiz = quizById.get(a.quizId);
    if (!quiz) continue;
    quizCompleted++;
    if (
      quiz.resultsPublishedAt &&
      a.status === "graded" &&
      a.score != null &&
      a.maxScore > 0
    ) {
      itemPcts.push({ key: `quiz:${a.quizId}`, pct: (a.score / a.maxScore) * 100 });
    }
  }
  return {
    overallScore: weightedOverall(itemPcts, weightCfg),
    completedCount: completed.size + quizCompleted,
    gradedCount: itemPcts.length,
  };
}

async function loadCoursePublishedQuizzes(courseId: number) {
  const quizzes = await db
    .select()
    .from(quizzesTable)
    .where(
      and(
        eq(quizzesTable.courseId, courseId),
        eq(quizzesTable.status, "published"),
      ),
    );
  return {
    quizzes,
    quizById: new Map(quizzes.map((q) => [q.id, q])),
    quizIds: quizzes.map((q) => q.id),
  };
}

async function loadCourseAssignments(courseId: number) {
  const assignments = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.courseId, courseId));
  const ids = assignments.map((a) => a.id);
  const [targetsByAssignment, groupTargetsByAssignment] = await Promise.all([
    getTargetsByAssignment(ids),
    getGroupTargetsByAssignment(ids),
  ]);

  // Membership of every group targeted by any assignment in this course.
  const allGroupIds = [...new Set([...groupTargetsByAssignment.values()].flat())];
  const memberRows = allGroupIds.length
    ? await db
        .select()
        .from(courseGroupMembersTable)
        .where(inArray(courseGroupMembersTable.groupId, allGroupIds))
    : [];
  const membersByGroup = new Map<number, string[]>();
  const groupsByStudent = new Map<string, Set<number>>();
  for (const m of memberRows) {
    membersByGroup.set(m.groupId, [
      ...(membersByGroup.get(m.groupId) ?? []),
      m.studentId,
    ]);
    const set = groupsByStudent.get(m.studentId) ?? new Set<number>();
    set.add(m.groupId);
    groupsByStudent.set(m.studentId, set);
  }

  /**
   * Assignments visible to a specific student. Group assignments count only
   * for members of a targeted group; individual ones follow target rows
   * (no rows = everyone).
   */
  const forStudent = (studentId: string) =>
    assignments.filter((a) => {
      const groupIds = groupTargetsByAssignment.get(a.id);
      if (groupIds && groupIds.length > 0) {
        const myGroups = groupsByStudent.get(studentId);
        return !!myGroups && groupIds.some((g) => myGroups.has(g));
      }
      const targets = targetsByAssignment.get(a.id);
      return !targets || targets.includes(studentId);
    });
  return {
    assignments,
    assignmentById: new Map(assignments.map((a) => [a.id, a])),
    assignmentIds: ids,
    forStudent,
    membersByGroup,
    groupsByStudent,
  };
}

router.get(
  "/courses/:courseId/my-stats",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetCourseMyStatsParams.safeParse(req.params);
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

    const {
      assignmentById,
      assignmentIds: allCourseAssignmentIds,
      forStudent,
      groupsByStudent,
    } = await loadCourseAssignments(course.id);
    const myAssignments = forStudent(req.userId!);
    const { quizzes, quizById, quizIds } = await loadCoursePublishedQuizzes(
      course.id,
    );

    const myQuizAttempts = quizIds.length
      ? await db
          .select()
          .from(quizAttemptsTable)
          .where(
            and(
              inArray(quizAttemptsTable.quizId, quizIds),
              eq(quizAttemptsTable.studentId, req.userId!),
            ),
          )
          .orderBy(desc(quizAttemptsTable.submittedAt))
      : [];
    const myGroupIds = [...(groupsByStudent.get(req.userId!) ?? [])];

    // Fetch own submissions plus shared submissions by the student's groups.
    // We search across ALL course assignments (not just currently-targeted ones)
    // so that submissions for group assignments whose group was later deleted
    // still appear — the submitter retains credit even after group removal.
    const rawSubs = allCourseAssignmentIds.length
      ? await db
          .select()
          .from(submissionsTable)
          .where(
            and(
              inArray(submissionsTable.assignmentId, allCourseAssignmentIds),
              myGroupIds.length
                ? or(
                    eq(submissionsTable.studentId, req.userId!),
                    inArray(submissionsTable.groupId, myGroupIds),
                  )
                : eq(submissionsTable.studentId, req.userId!),
            ),
          )
          .orderBy(desc(submissionsTable.submittedAt))
      : [];

    // Apply this student's own per-member override to any group submission so
    // their overall score and per-submission rows reflect their individual mark.
    const myOverrides = await loadMemberOverrides(rawSubs.map((s) => s.id));
    const subs = rawSubs.map((s) => subForMember(s, req.userId!, myOverrides));

    const weightCfg = await loadWeightConfig(course.id);
    const stats = computeStats(subs, assignmentById, myQuizAttempts, quizById, weightCfg);

    res.json(
      GetCourseMyStatsResponse.parse({
        ...stats,
        totalAssignments: myAssignments.length,
        totalQuizzes: quizzes.length,
        quizzes: myQuizAttempts.map((a) => {
          const quiz = quizById.get(a.quizId);
          const published = !!quiz?.resultsPublishedAt;
          return {
            quizId: a.quizId,
            quizTitle: quiz?.title ?? "Quiz",
            status: a.status,
            score: published ? a.score : null,
            maxScore: a.maxScore,
            resultsPublished: published,
            submittedAt: a.submittedAt,
          };
        }),
        submissions: subs.map((s) => ({
          id: s.id,
          assignmentId: s.assignmentId,
          assignmentTitle:
            assignmentById.get(s.assignmentId)?.title ?? "Assignment",
          status: s.status,
          score: s.score,
          maxScore: assignmentById.get(s.assignmentId)?.maxScore ?? null,
          hasFeedback: !!(s.feedback && s.feedback.trim()),
          submittedAt: s.submittedAt,
          gradedAt: s.gradedAt,
        })),
      }),
    );
  },
);

router.get(
  "/courses/:courseId/leaderboard",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetCourseLeaderboardParams.safeParse(req.params);
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

    const enrollments = await db
      .select({
        studentId: enrollmentsTable.studentId,
        name: usersTable.name,
        avatarUrl: usersTable.avatarUrl,
      })
      .from(enrollmentsTable)
      .innerJoin(usersTable, eq(usersTable.id, enrollmentsTable.studentId))
      .where(eq(enrollmentsTable.courseId, course.id));

    const { assignmentById, assignmentIds, membersByGroup } =
      await loadCourseAssignments(course.id);
    const { quizById, quizIds } = await loadCoursePublishedQuizzes(course.id);
    const studentIds = enrollments.map((e) => e.studentId);

    const allSubs = assignmentIds.length
      ? await db
          .select()
          .from(submissionsTable)
          .where(inArray(submissionsTable.assignmentId, assignmentIds))
      : [];

    const allQuizAttempts =
      quizIds.length && studentIds.length
        ? await db
            .select()
            .from(quizAttemptsTable)
            .where(
              and(
                inArray(quizAttemptsTable.quizId, quizIds),
                inArray(quizAttemptsTable.studentId, studentIds),
              ),
            )
        : [];

    const memberOverrides = await loadMemberOverrides(allSubs.map((s) => s.id));
    const enrolledSet = new Set(studentIds);
    const subsByStudent = new Map<string, Sub[]>();
    const push = (studentId: string, s: Sub) => {
      if (!enrolledSet.has(studentId)) return;
      const list = subsByStudent.get(studentId) ?? [];
      list.push(s);
      subsByStudent.set(studentId, list);
    };
    for (const s of allSubs) {
      if (s.groupId != null) {
        // Group submissions count for every member of the group, each with
        // their own per-member override applied if the teacher set one.
        for (const memberId of membersByGroup.get(s.groupId) ?? []) {
          push(memberId, subForMember(s, memberId, memberOverrides));
        }
      } else {
        push(s.studentId, s);
      }
    }
    const quizAttemptsByStudent = new Map<string, QuizAttemptRow[]>();
    for (const a of allQuizAttempts) {
      const list = quizAttemptsByStudent.get(a.studentId) ?? [];
      list.push(a);
      quizAttemptsByStudent.set(a.studentId, list);
    }

    const weightCfg = await loadWeightConfig(course.id);
    const rows = enrollments.map((e) => ({
      studentId: e.studentId,
      name: e.name,
      avatarUrl: e.avatarUrl,
      isMe: e.studentId === req.userId,
      ...computeStats(
        subsByStudent.get(e.studentId) ?? [],
        assignmentById,
        quizAttemptsByStudent.get(e.studentId) ?? [],
        quizById,
        weightCfg,
      ),
    }));

    // Rank: graded scores first (desc), then more completed work, then name.
    rows.sort((a, b) => {
      if (a.overallScore !== b.overallScore) {
        if (a.overallScore == null) return 1;
        if (b.overallScore == null) return -1;
        return b.overallScore - a.overallScore;
      }
      if (a.completedCount !== b.completedCount)
        return b.completedCount - a.completedCount;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });

    // Standard competition ranking: ties share a rank.
    let rank = 0;
    let prevScore: number | null | undefined;
    const entries = rows.map((r, i) => {
      if (i === 0 || r.overallScore !== prevScore) rank = i + 1;
      prevScore = r.overallScore;
      return { ...r, rank };
    });

    const mine = entries.find((e) => e.isMe);

    res.json(
      GetCourseLeaderboardResponse.parse({
        entries,
        myRank: mine ? mine.rank : null,
      }),
    );
  },
);

export default router;
