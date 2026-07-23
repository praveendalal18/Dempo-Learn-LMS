import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mail, Copy, Send, Trash2, Loader2, CheckCircle2, Clock, Check } from "lucide-react";

interface Cohort { id: number; name: string; teacherName: string | null }
interface Invite {
  id: number;
  email: string;
  name: string | null;
  role: string;
  cohortIds: number[] | null;
  acceptedAt: string | null;
  createdAt: string;
  inviteUrl: string;
}

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

export default function AdminInvitesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: cohorts } = useQuery({ queryKey: ["admin-cohorts"], queryFn: () => api<Cohort[]>("/admin/cohorts") });
  const { data: invites, isLoading } = useQuery({ queryKey: ["admin-invites"], queryFn: () => api<Invite[]>("/admin/invites") });

  const [emails, setEmails] = useState("");
  const [role, setRole] = useState("student");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const cohortName = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of cohorts ?? []) m.set(c.id, c.name);
    return m;
  }, [cohorts]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-invites"] });
  const toggleCohort = (id: number) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const copy = (url: string, notify = true) =>
    navigator.clipboard?.writeText(url).then(() => notify && toast({ title: "Invite link copied" })).catch(() => {});

  const send = useMutation({
    mutationFn: () =>
      api<{ created: number; updated: number; invalid: string[] }>("/admin/invites/bulk", {
        method: "POST",
        body: JSON.stringify({ emails, role, cohortIds: Array.from(selected) }),
      }),
    onSuccess: (r) => {
      const parts = [];
      if (r.created) parts.push(`${r.created} invited`);
      if (r.updated) parts.push(`${r.updated} updated`);
      if (r.invalid.length) parts.push(`${r.invalid.length} skipped`);
      toast({
        title: "Invites sent",
        description: (parts.join(" · ") || "Done") + (r.invalid.length ? ` — invalid: ${r.invalid.slice(0, 5).join(", ")}` : ""),
      });
      setEmails("");
      invalidate();
    },
    onError: (e: Error) => toast({ title: "Could not send invites", description: e.message, variant: "destructive" }),
  });

  const resend = useMutation({
    mutationFn: (id: number) => api(`/admin/invites/${id}/resend`, { method: "POST" }),
    onSuccess: () => toast({ title: "Invite re-sent (if email is configured)" }),
    onError: (e: Error) => toast({ title: "Could not resend", description: e.message, variant: "destructive" }),
  });
  const revoke = useMutation({
    mutationFn: (id: number) => api(`/admin/invites/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Invite revoked" }); invalidate(); },
    onError: (e: Error) => toast({ title: "Could not revoke", description: e.message, variant: "destructive" }),
  });

  const emailCount = emails.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean).length;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-serif font-bold text-foreground">Invitations</h1>
        <p className="text-muted-foreground mt-1">
          Access is invite-only. Add emails, pick a role and (optionally) cohorts — invitees are placed in those cohorts automatically when they join.
        </p>
      </div>

      {/* Invite form (handles one or many) */}
      <Card className="shadow-sm mb-8">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="emails">Emails</Label>
            <Textarea
              id="emails"
              rows={4}
              placeholder="Paste emails — one per line, or separated by commas/spaces&#10;maya@example.com&#10;jae@example.com"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{emailCount} email{emailCount === 1 ? "" : "s"} detected.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex-1">
              <Label>Add to cohorts (optional)</Label>
              {cohorts && cohorts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {cohorts.map((c) => {
                    const on = selected.has(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCohort(c.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-input"}`}
                        title={c.teacherName ? `${c.name} — ${c.teacherName}` : c.name}
                      >
                        {on && <Check className="w-3.5 h-3.5" />}
                        {c.name}
                        {c.teacherName && <span className={`text-xs ${on ? "text-primary-foreground/80" : "text-muted-foreground"}`}>· {c.teacherName}</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No cohorts yet — create one on the Cohorts page to assign invitees.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button disabled={emailCount === 0 || send.isPending} onClick={() => send.mutate()}>
              {send.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send {emailCount || ""} invite{emailCount === 1 ? "" : "s"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Invite emails send automatically once MSG91 is configured. Until then, copy each invite link from the list below to share.
          </p>
        </CardContent>
      </Card>

      <h2 className="text-lg font-serif font-semibold mb-3">Invited ({invites?.length ?? 0})</h2>
      <Card className="shadow-sm">
        <CardContent className="p-0 divide-y">
          {isLoading ? (
            <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
          ) : invites && invites.length > 0 ? (
            invites.map((inv) => (
              <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{inv.name || inv.email}</span>
                    <Badge variant="secondary" className="capitalize">{inv.role}</Badge>
                    {inv.acceptedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Joined</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3.5 h-3.5" /> Pending</span>
                    )}
                  </div>
                  {inv.name && <div className="text-sm text-muted-foreground truncate">{inv.email}</div>}
                  {inv.cohortIds && inv.cohortIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {inv.cohortIds.map((cid) => (
                        <span key={cid} className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {cohortName.get(cid) || `Cohort ${cid}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => copy(inv.inviteUrl)} title="Copy invite link"><Copy className="w-4 h-4" /></Button>
                  {!inv.acceptedAt && (
                    <Button variant="ghost" size="sm" onClick={() => resend.mutate(inv.id)} disabled={resend.isPending} title="Resend email"><Send className="w-4 h-4" /></Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => revoke.mutate(inv.id)} disabled={revoke.isPending} title="Revoke access"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <Mail className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">No invitations yet. Add emails above to give people access.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
