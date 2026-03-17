import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// Types
export interface ContentItem {
  id: string;
  type: "link" | "pdf" | "image" | "text";
  title: string;
  url?: string;
  description?: string;
  createdAt: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  content: ContentItem[];
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface DiscussionPost {
  id: string;
  title: string;
  body: string;
  author: string;
  replies: DiscussionReply[];
  createdAt: string;
}

export interface DiscussionReply {
  id: string;
  body: string;
  author: string;
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Assignment {
  id: string;
  topicId: string;
  title: string;
  dueDate: string;
  maxScore: number;
}

export interface Grade {
  id: string;
  studentId: string;
  assignmentId: string;
  score: number | null;
  turnedIn: boolean;
  turnedInAt?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: "deadline" | "grade" | "announcement" | "discussion";
  read: boolean;
  createdAt: string;
}

interface LMSState {
  topics: Topic[];
  announcements: Announcement[];
  discussions: DiscussionPost[];
  students: Student[];
  assignments: Assignment[];
  grades: Grade[];
  notifications: Notification[];
}

interface LMSContextType extends LMSState {
  addTopic: (topic: Omit<Topic, "id" | "createdAt" | "content">) => void;
  updateTopic: (id: string, data: Partial<Topic>) => void;
  deleteTopic: (id: string) => void;
  addContentToTopic: (topicId: string, content: Omit<ContentItem, "id" | "createdAt">) => void;
  removeContentFromTopic: (topicId: string, contentId: string) => void;
  addAnnouncement: (a: Omit<Announcement, "id" | "createdAt">) => void;
  updateAnnouncement: (id: string, data: Partial<Announcement>) => void;
  deleteAnnouncement: (id: string) => void;
  addDiscussion: (d: Omit<DiscussionPost, "id" | "createdAt" | "replies">) => void;
  addReply: (discussionId: string, reply: Omit<DiscussionReply, "id" | "createdAt">) => void;
  deleteDiscussion: (id: string) => void;
  addAssignment: (a: Omit<Assignment, "id">) => void;
  updateGrade: (studentId: string, assignmentId: string, score: number) => void;
  toggleTurnedIn: (studentId: string, assignmentId: string) => void;
  addNotification: (n: Omit<Notification, "id" | "createdAt" | "read">) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
}

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const STORAGE_KEY = "academic-stream-lms";

const defaultStudents: Student[] = [
  { id: "s1", name: "Alice Johnson", email: "alice@university.edu" },
  { id: "s2", name: "Bob Smith", email: "bob@university.edu" },
  { id: "s3", name: "Carol Davis", email: "carol@university.edu" },
  { id: "s4", name: "David Lee", email: "david@university.edu" },
  { id: "s5", name: "Emma Wilson", email: "emma@university.edu" },
];

const defaultTopics: Topic[] = [
  {
    id: "t1",
    title: "Introduction to Computer Science",
    description: "Foundational concepts in CS including algorithms, data structures, and computational thinking.",
    content: [
      { id: "c1", type: "link", title: "Course Syllabus", url: "https://example.com/syllabus", createdAt: now() },
      { id: "c2", type: "pdf", title: "Week 1 Lecture Notes", url: "/placeholder.svg", createdAt: now() },
    ],
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "t2",
    title: "Data Structures & Algorithms",
    description: "In-depth study of arrays, linked lists, trees, graphs, sorting, and searching algorithms.",
    content: [
      { id: "c3", type: "text", title: "Assignment 1: Array Operations", description: "Implement basic array operations including insert, delete, and search.", createdAt: now() },
    ],
    createdAt: "2026-02-01T10:00:00Z",
  },
];

const defaultAssignments: Assignment[] = [
  { id: "a1", topicId: "t1", title: "CS Fundamentals Quiz", dueDate: "2026-03-20T23:59:00Z", maxScore: 100 },
  { id: "a2", topicId: "t2", title: "Array Implementation", dueDate: "2026-03-25T23:59:00Z", maxScore: 50 },
];

const defaultGrades: Grade[] = [
  { id: "g1", studentId: "s1", assignmentId: "a1", score: 92, turnedIn: true, turnedInAt: "2026-03-18T14:00:00Z" },
  { id: "g2", studentId: "s2", assignmentId: "a1", score: 85, turnedIn: true, turnedInAt: "2026-03-19T10:00:00Z" },
  { id: "g3", studentId: "s3", assignmentId: "a1", score: null, turnedIn: false },
  { id: "g4", studentId: "s4", assignmentId: "a1", score: 78, turnedIn: true, turnedInAt: "2026-03-17T08:00:00Z" },
  { id: "g5", studentId: "s5", assignmentId: "a1", score: null, turnedIn: false },
  { id: "g6", studentId: "s1", assignmentId: "a2", score: 45, turnedIn: true, turnedInAt: "2026-03-22T16:00:00Z" },
  { id: "g7", studentId: "s2", assignmentId: "a2", score: null, turnedIn: false },
  { id: "g8", studentId: "s3", assignmentId: "a2", score: 38, turnedIn: true, turnedInAt: "2026-03-24T12:00:00Z" },
  { id: "g9", studentId: "s4", assignmentId: "a2", score: null, turnedIn: false },
  { id: "g10", studentId: "s5", assignmentId: "a2", score: 48, turnedIn: true, turnedInAt: "2026-03-23T20:00:00Z" },
];

const defaultAnnouncements: Announcement[] = [
  { id: "an1", title: "Welcome to Spring 2026!", body: "Welcome students! Please review the syllabus and come prepared for our first class.", createdAt: "2026-01-10T09:00:00Z" },
  { id: "an2", title: "Midterm Exam Schedule", body: "The midterm exam will be held on March 28th. Please review Chapters 1-5.", createdAt: "2026-03-01T09:00:00Z" },
];

const defaultDiscussions: DiscussionPost[] = [
  {
    id: "d1", title: "Best resources for learning algorithms?", body: "What books or websites do you recommend for additional practice?",
    author: "Alice Johnson",
    replies: [
      { id: "r1", body: "I really like 'Introduction to Algorithms' by CLRS!", author: "Bob Smith", createdAt: "2026-03-02T14:00:00Z" },
      { id: "r2", body: "LeetCode has great practice problems.", author: "Carol Davis", createdAt: "2026-03-02T15:30:00Z" },
    ],
    createdAt: "2026-03-02T10:00:00Z",
  },
];

const defaultNotifications: Notification[] = [
  { id: "n1", title: "Assignment Due Soon", body: "CS Fundamentals Quiz is due on March 20th.", type: "deadline", read: false, createdAt: "2026-03-17T08:00:00Z" },
  { id: "n2", title: "New Announcement", body: "Midterm Exam Schedule has been posted.", type: "announcement", read: false, createdAt: "2026-03-01T09:00:00Z" },
];

const defaultState: LMSState = {
  topics: defaultTopics,
  announcements: defaultAnnouncements,
  discussions: defaultDiscussions,
  students: defaultStudents,
  assignments: defaultAssignments,
  grades: defaultGrades,
  notifications: defaultNotifications,
};

function loadState(): LMSState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return defaultState;
}

const LMSContext = createContext<LMSContextType | null>(null);

export function LMSProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LMSState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const update = useCallback((fn: (prev: LMSState) => LMSState) => setState(fn), []);

