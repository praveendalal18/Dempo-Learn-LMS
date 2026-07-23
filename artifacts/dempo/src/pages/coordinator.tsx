import { useState } from "react";
import {
  useListCoordinatorCourses,
  getListCoordinatorCoursesQueryKey,
  type OversightCourse,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CourseSchedule } from "@/components/course-schedule";
import { PageContainer, PageHeader } from "@/components/page";
import { Loader2, CalendarClock } from "lucide-react";

export default function CoordinatorPage() {
  const [scheduling, setScheduling] = useState<OversightCourse | null>(null);
  const { data: courses, isLoading } = useListCoordinatorCourses({
    query: { queryKey: getListCoordinatorCoursesQueryKey() },
  });

  return (
    <PageContainer className="animate-in fade-in duration-300">
      <PageHeader
        title="Courses"
        description="Courses assigned to you. As course coordinator you can set each course's schedule and timeslots; everything else is read-only."
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your courses</CardTitle>
          <CardDescription>
            {isLoading ? "Loading…" : `${courses?.length ?? 0} course${(courses?.length ?? 0) === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !courses?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              No courses assigned to you yet. An admin can assign courses from the Users page.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium">Course</th>
                    <th className="px-4 py-3 font-medium">Professor</th>
                    <th className="px-4 py-3 font-medium">Students</th>
                    <th className="px-4 py-3 font-medium">Schedule</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{c.title}</span>
                          {c.description && (
                            <span className="text-xs text-muted-foreground truncate max-w-md">{c.description}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.teacherName ?? "—"}</td>
                      <td className="px-4 py-3">{c.studentCount}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" onClick={() => setScheduling(c)}>
                          <CalendarClock className="w-3.5 h-3.5 mr-1.5" /> Manage schedule
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!scheduling} onOpenChange={(open) => !open && setScheduling(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule — {scheduling?.title}</DialogTitle>
            <DialogDescription>
              Add, edit, or remove class timeslots. Professors and students see these on the course page and calendar.
            </DialogDescription>
          </DialogHeader>
          {scheduling && <CourseSchedule courseId={scheduling.id} isTeacher />}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
