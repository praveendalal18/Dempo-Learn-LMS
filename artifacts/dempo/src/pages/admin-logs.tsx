import { useState } from "react";
import {
  useListActivityLogs,
  getListActivityLogsQueryKey,
  type ListActivityLogsParams,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer, PageHeader } from "@/components/page";
import { Loader2, ChevronLeft, ChevronRight, X } from "lucide-react";

const PAGE_SIZE = 25;

const ACTION_GROUPS = [
  { value: "auth", label: "Auth" },
  { value: "user", label: "Users & roles" },
  { value: "course", label: "Courses" },
  { value: "assignment", label: "Assignments" },
  { value: "submission", label: "Submissions" },
  { value: "api", label: "API errors" },
];

function levelBadge(level: string) {
  switch (level) {
    case "error":
      return <Badge variant="danger">error</Badge>;
    case "warn":
      return <Badge variant="warning">warn</Badge>;
    default:
      return <Badge variant="info">info</Badge>;
  }
}

export default function AdminLogsPage() {
  const [userFilter, setUserFilter] = useState("");
  const [userInput, setUserInput] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const params: ListActivityLogsParams = {
    page,
    pageSize: PAGE_SIZE,
    ...(userFilter ? { user: userFilter } : {}),
    ...(level !== "all" ? { level: level as "info" | "warn" | "error" } : {}),
    ...(action !== "all" ? { action } : {}),
    ...(fromDate ? { from: new Date(fromDate).toISOString() } : {}),
    ...(toDate ? { to: new Date(toDate + "T23:59:59.999").toISOString() } : {}),
  };

  const { data, isLoading, isFetching } = useListActivityLogs(params, {
    query: { queryKey: getListActivityLogsQueryKey(params) },
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetToFirstPage = () => setPage(1);

  const hasFilters =
    !!userFilter || level !== "all" || action !== "all" || !!fromDate || !!toDate;

  return (
    <PageContainer width="wide" className="animate-in fade-in duration-300">
      <PageHeader
        title="Activity Logs"
        description="Recent activity across the app: sign-ups, role changes, course actions, and grading."
      />

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">User (id or email)</label>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  setUserFilter(userInput.trim());
                  resetToFirstPage();
                }}
              >
                <Input
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Search user…"
                  className="w-52"
                />
                <Button type="submit" variant="secondary" size="sm" className="h-9">
                  Apply
                </Button>
              </form>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Level</label>
              <Select value={level} onValueChange={(v) => { setLevel(v); resetToFirstPage(); }}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warn</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <Select value={action} onValueChange={(v) => { setAction(v); resetToFirstPage(); }}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {ACTION_GROUPS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); resetToFirstPage(); }}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); resetToFirstPage(); }}
                className="w-40"
              />
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-muted-foreground"
                onClick={() => {
                  setUserFilter("");
                  setUserInput("");
                  setLevel("all");
                  setAction("all");
                  setFromDate("");
                  setToDate("");
                  resetToFirstPage();
                }}
              >
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Events</CardTitle>
            <CardDescription>
              {isLoading ? "Loading…" : `${total} event${total === 1 ? "" : "s"}`}
              {isFetching && !isLoading ? " · refreshing…" : ""}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No activity found{hasFilters ? " for these filters" : ""}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Time</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Level</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((log) => (
                    <tr key={log.id} className="border-b last:border-b-0 hover:bg-muted/50 align-top">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {log.userEmail || log.userName ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{log.userName ?? "—"}</span>
                            <span className="text-xs text-muted-foreground">{log.userEmail}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">system</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{levelBadge(log.level)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{log.action}</code>
                      </td>
                      <td className="px-4 py-3 text-foreground/90">{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
