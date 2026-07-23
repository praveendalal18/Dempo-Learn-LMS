import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Star, Loader2 } from "lucide-react";

type FeedbackRow = {
  overallRating: number;
  contentRating: number | null;
  teachingRating: number | null;
  workloadRating: number | null;
  comment: string | null;
};

function StarRating({
  value,
  onChange,
  size = "md",
  labelledBy,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "md" | "sm";
  labelledBy?: string;
}) {
  const [hover, setHover] = useState(0);
  const iconClass = size === "sm" ? "h-5 w-5" : "h-7 w-7";
  const active = hover || value;

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-labelledby={labelledBy}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= active;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            className="rounded-sm p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star === value ? 0 : star)}
          >
            <Star
              className={`${iconClass} ${
                filled ? "text-warning" : "text-muted-foreground"
              }`}
              fill={filled ? "currentColor" : "none"}
              strokeWidth={1.75}
            />
          </button>
        );
      })}
    </div>
  );
}

export function CourseFeedbackDialog({
  courseId,
  open,
  onOpenChange,
}: {
  courseId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [overallRating, setOverallRating] = useState(0);
  const [contentRating, setContentRating] = useState(0);
  const [teachingRating, setTeachingRating] = useState(0);
  const [workloadRating, setWorkloadRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Prefill the form from any existing rating whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    // Reset to a clean slate before the fetch resolves.
    setOverallRating(0);
    setContentRating(0);
    setTeachingRating(0);
    setWorkloadRating(0);
    setComment("");
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/feedback/mine`);
        if (!res.ok) throw new Error(`Failed to load feedback (${res.status})`);
        const row: FeedbackRow | null = await res.json();
        if (cancelled || !row) return;
        setOverallRating(row.overallRating ?? 0);
        setContentRating(row.contentRating ?? 0);
        setTeachingRating(row.teachingRating ?? 0);
        setWorkloadRating(row.workloadRating ?? 0);
        setComment(row.comment ?? "");
      } catch (err: any) {
        if (!cancelled) {
          toast({
            title: "Could not load your rating",
            description: err?.message,
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, courseId, toast]);

  const handleSave = async () => {
    if (overallRating < 1) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/feedback`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallRating,
          contentRating: contentRating || undefined,
          teachingRating: teachingRating || undefined,
          workloadRating: workloadRating || undefined,
          comment: comment.trim() || undefined,
        }),
      });
      if (!res.ok) {
        let message = `Failed to save (${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) message = body.error;
        } catch {
          // ignore non-JSON error bodies
        }
        throw new Error(message);
      }
      toast({ title: "Thanks for your feedback" });
      queryClient.invalidateQueries({
        queryKey: ["course-feedback-mine", courseId],
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Could not save your rating",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const aspects: { key: string; label: string; value: number; set: (v: number) => void }[] = [
    { key: "content", label: "Content quality", value: contentRating, set: setContentRating },
    { key: "teaching", label: "Teaching", value: teachingRating, set: setTeachingRating },
    { key: "workload", label: "Workload", value: workloadRating, set: setWorkloadRating },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Rate this course</DialogTitle>
          <DialogDescription>
            Your rating is anonymous to your professor. The Dean and Course Coordinator can see who left it.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            <div className="space-y-2">
              <Label id="overall-rating-label">Overall rating *</Label>
              <StarRating
                value={overallRating}
                onChange={setOverallRating}
                labelledBy="overall-rating-label"
              />
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              {aspects.map((aspect) => (
                <div
                  key={aspect.key}
                  className="flex items-center justify-between gap-4"
                >
                  <Label
                    id={`${aspect.key}-rating-label`}
                    className="font-normal text-muted-foreground"
                  >
                    {aspect.label}
                  </Label>
                  <StarRating
                    value={aspect.value}
                    onChange={aspect.set}
                    size="sm"
                    labelledBy={`${aspect.key}-rating-label`}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-comment">Comment (optional)</Label>
              <Textarea
                id="feedback-comment"
                rows={4}
                placeholder="What worked well? What could be better?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || loading || overallRating < 1}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
