import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ListChecks, Plus, Trash2 } from "lucide-react";

export type RubricCriterion = { name: string; description?: string; maxPoints: number };

export const rubricQueryKey = (assignmentId: number) => ["assignment-rubric", assignmentId];

export function RubricEditor({ assignmentId, maxScore }: { assignmentId: number; maxScore: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className="shrink-0" onClick={() => setOpen(true)}>
        <ListChecks className="w-4 h-4 mr-2" /> Rubric
      </Button>
      <RubricDialog assignmentId={assignmentId} maxScore={maxScore} open={open} onOpenChange={setOpen} />
    </>
  );
}

function RubricDialog({
  assignmentId, maxScore, open, onOpenChange,
}: {
  assignmentId: number;
  maxScore: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<RubricCriterion[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: rubricQueryKey(assignmentId),
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api" + `/assignments/${assignmentId}/rubric`);
      if (!res.ok) throw new Error("Failed to load rubric");
      return (await res.json()) as { criteria: RubricCriterion[]; maxScore: number };
    },
  });

  useEffect(() => {
    if (data) {
      setRows(
        (data.criteria ?? []).map((c) => ({
          name: c.name ?? "",
          description: c.description ?? "",
          maxPoints: Number(c.maxPoints) || 0,
        }))
      );
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (criteria: RubricCriterion[]) => {
      const res = await fetch("/api" + `/assignments/${assignmentId}/rubric`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria }),
      });
      if (!res.ok) throw new Error("Failed to save rubric");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rubric saved" });
      queryClient.invalidateQueries({ queryKey: rubricQueryKey(assignmentId) });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({ title: "Could not save rubric", description: err?.message, variant: "destructive" }),
  });

  const updateRow = (i: number, patch: Partial<RubricCriterion>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, { name: "", description: "", maxPoints: 0 }]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const total = rows.reduce((sum, r) => sum + (Number(r.maxPoints) || 0), 0);
  const matches = total === maxScore;

  const handleSave = () => {
    const cleaned = rows
      .filter((r) => r.name.trim())
      .map((r) => ({
        name: r.name.trim(),
        description: r.description?.trim() || undefined,
        maxPoints: Number(r.maxPoints) || 0,
      }));
    saveMutation.mutate(cleaned);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-semibold flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" /> Grading Rubric
          </DialogTitle>
          <DialogDescription>
            Break the grade into criteria. Marks entered per criterion will add up to the student's score.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {rows.length === 0 && (
              <div className="text-sm text-muted-foreground border border-dashed rounded-xl p-6 text-center">
                No criteria yet. Add a row to build the rubric.
              </div>
            )}
            {rows.map((row, i) => (
              <div key={i} className="border rounded-xl p-4 space-y-3 bg-muted/20">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                      Criterion
                    </Label>
                    <Input
                      placeholder="e.g. Clarity of argument"
                      value={row.name}
                      onChange={(e) => updateRow(i, { name: e.target.value })}
                    />
                  </div>
                  <div className="w-28 space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                      Max pts
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={row.maxPoints}
                      onChange={(e) => updateRow(i, { maxPoints: Number(e.target.value) })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(i)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Optional description of what earns full marks..."
                  className="text-sm min-h-[60px]"
                  value={row.description ?? ""}
                  onChange={(e) => updateRow(i, { description: e.target.value })}
                />
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="w-4 h-4 mr-2" /> Add criterion
            </Button>
          </div>
        )}

        <DialogFooter className="border-t pt-4 flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className={`text-sm ${matches ? "text-muted-foreground" : "text-warning"}`}>
            Criteria total {total} / maxScore {maxScore}
            {!matches && <span className="ml-1">— totals don't match the assignment max.</span>}
          </p>
          <Button type="button" onClick={handleSave} disabled={saveMutation.isPending} className="font-semibold">
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save rubric
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
