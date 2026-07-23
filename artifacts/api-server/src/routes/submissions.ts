import { Router, type IRouter } from "express";
import { eq, desc, or, inArray, and } from "drizzle-orm";
import {
  db,
  assignmentsTable,
  submissionsTable,
  submissionSimilaritiesTable,
  coursesTable,
  assignmentRubricsTable,
} from "@workspace/db";
import {
  CreateSubmissionParams,
  CreateSubmissionBody,
  CreateSubmissionResponse,
  ListAssignmentSubmissionsParams,
  ListAssignmentSubmissionsResponse,
  ListMySubmissionsResponse,
  GetSubmissionParams,
  GetSubmissionResponse,
  GradeSubmissionParams,
  GradeSubmissionBody,
  GradeSubmissionResponse,
  RunSimilarityCheckParams,
  RunSimilarityCheckResponse,
  ListCourseSimilaritiesParams,
  ListCourseSimilaritiesResponse,
  GetSubmissionComparisonParams,
  GetSubmissionComparisonResponse,
  SetSimilarityDismissalParams,
  SetSimilarityDismissalBody,
  SetSimilarityDismissalResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { enrichSubmission } from "../lib/serializers";
import { gradeTextSubmission, computePlagiarismScore } from "../lib/grading";
import {
  recomputeAssignmentSimilarities,
  recomputeAssignmentSimilaritiesSafe,
  getSimilaritiesForSubmission,
  getSimilaritiesForAssignment,
  computeMatchedRanges,
  computePairSimilarity,
} from "../lib/similarity";
import { usersTable } from "@workspace/db";
import {
  getCourse,
  isCourseTeacher,
  isEnrolled,
  isAssignmentTargetedAt,
  getStudentGroupForAssignment,
} from "../lib/authz";
import { serializeGroup } from "./groups";
import {
  courseGroupsTable,
  courseGroupMembersTable,
  groupTasksTable,
} from "@workspace/db";
import { logActivity } from "../lib/activityLog";
import { createNotifications } from "../lib/notifications";

const router: IRouter = Router();

router.post(
  "/assignments/:assignmentId/submissions",
  requireAuth,
  async (req, res): Promise<void> => {
    const submitterRole = req.localUser?.role;
    if (submitterRole === "dean" || submitterRole === "course_coordinator") {
      res.status(403).json({ error: "Oversight roles cannot submit work" });
      return;
    }
    const params = CreateSubmissionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = CreateSubmissionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, params.data.assignmentId));
    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    // Only enrolled students may submit, and never to a deactivated course.
    const submitCourse = await getCourse(assignment.courseId);
    if (!submitCourse?.isActive) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }
    if (!(await isEnrolled(assignment.courseId, req.userId!))) {
      res.status(403).json({ error: "Not enrolled in this course" });
      return;
    }

    // Non-targeted students must not learn the assignment exists.
    if (!(await isAssignmentTargetedAt(assignment.id, req.userId!))) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    // Group assignments: only members of a targeted group may submit, one
    // shared submission per group, optionally leader-only.
    let submissionGroupId: number | null = null;
    if (assignment.assignmentType === "group") {
      const mine = await getStudentGroupForAssignment(
        assignment.id,
        req.userId!,
      );
      if (!mine) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }
      if (assignment.leaderOnlySubmit && !mine.membership.isLeader) {
        res
          .status(403)
          .json({ error: "Only the group leader can submit for this assignment" });
        return;
      }
      const [existingGroupSubmission] = await db
        .select()
        .from(submissionsTable)
        .where(
          and(
            eq(submissionsTable.assignmentId, assignment.id),
            eq(submissionsTable.groupId, mine.group.id),
          ),
        );
      if (existingGroupSubmission) {
        res
          .status(409)
          .json({ error: "Your group has already submitted for this assignment" });
        return;
      }
      submissionGroupId = mine.group.id;
    } else {
      const [existingMine] = await db
        .select()
        .from(submissionsTable)
        .where(
          and(
            eq(submissionsTable.assignmentId, assignment.id),
            eq(submissionsTable.studentId, req.userId!),
          ),
        );
      if (existingMine) {
        res
          .status(409)
          .json({ error: "You have already submitted for this assignment" });
        return;
      }
    }

    // Validate the payload only uses submission types the teacher allowed and
    // that at least one piece of content is present.
    const allowed = new Set(assignment.allowedTypes);
    const provided: string[] = [];
    if (parsed.data.textResponse?.trim()) provided.push("text");
    if (parsed.data.linkUrl?.trim()) provided.push("link");
    if (parsed.data.files && parsed.data.files.length > 0) provided.push("file");
    if (parsed.data.videoPath?.trim()) provided.push("video");
    if (parsed.data.audioPath?.trim()) provided.push("audio");

    if (provided.length === 0) {
      res.status(400).json({ error: "Submission is empty" });
      return;
    }
    const disallowed = provided.filter((t) => !allowed.has(t));
    if (disallowed.length > 0) {
      res.status(400).json({
        error: `Submission type(s) not allowed: ${disallowed.join(", ")}`,
      });
      return;
    }

    const text = parsed.data.textResponse ?? null;

    // Run AI grading + plagiarism (best-effort) on any text response.
    let aiScore: number | null = null;
    let aiFeedback: string | null = null;
    let plagiarismScore: number | null = null;

    if (text && text.trim().length > 0) {
      const others = await db
        .select()
        .from(submissionsTable)
        .where(eq(submissionsTable.assignmentId, assignment.id));
      const otherTexts = others
        .map((s) => s.textResponse)
        .filter((t): t is string => !!t && t.trim().length > 0);

      const [rubricRow] = await db
        .select()
        .from(assignmentRubricsTable)
        .where(eq(assignmentRubricsTable.assignmentId, assignment.id));
      const [grade] = await Promise.all([
        gradeTextSubmission(
          assignment.title,
          assignment.description,
          assignment.maxScore,
          text,
          rubricRow?.criteria ?? null,
        ),
      ]);
      aiScore = grade.aiScore;
      aiFeedback = grade.aiFeedback;
      plagiarismScore = computePlagiarismScore(text, otherTexts);
    }

    const [submission] = await db
      .insert(submissionsTable)
      .values({
        assignmentId: assignment.id,
        studentId: req.userId!,
        groupId: submissionGroupId,
        textResponse: text,
        linkUrl: parsed.data.linkUrl ?? null,
        files: parsed.data.files ?? [],
        videoPath: parsed.data.videoPath ?? null,
        audioPath: parsed.data.audioPath ?? null,
        status: "submitted",
        aiScore,
        aiFeedback,
        plagiarismScore,
        aiDeclaration: parsed.data.aiDeclaration,
        aiDeclarationNote: parsed.data.aiDeclarationNote?.trim() || null,
      })
      .returning();

    // Best-effort: refresh pairwise similarity for this assignment. Never
    // blocks or fails the submission.
    await recomputeAssignmentSimilaritiesSafe(assignment.id);

    void logActivity({
      user: req.localUser!,
      action: "submission.created",
      message: `${req.localUser!.email} submitted work for assignment "${assignment.title}"`,
      metadata: {
        submissionId: submission.id,
        assignmentId: assignment.id,
        types: provided,
      },
    });

    res
      .status(201)
      .json(CreateSubmissionResponse.parse(await enrichSubmission(submission)));
  },
);

