import { useState } from "react";
import { useLMS } from "@/context/LMSContext";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";

export default function Announcements() {
  const { announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useLMS();
  const { isAdmin } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const openNew = () => { setEditId(null); setTitle(""); setBody(""); setDialogOpen(true); };
  const openEdit = (id: string) => {
    const a = announcements.find((x) => x.id === id);
    if (!a) return;
    setEditId(id); setTitle(a.title); setBody(a.body); setDialogOpen(true);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    if (editId) {
      updateAnnouncement(editId, { title: title.trim(), body: body.trim() });
    } else {
      addAnnouncement({ title: title.trim(), body: body.trim() });
    }
    setDialogOpen(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">Stay up to date with course news.</p>
        </div>
        {isAdmin && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Announcement</Button>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} Announcement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
            <Button onClick={handleSave} className="w-full">{editId ? "Update" : "Post"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {announcements.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No announcements yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className="group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-semibold">{a.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(a.createdAt), "MMMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a.id)}><Pencil className="h-3 w-3" /></Button>
                      </TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAnnouncement(a.id)}><Trash2 className="h-3 w-3" /></Button>
                      </TooltipTrigger><TooltipContent>Delete announcement</TooltipContent></Tooltip>
                    </div>
                  )}
                </div>
                <p className="text-sm mt-3 text-foreground/90 whitespace-pre-wrap">{a.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