  const addTopic = useCallback((t: Omit<Topic, "id" | "createdAt" | "content">) => {
    update(s => ({ ...s, topics: [...s.topics, { ...t, id: uid(), content: [], createdAt: now() }] }));
  }, [update]);

  const updateTopic = useCallback((id: string, data: Partial<Topic>) => {
    update(s => ({ ...s, topics: s.topics.map(t => t.id === id ? { ...t, ...data } : t) }));
  }, [update]);

  const deleteTopic = useCallback((id: string) => {
    update(s => ({ ...s, topics: s.topics.filter(t => t.id !== id) }));
  }, [update]);

  const addContentToTopic = useCallback((topicId: string, content: Omit<ContentItem, "id" | "createdAt">) => {
    update(s => ({
      ...s,
      topics: s.topics.map(t =>
        t.id === topicId ? { ...t, content: [...t.content, { ...content, id: uid(), createdAt: now() }] } : t
      ),
    }));
  }, [update]);

  const removeContentFromTopic = useCallback((topicId: string, contentId: string) => {
    update(s => ({
      ...s,
      topics: s.topics.map(t =>
        t.id === topicId ? { ...t, content: t.content.filter(c => c.id !== contentId) } : t
      ),
    }));
  }, [update]);

  const addAnnouncement = useCallback((a: Omit<Announcement, "id" | "createdAt">) => {
    const newA = { ...a, id: uid(), createdAt: now() };
    update(s => ({
      ...s,
      announcements: [newA, ...s.announcements],
      notifications: [
        { id: uid(), title: "New Announcement", body: a.title, type: "announcement" as const, read: false, createdAt: now() },
        ...s.notifications,
      ],
    }));
  }, [update]);