router.get(
  "/assignments/:assignmentId/submissions",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListAssignmentSubmissionsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, params.data.assignmentId));
    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }
    const course = await getCourse(assignment.courseId);
    if (!course || !isCourseTeacher(course, req.localUser!)) {
      res.status(403).json({ error: "Only the course professor can view all submissions" });
      return;
    }

    const submissions = await db
      .select()
      .from(submissionsTable)
      .where(eq(submissionsTable.assignmentId, params.data.assignmentId))
      .orderBy(desc(submissionsTable.submittedAt));

    // Attach the highest similarity per submission (teacher-only view).
    const pairs = await getSimilaritiesForAssignment(params.data.assignmentId);
    const maxBySubmission = new Map<number, number>();
    for (const p of pairs) {
      for (const id of [p.submissionAId, p.submissionBId]) {
        maxBySubmission.set(id, Math.max(maxBySubmission.get(id) ?? 0, p.score));
      }
    }

    const enriched = await Promise.all(submissions.map(enrichSubmission));
    const withSimilarity = enriched.map((s) => ({
      ...s,
      similarityMax: maxBySubmission.get(s.id) ?? null,
    }));
    res.json(ListAssignmentSubmissionsResponse.parse(withSimilarity));
  },
);

router.post(
  "/assignments/:assignmentId/similarity",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = RunSimilarityCheckParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, params.data.assignmentId));
    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }
    const course = await getCourse(assignment.courseId);
    if (!course || !isCourseTeacher(course, req.localUser!)) {
      res
        .status(403)
        .json({ error: "Only the course professor can run similarity checks" });
      return;
    }

    const flaggedPairs = await recomputeAssignmentSimilarities(assignment.id);
    res.json(RunSimilarityCheckResponse.parse({ flaggedPairs }));
  },
);

