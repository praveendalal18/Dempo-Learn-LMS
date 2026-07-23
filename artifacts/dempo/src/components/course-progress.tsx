import { Link } from "wouter";
import {
  useGetCourseMyStats,
  useGetCourseLeaderboard,
  getGetCourseMyStatsQueryKey,
  getGetCourseLeaderboardQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Trophy,
  Loader2,
  MessageSquare,
  ArrowRight,
  Clock,
  GraduationCap,
  CheckCircle,
  Medal,
} from "lucide-react";
import { format } from "date-fns";

function formatScore(score: number | null | undefined) {
  if (score == null) return "—";
  return `${Number.isInteger(score) ? score : score.toFixed(1)}%`;
}

export function CourseProgressView({ courseId }: { courseId: number }) {
  const { data: stats, isLoading } = useGetCourseMyStats(courseId, {
    query: { enabled: !!courseId, queryKey: getGetCourseMyStatsQueryKey(courseId) },
  });

  if (isLoading || !stats) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mt-10" />
      </div>
    );
  }

  const totalWork = stats.totalAssignments + (stats.totalQuizzes ?? 0);
  const progressPct = totalWork
    ? Math.round((stats.completedCount / totalWork) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Score</CardTitle>
            <GraduationCap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatScore(stats.overallScore)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.gradedCount > 0
                ? `Average across ${stats.gradedCount} graded ${stats.gradedCount === 1 ? "item" : "items"}`
                : "No graded work yet"}
            </p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Course Progress</CardTitle>
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-3xl font-bold">
                {stats.completedCount}
                <span className="text-lg font-medium text-muted-foreground"> of {totalWork}</span>
              </div>
              <span className="text-sm text-muted-foreground">{progressPct}% complete</span>
            </div>
            <Progress value={progressPct} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">Assignments & quizzes completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Submissions & feedback */}
      <section>
        <h2 className="text-xl font-serif font-semibold mb-4">Submissions & Feedback</h2>
        {stats.submissions.length > 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-0 divide-y">
              {stats.submissions.map((sub) => (
                <Link key={sub.id} href={`/submission/${sub.id}`}>
                  <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium group-hover:text-primary transition-colors truncate">
                        {sub.assignmentTitle}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        Submitted {format(new Date(sub.submittedAt), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {sub.hasFeedback && (
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Feedback
                        </span>
                      )}
                      {sub.status === "graded" ? (
                        <span className="text-sm font-medium text-success bg-success/10 px-2 py-1 rounded">
                          {sub.score ?? "—"}/{sub.maxScore ?? "—"}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-accent bg-accent/10 px-2 py-1 rounded">
                          Awaiting grade
                        </span>
                      )}
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <GraduationCap className="w-12 h-12 text-muted mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No submissions yet</h3>
              <p className="max-w-sm">
                Once you submit assignments, your scores and professor feedback will show up here.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {(stats.quizzes?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-xl font-serif font-semibold mb-4">Quizzes</h2>
          <Card className="shadow-sm">
            <CardContent className="p-0 divide-y">
              {stats.quizzes!.map((q) => (
                <Link key={q.quizId} href={`/quiz/${q.quizId}`}>
                  <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium group-hover:text-primary transition-colors truncate">
                        {q.quizTitle}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        Taken {format(new Date(q.submittedAt), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {q.resultsPublished && q.score != null ? (
                        <span className="text-sm font-medium text-success bg-success/10 px-2 py-1 rounded">
                          {q.score}/{q.maxScore}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-accent bg-accent/10 px-2 py-1 rounded">
                          Awaiting results
                        </span>
                      )}
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

const RANK_STYLES: Record<number, string> = {
  1: "bg-warning/15 text-warning",
  2: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  3: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
};

export function LeaderboardView({ courseId }: { courseId: number }) {
  const { data, isLoading } = useGetCourseLeaderboard(courseId, {
    query: { enabled: !!courseId, queryKey: getGetCourseLeaderboardQueryKey(courseId) },
  });

  if (isLoading || !data) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mt-10" />
      </div>
    );
  }

  const hasScores = data.entries.some((e) => e.overallScore != null);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-warning" />
          Leaderboard
        </h2>
        {data.myRank != null && (
          <span className="text-sm text-muted-foreground">
            You're ranked <span className="font-semibold text-foreground">#{data.myRank}</span> of {data.entries.length}
          </span>
        )}
      </div>

      {data.entries.length > 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-0 divide-y">
            {data.entries.map((entry) => (
              <div
                key={entry.studentId}
                className={`flex items-center gap-4 p-4 transition-colors ${
                  entry.isMe ? "bg-primary/5 border-l-4 border-l-primary" : ""
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    RANK_STYLES[entry.rank] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  {entry.rank <= 3 && entry.overallScore != null ? (
                    <Medal className="w-4 h-4" />
                  ) : (
                    entry.rank
                  )}
                </div>
                <Avatar className="w-9 h-9 border shrink-0">
                  <AvatarImage src={entry.avatarUrl || ""} />
                  <AvatarFallback className="bg-primary/5">
                    {entry.name?.charAt(0) || "S"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {entry.name || "Student"}
                    {entry.isMe && (
                      <span className="ml-2 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {entry.completedCount} {entry.completedCount === 1 ? "assignment" : "assignments"} completed
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold">{formatScore(entry.overallScore)}</div>
                  {entry.overallScore == null && (
                    <div className="text-xs text-muted-foreground">Not graded yet</div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <Trophy className="w-12 h-12 text-muted mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No students yet</h3>
            <p className="max-w-sm">The leaderboard will fill in as students join and get graded.</p>
          </CardContent>
        </Card>
      )}

      {data.entries.length > 0 && !hasScores && (
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Rankings will appear once assignments are graded.
        </p>
      )}
    </div>
  );
}
