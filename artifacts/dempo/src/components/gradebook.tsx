import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Download,
  Settings2,
  Plus,
  Trash2,
  BookOpen,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ItemType = "assignment" | "quiz";

type ConfigCategory = { id: number; name: string; weight: number; position: number };

type ConfigItem = {
  itemType: ItemType;
  itemId: number;
  title: string;
  maxScore: number;
  categoryId: number | null;
};

type GradebookConfig = {
  categories: ConfigCategory[];
  items: ConfigItem[];
};

type GridCategory = { id: number; name: string; weight: number };

type GridStudent = {
  id: number;
  name: string;
  email: string;
  categories: { [categoryId: number]: number | null };
  finalPct: number | null;
};

type GradebookGrid = {
  categories: GridCategory[];
  students: GridStudent[];
  configured: boolean;
};

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch("/api" + path, { credentials: "same-origin" });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

function pct(n: number | null | undefined): string {
  return n == null ? "—" : `${Math.round(n)}%`;
}

// Calm text-token banding for the final column.
function finalTone(n: number | null): string {
  if (n == null) return "text-muted-foreground";
  if (n >= 75) return "text-success";
  if (n >= 50) return "text-warning";
  return "text-danger";
}

// ---------------------------------------------------------------------------
// Setup panel (teacher only)
// ---------------------------------------------------------------------------

type DraftCategory = { name: string; weight: string };
type DraftAssignment = { key: string; catIndex: number | null };

