import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  useGetCoursePlan, useUpdateCoursePlan, getGetCoursePlanQueryKey,
  useRequestUploadUrl,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Lock, Unlock, CalendarDays, BookOpen, Briefcase, ClipboardList,
  Save, Clock, Paperclip, Link as LinkIcon, ExternalLink, Download, X, CalendarClock,
  Eye, EyeOff,
} from "lucide-react";
import { format } from "date-fns";

type PlanItemDraft = {
  hourNumber: number;
  title: string;
  description: string;
  preWork: string;
  caseStudy: string;
  postWork: string;
};

type PlanFile = { path: string; name: string; size?: number };
type HourExtra = { links: string[]; attachments: PlanFile[] };
type PlanExtras = {
  dayDates: Record<string, string>;
  dayTimes: Record<string, string>;
  hoursPerDay: number;
  startTime: string;
  sessionMinutes: number;
  hours: { hourNumber: number; links: string[]; attachments: PlanFile[] }[];
};

// Weekday labels (0 = Sunday) for the schedule auto-fill.
const WEEKDAYS = [
  { i: 1, label: "Mon" }, { i: 2, label: "Tue" }, { i: 3, label: "Wed" },
  { i: 4, label: "Thu" }, { i: 5, label: "Fri" }, { i: 6, label: "Sat" }, { i: 0, label: "Sun" },
];

function formatTime12(hhmm?: string): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m || 0).padStart(2, "0")}${period}`;
}

const HOUR_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

async function api<T = unknown>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j?.error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function planExtrasKey(courseId: number) {
  return ["plan-extras", courseId] as const;
}

function formatSize(size?: number | null): string | null {
  if (!size && size !== 0) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDayDate(ymd: string): string {
  try { return format(parseYmd(ymd), "EEE, d MMM yyyy"); } catch { return ymd; }
}

const storageHref = (path: string) => import.meta.env.BASE_URL + "api/storage" + path;

// Textarea that grows to fit its content (up to a cap) so long notes are
// readable without a cramped inner scrollbar.
function AutoTextarea({
  value, onChange, placeholder, className = "", minHeight = 60, maxHeight = 460,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)}px`;
  }, [value, minHeight, maxHeight]);
  return (
    <Textarea
      ref={ref}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ minHeight }}
      className={`resize-none overflow-y-auto leading-relaxed ${className}`}
    />
  );
}

export function CoursePlanView({ courseId, isTeacher }: { courseId: number; isTeacher: boolean }) {
  const { data: plan, isLoading } = useGetCoursePlan(courseId, {
    query: { enabled: !!courseId, queryKey: getGetCoursePlanQueryKey(courseId) },
  });
  const { data: extras } = useQuery({
    queryKey: planExtrasKey(courseId),
    queryFn: () => api<PlanExtras>(`/courses/${courseId}/plan-extras`),
    enabled: !!courseId,
  });

  if (isLoading) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!plan) return null;

  if (isTeacher) {
    return <TeacherPlanEditor courseId={courseId} plan={plan} extras={extras} />;
  }
  return <StudentPlanView plan={plan} extras={extras} />;
}

/* ---------------- Student view ---------------- */

