import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Trash2, Globe, Lock, X, StickyNote } from "lucide-react";
import { format } from "date-fns";

type Note = {
  id: number;
  authorId: string;
  authorName: string;
  title: string | null;
  body: string;
  tags: string[];
  shared: boolean;
  createdAt: string;
  updatedAt: string;
  mine: boolean;
};

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

const parseTags = (s: string) => s.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean);

export function CourseNotes({ courseId }: { courseId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const key = ["course-notes", courseId];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => api<{ mine: Note[]; shared: Note[] }>(`/courses/${courseId}/notes`),
    enabled: !!courseId,
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [shared, setShared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<Note | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const n of [...(data?.mine ?? []), ...(data?.shared ?? [])]) n.tags.forEach((t) => set.add(t));
    return [...set].sort();
  }, [data]);

  const matchesTag = (n: Note) => !tagFilter || n.tags.includes(tagFilter);
  const mine = (data?.mine ?? []).filter(matchesTag);
  const shared2 = (data?.shared ?? []).filter(matchesTag);

  const save = async () => {
    if (!body.trim()) { toast({ title: "Write something first", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await api(`/courses/${courseId}/notes`, {
        method: "POST",
        body: JSON.stringify({ title: title.trim() || null, body: body.trim(), tags: parseTags(tags), shared }),
      });
      toast({ title: shared ? "Note shared with class" : "Note saved" });
      setTitle(""); setBody(""); setTags(""); setShared(false);
      invalidate();
    } catch (e: any) {
      toast({ title: "Couldn't save note", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleShare = async (n: Note) => {
    try {
      await api(`/notes/${n.id}`, { method: "PATCH", body: JSON.stringify({ shared: !n.shared }) });
      invalidate();
    } catch (e: any) {
      toast({ title: "Couldn't update", description: e?.message, variant: "destructive" });
    }
  };

  const remove = async (n: Note) => {
    if (!window.confirm("Delete this note?")) return;
    try { await api(`/notes/${n.id}`, { method: "DELETE" }); invalidate(); }
    catch (e: any) { toast({ title: "Couldn't delete", description: e?.message, variant: "destructive" }); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await api(`/notes/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: editing.title?.trim() || null, body: editing.body.trim(), tags: editing.tags }),
      });
      setEditing(null); invalidate();
      toast({ title: "Note updated" });
    } catch (e: any) {
      toast({ title: "Couldn't update", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Composer */}
      <Card className="shadow-sm">
        <CardContent className="p-5 space-y-3">
          <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea rows={4} placeholder="Your study notes for this course…" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Input className="sm:max-w-xs" placeholder="Tags, comma-separated" value={tags} onChange={(e) => setTags(e.target.value)} />
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Switch checked={shared} onCheckedChange={setShared} />
              {shared ? <span className="flex items-center gap-1 text-foreground"><Globe className="w-3.5 h-3.5" /> Shared with class</span> : <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Private</span>}
            </label>
            <Button className="sm:ml-auto" onClick={save} disabled={saving || !body.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save note
            </Button>
          </div>
        </CardContent>
      </Card>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Tags:</span>
          <button type="button" onClick={() => setTagFilter(null)} className={`px-2 py-0.5 rounded-full text-xs border ${!tagFilter ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-input"}`}>All</button>
          {allTags.map((t) => (
            <button key={t} type="button" onClick={() => setTagFilter(t === tagFilter ? null : t)} className={`px-2 py-0.5 rounded-full text-xs border ${tagFilter === t ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-input"}`}>#{t}</button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">My notes ({mine.length})</h3>
            {mine.length === 0 ? (
              <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center">
                <StickyNote className="w-8 h-8 mb-2 opacity-30" />
                <p className="max-w-sm text-sm">Keep private study notes here, and share the helpful ones with your class.</p>
              </CardContent></Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {mine.map((n) => (
                  <Card key={n.id} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {n.title && <div className="font-medium truncate">{n.title}</div>}
                          <div className="text-[11px] text-muted-foreground">{format(new Date(n.updatedAt), "MMM d, yyyy")}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="w-7 h-7" title={n.shared ? "Shared — click to make private" : "Private — click to share with class"} onClick={() => toggleShare(n)}>
                            {n.shared ? <Globe className="w-4 h-4 text-success" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground" onClick={() => setEditing(n)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive" onClick={() => remove(n)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">{n.body}</p>
                      {n.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{n.tags.map((t) => <span key={t} className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">#{t}</span>)}</div>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {shared2.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Shared by classmates ({shared2.length})</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {shared2.map((n) => (
                  <Card key={n.id} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="w-6 h-6 border"><AvatarFallback className="text-[10px] bg-muted">{n.authorName.charAt(0)}</AvatarFallback></Avatar>
                        <span className="text-sm font-medium">{n.authorName}</span>
                        <span className="text-[11px] text-muted-foreground ml-auto">{format(new Date(n.updatedAt), "MMM d")}</span>
                      </div>
                      {n.title && <div className="font-medium">{n.title}</div>}
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{n.body}</p>
                      {n.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{n.tags.map((t) => <span key={t} className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">#{t}</span>)}</div>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Edit dialog (lightweight inline overlay) */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Edit note</h3>
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
              </div>
              <Input placeholder="Title (optional)" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              <Textarea rows={5} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
              <Input placeholder="Tags, comma-separated" value={editing.tags.join(", ")} onChange={(e) => setEditing({ ...editing, tags: parseTags(e.target.value) })} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={saveEdit} disabled={!editing.body.trim()}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
