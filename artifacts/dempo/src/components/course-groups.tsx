import { useState } from "react";
import {
  useListCourseGroups,
  getListCourseGroupsQueryKey,
  useCreateCourseGroup,
  useUpdateCourseGroup,
  useDeleteCourseGroup,
  useListCourseStudents,
  getListCourseStudentsQueryKey,
  getGroupRemovalImpact,
  type GroupRemovalImpact,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Loader2, Trash2, Pencil, Crown, AlertTriangle } from "lucide-react";

type GroupFormValues = {
  name: string;
  memberIds: string[];
  leaderId: string | null;
};

/** Pending confirmation state when removed members have open tasks / past submissions. */
type ImpactConfirm = {
  values: GroupFormValues;
  close: () => void;
  impact: GroupRemovalImpact;
};

function GroupFormDialog({
  courseId,
  groupId,
  trigger,
  title,
  initial,
  onSubmit,
  pending,
}: {
  courseId: number;
  groupId?: number;
  trigger: React.ReactNode;
  title: string;
  initial?: GroupFormValues;
  onSubmit: (values: GroupFormValues, close: () => void) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [memberIds, setMemberIds] = useState<string[]>(initial?.memberIds ?? []);
  const [leaderId, setLeaderId] = useState<string>(initial?.leaderId ?? "");
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactConfirm, setImpactConfirm] = useState<ImpactConfirm | null>(null);
  const { data: roster } = useListCourseStudents(courseId, {
    query: { enabled: open && !!courseId, queryKey: getListCourseStudentsQueryKey(courseId) },
  });
  const { toast } = useToast();

  const toggleMember = (id: string) => {
    setMemberIds((prev) => {
      const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
      if (!next.includes(leaderId)) setLeaderId("");
      return next;
    });
  };

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) {
      setName(initial?.name ?? "");
      setMemberIds(initial?.memberIds ?? []);
      setLeaderId(initial?.leaderId ?? "");
      setImpactConfirm(null);
    }
  };

  const doSubmit = (values: GroupFormValues, close: () => void) => {
    setImpactConfirm(null);
    onSubmit(values, close);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    if (memberIds.length === 0) {
      toast({ title: "Pick at least one member", variant: "destructive" });
      return;
    }

    const values: GroupFormValues = {
      name: name.trim(),
      memberIds,
      leaderId: leaderId || null,
    };
    const close = () => setOpen(false);

    // Only check removal impact when editing an existing group.
    if (groupId !== undefined && initial?.memberIds) {
      const removedIds = initial.memberIds.filter((id) => !memberIds.includes(id));
      if (removedIds.length > 0) {
        setImpactLoading(true);
        try {
          const impact = await getGroupRemovalImpact(groupId, removedIds);
          if (impact.openTasks.length > 0 || impact.submissionsCount > 0) {
            setImpactConfirm({ values, close, impact });
            return; // Wait for teacher to confirm
          }
        } catch {
          // If the check fails, let the submit proceed — the worst case is a silent delete.
        } finally {
          setImpactLoading(false);
        }
      }
    }

    doSubmit(values, close);
  };

  return (
    <>
      {/* Impact confirmation dialog — rendered outside the form Dialog so stacking works */}
      <AlertDialog
        open={!!impactConfirm}
        onOpenChange={(o) => { if (!o) setImpactConfirm(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Removing members has consequences
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-foreground">
                {impactConfirm && impactConfirm.impact.openTasks.length > 0 && (
                  <div>
                    <p className="font-medium text-destructive mb-1">
                      {impactConfirm.impact.openTasks.length} open{" "}
                      {impactConfirm.impact.openTasks.length === 1 ? "task" : "tasks"} will be deleted:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      {impactConfirm.impact.openTasks.map((t) => (
                        <li key={t.id} className="truncate">
                          <span className="font-medium text-foreground">
                            {t.assigneeName ?? t.assigneeId}
                          </span>
                          {" — "}
                          {t.description.length > 60
                            ? t.description.slice(0, 60) + "…"
                            : t.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {impactConfirm && impactConfirm.impact.submissionsCount > 0 && (
                  <div>
                    <p className="font-medium mb-1">
                      This group has{" "}
                      <span className="text-foreground font-semibold">
                        {impactConfirm.impact.submissionsCount} past{" "}
                        {impactConfirm.impact.submissionsCount === 1 ? "submission" : "submissions"}
                      </span>
                      . Removed members will no longer see future assignments from this group, but
                      existing grades and submitted work are preserved.
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (impactConfirm) doSubmit(impactConfirm.values, impactConfirm.close);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name *</Label>
              <Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Members *</Label>
              {roster && roster.length > 0 ? (
                <div className="max-h-56 overflow-y-auto space-y-2 border rounded-lg p-3">
                  {roster.map((s: any) => (
                    <div key={s.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`gm-${s.id}`}
                        checked={memberIds.includes(s.id)}
                        onCheckedChange={() => toggleMember(s.id)}
                      />
                      <Label htmlFor={`gm-${s.id}`} className="font-normal cursor-pointer flex-1 truncate">
                        {s.name || s.email}
                        {s.name && <span className="text-muted-foreground ml-2 text-xs">{s.email}</span>}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Group Leader (optional)</Label>
              <Select value={leaderId || "none"} onValueChange={(v) => setLeaderId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No leader" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No leader</SelectItem>
                  {(roster ?? [])
                    .filter((s: any) => memberIds.includes(s.id))
                    .map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name || s.email}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">The leader can split group assignments into tasks for members.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending || impactLoading || !name.trim() || memberIds.length === 0}>
                {(pending || impactLoading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Group
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CourseGroupsView({ courseId }: { courseId: number }) {
  const { data: groups, isLoading } = useListCourseGroups(courseId, {
    query: { enabled: !!courseId, queryKey: getListCourseGroupsQueryKey(courseId) },
  });
  const createGroup = useCreateCourseGroup();
  const updateGroup = useUpdateCourseGroup();
  const deleteGroup = useDeleteCourseGroup();
  const [groupToDelete, setGroupToDelete] = useState<{ id: number; name: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListCourseGroupsQueryKey(courseId) });

  const handleCreate = (values: GroupFormValues, close: () => void) => {
    createGroup.mutate(
      { courseId, data: { name: values.name, memberIds: values.memberIds, leaderId: values.leaderId } },
      {
        onSuccess: () => { toast({ title: "Group created" }); invalidate(); close(); },
        onError: (err: any) =>
          toast({ title: "Could not create group", description: err?.response?.data?.error || err?.message, variant: "destructive" }),
      },
    );
  };

  const handleUpdate = (groupId: number) => (values: GroupFormValues, close: () => void) => {
    updateGroup.mutate(
      { groupId, data: { name: values.name, memberIds: values.memberIds, leaderId: values.leaderId } },
      {
        onSuccess: () => { toast({ title: "Group updated" }); invalidate(); close(); },
        onError: (err: any) =>
          toast({ title: "Could not update group", description: err?.response?.data?.error || err?.message, variant: "destructive" }),
      },
    );
  };

  const confirmDelete = () => {
    if (!groupToDelete) return;
    deleteGroup.mutate(
      { groupId: groupToDelete.id },
      {
        onSuccess: () => { toast({ title: "Group deleted" }); invalidate(); setGroupToDelete(null); },
        onError: (err: any) => {
          toast({ title: "Could not delete group", description: err?.response?.data?.error || err?.message, variant: "destructive" });
          setGroupToDelete(null);
        },
      },
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mt-10" /></div>;
  }

  return (
    <>
      <AlertDialog open={!!groupToDelete} onOpenChange={(open) => { if (!open) setGroupToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group?</AlertDialogTitle>
            <AlertDialogDescription>
              {groupToDelete ? `"${groupToDelete.name}" will be removed. Assignments targeted at it will no longer reach its members, and its task lists will be deleted.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteGroup.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleteGroup.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteGroup.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-serif font-semibold">Student Groups ({groups?.length || 0})</h2>
        <GroupFormDialog
          courseId={courseId}
          title="Create Group"
          trigger={<Button><Plus className="w-4 h-4 mr-2" /> New Group</Button>}
          onSubmit={handleCreate}
          pending={createGroup.isPending}
        />
      </div>

      {groups && groups.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {groups.map((group) => (
            <Card key={group.id} className="shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">{group.name}</h3>
                    <span className="text-xs text-muted-foreground">({group.members.length})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <GroupFormDialog
                      courseId={courseId}
                      groupId={group.id}
                      title="Edit Group"
                      initial={{
                        name: group.name,
                        memberIds: group.members.map((m) => m.id),
                        leaderId: group.leaderId ?? null,
                      }}
                      trigger={
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      }
                      onSubmit={handleUpdate(group.id)}
                      pending={updateGroup.isPending}
                    />
                    <Button
                      variant="ghost" size="icon"
                      className="w-8 h-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setGroupToDelete({ id: group.id, name: group.name })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <ul className="space-y-2">
                  {group.members.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 text-sm">
                      <Avatar className="w-6 h-6 border">
                        <AvatarImage src={m.avatarUrl || ""} />
                        <AvatarFallback className="bg-primary/5 text-[10px]">{m.name?.charAt(0) || "S"}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{m.name || m.email}</span>
                      {m.isLeader && (
                        <span className="flex items-center gap-1 text-xs text-warning font-medium">
                          <Crown className="w-3 h-3" /> Leader
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <Users className="w-12 h-12 text-muted mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No groups yet</h3>
            <p className="max-w-sm">Create groups from enrolled students, then target group assignments at them.</p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
