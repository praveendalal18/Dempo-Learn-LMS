import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { 
  useGetAssignment, useGetMe, useCreateSubmission, useListAssignmentSubmissions, useRequestUploadUrl, useRunSimilarityCheck,
  getGetAssignmentQueryKey, getListAssignmentSubmissionsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud, Link as LinkIcon, FileText, Video, Music, CheckCircle, Clock, Award, ArrowRight, Paperclip, Download, Sparkles, Copy, RefreshCw, Users as UsersIcon, Pencil } from "lucide-react";
import { EditAssignmentDialog } from "@/components/edit-assignment-dialog";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { GroupRosterCard, GroupTasksPanel } from "@/components/group-panel";

export default function AssignmentViewPage({ id }: { id: string }) {
  const assignmentId = parseInt(id, 10);
  const { data: user } = useGetMe();
  const isTeacher = user?.role === "teacher";
  
  const { data: assignment, isLoading } = useGetAssignment(assignmentId, { query: { enabled: !!assignmentId, queryKey: getGetAssignmentQueryKey(assignmentId) } });
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mt-20" /></div>;
  if (!assignment) return <div className="p-8 text-center text-muted-foreground mt-20">Assignment not found.</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 font-medium">
          <span className="hover:text-foreground cursor-pointer" onClick={() => window.history.back()}>Course</span>
          <span>/</span>
          <span className="text-foreground">{assignment.title}</span>
        </div>
        
        <div className="bg-card border rounded-2xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-4">{assignment.title}</h1>
                {isTeacher && (
                  <>
                    <Button variant="outline" size="sm" className="shrink-0" onClick={() => setEditOpen(true)}>
                      <Pencil className="w-4 h-4 mr-2" /> Edit
                    </Button>
                    <EditAssignmentDialog assignment={assignment} open={editOpen} onOpenChange={setEditOpen} />
                  </>
                )}
              </div>
              {assignment.description && (
                <div className="prose prose-sm md:prose-base max-w-none text-muted-foreground mb-6">
                  {assignment.description}
                </div>
              )}
              {assignment.attachments && assignment.attachments.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2">Attachments</div>
                  <div className="grid gap-2 max-w-lg">
                    {assignment.attachments.map((file, i) => (
                      <a key={i} href={import.meta.env.BASE_URL + "api/storage" + file.path} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 border rounded-xl hover:bg-muted/50 transition-colors">
                        <Paperclip className="w-5 h-5 text-primary shrink-0" />
                        <span className="font-medium text-sm truncate flex-1">{file.name}</span>
                        <Download className="w-4 h-4 text-muted-foreground shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="w-full md:w-64 shrink-0 bg-muted/30 p-5 rounded-xl border">
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-1">Due Date</div>
                  <div className="font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    {assignment.dueDate ? format(new Date(assignment.dueDate), 'PPP p') : 'None'}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-1">Max Score</div>
                  <div className="font-medium flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    {assignment.maxScore} Points
                  </div>
                </div>
                {isTeacher && (
                  <div>
                    <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-1">Assigned To</div>
                    {assignment.assignmentType === 'group' ? (
                      <div className="space-y-1">
                        <div className="font-medium flex items-center gap-2">
                          <UsersIcon className="w-4 h-4 text-primary" />
                          {(assignment.targetGroups?.length ?? 0)} group{(assignment.targetGroups?.length ?? 0) === 1 ? '' : 's'}
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-0.5">
                          {(assignment.targetGroups ?? []).map((g: any) => (
                            <li key={g.id} className="truncate">{g.name} ({g.members.length})</li>
                          ))}
                        </ul>
                        {assignment.leaderOnlySubmit && (
                          <p className="text-xs text-muted-foreground">Only group leaders can submit.</p>
                        )}
                      </div>
                    ) : assignment.targetStudents && assignment.targetStudents.length > 0 ? (
                      <div className="space-y-1">
                        <div className="font-medium flex items-center gap-2">
                          <UsersIcon className="w-4 h-4 text-primary" />
                          {assignment.targetStudents.length} student{assignment.targetStudents.length === 1 ? '' : 's'}
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-0.5">
                          {assignment.targetStudents.map((s: any) => (
                            <li key={s.id} className="truncate">{s.name || s.email || s.id}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="font-medium flex items-center gap-2">
                        <UsersIcon className="w-4 h-4 text-primary" />
                        All students
                      </div>
                    )}
                  </div>
                )}
                {!isTeacher && assignment.mySubmissionStatus && (
                  <div className="pt-2 border-t border-border/50">
                    <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-1">Status</div>
                    <div className={`font-semibold ${assignment.mySubmissionStatus === 'graded' ? 'text-success' : 'text-info'}`}>
                      {assignment.mySubmissionStatus === 'graded' ? 'Graded' : 'Submitted for Review'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isTeacher ? (
        <TeacherSubmissionsView assignmentId={assignmentId} />
      ) : assignment.assignmentType === 'group' ? (
        <div className="space-y-6">
          {assignment.myGroup && (
            <div className="grid md:grid-cols-2 gap-6">
              <GroupRosterCard group={assignment.myGroup} title="Your Group" />
              <GroupTasksPanel
                assignmentId={assignmentId}
                group={assignment.myGroup}
                viewerId={user?.id}
              />
            </div>
          )}
          <StudentSubmissionForm assignment={assignment} viewerId={user?.id} />
        </div>
      ) : (
        <StudentSubmissionForm assignment={assignment} viewerId={user?.id} />
      )}
    </div>
  );
}

export function AiDeclarationBadge({ declaration, className = "" }: { declaration?: string | null; className?: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    none: { label: "No AI", cls: "bg-success/10 text-success border-success/20" },
    assisted: { label: "AI-assisted", cls: "bg-info/10 text-info border-info/20" },
    generated: { label: "Mostly AI", cls: "bg-warning/12 text-warning border-warning/25" },
  };
  const entry = declaration ? map[declaration] : undefined;
  const { label, cls } = entry ?? { label: "Not declared", cls: "bg-muted text-muted-foreground border-border" };
  return <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${cls} ${className}`}>{label}</span>;
}

export function SimilarityBadge({ score }: { score?: number | null }) {
  if (score == null) return <span className="text-muted-foreground">—</span>;
  const cls = score >= 70
    ? "bg-danger/10 text-danger border-danger/20"
    : "bg-warning/12 text-warning border-warning/25";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      <Copy className="w-3 h-3" /> {Math.round(score)}%
    </span>
  );
}

function TeacherSubmissionsView({ assignmentId }: { assignmentId: number }) {
  const { data: submissions, isLoading } = useListAssignmentSubmissions(assignmentId, { query: { enabled: !!assignmentId, queryKey: getListAssignmentSubmissionsQueryKey(assignmentId) } });
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const rerunMutation = useRunSimilarityCheck();

  if (isLoading) return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const handleRerun = () => {
    rerunMutation.mutate({ assignmentId }, {
      onSuccess: (res) => {
        toast({ title: "Similarity check complete", description: `${res.flaggedPairs} similar pair${res.flaggedPairs === 1 ? '' : 's'} flagged.` });
        queryClient.invalidateQueries({ queryKey: getListAssignmentSubmissionsQueryKey(assignmentId) });
      },
      onError: (err: any) => toast({ title: "Similarity check failed", description: err?.message, variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Submissions Queue</h2>
        {submissions && submissions.length > 1 && (
          <Button variant="outline" size="sm" onClick={handleRerun} disabled={rerunMutation.isPending}>
            {rerunMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Re-run similarity check
          </Button>
        )}
      </div>
      
      {submissions && submissions.length > 0 ? (
        <div className="bg-card border rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-left text-sm min-w-[720px]">
            <thead className="bg-muted/50 font-medium text-muted-foreground border-b uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Submitted</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">AI Score</th>
                <th className="px-6 py-4">AI Use</th>
                <th className="px-6 py-4">Similarity</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {submissions.map(sub => (
                <tr key={sub.id} className="hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => setLocation(`/submission/${sub.id}`)}>
                  <td className="px-6 py-4 font-medium text-foreground">
                    {sub.groupName ? (
                      <div>
                        <div className="flex items-center gap-1.5"><UsersIcon className="w-3.5 h-3.5 text-primary" /> {sub.groupName}</div>
                        <div className="text-xs text-muted-foreground font-normal">submitted by {sub.studentName}</div>
                      </div>
                    ) : (
                      sub.studentName
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{format(new Date(sub.submittedAt), 'MMM d, h:mm a')}</td>
                  <td className="px-6 py-4">
                    {sub.status === 'graded' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                        {sub.score}/{sub.maxScore}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning/12 text-warning border border-warning/25">
                        Needs Grading
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {sub.aiScore ? (
                      <span className="text-muted-foreground font-mono bg-muted px-2 py-1 rounded">{sub.aiScore}/{sub.maxScore}</span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4"><AiDeclarationBadge declaration={sub.aiDeclaration} /></td>
                  <td className="px-6 py-4"><SimilarityBadge score={sub.similarityMax} /></td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      {sub.status === 'graded' ? 'Review' : 'Grade Now'} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            No submissions yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StudentSubmissionForm({ assignment, viewerId }: { assignment: any; viewerId?: string }) {
  const [activeTab, setActiveTab] = useState<string>(assignment.allowedTypes[0] || 'text');
  const [textResponse, setTextResponse] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [aiDeclaration, setAiDeclaration] = useState<"none" | "assisted" | "generated" | "">("");
  const [aiDeclarationNote, setAiDeclarationNote] = useState("");
  
  const submitMutation = useCreateSubmission(assignment.id);
  const requestUrl = useRequestUploadUrl();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const isSubmitted = !!assignment.mySubmissionId;
  const isGroup = assignment.assignmentType === 'group';
  const isLeader = isGroup && assignment.myGroup?.leaderId === viewerId;
  const leaderBlocked = isGroup && assignment.leaderOnlySubmit && !isLeader;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let submissionData: any = {};
    
    try {
      if (activeTab === 'text') {
        if (!textResponse.trim()) throw new Error("Response is empty");
        submissionData.textResponse = textResponse;
      } else if (activeTab === 'link') {
        if (!linkUrl.trim()) throw new Error("URL is empty");
        submissionData.linkUrl = linkUrl;
      } else if (activeTab === 'file' && fileToUpload) {
        // Upload logic
        const urlRes = await requestUrl.mutateAsync({
          data: { name: fileToUpload.name, size: fileToUpload.size, contentType: fileToUpload.type }
        });
        
        await fetch(urlRes.uploadURL, {
          method: 'PUT',
          headers: { 'Content-Type': fileToUpload.type },
          body: fileToUpload
        });
        
        submissionData.files = [{ path: urlRes.objectPath, name: fileToUpload.name }];
      } else {
        throw new Error("Please complete the required fields for this submission type.");
      }

      if (!aiDeclaration) {
        throw new Error("Please declare whether you used AI for this work.");
      }
      submissionData.aiDeclaration = aiDeclaration;
      if (aiDeclarationNote.trim()) submissionData.aiDeclarationNote = aiDeclarationNote.trim();

      const res = await submitMutation.mutateAsync({ assignmentId: assignment.id, data: submissionData });
      toast({ title: "Submission successful", description: "Your work is now being processed by AI for a draft score." });
      
      // Redirect to the newly created submission view
      setTimeout(() => setLocation(`/submission/${res.id}`), 500);
      
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    }
  };

  if (isSubmitted) {
    return (
      <Card className="border-success/20 bg-success/10">
        <CardContent className="p-8 flex flex-col items-center text-center">
          <CheckCircle className="w-12 h-12 text-success mb-4" />
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
            {isGroup ? "Group Work Submitted" : "Work Submitted"}
          </h2>
          <p className="text-muted-foreground max-w-md mb-6">
            {isGroup
              ? "Your group's shared submission has been received. Every member can view its status, grade, and feedback."
              : "Your work has been received and is waiting for professor review."}
          </p>
          <Button asChild>
            <Link href={`/submission/${assignment.mySubmissionId}`}>
              {isGroup ? "View Group Submission" : "View My Submission"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isGroup && !assignment.myGroup) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center text-muted-foreground">
          You're not in a group for this assignment.
        </CardContent>
      </Card>
    );
  }

  if (leaderBlocked) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center text-muted-foreground">
          Only your group leader can submit this assignment. Once they turn it in,
          you'll see the shared submission here.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm overflow-hidden">
      <div className="bg-muted/30 px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">{isGroup ? "Your Group's Work" : "Your Work"}</h2>
        {isGroup && (
          <p className="text-sm text-muted-foreground mt-1">
            One shared submission for {assignment.myGroup?.name} — the grade will apply to every member.
          </p>
        )}
      </div>
      <CardContent className="p-0">
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full flex justify-start h-14 bg-muted/30 border-b rounded-none p-0 overflow-x-auto">
              {assignment.allowedTypes.includes('text') && <TabsTrigger value="text" className="h-full rounded-none px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary shrink-0"><FileText className="w-4 h-4 mr-2" /> Write Response</TabsTrigger>}
              {assignment.allowedTypes.includes('file') && <TabsTrigger value="file" className="h-full rounded-none px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary shrink-0"><UploadCloud className="w-4 h-4 mr-2" /> Upload File</TabsTrigger>}
              {assignment.allowedTypes.includes('link') && <TabsTrigger value="link" className="h-full rounded-none px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary shrink-0"><LinkIcon className="w-4 h-4 mr-2" /> URL Link</TabsTrigger>}
              {assignment.allowedTypes.includes('video') && <TabsTrigger value="video" className="h-full rounded-none px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary shrink-0"><Video className="w-4 h-4 mr-2" /> Record Video</TabsTrigger>}
            </TabsList>
            
            <div className="p-6">
              <TabsContent value="text" className="mt-0 outline-none">
                <Textarea 
                  placeholder="Write your response here..." 
                  className="min-h-[300px] text-base resize-y"
                  value={textResponse}
                  onChange={e => setTextResponse(e.target.value)}
                />
              </TabsContent>
              
              <TabsContent value="file" className="mt-0 outline-none">
                <div className="border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center bg-muted/10 hover:bg-muted/30 transition-colors">
                  <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
                  <Input 
                    type="file" 
                    className="max-w-xs mb-2" 
                    onChange={e => setFileToUpload(e.target.files?.[0] || null)}
                  />
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    Select a document, PDF, or image to upload.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="link" className="mt-0 outline-none">
                <div className="space-y-4 max-w-lg">
                  <Label>External URL</Label>
                  <Input 
                    type="url" 
                    placeholder="https://..." 
                    className="h-12"
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Link to a Figma file, Google Doc, or external website.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="video" className="mt-0 outline-none">
                <div className="border border-dashed rounded-xl p-12 text-center">
                  <Video className="w-12 h-12 text-muted-foreground mb-4 mx-auto" />
                  <p className="text-muted-foreground mb-4">Video recording is not available in this demo environment.</p>
                </div>
              </TabsContent>
            </div>
            
            <div className="px-6 pb-6 border-t pt-5 bg-muted/10">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">AI-Use Declaration <span className="text-destructive">*</span></span>
              </div>
              <div className="grid sm:grid-cols-3 gap-2 mb-3">
                {([
                  { value: 'none', label: 'No AI used', desc: 'This is entirely my own work.' },
                  { value: 'assisted', label: 'AI-assisted', desc: 'AI helped me brainstorm, edit, or debug.' },
                  { value: 'generated', label: 'Mostly AI-generated', desc: 'AI produced most of this work.' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAiDeclaration(opt.value)}
                    className={`text-left p-3 rounded-xl border transition-colors ${aiDeclaration === opt.value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'}`}
                  >
                    <div className="font-medium text-sm">{opt.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
              {aiDeclaration && aiDeclaration !== 'none' && (
                <Textarea
                  placeholder="Optional: briefly describe how you used AI (e.g. which tool, for what part)..."
                  className="text-sm min-h-[60px]"
                  value={aiDeclarationNote}
                  onChange={e => setAiDeclarationNote(e.target.value)}
                />
              )}
            </div>

            <div className="px-6 py-4 bg-muted/20 border-t flex justify-end">
              <Button type="submit" size="lg" disabled={submitMutation.isPending} className="font-semibold px-8 shadow-sm">
                {submitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Turn In Work
              </Button>
            </div>
          </Tabs>
        </form>
      </CardContent>
    </Card>
  );
}
