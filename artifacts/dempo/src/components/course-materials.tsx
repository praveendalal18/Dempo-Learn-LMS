import { useState, useRef } from "react";
import {
  useListCourseMaterials,
  useCreateCourseMaterial,
  useUpdateCourseMaterial,
  useDeleteCourseMaterial,
  useRequestUploadUrl,
  getListCourseMaterialsQueryKey,
} from "@workspace/api-client-react";
import type { CourseMaterial, MaterialFile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, Plus, Loader2, Link as LinkIcon, Paperclip, X,
  Download, Pencil, Trash2, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

function formatSize(size?: number | null): string | null {
  if (!size && size !== 0) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function CourseMaterialsView({ courseId, isTeacher }: { courseId: number; isTeacher: boolean }) {
  const { data: materials, isLoading } = useListCourseMaterials(courseId, {
    query: { enabled: !!courseId, queryKey: getListCourseMaterialsQueryKey(courseId) },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => <div key={i} className="h-32 bg-card rounded-xl border animate-pulse"></div>)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-serif font-semibold">Course Materials</h2>
        {isTeacher && <MaterialDialog courseId={courseId} />}
      </div>

      {materials && materials.length > 0 ? (
        <div className="space-y-4">
          {materials.map((material) => (
            <MaterialCard key={material.id} material={material} courseId={courseId} isTeacher={isTeacher} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <BookOpen className="w-12 h-12 text-muted mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No materials yet</h3>
            <p className="max-w-sm">
              {isTeacher
                ? "Share notes, links, and files with your students."
                : "Your professor hasn't shared any materials yet."}
            </p>
            {isTeacher && <div className="mt-6"><MaterialDialog courseId={courseId} /></div>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MaterialCard({ material, courseId, isTeacher }: { material: CourseMaterial; courseId: number; isTeacher: boolean }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMaterial = useDeleteCourseMaterial();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = () => {
    deleteMaterial.mutate({ materialId: material.id }, {
      onSuccess: () => {
        toast({ title: "Material deleted" });
        queryClient.invalidateQueries({ queryKey: getListCourseMaterialsQueryKey(courseId) });
        setConfirmDelete(false);
      },
      onError: (err: any) => {
        toast({ title: "Could not delete", description: err?.message || "Something went wrong.", variant: "destructive" });
        setConfirmDelete(false);
      },
    });
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-serif font-bold mb-1">{material.title}</h3>
            <div className="text-xs text-muted-foreground mb-3">
              Posted {format(new Date(material.createdAt), "MMM d, yyyy")}
              {material.updatedAt !== material.createdAt && " · edited"}
            </div>
            {material.body && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">{material.body}</p>
            )}

            {material.links.length > 0 && (
              <div className="space-y-1.5 mb-4">
                {material.links.map((link, i) => (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-2 text-sm text-primary hover:underline w-fit max-w-full"
                  >
                    <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{link}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                  </a>
                ))}
              </div>
            )}

            {material.attachments.length > 0 && (
              <div className="grid gap-2 max-w-lg">
                {material.attachments.map((file, i) => (
                  <a
                    key={i}
                    href={import.meta.env.BASE_URL + "api/storage" + file.path}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 border rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <Paperclip className="w-5 h-5 text-primary shrink-0" />
                    <span className="font-medium text-sm truncate flex-1">{file.name}</span>
                    {formatSize(file.size) && (
                      <span className="text-xs text-muted-foreground shrink-0">{formatSize(file.size)}</span>
                    )}
                    <Download className="w-4 h-4 text-muted-foreground shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {isTeacher && (
            <div className="flex gap-1 shrink-0">
              <MaterialDialog courseId={courseId} existing={material} />
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this material?</AlertDialogTitle>
            <AlertDialogDescription>
              "{material.title}" will be removed for all students. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMaterial.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleteMaterial.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMaterial.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function MaterialDialog({ courseId, existing }: { courseId: number; existing?: CourseMaterial }) {
  const isEdit = !!existing;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [links, setLinks] = useState<string[]>(existing?.links ?? []);
  const [linkInput, setLinkInput] = useState("");
  const [attachments, setAttachments] = useState<MaterialFile[]>(existing?.attachments ?? []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMaterial = useCreateCourseMaterial();
  const updateMaterial = useUpdateCourseMaterial();
  const requestUrl = useRequestUploadUrl();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const resetForm = () => {
    setTitle(existing?.title ?? "");
    setBody(existing?.body ?? "");
    setLinks(existing?.links ?? []);
    setLinkInput("");
    setAttachments(existing?.attachments ?? []);
  };

  const handleAddLink = () => {
    const trimmed = linkInput.trim();
    if (!trimmed) return;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      new URL(withProtocol);
    } catch {
      toast({ title: "Invalid link", description: "Please enter a valid URL.", variant: "destructive" });
      return;
    }
    setLinks((prev) => [...prev, withProtocol]);
    setLinkInput("");
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: MaterialFile[] = [];
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
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Validation Error", description: "A title is required.", variant: "destructive" });
      return;
    }
    if (uploading) {
      toast({ title: "Please wait", description: "Attachments are still uploading.", variant: "destructive" });
      return;
    }

    const data = { title: title.trim(), body: body.trim() || undefined, links, attachments };
    const onSuccess = () => {
      toast({ title: isEdit ? "Material updated" : "Material posted" });
      queryClient.invalidateQueries({ queryKey: getListCourseMaterialsQueryKey(courseId) });
      setOpen(false);
      if (!isEdit) {
        setTitle(""); setBody(""); setLinks([]); setLinkInput(""); setAttachments([]);
      }
    };
    const onError = (err: any) => {
      toast({ title: "Something went wrong", description: err?.message || "Please try again.", variant: "destructive" });
    };

    if (isEdit) {
      updateMaterial.mutate({ materialId: existing!.id, data }, { onSuccess, onError });
    } else {
      createMaterial.mutate({ courseId, data }, { onSuccess, onError });
    }
  };

  const pending = createMaterial.isPending || updateMaterial.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) resetForm(); }}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-primary">
            <Pencil className="w-4 h-4" />
          </Button>
        ) : (
          <Button><Plus className="w-4 h-4 mr-2" /> Share Material</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{isEdit ? "Edit Material" : "Share Material"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="mat-title">Title *</Label>
            <Input id="mat-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mat-body">Message / Notes</Label>
            <Textarea id="mat-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Optional description or note for students..." />
          </div>

          <div className="space-y-2">
            <Label>Links</Label>
            {links.length > 0 && (
              <ul className="space-y-2">
                {links.map((link, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm border rounded-lg px-3 py-2 bg-muted/20">
                    <span className="flex items-center gap-2 min-w-0 flex-1">
                      <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{link}</span>
                    </span>
                    <Button type="button" variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}>
                      <X className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Input
                className="min-w-0 flex-1"
                placeholder="https://..."
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddLink(); } }}
              />
              <Button type="button" variant="outline" className="shrink-0" onClick={handleAddLink} disabled={!linkInput.trim()}>Add</Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Attachments</Label>
            {attachments.length > 0 && (
              <ul className="space-y-2">
                {attachments.map((file, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm border rounded-lg px-3 py-2 bg-muted/20">
                    <span className="flex items-center gap-2 min-w-0 flex-1">
                      <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{file.name}</span>
                      {formatSize(file.size) && <span className="text-xs text-muted-foreground shrink-0">({formatSize(file.size)})</span>}
                    </span>
                    <Button type="button" variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}>
                      <X className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Paperclip className="w-4 h-4 mr-2" />}
                {uploading ? "Uploading..." : "Attach Files"}
              </Button>
              <span className="text-xs text-muted-foreground">Any file type. Students can download these.</span>
            </div>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || !title.trim()}>
              {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Save Changes" : "Post Material"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