  const updateAnnouncement = useCallback((id: string, data: Partial<Announcement>) => {
    update(s => ({ ...s, announcements: s.announcements.map(a => a.id === id ? { ...a, ...data } : a) }));
  }, [update]);

  const deleteAnnouncement = useCallback((id: string) => {
    update(s => ({ ...s, announcements: s.announcements.filter(a => a.id !== id) }));
  }, [update]);

  const addDiscussion = useCallback((d: Omit<DiscussionPost, "id" | "createdAt" | "replies">) => {
    update(s => ({ ...s, discussions: [{ ...d, id: uid(), replies: [], createdAt: now() }, ...s.discussions] }));
  }, [update]);

  const addReply = useCallback((discussionId: string, reply: Omit<DiscussionReply, "id" | "createdAt">) => {
    update(s => ({
      ...s,
      discussions: s.discussions.map(d =>
        d.id === discussionId
          ? { ...d, replies: [...d.replies, { ...reply, id: uid(), createdAt: now() }] }
          : d
      ),
    }));
  }, [update]);

  const deleteDiscussion = useCallback((id: string) => {
    update(s => ({ ...s, discussions: s.discussions.filter(d => d.id !== id) }));
  }, [update]);

  const addAssignment = useCallback((a: Omit<Assignment, "id">) => {
    const newA = { ...a, id: uid() };
    update(s => ({
      ...s,
      assignments: [...s.assignments, newA],
      grades: [
        ...s.grades,
        ...s.students.map(st => ({
          id: uid(), studentId: st.id, assignmentId: newA.id, score: null, turnedIn: false,
        })),
      ],
    }));
  }, [update]);

  const updateGrade = useCallback((studentId: string, assignmentId: string, score: number) => {
    update(s => ({
      ...s,
      grades: s.grades.map(g =>
        g.studentId === studentId && g.assignmentId === assignmentId
          ? { ...g, score, turnedIn: true, turnedInAt: g.turnedInAt || now() }
          : g
      ),
    }));
  }, [update]);

  const toggleTurnedIn = useCallback((studentId: string, assignmentId: string) => {
    update(s => ({
      ...s,
      grades: s.grades.map(g =>
        g.studentId === studentId && g.assignmentId === assignmentId
          ? { ...g, turnedIn: !g.turnedIn, turnedInAt: !g.turnedIn ? now() : undefined }
          : g
      ),
    }));
  }, [update]);

  const addNotification = useCallback((n: Omit<Notification, "id" | "createdAt" | "read">) => {
    update(s => ({
      ...s,
      notifications: [{ ...n, id: uid(), read: false, createdAt: now() }, ...s.notifications],
    }));
  }, [update]);

  const markNotificationRead = useCallback((id: string) => {
    update(s => ({
      ...s,
      notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    }));
  }, [update]);

  const clearNotifications = useCallback(() => {
    update(s => ({ ...s, notifications: s.notifications.map(n => ({ ...n, read: true })) }));
  }, [update]);

  return (
    <LMSContext.Provider
      value={{
        ...state,
        addTopic, updateTopic, deleteTopic,
        addContentToTopic, removeContentFromTopic,
        addAnnouncement, updateAnnouncement, deleteAnnouncement,
        addDiscussion, addReply, deleteDiscussion,
        addAssignment, updateGrade, toggleTurnedIn,
        addNotification, markNotificationRead, clearNotifications,
      }}
    >
      {children}
    </LMSContext.Provider>
  );
}

export function useLMS() {
  const ctx = useContext(LMSContext);
  if (!ctx) throw new Error("useLMS must be used within LMSProvider");
  return ctx;
}
