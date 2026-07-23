import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { 
  useGetMe, useGetCourse, useListAssignments, useListCourseStudents,
  useCreateAssignment, useInviteStudent, useListInvites, useRemoveInvite, useRemoveCourseStudent, useRequestUploadUrl,
  useGetUnseenMaterialsCount, useMarkMaterialsSeen, getGetUnseenMaterialsCountQueryKey,
  useListCohorts, useInviteCohort, getListCohortsQueryKey, listCohortMembers,
  useListQuizzes, getListQuizzesQueryKey
} from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageContainer } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { getGetCourseQueryKey, getListAssignmentsQueryKey, getListCourseStudentsQueryKey, getListInvitesQueryKey, getListCoursesQueryKey } from "@workspace/api-client-react";
import { FileText, Users, Mail, Clock, ArrowRight, Plus, Loader2, Link as LinkIcon, Video, Music, Copy, Trash2, Paperclip, X, ListChecks } from "lucide-react";
import { QuizFormDialog } from "@/components/quiz-dialog";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CoursePlanView } from "@/components/course-plan";
import { AnalyticsPanel } from "@/components/analytics-panel";
import { CourseFeedbackDialog } from "@/components/course-feedback-dialog";
import { GradebookView } from "@/components/gradebook";
import { CourseAnnouncements } from "@/components/course-announcements";
import { CourseDiscussion } from "@/components/course-discussion";
import { CourseNotes } from "@/components/course-notes";
import { BarChart3, Star } from "lucide-react";
import { TeacherProfileDialog } from "@/components/teacher-profile-dialog";
import { CourseProgressView, LeaderboardView } from "@/components/course-progress";
import { CourseMaterialsView } from "@/components/course-materials";
import { CourseSchedule } from "@/components/course-schedule";
import { CourseIntegrityView } from "@/components/course-integrity";
import { EditAssignmentDialog } from "@/components/edit-assignment-dialog";
import { Pencil } from "lucide-react";
import { CourseGroupsView } from "@/components/course-groups";
import { useListCourseGroups, getListCourseGroupsQueryKey } from "@workspace/api-client-react";

