import { useState } from "react";
import { Link } from "wouter";
import {
  useGetMe,
  useGetQuiz,
  useCreateQuizAttempt,
  useListQuizAttempts,
  useGradeQuizAttempt,
  usePublishQuiz,
  usePublishQuizResults,
  useDeleteQuiz,
  getGetQuizQueryKey,
  getListQuizAttemptsQueryKey,
  getListQuizzesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { QuizFormDialog } from "@/components/quiz-dialog";
import {
  Loader2, Clock, Award, CheckCircle, CheckCircle2, XCircle, Circle,
  Pencil, Trash2, Megaphone, Send, ListChecks, Type, ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";
import { format } from "date-fns";

export default function QuizViewPage({ id }: { id: string }) {
  const quizId = parseInt(id, 10);
  const { data: user } = useGetMe();
  const { data: quiz, isLoading } = useGetQuiz(quizId, {
    query: { enabled: !!quizId, queryKey: getGetQuizQueryKey(quizId) },
  });
  const isTeacher = user?.role === "teacher";

  if (isLoading)
    return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mt-20" /></div>;
  if (!quiz)
    return <div className="p-8 text-center text-muted-foreground mt-20">Quiz not found.</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 font-medium">
        <Link href={`/course/${quiz.courseId}`} className="hover:text-foreground">Course</Link>
        <span>/</span>
        <span className="text-foreground">{quiz.title}</span>
      </div>

      <div className="bg-card border rounded-2xl p-8 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{quiz.title}</h1>
              {isTeacher && (
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${quiz.status === "published" ? "bg-success/10 text-success" : "bg-warning/12 text-warning"}`}>
                  {quiz.status === "published" ? "Published" : "Draft"}
                </span>
              )}
              {quiz.resultsPublishedAt && (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider bg-info/10 text-info">
                  Results Out
                </span>
              )}
            </div>
            {quiz.description && <p className="text-muted-foreground max-w-2xl">{quiz.description}</p>}
          </div>
          <div className="w-full md:w-64 shrink-0 bg-muted/30 p-5 rounded-xl border space-y-4">
            <div>
              <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-1">Due Date</div>
              <div className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                {quiz.dueDate ? format(new Date(quiz.dueDate), "PPP p") : "None"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-1">Total Points</div>
              <div className="font-medium flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                {quiz.maxScore ?? 0} Points · {quiz.questionCount ?? 0} Questions
              </div>
            </div>
          </div>
        </div>

        {isTeacher && <TeacherActions quiz={quiz} />}
      </div>

      {isTeacher ? <TeacherResults quiz={quiz} /> : <StudentQuizBody quiz={quiz} />}
    </div>
  );
}

function TeacherActions({ quiz }: { quiz: any }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const publishQuiz = usePublishQuiz();
  const publishResults = usePublishQuizResults();
  const deleteQuiz = useDeleteQuiz();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetQuizQueryKey(quiz.id) });
    queryClient.invalidateQueries({ queryKey: getListQuizAttemptsQueryKey(quiz.id) });
    queryClient.invalidateQueries({ queryKey: getListQuizzesQueryKey(quiz.courseId) });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t">
      {quiz.status !== "published" && (
        <Button
          onClick={() => publishQuiz.mutate({ quizId: quiz.id }, {
            onSuccess: () => { toast({ title: "Quiz published", description: "Students can now take it." }); refresh(); },
            onError: (e: any) => toast({ title: "Could not publish", description: e?.message, variant: "destructive" }),
          })}
          disabled={publishQuiz.isPending}
        >
          {publishQuiz.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Publish Quiz
        </Button>
      )}
      {quiz.status === "published" && !quiz.resultsPublishedAt && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="default">
              <Megaphone className="w-4 h-4 mr-2" /> Publish Results
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Publish results to students?</AlertDialogTitle>
              <AlertDialogDescription>
                Every attempt will be finalized (AI-suggested scores are accepted where you haven't adjusted them) and students will see their scores and the correct answers. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => publishResults.mutate({ quizId: quiz.id }, {
                  onSuccess: () => { toast({ title: "Results published", description: "Students can now see their scores." }); refresh(); },
                  onError: (e: any) => toast({ title: "Could not publish results", description: e?.message, variant: "destructive" }),
                })}
              >
                Publish Results
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {(quiz.attemptCount ?? 0) === 0 && (
        <QuizFormDialog
          courseId={quiz.courseId}
          quiz={quiz}
          trigger={<Button variant="outline"><Pencil className="w-4 h-4 mr-2" /> Edit</Button>}
        />
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="text-destructive hover:text-destructive ml-auto">
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              The quiz, its questions, and all student attempts will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteQuiz.mutate({ quizId: quiz.id }, {
                onSuccess: () => {
                  toast({ title: "Quiz deleted" });
                  queryClient.invalidateQueries({ queryKey: getListQuizzesQueryKey(quiz.courseId) });
                  window.history.back();
                },
                onError: (e: any) => toast({ title: "Could not delete", description: e?.message, variant: "destructive" }),
              })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------- Teacher results ---------------- */

function TeacherResults({ quiz }: { quiz: any }) {
  const { data: attempts, isLoading } = useListQuizAttempts(quiz.id, {
    query: { enabled: !!quiz.id, queryKey: getListQuizAttemptsQueryKey(quiz.id) },
  });

  const questions = quiz.questions ?? [];

  if (isLoading)
    return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const attemptList = attempts ?? [];

  // Per-question stats: average share of points earned across attempts.
  const questionStats = questions.map((q: any) => {
    let earned = 0;
    let counted = 0;
    for (const a of attemptList) {
      const ans = (a.answers ?? []).find((x: any) => x.questionId === q.id);
      if (!ans) continue;
      counted++;
      earned += ans.score ?? ans.aiScore ?? ans.autoScore ?? 0;
    }
    const pct = counted && q.points ? Math.round((earned / (counted * q.points)) * 100) : null;
    return { question: q, pct, counted };
  });

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Questions</h2>
        <Card className="shadow-sm">
          <CardContent className="p-0 divide-y">
            {questionStats.map(({ question: q, pct }: any, i: number) => (
              <div key={q.id} className="p-4 flex items-start gap-4">
                <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{q.prompt}</div>
                  <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                    {q.type === "multiple_choice" ? <ListChecks className="w-3.5 h-3.5" /> : <Type className="w-3.5 h-3.5" />}
                    {q.type === "multiple_choice"
                      ? `Correct: ${q.options?.[q.correctOption ?? -1] ?? "—"}`
                      : "Short answer"} · {q.points} pt{q.points === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold">{pct != null ? `${pct}%` : "—"}</div>
                  <div className="text-xs text-muted-foreground">avg. score</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">
          Attempts <span className="text-muted-foreground text-base font-normal">({attemptList.length})</span>
        </h2>
        {attemptList.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center text-muted-foreground">
              {quiz.status === "published" ? "No students have taken this quiz yet." : "Publish the quiz so students can take it."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {attemptList.map((a: any) => (
              <AttemptRow key={a.id} attempt={a} quiz={quiz} questions={questions} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function provisionalTotal(attempt: any): number {
  return (attempt.answers ?? []).reduce(
    (sum: number, a: any) => sum + (a.score ?? a.aiScore ?? a.autoScore ?? 0),
    0,
  );
}

function AttemptRow({ attempt, quiz, questions }: { attempt: any; quiz: any; questions: any[] }) {
  const [openDetail, setOpenDetail] = useState(false);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const gradeAttempt = useGradeQuizAttempt();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const total = attempt.score ?? provisionalTotal(attempt);
  const qById = new Map(questions.map((q: any) => [q.id, q]));

  const handleSave = () => {
    const scores = Object.entries(edits)
      .filter(([, v]) => v !== "" && !Number.isNaN(parseFloat(v)))
      .map(([qid, v]) => ({ questionId: parseInt(qid, 10), score: parseFloat(v) }));
    if (scores.length === 0) {
      toast({ title: "Nothing to save", description: "Adjust at least one question score first." });
      return;
    }
    gradeAttempt.mutate({ attemptId: attempt.id, data: { scores } }, {
      onSuccess: () => {
        toast({ title: "Scores updated" });
        setEdits({});
        queryClient.invalidateQueries({ queryKey: getListQuizAttemptsQueryKey(quiz.id) });
      },
      onError: (e: any) => toast({ title: "Could not save scores", description: e?.message, variant: "destructive" }),
    });
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-0">
        <button
          type="button"
          className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
          onClick={() => setOpenDetail((v) => !v)}
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{attempt.studentName ?? "Student"}</div>
            <div className="text-sm text-muted-foreground">
              Submitted {format(new Date(attempt.submittedAt), "MMM d, h:mm a")}
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${attempt.status === "graded" ? "bg-success/10 text-success border-success/20" : "bg-warning/12 text-warning border-warning/25"}`}>
            {attempt.status === "graded" ? "Final" : "Provisional"}
          </span>
          <span className="text-lg font-bold shrink-0">{total}/{attempt.maxScore}</span>
          {openDetail ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {openDetail && (
          <div className="border-t divide-y">
            {(attempt.answers ?? []).map((ans: any) => {
              const q = qById.get(ans.questionId);
              if (!q) return null;
              const current = ans.score ?? ans.aiScore ?? ans.autoScore ?? 0;
              return (
                <div key={ans.questionId} className="p-4 space-y-2">
                  <div className="font-medium text-sm">{q.prompt}</div>
                  {q.type === "multiple_choice" ? (
                    <div className="text-sm flex items-center gap-2">
                      {ans.selectedOption != null && ans.selectedOption === q.correctOption ? (
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      )}
                      <span>
                        Answered: <strong>{ans.selectedOption != null ? q.options?.[ans.selectedOption] : "No answer"}</strong>
                        {" · "}Correct: <strong>{q.options?.[q.correctOption ?? -1] ?? "—"}</strong>
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div className="bg-muted/30 border rounded-lg p-3 whitespace-pre-wrap">{ans.textAnswer || "No answer"}</div>
                      {ans.aiFeedback && (
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                          <span>AI suggestion ({ans.aiScore ?? "—"}/{q.points}): {ans.aiFeedback}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Score</Label>
                    <Input
                      type="number"
                      min={0}
                      max={q.points}
                      step="0.5"
                      className="w-24 h-8"
                      value={edits[ans.questionId] ?? String(current)}
                      onChange={(e) => setEdits((prev) => ({ ...prev, [ans.questionId]: e.target.value }))}
                    />
                    <span className="text-sm text-muted-foreground">/ {q.points}</span>
                  </div>
                </div>
              );
            })}
            <div className="p-4 flex justify-end">
              <Button size="sm" onClick={handleSave} disabled={gradeAttempt.isPending || Object.keys(edits).length === 0}>
                {gradeAttempt.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Adjustments
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Student view ---------------- */

function StudentQuizBody({ quiz }: { quiz: any }) {
  if (quiz.myAttempt) {
    return quiz.resultsPublishedAt ? (
      <StudentResults quiz={quiz} />
    ) : (
      <Card className="border-success/20 bg-success/10">
        <CardContent className="p-8 flex flex-col items-center text-center">
          <CheckCircle className="w-12 h-12 text-success mb-4" />
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">Quiz Submitted</h2>
          <p className="text-muted-foreground max-w-md">
            Your answers are in. Your score and the correct answers will appear here once your teacher publishes the results.
          </p>
        </CardContent>
      </Card>
    );
  }
  return <StudentQuizForm quiz={quiz} />;
}

function StudentQuizForm({ quiz }: { quiz: any }) {
  const [answers, setAnswers] = useState<Record<number, { selectedOption?: number; textAnswer?: string }>>({});
  const createAttempt = useCreateQuizAttempt();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const questions = quiz.questions ?? [];

  const unanswered = questions.filter((q: any) => {
    const a = answers[q.id];
    if (!a) return true;
    if (q.type === "multiple_choice") return a.selectedOption == null;
    return !a.textAnswer?.trim();
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAttempt.mutate(
      {
        quizId: quiz.id,
        data: {
          answers: questions.map((q: any) => ({
            questionId: q.id,
            selectedOption: answers[q.id]?.selectedOption,
            textAnswer: answers[q.id]?.textAnswer,
          })),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Quiz submitted", description: "Your answers were turned in." });
          queryClient.invalidateQueries({ queryKey: getGetQuizQueryKey(quiz.id) });
          queryClient.invalidateQueries({ queryKey: getListQuizzesQueryKey(quiz.courseId) });
        },
        onError: (err: any) =>
          toast({ title: "Submission failed", description: err?.message || "Something went wrong.", variant: "destructive" }),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {questions.map((q: any, i: number) => (
        <Card key={q.id} className="shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</span>
                <div className="font-medium text-lg">{q.prompt}</div>
              </div>
              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">
                {q.points} pt{q.points === 1 ? "" : "s"}
              </span>
            </div>

            {q.type === "multiple_choice" ? (
              <div className="space-y-2 pl-10">
                {(q.options ?? []).map((opt: string, oi: number) => {
                  const selected = answers[q.id]?.selectedOption === oi;
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: { selectedOption: oi } }))}
                      className={`w-full flex items-center gap-3 p-3 border rounded-lg text-left transition-colors ${selected ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}
                    >
                      {selected ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : <Circle className="w-5 h-5 text-muted-foreground shrink-0" />}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="pl-10">
                <Textarea
                  placeholder="Type your answer..."
                  rows={4}
                  value={answers[q.id]?.textAnswer ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: { textAnswer: e.target.value } }))}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-muted/20 border rounded-xl px-4 md:px-6 py-4">
        <span className="text-sm text-muted-foreground">
          {unanswered.length > 0
            ? `${unanswered.length} question${unanswered.length === 1 ? "" : "s"} unanswered`
            : "All questions answered"}
          {" · "}You can only submit once.
        </span>
        <Button type="submit" size="lg" disabled={createAttempt.isPending} className="font-semibold px-8 w-full sm:w-auto shrink-0">
          {createAttempt.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit Quiz
        </Button>
      </div>
    </form>
  );
}

function StudentResults({ quiz }: { quiz: any }) {
  const attempt = quiz.myAttempt;
  const questions = quiz.questions ?? [];
  const ansById = new Map((attempt.answers ?? []).map((a: any) => [a.questionId, a]));

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight mb-1">Your Result</h2>
            <p className="text-muted-foreground text-sm">
              Submitted {format(new Date(attempt.submittedAt), "PPP p")}
            </p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-foreground">
              {attempt.score ?? 0}<span className="text-2xl text-muted-foreground">/{attempt.maxScore}</span>
            </div>
            <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider mt-1">Final Score</div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {questions.map((q: any, i: number) => {
          const ans: any = ansById.get(q.id);
          const score = ans?.score ?? 0;
          const full = score >= q.points;
          return (
            <Card key={q.id} className="shadow-sm">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${full ? "bg-success/10 text-success" : score > 0 ? "bg-warning/12 text-warning" : "bg-danger/10 text-danger"}`}>
                      {full ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </span>
                    <div className="font-medium">{i + 1}. {q.prompt}</div>
                  </div>
                  <span className="text-sm font-bold shrink-0">{score}/{q.points}</span>
                </div>

                {q.type === "multiple_choice" ? (
                  <div className="pl-10 space-y-1.5 text-sm">
                    {(q.options ?? []).map((opt: string, oi: number) => {
                      const isCorrect = oi === q.correctOption;
                      const isMine = ans?.selectedOption === oi;
                      return (
                        <div key={oi} className={`flex items-center gap-2 p-2 rounded-lg border ${isCorrect ? "border-success/30 bg-success/10" : isMine ? "border-danger/20 bg-danger/10" : "border-transparent"}`}>
                          {isCorrect ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" /> : isMine ? <XCircle className="w-4 h-4 text-destructive shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
                          <span>{opt}</span>
                          {isMine && <span className="ml-auto text-xs font-medium text-muted-foreground">Your answer</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="pl-10 space-y-2 text-sm">
                    <div className="bg-muted/30 border rounded-lg p-3 whitespace-pre-wrap">{ans?.textAnswer || "No answer"}</div>
                    {ans?.aiFeedback && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                        <span>{ans.aiFeedback}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