function StudentPlanView({ plan, extras }: { plan: any; extras?: PlanExtras }) {
  const { totalHours, hoursPerDay, items } = plan;

  if (!totalHours || totalHours === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center">
          <CalendarDays className="w-12 h-12 text-muted mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No course plan yet</h3>
          <p className="max-w-sm">Your professor hasn't published an hour-wise plan for this course yet.</p>
        </CardContent>
      </Card>
    );
  }

  const totalDays = Math.ceil(totalHours / hoursPerDay);
  const isSession = hoursPerDay === 1;
  const unit = isSession ? "Session" : "Day";
  const itemsByHour = new Map<number, any>(items.map((i: any) => [i.hourNumber, i]));
  const dayDates = extras?.dayDates ?? {};
  const dayTimes = extras?.dayTimes ?? {};
  const defaultTime = extras?.startTime ?? "";

  const extrasByHour = new Map<number, HourExtra>(
    (extras?.hours ?? []).map((h) => [h.hourNumber, { links: h.links, attachments: h.attachments }]),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Clock className="w-4 h-4 shrink-0" />
        <span>
          {isSession
            ? `${totalHours} one-hour sessions. Dated sessions appear on your Calendar. Locked sessions show topics only.`
            : `${totalHours} hours across ${totalDays} day${totalDays > 1 ? "s" : ""} (${hoursPerDay} hours/day). Dated days also appear on your Calendar. Locked days show topics only.`}
        </span>
      </div>
      {Array.from({ length: totalDays }, (_, d) => d + 1).map(day => {
        const dayHours = Array.from({ length: hoursPerDay }, (_, h) => (day - 1) * hoursPerDay + h + 1).filter(h => h <= totalHours);
        const dayLocked = dayHours.some(h => itemsByHour.get(h)?.locked);
        const date = dayDates[String(day)];
        const time = dayTimes[String(day)] || defaultTime;
        return (
          <Card key={day} className={`overflow-hidden border shadow-sm rounded-xl transition-shadow hover:shadow-md ${dayLocked ? 'opacity-95' : ''}`}>
            <div className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 flex-wrap ${dayLocked ? 'bg-muted/40' : 'bg-muted/40'}`}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center justify-center min-w-9 h-9 px-2 rounded-lg bg-primary/10 text-primary font-serif font-bold text-base">{day}</span>
                <h3 className="font-serif font-semibold text-lg leading-none">{unit} {day}</h3>
                {date && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    <CalendarClock className="w-4 h-4" /> {formatDayDate(date)}{time ? ` · ${formatTime12(time)}` : ""}
                  </span>
                )}
              </div>
              {dayLocked && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                  <Lock className="w-3 h-3" /> Outline only
                </span>
              )}
            </div>
            <CardContent className="p-0 divide-y">
              {dayHours.map(hour => {
                const item = itemsByHour.get(hour);
                const ex = extrasByHour.get(hour);
                return (
                  <div key={hour} className="px-6 py-4 flex gap-4">
                    {!isSession && <div className="shrink-0 w-16 text-xs font-bold uppercase tracking-wider text-muted-foreground pt-1">Hour {hour}</div>}
                    <div className="flex-1 min-w-0">
                      {item ? (
                        <>
                          <div className="font-medium">{item.title}</div>
                          {!item.locked && item.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{item.description}</p>}
                          {!item.locked && (item.preWork || item.caseStudy || item.postWork) && (
                            <div className="mt-3 grid gap-2">
                              {item.preWork && <WorkRow icon={BookOpen} label="Pre-work" text={item.preWork} />}
                              {item.caseStudy && <WorkRow icon={Briefcase} label="Case study" text={item.caseStudy} />}
                              {item.postWork && <WorkRow icon={ClipboardList} label="Post-work" text={item.postWork} />}
                            </div>
                          )}
                          {!item.locked && ex && <ResourceList links={ex.links} attachments={ex.attachments} />}
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground italic">To be announced</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ResourceList({ links, attachments }: { links: string[]; attachments: PlanFile[] }) {
  if (links.length === 0 && attachments.length === 0) return null;
  return (
    <div className="mt-3 space-y-1.5">
      {links.map((link, i) => (
        <a key={`l${i}`} href={link} target="_blank" rel="noreferrer noopener"
           className="flex items-center gap-2 text-sm text-primary hover:underline w-fit max-w-full">
          <LinkIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{link}</span>
          <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
        </a>
      ))}
      {attachments.map((file, i) => (
        <a key={`a${i}`} href={storageHref(file.path)} target="_blank" rel="noreferrer"
           className="flex items-center gap-2 text-sm hover:underline w-fit max-w-full">
          <Paperclip className="w-3.5 h-3.5 shrink-0 text-primary" />
          <span className="truncate">{file.name}</span>
          {formatSize(file.size) && <span className="text-xs text-muted-foreground">({formatSize(file.size)})</span>}
          <Download className="w-3 h-3 shrink-0 opacity-60" />
        </a>
      ))}
    </div>
  );
}

function WorkRow({ icon: Icon, label, text }: { icon: any; label: string; text: string }) {
  return (
    <div className="flex gap-2 text-sm bg-muted/30 border rounded-lg px-3 py-2">
      <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <div>
        <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mr-2">{label}</span>
        <span className="whitespace-pre-wrap">{text}</span>
      </div>
    </div>
  );
}

/* ---------------- Teacher editor ---------------- */

function TeacherPlanEditor({ courseId, plan, extras }: { courseId: number; plan: any; extras?: PlanExtras }) {
  const hoursPerDay = plan.hoursPerDay || 5;
  const isSession = hoursPerDay === 1;
  const unit = isSession ? "Session" : "Day";
  const unitLower = isSession ? "session" : "day";
  const [totalHours, setTotalHours] = useState<number>(plan.totalHours || 0);
  const [lockedDays, setLockedDays] = useState<number[]>(plan.lockedDays || []);
  const [drafts, setDrafts] = useState<Map<number, PlanItemDraft>>(new Map());
  const [dayDates, setDayDates] = useState<Record<string, string>>({});
  const [dayTimes, setDayTimes] = useState<Record<string, string>>({});
  const [startTime, setStartTime] = useState("09:00");
  const [sessionMinutes, setSessionMinutes] = useState(60);
  // Per-hour links kept as a single textarea string (one URL per line) for editing.
  const [hourLinks, setHourLinks] = useState<Map<number, string>>(new Map());
  const [hourFiles, setHourFiles] = useState<Map<number, PlanFile[]>>(new Map());
  const [uploadingHour, setUploadingHour] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Schedule auto-fill inputs
  const [startDate, setStartDate] = useState("");
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5])); // Mon–Fri

  const updatePlan = useUpdateCoursePlan();
  const requestUrl = useRequestUploadUrl();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (dirtyRef.current) return;
    const map = new Map<number, PlanItemDraft>();
    for (const item of plan.items || []) {
      map.set(item.hourNumber, {
        hourNumber: item.hourNumber,
        title: item.title || "",
        description: item.description || "",
        preWork: item.preWork || "",
        caseStudy: item.caseStudy || "",
        postWork: item.postWork || "",
      });
    }
    setDrafts(map);
    setTotalHours(plan.totalHours || 0);
    setLockedDays(plan.lockedDays || []);
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, plan]);

  // Load dates + links/attachments once extras arrive (don't clobber unsaved edits).
  useEffect(() => {
    if (dirtyRef.current || !extras) return;
    setDayDates(extras.dayDates ?? {});
    setDayTimes(extras.dayTimes ?? {});
    setStartTime(extras.startTime || "09:00");
    setSessionMinutes(extras.sessionMinutes || 60);
    const links = new Map<number, string>();
    const files = new Map<number, PlanFile[]>();
    for (const h of extras.hours ?? []) {
      if (h.links.length) links.set(h.hourNumber, h.links.join("\n"));
      if (h.attachments.length) files.set(h.hourNumber, h.attachments);
    }
    setHourLinks(links);
    setHourFiles(files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, extras]);

  const totalDays = Math.ceil(totalHours / hoursPerDay);

  const setField = (hour: number, field: keyof PlanItemDraft, value: string) => {
    setDrafts(prev => {
      const next = new Map(prev);
      const existing = next.get(hour) || { hourNumber: hour, title: "", description: "", preWork: "", caseStudy: "", postWork: "" };
      next.set(hour, { ...existing, [field]: value });
      return next;
    });
    setDirty(true);
  };

  const setLinks = (hour: number, value: string) => {
    setHourLinks(prev => { const n = new Map(prev); n.set(hour, value); return n; });
    setDirty(true);
  };

  const setDayDate = (day: number, value: string) => {
    setDayDates(prev => {
      const next = { ...prev };
      if (value) next[String(day)] = value; else delete next[String(day)];
      return next;
    });
    setDirty(true);
  };

  const setDayTime = (day: number, value: string) => {
    setDayTimes(prev => {
      const next = { ...prev };
      if (value && value !== startTime) next[String(day)] = value; else delete next[String(day)];
      return next;
    });
    setDirty(true);
  };

  const toggleWeekday = (i: number) => {
    setWeekdays(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  };

  const toggleDayLock = (day: number) => {
    setLockedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    setDirty(true);
  };

  // Bulk visibility: reveal everything, or everything up to session N.
  const revealAll = () => { setLockedDays([]); setDirty(true); };
  const revealUpTo = (n: number) => {
    const locked: number[] = [];
    for (let d = n + 1; d <= totalDays; d++) locked.push(d);
    setLockedDays(locked);
    setDirty(true);
  };
  // Current "visible up to" = the session just before the first locked one.
  const visibleUpTo = lockedDays.length === 0
    ? totalDays
    : Math.max(0, Math.min(...lockedDays) - 1);
  const allVisible = lockedDays.length === 0;

  const applyCadence = () => {
    if (!startDate || totalDays === 0 || weekdays.size === 0) return;
    const out: Record<string, string> = {};
    const cur = parseYmd(startDate);
    let day = 1;
    // Walk forward day-by-day, assigning the next class date whenever the
    // weekday is one the teacher selected (e.g. Tue + Fri).
    let guard = 0;
    while (day <= totalDays && guard < 4000) {
      if (weekdays.has(cur.getDay())) {
        out[String(day)] = toYmd(cur);
        day++;
      }
      cur.setDate(cur.getDate() + 1);
      guard++;
    }
    setDayDates(out);
    setDirty(true);
    toast({ title: "Dates filled", description: `Scheduled ${Object.keys(out).length} ${unitLower}s. Review below, then Save.` });
  };

  const handleFiles = async (hour: number, fileList: FileList | null) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploadingHour(hour);
    try {
      const uploaded: PlanFile[] = [];
      for (const file of files) {
        const urlRes = await requestUrl.mutateAsync({
          data: { name: file.name, size: file.size, contentType: file.type || "application/octet-stream" },
        });
        const putRes = await fetch(urlRes.uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!putRes.ok) throw new Error(`Upload failed for ${file.name}`);
        uploaded.push({ path: urlRes.objectPath, name: file.name, size: file.size });
      }
      setHourFiles(prev => {
        const n = new Map(prev);
        n.set(hour, [...(n.get(hour) || []), ...uploaded]);
        return n;
      });
      setDirty(true);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Storage may not be configured yet.", variant: "destructive" });
    } finally {
      setUploadingHour(null);
    }
  };

  const removeFile = (hour: number, idx: number) => {
    setHourFiles(prev => {
      const n = new Map(prev);
      n.set(hour, (n.get(hour) || []).filter((_, i) => i !== idx));
      return n;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = Array.from(drafts.values())
        .filter(d => d.hourNumber <= totalHours && d.title.trim())
        .map(d => ({
          hourNumber: d.hourNumber,
          title: d.title.trim(),
          description: d.description.trim() || undefined,
          preWork: d.preWork.trim() || undefined,
          caseStudy: d.caseStudy.trim() || undefined,
          postWork: d.postWork.trim() || undefined,
        }));

      await updatePlan.mutateAsync({
        courseId,
        data: { totalHours, lockedDays: lockedDays.filter(d => d <= totalDays), items },
      });

      // Only keep dates/times for days that still exist.
      const dates: Record<string, string> = {};
      for (const [k, v] of Object.entries(dayDates)) {
        if (Number(k) <= totalDays) dates[k] = v;
      }
      const times: Record<string, string> = {};
      for (const [k, v] of Object.entries(dayTimes)) {
        if (Number(k) <= totalDays && v && v !== startTime) times[k] = v;
      }
      const hourNumbers = new Set<number>([...hourLinks.keys(), ...hourFiles.keys()]);
      const hours = Array.from(hourNumbers)
        .filter(h => h <= totalHours)
        .map(h => ({
          hourNumber: h,
          links: (hourLinks.get(h) || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean),
          attachments: hourFiles.get(h) || [],
        }))
        .filter(h => h.links.length > 0 || h.attachments.length > 0);

      await api(`/courses/${courseId}/plan-extras`, {
        method: "PUT",
        body: JSON.stringify({ dayDates: dates, dayTimes: times, startTime, sessionMinutes, hours }),
      });

      toast({ title: "Course plan saved", description: "Students will see the updated plan and dates." });
      queryClient.invalidateQueries({ queryKey: getGetCoursePlanQueryKey(courseId) });
      queryClient.invalidateQueries({ queryKey: planExtrasKey(courseId) });
      setDirty(false);
    } catch (err: any) {
      toast({ title: "Couldn't save plan", description: err?.response?.data?.error || err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filledHours = useMemo(
    () => Array.from(drafts.values()).filter(d => d.hourNumber <= totalHours && d.title.trim()).length,
    [drafts, totalHours],
  );

  const pending = saving || updatePlan.isPending;

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-wrap items-end gap-6">
            <div className="space-y-2">
              <Label htmlFor="total-hours">Course Duration</Label>
              <select
                id="total-hours"
                className="flex h-10 w-44 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={totalHours}
                onChange={e => { setTotalHours(parseInt(e.target.value, 10)); setDirty(true); }}
              >
                <option value={0}>No plan</option>
                {HOUR_OPTIONS.map(h => <option key={h} value={h}>{isSession ? `${h} sessions` : `${h} hours (${h / hoursPerDay} days)`}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">{isSession ? "Each session is one teaching hour." : `${hoursPerDay} teaching hours per day.`}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-time" className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Default start time</Label>
              <Input id="start-time" type="time" className="w-36" value={startTime} onChange={e => { setStartTime(e.target.value); setDirty(true); }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-mins">Length (min)</Label>
              <Input id="session-mins" type="number" min={15} max={600} step={15} className="w-24" value={sessionMinutes} onChange={e => { setSessionMinutes(parseInt(e.target.value, 10) || 60); setDirty(true); }} />
            </div>
            <div className="flex-1 min-w-[200px] text-sm text-muted-foreground pb-1">
              {totalHours > 0 ? `${filledHours}/${totalHours} ${unitLower === "session" ? "sessions" : "hours"} planned. Give each ${unitLower} a date so it lands on students' calendars. Lock a ${unitLower} to show topics only.` : 'Choose a duration to start planning.'}
            </div>
            <Button onClick={handleSave} disabled={pending || !dirty} className="ml-auto">
              {pending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Plan
            </Button>
          </div>

          {totalHours > 0 && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="start-date" className="text-xs flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> Schedule from</Label>
                  <Input id="start-date" type="date" className="w-44" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">On these days</Label>
                  <div className="flex flex-wrap gap-1">
                    {WEEKDAYS.map(w => {
                      const on = weekdays.has(w.i);
                      return (
                        <button
                          key={w.i}
                          type="button"
                          onClick={() => toggleWeekday(w.i)}
                          className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-input"}`}
                        >
                          {w.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={applyCadence} disabled={!startDate || weekdays.size === 0}>
                  Auto-fill dates
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Fills each {unitLower}'s date from your start date, landing only on the weekdays you pick (e.g. Tue + Fri). Adjust any single {unitLower} below to reschedule it.
              </p>
            </div>
          )}

          {totalHours > 0 && (
            <div className="border-t pt-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm">Student visibility</Label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={revealAll}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${allVisible ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-input"}`}
                >
                  All {unitLower}s
                </button>
                <button
                  type="button"
                  onClick={() => revealUpTo(allVisible ? Math.max(1, totalDays - 1) : visibleUpTo || 1)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${!allVisible ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-input"}`}
                >
                  Up to a {unitLower}
                </button>
                {!allVisible && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">show through</span>
                    <select
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={visibleUpTo}
                      onChange={(e) => revealUpTo(parseInt(e.target.value, 10))}
                    >
                      {Array.from({ length: totalDays }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{unit} {n}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {allVisible
                  ? `Students can open every ${unitLower}'s full details.`
                  : `Students see full details through ${unit} ${visibleUpTo}; later ${unitLower}s show the title only until you reveal them. Fine-tune any single ${unitLower} with its lock toggle below.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {totalHours > 0 && Array.from({ length: totalDays }, (_, d) => d + 1).map(day => {
        const locked = lockedDays.includes(day);
        const dayHours = Array.from({ length: hoursPerDay }, (_, h) => (day - 1) * hoursPerDay + h + 1).filter(h => h <= totalHours);
        return (
          <Card key={day} className="overflow-hidden border shadow-sm rounded-xl transition-shadow hover:shadow-md">
            <div className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 flex-wrap ${locked ? "bg-muted/40" : "bg-muted/40"}`}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center justify-center min-w-9 h-9 px-2 rounded-lg bg-primary/10 text-primary font-serif font-bold text-base">{day}</span>
                <h3 className="font-serif font-semibold text-lg leading-none">{unit} {day}</h3>
                <div className="flex items-center gap-1.5 ml-1">
                  <CalendarClock className="w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    className="h-8 w-40 text-sm"
                    value={dayDates[String(day)] || ""}
                    onChange={e => setDayDate(day, e.target.value)}
                  />
                  <Input
                    type="time"
                    className="h-8 w-[104px] text-sm"
                    value={dayTimes[String(day)] || startTime}
                    onChange={e => setDayTime(day, e.target.value)}
                    title="Start time for this session (defaults to the course start time)"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleDayLock(day)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${locked ? "bg-muted text-muted-foreground border-transparent hover:bg-muted/70" : "bg-success/10 text-success border-success/20 hover:bg-success/15"}`}
                title={locked ? "Locked — students see the title only. Click to reveal." : "Visible — students see full details. Click to lock."}
              >
                {locked ? <><EyeOff className="w-3.5 h-3.5" /> Title only</> : <><Eye className="w-3.5 h-3.5" /> Visible</>}
              </button>
            </div>
            <CardContent className="p-0 divide-y">
              {dayHours.map(hour => {
                const draft = drafts.get(hour);
                const files = hourFiles.get(hour) || [];
                const hasTitle = (draft?.title || "").trim().length > 0;
                return (
                  <div key={hour} className="p-5">
                    <div className="flex items-center gap-3">
                      {!isSession && <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground w-14 shrink-0">Hr {hour}</span>}
                      <Input
                        className="text-base font-medium h-11"
                        placeholder={isSession ? "Session topic (leave empty to skip)" : "Topic for this hour (leave empty to skip)"}
                        value={draft?.title || ""}
                        onChange={e => setField(hour, 'title', e.target.value)}
                      />
                    </div>
                    {hasTitle && (
                      <div className={`mt-4 space-y-4 ${isSession ? "" : "md:pl-[68px]"}`}>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What students will learn</Label>
                          <AutoTextarea placeholder="Describe what this session covers (visible to students)..." value={draft?.description || ""} onChange={(v) => setField(hour, 'description', v)} />
                        </div>
                        <div className="grid md:grid-cols-3 gap-3">
                          <EditPanel icon={BookOpen} label="Pre-work" tint="sky">
                            <AutoTextarea placeholder="Read / prepare before class..." value={draft?.preWork || ""} onChange={(v) => setField(hour, 'preWork', v)} minHeight={72} />
                          </EditPanel>
                          <EditPanel icon={Briefcase} label="Case study" tint="violet">
                            <AutoTextarea placeholder="Case or framework to discuss..." value={draft?.caseStudy || ""} onChange={(v) => setField(hour, 'caseStudy', v)} minHeight={72} />
                          </EditPanel>
                          <EditPanel icon={ClipboardList} label="Post-work" tint="amber">
                            <AutoTextarea placeholder="Follow-up after class..." value={draft?.postWork || ""} onChange={(v) => setField(hour, 'postWork', v)} minHeight={72} />
                          </EditPanel>
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5" /> Links <span className="font-normal normal-case tracking-normal text-muted-foreground/70">— one per line</span></Label>
                            <AutoTextarea placeholder="https://..." value={hourLinks.get(hour) || ""} onChange={(v) => setLinks(hour, v)} minHeight={60} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" /> Attachments</Label>
                            {files.length > 0 && (
                              <ul className="space-y-1.5 mb-1.5">
                                {files.map((file, i) => (
                                  <li key={i} className="flex items-center justify-between gap-2 text-sm border rounded-lg px-2.5 py-1.5 bg-muted/30">
                                    <span className="flex items-center gap-2 truncate">
                                      <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                      <span className="truncate">{file.name}</span>
                                      {formatSize(file.size) && <span className="text-xs text-muted-foreground shrink-0">({formatSize(file.size)})</span>}
                                    </span>
                                    <Button type="button" variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeFile(hour, i)}>
                                      <X className="w-3.5 h-3.5" />
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <label className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-dashed border-input bg-background text-sm cursor-pointer hover:bg-muted/50 hover:border-primary/40 transition-colors w-fit">
                              {uploadingHour === hour ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                              {uploadingHour === hour ? "Uploading..." : "Attach files"}
                              <input type="file" multiple className="hidden" disabled={uploadingHour === hour} onChange={e => { handleFiles(hour, e.target.files); e.target.value = ""; }} />
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

const PANEL_TINTS: Record<string, string> = {
  sky: "border-border bg-muted/40",
  violet: "border-border bg-muted/40",
  amber: "border-border bg-muted/40",
};

function EditPanel({ icon: Icon, label, tint, children }: { icon: any; label: string; tint: string; children: ReactNode }) {
  return (
    <div className={`rounded-xl border p-3 space-y-2 ${PANEL_TINTS[tint] ?? ""}`}>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </Label>
      {children}
    </div>
  );
}
