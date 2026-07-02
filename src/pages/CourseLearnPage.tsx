import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  CircleDot,
  Menu,
  FileText,
  ChevronRight,
  ChevronDown,
  Video as VideoIcon,
  Play,
  Lock,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { fetchCourseContentTree, upsertVideoProgress } from "@/lib/api/course-content";
import { getYouTubeThumbnail } from "@/lib/youtube";
import YouTubePlayer from "@/components/YouTubePlayer";
import { rollupCourseProgress, rollupTopic } from "@/lib/course-progress";
import type { CourseSubject, SubtopicVideo, CourseTopic } from "@/types/course-content";

type SelectedTopic = { subject: CourseSubject; topic: CourseTopic };

const CourseLearnPage = () => {
  const { courseId: courseIdParam, slug } = useParams<{ courseId?: string; slug?: string }>();
  const [params, setParams] = useSearchParams();
  const videoIdParam = params.get("video");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [courseId, setCourseId] = useState<string | null>(courseIdParam ?? null);
  const [subjects, setSubjects] = useState<CourseSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedTopic, setSelectedTopic] = useState<SelectedTopic | null>(null);

  const load = async () => {
    setLoading(true);
    let cQuery: any = supabase.from("courses").select("id,name,slug,thumbnail_url,educator_name");
    if (courseIdParam) cQuery = cQuery.eq("id", courseIdParam);
    else if (slug) cQuery = cQuery.eq("slug", slug);
    else { setLoading(false); return; }
    const { data: c } = await cQuery.maybeSingle();
    setCourse(c);
    if (!c) { setLoading(false); return; }
    setCourseId(c.id);
    const tree = await fetchCourseContentTree(c.id, user?.id ?? null);
    setSubjects(tree);

    // Refresh selected topic from new tree
    setSelectedTopic((prev) => {
      if (!prev) {
        // Auto-select first topic with content
        for (const s of tree) {
          const t = (s.topics ?? []).find((x) => (x.videos?.length ?? 0) > 0 || (x.pdfs?.length ?? 0) > 0);
          if (t) return { subject: s, topic: t };
        }
        return null;
      }
      const s = tree.find((x) => x.id === prev.subject.id);
      if (!s) return null;
      const t = (s.topics ?? []).find((x) => x.id === prev.topic.id);
      return t ? { subject: s, topic: t } : null;
    });

    // Auto-expand first subject
    setExpanded((prev) => {
      if (prev.size > 0) return prev;
      const next = new Set(prev);
      if (tree[0]) next.add(tree[0].id);
      return next;
    });

    if (user) {
      const { data: enr } = await supabase.from("enrollments").select("id").eq("user_id", user.id).eq("course_id", c.id).eq("is_active", true).maybeSingle();
      setAllowed(!!enr);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [courseIdParam, slug, user?.id]);

  const flatVideos = useMemo(() => {
    const list: { v: SubtopicVideo; topic: CourseTopic; subject: CourseSubject }[] = [];
    for (const s of subjects) for (const t of s.topics ?? []) for (const v of t.videos ?? []) list.push({ v, topic: t, subject: s });
    return list;
  }, [subjects]);

  const activeVideo = useMemo(
    () => flatVideos.find((x) => x.v.id === videoIdParam) ?? null,
    [flatVideos, videoIdParam],
  );

  const overall = useMemo(() => rollupCourseProgress(subjects), [subjects]);

  const openVideo = async (video: SubtopicVideo, topic: CourseTopic, subject: CourseSubject) => {
    if (!video.is_preview && !allowed) {
      toast.error("Enroll in this course to watch this video.");
      return;
    }
    setSelectedTopic({ subject, topic });
    setParams({ video: video.id }, { replace: true });
    if (user) {
      await upsertVideoProgress({
        user_id: user.id,
        video_id: video.id,
        subtopic_id: video.subtopic_id ?? null,
        course_id: courseId!,
        is_completed: video.progress?.is_completed ?? false,
      });
    }
  };

  const closeVideo = () => {
    const next = new URLSearchParams(params);
    next.delete("video");
    setParams(next, { replace: true });
  };

  const toggleExpand = (id: string) =>
    setExpanded((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!course) return <div className="p-8">Course not found</div>;

  const Sidebar = (
    <div className="space-y-3">
      <div className="sticky top-0 bg-card z-10 pb-2">
        <p className="text-xs text-muted-foreground mb-1">Overall Progress</p>
        <Progress value={overall.percentage} />
        <p className="text-xs mt-1">{overall.label} videos · {overall.percentage}%</p>
      </div>
      <div className="space-y-1">
        {subjects.map((s) => {
          const totals = (() => {
            let t = 0, d = 0;
            for (const tp of s.topics ?? []) { const r = rollupTopic(tp); t += r.total; d += r.done; }
            return { total: t, done: d };
          })();
          const o = expanded.has(s.id);
          return (
            <div key={s.id}>
              <button
                onClick={() => toggleExpand(s.id)}
                className="w-full flex items-center gap-1 px-2 py-1.5 rounded hover:bg-muted/50"
              >
                {o ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                {s.icon && <span className="mr-0.5">{s.icon}</span>}
                <span className="flex-1 text-left text-sm font-medium truncate">{s.name}</span>
                <span className="text-[10px] text-muted-foreground">{totals.done}/{totals.total}</span>
              </button>
              {o && (
                <div className="ml-4 space-y-0.5">
                  {(s.topics ?? []).map((t) => {
                    const r = rollupTopic(t);
                    const stat = r.total === 0 ? "empty" : r.done === r.total ? "done" : r.done > 0 ? "partial" : "none";
                    const active = selectedTopic?.topic.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTopic({ subject: s, topic: t })}
                        className={`w-full flex items-center gap-1 px-2 py-1.5 rounded text-left text-sm ${active ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`}
                      >
                        <span className="flex-1 truncate">{t.name}</span>
                        {stat === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                        {stat === "partial" && <CircleDot className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                        {stat === "none" && <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <span className="text-[10px] text-muted-foreground shrink-0">{r.done}/{r.total}</span>
                      </button>
                    );
                  })}
                  {(s.topics ?? []).length === 0 && (
                    <p className="text-[11px] text-muted-foreground px-2 py-1">No topics</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="flex items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/my-courses"><ArrowLeft className="h-4 w-4 mr-1" /> My Courses</Link>
            </Button>
            <h1 className="font-semibold truncate">{course.name}</h1>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden"><Menu className="h-4 w-4" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] overflow-y-auto">
              <SheetHeader><SheetTitle>Course Content</SheetTitle></SheetHeader>
              <div className="mt-4">{Sidebar}</div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 p-4">
        <aside className="hidden lg:block sticky top-20 self-start max-h-[85vh] overflow-y-auto bg-card border rounded-lg p-3">
          {Sidebar}
        </aside>

        <main className="bg-card border rounded-lg p-4 min-h-[60vh]">
          {!selectedTopic ? (
            <div className="text-center py-12">
              {course.thumbnail_url && (
                <img src={course.thumbnail_url} alt="" className="w-full max-w-md mx-auto rounded mb-4" />
              )}
              <h2 className="text-2xl font-semibold">{course.name}</h2>
              <p className="text-sm text-muted-foreground mb-4">by {course.educator_name ?? "—"}</p>
              <Progress value={overall.percentage} className="max-w-md mx-auto" />
              <p className="text-xs mt-2">{overall.label} videos · {overall.percentage}% complete</p>
              <p className="text-sm text-muted-foreground mt-6">Pick a topic from the left to start.</p>
            </div>
          ) : (
            <TopicPane
              subject={selectedTopic.subject}
              topic={selectedTopic.topic}
              allowed={allowed}
              onOpenVideo={(v) => openVideo(v, selectedTopic.topic, selectedTopic.subject)}
              onEnroll={() => navigate(`/courses/${course.slug}`)}
            />
          )}
        </main>
      </div>

      <Dialog open={!!activeVideo} onOpenChange={(o) => { if (!o) closeVideo(); }}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          {activeVideo && (
            <VideoModal
              entry={activeVideo}
              courseId={courseId!}
              onProgressChange={load}
              onClose={closeVideo}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function TopicPane({
  subject,
  topic,
  allowed,
  onOpenVideo,
  onEnroll,
}: {
  subject: CourseSubject;
  topic: CourseTopic;
  allowed: boolean;
  onOpenVideo: (v: SubtopicVideo) => void;
  onEnroll: () => void;
}) {
  const videos = topic.videos ?? [];
  const pdfs = topic.pdfs ?? [];
  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        {subject.name} › <span className="text-foreground font-medium">{topic.name}</span>
      </div>
      <Tabs defaultValue="videos">
        <TabsList>
          <TabsTrigger value="videos">
            <VideoIcon className="h-3 w-3 mr-1" /> Videos ({videos.length})
          </TabsTrigger>
          <TabsTrigger value="pdfs">
            <FileText className="h-3 w-3 mr-1" /> PDFs ({pdfs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="mt-3">
          {videos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No videos in this topic yet.</p>
          ) : (
            <div className="space-y-2">
              {videos.map((v) => {
                const locked = !v.is_preview && !allowed;
                const completed = !!v.progress?.is_completed;
                return (
                  <button
                    key={v.id}
                    onClick={() => (locked ? onEnroll() : onOpenVideo(v))}
                    className="w-full flex items-center gap-3 p-2 border rounded bg-card hover:bg-muted/40 transition text-left"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={v.thumbnail_url || (v.youtube_video_id ? getYouTubeThumbnail(v.youtube_video_id) : "")}
                        alt=""
                        className="w-28 h-16 object-cover rounded bg-muted"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded opacity-0 hover:opacity-100 transition">
                        {locked ? <Lock className="h-5 w-5 text-white" /> : <Play className="h-6 w-6 text-white fill-white" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm break-words">{v.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {v.subtopic_label?.trim() || "—"}
                        {v.duration_label ? ` · ${v.duration_label}` : ""}
                        {v.is_preview ? " · 🔓 Preview" : ""}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : locked ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pdfs" className="mt-3">
          {pdfs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No PDFs in this topic yet.</p>
          ) : (
            <div className="space-y-2">
              {pdfs.map((p) => (
                <a
                  key={p.id}
                  href={p.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 p-3 border rounded hover:bg-muted/40"
                >
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="flex-1 text-sm">{p.title}</span>
                  <span className="text-xs text-muted-foreground">Open</span>
                </a>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VideoModal({
  entry,
  courseId,
  onProgressChange,
  onClose,
}: {
  entry: { v: SubtopicVideo; topic: CourseTopic; subject: CourseSubject };
  courseId: string;
  onProgressChange: () => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { v, topic, subject } = entry;
  const completed = !!v.progress?.is_completed;
  const subLabel = v.subtopic_label?.trim() || "—";

  const toggleComplete = async () => {
    if (!user) return;
    await upsertVideoProgress({
      user_id: user.id,
      video_id: v.id,
      subtopic_id: v.subtopic_id ?? null,
      course_id: courseId,
      is_completed: !completed,
    });
    toast.success(!completed ? "Marked complete" : "Marked incomplete");
    onProgressChange();
  };

  return (
    <div className="flex flex-col max-h-[90vh]">
      <DialogHeader className="p-4 pb-2 flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <DialogTitle className="text-base leading-snug break-words">{v.title}</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {subject.name} › {topic.name} › {subLabel}
            {v.duration_label ? ` · ${v.duration_label}` : ""}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1 shrink-0"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </DialogHeader>

      <div className="px-4">
        {v.youtube_video_id ? (
          <YouTubePlayer videoId={v.youtube_video_id} title={v.title} />
        ) : (
          <div className="aspect-video bg-black rounded flex items-center justify-center text-white text-sm">
            Video unavailable
          </div>
        )}
      </div>

      <div className="p-4 overflow-y-auto">
        <div className="flex items-center justify-end mb-3">
          <Button onClick={toggleComplete} variant={completed ? "outline" : "default"} size="sm">
            {completed ? "↩ Mark Incomplete" : "✓ Mark as Complete"}
          </Button>
        </div>
        <Tabs defaultValue="notes">
          <TabsList>
            <TabsTrigger value="notes">📝 Notes</TabsTrigger>
            <TabsTrigger value="pdfs">📄 PDFs ({topic.pdfs?.length ?? 0})</TabsTrigger>
          </TabsList>
          <TabsContent value="notes"><NotesTab video={v} courseId={courseId} /></TabsContent>
          <TabsContent value="pdfs"><PdfsTab topic={topic} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function NotesTab({ video, courseId }: { video: SubtopicVideo; courseId: string }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const timer = useRef<any>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("subtopic_video_notes" as any).select("note_text").eq("user_id", user.id).eq("video_id", video.id).maybeSingle();
      setText(((data as any)?.note_text) ?? "");
    })();
  }, [video.id, user?.id]);

  const onChange = (val: string) => {
    setText(val);
    setStatus("Saving…");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!user) return;
      await supabase.from("subtopic_video_notes" as any).upsert({
        user_id: user.id, video_id: video.id, subtopic_id: video.subtopic_id ?? null, course_id: courseId, note_text: val,
      }, { onConflict: "user_id,video_id" });
      setStatus("Saved ✓");
    }, 1500);
  };

  return (
    <div className="space-y-2 pt-2">
      <Textarea value={text} onChange={(e) => onChange(e.target.value)} rows={6} placeholder="Type your notes here…" />
      <p className="text-xs text-muted-foreground">{status}</p>
    </div>
  );
}

function PdfsTab({ topic }: { topic: CourseTopic }) {
  if (!topic.pdfs?.length) return <p className="text-sm text-muted-foreground py-4">No study materials yet.</p>;
  return (
    <div className="space-y-2 pt-2">
      {topic.pdfs.map((p) => (
        <a key={p.id} href={p.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 border rounded hover:bg-muted/50">
          <FileText className="h-4 w-4" /><span className="flex-1 text-sm">{p.title}</span><span className="text-xs text-muted-foreground">Download</span>
        </a>
      ))}
    </div>
  );
}

export default CourseLearnPage;
