import { useState } from "react";
import {
  useListGroupTasks,
  getListGroupTasksQueryKey,
  useCreateGroupTask,
  useUpdateGroupTask,
  useDeleteGroupTask,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Users, Crown, Loader2, Plus, Trash2, ListChecks, Pencil, Check, X } from "lucide-react";

export type GroupInfo = {
  id: number;
  name: string;
  leaderId?: string | null;
  members: { id: string; name?: string | null; email?: string | null; avatarUrl?: string | null; isLeader: boolean }[];
};

export function GroupRosterCard({ group, title = "Group" }: { group: GroupInfo; title?: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">{title}: {group.name}</h3>
        </div>
        <ul className="space-y-2">
          {group.members.map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-sm">
              <Avatar className="w-6 h-6 border">
                <AvatarImage src={m.avatarUrl || ""} />
                <AvatarFallback className="bg-primary/5 text-[10px]">{m.name?.charAt(0) || "S"}</AvatarFallback>
              </Avatar>
              <span className="truncate">{m.name || m.email || m.id}</span>
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
  );
}

/**
 * Task breakdown for a group on a group assignment.
 * - Leader: create / delete tasks, assign members, toggle any task.
 * - Members: toggle their own tasks.
 * - Teacher (readOnly): sees who was responsible for what.
 */
export function GroupTasksPanel({
  assignmentId,
  group,
  viewerId,
  readOnly = false,
}: {
  assignmentId: number;
  group: GroupInfo;
  viewerId?: string;
  readOnly?: boolean;
}) {
  const isLeader = !readOnly && !!viewerId && group.leaderId === viewerId;
  const { data: tasks, isLoading } = useListGroupTasks(assignmentId, group.id, {
    query: { queryKey: getListGroupTasksQueryKey(assignmentId, group.id) },
  });
  const createTask = useCreateGroupTask();
  const updateTask = useUpdateGroupTask();
  const deleteTask = useDeleteGroupTask();
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  // Per-task edit state for the leader
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAssigneeId, setEditAssigneeId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListGroupTasksQueryKey(assignmentId, group.id) });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !assigneeId) return;
    createTask.mutate(
      { assignmentId, groupId: group.id, data: { description: description.trim(), assigneeId } },
      {
        onSuccess: () => { setDescription(""); setAssigneeId(""); invalidate(); },
        onError: (err: any) =>
          toast({ title: "Could not add task", description: err?.response?.data?.error || err?.message, variant: "destructive" }),
      },
    );
  };

  const handleToggle = (taskId: number, done: boolean) => {
    updateTask.mutate(
      { taskId, data: { done } },
      {
        onSuccess: invalidate,
        onError: (err: any) =>
          toast({ title: "Could not update task", description: err?.response?.data?.error || err?.message, variant: "destructive" }),
      },
    );
  };

  const handleDelete = (taskId: number) => {
    deleteTask.mutate(
      { taskId },
      {
        onSuccess: invalidate,
        onError: (err: any) =>
          toast({ title: "Could not delete task", description: err?.response?.data?.error || err?.message, variant: "destructive" }),
      },
    );
  };

  const startEdit = (task: { id: number; description: string; assigneeId: string }) => {
    setEditingTaskId(task.id);
    setEditDescription(task.description);
    setEditAssigneeId(task.assigneeId);
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditDescription("");
    setEditAssigneeId("");
  };

  const handleSaveEdit = (taskId: number) => {
    if (!editDescription.trim() || !editAssigneeId) return;
    updateTask.mutate(
      { taskId, data: { description: editDescription.trim(), assigneeId: editAssigneeId } },
      {
        onSuccess: () => { cancelEdit(); invalidate(); },
        onError: (err: any) =>
          toast({ title: "Could not update task", description: err?.response?.data?.error || err?.message, variant: "destructive" }),
      },
    );
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Task Breakdown</h3>
          {readOnly && <span className="text-xs text-muted-foreground">(who was responsible for what)</span>}
        </div>

        {isLoading ? (
          <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>
        ) : tasks && tasks.length > 0 ? (
          <ul className="space-y-2 mb-3">
            {tasks.map((task) => {
              const canToggle = !readOnly && (isLeader || task.assigneeId === viewerId);
              const isEditing = editingTaskId === task.id;
              if (isLeader && isEditing) {
                return (
                  <li key={task.id} className="flex flex-col gap-2 text-sm border rounded-lg px-3 py-2 bg-muted/20">
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Task description..."
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Select value={editAssigneeId} onValueChange={setEditAssigneeId}>
                        <SelectTrigger className="flex-1 h-8 text-sm">
                          <SelectValue placeholder="Assign to" />
                        </SelectTrigger>
                        <SelectContent>
                          {group.members.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.name || m.email || m.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button" size="icon" variant="ghost"
                        className="w-8 h-8 text-success hover:text-success/80 shrink-0"
                        onClick={() => handleSaveEdit(task.id)}
                        disabled={updateTask.isPending || !editDescription.trim() || !editAssigneeId}
                      >
                        {updateTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </Button>
                      <Button
                        type="button" size="icon" variant="ghost"
                        className="w-8 h-8 text-muted-foreground hover:text-foreground shrink-0"
                        onClick={cancelEdit}
                        disabled={updateTask.isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </li>
                );
              }
              return (
                <li key={task.id} className="flex items-center gap-3 text-sm border rounded-lg px-3 py-2 bg-muted/20">
                  <Checkbox
                    checked={task.done}
                    disabled={!canToggle || updateTask.isPending}
                    onCheckedChange={(v) => handleToggle(task.id, !!v)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className={task.done ? "line-through text-muted-foreground" : ""}>{task.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {task.assigneeName || task.assigneeId} · {task.done ? "Done" : "Not done"}
                    </div>
                  </div>
                  {isLeader && (
                    <div className="flex shrink-0">
                      <Button
                        type="button" variant="ghost" size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-foreground"
                        onClick={() => startEdit(task)}
                        disabled={deleteTask.isPending || editingTaskId !== null}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button" variant="ghost" size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(task.id)}
                        disabled={deleteTask.isPending || editingTaskId !== null}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground mb-3">
            {readOnly
              ? "The group didn't break this assignment into tasks."
              : isLeader
                ? "Split the work into tasks and assign them to members."
                : "No tasks yet. The group leader can split the work into tasks."}
          </p>
        )}

        {isLeader && (
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2 border-t pt-3">
            <Input
              placeholder="Task description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex-1"
            />
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="Assign to" />
              </SelectTrigger>
              <SelectContent>
                {group.members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name || m.email || m.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={createTask.isPending || !description.trim() || !assigneeId}>
              {createTask.isPending ? <Loader2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