router.patch(
  "/similarities/:similarityId/dismissal",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = SetSimilarityDismissalParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = SetSimilarityDismissalBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [pair] = await db
      .select()
      .from(submissionSimilaritiesTable)
      .where(eq(submissionSimilaritiesTable.id, params.data.similarityId));
    if (!pair) {
      res.status(404).json({ error: "Similarity pair not found" });
      return;
    }

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, pair.assignmentId));
    const course = assignment ? await getCourse(assignment.courseId) : undefined;
    if (!course || !isCourseTeacher(course, req.localUser!)) {
      res
        .status(403)
        .json({ error: "Only the course professor can dismiss similarity flags" });
      return;
    }

    const dismissedAt = parsed.data.dismissed ? new Date() : null;
    const [updated] = await db
      .update(submissionSimilaritiesTable)
      .set({ dismissedAt })
      .where(eq(submissionSimilaritiesTable.id, pair.id))
      .returning();

    void logActivity({
      user: req.localUser!,
      action: parsed.data.dismissed
        ? "similarity.dismissed"
        : "similarity.restored",
      message: `${req.localUser!.email} ${parsed.data.dismissed ? "dismissed" : "restored"} a similarity flag for "${assignment!.title}"`,
      metadata: {
        similarityId: pair.id,
        assignmentId: pair.assignmentId,
        score: pair.score,
      },
    });

    res.json(
      SetSimilarityDismissalResponse.parse({
        id: updated.id,
        dismissedAt: updated.dismissedAt
          ? updated.dismissedAt.toISOString()
          : null,
      }),
    );
  },
);

router.get(
  "/courses/:courseId/similarities",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListCourseSimilaritiesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const course = await getCourse(params.data.courseId);
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    if (!isCourseTeacher(course, req.localUser!)) {
      res
        .status(403)
        .json({ error: "Only the course professor can view similarity flags" });
      return;
    }

    const assignments = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.courseId, course.id));
    if (assignments.length === 0) {
      res.json(ListCourseSimilaritiesResponse.parse([]));
      return;
    }
    const assignmentTitleById = new Map(assignments.map((a) => [a.id, a.title]));

    const pairs = await db
      .select()
      .from(submissionSimilaritiesTable)
      .where(
        inArray(
          submissionSimilaritiesTable.assignmentId,
          assignments.map((a) => a.id),
        ),
      );
    if (pairs.length === 0) {
      res.json(ListCourseSimilaritiesResponse.parse([]));
      return;
    }

    // Resolve both submissions and their students for each pair.
    const submissionIds = [
      ...new Set(pairs.flatMap((p) => [p.submissionAId, p.submissionBId])),
    ];
    const submissions = await db
      .select()
      .from(submissionsTable)
      .where(inArray(submissionsTable.id, submissionIds));
    const submissionById = new Map(submissions.map((s) => [s.id, s]));

    const studentIds = [...new Set(submissions.map((s) => s.studentId))];
    const students = studentIds.length
      ? await db.select().from(usersTable).where(inArray(usersTable.id, studentIds))
      : [];
    const studentById = new Map(students.map((u) => [u.id, u]));

    const side = (submissionId: number) => {
      const submission = submissionById.get(submissionId);
      if (!submission) return null;
      return {
        submissionId,
        studentId: submission.studentId,
        studentName: studentById.get(submission.studentId)?.name ?? null,
      };
    };

    const result = pairs
      .map((p) => {
        const submissionA = side(p.submissionAId);
        const submissionB = side(p.submissionBId);
        if (!submissionA || !submissionB) return null;
        return {
          id: p.id,
          assignmentId: p.assignmentId,
          assignmentTitle: assignmentTitleById.get(p.assignmentId) ?? "",
          score: p.score,
          computedAt: p.computedAt.toISOString(),
          submissionA,
          submissionB,
          dismissedAt: p.dismissedAt ? p.dismissedAt.toISOString() : null,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.score - a.score);

    res.json(ListCourseSimilaritiesResponse.parse(result));
  },
);

