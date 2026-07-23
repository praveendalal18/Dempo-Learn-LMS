import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PageContainer, PageHeader } from "@/components/page";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";

type ProgramCourse = {
  courseId: number;
  title: string;
  teacherName: string | null;
  enrolledCount: number;
  avgScore: number | null;
  onTimeRate: number | null;
  pendingGrading: number;
  atRiskCount: number;
  attendanceRate: number | null;
  active30: number;
  feedbackAvg: number | null;
  feedbackCount: number;
};

type ProgramAnalytics = {
  totals: {
    courses: number;
    students: number;
    atRisk: number;
    pendingGrading: number;
    avgScore: number | null;
    avgFeedback: number | null;
  };
  courses: ProgramCourse[];
  cohorts: { cohortId: number; name: string; memberCount: number }[];
};

function pct(n: number | null | undefined): string {
  return n == null ? "—" : `${Math.round(n)}%`;
}

function ratingText(n: number | null | undefined): string {
  return n == null ? "—" : `${n.toFixed(1)}/5`;
}

const chartConfig: ChartConfig = {
  avgScore: { label: "Avg score", color: "hsl(var(--chart-1))" },
};

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

export default function AnalyticsPage() {
  const [data, setData] = useState<ProgramAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/analytics/program")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load analytics (${res.status})`);
        return res.json();
      })
      .then((json: ProgramAnalytics) => {
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
  }, []);

  const chartData =
    data?.courses.filter((c) => c.avgScore != null).map((c) => ({
      title: c.title.length > 16 ? c.title.slice(0, 15) + "…" : c.title,
      avgScore: Math.round(c.avgScore as number),
    })) ?? [];

  return (
    <PageContainer width="wide" className="animate-in fade-in duration-300 space-y-6">
      <PageHeader
        title="Analytics"
        description="Program-wide performance, engagement, and feedback across every course."
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={downloading || loading}
            onClick={() => {
              setDownloading(true);
              downloadCsv("/analytics/program/export.csv", "program-analytics.csv")
                .catch(() => setError("Download failed"))
                .finally(() => setDownloading(false));
            }}
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download CSV
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="py-16 text-center text-sm text-muted-foreground">{error}</div>
      ) : !data ? (
        <div className="py-16 text-center text-sm text-muted-foreground">No analytics available.</div>
      ) : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile label="Courses" value={data.totals.courses} />
            <StatTile label="Students" value={data.totals.students} />
            <StatTile label="At risk" value={data.totals.atRisk} />
            <StatTile label="Pending grading" value={data.totals.pendingGrading} />
            <StatTile label="Avg score" value={pct(data.totals.avgScore)} />
            <StatTile label="Avg rating" value={ratingText(data.totals.avgFeedback)} />
          </div>

          {/* Avg score by course chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Average score by course</CardTitle>
                <CardDescription>Graded score averages, per course.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="aspect-[3/1] w-full">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="title" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="avgScore" fill="var(--color-avgScore)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Courses table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Courses</CardTitle>
              <CardDescription>Select a course to open its detailed analytics.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {!data.courses.length ? (
                <div className="py-10 text-center text-sm text-muted-foreground">No courses yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Course</th>
                        <th className="px-4 py-3 font-medium">Professor</th>
                        <th className="px-4 py-3 font-medium">Students</th>
                        <th className="px-4 py-3 font-medium">Avg score</th>
                        <th className="px-4 py-3 font-medium">On-time</th>
                        <th className="px-4 py-3 font-medium">Pending</th>
                        <th className="px-4 py-3 font-medium">At risk</th>
                        <th className="px-4 py-3 font-medium">Attendance</th>
                        <th className="px-4 py-3 font-medium">Active 30d</th>
                        <th className="px-4 py-3 font-medium">Avg rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.courses.map((c) => (
                        <tr key={c.courseId} className="border-b last:border-b-0 hover:bg-muted/40">
                          <td className="px-4 py-3 font-medium">
                            <Link
                              href={`/analytics/course/${c.courseId}`}
                              className="text-foreground hover:underline"
                            >
                              {c.title}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{c.teacherName ?? "—"}</td>
                          <td className="px-4 py-3 tabular-nums">{c.enrolledCount}</td>
                          <td className="px-4 py-3 tabular-nums">{pct(c.avgScore)}</td>
                          <td className="px-4 py-3 tabular-nums">{pct(c.onTimeRate)}</td>
                          <td className="px-4 py-3 tabular-nums">
                            {c.pendingGrading > 0 ? (
                              <Badge variant="warning">{c.pendingGrading}</Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {c.atRiskCount > 0 ? (
                              <Badge variant="danger">{c.atRiskCount}</Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 tabular-nums">{pct(c.attendanceRate)}</td>
                          <td className="px-4 py-3 tabular-nums">{c.active30}</td>
                          <td className="px-4 py-3 tabular-nums">
                            {c.feedbackCount > 0 ? ratingText(c.feedbackAvg) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cohorts */}
          {data.cohorts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cohorts</CardTitle>
                <CardDescription>Student groups across the program.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {data.cohorts.map((c) => (
                    <li key={c.cohortId} className="flex items-center justify-between px-6 py-3">
                      <span className="font-medium text-foreground">{c.name}</span>
                      <Badge variant="info">
                        {c.memberCount} member{c.memberCount === 1 ? "" : "s"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </PageContainer>
  );
}
