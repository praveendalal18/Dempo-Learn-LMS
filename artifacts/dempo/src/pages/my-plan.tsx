import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageContainer, PageHeader } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Bell, Trash2, CalendarClock, FileText, ListChecks, BookOpen, Clock, Target } from "lucide-react";
import { format, isAfter, isBefore } from "date-fns";

type Session = { courseId: number; courseTitle: string; day: number; date: string; time: string; when: string; title: string; preWork: string | null; postWork: string | null; locked: boolean };
type Due = { id: number; courseId: number; courseTitle: string; title: string; dueDate: string | null; link: string };
type Task = { id: number; title: string; note: string | null; dueAt: string | null; remindAt: string | null; tags: string[]; courseId: number | null; sourceType: string | null; sourceRef: string | null; done: boolean; createdAt: string };
type Focus = { sessions: Session[]; assignments: Due[]; quizzes: Due[] };

type Kind = "session" | "prework" | "postwork" | "assignment" | "quiz" | "task";
type Item = {
  id: string; kind: Kind; courseId: number | null; courseTitle: string; title: string;
  when: Date | null; link?: string; task?: Task;
  add?: { sourceType: string; sourceRef: string; dueAt: string | null };
};

async function api<T = unknown>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) { let m = res.statusText; try { const j = await res.json(); m = j?.error || m; } catch {/*_*/} throw new Error(m); }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const KIND_LABEL: Record<Kind, string> = { session: "Session", prework: "Pre-work", postwork: "Post-work", assignment: "Assignment", quiz: "Quiz", task: "My task" };
const KIND_ICON: Record<Kind, any> = { session: CalendarClock, prework: BookOpen, postwork: ListChecks, assignment: FileText, quiz: FileText, task: Target };

