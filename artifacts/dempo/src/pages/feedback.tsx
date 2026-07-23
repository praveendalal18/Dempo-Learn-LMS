import {
  useListFeedback,
  getListFeedbackQueryKey,
  useMarkFeedbackRead,
  useGetMe,
  getGetMeQueryKey,
  type FeedbackNote,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/page";
import { Loader2, CheckCheck } from "lucide-react";
import { format } from "date-fns";

function NoteCard({
  note,
  direction,
  onMarkRead,
  marking,
}: {
  note: FeedbackNote;
  direction: "received" | "sent";
  onMarkRead?: (id: number) => void;
  marking?: boolean;
}) {
  const unread = direction === "received" && !note.readAt;
  return (
    <li className={`px-4 py-3 ${unread ? "bg-muted/50" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">
              {direction === "received"
                ? note.senderName ?? "Dean"
                : `To: ${note.recipientName ?? note.recipientId}`}
            </span>
            {unread && <Badge variant="info">New</Badge>}
            <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
              {format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}
            </span>
          </div>
          {note.subject && <span className="text-sm font-medium mt-1">{note.subject}</span>}
          <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{note.body}</p>
          {unread && onMarkRead && (
            <div className="mt-2">
              <Button size="sm" variant="ghost" disabled={marking} onClick={() => onMarkRead(note.id)}>
                <CheckCheck className="w-3.5 h-3.5 mr-1.5" /> Mark as read
              </Button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export default function FeedbackPage() {
  const queryClient = useQueryClient();
  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data, isLoading } = useListFeedback({
    query: { queryKey: getListFeedbackQueryKey() },
  });
  const markRead = useMarkFeedbackRead({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListFeedbackQueryKey() });
      },
    },
  });

  const isDean = me?.role === "dean";

  return (
    <PageContainer width="narrow" className="animate-in fade-in duration-300 space-y-6">
      <PageHeader
        title="Feedback"
        description={
          isDean
            ? "Feedback notes you have sent to professors and course coordinators."
            : "Private feedback notes from the dean."
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Inbox</CardTitle>
          <CardDescription>
            {isLoading ? "Loading…" : `${data?.received.length ?? 0} note${(data?.received.length ?? 0) === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !data?.received.length ? (
            <div className="text-center py-12 text-muted-foreground">No feedback received yet.</div>
          ) : (
            <ul className="divide-y">
              {data.received.map((n) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  direction="received"
                  marking={markRead.isPending}
                  onMarkRead={(id) => markRead.mutate({ feedbackId: id })}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {isDean && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sent</CardTitle>
            <CardDescription>
              {isLoading ? "Loading…" : `${data?.sent.length ?? 0} note${(data?.sent.length ?? 0) === 1 ? "" : "s"}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!data?.sent.length ? (
              <div className="text-center py-12 text-muted-foreground">No feedback sent yet.</div>
            ) : (
              <ul className="divide-y">
                {data.sent.map((n) => (
                  <NoteCard key={n.id} note={n} direction="sent" />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
