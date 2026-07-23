import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListUsers,
  getListUsersQueryKey,
  useAdminUpdateUser,
  useGetMe,
  getGetMeQueryKey,
  useListTeacherInvites,
  getListTeacherInvitesQueryKey,
  useCreateTeacherInvite,
  useRevokeTeacherInvite,
  useRemoveTeacherAccess,
  useListCoordinatorAssignments,
  getListCoordinatorAssignmentsQueryKey,
  useSetCoordinatorCourses,
  type User,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { PageContainer, PageHeader } from "@/components/page";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, GraduationCap, UserPlus, X, UserMinus, BookOpen, Trash2 } from "lucide-react";

const ROLES = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Professor" },
  { value: "dean", label: "Dean" },
  { value: "course_coordinator", label: "Course Coordinator" },
  { value: "unassigned", label: "Unassigned" },
] as const;

function roleBadge(role: string) {
  switch (role) {
    case "teacher":
      return <Badge variant="secondary">Professor</Badge>;
    case "dean":
      return <Badge variant="warning">Dean</Badge>;
    case "course_coordinator":
      return <Badge variant="info">Coordinator</Badge>;
    case "student":
      return <Badge variant="outline">Student</Badge>;
    default:
      return <Badge variant="outline">Unassigned</Badge>;
  }
}

