import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BellRing } from "lucide-react";

type AtRiskStudent = { studentId: string; name: string; reason?: string };

async function sendEarlyAlert(
  courseId: number,
  body: { studentId: string; reason: string; note?: string },
): Promise<{ ok: boolean; id: string }> {
  const res = await fetch(`/api/courses/${courseId}/early-alert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `Failed to send alert (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error) message = err.error;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }
  return res.json();
}

export function EarlyAlertDialog({
  courseId,
  student,
  open,
  onOpenChange,
  onSent,
}: {
  courseId: number;
  student: AtRiskStudent | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSent?: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  // Prefill from the at-risk reason each time the dialog opens for a student.
  useEffect(() => {
    if (!open) return;
    setReason(student?.reason ?? "");
    setNote("");
  }, [open, student]);

  const mutation = useMutation({
    mutationFn: () =>
      sendEarlyAlert(courseId, {
        studentId: student!.studentId,
        reason: reason.trim(),
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      toast({
        title: "Alert sent",
        description: `${student?.name ?? "The student"} and oversight have been notified.`,
      });
      onSent?.();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast({
        title: "Could not send alert",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    },
  });

  const canSend = !!student && reason.trim().length > 0 && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-warning" />
            Send early alert
          </DialogTitle>
          <DialogDescription>
            {student
              ? `Flag ${student.name} for follow-up. They and course oversight will be notified.`
              : "Flag a student for follow-up."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label htmlFor="early-alert-reason">Reason *</Label>
            <Input
              id="early-alert-reason"
              value={reason}
              maxLength={120}
              placeholder="e.g. Low attendance and missed submissions"
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="early-alert-note">Note to the student (optional)</Label>
            <Textarea
              id="early-alert-note"
              rows={4}
              value={note}
              placeholder="Add a supportive note or next steps for the student."
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => mutation.mutate()} disabled={!canSend}>
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BellRing className="mr-2 h-4 w-4" />
            )}
            Send alert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
