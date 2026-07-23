import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  useGetInbox, useListMessages, useSendMessage, useGetMe, useMarkMessagesRead
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageContainer } from "@/components/page";
import { useQueryClient } from "@tanstack/react-query";
import { getListMessagesQueryKey } from "@workspace/api-client-react";
import { Loader2, Send, Search, MessageSquare, ChevronLeft } from "lucide-react";
import { format } from "date-fns";

export default function MessagesPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialCourseId = searchParams.get('courseId');
  
  const [activeThread, setActiveThread] = useState<{courseId: number, otherUserId: string, name: string} | null>(
    initialCourseId ? { courseId: parseInt(initialCourseId, 10), otherUserId: '', name: 'Course Broadcast' } : null
  );

  const { data: inbox, isLoading: loadingInbox } = useGetInbox();
  
  return (
    <PageContainer
      width="wide"
      className="h-[calc(100vh-4rem)] md:h-screen p-4 md:p-8 flex gap-6 overflow-hidden animate-in fade-in duration-300"
    >
      {/* Inbox Sidebar — full-width on mobile when no thread is open */}
      <Card className={`${activeThread ? "hidden" : "flex"} md:flex w-full md:w-80 lg:w-96 flex-col shadow-sm shrink-0 h-full border-r`}>
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 bg-muted/50" placeholder="Search conversations..." />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          {loadingInbox ? (
            <div className="p-4 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted" /></div>
          ) : inbox && inbox.length > 0 ? (
            <div className="divide-y divide-border">
              {inbox.map((thread) => {
                const isActive = activeThread?.courseId === thread.courseId && activeThread?.otherUserId === thread.otherUserId;
                return (
                  <button
                    key={`${thread.courseId}-${thread.otherUserId}`}
                    onClick={() => setActiveThread({ courseId: thread.courseId, otherUserId: thread.otherUserId, name: thread.otherUserName || thread.courseTitle })}
                    className={`w-full text-left p-4 hover:bg-muted/50 transition-colors flex gap-3 relative ${isActive ? 'bg-muted hover:bg-muted' : ''}`}
                  >
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-foreground"></div>}
                    <Avatar className="w-10 h-10 border">
                      <AvatarFallback className={!thread.otherUserId ? "bg-muted text-muted-foreground" : ""}>
                        {thread.otherUserName?.charAt(0) || thread.courseTitle.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-semibold text-sm truncate pr-2">
                          {thread.otherUserName || `${thread.courseTitle} (Broadcast)`}
                        </span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {thread.lastMessageAt ? format(new Date(thread.lastMessageAt), 'MMM d') : ''}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate font-medium">
                        {thread.courseTitle}
                      </div>
                      <div className={`text-sm truncate mt-1 ${thread.unreadCount > 0 ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                        {thread.lastMessage || 'No messages yet.'}
                      </div>
                    </div>
                    {thread.unreadCount > 0 && (
                      <div className="w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center mt-1">
                        {thread.unreadCount}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
              <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">No messages yet.</p>
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Main Chat Area — hidden on mobile until a thread is open */}
      <Card className={`${activeThread ? "flex" : "hidden md:flex"} flex-1 flex-col shadow-sm border overflow-hidden h-full`}>
        {activeThread ? (
          <ChatThread thread={activeThread} onBack={() => setActiveThread(null)} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
            <MessageSquare className="w-16 h-16 text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Your Inbox</h3>
            <p>Select a conversation from the sidebar to start messaging.</p>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}

function ChatThread({ thread, onBack }: { thread: { courseId: number, otherUserId: string, name: string }, onBack: () => void }) {
  const { data: user } = useGetMe();
  const { data: messages, isLoading } = useListMessages(thread.courseId, { query: { enabled: !!thread.courseId, queryKey: getListMessagesQueryKey(thread.courseId) } });
  const sendMutation = useSendMessage();
  const markReadMutation = useMarkMessagesRead();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [draft, setDraft] = useState("");

  // Filter messages for this specific conversation if it's a direct thread
  const filteredMessages = messages?.filter(m => 
    thread.otherUserId ? (m.senderId === thread.otherUserId || m.recipientId === thread.otherUserId) : m.isAnnouncement
  ) || [];

  // Mark as read when opening
  useEffect(() => {
    if (thread.courseId) {
      markReadMutation.mutate({ data: { courseId: thread.courseId, withUserId: thread.otherUserId || undefined } });
    }
  }, [thread.courseId, thread.otherUserId]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;

    sendMutation.mutate({
      courseId: thread.courseId,
      data: {
        body: draft,
        recipientId: thread.otherUserId || undefined,
        isAnnouncement: !thread.otherUserId
      }
    }, {
      onSuccess: () => {
        setDraft("");
        queryClient.invalidateQueries({ queryKey: ['messages', thread.courseId] });
      }
    });
  };

  return (
    <>
      {/* Chat Header */}
      <div className="h-16 border-b flex items-center px-4 md:px-6 bg-card shrink-0">
        <Button variant="ghost" size="icon" className="md:hidden mr-1 -ml-2 shrink-0" onClick={onBack} title="Back to inbox">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Avatar className="w-8 h-8 mr-3">
          <AvatarFallback>{thread.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold">{thread.name}</h3>
          {!thread.otherUserId && <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Course Announcement</span>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 bg-muted/20 dark:bg-card/50" ref={scrollRef}>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted" /></div>
        ) : filteredMessages.length > 0 ? (
          <div className="space-y-6">
            {filteredMessages.map((msg, i) => {
              const isMe = msg.senderId === user?.id;
              
              // Simple date grouping heuristic could go here
              
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-end gap-2 max-w-[80%]">
                    {!isMe && (
                      <Avatar className="w-6 h-6 shrink-0 mb-1">
                        <AvatarImage src={msg.senderAvatarUrl || ''} />
                        <AvatarFallback>{msg.senderName?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`px-4 py-2.5 rounded-2xl ${isMe ? 'bg-foreground text-background rounded-br-sm' : 'bg-card border rounded-bl-sm'}`}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.body}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] text-muted-foreground mt-1 px-8 ${isMe ? 'text-right' : 'text-left'}`}>
                    {format(new Date(msg.createdAt), 'h:mm a')}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p>Be the first to send a message.</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-card shrink-0">
        <form onSubmit={handleSend} className="flex gap-2 relative">
          <Textarea 
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={!thread.otherUserId ? "Draft course announcement..." : "Type a message..."}
            className="min-h-[80px] resize-none pr-14 pb-12 rounded-xl bg-muted/30 focus-visible:bg-background transition-colors"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground hidden sm:inline-block mr-2 uppercase tracking-wide font-medium">Return to send</span>
            <Button type="submit" size="icon" className="h-8 w-8 rounded-full shadow-sm" disabled={sendMutation.isPending || !draft.trim()}>
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