function errorMessage(err: unknown, fallback: string): string {
  return err && typeof err === "object" && "error" in err
    ? String((err as { error: unknown }).error)
    : fallback;
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [assignTarget, setAssignTarget] = useState<User | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        let msg = res.statusText;
        try { const j = await res.json(); msg = j?.error || msg; } catch { /* ignore */ }
        throw new Error(msg);
      }
      toast({ title: "Account deleted", description: `${deleteTarget.name ?? deleteTarget.email} was removed.` });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: "Couldn't delete account", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: users, isLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() },
  });
  const { data: invites, isLoading: invitesLoading } = useListTeacherInvites({
    query: { queryKey: getListTeacherInvitesQueryKey() },
  });
  const { data: coordData } = useListCoordinatorAssignments({
    query: { queryKey: getListCoordinatorAssignmentsQueryKey() },
  });

  const assignedCountByCoordinator = new Map<string, number>();
  for (const a of coordData?.assignments ?? []) {
    assignedCountByCoordinator.set(
      a.coordinatorId,
      (assignedCountByCoordinator.get(a.coordinatorId) ?? 0) + 1,
    );
  }

  const setCoordinatorCourses = useSetCoordinatorCourses({
    mutation: {
      onSuccess: () => {
        setAssignTarget(null);
        void queryClient.invalidateQueries({
          queryKey: getListCoordinatorAssignmentsQueryKey(),
        });
        toast({ title: "Courses assigned", description: "Coordinator course assignments saved." });
      },
      onError: (err: unknown) => {
        toast({
          title: "Couldn't save assignments",
          description: errorMessage(err, "Couldn't save assignments"),
          variant: "destructive",
        });
      },
    },
  });

  const openAssignDialog = (u: User) => {
    setSelectedCourseIds(
      (coordData?.assignments ?? [])
        .filter((a) => a.coordinatorId === u.id)
        .map((a) => a.courseId),
    );
    setAssignTarget(u);
  };

  const updateUser = useAdminUpdateUser({
    mutation: {
      onSuccess: (updated: User) => {
        queryClient.setQueryData<User[]>(getListUsersQueryKey(), (prev) =>
          prev?.map((u) => (u.id === updated.id ? updated : u)),
        );
        toast({ title: "User updated", description: `${updated.email} saved.` });
      },
      onError: (err: unknown) => {
        toast({
          title: "Update failed",
          description: errorMessage(err, "Update failed"),
          variant: "destructive",
        });
        void queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
    },
  });

  const createInvite = useCreateTeacherInvite({
    mutation: {
      onSuccess: (invite) => {
        setInviteEmail("");
        void queryClient.invalidateQueries({ queryKey: getListTeacherInvitesQueryKey() });
        toast({
          title: "Teacher added",
          description: `${invite.email} will get teacher access when they sign in.`,
        });
      },
      onError: (err: unknown) => {
        toast({
          title: "Couldn't add teacher",
          description: errorMessage(err, "Couldn't add teacher"),
          variant: "destructive",
        });
      },
    },
  });

  const revokeInvite = useRevokeTeacherInvite({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListTeacherInvitesQueryKey() });
        toast({ title: "Invite revoked" });
      },
      onError: (err: unknown) => {
        toast({
          title: "Couldn't revoke invite",
          description: errorMessage(err, "Couldn't revoke invite"),
          variant: "destructive",
        });
        void queryClient.invalidateQueries({ queryKey: getListTeacherInvitesQueryKey() });
      },
    },
  });

  const removeTeacher = useRemoveTeacherAccess({
    mutation: {
      onSuccess: (result) => {
        setRemoveTarget(null);
        void queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({
          title: "Teacher access removed",
          description: `${result.user.email} is now a student. ${result.deactivatedCourses} course${result.deactivatedCourses === 1 ? "" : "s"} deactivated.`,
        });
      },
      onError: (err: unknown) => {
        setRemoveTarget(null);
        toast({
          title: "Couldn't remove teacher access",
          description: errorMessage(err, "Couldn't remove teacher access"),
          variant: "destructive",
        });
        void queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
    },
  });

  const submitInvite = () => {
    const email = inviteEmail.trim();
    if (!email) return;
    createInvite.mutate({ data: { email } });
  };

  const filtered = (users ?? []).filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <PageContainer width="wide" className="animate-in fade-in duration-300">
      <PageHeader
        title="Users"
        description="Manage every account: change roles or grant and revoke admin access."
      />

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Teachers</CardTitle>
          </div>
          <CardDescription>
            Add a teacher by email. They'll get teacher access automatically the
            first time they sign in — no role selection needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col sm:flex-row gap-2 mb-4"
            onSubmit={(e) => {
              e.preventDefault();
              submitInvite();
            }}
          >
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teacher@example.com"
              className="sm:max-w-sm"
              data-testid="input-teacher-invite-email"
            />
            <Button
              type="submit"
              disabled={createInvite.isPending || !inviteEmail.trim()}
              data-testid="button-add-teacher"
            >
              {createInvite.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Add teacher
            </Button>
          </form>

          {invitesLoading ? (
            <div className="text-sm text-muted-foreground">Loading pending teachers…</div>
          ) : (invites ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No pending teachers. Anyone you add will appear here until they sign in.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                Pending teachers
              </div>
              <ul className="divide-y rounded-md border">
                {(invites ?? []).map((invite) => (
                  <li
                    key={invite.id}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                    data-testid={`row-pending-teacher-${invite.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="shrink-0">Pending</Badge>
                      <span className="text-sm truncate">{invite.email}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                        added {new Date(invite.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                        {invite.createdByEmail ? ` by ${invite.createdByEmail}` : ""}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      disabled={revokeInvite.isPending}
                      onClick={() => revokeInvite.mutate({ id: invite.id })}
                      data-testid={`button-revoke-invite-${invite.id}`}
                    >
                      <X className="w-4 h-4 mr-1" /> Revoke
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">All accounts</CardTitle>
            <CardDescription>
              {isLoading
                ? "Loading…"
                : `${filtered.length} user${filtered.length === 1 ? "" : "s"}`}
            </CardDescription>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full md:w-64"
          />
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No users found{search ? " for this search" : ""}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Admin</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Joined</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const isSelf = u.id === me?.id;
                    const pendingThisUser =
                      updateUser.isPending && updateUser.variables?.id === u.id;
                    const isTeacher = u.role === "teacher";
                    return (
                      <tr key={u.id} className="border-b last:border-b-0 hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={u.avatarUrl ?? undefined} />
                              <AvatarFallback>
                                {(u.name ?? u.email).slice(0, 1).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium flex items-center gap-1.5">
                                {u.name ?? "—"}
                                {isSelf && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    you
                                  </Badge>
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Select
                              value={u.role}
                              disabled={pendingThisUser || (isTeacher && isSelf)}
                              onValueChange={(role) => {
                                if (isTeacher && role !== "teacher") {
                                  // Demoting a teacher goes through the guarded
                                  // remove-teacher flow with confirmation.
                                  setRemoveTarget(u);
                                  return;
                                }
                                updateUser.mutate({
                                  id: u.id,
                                  data: {
                                    role: role as
                                      | "student"
                                      | "teacher"
                                      | "dean"
                                      | "course_coordinator"
                                      | "unassigned",
                                  },
                                });
                              }}
                            >
                              <SelectTrigger className="w-36 h-8">
                                <SelectValue>{roleBadge(u.role)}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {pendingThisUser && (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={u.isAdmin ?? false}
                              disabled={isSelf || pendingThisUser}
                              onCheckedChange={(checked) =>
                                updateUser.mutate({ id: u.id, data: { isAdmin: checked } })
                              }
                            />
                            {u.isAdmin && <ShieldCheck className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {u.role === "course_coordinator" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAssignDialog(u)}
                              data-testid={`button-assign-courses-${u.id}`}
                            >
                              <BookOpen className="w-4 h-4 mr-1" />
                              Courses ({assignedCountByCoordinator.get(u.id) ?? 0})
                            </Button>
                          )}
                          {isTeacher && !isSelf && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => setRemoveTarget(u)}
                              data-testid={`button-remove-teacher-${u.id}`}
                            >
                              <UserMinus className="w-4 h-4 mr-1" /> Remove teacher
                            </Button>
                          )}
                          {!isSelf && !isTeacher && !u.isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget(u)}
                              title="Delete account"
                              data-testid={`button-delete-user-${u.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!assignTarget}
        onOpenChange={(open) => {
          if (!open) setAssignTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign courses</DialogTitle>
            <DialogDescription>
              Choose which courses{" "}
              <span className="font-medium text-foreground">
                {assignTarget?.name ?? assignTarget?.email}
              </span>{" "}
              oversees as coordinator. They can view these courses and manage
              their class schedules.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto space-y-1 -mx-1 px-1">
            {(coordData?.courses ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No active courses to assign.
              </div>
            ) : (
              (coordData?.courses ?? []).map((c) => {
                const checked = selectedCourseIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50 cursor-pointer"
                    data-testid={`row-assign-course-${c.id}`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) =>
                        setSelectedCourseIds((prev) =>
                          v ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                        )
                      }
                    />
                    <span className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{c.title}</span>
                      {c.teacherName && (
                        <span className="text-xs text-muted-foreground truncate">
                          Prof. {c.teacherName}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={setCoordinatorCourses.isPending}
              onClick={() => {
                if (assignTarget) {
                  setCoordinatorCourses.mutate({
                    id: assignTarget.id,
                    data: { courseIds: selectedCourseIds },
                  });
                }
              }}
              data-testid="button-save-coordinator-courses"
            >
              {setCoordinatorCourses.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this account?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  <span className="font-medium text-foreground">{deleteTarget.name ?? deleteTarget.email}</span>{" "}
                  will be permanently removed, along with their course enrolments, cohort memberships, and invite. They will not be able to sign in again unless re-invited. This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              data-testid="button-confirm-delete-user"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove teacher access?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget && (
                <>
                  <span className="font-medium text-foreground">
                    {removeTarget.name ?? removeTarget.email}
                  </span>{" "}
                  will become a student and lose all teaching tools.
                  {removeTarget.activeCourseCount ? (
                    <>
                      {" "}Their{" "}
                      <span className="font-medium text-foreground">
                        {removeTarget.activeCourseCount} active course
                        {removeTarget.activeCourseCount === 1 ? "" : "s"}
                      </span>{" "}
                      will be deactivated and hidden from enrolled students.
                    </>
                  ) : (
                    <> They have no active courses.</>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeTeacher.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeTeacher.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (removeTarget) removeTeacher.mutate({ id: removeTarget.id });
              }}
              data-testid="button-confirm-remove-teacher"
            >
              {removeTeacher.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Remove teacher access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
