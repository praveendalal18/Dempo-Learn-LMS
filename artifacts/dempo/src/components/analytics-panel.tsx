import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download, AlertTriangle, Star, BellRing } from "lucide-react";
import { EarlyAlertDialog } from "@/components/early-alert-dialog";

type CourseAnalytics = {
  course: { id: number; title: string };
  enrolledCount: number;
  submissions: { total: number; graded: number; pending: number; onTimeRate: number | null };
  avgScore: number | null;
  quiz: { count: number; graded: number; avgScore: number | null };
  gradeDistribution: { band: string; count: number }[];
  engagement: { active7: number; active30: number; logins30: number };
  attendance: { rate: number | null; sessions: number; marked: number };
  atRisk: { studentId: string; name: string; overallPct: number | null; lastActiveAt: string | null; reason: string }[];
  feedback: {
    count: number;
    avgOverall: number | null;
    avgContent: number | null;
    avgTeaching: number | null;
    avgWorkload: number | null;
    rows: { overall: number; comment: string; studentName: string | null }[];
  };
};

function pct(n: number | null | undefined): string {
  return n == null ? "—" : `${Math.round(n)}%`;
}

function ratingText(n: number | null | undefined): string {
  return n == null ? "—" : `${n.toFixed(1)}/5`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "never";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const chartConfig: ChartConfig = {
  count: { label: "Students", color: "hsl(var(--chart-1))" },
};

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-2xl font-semibold tabular-nums text-foreground">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

async function downloadCsv(path: string, filename: string): Promise<void> {
  const res = await fetch("/api" + path);
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AnalyticsPanel({ courseId }: { courseId: number }) {
  const [data, setData] = useState<CourseAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [alertStudent, setAlertStudent] = useState<
    { studentId: string; name: string; reason?: string } | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/analytics/course/" + courseId)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load analytics (${res.status})`);
        return res.json();
      })
      .then((json: CourseAnalytics) => {
        if (!cancelled) setData(json);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load analytics");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">{error}</div>
    );
  }

  if (!data) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">No analytics available.</div>
    );
  }

  const tiles = [
    { label: "Enrolled", value: data.enrolledCount },
    { label: "Avg score", value: pct(data.avgScore) },
    { label: "On-time", value: pct(data.submissions.onTimeRate) },
    { label: "Pending grading", value: data.submissions.pending },
    { label: "Attendance", value: pct(data.attendance.rate) },
    { label: "Active 30d", value: data.engagement.active30 },
  ];

  const hasGradeData = data.gradeDistribution.some((g) => g.count > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {data.submissions.graded} of {data.submissions.total} submissions graded
          {data.quiz.count > 0 && ` · ${data.quiz.count} quiz${data.quiz.count === 1 ? "" : "zes"}`}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={downloading}
          onClick={() => {
            setDownloading(true);
            downloadCsv(`/analytics/course/${courseId}/export.csv`, `course-${courseId}-analytics.csv`)
              .catch(() => setError("Download failed"))
              .finally(() => setDownloading(false));
          }}
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download CSV
        </Button>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <StatTile key={t.label} label={t.label} value={t.value} />
        ))}
      </div>

      {/* Grade distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Grade distribution</CardTitle>
          <CardDescription>How graded scores fall across bands.</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasGradeData ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No graded scores yet.
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-[3/1] w-full">
              <BarChart data={data.gradeDistribution} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="band" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Feedback summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Student feedback</CardTitle>
            <CardDescription>
              {data.feedback.count > 0
                ? `${data.feedback.count} response${data.feedback.count === 1 ? "" : "s"}`
                : "No feedback submitted yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.feedback.count > 0 && (
              <>
                <div className="flex items-baseline gap-2">
                  <Star className="h-5 w-5 text-warning" />
                  <span className="text-3xl font-semibold tabular-nums text-foreground">
                    {ratingText(data.feedback.avgOverall)}
                  </span>
                  <span className="text-xs text-muted-foreground">overall</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Content</div>
                    <div className="font-medium tabular-nums">{ratingText(data.feedback.avgContent)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Teaching</div>
                    <div className="font-medium tabular-nums">{ratingText(data.feedback.avgTeaching)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Workload</div>
                    <div className="font-medium tabular-nums">{ratingText(data.feedback.avgWorkload)}</div>
                  </div>
                </div>
                {data.feedback.rows.length > 0 && (
                  <ul className="space-y-2 border-t pt-3">
                    {data.feedback.rows
                      .filter((r) => r.comment && r.comment.trim())
                      .map((r, i) => (
                        <li key={i} className="text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{r.overall}/5</Badge>
                            <span className="text-xs text-muted-foreground">
                              {r.studentName ?? "Anonymous"}
                            </span>
                          </div>
                          <p className="mt-1 text-muted-foreground">{r.comment}</p>
                        </li>
                      ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* At risk */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">At risk</CardTitle>
            <CardDescription>Students who may need attention.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.atRisk.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No students flagged at risk.
              </div>
            ) : (
              <ul className="divide-y">
                {data.atRisk.map((s, i) => (
                  <li key={i} className="flex items-center gap-3 px-6 py-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-foreground">{s.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{s.reason}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge variant={s.overallPct != null && s.overallPct < 50 ? "danger" : "warning"}>
                        {pct(s.overallPct)}
                      </Badge>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDate(s.lastActiveAt)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-1.5"
                      onClick={() =>
                        setAlertStudent({ studentId: s.studentId, name: s.name, reason: s.reason })
                      }
                    >
                      <BellRing className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only">Send alert</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <EarlyAlertDialog
        courseId={courseId}
        student={alertStudent}
        open={alertStudent != null}
        onOpenChange={(v) => {
          if (!v) setAlertStudent(null);
        }}
      />
    </div>
  );
}
