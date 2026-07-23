import { useState } from "react";
import {
  useGetMe,
  useListCohorts,
  useCreateCohort,
  useUpdateCohort,
  useDeleteCohort,
  useListCohortMembers,
  useAddCohortMember,
  useRemoveCohortMember,
  useListMyStudents,
  getListCohortsQueryKey,
  getListCohortMembersQueryKey,
  getListMyStudentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { PageContainer, PageHeader } from "@/components/page";
import { Users, Plus, Loader2, Pencil, Trash2, ArrowLeft, Mail, UserPlus, X } from "lucide-react";

const COHORT_TYPES = [
  { value: "year", label: "Year" },
  { value: "course", label: "Course" },
  { value: "subject", label: "Subject" },
  { value: "elective", label: "Elective" },
  { value: "custom", label: "Custom" },
] as const;

type CohortType = (typeof COHORT_TYPES)[number]["value"];

function typeLabel(type: string) {
  return COHORT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export default function CohortsPage() {
  const { data: user } = useGetMe();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (user && user.role !== "teacher") {
    return (
      <div className="p-8 text-center text-muted-foreground mt-20">
        Cohorts are only available to professors.
      </div>
    );
  }

  return (
    <PageContainer width="wide" className="animate-in fade-in duration-300">
      {selectedId === null ? (
        <CohortList onOpen={setSelectedId} />
      ) : (
        <CohortDetail cohortId={selectedId} onBack={() => setSelectedId(null)} />
      )}
    </PageContainer>
  );
}

function CohortList({ onOpen }: { onOpen: (id: number) => void }) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const params = typeFilter === "all" ? undefined : { type: typeFilter as CohortType };
  const { data: cohorts, isLoading } = useListCohorts(params, {
    query: { queryKey: getListCohortsQueryKey(params) },
  });

  return (
    <>
      <PageHeader
        title="Cohorts"
        description="Group your students by year, course, subject, or anything else — then invite a whole cohort to a course at once."
        actions={
          <CohortFormDialog
            trigger={<Button><Plus className="w-4 h-4 mr-2" /> New Cohort</Button>}
          />
        }
      />

      <div className="flex items-center gap-3 mb-6">
        <Label className="text-sm text-muted-foreground">Filter by type</Label>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {COHORT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-card rounded-xl border animate-pulse"></div>)}
        </div>
      ) : cohorts && cohorts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cohorts.map((cohort) => (
            <Card
              key={cohort.id}
              className="flex flex-col hover:border-foreground/20 transition-all hover:shadow-sm cursor-pointer"
              onClick={() => onOpen(cohort.id)}
            >
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary" className="capitalize">{typeLabel(cohort.type)}</Badge>
                </div>
                <CardTitle className="text-xl line-clamp-1">
                  {cohort.name}
                </CardTitle>
                <CardDescription className="line-clamp-2 mt-2 min-h-[40px]">
                  {cohort.description || "No description."}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{cohort.memberCount} member{cohort.memberCount === 1 ? "" : "s"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-card border border-dashed rounded-xl">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-medium mb-2">
            {typeFilter === "all" ? "No cohorts yet" : "No cohorts of this type"}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Create a cohort to group students you teach — for example "Year 10" or "Physics Electives".
          </p>
          <CohortFormDialog
            trigger={<Button><Plus className="w-4 h-4 mr-2" /> New Cohort</Button>}
          />
        </div>
      )}
    </>
  );
}

function CohortFormDialog({
  trigger,
  cohort,
}: {
  trigger: React.ReactNode;
  cohort?: { id: number; name: string; description?: string | null; type: string };
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(cohort?.name ?? "");
  const [description, setDescription] = useState(cohort?.description ?? "");
  const [type, setType] = useState<string>(cohort?.type ?? "custom");
  const createCohort = useCreateCohort();
  const updateCohort = useUpdateCohort();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!cohort;
  const pending = createCohort.isPending || updateCohort.isPending;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/cohorts"] });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const data = { name: name.trim(), description: description.trim() || null, type: type as CohortType };
    const opts = {
      onSuccess: () => {
        toast({ title: isEdit ? "Cohort updated" : "Cohort created" });
        invalidate();
        setOpen(false);
        if (!isEdit) { setName(""); setDescription(""); setType("custom"); }
      },
      onError: (err: any) => {
        toast({ title: "Something went wrong", description: err?.message, variant: "destructive" });
      },
    };
    if (isEdit) updateCohort.mutate({ cohortId: cohort!.id, data }, opts);
    else createCohort.mutate({ data }, opts);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit cohort" : "Create a cohort"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="cohort-name">Name</Label>
            <Input id="cohort-name" placeholder="e.g. Year 10" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COHORT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cohort-desc">Description (optional)</Label>
            <Textarea id="cohort-desc" rows={3} placeholder="What groups these students together?" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || pending}>
              {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Cohort"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CohortDetail({ cohortId, onBack }: { cohortId: number; onBack: () => void }) {
  const { data: cohorts } = useListCohorts(undefined, {
    query: { queryKey: getListCohortsQueryKey(undefined) },
  });
  const cohort = cohorts?.find((c) => c.id === cohortId);
  const { data: members, isLoading } = useListCohortMembers(cohortId, {
    query: { queryKey: getListCohortMembersQueryKey(cohortId) },
  });
  const { data: myStudents } = useListMyStudents({
    query: { queryKey: getListMyStudentsQueryKey() },
  });
  const addMember = useAddCohortMember();
  const removeMember = useRemoveCohortMember();
  const deleteCohort = useDeleteCohort();
  const [email, setEmail] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListCohortMembersQueryKey(cohortId) });
    queryClient.invalidateQueries({ queryKey: ["/api/cohorts"] });
  };

  const memberIds = new Set((members ?? []).map((m) => m.id));
  const pickable = (myStudents ?? []).filter((s) => !memberIds.has(s.id));

  const handleAddById = (studentId: string) => {
    addMember.mutate({ cohortId, data: { studentId } }, {
      onSuccess: (student) => {
        toast({ title: "Student added", description: `${student.name || student.email} is now in this cohort.` });
        invalidate();
      },
      onError: (err: any) => {
        toast({ title: "Could not add student", description: err?.response?.data?.error || err?.message, variant: "destructive" });
      },
    });
  };

  const handleAddByEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    addMember.mutate({ cohortId, data: { email: trimmed } }, {
      onSuccess: (student) => {
        toast({ title: "Student added", description: `${student.name || student.email} is now in this cohort.` });
        setEmail("");
        invalidate();
      },
      onError: (err: any) => {
        const status = err?.response?.status ?? err?.status;
        toast({
          title: "Could not add student",
          description: status === 404
            ? "No registered student has that email. They need to sign up as a student first."
            : (err?.response?.data?.error || err?.message),
          variant: "destructive",
        });
      },
    });
  };

  const handleRemove = (studentId: string, label: string) => {
    removeMember.mutate({ cohortId, studentId }, {
      onSuccess: () => {
        toast({ title: "Removed from cohort", description: `${label} was removed.` });
        invalidate();
      },
      onError: (err: any) => {
        toast({ title: "Could not remove", description: err?.message, variant: "destructive" });
      },
    });
  };

  const handleDelete = () => {
    deleteCohort.mutate({ cohortId }, {
      onSuccess: () => {
        toast({ title: "Cohort deleted" });
        queryClient.invalidateQueries({ queryKey: ["/api/cohorts"] });
        onBack();
      },
      onError: (err: any) => {
        toast({ title: "Could not delete cohort", description: err?.message, variant: "destructive" });
        setConfirmDelete(false);
      },
    });
  };

  return (
    <>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this cohort?</AlertDialogTitle>
            <AlertDialogDescription>
              "{cohort?.name ?? "This cohort"}" and its member list will be deleted. Students themselves are not affected and stay enrolled in their courses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCohort.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleteCohort.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCohort.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Cohort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> All Cohorts
        </Button>
        <PageHeader
          className="mb-0"
          title={
            <span className="flex items-center gap-3">
              {cohort?.name ?? "Cohort"}
              {cohort && <Badge variant="secondary" className="capitalize">{typeLabel(cohort.type)}</Badge>}
            </span>
          }
          description={cohort?.description || undefined}
          actions={
            <>
              {cohort && (
                <CohortFormDialog
                  cohort={cohort}
                  trigger={<Button variant="outline" size="sm"><Pencil className="w-4 h-4 mr-2" /> Edit</Button>}
                />
              )}
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            </>
          }
        />
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">
            Members ({members?.length ?? 0})
          </h2>
          <Card className="shadow-sm">
            <CardContent className="p-0 divide-y">
              {isLoading ? (
                <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
              ) : members && members.length > 0 ? (
                members.map((student) => (
                  <div key={student.id} className="flex items-center gap-3 p-4">
                    <Avatar className="w-9 h-9 border">
                      {student.avatarUrl && <AvatarImage src={student.avatarUrl} />}
                      <AvatarFallback className="bg-muted">
                        {(student.name || student.email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{student.name || student.email}</div>
                      <div className="text-sm text-muted-foreground truncate">{student.email}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleRemove(student.id, student.name || student.email)}
                      disabled={removeMember.isPending}
                      title="Remove from cohort"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-muted-foreground">No members yet. Add students from the panel on the right.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Add Students</h2>
            <Card className="shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label>From your courses</Label>
                  {pickable.length > 0 ? (
                    <ul className="space-y-1 max-h-64 overflow-y-auto pr-1">
                      {pickable.map((student) => (
                        <li key={student.id}>
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted transition-colors disabled:opacity-50"
                            onClick={() => handleAddById(student.id)}
                            disabled={addMember.isPending}
                          >
                            <UserPlus className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{student.name || student.email}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {(myStudents?.length ?? 0) === 0
                        ? "No students are enrolled in your courses yet."
                        : "All your enrolled students are already in this cohort."}
                    </p>
                  )}
                </div>

                <form onSubmit={handleAddByEmail} className="space-y-2 pt-4 border-t">
                  <Label htmlFor="member-email">Or add by email</Label>
                  <Input
                    id="member-email"
                    type="email"
                    placeholder="student@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Must be a registered student account.</p>
                  <Button type="submit" className="w-full" disabled={addMember.isPending || !email.trim()}>
                    {addMember.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                    Add to Cohort
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
