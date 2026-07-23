import { useEffect, useMemo, useRef, useState } from "react";
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
  hours: { hourNumber: number; links: string[]; attachments: PlanFile[] }[];
};

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
  const itemsByHour = new Map<number, any>(items.map((i: any) => [i.hourNumber, i]));
  const dayDates = extras?.dayDates ?? {};
  const extrasByHour = new Map<number, HourExtra>(
    (extras?.hours ?? []).map((h) => [h.hourNumber, { links: h.links, attachments: h.attachments }]),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Clock className="w-4 h-4 shrink-0" />
        <span>{totalHours} hours across {totalDays} day{totalDays > 1 ? 's' : ''} ({hoursPerDay} hours/day). Dated days also appear on your Calendar. Locked days show topics only.</span>
      </div>
      {Array.from({ length: totalDays }, (_, d) => d + 1).map(day => {
        const dayHours = Array.from({ length: hoursPerDay }, (_, h) => (day - 1) * hoursPerDay + h + 1).filter(h => h <= totalHours);
        const dayLocked = dayHours.some(h => itemsByHour.get(h)?.locked);
        const date = dayDates[String(day)];
        return (
          <Card key={day} className={`shadow-sm overflow-hidden ${dayLocked ? 'opacity-90' : ''}`}>
            <div className={`px-6 py-3 border-b flex items-center justify-between gap-3 flex-wrap ${dayLocked ? 'bg-muted/40' : 'bg-primary/5'}`}>
              <div className="flex items-baseline gap-3 flex-wrap">
                <h3 className="font-serif font-semibold text-lg">Day {day}</h3>
                {date && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    <CalendarClock className="w-4 h-4" /> {formatDayDate(date)}
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
                    <div className="shrink-0 w-16 text-xs font-bold uppercase tracking-wider text-muted-foreground pt-1">Hour {hour}</div>
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
  const [totalHours, setTotalHours] = useState<number>(plan.totalHours || 0);
  const [lockedDays, setLockedDays] = useState<number[]>(plan.lockedDays || []);
  const [drafts, setDrafts] = useState<Map<number, PlanItemDraft>>(new Map());
  const [dayDates, setDayDates] = useState<Record<string, string>>({});
  // Per-hour links kept as a single textarea string (one URL per line) for editing.
  const [hourLinks, setHourLinks] = useState<Map<number, string>>(new Map());
  const [hourFiles, setHourFiles] = useState<Map<number, PlanFile[]>>(new Map());
  const [uploadingHour, setUploadingHour] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Cadence helper inputs
  const [startDate, setStartDate] = useState("");
  const [cadence, setCadence] = useState<"daily" | "weekdays" | "weekly">("weekdays");

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

  const toggleDayLock = (day: number) => {
    setLockedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    setDirty(true);
  };

  const applyCadence = () => {
    if (!startDate || totalDays === 0) return;
    const base = parseYmd(startDate);
    const out: Record<string, string> = {};
    if (cadence === "weekdays") {
      const cur = new Date(base);
      for (let day = 1; day <= totalDays; day++) {
        while (cur.getDay() === 0 || cur.getDay() === 6) cur.setDate(cur.getDate() + 1);
        out[String(day)] = toYmd(cur);
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      const step = cadence === "weekly" ? 7 : 1;
      for (let day = 1; day <= totalDays; day++) {
        const d = new Date(base);
        d.setDate(base.getDate() + (day - 1) * step);
        out[String(day)] = toYmd(d);
      }
    }
    setDayDates(out);
    setDirty(true);
    toast({ title: "Dates filled", description: "Review the days below, then Save Plan." });
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

      // Only keep dates for days that still exist.
      const dates: Record<string, string> = {};
      for (const [k, v] of Object.entries(dayDates)) {
        if (Number(k) <= totalDays) dates[k] = v;
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
        body: JSON.stringify({ dayDates: dates, hours }),
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
                {HOUR_OPTIONS.map(h => <option key={h} value={h}>{h} hours ({h / hoursPerDay} days)</option>)}
              </select>
              <p className="text-xs text-muted-foreground">{hoursPerDay} teaching hours per day.</p>
            </div>
            <div className="flex-1 min-w-[200px] text-sm text-muted-foreground pb-1">
              {totalHours > 0 ? `${filledHours}/${totalHours} hours planned. Give each day a date so it lands on students' calendars. Lock a day to show topics only.` : 'Choose a duration to start planning.'}
            </div>
            <Button onClick={handleSave} disabled={pending || !dirty} className="ml-auto">
              {pending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Plan
            </Button>
          </div>

          {totalHours > 0 && (
            <div className="flex flex-wrap items-end gap-4 border-t pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="start-date" className="text-xs flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> Schedule from</Label>
                <Input id="start-date" type="date" className="w-44" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cadence</Label>
                <Select value={cadence} onValueChange={(v) => setCadence(v as any)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Every day</SelectItem>
                    <SelectItem value="weekdays">Weekdays only</SelectItem>
                    <SelectItem value="weekly">Once a week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" onClick={applyCadence} disabled={!startDate}>
                Auto-fill dates
              </Button>
              <p className="text-xs text-muted-foreground pb-2 flex-1 min-w-[180px]">
                Fills every day's date from your start date. You can still adjust any single day below to reschedule it.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {totalHours > 0 && Array.from({ length: totalDays }, (_, d) => d + 1).map(day => {
        const locked = lockedDays.includes(day);
        const dayHours = Array.from({ length: hoursPerDay }, (_, h) => (day - 1) * hoursPerDay + h + 1).filter(h => h <= totalHours);
        return (
          <Card key={day} className="shadow-sm overflow-hidden">
            <div className={`px-6 py-3 border-b flex items-center justify-between gap-3 flex-wrap ${locked ? 'bg-muted/40' : 'bg-primary/5'}`}>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-serif font-semibold text-lg">Day {day}</h3>
                <div className="flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    className="h-8 w-40 text-sm"
                    value={dayDates[String(day)] || ""}
                    onChange={e => setDayDate(day, e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {locked ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Unlock className="w-4 h-4 text-primary" />}
                <Label htmlFor={`lock-${day}`} className="text-sm font-normal cursor-pointer">
                  {locked ? 'Locked — topics only' : 'Open — full details'}
                </Label>
                <Switch id={`lock-${day}`} checked={locked} onCheckedChange={() => toggleDayLock(day)} />
              </div>
            </div>
            <CardContent className="p-0 divide-y">
              {dayHours.map(hour => {
                const draft = drafts.get(hour);
                const files = hourFiles.get(hour) || [];
                return (
                  <div key={hour} className="px-6 py-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground w-16 shrink-0">Hour {hour}</span>
                      <Input
                        placeholder="Topic for this hour (leave empty to skip)"
                        value={draft?.title || ""}
                        onChange={e => setField(hour, 'title', e.target.value)}
                      />
                    </div>
                    {(draft?.title || "").trim() && (
                      <div className="pl-0 md:pl-[76px] grid gap-3">
                        <Textarea rows={2} placeholder="What will be covered (visible to students)..." value={draft?.description || ""} onChange={e => setField(hour, 'description', e.target.value)} />
                        <div className="grid md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs flex items-center gap-1"><BookOpen className="w-3 h-3" /> Pre-work</Label>
                            <Textarea rows={2} placeholder="Read/prepare before class..." value={draft?.preWork || ""} onChange={e => setField(hour, 'preWork', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs flex items-center gap-1"><Briefcase className="w-3 h-3" /> Case study</Label>
                            <Textarea rows={2} placeholder="Case to discuss in class..." value={draft?.caseStudy || ""} onChange={e => setField(hour, 'caseStudy', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs flex items-center gap-1"><ClipboardList className="w-3 h-3" /> Post-work</Label>
                            <Textarea rows={2} placeholder="Follow-up after class..." value={draft?.postWork || ""} onChange={e => setField(hour, 'postWork', e.target.value)} />
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Links (one per line)</Label>
                            <Textarea
                              rows={2}
                              placeholder="https://..."
                              value={hourLinks.get(hour) || ""}
                              onChange={e => setLinks(hour, e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs flex items-center gap-1"><Paperclip className="w-3 h-3" /> Attachments</Label>
                            {files.length > 0 && (
                              <ul className="space-y-1 mb-1">
                                {files.map((file, i) => (
                                  <li key={i} className="flex items-center justify-between gap-2 text-sm border rounded-lg px-2.5 py-1.5 bg-muted/20">
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
                            <label className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-muted/50 transition-colors w-fit">
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