function SetupPanel({
  courseId,
  config,
  onClose,
}: {
  courseId: number;
  config: GradebookConfig;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<DraftCategory[]>(
    config.categories.length
      ? config.categories.map((c) => ({ name: c.name, weight: String(c.weight) }))
      : [{ name: "", weight: "" }],
  );

  // Map original category id -> its index in the current draft (by id ordering).
  const catIdToInitialIndex = useMemo(() => {
    const m = new Map<number, number>();
    config.categories.forEach((c, i) => m.set(c.id, i));
    return m;
  }, [config.categories]);

  const [assignments, setAssignments] = useState<DraftAssignment[]>(
    config.items.map((it) => ({
      key: `${it.itemType}:${it.itemId}`,
      catIndex:
        it.categoryId != null && catIdToInitialIndex.has(it.categoryId)
          ? (catIdToInitialIndex.get(it.categoryId) as number)
          : null,
    })),
  );

  const totalWeight = categories.reduce((sum, c) => {
    const w = parseFloat(c.weight);
    return sum + (isNaN(w) ? 0 : w);
  }, 0);

  function updateCategory(index: number, patch: Partial<DraftCategory>) {
    setCategories((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function addCategory() {
    setCategories((prev) => [...prev, { name: "", weight: "" }]);
  }

  function removeCategory(index: number) {
    setCategories((prev) => prev.filter((_, i) => i !== index));
    // Any item pointing at this index becomes unassigned; higher indices shift down.
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.catIndex == null) return a;
        if (a.catIndex === index) return { ...a, catIndex: null };
        if (a.catIndex > index) return { ...a, catIndex: a.catIndex - 1 };
        return a;
      }),
    );
  }

  function setAssignmentCategory(key: string, catIndex: number | null) {
    setAssignments((prev) =>
      prev.map((a) => (a.key === key ? { ...a, catIndex } : a)),
    );
  }

  async function save() {
    const cleanCategories = categories
      .map((c) => ({ name: c.name.trim(), weight: parseFloat(c.weight) }))
      .filter((c) => c.name.length > 0 && !isNaN(c.weight) && c.weight > 0);

    if (cleanCategories.length === 0) {
      toast({
        title: "Add at least one category",
        description: "Each category needs a name and a positive weight.",
        variant: "destructive",
      });
      return;
    }

    // Remap draft indices -> indices within cleanCategories (some may be dropped).
    const keptIndices: number[] = [];
    categories.forEach((c, i) => {
      const name = c.name.trim();
      const w = parseFloat(c.weight);
      if (name.length > 0 && !isNaN(w) && w > 0) keptIndices.push(i);
    });
    const oldToNew = new Map<number, number>();
    keptIndices.forEach((oldIdx, newIdx) => oldToNew.set(oldIdx, newIdx));

    const bodyItems = config.items.map((it) => {
      const key = `${it.itemType}:${it.itemId}`;
      const draft = assignments.find((a) => a.key === key);
      const catIndex =
        draft?.catIndex != null && oldToNew.has(draft.catIndex)
          ? (oldToNew.get(draft.catIndex) as number)
          : null;
      return { itemType: it.itemType, itemId: it.itemId, categoryIndex: catIndex };
    });

    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/gradebook/config`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: cleanCategories, items: bodyItems }),
      });
      if (!res.ok) {
        let msg = `Save failed (${res.status})`;
        try {
          const b = await res.json();
          if (b?.message) msg = b.message;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      await queryClient.invalidateQueries({
        queryKey: ["gradebook", "config", courseId],
      });
      await queryClient.invalidateQueries({ queryKey: ["gradebook", "grid", courseId] });
      toast({ title: "Gradebook saved" });
      onClose();
    } catch (err: any) {
      toast({
        title: "Could not save gradebook",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  const itemsByKey = new Map(config.items.map((it) => [`${it.itemType}:${it.itemId}`, it]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Configure weights</CardTitle>
        <CardDescription>
          Group assignments and quizzes into weighted categories. Weights are relative
          and normalized automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Categories */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Categories</h3>
            <Badge variant="info">Total weight · {totalWeight || 0}</Badge>
          </div>
          <div className="space-y-2">
            {categories.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={c.name}
                  placeholder="Category name (e.g. Quizzes)"
                  onChange={(e) => updateCategory(i, { name: e.target.value })}
                  className="flex-1"
                />
                <Input
                  value={c.weight}
                  placeholder="Weight"
                  inputMode="decimal"
                  onChange={(e) => updateCategory(i, { weight: e.target.value })}
                  className="w-24"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove category"
                  onClick={() => removeCategory(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={addCategory}>
            <Plus className="mr-1 h-4 w-4" /> Add category
          </Button>
          <p className="text-xs text-muted-foreground">
            Weights are relative — {"{"}30, 30, 40{"}"} behaves the same as {"{"}3, 3, 4{"}"}.
          </p>
        </div>

        {/* Item assignment */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Assign items to categories</h3>
          {config.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No assignments or quizzes exist in this course yet.
            </p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => {
                const item = itemsByKey.get(a.key);
                if (!item) return null;
                return (
                  <div
                    key={a.key}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-foreground">{item.title}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {item.itemType} · max {item.maxScore}
                      </div>
                    </div>
                    <Select
                      value={a.catIndex == null ? "none" : String(a.catIndex)}
                      onValueChange={(v) =>
                        setAssignmentCategory(a.key, v === "none" ? null : Number(v))
                      }
                    >
                      <SelectTrigger className="w-48 shrink-0">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {categories.map((c, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {c.name.trim() || `Category ${i + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          Save gradebook
        </Button>
      </CardFooter>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function GradebookView({
  courseId,
  canEdit,
}: {
  courseId: number;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const [showSetup, setShowSetup] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const configQuery = useQuery({
    queryKey: ["gradebook", "config", courseId],
    queryFn: () => apiGet<GradebookConfig>(`/courses/${courseId}/gradebook/config`),
    enabled: !!courseId && canEdit,
  });

  const gridQuery = useQuery({
    queryKey: ["gradebook", "grid", courseId],
    queryFn: () => apiGet<GradebookGrid>(`/courses/${courseId}/gradebook`),
    enabled: !!courseId,
  });

  // Close setup automatically once teacher navigates away is handled by save().
  useEffect(() => {
    if (!canEdit) setShowSetup(false);
  }, [canEdit]);

  async function downloadCsv() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/gradebook/export.csv`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gradebook-course-${courseId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({
        title: "Could not download transcript",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  }

  // Setup panel takes over when open.
  if (showSetup && canEdit) {
    if (configQuery.isLoading) {
      return (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading configuration…
        </div>
      );
    }
    if (configQuery.isError || !configQuery.data) {
      return (
        <Card>
          <CardContent className="py-10 text-center text-sm text-danger">
            {(configQuery.error as Error)?.message ?? "Could not load configuration."}
          </CardContent>
        </Card>
      );
    }
    return (
      <SetupPanel
        courseId={courseId}
        config={configQuery.data}
        onClose={() => setShowSetup(false)}
      />
    );
  }

  // Grid loading / error states.
  if (gridQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading gradebook…
      </div>
    );
  }

  if (gridQuery.isError || !gridQuery.data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-danger">
          {(gridQuery.error as Error)?.message ?? "Could not load the gradebook."}
        </CardContent>
      </Card>
    );
  }

  const grid = gridQuery.data;

  // Empty / unconfigured state.
  if (!grid.configured) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="rounded-full border border-border p-3 text-muted-foreground">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-foreground">Gradebook not set up yet</h3>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              {canEdit
                ? "Group assignments and quizzes into weighted categories to compute each student's final grade."
                : "Your instructor hasn't set up weighted categories for this course yet. Check back soon."}
            </p>
          </div>
          {canEdit && (
            <Button onClick={() => setShowSetup(true)}>
              <Settings2 className="mr-1 h-4 w-4" /> Configure weights
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const hasStudents = grid.students.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-medium text-foreground">Gradebook</h2>
          <p className="text-xs text-muted-foreground">
            Category averages and weighted final grade per student.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setShowSetup(true)}>
              <Settings2 className="mr-1 h-4 w-4" /> Configure weights
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={downloadCsv} disabled={downloading}>
            {downloading ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1 h-4 w-4" />
            )}
            Download transcript (CSV)
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[12rem]">Student</TableHead>
                  {grid.categories.map((c) => (
                    <TableHead key={c.id} className="text-right whitespace-nowrap">
                      {c.name} · {Math.round(c.weight)}%
                    </TableHead>
                  ))}
                  <TableHead className="text-right whitespace-nowrap">Final %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!hasStudents ? (
                  <TableRow>
                    <TableCell
                      colSpan={grid.categories.length + 2}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No enrolled students yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  grid.students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="text-sm text-foreground">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.email}</div>
                      </TableCell>
                      {grid.categories.map((c) => (
                        <TableCell
                          key={c.id}
                          className="text-right tabular-nums text-muted-foreground"
                        >
                          {pct(s.categories[c.id] ?? null)}
                        </TableCell>
                      ))}
                      <TableCell
                        className={`text-right font-semibold tabular-nums ${finalTone(
                          s.finalPct,
                        )}`}
                      >
                        {pct(s.finalPct)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default GradebookView;
