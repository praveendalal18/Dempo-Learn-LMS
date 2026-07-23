import {
  useGetDashboard,
  useGetMe,
  useListCourses,
  useGetCalendar,
  useListNotifications,
  useGetCourseMyStats,
  useGetCourseLeaderboard,
  getGetCourseMyStatsQueryKey,
  getGetCourseLeaderboardQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BookOpen,
  Clock,
  FileText,
  CheckCircle,
  GraduationCap,
  ArrowRight,
  MessageSquare,
  Bell,
  Trophy,
  CalendarDays,
  MapPin,
  Medal,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Link } from "wouter";
import { format, isAfter } from "date-fns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageContainer, PageHeader } from "@/components/page";
import { useEffect, useState } from "react";

const LEADERBOARD_COURSE_KEY = "dashboard-leaderboard-course";

function formatScore(score: number | null | undefined) {
  if (score == null) return "—";
  return `${Number.isInteger(score) ? score : score.toFixed(1)}%`;
}

function SectionHeader({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-serif font-semibold">{title}</h2>
      {href && (
        <Link href={href} className="text-sm text-primary hover:underline flex items-center gap-1">
          {linkLabel || "View all"}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

function CourseProgressCard({ courseId, title }: { courseId: number; title: string }) {
  const { data: stats } = useGetCourseMyStats(courseId, {
    query: { enabled: !!courseId, queryKey: getGetCourseMyStatsQueryKey(courseId) },
  });

  const progressPct = stats?.totalAssignments
    ? Math.round((stats.completedCount / stats.totalAssignments) * 100)
    : 0;

  return (
    <Link href={`/course/${courseId}`}>
      <Card className="hover:border-primary transition-colors cursor-pointer group">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="font-medium truncate group-hover:text-primary transition-colors">{title}</div>
            <div className="text-right shrink-0">
              <div className="text-lg font-bold leading-none">{formatScore(stats?.overallScore)}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Overall score</div>
            </div>
          </div>
          <Progress value={progressPct} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
            <span>
              {stats ? `${stats.completedCount} of ${stats.totalAssignments} assignments` : "Loading…"}
            </span>
            <span>{progressPct}%</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MiniLeaderboard({ courses }: { courses: { id: number; title: string }[] }) {
  const [selectedId, setSelectedId] = useState<number>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(LEADERBOARD_COURSE_KEY) : null;
    const parsed = stored ? Number(stored) : NaN;
    return courses.some((c) => c.id === parsed) ? parsed : courses[0].id;
  });

  // If the stored course is no longer in the list (e.g. left a course), fall back
  useEffect(() => {
    if (!courses.some((c) => c.id === selectedId)) {
      setSelectedId(courses[0].id);
    }
  }, [courses, selectedId]);

  const courseId = courses.some((c) => c.id === selectedId) ? selectedId : courses[0].id;
  const courseTitle = courses.find((c) => c.id === courseId)?.title ?? "";

  const { data } = useGetCourseLeaderboard(courseId, {
    query: { enabled: !!courseId, queryKey: getGetCourseLeaderboardQueryKey(courseId) },
  });

  const top = data?.entries.slice(0, 3) ?? [];
  const me = data?.entries.find((e) => e.isMe);

  return (
    <section>
      <SectionHeader title="Leaderboard" href={`/course/${courseId}`} linkLabel="Full standings" />
      {courses.length > 1 && (
        <div className="mb-3">
          <Select
            value={String(courseId)}
            onValueChange={(value) => {
              const id = Number(value);
              setSelectedId(id);
              try {
                window.localStorage.setItem(LEADERBOARD_COURSE_KEY, String(id));
              } catch {
                // localStorage unavailable — selection just won't persist
              }
            }}
          >
            <SelectTrigger className="h-8 text-sm" aria-label="Select course for leaderboard">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Card>
        <CardContent className="p-0 divide-y">
          {top.length > 0 ? (
            <>
              {top.map((entry) => (
                <div key={entry.studentId} className={`flex items-center gap-3 p-3 ${entry.isMe ? "bg-primary/5" : ""}`}>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      entry.rank === 1
                        ? "bg-warning/15 text-warning"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {entry.rank === 1 && entry.overallScore != null ? <Medal className="w-3.5 h-3.5" /> : entry.rank}
                  </div>
                  <Avatar className="w-7 h-7 border shrink-0">
                    <AvatarImage src={entry.avatarUrl || ""} />
                    <AvatarFallback className="bg-primary/5 text-xs">{entry.name?.charAt(0) || "S"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-sm font-medium truncate">
                    {entry.name || "Student"}
                    {entry.isMe && <span className="ml-2 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">You</span>}
                  </div>
                  <div className="text-sm font-bold shrink-0">{formatScore(entry.overallScore)}</div>
                </div>
              ))}
              {me && me.rank > 3 && (
                <div className="flex items-center gap-3 p-3 bg-primary/5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-primary/10 text-primary">
                    {me.rank}
                  </div>
                  <div className="flex-1 min-w-0 text-sm font-medium truncate">
                    You <span className="text-muted-foreground font-normal">· {courseTitle}</span>
                  </div>
                  <div className="text-sm font-bold shrink-0">{formatScore(me.overallScore)}</div>
                </div>
              )}
            </>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Rankings appear once assignments are graded.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function StudentDashboard() {
  const { data: dashboard } = useGetDashboard();
  const { data: courses } = useListCourses();
  const { data: calendar } = useGetCalendar();
  const { data: notifications } = useListNotifications();

  const now = new Date();
  const upcomingSessions = (calendar?.sessions ?? [])
    .filter((s) => isAfter(new Date(s.startsAt), now))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 3);

  const recentActivity = (dashboard?.recentSubmissions ?? []).slice(0, 4);
  const recentNotifications = (notifications?.notifications ?? []).slice(0, 4);
  const upcomingAssignments = dashboard?.upcomingAssignments ?? [];

  return (
    <>
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Courses</CardTitle>
            <BookOpen className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{dashboard?.courseCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assignments Due Soon</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{upcomingAssignments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unread Notifications</CardTitle>
            <Bell className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{notifications?.unreadCount ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Course Progress */}
      <section>
        <SectionHeader title="My Courses" href="/courses" />
        {courses && courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => (
              <CourseProgressCard key={course.id} courseId={course.id} title={course.title} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              You haven't joined any courses yet.
              <div className="mt-3">
                <Button asChild variant="outline" size="sm">
                  <Link href="/courses">Join a course</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          <section>
            <SectionHeader title="Due Soon" href="/calendar" linkLabel="Calendar" />
            <div className="space-y-3">
              {upcomingAssignments.length > 0 ? (
                upcomingAssignments.map((assignment) => (
                  <Link key={assignment.id} href={`/assignment/${assignment.id}`}>
                    <Card className="hover:border-primary transition-colors cursor-pointer group">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium group-hover:text-primary transition-colors">{assignment.title}</div>
                            <div className="text-sm text-warning font-medium mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Due {assignment.dueDate ? format(new Date(assignment.dueDate), "MMM d, h:mm a") : "No date"}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center">
                    <CheckCircle className="w-8 h-8 text-success mb-2 opacity-50" />
                    You're all caught up! No assignments due soon.
                  </CardContent>
                </Card>
              )}
            </div>
          </section>

          <section>
            <SectionHeader title="Recent Feedback & Submissions" />
            <Card>
              <CardContent className="p-0 divide-y">
                {recentActivity.length > 0 ? (
                  recentActivity.map((sub) => (
                    <Link key={sub.id} href={`/submission/${sub.id}`}>
                      <div className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate group-hover:text-primary transition-colors">
                            {sub.assignmentTitle || "Assignment"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {sub.status === "graded" ? "Graded" : "Submitted"}
                            {sub.feedback ? " · Feedback available" : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {sub.feedback && (
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
                            <span className="text-xs font-medium text-warning bg-warning/10 px-2 py-1 rounded">Awaiting grade</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    Your submissions and professor feedback will show up here.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          <section>
            <SectionHeader title="Upcoming Classes" href="/calendar" linkLabel="Calendar" />
            <Card>
              <CardContent className="p-0 divide-y">
                {upcomingSessions.length > 0 ? (
                  upcomingSessions.map((session) => (
                    <div key={session.id} className="flex items-start gap-3 p-4">
                      <div className="w-10 h-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                        <CalendarDays className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{session.title}</div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {format(new Date(session.startsAt), "EEE, MMM d · h:mm a")}
                          {session.courseTitle ? ` · ${session.courseTitle}` : ""}
                        </div>
                        {session.location && (
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {session.location}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm">No upcoming classes scheduled.</div>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <SectionHeader title="Notifications" />
            <Card>
              <CardContent className="p-0 divide-y">
                {recentNotifications.length > 0 ? (
                  recentNotifications.map((n) => {
                    const inner = (
                      <div className={`flex items-start gap-3 p-4 ${n.link ? "hover:bg-muted/50 transition-colors cursor-pointer" : ""}`}>
                        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.readAt ? "bg-muted" : "bg-primary"}`} />
                        <div className="min-w-0">
                          <div className={`text-sm truncate ${n.readAt ? "font-normal" : "font-medium"}`}>{n.title}</div>
                          {n.body && <div className="text-xs text-muted-foreground truncate mt-0.5">{n.body}</div>}
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {format(new Date(n.createdAt), "MMM d, h:mm a")}
                          </div>
                        </div>
                      </div>
                    );
                    return n.link ? (
                      <Link key={n.id} href={n.link}>
                        {inner}
                      </Link>
                    ) : (
                      <div key={n.id}>{inner}</div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm">No notifications yet.</div>
                )}
              </CardContent>
            </Card>
          </section>

          {courses && courses.length > 0 && <MiniLeaderboard courses={courses} />}
        </div>
      </div>
    </>
  );
}

function TeacherIntegritySummary({
  flags,
}: {
  flags: { courseId: number; courseTitle: string; flaggedCount: number; topScore: number }[];
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-serif font-semibold">Academic Integrity</h2>
      </div>
      <Card>
        <CardContent className="p-0 divide-y">
          {flags.length > 0 ? (
            flags.map((flag) => (
              <Link key={flag.courseId} href={`/course/${flag.courseId}?tab=integrity`}>
                <div className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-lg bg-danger/10 text-danger flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate group-hover:text-primary transition-colors">
                      {flag.courseTitle}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {flag.flaggedCount} flagged pair{flag.flaggedCount === 1 ? "" : "s"} · top
                      similarity {Math.round(flag.topScore)}%
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary flex items-center gap-1 shrink-0">
                    Review <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center">
              <ShieldCheck className="w-8 h-8 text-success mb-2 opacity-50" />
              No flagged similar work across your courses.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function TeacherDashboard() {
  const { data: dashboard } = useGetDashboard();

  if (!dashboard) return null;

  const integrityFlags = dashboard.integrityFlags ?? [];
  const totalFlagged = integrityFlags.reduce((sum, f) => sum + f.flaggedCount, 0);

  return (
    <>
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Courses</CardTitle>
            <BookOpen className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{dashboard.courseCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <GraduationCap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{dashboard.studentCount || 0}</div>
          </CardContent>
        </Card>
        <Card className={dashboard.pendingGradingCount ? "border-warning bg-warning/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">To Grade</CardTitle>
            <Clock className={`w-4 h-4 ${dashboard.pendingGradingCount ? "text-warning" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{dashboard.pendingGradingCount || 0}</div>
          </CardContent>
        </Card>
        <Card className={totalFlagged ? "border-danger/50 bg-danger/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Flagged Similar Work</CardTitle>
            <ShieldAlert className={`w-4 h-4 ${totalFlagged ? "text-danger" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{totalFlagged}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-serif font-semibold">Recent Submissions</h2>
            </div>
            <div className="space-y-3">
              {dashboard.recentSubmissions && dashboard.recentSubmissions.length > 0 ? (
                dashboard.recentSubmissions.map((sub) => (
                  <Link key={sub.id} href={`/submission/${sub.id}`}>
                    <Card className="hover:border-primary transition-colors cursor-pointer group">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium group-hover:text-primary transition-colors">{sub.studentName}</div>
                          <div className="text-sm text-muted-foreground">{sub.assignmentTitle}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          {sub.status === "graded" ? (
                            <span className="text-sm font-medium text-success bg-success/10 px-2 py-1 rounded">
                              Graded: {sub.score}/{sub.maxScore}
                            </span>
                          ) : (
                            <span className="text-sm font-medium text-warning bg-warning/10 px-2 py-1 rounded flex items-center gap-1">
                              Needs Grading
                            </span>
                          )}
                          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-muted-foreground">No recent submissions.</CardContent>
                </Card>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <TeacherIntegritySummary flags={integrityFlags} />

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-serif font-semibold">Activity & Messages</h2>
              <Link href="/messages" className="text-sm text-primary hover:underline">View all</Link>
            </div>
            <Card>
              <CardContent className="p-0 divide-y">
                {dashboard.totalUnread ? (
                  <div className="p-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <h3 className="font-medium">You have {dashboard.totalUnread} unread messages</h3>
                    <Button asChild className="mt-4" variant="outline">
                      <Link href="/messages">Open Inbox</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">Inbox is quiet right now.</div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { data: user } = useGetMe();
  const { data: dashboard, isLoading } = useGetDashboard();

  if (isLoading || !dashboard) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-10 w-64 bg-muted rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-card rounded-xl border animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const isTeacher = user?.role === "teacher";

  return (
    <PageContainer width="wide" className="animate-in fade-in duration-300">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] || "User"}`}
        description="Here is your overview for today."
      />
      <div className="space-y-8">
        {isTeacher ? <TeacherDashboard /> : <StudentDashboard />}
      </div>
    </PageContainer>
  );
}