router.get(
  "/submissions/mine",
  requireAuth,
  async (req, res): Promise<void> => {
    // Include shared group submissions the viewer's groups made, even when
    // another member submitted them.
    const memberships = await db
      .select()
      .from(courseGroupMembersTable)
      .where(eq(courseGroupMembersTable.studentId, req.userId!));
    const myGroupIds = memberships.map((m) => m.groupId);

    const submissions = await db
      .select({ submission: submissionsTable })
      .from(submissionsTable)
      .innerJoin(
        assignmentsTable,
        eq(assignmentsTable.id, submissionsTable.assignmentId),
      )
      .innerJoin(coursesTable, eq(coursesTable.id, assignmentsTable.courseId))
      .where(
        and(
          myGroupIds.length
            ? or(
                eq(submissionsTable.studentId, req.userId!),
                inArray(submissionsTable.groupId, myGroupIds),
              )
            : eq(submissionsTable.studentId, req.userId!),
          eq(coursesTable.isActive, true),
        ),
      )
      .orderBy(desc(submissionsTable.submittedAt));

    // De-dupe (own + group can overlap when the viewer submitted).
    const seen = new Set<number>();
    const unique = submissions.filter(({ submission }) =>
      seen.has(submission.id) ? false : (seen.add(submission.id), true),
    );

    const enriched = await Promise.all(
      unique.map(({ submission }) => enrichSubmission(submission)),
    );
    res.json(ListMySubmissionsResponse.parse(enriched));
  },
);

router.get(
  "/submissions/:submissionId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetSubmissionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [submission] = await db
      .select()
      .from(submissionsTable)
      .where(eq(submissionsTable.id, params.data.submissionId));

    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    // Only the submitting student, fellow group members, or the course
    // teacher may view it.
    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, submission.assignmentId));
    const course = assignment ? await getCourse(assignment.courseId) : undefined;
    const viewerIsTeacher = !!course && isCourseTeacher(course, req.localUser!);
    // Students (including the submitter and group members) lose access when
    // the course is deactivated; the owning teacher keeps read access.
    const viewerIsOwner =
      submission.studentId === req.userId! && !!course?.isActive;
    let viewerIsGroupMember = false;
    if (
      !viewerIsTeacher &&
      !viewerIsOwner &&
      submission.groupId != null &&
      !!course?.isActive
    ) {
      const [membership] = await db
        .select()
        .from(courseGroupMembersTable)
        .where(
          and(
            eq(courseGroupMembersTable.groupId, submission.groupId),
            eq(courseGroupMembersTable.studentId, req.userId!),
          ),
        );
      viewerIsGroupMember = !!membership;
    }
    if (!viewerIsOwner && !viewerIsTeacher && !viewerIsGroupMember) {
      res.status(403).json({ error: "Not authorized to view this submission" });
      return;
    }

    const enriched = await enrichSubmission(submission);

    // Group submissions: include roster + task breakdown for the teacher and
    // group members.
    let groupExtras: Record<string, unknown> = {};
    if (submission.groupId != null) {
      const [group] = await db
        .select()
        .from(courseGroupsTable)
        .where(eq(courseGroupsTable.id, submission.groupId));
      const tasks = await db
        .select()
        .from(groupTasksTable)
        .where(
          and(
            eq(groupTasksTable.assignmentId, submission.assignmentId),
            eq(groupTasksTable.groupId, submission.groupId),
          ),
        );
      const assigneeIds = [...new Set(tasks.map((t) => t.assigneeId))];
      const assignees = assigneeIds.length
        ? await db
            .select()
            .from(usersTable)
            .where(inArray(usersTable.id, assigneeIds))
        : [];
      const nameById = new Map(assignees.map((u) => [u.id, u.name]));
      groupExtras = {
        group: group ? await serializeGroup(group) : null,
        groupTasks: tasks.map((t) => ({
          ...t,
          assigneeName: nameById.get(t.assigneeId) ?? null,
        })),
      };
    }

    // Similarity matches are teacher-only; students never see other students'
    // matches or content.
    if (viewerIsTeacher) {
      const pairs = await getSimilaritiesForSubmission(submission.id);
      const matches = await Promise.all(
        pairs.map(async (p) => {
          const otherId =
            p.submissionAId === submission.id
              ? p.submissionBId
              : p.submissionAId;
          const [other] = await db
            .select()
            .from(submissionsTable)
            .where(eq(submissionsTable.id, otherId));
          if (!other) return null;
          const [student] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, other.studentId));
          return {
            submissionId: other.id,
            studentId: other.studentId,
            studentName: student?.name ?? null,
            score: p.score,
            excerpt: other.textResponse
              ? other.textResponse.slice(0, 600)
              : null,
          };
        }),
      );
      const similarityMatches = matches
        .filter((m): m is NonNullable<typeof m> => m !== null)
        .sort((a, b) => b.score - a.score);
      res.json(
        GetSubmissionResponse.parse({
          ...enriched,
          ...groupExtras,
          similarityMatches,
          similarityMax: similarityMatches[0]?.score ?? null,
        }),
      );
      return;
    }

    res.json(GetSubmissionResponse.parse({ ...enriched, ...groupExtras }));
  },
);

