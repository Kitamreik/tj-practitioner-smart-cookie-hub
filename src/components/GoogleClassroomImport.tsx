import { useEffect, useMemo, useState } from "react";
import { useLMS, type ImportPlan, type ImportMode, type ImportResult } from "@/context/LMSContext";
import { useSemester } from "@/context/SemesterContext";
import {
  getClientId, setClientId, requestAccessToken,
  listCourses, listCourseWork, listAnnouncements, listTopics, dueDateToIso,
  type GCourse, type GCourseWork, type GAnnouncement, type GTopic,
} from "@/lib/googleClassroom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Cloud, Download, RefreshCw, ExternalLink, CheckCircle2, FolderTree, FileText, Megaphone, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type Step = "auth" | "select" | "preview" | "done";

const FALLBACK_TOPIC_KEY = "__fallback__";

function buildPlan(
  course: GCourse,
  semesterId: string,
  coursework: GCourseWork[],
  anns: GAnnouncement[],
  gTopics: GTopic[],
): ImportPlan {
  const topicKey = (id: string) => `gclassroom:topic:${course.id}:${id}`;
  const fallbackExternalId = `gclassroom:topic:${course.id}:__course__`;

  const topicSourceKeyById = new Map<string, string>();
  const topics: ImportPlan["topics"] = gTopics.map(t => {
    const key = topicKey(t.topicId);
    topicSourceKeyById.set(t.topicId, key);
    return {
      sourceKey: key,
      title: t.name,
      description: `Imported from Google Classroom course "${course.name}".`,
      externalId: key,
    };
  });

  // Add a fallback container topic only if needed (any coursework lacking a topic, or no topics at all).
  const needFallback = topics.length === 0 || coursework.some(w => !w.topicId || !topicSourceKeyById.has(w.topicId));
  if (needFallback) {
    topics.unshift({
      sourceKey: FALLBACK_TOPIC_KEY,
      title: course.name + (course.section ? ` — ${course.section}` : ""),
      description: course.description || course.descriptionHeading || "Imported from Google Classroom.",
      externalId: fallbackExternalId,
    });
  }

  const assignments: ImportPlan["assignments"] = coursework.map(w => ({
    sourceKey: `gclassroom:work:${course.id}:${w.id}`,
    topicSourceKey: w.topicId && topicSourceKeyById.has(w.topicId) ? topicSourceKeyById.get(w.topicId)! : FALLBACK_TOPIC_KEY,
    title: w.title,
    dueDate: dueDateToIso(w),
    maxScore: w.maxPoints ?? 100,
    externalId: `gclassroom:work:${course.id}:${w.id}`,
  }));

  const announcements: ImportPlan["announcements"] = anns.map(a => ({
    sourceKey: `gclassroom:ann:${course.id}:${a.id}`,
    title: a.text.split("\n")[0].slice(0, 80) || "Classroom announcement",
    body: a.text,
    externalId: `gclassroom:ann:${course.id}:${a.id}`,
  }));

  return {
    semesterId,
    topics,
    assignments,
    announcements,
    fallbackTopicSourceKey: FALLBACK_TOPIC_KEY,
  };
}

