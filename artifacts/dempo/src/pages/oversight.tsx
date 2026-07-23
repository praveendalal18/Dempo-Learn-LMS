import { useState } from "react";
import {
  useListOversightCourses,
  getListOversightCoursesQueryKey,
  useListOversightProfessors,
  getListOversightProfessorsQueryKey,
  useListOversightIntegrity,
  getListOversightIntegrityQueryKey,
  useCreateFeedback,
  getListFeedbackQueryKey,
  type OversightProfessor,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PageContainer, PageHeader } from "@/components/page";
import {
  Loader2,
  BookOpen,
  GraduationCap,
  ShieldAlert,
  Send,
} from "lucide-react";

function SendFeedbackDialog({
  recipient,
  onClose,
}: {
  recipient: OversightProfessor | null;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const send = useCreateFeedback({
    mutation: {
      onSuccess: () => {
        toast({ title: "Feedback sent", description: `Your note was delivered to ${recipient?.name ?? recipient?.email}.` });
        void queryClient.invalidateQueries({ queryKey: getListFeedbackQueryKey() });
        setSubject("");
        setBody("");
        onClose();
      },
      onError: (err: unknown) => {
        const message =
          err && typeof err === "object" && "error" in err
            ? String((err as { error: unknown }).error)
            : "Failed to send feedback";
        toast({ title: "Send failed", description: message, variant: "destructive" });
      },
    },
  });

  return (
    <Dialog open={!!recipient} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>
            Write a private note to {recipient?.name ?? recipient?.email}. They will see it in their Feedback inbox.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fb-subject">Subject (optional)</Label>
            <Input
              id="fb-subject"
              value={subject}
              maxLength={200}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Great engagement in Financial Management"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fb-body">Feedback</Label>
            <Textarea
              id="fb-body"
              value={body}
              rows={5}
              maxLength={5000}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your observations or suggestions…"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              disabled={!body.trim() || send.isPending}
              onClick={() =>
                recipient &&
                send.mutate({ data: { recipientId: recipient.id, subject: subject.trim() || undefined, body: body.trim() } })
              }
            >
              {send.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function OversightPage() {
  const [feedbackTo, setFeedbackTo] = useState<OversightProfessor | null>(null);

  const { data: courses, isLoading: coursesLoading } = useListOversightCourses({
    query: { queryKey: getListOversightCoursesQueryKey() },
  });
  const { data: professors, isLoading: profsLoading } = useListOversightProfessors({
    query: { queryKey: getListOversightProfessorsQueryKey() },
  });
  const { data: integrity, isLoading: integrityLoading } = useListOversightIntegrity({
    query: { queryKey: getListOversightIntegrityQueryKey() },
  });

  return (
    <PageContainer width="wide" className="animate-in fade-in duration-300 space-y-6">
      <PageHeader
        title="School Oversight"
        description="A read-only view of every course, professor, and integrity flag across the school."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold">{courses?.length ?? "—"}</div>
              <div className="text-xs text-muted-foreground">Courses</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold">{professors?.length ?? "—"}</div>
              <div className="text-xs text-muted-foreground">Professors</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-danger" />
            <div>
              <div className="text-2xl font-bold">
                {integrity ? integrity.reduce((sum, i) => sum + i.flaggedCount, 0) : "—"}
              </div>
              <div className="text-xs text-muted-foreground">Open integrity flags</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All courses</CardTitle>
          <CardDescription>Every course in the school, read-only.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {coursesLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !courses?.length ? (
            <div className="text-center py-10 text-muted-foreground">No courses yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium">Course</th>
                    <th className="px-4 py-3 font-medium">Professor</th>
                    <th className="px-4 py-3 font-medium">Students</th>
                    <th className="px-4 py-3 font-medium">Assignments</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium">{c.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.teacherName ?? "—"}</td>
                      <td className="px-4 py-3">{c.studentCount}</td>
                      <td className="px-4 py-3">{c.assignmentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Professors & Coordinators</CardTitle>
            <CardDescription>Send private feedback to any professor or course coordinator.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {profsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : !professors?.length ? (
              <div className="text-center py-10 text-muted-foreground">No professors yet.</div>
            ) : (
              <ul className="divide-y">
                {professors.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={p.avatarUrl ?? undefined} />
                      <AvatarFallback>{(p.name ?? p.email).slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden flex-1">
                      <span className="font-medium truncate">
                        {p.name ?? p.email}
                        {p.role === "course_coordinator" && (
                          <Badge variant="info" className="ml-2 align-middle">
                            Coordinator
                          </Badge>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {p.title || p.email}
                        {p.role === "teacher" &&
                          ` · ${p.courseCount} course${p.courseCount === 1 ? "" : "s"}`}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setFeedbackTo(p)}>
                      <Send className="w-3.5 h-3.5 mr-1.5" /> Feedback
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Integrity flags</CardTitle>
            <CardDescription>Open similarity flags across all courses.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {integrityLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : !integrity?.length ? (
              <div className="text-center py-10 text-muted-foreground">No open integrity flags. 🎉</div>
            ) : (
              <ul className="divide-y">
                {integrity.map((i) => (
                  <li key={i.courseId} className="flex items-center gap-3 px-4 py-3">
                    <ShieldAlert className="w-4 h-4 text-danger shrink-0" />
                    <div className="flex flex-col overflow-hidden flex-1">
                      <span className="font-medium truncate">{i.courseTitle}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {i.teacherName ?? "—"}
                      </span>
                    </div>
                    <Badge variant="destructive">{i.flaggedCount} flagged</Badge>
                    <Badge variant="outline">top {Math.round(i.topScore)}%</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <SendFeedbackDialog recipient={feedbackTo} onClose={() => setFeedbackTo(null)} />
    </PageContainer>
  );
}