export default function MyPlanPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: focus, isLoading: l1 } = useQuery({ queryKey: ["me-focus"], queryFn: () => api<Focus>("/me/focus") });
  const { data: tasks, isLoading: l2 } = useQuery({ queryKey: ["me-tasks"], queryFn: () => api<Task[]>("/me/tasks") });

  const [course, setCourse] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [timeframe, setTimeframe] = useState<string>("all");
  const [tag, setTag] = useState<string | null>(null);

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["me-focus"] }); qc.invalidateQueries({ queryKey: ["me-tasks"] }); };

  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 86400000);

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    const existingRefs = new Set((tasks ?? []).map((t) => `${t.sourceType}:${t.sourceRef}`));
    for (const s of focus?.sessions ?? []) {
      const when = new Date(s.when);
      out.push({ id: `s-${s.courseId}-${s.day}`, kind: "session", courseId: s.courseId, courseTitle: s.courseTitle, title: s.title, when, link: `/course/${s.courseId}?tab=plan`, add: { sourceType: "session", sourceRef: `${s.courseId}:${s.day}`, dueAt: s.when } });
      if (s.preWork && isAfter(when, now)) out.push({ id: `pre-${s.courseId}-${s.day}`, kind: "prework", courseId: s.courseId, courseTitle: s.courseTitle, title: `Prep for: ${s.title}`, when, link: `/course/${s.courseId}?tab=plan`, add: { sourceType: "prework", sourceRef: `${s.courseId}:${s.day}`, dueAt: s.when } });
      if (s.postWork && isBefore(when, now)) out.push({ id: `post-${s.courseId}-${s.day}`, kind: "postwork", courseId: s.courseId, courseTitle: s.courseTitle, title: `Follow-up: ${s.title}`, when, link: `/course/${s.courseId}?tab=plan`, add: { sourceType: "postwork", sourceRef: `${s.courseId}:${s.day}`, dueAt: s.when } });
    }
    for (const a of focus?.assignments ?? []) out.push({ id: `a-${a.id}`, kind: "assignment", courseId: a.courseId, courseTitle: a.courseTitle, title: a.title, when: a.dueDate ? new Date(a.dueDate) : null, link: a.link, add: { sourceType: "assignment", sourceRef: String(a.id), dueAt: a.dueDate } });
    for (const q of focus?.quizzes ?? []) out.push({ id: `q-${q.id}`, kind: "quiz", courseId: q.courseId, courseTitle: q.courseTitle, title: q.title, when: q.dueDate ? new Date(q.dueDate) : null, link: q.link, add: { sourceType: "quiz", sourceRef: String(q.id), dueAt: q.dueDate } });
    for (const t of tasks ?? []) out.push({ id: `t-${t.id}`, kind: "task", courseId: t.courseId, courseTitle: "", title: t.title, when: t.dueAt ? new Date(t.dueAt) : null, task: t });
    // Hide "add" affordance where a task already exists for that source.
    for (const it of out) if (it.add && existingRefs.has(`${it.add.sourceType}:${it.add.sourceRef}`)) it.add = undefined;
    return out;
  }, [focus, tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const courses = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of focus?.sessions ?? []) m.set(s.courseId, s.courseTitle);
    for (const a of focus?.assignments ?? []) m.set(a.courseId, a.courseTitle);
    for (const q of focus?.quizzes ?? []) m.set(q.courseId, q.courseTitle);
    return [...m.entries()];
  }, [focus]);
  const allTags = useMemo(() => [...new Set((tasks ?? []).flatMap((t) => t.tags))].sort(), [tasks]);

  const filtered = items.filter((it) => {
    if (course !== "all" && String(it.courseId) !== course) return false;
    if (type !== "all" && it.kind !== type) return false;
    if (tag) { if (it.kind !== "task" || !it.task?.tags.includes(tag)) return false; }
    if (timeframe !== "all") {
      const w = it.when;
      if (timeframe === "overdue") { if (!w || !isBefore(w, now) || it.task?.done) return false; }
      else if (timeframe === "week") { if (!w || isBefore(w, now) || isAfter(w, weekEnd)) return false; }
      else if (timeframe === "upcoming") { if (!w || !isAfter(w, now)) return false; }
    }
    return true;
  });

  filtered.sort((a, b) => {
    const ad = a.task?.done ? 1 : 0, bd = b.task?.done ? 1 : 0;
    if (ad !== bd) return ad - bd;
    if (!a.when && !b.when) return 0;
    if (!a.when) return 1;
    if (!b.when) return -1;
    return a.when.getTime() - b.when.getTime();
  });

  const addToPlan = async (it: Item) => {
    if (!it.add) return;
    try {
      await api("/me/tasks", { method: "POST", body: JSON.stringify({ title: it.title, courseId: it.courseId, sourceType: it.add.sourceType, sourceRef: it.add.sourceRef, dueAt: it.add.dueAt }) });
      toast({ title: "Added to your plan" });
      invalidate();
    } catch (e: any) { toast({ title: "Couldn't add", description: e?.message, variant: "destructive" }); }
  };
  const toggleTask = async (t: Task) => {
    try { await api(`/me/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ done: !t.done }) }); qc.invalidateQueries({ queryKey: ["me-tasks"] }); }
    catch (e: any) { toast({ title: "Couldn't update", description: e?.message, variant: "destructive" }); }
  };
  const removeTask = async (t: Task) => {
    try { await api(`/me/tasks/${t.id}`, { method: "DELETE" }); qc.invalidateQueries({ queryKey: ["me-tasks"] }); }
    catch (e: any) { toast({ title: "Couldn't delete", description: e?.message, variant: "destructive" }); }
  };

  const dueTone = (w: Date | null, done?: boolean): { cls: string; variant?: BadgeProps["variant"] } => {
    if (!w || done) return { cls: "text-muted-foreground" };
    if (isBefore(w, now)) return { cls: "text-danger", variant: "danger" };
    if (isBefore(w, weekEnd)) return { cls: "text-warning", variant: "warning" };
    return { cls: "text-muted-foreground" };
  };

  return (
    <PageContainer width="wide" className="animate-in fade-in duration-300">
      <PageHeader
        title="My Plan"
        description="Everything to focus on across your courses — in one place."
        actions={<NewTaskDialog courses={courses} onCreated={invalidate} />}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterSelect value={course} onChange={setCourse} options={[["all", "All courses"], ...courses.map(([id, t]) => [String(id), t] as [string, string])]} />
        <FilterSelect value={type} onChange={setType} options={[["all", "All types"], ["session", "Sessions"], ["prework", "Pre-work"], ["postwork", "Post-work"], ["assignment", "Assignments"], ["quiz", "Quizzes"], ["task", "My tasks"]]} />
        <FilterSelect value={timeframe} onChange={setTimeframe} options={[["all", "Any time"], ["overdue", "Overdue"], ["week", "This week"], ["upcoming", "Upcoming"]]} />
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {allTags.map((t) => (
              <button key={t} type="button" onClick={() => setTag(t === tag ? null : t)} className={`px-2 py-1 rounded-full text-xs border ${tag === t ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-input"}`}>#{t}</button>
            ))}
          </div>
        )}
      </div>

      {l1 || l2 ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center">
          <Target className="w-10 h-10 mb-3 opacity-30" />
          <p className="max-w-sm">Nothing here right now. You're all caught up — or adjust the filters above.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((it) => {
            const Icon = KIND_ICON[it.kind];
            const tone = dueTone(it.when, it.task?.done);
            return (
              <Card key={it.id} className={`shadow-sm ${it.task?.done ? "opacity-60" : ""}`}>
                <CardContent className="p-3.5 flex items-center gap-3">
                  {it.kind === "task" && it.task ? (
                    <Checkbox checked={it.task.done} onCheckedChange={() => toggleTask(it.task!)} className="shrink-0" />
                  ) : (
                    <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-muted-foreground" /></span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium truncate ${it.task?.done ? "line-through" : ""}`}>{it.title}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{KIND_LABEL[it.kind]}</Badge>
                      {it.courseTitle && <span className="text-xs text-muted-foreground truncate">{it.courseTitle}</span>}
                      {it.when && <span className={`text-xs ${tone.cls}`}>{isBefore(it.when, now) && !it.task?.done ? "Overdue · " : ""}{format(it.when, "EEE, MMM d · h:mm a")}</span>}
                      {it.task?.remindAt && <span className="text-xs text-muted-foreground flex items-center gap-1"><Bell className="w-3 h-3" /> {format(new Date(it.task.remindAt), "MMM d, h:mm a")}</span>}
                      {it.task?.tags.map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">#{t}</span>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {it.add && <Button variant="outline" size="sm" onClick={() => addToPlan(it)}><Plus className="w-3.5 h-3.5 mr-1" /> Plan</Button>}
                    {it.link && <Button variant="ghost" size="sm" asChild><Link href={it.link}>Open</Link></Button>}
                    {it.kind === "task" && it.task && <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-destructive" onClick={() => removeTask(it.task!)}><Trash2 className="w-4 h-4" /></Button>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2.5 text-sm">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function NewTaskDialog({ courses, onCreated }: { courses: [number, string][]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [tags, setTags] = useState("");
  const [courseId, setCourseId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const create = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api("/me/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          note: note.trim() || null,
          dueAt: dueAt || null,
          remindAt: remindAt || null,
          tags: tags.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean),
          courseId: courseId ? Number(courseId) : null,
        }),
      });
      toast({ title: "Task added" });
      setTitle(""); setNote(""); setDueAt(""); setRemindAt(""); setTags(""); setCourseId("");
      setOpen(false); onCreated();
    } catch (e: any) { toast({ title: "Couldn't add task", description: e?.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> New task</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></div>
          <div className="space-y-1.5"><Label>Note</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Due</Label><Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="flex items-center gap-1"><Bell className="w-3.5 h-3.5" /> Remind me</Label><Input type="datetime-local" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Tags</Label><Input placeholder="exam, revise" value={tags} onChange={(e) => setTags(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Course</Label>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm">
                <option value="">None</option>
                {courses.map(([id, t]) => <option key={id} value={id}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving || !title.trim()}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Add task</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
