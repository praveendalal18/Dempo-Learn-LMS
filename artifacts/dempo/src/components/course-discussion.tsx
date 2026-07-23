import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useGetMe } from "@workspace/api-client-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  MessagesSquare,
  Loader2,
  Send,
  ArrowLeft,
  Plus,
  CheckCircle2,
  Circle,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";

interface ThreadRow {
  id: number;
  title: string;
  authorId: number;
  authorName: string;
  resolved: boolean;
  pinned: boolean;
  lastActivityAt: string;
  createdAt: string;
  replyCount: number;
}

interface ThreadPost {
  id: number;
  body: string;
  isAnswer: boolean;
  authorId: number;
  authorName: string;
  createdAt: string;
}

interface ThreadDetail {
  thread: {
    id: number;
    title: string;
    body: string;
    authorId: number;
    authorName: string;
    resolved: boolean;
    pinned: boolean;
    createdAt: string;
    canModerate: boolean;
  };
  posts: ThreadPost[];
}

function initials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function relativeDate(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch("/api" + path, {
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (!res.ok) {
    let msg = "Request failed";
    try {
      const data = await res.json();
      msg = data?.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  // DELETE / no-content responses may have empty body.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function CourseDiscussion({
  courseId,
  isTeacher,
}: {
  courseId: number;
  isTeacher: boolean;
}) {
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);

  if (selectedThreadId != null) {
    return (
      <ThreadDetailView
        courseId={courseId}
        threadId={selectedThreadId}
        isTeacher={isTeacher}
        onBack={() => setSelectedThreadId(null)}
      />
    );
  }

  return (
    <ThreadListView
      courseId={courseId}
      isTeacher={isTeacher}
      onOpen={setSelectedThreadId}
    />
  );
}

/* ---------------------------------------------------------------- List view */

function ThreadListView({
  courseId,
  isTeacher,
  onOpen,
}: {
  courseId: number;
  isTeacher: boolean;
  onOpen: (id: number) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [askOpen, setAskOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: threads, isLoading } = useQuery<ThreadRow[]>({
    queryKey: ["discussions", courseId],
    queryFn: () =>
      jsonFetch<ThreadRow[]>(`/courses/${courseId}/discussions`),
    enabled: !!courseId,
  });

  const createThread = useMutation({
    mutationFn: () =>
      jsonFetch<ThreadRow>(`/courses/${courseId}/discussions`, {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      }),
    onSuccess: (thread) => {
      toast({ title: "Discussion posted" });
      setTitle("");
      setBody("");
      setAskOpen(false);
      queryClient.invalidateQueries({ queryKey: ["discussions", courseId] });
      if (thread?.id) onOpen(thread.id);
    },
    onError: (err: any) => {
      toast({
        title: "Could not post",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const list = threads ?? [];
  const canSubmit = title.trim().length > 0 && body.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessagesSquare className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-serif font-semibold">Discussion</h2>
        </div>
        <Button onClick={() => setAskOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Ask a question
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-card rounded-xl border animate-pulse"
            />
          ))}
        </div>
      ) : list.length > 0 ? (
        <div className="space-y-3">
          {list.map((t) => (
            <Card
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpen(t.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen(t.id);
                }
              }}
              className="cursor-pointer transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {t.pinned && (
                        <Badge variant="info" className="gap-1">
                          <Pin className="w-3 h-3" />
                          Pinned
                        </Badge>
                      )}
                      {t.resolved && (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Resolved
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium text-sm text-foreground truncate">
                      {t.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{t.authorName}</span>
                      <span aria-hidden>·</span>
                      <span>{relativeDate(t.lastActivityAt)}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                    {t.replyCount} {t.replyCount === 1 ? "reply" : "replies"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center flex flex-col items-center">
            <MessagesSquare className="w-10 h-10 text-muted mb-4" />
            <p className="text-muted-foreground max-w-sm">
              No discussions yet — start one.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={askOpen} onOpenChange={setAskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a discussion</DialogTitle>
            <DialogDescription>
              Ask a question or begin a discussion with the class.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              aria-label="Discussion title"
            />
            <Textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add more detail..."
              className="resize-none"
              aria-label="Discussion body"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAskOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createThread.mutate()}
              disabled={!canSubmit || createThread.isPending}
            >
              {createThread.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------------------------------------------------- Detail view */

function ThreadDetailView({
  courseId,
  threadId,
  isTeacher,
  onBack,
}: {
  courseId: number;
  threadId: number;
  isTeacher: boolean;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const myId = me?.id;
  const [reply, setReply] = useState("");

  const detailKey = ["discussion", courseId, threadId];
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: detailKey });
    queryClient.invalidateQueries({ queryKey: ["discussions", courseId] });
  };

  const { data, isLoading } = useQuery<ThreadDetail>({
    queryKey: detailKey,
    queryFn: () =>
      jsonFetch<ThreadDetail>(
        `/courses/${courseId}/discussions/${threadId}`,
      ),
    enabled: !!courseId && !!threadId,
  });

  const postReply = useMutation({
    mutationFn: () =>
      jsonFetch(`/courses/${courseId}/discussions/${threadId}/posts`, {
        method: "POST",
        body: JSON.stringify({ body: reply.trim() }),
      }),
    onSuccess: () => {
      toast({ title: "Reply posted" });
      setReply("");
      invalidateAll();
    },
    onError: (err: any) =>
      toast({
        title: "Could not reply",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      }),
  });

  const patchThread = useMutation({
    mutationFn: (patch: { resolved?: boolean; pinned?: boolean }) =>
      jsonFetch(`/courses/${courseId}/discussions/${threadId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => invalidateAll(),
    onError: (err: any) =>
      toast({
        title: "Could not update",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      }),
  });

  const toggleAnswer = useMutation({
    mutationFn: (vars: { postId: number; isAnswer: boolean }) =>
      jsonFetch(
        `/courses/${courseId}/discussions/${threadId}/posts/${vars.postId}/answer`,
        {
          method: "POST",
          body: JSON.stringify({ isAnswer: vars.isAnswer }),
        },
      ),
    onSuccess: (_r, vars) => {
      toast({ title: vars.isAnswer ? "Marked as answer" : "Answer unmarked" });
      invalidateAll();
    },
    onError: (err: any) =>
      toast({
        title: "Could not update answer",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      }),
  });

  const deleteThread = useMutation({
    mutationFn: () =>
      jsonFetch(`/courses/${courseId}/discussions/${threadId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast({ title: "Discussion deleted" });
      queryClient.invalidateQueries({ queryKey: ["discussions", courseId] });
      onBack();
    },
    onError: (err: any) =>
      toast({
        title: "Could not delete",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      }),
  });

  const deletePost = useMutation({
    mutationFn: (postId: number) =>
      jsonFetch(
        `/courses/${courseId}/discussions/${threadId}/posts/${postId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      toast({ title: "Reply deleted" });
      invalidateAll();
    },
    onError: (err: any) =>
      toast({
        title: "Could not delete",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      }),
  });

  const backButton = (
    <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
      <ArrowLeft className="w-4 h-4 mr-2" />
      Back to discussions
    </Button>
  );

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        {backButton}
        <div className="h-40 bg-card rounded-xl border animate-pulse" />
      </div>
    );
  }

  const { thread, posts } = data;
  const canManageAnswers = thread.canModerate || isTeacher;
  const canDeleteThread =
    isTeacher || (myId != null && String(myId) === String(thread.authorId));

  return (
    <div className="space-y-6">
      {backButton}

      {/* Thread header */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {thread.pinned && (
                  <Badge variant="info" className="gap-1">
                    <Pin className="w-3 h-3" />
                    Pinned
                  </Badge>
                )}
                {thread.resolved && (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Resolved
                  </Badge>
                )}
              </div>
              <h2 className="text-xl font-serif font-semibold leading-snug">
                {thread.title}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span>{thread.authorName}</span>
                <span aria-hidden>·</span>
                <span>{format(new Date(thread.createdAt), "MMM d, yyyy")}</span>
              </div>
            </div>
            {canDeleteThread && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-muted-foreground hover:text-danger"
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete this discussion and all its replies?",
                    )
                  ) {
                    deleteThread.mutate();
                  }
                }}
                disabled={deleteThread.isPending}
              >
                <Trash2 className="w-4 h-4" />
                <span className="sr-only">Delete discussion</span>
              </Button>
            )}
          </div>

          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {thread.body}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {thread.canModerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  patchThread.mutate({ resolved: !thread.resolved })
                }
                disabled={patchThread.isPending}
              >
                {thread.resolved ? (
                  <Circle className="w-4 h-4 mr-2" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {thread.resolved ? "Reopen" : "Mark resolved"}
              </Button>
            )}
            {isTeacher && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => patchThread.mutate({ pinned: !thread.pinned })}
                disabled={patchThread.isPending}
              >
                {thread.pinned ? (
                  <PinOff className="w-4 h-4 mr-2" />
                ) : (
                  <Pin className="w-4 h-4 mr-2" />
                )}
                {thread.pinned ? "Unpin" : "Pin"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Replies */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground px-1">
          {posts.length} {posts.length === 1 ? "reply" : "replies"}
        </p>
        {posts.map((p) => {
          const canDeletePost =
            isTeacher || (myId != null && String(myId) === String(p.authorId));
          return (
            <Card
              key={p.id}
              className={p.isAnswer ? "ring-1 ring-success/40" : undefined}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-xs">
                      {initials(p.authorName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-2">
                      <span className="font-medium text-sm">
                        {p.authorName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(p.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                      {p.isAnswer && (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Answer
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {p.body}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {canManageAnswers && (
                        <button
                          type="button"
                          className="text-xs font-medium text-muted-foreground hover:text-success transition-colors disabled:opacity-50"
                          onClick={() =>
                            toggleAnswer.mutate({
                              postId: p.id,
                              isAnswer: !p.isAnswer,
                            })
                          }
                          disabled={toggleAnswer.isPending}
                        >
                          {p.isAnswer ? "Unmark answer" : "Mark as answer"}
                        </button>
                      )}
                      {canDeletePost && (
                        <button
                          type="button"
                          className="text-xs font-medium text-muted-foreground hover:text-danger transition-colors disabled:opacity-50"
                          onClick={() => {
                            if (window.confirm("Delete this reply?")) {
                              deletePost.mutate(p.id);
                            }
                          }}
                          disabled={deletePost.isPending}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reply box */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <Textarea
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply..."
            className="resize-none"
            aria-label="Reply"
          />
          <div className="flex justify-end">
            <Button
              onClick={() => postReply.mutate()}
              disabled={!reply.trim() || postReply.isPending}
            >
              {postReply.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Reply
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
