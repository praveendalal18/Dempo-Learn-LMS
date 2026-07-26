import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/page";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  NotebookPen, Plus, ChevronLeft, ChevronRight, Star, EyeOff, Eye,
  ExternalLink, Loader2, Trash2, Pencil, MessageSquare,
} from "lucide-react";

// ---------------------------------------------------------------------------
// types + tiny fetch layer (same-origin /api, cookie auth)
// ---------------------------------------------------------------------------

interface JournalCohort {
  id: number;
  name: string;
  description: string | null;
  type: string;
  canManage: boolean;
}
interface Member { id: string; name: string | null; avatarUrl: string | null }
interface Entry {
  id: number;
  cohortId: number;
  studentId: string;
  entryDate: string;
  content: string;
  link: string | null;
  hidden: boolean;
  highlighted: boolean;
  feedback: string | null;
  feedbackAt: string | null;
  createdAt: string;
  updatedAt: string;
}
interface WeekData {
  canManage: boolean;
  currentUserId: string;
  cohort: { id: number; name: string };
  members: Member[];
  entries: Entry[];
}

async function api<T = unknown>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = j?.error || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// date helpers (local-day, no timezone drift)
// ---------------------------------------------------------------------------

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
const DOW = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function JournalPage() {
  const { data: cohorts, isLoading } = useQuery({
    queryKey: ["journal-my-cohorts"],
    queryFn: () => api<JournalCohort[]>("/journal/my-cohorts"),
  });
  const [cohortId, setCohortId] = useState<number | null>(null);

  const selected =
    cohorts?.find((c) => c.id === cohortId) ?? cohorts?.[0] ?? null;

  return (
    <PageContainer width="wide" className="animate-in fade-in duration-300">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <NotebookPen className="w-6 h-6 text-muted-foreground" /> Learning Journal
          </span>
        }
        description="Log what you worked on each day. Everyone in the cohort can see each other's progress."
        actions={
          cohorts && cohorts.length > 0 ? (
            <Select
              value={String(selected?.id ?? "")}
              onValueChange={(v) => setCohortId(Number(v))}
            >
              <SelectTrigger className="w-full sm:w-[240px]">
                <SelectValue placeholder="Choose a cohort" />
              </SelectTrigger>
              <SelectContent>
                {cohorts.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        </div>
      ) : !cohorts || cohorts.length === 0 ? (
        <div className="text-center py-20 bg-card border border-dashed rounded-xl">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <NotebookPen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-medium mb-2">No cohort yet</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            The journal lives inside a cohort. Once you're added to one (or create one as a professor), it'll show up here.
          </p>
        </div>
      ) : selected ? (
        <Board key={selected.id} cohort={selected} />
      ) : null}
    </PageContainer>
  );
}

// ---------------------------------------------------------------------------
// Weekly board
// ---------------------------------------------------------------------------

