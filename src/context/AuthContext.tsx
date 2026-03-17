import React, { createContext, useContext, useState, useEffect } from "react";

export type UserRole = "admin" | "student";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: MockUser | null;
  isAdmin: boolean;
  isStudent: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  signup: (name: string, email: string, password: string, role: UserRole) => { success: boolean; error?: string };
  logout: () => void;
}

const AUTH_KEY = "academic-stream-auth";
const USERS_KEY = "academic-stream-users";

// Pre-seeded accounts
const defaultUsers: (MockUser & { password: string })[] = [
  { id: "admin-1", name: "Prof. Anderson", email: "admin@university.edu", role: "admin", password: "admin123" },
  { id: "s1", name: "Alice Johnson", email: "alice@university.edu", role: "student", password: "student123" },
  { id: "s2", name: "Bob Smith", email: "bob@university.edu", role: "student", password: "student123" },
  { id: "s3", name: "Carol Davis", email: "carol@university.edu", role: "student", password: "student123" },
  { id: "s4", name: "David Lee", email: "david@university.edu", role: "student", password: "student123" },
  { id: "s5", name: "Emma Wilson", email: "emma@university.edu", role: "student", password: "student123" },
];

function loadUsers(): (MockUser & { password: string })[] {
  try {
    const saved = localStorage.getItem(USERS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
  return defaultUsers;
}

function saveUsers(users: (MockUser & { password: string })[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_KEY);
  }, [user]);

  const login = (email: string, password: string) => {
    const users = loadUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!found) return { success: false, error: "Invalid email or password" };
    const { password: _, ...userData } = found;
    setUser(userData);
    return { success: true };
  };

  const signup = (name: string, email: string, password: string, role: UserRole) => {
    const users = loadUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: "An account with this email already exists" };
    }
    const newUser = { id: crypto.randomUUID(), name, email, role, password };
    users.push(newUser);
    saveUsers(users);
    const { password: _, ...userData } = newUser;
    setUser(userData);
    return { success: true };
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin: user?.role === "admin",
      isStudent: user?.role === "student",
      login, signup, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
