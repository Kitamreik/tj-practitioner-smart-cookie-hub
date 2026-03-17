import { useState } from "react";
import { useLMS } from "@/context/LMSContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash2, MessageCircle, Send } from "lucide-react";
import { format } from "date-fns";

export default function Discussions() {
  const { discussions, addDiscussion, addReply, deleteDiscussion } = useLMS();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [replyMap, setReplyMap] = useState<Record<string, string>>({});
  const [replyAuthorMap, setReplyAuthorMap] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!title.trim() || !author.trim()) return;
    addDiscussion({ title: title.trim(), body: body.trim(), author: author.trim() });
    setTitle(""); setBody(""); setAuthor(""); setDialogOpen(false);
  };

  const handleReply = (discussionId: string) => {
    const text = replyMap[discussionId]?.trim();
    const rAuthor = replyAuthorMap[discussionId]?.trim();
    if (!text || !rAuthor) return;
    addReply(discussionId, { body: text, author: rAuthor });
    setReplyMap((p) => ({ ...p, [discussionId]: "" }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Discussions</h1>
          <p className="text-sm text-muted-foreground mt-1">Engage with your classmates.</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Discussion</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Start a Discussion</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Your name" value={author} onChange={(e) => setAuthor(e.target.value)} />
            <Input placeholder="Discussion title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="What's on your mind?" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
            <Button onClick={handleCreate} className="w-full">Post Discussion</Button>
          </div>
        </DialogContent>
      </Dialog>

      {discussions.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No discussions yet. Start one!</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {discussions.map((d) => (
            <Card key={d.id} className="group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="cursor-pointer flex-1" onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}>
                    <h3 className="font-display font-semibold text-sm">{d.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {d.author} · {format(new Date(d.createdAt), "MMM d, yyyy")} · {d.replies.length} {d.replies.length === 1 ? "reply" : "replies"}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Tooltip><TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDiscussion(d.id)}><Trash2 className="h-3 w-3" /></Button>
                    </TooltipTrigger><TooltipContent>Delete discussion</TooltipContent></Tooltip>
                  </div>
                </div>
                {d.body && <p className="text-sm mt-2 text-foreground/90">{d.body}</p>}

                {expandedId === d.id && (
                  <div className="mt-4 space-y-3 border-t border-border pt-3">
                    {d.replies.map((r) => (
                      <div key={r.id} className="flex gap-3 items-start">
                        <MessageCircle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm">{r.body}</p>
                          <p className="text-[10px] text-muted-foreground">{r.author} · {format(new Date(r.createdAt), "MMM d, h:mm a")}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Your name"
                        className="w-28"
                        value={replyAuthorMap[d.id] || ""}
                        onChange={(e) => setReplyAuthorMap((p) => ({ ...p, [d.id]: e.target.value }))}
                      />
                      <Input
                        placeholder="Write a reply..."
                        className="flex-1"
                        value={replyMap[d.id] || ""}
                        onChange={(e) => setReplyMap((p) => ({ ...p, [d.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleReply(d.id)}
                      />
                      <Button size="icon" onClick={() => handleReply(d.id)}><Send className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
