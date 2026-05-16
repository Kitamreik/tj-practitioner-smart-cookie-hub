import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface ChatMessage {
  id: string;
  threadId: string; // studentId — one thread per student
  fromId: string;
  fromName: string;
  fromRole: "student" | "admin";
  body: string;
  createdAt: string;
  readBy: string[]; // userIds that have read it
}

interface ChatContextType {
  messages: ChatMessage[];
  threadMessages: (studentId: string) => ChatMessage[];
  sendMessage: (
    threadId: string,
    from: { id: string; name: string; role: "student" | "admin" },
    body: string,
  ) => void;
  markThreadRead: (threadId: string, userId: string) => void;
  unreadCountForThread: (threadId: string, userId: string) => number;
}

const STORAGE_KEY = "academic-stream-chat";
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function load(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>(load);

  // Persist + sync across tabs (so instructor & student "see" each other in two tabs).
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try { setMessages(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const threadMessages = useCallback(
    (studentId: string) =>
      messages
        .filter((m) => m.threadId === studentId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages],
  );

  const sendMessage: ChatContextType["sendMessage"] = useCallback((threadId, from, body) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      {
        id: uid(),
        threadId,
        fromId: from.id,
        fromName: from.name,
        fromRole: from.role,
        body: trimmed,
        createdAt: now(),
        readBy: [from.id],
      },
    ]);
  }, []);

  const markThreadRead = useCallback((threadId: string, userId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.threadId === threadId && !m.readBy.includes(userId)
          ? { ...m, readBy: [...m.readBy, userId] }
          : m,
      ),
    );
  }, []);

  const unreadCountForThread = useCallback(
    (threadId: string, userId: string) =>
      messages.filter((m) => m.threadId === threadId && !m.readBy.includes(userId)).length,
    [messages],
  );

  return (
    <ChatContext.Provider
      value={{ messages, threadMessages, sendMessage, markThreadRead, unreadCountForThread }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
