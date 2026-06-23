import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Loader2, Pencil, FolderPlus, Upload, FileSpreadsheet, Download, X, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { toast } from "sonner";

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
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const [chapterDialog, setChapterDialog] = useState<{ open: boolean; id?: string; title: string; subject: string }>({ open: false, title: "", subject: "" });
  const [lectureDialog, setLectureDialog] = useState<{ open: boolean; id?: string; chapterId: string; title: string; topic: string; youtubeUrl: string }>({
    open: false, chapterId: "", title: "", topic: "", youtubeUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = async () => {
    if (!courseId) return;
    setLoading(true);
    const [{ data: c }, { data: ch }, { data: ls }] = await Promise.all([
      supabase.from("centre_online_courses" as any).select("id, title, centre_id").eq("id", courseId).maybeSingle(),
      supabase.from("centre_online_chapters" as any).select("*").eq("centre_course_id", courseId).order("position"),
      supabase.from("centre_online_lessons" as any).select("*").eq("centre_course_id", courseId).order("position"),
    ]);
    setCourse((c as any) ?? null);
    setChapters((ch as any) ?? []);
    setLessons((ls as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [courseId]);

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
    const durationSecs = Math.max(60, Math.round((lectureDialog.durationMin || 10) * 60));
    setSaving(true);
    if (lectureDialog.id) {
      const { error } = await (supabase as any).from("centre_online_lessons" as any).update({
        title, topic: lectureDialog.topic || null, video_url: ytEmbed(ytId), youtube_id: ytId,
        duration_seconds: durationSecs, centre_chapter_id: lectureDialog.chapterId,
      }).eq("id", lectureDialog.id);
      setSaving(false);
      if (error) return toast.error(error.message);
    } else {
      const positionInChapter = Math.max(-1, ...lessons.filter((l) => l.centre_chapter_id === lectureDialog.chapterId).map((l) => l.position)) + 1;
      const { error } = await (supabase as any).from("centre_online_lessons" as any).insert({
        centre_course_id: course.id, centre_chapter_id: lectureDialog.chapterId,
        title, topic: lectureDialog.topic || null, video_url: ytEmbed(ytId), youtube_id: ytId,
        duration_seconds: durationSecs, position: positionInChapter,
      });
      setSaving(false);
      if (error) return toast.error(error.message);
    }
    toast.success("Lecture saved");
    setLectureDialog({ open: false, chapterId: "", title: "", topic: "", youtubeUrl: "", durationMin: 10 });
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
          <Link to="/center/online-courses" className="rounded-md border border-border p-2 hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Link>
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

      <div className="space-y-4">
        {chapters.map((ch) => (
          <div key={ch.id} className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <p className="text-sm font-bold text-foreground">{ch.title}</p>
                {ch.subject && <p className="text-xs text-muted-foreground">{ch.subject}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setLectureDialog({ open: true, chapterId: ch.id, title: "", topic: "", youtubeUrl: "", durationMin: 10 })} className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-3 py-1 text-xs font-bold hover:bg-primary/20">
                  <Plus className="h-3 w-3" /> Add Lecture
                </button>
                <button onClick={() => setChapterDialog({ open: true, id: ch.id, title: ch.title, subject: ch.subject ?? "" })} className="rounded-md border border-border p-1.5"><Pencil className="h-3 w-3" /></button>
                <button onClick={() => deleteChapter(ch.id)} className="rounded-md border border-destructive/40 text-destructive p-1.5"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
            <ul className="divide-y divide-border">
              {(lessonsByChapter.get(ch.id) ?? []).map((l) => (
                <li key={l.id} className="flex items-center justify-between p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{l.title}</p>
                    {l.topic && <p className="text-xs text-muted-foreground truncate">{l.topic}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {l.youtube_id && <a href={`https://youtu.be/${l.youtube_id}`} target="_blank" rel="noreferrer" className="text-xs text-primary underline">YouTube</a>}
                    <button onClick={() => setLectureDialog({ open: true, id: l.id, chapterId: l.centre_chapter_id, title: l.title, topic: l.topic ?? "", youtubeUrl: l.youtube_id ?? "", durationMin: Math.max(1, Math.round((l.duration_seconds || 0) / 60)) })} className="rounded-md border border-border p-1.5"><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => deleteLecture(l.id)} className="rounded-md border border-destructive/40 text-destructive p-1.5"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </li>
              ))}
              {!(lessonsByChapter.get(ch.id) ?? []).length && <li className="p-3 text-xs text-muted-foreground">No lectures yet.</li>}
            </ul>
          </div>
        ))}
        {!chapters.length && <p className="text-sm text-muted-foreground">No chapters yet. Add a chapter or use Bulk upload.</p>}
      </div>

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
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Duration (minutes)</label>
              <input type="number" value={lectureDialog.durationMin} onChange={(e) => setLectureDialog({ ...lectureDialog, durationMin: Number(e.target.value) })} placeholder="e.g. 10" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
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
