import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, User as UserIcon, GraduationCap } from "lucide-react";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function Chat() {
  const { user, getAllUsers, isAdmin, isStudent } = useAuth();
  const { threadMessages, sendMessage, markThreadRead, unreadCountForThread } = useChat();

  const allUsers = useMemo(() => getAllUsers(), [getAllUsers]);
  const students = useMemo(() => allUsers.filter((u) => u.role === "student"), [allUsers]);
  const instructors = useMemo(() => allUsers.filter((u) => u.role === "admin"), [allUsers]);
  const primaryInstructor = instructors[0];

  // Active thread = a studentId
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => {
    if (isStudent && user) return user.id;
    return students[0]?.id ?? null;
  });

  const messages = activeThreadId ? threadMessages(activeThreadId) : [];
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");

  // Mark messages read when thread opens / new messages arrive
  useEffect(() => {
    if (activeThreadId && user) markThreadRead(activeThreadId, user.id);
  }, [activeThreadId, user, messages.length, markThreadRead]);

  // Auto-scroll to latest
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, activeThreadId]);

  if (!user) return null;

  const handleSend = () => {
    if (!activeThreadId || !draft.trim()) return;
    sendMessage(
      activeThreadId,
      { id: user.id, name: user.name, role: isAdmin ? "admin" : "student" },
      draft,
    );
    setDraft("");
  };

  const counterpart = (() => {
    if (!activeThreadId) return null;
    if (isStudent) return primaryInstructor ?? null;
    return students.find((s) => s.id === activeThreadId) ?? null;
  })();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isStudent
            ? "Private chat with your instructor."
            : "Private chats with each of your students."}
        </p>
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-4">
        {/* Thread list — only useful for admins (students have a single thread) */}
        {isAdmin && (
          <Card className="p-2 max-h-[70vh] overflow-hidden flex flex-col">
            <div className="px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground font-body">
              Students
            </div>
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-1 p-1">
                {students.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-4">No students yet.</p>
                )}
                {students.map((s) => {
                  const unread = unreadCountForThread(s.id, user.id);
                  const isActive = s.id === activeThreadId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveThreadId(s.id)}
                      className={`text-left flex items-center gap-2 px-2 py-2 rounded-md transition-colors ${
                        isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                      }`}
                    >
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{s.email}</p>
                      </div>
                      {unread > 0 && (
                        <Badge className="h-5 min-w-5 px-1.5 text-[10px]">{unread}</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>
        )}

        {/* Conversation */}
        <Card className="flex flex-col h-[70vh] overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              {isStudent ? (
                <GraduationCap className="h-5 w-5 text-primary" />
              ) : (
                <UserIcon className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">
                {counterpart?.name ?? (isStudent ? "Instructor" : "Select a student")}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {counterpart?.email ?? ""}
              </p>
            </div>
          </div>

          <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
            {!activeThreadId && (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <MessageCircle className="h-8 w-8" />
                <p className="text-sm">Pick a student to start chatting.</p>
              </div>
            )}
            {activeThreadId && messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <MessageCircle className="h-8 w-8" />
                <p className="text-sm">No messages yet — say hello!</p>
              </div>
            )}
            {messages.map((m) => {
              const mine = m.fromId === user.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border border-border rounded-bl-sm"
                    }`}
                  >
                    {!mine && (
                      <p className="text-[10px] uppercase tracking-wide opacity-70 mb-0.5">
                        {m.fromName}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        mine ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                activeThreadId
                  ? "Write a message…"
                  : isAdmin
                  ? "Select a student first"
                  : "No instructor available"
              }
              disabled={!activeThreadId || (isStudent && !primaryInstructor)}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!draft.trim() || !activeThreadId}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
