import { useEffect, useState } from "react";
import { useLMS } from "@/context/LMSContext";
import { useSemester } from "@/context/SemesterContext";
import {
  getClientId, setClientId, requestAccessToken,
  listCourses, listCourseWork, listAnnouncements, listTopics, dueDateToIso,
  type GCourse,
} from "@/lib/googleClassroom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Cloud, Download, RefreshCw, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function GoogleClassroomImport() {
  const { bulkImport } = useLMS();
  const { semesters, activeSemester } = useSemester();

  const [open, setOpen] = useState(false);
  const [clientIdInput, setClientIdInput] = useState(getClientId());
  const [token, setToken] = useState<string | null>(null);
  const [courses, setCourses] = useState<GCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [targetSemesterId, setTargetSemesterId] = useState<string>(activeSemester.id);
  const [loading, setLoading] = useState(false);
  const [lastImport, setLastImport] = useState<{ topics: number; assignments: number; announcements: number } | null>(null);

  useEffect(() => { if (open) setClientIdInput(getClientId()); }, [open]);

  const saveClientId = () => {
    if (!clientIdInput.trim()) { toast.error("Enter a Google OAuth Client ID first."); return; }
    setClientId(clientIdInput.trim());
    toast.success("Client ID saved.");
  };

  const connect = async () => {
    try {
      setLoading(true);
      const t = await requestAccessToken();
      setToken(t);
      const list = await listCourses(t);
      setCourses(list);
      if (list.length === 0) toast.warning("No active courses found on this Google account.");
      else toast.success(`Connected — found ${list.length} course${list.length === 1 ? "" : "s"}.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to connect to Google Classroom.");
    } finally { setLoading(false); }
  };

  const runImport = async () => {
    if (!token || !selectedCourseId) return;
    const course = courses.find(c => c.id === selectedCourseId);
    if (!course) return;
    try {
      setLoading(true);
      const [coursework, anns, gTopics] = await Promise.all([
        listCourseWork(token, course.id),
        listAnnouncements(token, course.id),
        listTopics(token, course.id),
      ]);

      // One Topic per Classroom topic; if none exist, create a single "<Course>" container.
      const topicNameById = new Map(gTopics.map(t => [t.topicId, t.name]));
      const topicsToCreate: { semesterId: string; title: string; description: string; content: any[] }[] = [];
      const seen = new Set<string>();
      for (const t of gTopics) {
        topicsToCreate.push({
          semesterId: targetSemesterId,
          title: t.name,
          description: `Imported from Google Classroom course "${course.name}".`,
          content: [],
        });
        seen.add(t.topicId);
      }
      // Fallback container for coursework without a topic
      const fallbackTitle = course.name + (course.section ? ` — ${course.section}` : "");
      let needFallback = coursework.some(w => !w.topicId || !seen.has(w.topicId));
      if (needFallback || topicsToCreate.length === 0) {
        topicsToCreate.unshift({
          semesterId: targetSemesterId,
          title: fallbackTitle,
          description: course.description || course.descriptionHeading || `Imported from Google Classroom.`,
          content: [],
        });
      }

      // Assignments: one per courseWork
      const assignmentsToCreate = coursework.map(w => ({
        topicId: "imported-" + w.id, // placeholder — won't link, since we don't have post-insert ids
        semesterId: targetSemesterId,
        title: w.title,
        dueDate: dueDateToIso(w),
        maxScore: w.maxPoints ?? 100,
      }));

      const announcementsToCreate = anns.map(a => ({
        semesterId: targetSemesterId,
        title: a.text.split("\n")[0].slice(0, 80) || "Classroom announcement",
        body: a.text,
      }));

      const result = bulkImport({
        topics: topicsToCreate,
        assignments: assignmentsToCreate,
        announcements: announcementsToCreate,
      });
      setLastImport(result);
      toast.success(
        `Imported ${result.topics} topics, ${result.assignments} assignments, ${result.announcements} announcements.`,
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <Card className="border-border/60">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Cloud className="h-5 w-5" /></div>
            <div>
              <h3 className="font-semibold text-sm">Google Classroom Import</h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
                Pull real courses, coursework and announcements from Google Classroom into a selected semester. Data persists locally.
              </p>
            </div>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Download className="h-4 w-4 mr-1.5" /> Open Importer
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Cloud className="h-5 w-5 text-primary" /> Import from Google Classroom</DialogTitle>
            <DialogDescription>
              Uses your own OAuth Client ID — no data leaves your browser except the direct call to Google.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-xs">1. Google OAuth Client ID</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="123-abc.apps.googleusercontent.com"
                  value={clientIdInput}
                  onChange={e => setClientIdInput(e.target.value)}
                />
                <Button variant="outline" onClick={saveClientId}>Save</Button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Create one in <a className="underline inline-flex items-center gap-0.5" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Google Cloud Console <ExternalLink className="h-3 w-3" /></a>:
                enable the <em>Google Classroom API</em>, create an <em>OAuth 2.0 Client ID</em> of type <em>Web application</em>, and add this site's origin (<code className="text-[10px] bg-muted px-1 rounded">{typeof window !== "undefined" ? window.location.origin : ""}</code>) to <em>Authorized JavaScript origins</em>.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">2. Connect & list courses</Label>
              <Button onClick={connect} disabled={loading || !clientIdInput.trim()} className="w-full">
                {loading ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Cloud className="h-4 w-4 mr-1.5" />}
                {token ? "Reconnect / refresh courses" : "Sign in with Google"}
              </Button>
              {courses.length > 0 && (
                <p className="text-[11px] text-muted-foreground">Found {courses.length} active course{courses.length === 1 ? "" : "s"}.</p>
              )}
            </div>

            {courses.length > 0 && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">3. Choose course</Label>
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger><SelectValue placeholder="Select a course…" /></SelectTrigger>
                    <SelectContent>
                      {courses.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{c.section ? ` — ${c.section}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">4. Target semester</Label>
                  <Select value={targetSemesterId} onValueChange={setTargetSemesterId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {semesters.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {lastImport && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-medium text-emerald-700 dark:text-emerald-400">Imported successfully</p>
                  <div className="flex gap-2 flex-wrap mt-1">
                    <Badge variant="secondary">{lastImport.topics} topics</Badge>
                    <Badge variant="secondary">{lastImport.assignments} assignments</Badge>
                    <Badge variant="secondary">{lastImport.announcements} announcements</Badge>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button onClick={runImport} disabled={!token || !selectedCourseId || loading}>
              {loading ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
              Import into semester
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
