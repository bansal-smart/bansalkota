import { useEffect, useMemo, useState, Fragment as FragmentWithKey } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Loader2, Pencil, FolderPlus, Upload, FileSpreadsheet, Download, X, CheckCircle2, AlertCircle, Video, ExternalLink, Save } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type LiveClass = {
  id: string;
  title: string;
  subject: string;
  educator_name: string;
  target_exam: string | null;
  starts_at: string;
  ends_at: string | null;
  meeting_url: string | null;
  status: string;
  description: string | null;
};

const LIVE_SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology", "Mixed"];
const LIVE_EXAMS = ["JEE Main", "JEE Advanced", "IIT JEE", "NEET", "Foundation", "Boards"];
const LIVE_STATUSES = ["scheduled", "live", "completed", "cancelled"];

const liveSlugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

type Course = { id: string; title: string; centre_id: string };
type Chapter = { id: string; title: string; subject: string | null; position: number; is_published: boolean };
type Lesson = {
  id: string; centre_course_id: string; centre_chapter_id: string;
  title: string; topic: string | null; video_url: string | null;
  youtube_id: string | null; duration_seconds: number; position: number; is_published: boolean;
};

const extractYouTubeId = (url: string): string | null => {
  const u = (url || "").trim();
  let m = u.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  m = u.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  m = u.match(/youtube\.com\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(u)) return u;
  return null;
};
const ytEmbed = (id: string) => `https://www.youtube.com/embed/${id}`;

const CenterOnlineCourseContentPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { primaryCenterId } = useCenterAdmin();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);

  const [chapterDialog, setChapterDialog] = useState<{ open: boolean; id?: string; title: string; subject: string }>({ open: false, title: "", subject: "" });
  const [lectureDialog, setLectureDialog] = useState<{ open: boolean; id?: string; chapterId: string; title: string; topic: string; youtubeUrl: string }>({
    open: false, chapterId: "", title: "", topic: "", youtubeUrl: "",
  });
  const [liveDialog, setLiveDialog] = useState<any>(null);
  const [savingLive, setSavingLive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = async () => {
    if (!courseId) return;
    setLoading(true);
    const [{ data: c }, { data: ch }, { data: ls }, { data: lc }] = await Promise.all([
      supabase.from("centre_online_courses" as any).select("id, title, centre_id").eq("id", courseId).maybeSingle(),
      supabase.from("centre_online_chapters" as any).select("*").eq("centre_course_id", courseId).order("position"),
      supabase.from("centre_online_lessons" as any).select("*").eq("centre_course_id", courseId).order("position"),
      (supabase as any).from("live_classes")
        .select("id, title, subject, educator_name, target_exam, starts_at, ends_at, meeting_url, status, description")
        .eq("centre_online_course_id", courseId)
        .order("starts_at", { ascending: false }),
    ]);
    setCourse((c as any) ?? null);
    setChapters((ch as any) ?? []);
    setLessons((ls as any) ?? []);
    setLiveClasses((lc as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [courseId]);

  const blankLive = () => ({
    title: "",
    subject: "Physics",
    educator_name: "",
    target_exam: "JEE Main",
    starts_at: "",
    ends_at: "",
    meeting_url: "",
    status: "scheduled",
    description: "",
  });

  const saveLive = async () => {
    if (!liveDialog?.title) return toast.error("Title is required");
    if (!liveDialog?.starts_at) return toast.error("Start time is required");
    if (!liveDialog?.educator_name) return toast.error("Educator name is required");
    if (!course || !user) return;
    setSavingLive(true);
    const payload: any = {
      title: liveDialog.title,
      subject: liveDialog.subject,
      educator_name: liveDialog.educator_name,
      target_exam: liveDialog.target_exam || null,
      starts_at: new Date(liveDialog.starts_at).toISOString(),
      ends_at: liveDialog.ends_at ? new Date(liveDialog.ends_at).toISOString() : null,
      meeting_url: liveDialog.meeting_url || null,
      status: liveDialog.status || "scheduled",
      description: liveDialog.description || null,
      centre_id: course.centre_id,
      centre_online_course_id: course.id,
    };
    let error;
    if (liveDialog.id) {
      ({ error } = await (supabase as any).from("live_classes").update(payload).eq("id", liveDialog.id));
    } else {
      payload.created_by = user.id;
      payload.slug = `${liveSlugify(payload.title)}-${Math.random().toString(36).slice(2, 6)}`;
      ({ error } = await (supabase as any).from("live_classes").insert(payload));
    }
    setSavingLive(false);
    if (error) return toast.error(error.message);
    toast.success("Live class saved");
    setLiveDialog(null);
    load();
  };

  const deleteLive = async (id: string) => {
    if (!confirm("Delete this live class?")) return;
    const { error } = await (supabase as any).from("live_classes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };


  const lessonsByChapter = useMemo(() => {
    const m = new Map<string, Lesson[]>();
    for (const l of lessons) {
      const arr = m.get(l.centre_chapter_id) ?? [];
      arr.push(l); m.set(l.centre_chapter_id, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.position - b.position);
    return m;
  }, [lessons]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!course) return <div className="p-8 text-sm text-muted-foreground">Course not found.</div>;
  if (primaryCenterId && course.centre_id !== primaryCenterId) {
    return <div className="p-8 text-sm text-muted-foreground">This course belongs to another centre.</div>;
  }

  const saveChapter = async () => {
    const title = chapterDialog.title.trim();
    if (!title) return toast.error("Chapter title required");
    setSaving(true);
    if (chapterDialog.id) {
      const { error } = await (supabase as any).from("centre_online_chapters" as any).update({
        title, subject: chapterDialog.subject || null,
      }).eq("id", chapterDialog.id);
      setSaving(false);
      if (error) return toast.error(error.message);
    } else {
      const nextPos = chapters.length;
      const { error } = await (supabase as any).from("centre_online_chapters" as any).insert({
        centre_course_id: course.id, title, subject: chapterDialog.subject || null, position: nextPos,
      });
      setSaving(false);
      if (error) return toast.error(error.message);
    }
    toast.success("Chapter saved");
    setChapterDialog({ open: false, title: "", subject: "" });
    load();
  };

  const deleteChapter = async (id: string) => {
    if (!confirm("Delete chapter and its lectures?")) return;
    await (supabase as any).from("centre_online_chapters" as any).delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  const saveLecture = async () => {
    const title = lectureDialog.title.trim();
    if (!title) return toast.error("Lecture title required");
    if (!lectureDialog.chapterId) return toast.error("Chapter required");
    const ytId = extractYouTubeId(lectureDialog.youtubeUrl);
    if (!ytId) return toast.error("Valid YouTube link required");
    
    setSaving(true);
    if (lectureDialog.id) {
      const { error } = await (supabase as any).from("centre_online_lessons" as any).update({
        title, topic: lectureDialog.topic || null, video_url: ytEmbed(ytId), youtube_id: ytId,
        centre_chapter_id: lectureDialog.chapterId,
      }).eq("id", lectureDialog.id);
      setSaving(false);
      if (error) return toast.error(error.message);
    } else {
      const positionInChapter = Math.max(-1, ...lessons.filter((l) => l.centre_chapter_id === lectureDialog.chapterId).map((l) => l.position)) + 1;
      const { error } = await (supabase as any).from("centre_online_lessons" as any).insert({
        centre_course_id: course.id, centre_chapter_id: lectureDialog.chapterId,
        title, topic: lectureDialog.topic || null, video_url: ytEmbed(ytId), youtube_id: ytId,
        duration_seconds: 0, position: positionInChapter,
      });
      setSaving(false);
      if (error) return toast.error(error.message);
    }
    toast.success("Lecture saved");
    setLectureDialog({ open: false, chapterId: "", title: "", topic: "", youtubeUrl: "" });
    load();
  };

  const deleteLecture = async (id: string) => {
    if (!confirm("Delete this lecture?")) return;
    await (supabase as any).from("centre_online_lessons" as any).delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/center/centre-courses" className="rounded-md border border-border p-2 hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="text-2xl font-black font-display text-foreground">{course.title}</h1>
            <p className="text-sm text-muted-foreground">{chapters.length} chapters · {lessons.length} lectures</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setBulkOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold hover:bg-muted">
            <FileSpreadsheet className="h-4 w-4" /> Bulk upload lectures
          </button>
          <button onClick={() => setChapterDialog({ open: true, title: "", subject: "" })} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold hover:bg-muted">
            <FolderPlus className="h-4 w-4" /> Add Chapter
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 w-16">#</th>
                <th className="px-4 py-3">Lecture / Chapter</th>
                <th className="px-4 py-3">Topic</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3 w-28">Video</th>
                <th className="px-4 py-3 w-40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {chapters.map((ch) => {
                const chLessons = lessonsByChapter.get(ch.id) ?? [];
                return (
                  <FragmentWithKey key={ch.id}>
                    <tr className="bg-muted/30 border-b border-border">
                      <td className="px-4 py-3 font-bold text-foreground" colSpan={4}>
                        <div className="flex flex-col">
                          <span>{ch.title}</span>
                          {ch.subject && <span className="text-xs font-normal text-muted-foreground">{ch.subject}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{chLessons.length} lecture{chLessons.length === 1 ? "" : "s"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setLectureDialog({ open: true, chapterId: ch.id, title: "", topic: "", youtubeUrl: "" })} className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-1 text-xs font-bold hover:bg-primary/20">
                            <Plus className="h-3 w-3" /> Add
                          </button>
                          <button onClick={() => setChapterDialog({ open: true, id: ch.id, title: ch.title, subject: ch.subject ?? "" })} className="rounded-md border border-border p-1.5"><Pencil className="h-3 w-3" /></button>
                          <button onClick={() => deleteChapter(ch.id)} className="rounded-md border border-destructive/40 text-destructive p-1.5"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </td>
                    </tr>
                    {chLessons.map((l, idx) => (
                      <tr key={l.id} className="border-b border-border hover:bg-muted/20">
                        <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-3 text-foreground">{l.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">{l.topic || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{ch.subject || "—"}</td>
                        <td className="px-4 py-3">
                          {l.youtube_id ? (
                            <a href={`https://youtu.be/${l.youtube_id}`} target="_blank" rel="noreferrer" className="text-xs text-primary underline">YouTube</a>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setLectureDialog({ open: true, id: l.id, chapterId: l.centre_chapter_id, title: l.title, topic: l.topic ?? "", youtubeUrl: l.youtube_id ?? "" })} className="rounded-md border border-border p-1.5"><Pencil className="h-3 w-3" /></button>
                            <button onClick={() => deleteLecture(l.id)} className="rounded-md border border-destructive/40 text-destructive p-1.5"><Trash2 className="h-3 w-3" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!chLessons.length && (
                      <tr key={`empty-${ch.id}`} className="border-b border-border">
                        <td colSpan={6} className="px-4 py-3 text-xs text-muted-foreground italic">No lectures yet.</td>
                      </tr>
                    )}
                  </FragmentWithKey>
                );
              })}
              {!chapters.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No chapters yet. Add a chapter or use Bulk upload.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Classes for this course */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 border-b border-border bg-muted/40">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><Video className="h-4 w-4 text-primary" /> Live Classes</h2>
            <p className="text-xs text-muted-foreground">Schedule live sessions for students enrolled in this course.</p>
          </div>
          <button
            onClick={() => setLiveDialog(blankLive())}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3 w-3" /> New Live Class
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Title</th>
                <th className="text-left px-4 py-2">Subject</th>
                <th className="text-left px-4 py-2">Educator</th>
                <th className="text-left px-4 py-2">Starts at</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Meeting</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {liveClasses.map((c) => (
                <tr key={c.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-3 text-foreground font-medium">{c.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.subject}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.educator_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(c.starts_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.status === "live" ? "bg-red-500/10 text-red-600" : c.status === "completed" ? "bg-muted text-muted-foreground" : c.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-secondary/10 text-secondary"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.meeting_url ? (
                      <a href={c.meeting_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        Join <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setLiveDialog({ ...c, starts_at: toLocalInput(c.starts_at), ends_at: toLocalInput(c.ends_at) })} className="rounded-md border border-border p-1.5"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => deleteLive(c.id)} className="rounded-md border border-destructive/40 text-destructive p-1.5"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!liveClasses.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">No live classes scheduled for this course yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {liveDialog && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto" onClick={() => setLiveDialog(null)}>
          <div className="w-full max-w-2xl my-8 rounded-xl bg-card p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground">{liveDialog.id ? "Edit Live Class" : "New Live Class"}</h2>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Title</label>
              <input value={liveDialog.title ?? ""} onChange={(e) => setLiveDialog({ ...liveDialog, title: e.target.value })} placeholder="e.g. JEE Physics — Rotational Motion" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Subject</label>
                <select value={liveDialog.subject} onChange={(e) => setLiveDialog({ ...liveDialog, subject: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  {LIVE_SUBJECTS.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Target Exam</label>
                <select value={liveDialog.target_exam ?? ""} onChange={(e) => setLiveDialog({ ...liveDialog, target_exam: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  {LIVE_EXAMS.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Educator Name</label>
              <input value={liveDialog.educator_name ?? ""} onChange={(e) => setLiveDialog({ ...liveDialog, educator_name: e.target.value })} placeholder="e.g. Mr. Sharma" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Starts at</label>
                <input type="datetime-local" value={liveDialog.starts_at ?? ""} onChange={(e) => setLiveDialog({ ...liveDialog, starts_at: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Ends at (optional)</label>
                <input type="datetime-local" value={liveDialog.ends_at ?? ""} onChange={(e) => setLiveDialog({ ...liveDialog, ends_at: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Meeting URL</label>
              <input value={liveDialog.meeting_url ?? ""} onChange={(e) => setLiveDialog({ ...liveDialog, meeting_url: e.target.value })} placeholder="https://meet.google.com/..." className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Status</label>
              <select value={liveDialog.status ?? "scheduled"} onChange={(e) => setLiveDialog({ ...liveDialog, status: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                {LIVE_STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Description (optional)</label>
              <textarea value={liveDialog.description ?? ""} onChange={(e) => setLiveDialog({ ...liveDialog, description: e.target.value })} rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setLiveDialog(null)} className="rounded-md border border-border px-3 py-2 text-xs">Cancel</button>
              <button onClick={saveLive} disabled={savingLive} className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground inline-flex items-center gap-1">
                {savingLive ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
              </button>
            </div>
          </div>
        </div>
      )}


      {chapterDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setChapterDialog({ open: false, title: "", subject: "" })}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground">{chapterDialog.id ? "Edit" : "New"} Chapter</h2>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Chapter Title</label>
              <input value={chapterDialog.title} onChange={(e) => setChapterDialog({ ...chapterDialog, title: e.target.value })} placeholder="e.g. 02-Coordination Compound" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Subject</label>
              <input value={chapterDialog.subject} onChange={(e) => setChapterDialog({ ...chapterDialog, subject: e.target.value })} placeholder="e.g. INORGANIC CHEMISTRY (optional)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setChapterDialog({ open: false, title: "", subject: "" })} className="rounded-md border border-border px-3 py-2 text-xs">Cancel</button>
              <button onClick={saveChapter} disabled={saving} className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground inline-flex items-center gap-1">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {lectureDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setLectureDialog({ ...lectureDialog, open: false })}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground">{lectureDialog.id ? "Edit" : "New"} Lecture</h2>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Chapter</label>
              <select value={lectureDialog.chapterId} onChange={(e) => setLectureDialog({ ...lectureDialog, chapterId: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="">Select chapter…</option>
                {chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Lecture Title</label>
              <input value={lectureDialog.title} onChange={(e) => setLectureDialog({ ...lectureDialog, title: e.target.value })} placeholder="e.g. 02-IOC-XII Lec-01" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Topic</label>
              <input value={lectureDialog.topic} onChange={(e) => setLectureDialog({ ...lectureDialog, topic: e.target.value })} placeholder="e.g. Introduction (optional)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">YouTube Link</label>
              <input value={lectureDialog.youtubeUrl} onChange={(e) => setLectureDialog({ ...lectureDialog, youtubeUrl: e.target.value })} placeholder="Paste YouTube URL or video ID" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setLectureDialog({ ...lectureDialog, open: false })} className="rounded-md border border-border px-3 py-2 text-xs">Cancel</button>
              <button onClick={saveLecture} disabled={saving} className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground inline-flex items-center gap-1">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkOpen && (
        <BulkLectureImportDialog
          courseId={course.id}
          chapters={chapters}
          lessons={lessons}
          onClose={() => setBulkOpen(false)}
          onDone={() => { setBulkOpen(false); load(); }}
        />
      )}
    </div>
  );
};

type BulkRow = {
  subject: string;
  chapterName: string;
  lectureName: string;
  topic: string;
  youtubeUrl: string;
  youtubeId: string | null;
  status: "ok" | "invalid";
  reason?: string;
};

const BulkLectureImportDialog = ({ courseId, chapters, lessons, onClose, onDone }: {
  courseId: string;
  chapters: Chapter[];
  lessons: Lesson[];
  onClose: () => void;
  onDone: () => void;
}) => {
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ chaptersCreated: number; lecturesCreated: number; lecturesUpdated: number; skipped: number } | null>(null);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["subject", "Chapter Name", "Lecture Name", "topic", "Youtube Link"],
      ["INORGANIC CHEMISTRY", "02-Coordination Compound", "02-IOC-XII Lec-01", "Introduction", "https://youtu.be/PO4ygzvSvaQ"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "centre-lecture-template.xlsx");
  };

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
    const parsed: BulkRow[] = json.map((r) => {
      const map: Record<string, any> = {};
      Object.keys(r).forEach((k) => { map[norm(k)] = r[k]; });
      const subject = String(map["subject"] ?? "").trim();
      const chapterName = String(map["chaptername"] ?? "").trim();
      const lectureName = String(map["lecturename"] ?? "").trim();
      const topic = String(map["topic"] ?? "").trim();
      const youtubeUrl = String(map["youtubelink"] ?? map["youtube"] ?? "").trim();
      const ytId = extractYouTubeId(youtubeUrl);
      let status: "ok" | "invalid" = "ok";
      let reason: string | undefined;
      if (!chapterName) { status = "invalid"; reason = "Missing Chapter Name"; }
      else if (!lectureName) { status = "invalid"; reason = "Missing Lecture Name"; }
      else if (!ytId) { status = "invalid"; reason = "Invalid YouTube link"; }
      return { subject, chapterName, lectureName, topic, youtubeUrl, youtubeId: ytId, status, reason };
    });
    setRows(parsed);
    setResult(null);
  };

  const runImport = async () => {
    setImporting(true);
    const valid = rows.filter((r) => r.status === "ok");
    const chapterMap = new Map<string, string>();
    for (const ch of chapters) chapterMap.set(ch.title.trim().toLowerCase(), ch.id);
    let chaptersCreated = 0, lecturesCreated = 0, lecturesUpdated = 0, skipped = 0;
    let nextChapterPos = chapters.length;

    // group by chapter
    const byChapter = new Map<string, BulkRow[]>();
    for (const r of valid) {
      const key = r.chapterName.trim().toLowerCase();
      const arr = byChapter.get(key) ?? [];
      arr.push(r); byChapter.set(key, arr);
    }

    for (const [key, group] of byChapter) {
      let chapterId = chapterMap.get(key);
      if (!chapterId) {
        const first = group[0];
        const { data, error } = await (supabase as any).from("centre_online_chapters" as any).insert({
          centre_course_id: courseId, title: first.chapterName, subject: first.subject || null, position: nextChapterPos,
        }).select("id").single();
        if (error || !data) { skipped += group.length; continue; }
        chapterId = (data as any).id;
        chapterMap.set(key, chapterId!);
        chaptersCreated++; nextChapterPos++;
      }

      // existing lessons in this chapter
      const existing = lessons.filter((l) => l.centre_chapter_id === chapterId);
      const existingByTitle = new Map<string, Lesson>();
      for (const l of existing) existingByTitle.set(l.title.trim().toLowerCase(), l);
      let nextLessonPos = existing.length;

      for (const r of group) {
        const tkey = r.lectureName.trim().toLowerCase();
        const found = existingByTitle.get(tkey);
        if (found) {
          const { error } = await (supabase as any).from("centre_online_lessons" as any).update({
            video_url: ytEmbed(r.youtubeId!), youtube_id: r.youtubeId, topic: r.topic || null,
          }).eq("id", found.id);
          if (error) skipped++; else lecturesUpdated++;
        } else {
          const { error } = await (supabase as any).from("centre_online_lessons" as any).insert({
            centre_course_id: courseId, centre_chapter_id: chapterId,
            title: r.lectureName, topic: r.topic || null,
            video_url: ytEmbed(r.youtubeId!), youtube_id: r.youtubeId,
            duration_seconds: 600, position: nextLessonPos,
          });
          if (error) skipped++; else { lecturesCreated++; nextLessonPos++; }
        }
      }
    }

    setImporting(false);
    setResult({ chaptersCreated, lecturesCreated, lecturesUpdated, skipped: skipped + rows.filter((r) => r.status === "invalid").length });
    toast.success(`Imported ${lecturesCreated + lecturesUpdated} lectures`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-card p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Bulk upload lectures</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground">Upload an .xlsx or .csv with columns: <code>subject</code>, <code>Chapter Name</code>, <code>Lecture Name</code>, <code>topic</code>, <code>Youtube Link</code>. Chapters are matched/created by name; lectures with the same name in a chapter are updated.</p>
        <div className="flex gap-2">
          <button onClick={downloadTemplate} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs"><Download className="h-3 w-3" /> Download template</button>
          <label className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs cursor-pointer">
            <Upload className="h-3 w-3" /> Choose file
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
        </div>

        {rows.length > 0 && !result && (
          <>
            <div className="rounded-md border border-border max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr><th className="text-left p-2">Status</th><th className="text-left p-2">Chapter</th><th className="text-left p-2">Lecture</th><th className="text-left p-2">YouTube</th></tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-2">{r.status === "ok" ? <CheckCircle2 className="h-3 w-3 text-secondary" /> : <span className="inline-flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" />{r.reason}</span>}</td>
                      <td className="p-2">{r.chapterName}</td>
                      <td className="p-2">{r.lectureName}</td>
                      <td className="p-2 truncate max-w-[200px]">{r.youtubeUrl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-md border border-border px-3 py-2 text-xs">Cancel</button>
              <button onClick={runImport} disabled={importing} className="rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground inline-flex items-center gap-1">
                {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Import {rows.filter((r) => r.status === "ok").length} lectures
              </button>
            </div>
          </>
        )}

        {result && (
          <div className="space-y-3">
            <div className="rounded-md border border-border p-4 text-sm">
              <p><strong>{result.chaptersCreated}</strong> chapters created</p>
              <p><strong>{result.lecturesCreated}</strong> lectures created</p>
              <p><strong>{result.lecturesUpdated}</strong> lectures updated</p>
              <p><strong>{result.skipped}</strong> rows skipped</p>
            </div>
            <div className="flex justify-end">
              <button onClick={onDone} className="rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CenterOnlineCourseContentPage;
