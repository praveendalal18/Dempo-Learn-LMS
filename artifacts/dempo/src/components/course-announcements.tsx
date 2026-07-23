import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Loader2, Send } from "lucide-react";
import { format } from "date-fns";

interface Announcement {
  id: number;
  body: string;
  createdAt: string;
  senderId: number;
  senderName: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CourseAnnouncements({
  courseId,
  isTeacher,
}: {
  courseId: number;
  isTeacher: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [body, setBody] = useState("");

  const { data: announcements, isLoading } = useQuery<Announcement[]>({
    queryKey: ["announcements", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/announcements`);
      if (!res.ok) throw new Error("Failed to load announcements");
      return res.json();
    },
    enabled: !!courseId,
  });

  const postAnnouncement = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/courses/${courseId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) throw new Error("Failed to post announcement");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Announcement posted" });
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["announcements", courseId] });
    },
    onError: (err: any) => {
      toast({
        title: "Could not post",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const handlePost = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    postAnnouncement.mutate(trimmed);
  };

  const list = announcements ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Megaphone className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-xl font-serif font-semibold">Announcements</h2>
      </div>

      {isTeacher && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <Textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share an update with the class..."
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button
                onClick={handlePost}
                disabled={!body.trim() || postAnnouncement.isPending}
              >
                {postAnnouncement.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Post announcement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 bg-card rounded-xl border animate-pulse" />
          ))}
        </div>
      ) : list.length > 0 ? (
        <div className="space-y-4">
          {list.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-xs">
                      {initials(a.senderName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-2">
                      <span className="font-medium text-sm">{a.senderName}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(a.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {a.body}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center flex flex-col items-center">
            <Megaphone className="w-10 h-10 text-muted mb-4" />
            <p className="text-muted-foreground max-w-sm">
              {isTeacher
                ? "Post your first announcement to the class."
                : "No announcements yet."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
