import { useState } from "react";
import { useAuth, type StoredUser, type UserRole } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Users, Pencil, Trash2, Mail, Search, Eye, EyeOff,
  Shield, ShieldCheck, GraduationCap, UserCog, Clock, Activity,
} from "lucide-react";

function RoleIcon({ role }: { role: UserRole }) {
  switch (role) {
    case "webmaster": return <ShieldCheck className="h-4 w-4 text-primary" />;
    case "admin": return <Shield className="h-4 w-4 text-amber-500" />;
    default: return <GraduationCap className="h-4 w-4 text-emerald-500" />;
  }
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UserCard({
  user,
  isSelf,
  showPassword,
  onTogglePassword,
  onEdit,
  onDelete,
  onResetEmail,
}: {
  user: StoredUser;
  isSelf: boolean;
  showPassword: boolean;
  onTogglePassword: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onResetEmail: () => void;
}) {
  return (
    <Card className="group hover:shadow-md transition-shadow duration-200 border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-bold uppercase">
              {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm truncate">{user.name}</h3>
                {isSelf && <Badge variant="outline" className="text-[9px] shrink-0">You</Badge>}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="capitalize text-[10px] gap-1 px-2">
                  <RoleIcon role={user.role} />
                  {user.role}
                </Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <code className="text-[11px] bg-muted px-2 py-0.5 rounded font-mono">
                  {showPassword ? user.password : "••••••••"}
                </code>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onTogglePassword}>
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onResetEmail} title="Reset password">
              <Mail className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onDelete}
              disabled={isSelf}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Webmaster() {
  const { getAllUsers, updateUser, deleteUser, user: currentUser } = useAuth();
  const [users, setUsers] = useState<StoredUser[]>(() => getAllUsers());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [editUser, setEditUser] = useState<StoredUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "", role: "student" as UserRole });
  const [deleteConfirm, setDeleteConfirm] = useState<StoredUser | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const refresh = () => setUsers(getAllUsers());

  const filtered = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    students: users.filter(u => u.role === "student").length,
    admins: users.filter(u => u.role === "admin").length,
    webmasters: users.filter(u => u.role === "webmaster").length,
  };

  const openEdit = (u: StoredUser) => {
    setEditUser(u);
    setEditForm({ name: u.name, email: u.email, password: u.password, role: u.role });
  };

  const handleSaveEdit = () => {
    if (!editUser) return;
    const result = updateUser(editUser.id, {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      password: editForm.password,
      role: editForm.role,
    });
    if (result.success) {
      toast.success("User updated successfully");
      refresh();
      setEditUser(null);
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    const result = deleteUser(deleteConfirm.id);
    if (result.success) {
      toast.success(`${deleteConfirm.name} has been deleted`);
      refresh();
      setDeleteConfirm(null);
    } else {
      toast.error(result.error);
    }
  };

  const handleResetEmail = (u: StoredUser) => {
    toast.success(`Password reset email sent to ${u.email}`, {
      description: "This is a mock action — no email was actually sent.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <UserCog className="h-6 w-6 text-primary" /> User Management Console
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage platform accounts, roles, and credentials</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.total} color="bg-primary" />
        <StatCard icon={GraduationCap} label="Students" value={stats.students} color="bg-emerald-500" />
        <StatCard icon={Shield} label="Admins" value={stats.admins} color="bg-amber-500" />
        <StatCard icon={ShieldCheck} label="Webmasters" value={stats.webmasters} color="bg-violet-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "student", "admin", "webmaster"] as const).map(r => (
            <Button
              key={r}
              variant={roleFilter === r ? "default" : "outline"}
              size="sm"
              className="text-xs capitalize"
              onClick={() => setRoleFilter(r)}
            >
              {r === "all" ? "All" : r}
            </Button>
          ))}
        </div>
      </div>

      {/* User Grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No users match your search</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(u => (
            <UserCard
              key={u.id}
              user={u}
              isSelf={u.id === currentUser?.id}
              showPassword={!!showPasswords[u.id]}
              onTogglePassword={() => setShowPasswords(p => ({ ...p, [u.id]: !p[u.id] }))}
              onEdit={() => openEdit(u)}
              onDelete={() => setDeleteConfirm(u)}
              onResetEmail={() => handleResetEmail(u)}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v as UserRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="admin">Admin / Instructor</SelectItem>
                  <SelectItem value="webmaster">Webmaster</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteConfirm?.name}</strong> ({deleteConfirm?.email})? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
