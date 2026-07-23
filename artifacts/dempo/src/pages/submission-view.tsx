import { useState, useRef, useEffect } from "react";
import { 
  useGetSubmission, useGradeSubmission, useGetMe, useGetSubmissionComparison,
  getGetSubmissionComparisonQueryKey
} from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetSubmissionQueryKey } from "@workspace/api-client-react";
import { Loader2, CheckCircle, AlertTriangle, FileText, Link as LinkIcon, Download, Sparkles, UserCircle, Clock, Copy } from "lucide-react";
import { AiDeclarationBadge, SimilarityBadge } from "./assignment-view";
import { Link } from "wouter";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GroupRosterCard, GroupTasksPanel } from "@/components/group-panel";
import { Users as UsersIcon } from "lucide-react";

export default function SubmissionViewPage({ id }: { id: string }) {
  const submissionId = parseInt(id, 10);
  const { data: user } = useGetMe();
  const isTeacher = user?.role === "teacher";
  
  const { data: submission, isLoading } = useGetSubmission(submissionId, { query: { enabled: !!submissionId, queryKey: getGetSubmissionQueryKey(submissionId) } });

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;
  if (!submission) return <div className="p-8 text-center text-muted-foreground">Submission not found.</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 font-medium">
        <span className="hover:text-foreground cursor-pointer" onClick={() => window.history.back()}>Assignment</span>
        <span>/</span>
        <span className="text-foreground">{submission.groupName ? `${submission.groupName}'s Work` : `${submission.studentName}'s Work`}</span>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-8 flex-1">
        {/* Left: The Work */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          <div className="flex items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
            <Avatar className="w-12 h-12 border bg-muted">
              <AvatarFallback className="text-lg"><UserCircle className="w-6 h-6 text-muted-foreground" /></AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                {submission.groupName && <UsersIcon className="w-5 h-5 text-primary" />}
                {submission.groupName || submission.studentName}
              </h2>
              <div className="text-sm text-muted-foreground">
                {submission.groupName && <>Group submission by {submission.studentName} · </>}
                Submitted on {format(new Date(submission.submittedAt), 'MMM d, yyyy h:mm a')}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <AiDeclarationBadge declaration={submission.aiDeclaration} />
              </div>
            </div>
            
            {submission.status === 'graded' && (
              <div className="ml-auto flex flex-col items-end">
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-1">Final Score</span>
                <span className="text-2xl font-bold text-success">{submission.score}<span className="text-sm text-muted-foreground">/{submission.maxScore}</span></span>
              </div>
            )}
          </div>

          {submission.group && (
            <div className="grid md:grid-cols-2 gap-6">
              <GroupRosterCard group={submission.group} title={isTeacher ? "Group Roster" : "Your Group"} />
              <GroupTasksPanel
                assignmentId={submission.assignmentId}
                group={submission.group}
                viewerId={user?.id}
                readOnly={isTeacher}
              />
            </div>
          )}

          {submission.aiDeclarationNote && (
            <div className="bg-muted/30 border rounded-xl p-4 text-sm">
              <span className="font-semibold">AI-use note: </span>
              <span className="text-muted-foreground">{submission.aiDeclarationNote}</span>
            </div>
          )}

          <Card className="flex-1 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/30 border-b py-4">
              <CardTitle className="text-lg font-semibold">Submission Content</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 relative min-h-[400px]">
              {submission.textResponse && (
                <div className="p-8 prose prose-slate max-w-none">
                  {submission.textResponse.split('\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}
              
              {submission.linkUrl && (
                <div className="p-8 flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                    <LinkIcon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">External Link Provided</h3>
                  <a href={submission.linkUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-lg">
                    {submission.linkUrl}
                  </a>
                </div>
              )}
              
              {submission.files && submission.files.length > 0 && (
                <div className="p-8">
                  <h3 className="font-medium mb-4">Attached Files</h3>
                  <div className="grid gap-3">
                    {submission.files.map((file, i) => (
                      <a key={i} href={import.meta.env.BASE_URL + "api/storage" + file.path} target="_blank" rel="noreferrer" className="flex items-center p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                        <FileText className="w-8 h-8 text-primary mr-4" />
                        <div className="flex-1">
                          <div className="font-medium">{file.name}</div>
                        </div>
                        <Button variant="ghost" size="icon"><Download className="w-4 h-4" /></Button>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Grading & AI */}
        <div className="space-y-6">
          {/* AI Intelligence Panel */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Dempo Learn AI Analysis</span>
              </div>
              <CardTitle className="text-lg font-semibold">Draft Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 p-4 rounded-lg border flex flex-col items-center text-center">
                  <span className="text-xs uppercase font-semibold text-muted-foreground mb-1 tracking-wider">Suggested</span>
                  <div className="text-3xl font-bold text-foreground">{submission.aiScore || '-'}<span className="text-sm font-normal text-muted-foreground">/{submission.maxScore}</span></div>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg border flex flex-col items-center text-center">
                  <span className="text-xs uppercase font-semibold text-muted-foreground mb-1 tracking-wider">Originality</span>
                  <div className={`text-3xl font-bold ${submission.plagiarismScore && submission.plagiarismScore > 30 ? 'text-danger' : 'text-success'}`}>
                    {submission.plagiarismScore || 0}%
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" /> Suggested Feedback
                </h4>
                <div className="text-sm text-muted-foreground leading-relaxed bg-muted/30 p-4 rounded-lg border">
                  {submission.aiFeedback ? submission.aiFeedback : "AI analysis pending or unavailable."}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Similarity matches — teacher only */}
          {isTeacher && submission.similarityMatches && submission.similarityMatches.length > 0 && (
            <Card className="border-danger/20 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-danger" />
                  <CardTitle className="text-lg font-semibold">Similar Submissions</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This work closely matches {submission.similarityMatches.length} other submission{submission.similarityMatches.length === 1 ? '' : 's'} in this assignment.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {submission.similarityMatches.map((m) => (
                  <div key={m.submissionId} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{m.studentName || m.studentId}</span>
                      <SimilarityBadge score={m.score} />
                    </div>
                    {m.excerpt && (
                      <div className="text-xs text-muted-foreground bg-muted/40 border rounded p-2 max-h-28 overflow-y-auto whitespace-pre-wrap">
                        {m.excerpt}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <ComparisonDialog
                        submissionId={submission.id}
                        otherSubmissionId={m.submissionId}
                        leftName={submission.studentName}
                        rightName={m.studentName || m.studentId}
                      />
                      <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                        <Link href={`/submission/${m.submissionId}`}>Open</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Teacher Grading Panel */}
          {isTeacher ? (
            <GradingPanel submission={submission} />
          ) : (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="font-semibold">Professor Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                {submission.status === 'graded' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded-lg border">
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{submission.feedback || "No feedback provided."}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 text-muted-foreground">
                    <Clock className="w-8 h-8 text-muted/50 mx-auto mb-3" />
                    Waiting for professor to grade.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function HighlightedText({ text, ranges }: { text: string; ranges: { start: number; end: number }[] }) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((r, i) => {
    if (r.start > cursor) parts.push(<span key={`t${i}`}>{text.slice(cursor, r.start)}</span>);
    parts.push(
      <mark key={`m${i}`} className="bg-warning/25 text-foreground rounded-sm px-0.5">
        {text.slice(r.start, r.end)}
      </mark>
    );
    cursor = r.end;
  });
  if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>);
  return <div className="whitespace-pre-wrap text-sm leading-relaxed">{parts}</div>;
}

function ComparisonDialog({ submissionId, otherSubmissionId, leftName, rightName }: {
  submissionId: number;
  otherSubmissionId: number;
  leftName?: string | null;
  rightName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const { data: comparison, isLoading, error } = useGetSubmissionComparison(
    submissionId,
    otherSubmissionId,
    { query: { enabled: open, queryKey: getGetSubmissionComparisonQueryKey(submissionId, otherSubmissionId) } }
  );

  return (
    <>
      <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => setOpen(true)}>
        <Copy className="w-3 h-3 mr-1.5" /> Compare side by side
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-semibold">Side-by-side comparison</DialogTitle>
            <DialogDescription>
              Matched passages are highlighted in both texts.
              {comparison && <span className="ml-1 font-semibold text-foreground">{comparison.score}% similar.</span>}
            </DialogDescription>
          </DialogHeader>
          {isLoading && (
            <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
          )}
          {!!error && (
            <div className="p-8 text-center text-sm text-destructive">
              Could not load the comparison. Both submissions need a text response.
            </div>
          )}
          {comparison && (
            <div className="grid md:grid-cols-2 gap-4 overflow-hidden flex-1 min-h-0">
              {[
                { side: comparison.left, name: comparison.left.studentName || leftName || "Student A" },
                { side: comparison.right, name: comparison.right.studentName || rightName || "Student B" },
              ].map(({ side, name }, i) => (
                <div key={i} className="border rounded-lg flex flex-col min-h-0 overflow-hidden">
                  <div className="px-4 py-2.5 border-b bg-muted/40 text-sm font-semibold shrink-0">
                    {name}
                  </div>
                  <div className="p-4 overflow-y-auto">
                    <HighlightedText text={side.text} ranges={side.ranges} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function GradingPanel({ submission }: { submission: any }) {
  const [score, setScore] = useState<number | string>(submission.score || submission.aiScore || "");
  const [feedback, setFeedback] = useState(submission.feedback || submission.aiFeedback || "");
  
  const gradeMutation = useGradeSubmission(submission.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleGrade = (e: React.FormEvent) => {
    e.preventDefault();
    const numScore = parseInt(score.toString(), 10);
    if (isNaN(numScore) || numScore < 0 || numScore > (submission.maxScore || 100)) {
      toast({ title: "Invalid score", variant: "destructive" });
      return;
    }

    gradeMutation.mutate({ submissionId: submission.id, data: { score: numScore, feedback } }, {
      onSuccess: () => {
        toast({ title: "Grade saved successfully" });
        queryClient.invalidateQueries({ queryKey: getGetSubmissionQueryKey(submission.id) });
      }
    });
  };

  const applyAIFeedback = () => {
    if (submission.aiScore) setScore(submission.aiScore);
    if (submission.aiFeedback) setFeedback(submission.aiFeedback);
  };

  return (
    <form onSubmit={handleGrade}>
      <Card className="shadow-sm">
        <CardHeader className="pb-4 border-b bg-background/50 backdrop-blur">
          <div className="flex justify-between items-center">
            <CardTitle className="font-semibold">Official Evaluation</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={applyAIFeedback} className="h-8 text-xs font-medium">
              <Sparkles className="w-3 h-3 mr-1.5" /> Use AI Draft
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6 bg-background">
          <div className="space-y-3">
            <Label htmlFor="score" className="text-base font-semibold flex items-center gap-2">
              Final Score <span className="text-muted-foreground font-normal text-sm">(out of {submission.maxScore})</span>
            </Label>
            <Input 
              id="score" 
              type="number" 
              className="text-2xl font-bold h-14 pl-4 w-32 border-2 focus-visible:ring-primary"
              value={score} 
              onChange={e => setScore(e.target.value)} 
              min="0"
              max={submission.maxScore}
              required
            />
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="feedback" className="text-base font-semibold">Feedback to Student</Label>
            <Textarea 
              id="feedback" 
              className="min-h-[200px] resize-y leading-relaxed" 
              placeholder="Provide constructive feedback..."
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="bg-background pt-0 pb-6 px-6">
          <Button type="submit" size="lg" className="w-full font-semibold text-md shadow-sm" disabled={gradeMutation.isPending}>
            {gradeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Publish Grade
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
