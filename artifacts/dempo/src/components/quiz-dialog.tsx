import { useState } from "react";
import {
  useCreateQuiz,
  useUpdateQuiz,
  getListQuizzesQueryKey,
  getGetQuizQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Loader2,
  ListChecks,
  Type,
  CheckCircle2,
  Circle,
} from "lucide-react";

export type QuestionDraft = {
  type: "multiple_choice" | "short_answer";
  prompt: string;
  options: string[];
  correctOption: number;
  points: number;
};

const emptyQuestion = (type: QuestionDraft["type"]): QuestionDraft => ({
  type,
  prompt: "",
  options: type === "multiple_choice" ? ["", ""] : [],
  correctOption: 0,
  points: 1,
});

export function QuizFormDialog({
  courseId,
  quiz,
  trigger,
}: {
  courseId: number;
  /** When set, the dialog edits this quiz instead of creating a new one. */
  quiz?: {
    id: number;
    title: string;
    description?: string | null;
    dueDate?: string | null;
    questions?: {
      type: string;
      prompt: string;
      options: string[];
      correctOption?: number | null;
      points: number;
    }[];
  };
  trigger?: React.ReactNode;
}) {
  const editing = !!quiz;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(quiz?.title ?? "");
  const [description, setDescription] = useState(quiz?.description ?? "");
  const [dueDate, setDueDate] = useState(
    quiz?.dueDate ? quiz.dueDate.slice(0, 16) : "",
  );
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    quiz?.questions?.length
      ? quiz.questions.map((q) => ({
          type: q.type as QuestionDraft["type"],
          prompt: q.prompt,
          options: q.options ?? [],
          correctOption: q.correctOption ?? 0,
          points: q.points,
        }))
      : [emptyQuestion("multiple_choice")],
  );

  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const pending = createQuiz.isPending || updateQuiz.isPending;

  const patchQuestion = (i: number, patch: Partial<QuestionDraft>) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)),
    );
  };

  const validate = (): string | null => {
    if (!title.trim()) return "Quiz title is required.";
    if (questions.length === 0) return "Add at least one question.";
    for (const [i, q] of questions.entries()) {
      if (!q.prompt.trim()) return `Question ${i + 1} needs a prompt.`;
      if (q.points < 1) return `Question ${i + 1} needs at least 1 point.`;
      if (q.type === "multiple_choice") {
        const opts = q.options.map((o) => o.trim());
        if (opts.filter(Boolean).length < 2)
          return `Question ${i + 1} needs at least two options.`;
        if (opts.some((o) => !o))
          return `Question ${i + 1} has an empty option.`;
        if (q.correctOption < 0 || q.correctOption >= q.options.length)
          return `Question ${i + 1} needs a correct option selected.`;
      }
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      toast({ title: "Check your quiz", description: problem, variant: "destructive" });
      return;
    }
    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      questions: questions.map((q) => ({
        type: q.type,
        prompt: q.prompt.trim(),
        options: q.type === "multiple_choice" ? q.options.map((o) => o.trim()) : undefined,
        correctOption: q.type === "multiple_choice" ? q.correctOption : undefined,
        points: q.points,
      })),
    };
    const onSuccess = () => {
      toast({ title: editing ? "Quiz updated" : "Quiz created", description: editing ? undefined : "It's saved as a draft — publish it when you're ready." });
      queryClient.invalidateQueries({ queryKey: getListQuizzesQueryKey(courseId) });
      if (quiz) queryClient.invalidateQueries({ queryKey: getGetQuizQueryKey(quiz.id) });
      setOpen(false);
      if (!editing) {
        setTitle(""); setDescription(""); setDueDate("");
        setQuestions([emptyQuestion("multiple_choice")]);
      }
    };
    const onError = (err: any) =>
      toast({ title: "Could not save quiz", description: err?.message || "Something went wrong.", variant: "destructive" });

    if (editing && quiz) {
      updateQuiz.mutate({ quizId: quiz.id, data: data as any }, { onSuccess, onError });
    } else {
      createQuiz.mutate({ courseId, data: data as any }, { onSuccess, onError });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="w-4 h-4 mr-2" /> New Quiz
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {editing ? "Edit Quiz" : "Create Quiz"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="quiz-title">Quiz Title *</Label>
            <Input id="quiz-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quiz-desc">Description</Label>
            <Textarea id="quiz-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="quiz-due">Due Date</Label>
            <Input id="quiz-due" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Questions</Label>
              <span className="text-sm text-muted-foreground">
                {questions.reduce((s, q) => s + (q.points || 0), 0)} points total
              </span>
            </div>

            {questions.map((q, i) => (
              <div key={i} className="border rounded-xl p-4 space-y-3 bg-muted/10">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    {q.type === "multiple_choice" ? <ListChecks className="w-4 h-4" /> : <Type className="w-4 h-4" />}
                    Question {i + 1} — {q.type === "multiple_choice" ? "Multiple Choice" : "Short Answer"}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor={`pts-${i}`} className="text-xs text-muted-foreground">Points</Label>
                      <Input
                        id={`pts-${i}`}
                        type="number"
                        min={1}
                        className="w-16 h-8"
                        value={q.points}
                        onChange={(e) => patchQuestion(i, { points: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="w-8 h-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setQuestions((prev) => prev.filter((_, idx) => idx !== i))}
                      disabled={questions.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Textarea
                  placeholder="Question prompt..."
                  rows={2}
                  value={q.prompt}
                  onChange={(e) => patchQuestion(i, { prompt: e.target.value })}
                />

                {q.type === "multiple_choice" && (
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          type="button"
                          title="Mark as correct answer"
                          onClick={() => patchQuestion(i, { correctOption: oi })}
                          className="shrink-0"
                        >
                          {q.correctOption === oi ? (
                            <CheckCircle2 className="w-5 h-5 text-success" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>
                        <Input
                          placeholder={`Option ${oi + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const options = [...q.options];
                            options[oi] = e.target.value;
                            patchQuestion(i, { options });
                          }}
                        />
                        <Button
                          type="button" variant="ghost" size="icon"
                          className="w-8 h-8 text-muted-foreground hover:text-destructive shrink-0"
                          disabled={q.options.length <= 2}
                          onClick={() => {
                            const options = q.options.filter((_, idx) => idx !== oi);
                            patchQuestion(i, {
                              options,
                              correctOption:
                                q.correctOption === oi
                                  ? 0
                                  : q.correctOption > oi
                                    ? q.correctOption - 1
                                    : q.correctOption,
                            });
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button" variant="outline" size="sm"
                      onClick={() => patchQuestion(i, { options: [...q.options, ""] })}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Option
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Click the circle to mark the correct answer.
                    </p>
                  </div>
                )}
                {q.type === "short_answer" && (
                  <p className="text-xs text-muted-foreground">
                    Students type a free-form answer. AI suggests a score you can adjust before publishing results.
                  </p>
                )}
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setQuestions((p) => [...p, emptyQuestion("multiple_choice")])}>
                <ListChecks className="w-4 h-4 mr-2" /> Add Multiple Choice
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setQuestions((p) => [...p, emptyQuestion("short_answer")])}>
                <Type className="w-4 h-4 mr-2" /> Add Short Answer
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Create Draft"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