export default function CourseViewPage({ id }: { id: string }) {
  const courseId = parseInt(id, 10);
  const { data: user } = useGetMe();
  const isTeacher = user?.role === "teacher";
  
  const { data: course, isLoading: loadingCourse } = useGetCourse(courseId, { query: { enabled: !!courseId, queryKey: getGetCourseQueryKey(courseId) } });
  const { data: assignments, isLoading: loadingAssignments } = useListAssignments(courseId, { query: { enabled: !!courseId, queryKey: getListAssignmentsQueryKey(courseId) } });
  const { data: quizzes, isLoading: loadingQuizzes } = useListQuizzes(courseId, { query: { enabled: !!courseId, queryKey: getListQuizzesQueryKey(courseId) } });
  
  const { toast } = useToast();
  const [teacherProfileOpen, setTeacherProfileOpen] = useState(false);
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    return tab || "assignments";
  });
  const queryClient = useQueryClient();

  const { data: unseenMaterials } = useGetUnseenMaterialsCount(courseId, {
    query: {
      enabled: !!courseId && !!user && !isTeacher,
      queryKey: getGetUnseenMaterialsCountQueryKey(courseId),
    },
  });
  const markSeen = useMarkMaterialsSeen();
  const unseenCount = !isTeacher && activeTab !== "materials" ? (unseenMaterials?.count ?? 0) : 0;

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "materials" && !isTeacher && (unseenMaterials?.count ?? 0) > 0) {
      markSeen.mutate({ courseId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetUnseenMaterialsCountQueryKey(courseId) });
        },
      });
    }
  };

  const handleCopyCode = () => {
    if (course?.inviteCode) {
      navigator.clipboard.writeText(course.inviteCode);
      toast({ title: "Copied to clipboard", description: "Invite code copied." });
    }
  };

  if (loadingCourse) {
    return <div className="p-8"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mt-20" /></div>;
  }

  if (!course) return <div className="p-8 text-center text-muted-foreground mt-20">Course not found.</div>;

  return (
    <PageContainer width="wide">
      {/* Header */}
      <div className="bg-card rounded-lg p-6 border mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-muted text-muted-foreground border text-xs font-semibold rounded-md uppercase tracking-wider">
              {isTeacher ? 'Instructor View' : 'Student View'}
            </span>
          </div>
          <div className="flex items-start gap-3 mb-3">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{course.title}</h1>
            {isTeacher && course.teacherId === user?.id && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 mt-1 text-muted-foreground hover:text-foreground"
                onClick={() => setEditCourseOpen(true)}
                title="Edit course name"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          </div>
          {course.description && <p className="text-base text-muted-foreground max-w-2xl">{course.description}</p>}
          {isTeacher && course.teacherId === user?.id && (
            <EditCourseDialog
              courseId={courseId}
              open={editCourseOpen}
              onOpenChange={setEditCourseOpen}
              initialTitle={course.title}
              initialDescription={course.description ?? ""}
            />
          )}
          
          <div className="flex flex-wrap items-center gap-6 mt-6 pt-6 border-t border-border">
            <button
              type="button"
              onClick={() => setTeacherProfileOpen(true)}
              className="flex items-center gap-2 rounded-md hover:bg-muted transition-colors px-2 py-1 -mx-2 -my-1 cursor-pointer"
              title="View professor profile"
            >
              <Avatar className="w-8 h-8 border">
                <AvatarFallback className="bg-muted text-muted-foreground">{course.teacherName?.charAt(0) || 'T'}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hover:text-foreground transition-colors">{course.teacherName}</span>
            </button>
            {course.teacherId && (
              <TeacherProfileDialog
                teacherId={course.teacherId}
                open={teacherProfileOpen}
                onOpenChange={setTeacherProfileOpen}
              />
            )}
            
            {isTeacher && (
              <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md border">
                <span className="text-xs text-muted-foreground uppercase font-semibold">Invite Code:</span>
                <code className="text-sm font-bold tracking-widest">{course.inviteCode}</code>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={handleCopyCode}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            )}
            
            <div className="ml-auto flex items-center gap-2">
              {!isTeacher && (
                <Button variant="outline" size="sm" onClick={() => setFeedbackOpen(true)}>
                  <Star className="w-4 h-4 mr-2" /> Rate course
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link href={`/messages?courseId=${course.id}`}>
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    Course Messages
                  </div>
                </Link>
              </Button>
            </div>
          </div>
        </div>
        {!isTeacher && (
          <CourseFeedbackDialog courseId={courseId} open={feedbackOpen} onOpenChange={setFeedbackOpen} />
        )}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-6 h-12 w-full justify-start rounded-lg bg-transparent border-b p-0 overflow-x-auto flex-nowrap [&>*]:shrink-0">
          <TabsTrigger value="assignments" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">
            Assignments
          </TabsTrigger>
          <TabsTrigger value="materials" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">
            <span className="flex items-center gap-2">
              Materials
              {unseenCount > 0 && (
                <span
                  className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold leading-none"
                  aria-label={`${unseenCount} new material${unseenCount === 1 ? "" : "s"}`}
                >
                  {unseenCount > 9 ? "9+" : unseenCount}
                </span>
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger value="announcements" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">
            Announcements
          </TabsTrigger>
          <TabsTrigger value="discussion" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">
            Discussion
          </TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">
            Notes
          </TabsTrigger>
          <TabsTrigger value="plan" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">
            Course Plan
          </TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">
            Schedule
          </TabsTrigger>
          {!isTeacher && (
            <TabsTrigger value="progress" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">
              My Progress
            </TabsTrigger>
          )}
          <TabsTrigger value="leaderboard" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">
            Leaderboard
          </TabsTrigger>
          {isTeacher && (
            <TabsTrigger value="roster" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">
              Roster
            </TabsTrigger>
          )}
          {isTeacher && course.teacherId === user?.id && (
            <TabsTrigger value="groups" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">
              Groups
            </TabsTrigger>
          )}
          {isTeacher && course.teacherId === user?.id && (
            <TabsTrigger value="integrity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">
              Integrity
            </TabsTrigger>
          )}
          {isTeacher && course.teacherId === user?.id && (
            <TabsTrigger value="gradebook" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">
              Gradebook
            </TabsTrigger>
          )}
          {isTeacher && course.teacherId === user?.id && (
            <TabsTrigger value="analytics" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">
              Analytics
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="assignments" className="space-y-4">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:items-center mb-4">
            <h2 className="text-xl font-semibold tracking-tight">Course Work</h2>
            {isTeacher && (
              <div className="flex gap-2">
                <QuizFormDialog courseId={courseId} />
                <CreateAssignmentDialog courseId={courseId} />
              </div>
            )}
          </div>

          {loadingAssignments || loadingQuizzes ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="h-24 bg-card rounded-lg border animate-pulse"></div>)}
            </div>
          ) : (assignments && assignments.length > 0) || (quizzes && quizzes.length > 0) ? (
            <div className="space-y-4">
              {quizzes?.map(quiz => (
                <QuizCard key={`quiz-${quiz.id}`} quiz={quiz} isTeacher={isTeacher} />
              ))}
              {assignments?.map(assignment => (
                <AssignmentCard key={assignment.id} assignment={assignment} isTeacher={isTeacher} />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No course work yet</h3>
                <p className="max-w-sm">
                  {isTeacher ? "Create the first assignment or quiz to engage your students." : "Your professor hasn't posted any work yet."}
                </p>
                {isTeacher && <div className="mt-6 flex gap-2 justify-center"><QuizFormDialog courseId={courseId} /><CreateAssignmentDialog courseId={courseId} /></div>}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="materials">
          <CourseMaterialsView courseId={courseId} isTeacher={isTeacher && course.teacherId === user?.id} />
        </TabsContent>

        <TabsContent value="announcements">
          <CourseAnnouncements courseId={courseId} isTeacher={isTeacher && course.teacherId === user?.id} />
        </TabsContent>

        <TabsContent value="discussion">
          <CourseDiscussion courseId={courseId} isTeacher={isTeacher && course.teacherId === user?.id} />
        </TabsContent>

        <TabsContent value="notes">
          <CourseNotes courseId={courseId} />
        </TabsContent>

        <TabsContent value="schedule">
          <CourseSchedule courseId={courseId} isTeacher={isTeacher && course.teacherId === user?.id} />
        </TabsContent>

        <TabsContent value="plan">
          <CoursePlanView courseId={courseId} isTeacher={isTeacher && course.teacherId === user?.id} />
        </TabsContent>

        {!isTeacher && (
          <TabsContent value="progress">
            <CourseProgressView courseId={courseId} />
          </TabsContent>
        )}

        <TabsContent value="leaderboard">
          <LeaderboardView courseId={courseId} />
        </TabsContent>

        {isTeacher && (
          <TabsContent value="roster">
            <RosterView courseId={courseId} />
          </TabsContent>
        )}

        {isTeacher && course.teacherId === user?.id && (
          <TabsContent value="groups">
            <CourseGroupsView courseId={courseId} />
          </TabsContent>
        )}

        {isTeacher && course.teacherId === user?.id && (
          <TabsContent value="integrity">
            <CourseIntegrityView courseId={courseId} />
          </TabsContent>
        )}

        {isTeacher && course.teacherId === user?.id && (
          <TabsContent value="gradebook">
            <GradebookView courseId={courseId} canEdit={isTeacher && course.teacherId === user?.id} />
          </TabsContent>
        )}

        {isTeacher && course.teacherId === user?.id && (
          <TabsContent value="analytics">
            <AnalyticsPanel courseId={courseId} />
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}

function QuizCard({ quiz, isTeacher }: { quiz: any, isTeacher: boolean }) {
  const isPastDue = quiz.dueDate && new Date(quiz.dueDate) < new Date();

  return (
    <Link href={`/quiz/${quiz.id}`}>
      <Card className="hover:border-foreground/30 transition-colors cursor-pointer group flex flex-col sm:flex-row">
        <div className="p-6 sm:w-64 border-b sm:border-b-0 sm:border-r bg-muted/30 flex flex-col justify-center shrink-0">
          <div className="text-xs uppercase font-bold text-muted-foreground mb-1 tracking-wider">Due Date</div>
          <div className={`font-medium ${isPastDue ? 'text-danger' : 'text-foreground'} flex items-center gap-2`}>
            <Clock className="w-4 h-4" />
            {quiz.dueDate ? format(new Date(quiz.dueDate), 'MMM d, yyyy h:mm a') : 'No Due Date'}
          </div>
          <div className="mt-4 flex flex-wrap gap-1">
            <span className="text-[10px] px-1.5 py-0.5 bg-card border rounded text-muted-foreground flex items-center gap-1">
              <ListChecks className="w-3 h-3" /> Quiz · {quiz.questionCount ?? 0} questions · {quiz.maxScore ?? 0} pts
            </span>
          </div>
        </div>
        <CardContent className="p-6 flex-1 flex flex-col justify-center">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-semibold tracking-tight group-hover:text-foreground transition-colors">{quiz.title}</h3>
                {isTeacher && quiz.status !== 'published' && (
                  <Badge variant="warning" className="uppercase tracking-wider">Draft</Badge>
                )}
              </div>
              <p className="text-muted-foreground line-clamp-2 text-sm">{quiz.description || "No description provided."}</p>
            </div>

            {!isTeacher && quiz.myAttempt && (
              <Badge variant="success" className="shrink-0 ml-4 uppercase tracking-wider">
                {quiz.resultsPublishedAt && quiz.myAttempt.score != null
                  ? `${quiz.myAttempt.score}/${quiz.myAttempt.maxScore}`
                  : 'Submitted'}
              </Badge>
            )}

            {isTeacher && (
              <div className="shrink-0 ml-4 text-center px-4 py-2 bg-muted/50 rounded-lg border">
                <div className="text-2xl font-bold text-foreground">{quiz.attemptCount || 0}</div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Attempts</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function AssignmentCard({ assignment, isTeacher }: { assignment: any, isTeacher: boolean }) {
  const isPastDue = assignment.dueDate && new Date(assignment.dueDate) < new Date();
  const [editOpen, setEditOpen] = useState(false);
  
  return (
    <>
    {isTeacher && (
      <EditAssignmentDialog assignment={assignment} open={editOpen} onOpenChange={setEditOpen} />
    )}
    <Link href={`/assignment/${assignment.id}`}>
      <Card className="hover:border-foreground/30 transition-colors cursor-pointer group flex flex-col sm:flex-row">
        <div className="p-6 sm:w-64 border-b sm:border-b-0 sm:border-r bg-muted/20 flex flex-col justify-center shrink-0">
          <div className="text-xs uppercase font-bold text-muted-foreground mb-1 tracking-wider">Due Date</div>
          <div className={`font-medium ${isPastDue ? 'text-danger' : 'text-foreground'} flex items-center gap-2`}>
            <Clock className="w-4 h-4" />
            {assignment.dueDate ? format(new Date(assignment.dueDate), 'MMM d, yyyy h:mm a') : 'No Due Date'}
          </div>
          
          <div className="mt-4 flex flex-wrap gap-1">
            {assignment.allowedTypes?.map((t: string) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 bg-card border rounded capitalize text-muted-foreground flex items-center gap-1">
                {t === 'text' && <FileText className="w-3 h-3" />}
                {t === 'file' && <FileText className="w-3 h-3" />}
                {t === 'link' && <LinkIcon className="w-3 h-3" />}
                {t === 'video' && <Video className="w-3 h-3" />}
                {t === 'audio' && <Music className="w-3 h-3" />}
                {t}
              </span>
            ))}
          </div>
        </div>
        <CardContent className="p-6 flex-1 flex flex-col justify-center">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold tracking-tight group-hover:text-foreground transition-colors mb-2">{assignment.title}</h3>
              <p className="text-muted-foreground line-clamp-2 text-sm">{assignment.description || "No description provided."}</p>
            </div>

            {!isTeacher && assignment.mySubmissionStatus && (
              <Badge variant="success" className="shrink-0 ml-4 uppercase tracking-wider">
                {assignment.mySubmissionStatus}
              </Badge>
            )}

            {isTeacher && (
              <div className="shrink-0 ml-4 flex items-start gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 text-muted-foreground hover:text-foreground"
                  title="Edit assignment"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditOpen(true); }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <div className="text-center px-4 py-2 bg-muted/50 rounded-lg border">
                  <div className="text-2xl font-bold text-foreground">{assignment.submissionCount || 0}</div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Submissions</div>
                </div>
              </div>
            )}
          </div>
          {isTeacher && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              {assignment.assignmentType === 'group'
                ? `Group assignment — ${(assignment.targetGroups ?? []).map((g: any) => g.name).join(', ') || `${assignment.targetGroupIds?.length ?? 0} groups`}`
                : assignment.targetStudentIds && assignment.targetStudentIds.length > 0
                  ? `Assigned to ${assignment.targetStudentIds.length} student${assignment.targetStudentIds.length === 1 ? '' : 's'}`
                  : 'All students'}
            </div>
          )}
          {!isTeacher && assignment.assignmentType === 'group' && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              Group assignment{assignment.myGroup ? ` — ${assignment.myGroup.name}` : ''}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
    </>
  );
}

function CreateAssignmentDialog({ courseId }: { courseId: number }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxScore, setMaxScore] = useState(100);
  const [allowedTypes, setAllowedTypes] = useState<string[]>(['text', 'file']);
  const [attachments, setAttachments] = useState<{ path: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [audience, setAudience] = useState<'all' | 'selected' | 'groups'>('all');
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>([]);
  const [cohortLoading, setCohortLoading] = useState(false);
  const [targetGroupIds, setTargetGroupIds] = useState<number[]>([]);
  const [leaderOnlySubmit, setLeaderOnlySubmit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: roster } = useListCourseStudents(courseId, { query: { enabled: open && !!courseId, queryKey: getListCourseStudentsQueryKey(courseId) } });
  const { data: cohorts } = useListCohorts(undefined, { query: { enabled: open, queryKey: getListCohortsQueryKey() } });
  const { data: courseGroups } = useListCourseGroups(courseId, { query: { enabled: open && !!courseId, queryKey: getListCourseGroupsQueryKey(courseId) } });
  const createAssignment = useCreateAssignment();
  const requestUrl = useRequestUploadUrl();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleToggleType = (type: string) => {
    setAllowedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: { path: string; name: string }[] = [];
      for (const file of files) {
        const urlRes = await requestUrl.mutateAsync({
          data: { name: file.name, size: file.size, contentType: file.type || "application/octet-stream" }
        });
        const putRes = await fetch(urlRes.uploadURL, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || "application/octet-stream" },
          body: file
        });
        if (!putRes.ok) throw new Error(`Upload failed for ${file.name}`);
        uploaded.push({ path: urlRes.objectPath, name: file.name });
      }
      setAttachments(prev => [...prev, ...uploaded]);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCohortSelect = async (cohortId: string) => {
    setCohortLoading(true);
    try {
      const members = await listCohortMembers(parseInt(cohortId, 10));
      const enrolledIds = new Set((roster ?? []).map(s => s.id));
      const enrolledMemberIds = members.map(m => m.id).filter(id => enrolledIds.has(id));
      if (enrolledMemberIds.length === 0) {
        toast({ title: "No enrolled members", description: "None of this cohort's members are enrolled in this course.", variant: "destructive" });
        return;
      }
      setTargetStudentIds(prev => [...new Set([...prev, ...enrolledMemberIds])]);
      const skipped = members.length - enrolledMemberIds.length;
      toast({
        title: `${enrolledMemberIds.length} student${enrolledMemberIds.length === 1 ? "" : "s"} selected from cohort`,
        description: skipped > 0 ? `${skipped} cohort member${skipped === 1 ? " isn't" : "s aren't"} enrolled in this course and ${skipped === 1 ? "was" : "were"} skipped.` : undefined,
      });
    } catch (err: any) {
      toast({ title: "Couldn't load cohort", description: err.message, variant: "destructive" });
    } finally {
      setCohortLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || allowedTypes.length === 0) {
      toast({ title: "Validation Error", description: "Title and at least one submission type required.", variant: "destructive" });
      return;
    }
    if (uploading) {
      toast({ title: "Please wait", description: "Attachments are still uploading.", variant: "destructive" });
      return;
    }
    if (audience === 'selected' && targetStudentIds.length === 0) {
      toast({ title: "No students selected", description: "Pick at least one student, or assign to all students.", variant: "destructive" });
      return;
    }
    if (audience === 'groups' && targetGroupIds.length === 0) {
      toast({ title: "No groups selected", description: "Pick at least one group for a group assignment.", variant: "destructive" });
      return;
    }

    createAssignment.mutate({
      courseId,
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        maxScore,
        allowedTypes: allowedTypes as any,
        attachments,
        targetStudentIds: audience === 'selected' ? targetStudentIds : [],
        assignmentType: audience === 'groups' ? 'group' : 'individual',
        targetGroupIds: audience === 'groups' ? targetGroupIds : [],
        leaderOnlySubmit: audience === 'groups' ? leaderOnlySubmit : false,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Assignment created" });
        queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey(courseId) });
        setOpen(false);
        // Reset
        setTitle(""); setDescription(""); setDueDate(""); setMaxScore(100); setAllowedTypes(['text', 'file']); setAttachments([]);
        setAudience('all'); setTargetStudentIds([]); setTargetGroupIds([]); setLeaderOnlySubmit(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> New Assignment</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">Create Assignment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Assignment Title *</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="desc">Description / Instructions</Label>
            <Textarea id="desc" rows={4} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Attachments</Label>
            {attachments.length > 0 && (
              <ul className="space-y-2">
                {attachments.map((file, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm border rounded-lg px-3 py-2 bg-muted/20">
                    <span className="flex items-center gap-2 truncate"><Paperclip className="w-4 h-4 text-muted-foreground shrink-0" /> {file.name}</span>
                    <Button type="button" variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}>
                      <X className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Paperclip className="w-4 h-4 mr-2" />}
                {uploading ? "Uploading..." : "Attach Files"}
              </Button>
              <span className="text-xs text-muted-foreground">Any file type. Students can download these.</span>
            </div>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due">Due Date</Label>
              <Input id="due" type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="score">Max Score</Label>
              <Input id="score" type="number" min="1" value={maxScore} onChange={e => setMaxScore(parseInt(e.target.value))} />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Allowed Submission Types *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/20">
              {[
                { id: 'text', label: 'Rich Text', icon: FileText },
                { id: 'file', label: 'File Upload', icon: FileText },
                { id: 'link', label: 'URL Link', icon: LinkIcon },
                { id: 'video', label: 'Video Recording', icon: Video },
                { id: 'audio', label: 'Audio Recording', icon: Music },
              ].map(type => (
                <div key={type.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`type-${type.id}`} 
                    checked={allowedTypes.includes(type.id)}
                    onCheckedChange={() => handleToggleType(type.id)}
                  />
                  <Label htmlFor={`type-${type.id}`} className="flex items-center gap-2 font-normal cursor-pointer">
                    <type.icon className="w-4 h-4 text-muted-foreground" />
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Assign To</Label>
            <div className="border rounded-lg bg-muted/20 p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <input
                    type="radio"
                    name="audience"
                    className="accent-primary"
                    checked={audience === 'all'}
                    onChange={() => setAudience('all')}
                  />
                  All students
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <input
                    type="radio"
                    name="audience"
                    className="accent-primary"
                    checked={audience === 'selected'}
                    onChange={() => setAudience('selected')}
                  />
                  Select students
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <input
                    type="radio"
                    name="audience"
                    className="accent-primary"
                    checked={audience === 'groups'}
                    onChange={() => setAudience('groups')}
                  />
                  Groups
                </label>
              </div>
              {audience === 'selected' && (cohorts ?? []).length > 0 && (
                <div className="flex items-center gap-2 border-t pt-3">
                  <Select value="" onValueChange={handleCohortSelect} disabled={cohortLoading}>
                    <SelectTrigger className="w-full" data-testid="select-cohort">
                      <SelectValue placeholder={cohortLoading ? "Loading cohort..." : "Pre-select students from a cohort..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {(cohorts ?? []).map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name} ({c.memberCount} member{c.memberCount === 1 ? "" : "s"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {cohortLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
                </div>
              )}
              {audience === 'groups' && (
                (courseGroups && courseGroups.length > 0) ? (
                  <div className="space-y-3 border-t pt-3">
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {courseGroups.map((g) => (
                        <div key={g.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`target-group-${g.id}`}
                            checked={targetGroupIds.includes(g.id)}
                            onCheckedChange={() =>
                              setTargetGroupIds(prev =>
                                prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id]
                              )
                            }
                          />
                          <Label htmlFor={`target-group-${g.id}`} className="font-normal cursor-pointer flex-1 truncate">
                            {g.name}
                            <span className="text-muted-foreground ml-2 text-xs">
                              {g.members.length} member{g.members.length === 1 ? '' : 's'}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center space-x-2 border-t pt-3">
                      <Checkbox
                        id="leader-only"
                        checked={leaderOnlySubmit}
                        onCheckedChange={(v) => setLeaderOnlySubmit(!!v)}
                      />
                      <Label htmlFor="leader-only" className="font-normal cursor-pointer">
                        Only the group leader can submit
                      </Label>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground border-t pt-3">
                    No groups yet. Create groups in the Groups tab first.
                  </p>
                )
              )}
              {audience === 'selected' && (
                (roster && roster.length > 0) ? (
                  <div className="max-h-48 overflow-y-auto space-y-2 border-t pt-3">
                    {roster.map((s: any) => (
                      <div key={s.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`target-${s.id}`}
                          checked={targetStudentIds.includes(s.id)}
                          onCheckedChange={() =>
                            setTargetStudentIds(prev =>
                              prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                            )
                          }
                        />
                        <Label htmlFor={`target-${s.id}`} className="font-normal cursor-pointer flex-1 truncate">
                          {s.name || s.email}
                          {s.name && <span className="text-muted-foreground ml-2 text-xs">{s.email}</span>}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground border-t pt-3">No students enrolled yet.</p>
                )
              )}
              <p className="text-xs text-muted-foreground">
                {audience === 'all'
                  ? 'Every enrolled student will see this assignment.'
                  : audience === 'groups'
                    ? `Members of the ${targetGroupIds.length} selected group${targetGroupIds.length === 1 ? '' : 's'} work together and submit once per group; the grade applies to every member.`
                    : `Only the ${targetStudentIds.length} selected student${targetStudentIds.length === 1 ? '' : 's'} will see this assignment. Picking a cohort adds its enrolled members to the selection.`}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createAssignment.isPending || !title.trim() || allowedTypes.length === 0}>
              {createAssignment.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Publish Assignment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RosterView({ courseId }: { courseId: number }) {
  const { data: students, isLoading } = useListCourseStudents(courseId, { query: { enabled: !!courseId, queryKey: getListCourseStudentsQueryKey(courseId) } });
  const { data: roster } = useListInvites(courseId, { query: { enabled: !!courseId, queryKey: getListInvitesQueryKey(courseId) } });
  const inviteStudent = useInviteStudent();
  const removeInvite = useRemoveInvite();
  const removeStudent = useRemoveCourseStudent();
  const [email, setEmail] = useState("");
  const [studentToRemove, setStudentToRemove] = useState<{ id: string; name?: string | null; email: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const enrolledEmails = new Set((students ?? []).map(s => (s.email || "").toLowerCase()));
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    inviteStudent.mutate({ courseId, data: { email: trimmed } }, {
      onSuccess: () => {
        toast({ title: "Student added", description: `${trimmed} can now join with the course code.` });
        setEmail("");
        queryClient.invalidateQueries({ queryKey: getListInvitesQueryKey(courseId) });
      },
      onError: (err: any) => {
        toast({ title: "Could not add student", description: err?.message || "Something went wrong.", variant: "destructive" });
      }
    });
  };

  const handleRemove = (inviteId: number, inviteEmail: string) => {
    removeInvite.mutate({ courseId, inviteId }, {
      onSuccess: () => {
        toast({ title: "Removed from roster", description: `${inviteEmail} can no longer join.` });
        queryClient.invalidateQueries({ queryKey: getListInvitesQueryKey(courseId) });
      },
      onError: (err: any) => {
        toast({ title: "Could not remove", description: err?.message || "Something went wrong.", variant: "destructive" });
      }
    });
  };

  const confirmRemoveStudent = () => {
    if (!studentToRemove) return;
    removeStudent.mutate({ courseId, studentId: studentToRemove.id }, {
      onSuccess: () => {
        toast({ title: "Student removed", description: `${studentToRemove.name || studentToRemove.email} no longer has access to this course.` });
        queryClient.invalidateQueries({ queryKey: getListCourseStudentsQueryKey(courseId) });
        queryClient.invalidateQueries({ queryKey: getListInvitesQueryKey(courseId) });
        setStudentToRemove(null);
      },
      onError: (err: any) => {
        toast({ title: "Could not remove student", description: err?.message || "Something went wrong.", variant: "destructive" });
        setStudentToRemove(null);
      }
    });
  };

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mt-10" /></div>;

  return (
    <>
    <AlertDialog open={!!studentToRemove} onOpenChange={(open) => { if (!open) setStudentToRemove(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove student from course?</AlertDialogTitle>
          <AlertDialogDescription>
            {studentToRemove ? `${studentToRemove.name || studentToRemove.email} will immediately lose access to this course, and their email will be removed from the roster so they can't rejoin with the course code unless re-invited.` : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removeStudent.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); confirmRemoveStudent(); }}
            disabled={removeStudent.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {removeStudent.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Remove Student
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <h2 className="text-xl font-semibold tracking-tight mb-4">Enrolled Students ({students?.length || 0})</h2>
        <Card>
          <CardContent className="p-0 divide-y">
            {students && students.length > 0 ? (
              students.map(student => (
                <div key={student.id} className="flex items-center p-4 hover:bg-muted/50 transition-colors">
                  <Avatar className="w-10 h-10 mr-4 border">
                    <AvatarImage src={student.avatarUrl || ''} />
                    <AvatarFallback className="bg-muted text-muted-foreground">{student.name?.charAt(0) || 'S'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{student.name}</div>
                    <div className="text-sm text-muted-foreground truncate">{student.email}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => setStudentToRemove({ id: student.id, name: student.name, email: student.email })}
                    disabled={removeStudent.isPending}
                    title="Remove student from course"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-muted-foreground">No students enrolled yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold tracking-tight mb-4">Add Students</h2>
        <Card>
          <CardContent className="p-6 space-y-6">
            <AddStudentsPanel courseId={courseId} />
            <InviteCohortSection courseId={courseId} />
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground mt-3 px-1">
          Students appear here once an admin has invited them to Dempo. Add them to your course directly — no code needed — or they can self-join with the invite code.
        </p>
      </div>
    </div>
    </>
  );
}

type EnrollCandidate = { id: string; name: string | null; email: string; avatarUrl: string | null; enrolled: boolean };

function AddStudentsPanel({ courseId }: { courseId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState(false);

  const { data: candidates, isLoading } = useQuery({
    queryKey: ["enroll-candidates", courseId],
    queryFn: async (): Promise<EnrollCandidate[]> => {
      const res = await fetch(`/api/courses/${courseId}/enroll-candidates`, { headers: { "Content-Type": "application/json" } });
      if (!res.ok) throw new Error("Could not load students");
      return res.json();
    },
    enabled: !!courseId,
  });

  const q = search.trim().toLowerCase();
  const available = (candidates ?? []).filter((c) => !c.enrolled);
  const filtered = available.filter(
    (c) => !q || (c.name || "").toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
  );

  const toggle = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const enroll = async () => {
    if (selected.size === 0) return;
    setEnrolling(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: Array.from(selected) }),
      });
      if (!res.ok) {
        let msg = res.statusText;
        try { const j = await res.json(); msg = j?.error || msg; } catch { /* ignore */ }
        throw new Error(msg);
      }
      const r = await res.json();
      toast({ title: "Students added", description: `${r.enrolled} enrolled${r.skipped ? `, ${r.skipped} skipped` : ""}.` });
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["enroll-candidates", courseId] });
      queryClient.invalidateQueries({ queryKey: getListCourseStudentsQueryKey(courseId) });
    } catch (err: any) {
      toast({ title: "Could not add students", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input placeholder="Search students by name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-3" />
      </div>

      {isLoading ? (
        <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>
      ) : filtered.length > 0 ? (
        <div className="max-h-72 overflow-y-auto rounded-lg border divide-y">
          {filtered.map((c) => {
            const on = selected.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={`w-full flex items-center gap-3 p-2.5 text-left transition-colors ${on ? "bg-muted" : "hover:bg-muted/50"}`}
              >
                <Checkbox checked={on} className="pointer-events-none" />
                <Avatar className="w-8 h-8 border shrink-0">
                  <AvatarImage src={c.avatarUrl || ""} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">{c.name?.charAt(0) || "S"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{c.name || c.email}</div>
                  {c.name && <div className="text-xs text-muted-foreground truncate">{c.email}</div>}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {available.length === 0 ? "Everyone available is already enrolled." : "No students match your search."}
        </p>
      )}

      <Button className="w-full" onClick={enroll} disabled={selected.size === 0 || enrolling}>
        {enrolling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
        {selected.size > 0 ? `Add ${selected.size} student${selected.size === 1 ? "" : "s"}` : "Add students"}
      </Button>
    </div>
  );
}

function InviteCohortSection({ courseId }: { courseId: number }) {
  const { data: cohorts } = useListCohorts(undefined, {
    query: { queryKey: getListCohortsQueryKey(undefined) },
  });
  const [cohortId, setCohortId] = useState<string>("");
  const [pending, setPending] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (!cohorts || cohorts.length === 0) return null;

  const handleInvite = async () => {
    if (!cohortId) return;
    setPending(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll-cohort`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cohortId: parseInt(cohortId, 10) }),
      });
      if (!res.ok) {
        let msg = res.statusText;
        try { const j = await res.json(); msg = j?.error || msg; } catch { /* ignore */ }
        throw new Error(msg);
      }
      const result = await res.json();
      toast({
        title: "Cohort enrolled",
        description: `${result.enrolled} enrolled${result.skipped ? `, ${result.skipped} already in the course` : ""}.`,
      });
      setCohortId("");
      queryClient.invalidateQueries({ queryKey: getListCourseStudentsQueryKey(courseId) });
      queryClient.invalidateQueries({ queryKey: ["enroll-candidates", courseId] });
    } catch (err: any) {
      toast({ title: "Could not enroll cohort", description: err?.message, variant: "destructive" });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="pt-6 border-t space-y-2">
      <Label>Add a whole cohort</Label>
      <div className="flex gap-2">
        <Select value={cohortId} onValueChange={setCohortId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Pick a cohort" />
          </SelectTrigger>
          <SelectContent>
            {cohorts.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name} ({c.memberCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" onClick={handleInvite} disabled={!cohortId || pending}>
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Enrolls every member of the cohort into this course, skipping anyone already in it.</p>
    </div>
  );
}

function EditCourseDialog({
  courseId, open, onOpenChange, initialTitle, initialDescription,
}: {
  courseId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialTitle: string;
  initialDescription: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset fields whenever the dialog opens (in case the course changed).
  const handleOpenChange = (v: boolean) => {
    if (v) { setTitle(initialTitle); setDescription(initialDescription); }
    onOpenChange(v);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Title required", description: "Give the course a name.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
      });
      if (!res.ok) {
        let msg = res.statusText;
        try { const j = await res.json(); msg = j?.error || msg; } catch { /* ignore */ }
        throw new Error(msg);
      }
      toast({ title: "Course updated" });
      queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
      queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Couldn't update course", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">Edit course</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-course-title">Course name</Label>
            <Input id="edit-course-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-course-desc">Description</Label>
            <Textarea id="edit-course-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional short description shown to students." />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={saving || !title.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}