router.get(
  "/submissions/:submissionId/comparison/:otherSubmissionId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetSubmissionComparisonParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [left] = await db
      .select()
      .from(submissionsTable)
      .where(eq(submissionsTable.id, params.data.submissionId));
    const [right] = await db
      .select()
      .from(submissionsTable)
      .where(eq(submissionsTable.id, params.data.otherSubmissionId));
    if (!left || !right) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }
    if (left.assignmentId !== right.assignmentId) {
      res.status(404).json({ error: "Submissions are not from the same assignment" });
      return;
    }

    // Teacher-only: comparison exposes another student's full text.
    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, left.assignmentId));
    const course = assignment ? await getCourse(assignment.courseId) : undefined;
    if (!course || !isCourseTeacher(course, req.localUser!)) {
      res
        .status(403)
        .json({ error: "Only the course professor can compare submissions" });
      return;
    }

    if (!left.textResponse?.trim() || !right.textResponse?.trim()) {
      res
        .status(400)
        .json({ error: "Both submissions must have a text response to compare" });
      return;
    }

    const { aRanges, bRanges } = computeMatchedRanges(
      left.textResponse,
      right.textResponse,
    );
    const score = computePairSimilarity(left.textResponse, right.textResponse);

    const students = await db
      .select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.id, left.studentId),
          eq(usersTable.id, right.studentId),
        ),
      );
    const nameOf = (id: string) =>
      students.find((s) => s.id === id)?.name ?? null;

    res.json(
      GetSubmissionComparisonResponse.parse({
        score,
        left: {
          submissionId: left.id,
          studentId: left.studentId,
          studentName: nameOf(left.studentId),
          text: left.textResponse,
          ranges: aRanges,
        },
        right: {
          submissionId: right.id,
          studentId: right.studentId,
          studentName: nameOf(right.studentId),
          text: right.textResponse,
          ranges: bRanges,
        },
      }),
    );
  },
);

router.patch(
  "/submissions/:submissionId/grade",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GradeSubmissionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = GradeSubmissionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [existing] = await db
      .select()
      .from(submissionsTable)
      .where(eq(submissionsTable.id, params.data.submissionId));
    if (!existing) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, existing.assignmentId));
    const course = assignment
      ? await getCourse(assignment.courseId)
      : undefined;
    if (!course || !isCourseTeacher(course, req.localUser!)) {
      res.status(403).json({ error: "Only the course professor can grade" });
      return;
    }

    // Clamp the score into the assignment's valid range.
    const score = Math.max(
      0,
      Math.min(assignment!.maxScore, parsed.data.score),
    );

    const [submission] = await db
      .update(submissionsTable)
      .set({
        score,
        feedback: parsed.data.feedback ?? null,
        status: "graded",
        gradedAt: new Date(),
      })
      .where(eq(submissionsTable.id, params.data.submissionId))
      .returning();

    void logActivity({
      user: req.localUser!,
      action: "submission.graded",
      message: `${req.localUser!.email} graded a submission for "${assignment!.title}" (${score}/${assignment!.maxScore})`,
      metadata: {
        submissionId: submission.id,
        assignmentId: assignment!.id,
        score,
      },
    });

    // Group submissions: every member gets the grade notification.
    const notifyIds = submission.groupId
      ? [
          ...new Set(
            (
              await db
                .select()
                .from(courseGroupMembersTable)
                .where(eq(courseGroupMembersTable.groupId, submission.groupId))
            ).map((m) => m.studentId),
          ),
        ]
      : [submission.studentId];
    void createNotifications(
      notifyIds.map((userId) => ({
        userId,
        type: "submission.graded",
        title: `Graded: ${assignment!.title}`,
        body: `You scored ${score}/${assignment!.maxScore}${parsed.data.feedback ? " — feedback included" : ""}.`,
        link: `/submission/${submission.id}`,
        courseId: course.id,
        refId: submission.id,
      })),
    );

    res.json(GradeSubmissionResponse.parse(await enrichSubmission(submission)));
  },
);

export default router;