function Board({ cohort }: { cohort: JournalCohort }) {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [addOpen, setAddOpen] = useState(false);
  const [openEntry, setOpenEntry] = useState<Entry | null>(null);
  const queryClient = useQueryClient();

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const start = toYMD(days[0]);
  const end = toYMD(days[6]);
  const todayYMD = toYMD(new Date());

  const queryKey = ["journal", cohort.id, start, end];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      api<WeekData>(`/cohorts/${cohort.id}/journal?start=${start}&end=${end}`),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["journal", cohort.id] });
  };

  // group entries by student then date
  const grouped = useMemo(() => {
    const m = new Map<string, Map<string, Entry[]>>();
    for (const e of data?.entries ?? []) {
      if (!m.has(e.studentId)) m.set(e.studentId, new Map());
      const byDate = m.get(e.studentId)!;
      if (!byDate.has(e.entryDate)) byDate.set(e.entryDate, []);
      byDate.get(e.entryDate)!.push(e);
    }
    return m;
  }, [data]);

  const byDay = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of data?.entries ?? []) {
      if (!m.has(e.entryDate)) m.set(e.entryDate, []);
      m.get(e.entryDate)!.push(e);
    }
    return m;
  }, [data]);

  const nameOf = (id: string) =>
    data?.members.find((mm) => mm.id === id)?.name || "Student";

  return (
    <>
      {/* Week nav */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))} title="Previous week">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            This week
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))} title="Next week">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="ml-2 text-sm text-muted-foreground">
            {days[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
            {days[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add entry
        </Button>
      </div>

      <Card className="hidden md:block shadow-sm overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[880px]">
            {/* header row */}
            <div className="grid grid-cols-[180px_repeat(7,1fr)] border-b bg-muted/40 text-center sticky top-0">
              <div className="p-3 text-left text-sm font-semibold">Student</div>
              {days.map((d) => {
                const isToday = toYMD(d) === todayYMD;
                return (
                  <div key={toYMD(d)} className={`p-3 ${isToday ? "bg-primary/10" : ""}`}>
                    <div className="text-[11px] font-medium text-muted-foreground">{DOW[(d.getDay() + 6) % 7]}</div>
                    <div className={`text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* body */}
            {isLoading ? (
              <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
            ) : (data?.members.length ?? 0) === 0 ? (
              <div className="p-12 text-center text-muted-foreground">This cohort has no students yet.</div>
            ) : (
              (data?.members ?? []).map((mem) => (
                <div key={mem.id} className="grid grid-cols-[180px_repeat(7,1fr)] border-b last:border-b-0 items-stretch">
                  <div className="p-3 flex items-center gap-2 border-r bg-card">
                    <Avatar className="w-7 h-7 border">
                      {mem.avatarUrl && <AvatarImage src={mem.avatarUrl} />}
                      <AvatarFallback className="text-xs bg-primary/5">{(mem.name || "S").charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">
                      {mem.id === data?.currentUserId ? "You" : mem.name || "Student"}
                    </span>
                  </div>
                  {days.map((d) => {
                    const ymd = toYMD(d);
                    const cell = grouped.get(mem.id)?.get(ymd) ?? [];
                    return (
                      <div key={ymd} className="p-1.5 border-r last:border-r-0 min-h-[64px] space-y-1">
                        {cell.map((e) => (
                          <button
                            key={e.id}
                            onClick={() => setOpenEntry(e)}
                            className={`w-full text-left text-[11px] leading-tight rounded-md px-2 py-1 truncate transition-colors
                              ${e.highlighted ? "bg-warning/15 text-warning ring-1 ring-warning/40" : "bg-primary/10 text-primary hover:bg-primary/20"}
                              ${e.hidden ? "opacity-50 line-through" : ""}`}
                            title={e.content}
                          >
                            {e.highlighted && <Star className="w-3 h-3 inline mr-1 -mt-0.5 fill-warning text-warning" />}
                            {e.hidden && <EyeOff className="w-3 h-3 inline mr-1 -mt-0.5" />}
                            {e.content}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mobile view — stacked by day (the wide board is desktop-only) */}
      <div className="md:hidden space-y-5">
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
        ) : (data?.entries.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-card border rounded-xl text-sm">
            No entries this week yet. Tap "Add entry" to log what you worked on.
          </div>
        ) : (
          days.map((d) => {
            const ymd = toYMD(d);
            const items = byDay.get(ymd) ?? [];
            if (items.length === 0) return null;
            const isToday = ymd === todayYMD;
            return (
              <div key={ymd}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>
                    {d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                  </span>
                  {isToday && <Badge variant="secondary" className="text-[10px]">Today</Badge>}
                </div>
                <div className="space-y-2">
                  {items.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setOpenEntry(e)}
                      className={`w-full text-left rounded-xl border p-3 transition-colors
                        ${e.highlighted ? "bg-warning/10 border-warning/30" : "bg-card hover:bg-muted/50"}
                        ${e.hidden ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {e.highlighted && <Star className="w-3.5 h-3.5 fill-warning text-warning shrink-0" />}
                        {e.hidden && <EyeOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                        <span className="text-sm font-medium truncate">
                          {e.studentId === data?.currentUserId ? "You" : nameOf(e.studentId)}
                        </span>
                        {e.feedback && <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 ml-auto" />}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{e.content}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {addOpen && (
        <AddEntryDialog
          cohortId={cohort.id}
          defaultDate={todayYMD >= start && todayYMD <= end ? todayYMD : start}
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); invalidate(); }}
        />
      )}
      {openEntry && data && (
        <EntryDialog
          entry={openEntry}
          canManage={data.canManage}
          isAuthor={openEntry.studentId === data.currentUserId}
          authorName={openEntry.studentId === data.currentUserId ? "You" : nameOf(openEntry.studentId)}
          onClose={() => setOpenEntry(null)}
          onChanged={(updated) => { setOpenEntry(updated); invalidate(); }}
          onDeleted={() => { setOpenEntry(null); invalidate(); }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Add entry dialog
// ---------------------------------------------------------------------------

function AddEntryDialog({
  cohortId, defaultDate, onClose, onSaved,
}: {
  cohortId: number;
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [entryDate, setEntryDate] = useState(defaultDate);
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: () =>
      api(`/cohorts/${cohortId}/journal`, {
        method: "POST",
        body: JSON.stringify({ entryDate, content: content.trim(), link: link.trim() || null }),
      }),
    onSuccess: () => { toast({ title: "Entry added" }); onSaved(); },
    onError: (e: Error) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle className="font-serif">What did you work on?</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Day</label>
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">What I tried</label>
            <Textarea rows={5} autoFocus placeholder="Today I worked on…" value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Link (optional)</label>
            <Input placeholder="Paste a link to your work (doc, repo, drive…)" value={link} onChange={(e) => setLink(e.target.value)} />
            <p className="text-xs text-muted-foreground">File uploads arrive once storage is enabled — for now, share a link.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={!content.trim() || create.isPending} onClick={() => create.mutate()}>
              {create.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Add entry
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Entry detail dialog (view / feedback / moderate / edit / delete)
// ---------------------------------------------------------------------------

function EntryDialog({
  entry, canManage, isAuthor, authorName, onClose, onChanged, onDeleted,
}: {
  entry: Entry;
  canManage: boolean;
  isAuthor: boolean;
  authorName: string;
  onClose: () => void;
  onChanged: (e: Entry) => void;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(entry.content);
  const [link, setLink] = useState(entry.link ?? "");
  const [feedback, setFeedback] = useState(entry.feedback ?? "");

  const patch = useMutation({
    mutationFn: () =>
      api<Entry>(`/journal/${entry.id}`, {
        method: "PATCH",
        body: JSON.stringify({ content: content.trim(), link: link.trim() || null }),
      }),
    onSuccess: (e) => { toast({ title: "Entry updated" }); setEditing(false); onChanged(e); },
    onError: (e: Error) => toast({ title: "Could not update", description: e.message, variant: "destructive" }),
  });
  const saveFeedback = useMutation({
    mutationFn: () =>
      api<Entry>(`/journal/${entry.id}/feedback`, {
        method: "POST",
        body: JSON.stringify({ feedback: feedback.trim() }),
      }),
    onSuccess: (e) => { toast({ title: "Feedback saved" }); onChanged(e); },
    onError: (e: Error) => toast({ title: "Could not save feedback", description: e.message, variant: "destructive" }),
  });
  const moderate = useMutation({
    mutationFn: (body: { hidden?: boolean; highlighted?: boolean }) =>
      api<Entry>(`/journal/${entry.id}/moderate`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (e) => onChanged(e),
    onError: (e: Error) => toast({ title: "Could not update", description: e.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: () => api(`/journal/${entry.id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Entry deleted" }); onDeleted(); },
    onError: (e: Error) => toast({ title: "Could not delete", description: e.message, variant: "destructive" }),
  });

  // Autosave the entry edit ~1.5s after typing stops (silent safety net; the
  // Save button still saves and closes explicitly).
  useEffect(() => {
    if (!editing || !content.trim()) return;
    const t = setTimeout(() => {
      api<Entry>(`/journal/${entry.id}`, {
        method: "PATCH",
        body: JSON.stringify({ content: content.trim(), link: link.trim() || null }),
      }).then((e) => onChanged(e)).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, content, link]);

  const dateLabel = new Date(entry.entryDate + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            {entry.highlighted && <Star className="w-4 h-4 fill-warning text-warning" />}
            {authorName}
            <span className="text-sm font-normal text-muted-foreground">· {dateLabel}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {editing ? (
            <>
              <Textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} />
              <Input placeholder="Link (optional)" value={link} onChange={(e) => setLink(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditing(false); setContent(entry.content); setLink(entry.link ?? ""); }}>Cancel</Button>
                <Button size="sm" disabled={!content.trim() || patch.isPending} onClick={() => patch.mutate()}>
                  {patch.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm whitespace-pre-wrap text-foreground">{entry.content}</p>
              {entry.link && (
                <a href={entry.link} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline break-all">
                  <ExternalLink className="w-4 h-4 shrink-0" /> {entry.link}
                </a>
              )}
            </>
          )}

          {/* Feedback */}
          {canManage ? (
            <div className="pt-3 border-t space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /> Professor feedback</label>
              <Textarea rows={3} placeholder="Leave feedback for this student…" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
              <div className="flex justify-end">
                <Button size="sm" variant="outline" disabled={saveFeedback.isPending} onClick={() => saveFeedback.mutate()}>
                  {saveFeedback.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save feedback
                </Button>
              </div>
            </div>
          ) : entry.feedback ? (
            <div className="pt-3 border-t">
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Professor feedback</p>
                <p className="text-sm whitespace-pre-wrap">{entry.feedback}</p>
              </div>
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
            {canManage && (
              <>
                <Button size="sm" variant="outline" disabled={moderate.isPending} onClick={() => moderate.mutate({ highlighted: !entry.highlighted })}>
                  <Star className={`w-4 h-4 mr-1.5 ${entry.highlighted ? "fill-warning text-warning" : ""}`} />
                  {entry.highlighted ? "Unhighlight" : "Highlight"}
                </Button>
                <Button size="sm" variant="outline" disabled={moderate.isPending} onClick={() => moderate.mutate({ hidden: !entry.hidden })}>
                  {entry.hidden ? <Eye className="w-4 h-4 mr-1.5" /> : <EyeOff className="w-4 h-4 mr-1.5" />}
                  {entry.hidden ? "Unhide" : "Hide"}
                </Button>
              </>
            )}
            {isAuthor && !editing && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="w-4 h-4 mr-1.5" /> Edit
              </Button>
            )}
            {(isAuthor || canManage) && (
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive ml-auto" disabled={remove.isPending} onClick={() => remove.mutate()}>
                {remove.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1.5" />} Delete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