export default function GoogleClassroomImport() {
  const { bulkImport } = useLMS();
  const { semesters, activeSemester } = useSemester();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("auth");
  const [clientIdInput, setClientIdInput] = useState(getClientId());
  const [token, setToken] = useState<string | null>(null);
  const [courses, setCourses] = useState<GCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [targetSemesterId, setTargetSemesterId] = useState<string>(activeSemester.id);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastImport, setLastImport] = useState<ImportResult | null>(null);

  useEffect(() => { if (open) setClientIdInput(getClientId()); }, [open]);

  const selectedCourse = useMemo(
    () => courses.find(c => c.id === selectedCourseId) || null,
    [courses, selectedCourseId],
  );

  const reset = () => {
    setStep(token ? "select" : "auth");
    setPlan(null);
    setLastImport(null);
  };

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
      else { toast.success(`Connected — found ${list.length} course${list.length === 1 ? "" : "s"}.`); setStep("select"); }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to connect to Google Classroom.");
    } finally { setLoading(false); }
  };

  const buildPreview = async () => {
    if (!token || !selectedCourse) return;
    try {
      setLoading(true);
      const [coursework, anns, gTopics] = await Promise.all([
        listCourseWork(token, selectedCourse.id),
        listAnnouncements(token, selectedCourse.id),
        listTopics(token, selectedCourse.id),
      ]);
      setPlan(buildPlan(selectedCourse, targetSemesterId, coursework, anns, gTopics));
      setStep("preview");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load course content.");
    } finally { setLoading(false); }
  };

  const commit = () => {
    if (!plan) return;
    try {
      setLoading(true);
      const result = bulkImport(plan, mode);
      setLastImport(result);
      setStep("done");
      const totalChanged =
        result.topics.created + result.topics.updated +
        result.assignments.created + result.assignments.updated +
        result.announcements.created + result.announcements.updated;
      toast.success(`Import complete — ${totalChanged} item${totalChanged === 1 ? "" : "s"} written.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed.");
    } finally { setLoading(false); }
  };

  // Group assignments by topic for the preview tree
  const previewTree = useMemo(() => {
    if (!plan) return [];
    return plan.topics.map(t => ({
      topic: t,
      assignments: plan.assignments.filter(a => (a.topicSourceKey ?? plan.fallbackTopicSourceKey) === t.sourceKey),
    }));
  }, [plan]);

  return (
    <>
      <Card className="border-border/60">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Cloud className="h-5 w-5" /></div>
            <div>
              <h3 className="font-semibold text-sm">Google Classroom Import</h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
                Pull real courses, coursework and announcements from Google Classroom into a selected semester. Preview, merge, or overwrite — data persists locally.
              </p>
            </div>
          </div>
          <Button onClick={() => { setOpen(true); reset(); }}>
            <Download className="h-4 w-4 mr-1.5" /> Open Importer
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Cloud className="h-5 w-5 text-primary" /> Import from Google Classroom</DialogTitle>
            <DialogDescription>
              Uses your own OAuth Client ID — data only flows between your browser and Google.
            </DialogDescription>
          </DialogHeader>

          {step === "auth" && (
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
                <Label className="text-xs">2. Connect</Label>
                <Button onClick={connect} disabled={loading || !clientIdInput.trim()} className="w-full">
                  {loading ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Cloud className="h-4 w-4 mr-1.5" />}
                  Sign in with Google
                </Button>
              </div>
            </div>
          )}

          {step === "select" && (
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label className="text-xs">Choose course</Label>
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
                <Label className="text-xs">Target semester</Label>
                <Select value={targetSemesterId} onValueChange={setTargetSemesterId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {semesters.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" onClick={connect} disabled={loading} className="w-full">
                {loading ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                Refresh course list
              </Button>
            </div>
          )}

          {step === "preview" && plan && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border p-3 text-center">
                  <FolderTree className="h-4 w-4 mx-auto text-primary mb-1" />
                  <div className="text-lg font-bold">{plan.topics.length}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Topics</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <FileText className="h-4 w-4 mx-auto text-primary mb-1" />
                  <div className="text-lg font-bold">{plan.assignments.length}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Assignments</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <Megaphone className="h-4 w-4 mx-auto text-primary mb-1" />
                  <div className="text-lg font-bold">{plan.announcements.length}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Announcements</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Conflict strategy</Label>
                <RadioGroup value={mode} onValueChange={v => setMode(v as ImportMode)} className="gap-2">
                  <label className="flex items-start gap-2 border rounded-lg p-3 cursor-pointer hover:bg-accent/40">
                    <RadioGroupItem value="merge" className="mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Merge (update existing)</div>
                      <div className="text-[11px] text-muted-foreground">Matches items previously imported from this course by their Google ID and updates title / due date / body. New items are added. Nothing is deleted.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 border rounded-lg p-3 cursor-pointer hover:bg-accent/40">
                    <RadioGroupItem value="overwrite" className="mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Overwrite (replace re-imported items)</div>
                      <div className="text-[11px] text-muted-foreground">Removes previously-imported items in this semester that match the new plan (and their grades), then inserts fresh copies. Manually created items are kept.</div>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              <div className="border rounded-lg max-h-64 overflow-y-auto divide-y">
                {previewTree.map(({ topic, assignments }) => (
                  <div key={topic.sourceKey} className="p-3">
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-medium truncate">{topic.title}</span>
                      <Badge variant="secondary" className="text-[10px]">{assignments.length} assignment{assignments.length === 1 ? "" : "s"}</Badge>
                    </div>
                    {assignments.length > 0 && (
                      <ul className="mt-1.5 ml-5 space-y-0.5">
                        {assignments.map(a => (
                          <li key={a.sourceKey} className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="truncate">{a.title}</span>
                            <span className="opacity-60">· due {new Date(a.dueDate).toLocaleDateString()}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                {plan.announcements.length > 0 && (
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Megaphone className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-medium">Announcements</span>
                    </div>
                    <ul className="ml-5 space-y-0.5">
                      {plan.announcements.map(a => (
                        <li key={a.sourceKey} className="text-[11px] text-muted-foreground truncate">· {a.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "done" && lastImport && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-emerald-700 dark:text-emerald-400">Import complete</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Mode: <code className="bg-muted px-1 rounded">{mode}</code></p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(["topics","assignments","announcements"] as const).map(k => (
                  <div key={k} className="rounded-lg border p-3">
                    <div className="font-medium capitalize mb-1">{k}</div>
                    <div className="text-emerald-600">+{lastImport[k].created} created</div>
                    <div className="text-blue-600">~{lastImport[k].updated} updated</div>
                    <div className="text-muted-foreground">{lastImport[k].skipped} skipped</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {step === "preview" && (
              <Button variant="ghost" onClick={() => setStep("select")} disabled={loading}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            {step === "select" && (
              <Button onClick={buildPreview} disabled={!selectedCourseId || loading}>
                {loading ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <FolderTree className="h-4 w-4 mr-1.5" />}
                Preview import
              </Button>
            )}
            {step === "preview" && (
              <Button onClick={commit} disabled={loading}>
                {loading ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                Commit import
              </Button>
            )}
            {step === "done" && (
              <Button onClick={() => setStep("select")}>Import another</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
