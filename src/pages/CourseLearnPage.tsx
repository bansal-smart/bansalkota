import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Circle, CircleDot, Menu, FileText, ChevronRight, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { fetchCourseContentTree, upsertVideoProgress } from "@/lib/api/course-content";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
import { rollupCourseProgress, rollupTopic } from "@/lib/course-progress";
import type { CourseSubject, SubtopicVideo, CourseTopic } from "@/types/course-content";

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

  const active = useMemo(() => flatVideos.find((x) => x.v.id === videoIdParam) ?? null, [flatVideos, videoIdParam]);

  const blocked = !!active && !active.v.is_preview && !allowed;

  const overall = useMemo(() => rollupCourseProgress(subjects), [subjects]);

  const selectVideo = async (videoId: string) => {
    setParams({ video: videoId }, { replace: true });
    const v = flatVideos.find((x) => x.v.id === videoId);
    if (v && user) {
      await upsertVideoProgress({
        user_id: user.id, video_id: v.v.id, subtopic_id: v.v.subtopic_id ?? null, course_id: courseId!,
        is_completed: v.v.progress?.is_completed ?? false,
      });
    }
  };

  const continueLearning = () => {
    let bestVid: string | null = null;
    let bestTime = 0;
    for (const x of flatVideos) {
      const ts = x.v.progress?.last_accessed_at ? new Date(x.v.progress.last_accessed_at).getTime() : 0;
      if (ts > bestTime) { bestTime = ts; bestVid = x.v.id; }
    }
    if (!bestVid && flatVideos[0]) bestVid = flatVideos[0].v.id;
    if (bestVid) selectVideo(bestVid);
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!course) return <div className="p-8">Course not found</div>;

  const Sidebar = (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Overall Progress</p>
        <Progress value={overall.percentage} />
        <p className="text-xs mt-1">{overall.label} videos · {overall.percentage}%</p>
      </div>
      <ContentTree subjects={subjects} activeVideoId={videoIdParam} onSelect={selectVideo} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="flex items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild><Link to="/my-courses"><ArrowLeft className="h-4 w-4 mr-1" /> My Courses</Link></Button>
            <h1 className="font-semibold truncate max-w-[50vw]">{course.name}</h1>
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

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 p-4">
        <aside className="hidden lg:block sticky top-20 self-start max-h-[85vh] overflow-y-auto bg-card border rounded-lg p-3">
          {Sidebar}
        </aside>

        <main>
          {!active ? (
            <div className="bg-card border rounded-lg p-8 text-center">
              {course.thumbnail_url && <img src={course.thumbnail_url} alt="" className="w-full max-w-md mx-auto rounded mb-4" />}
              <h2 className="text-2xl font-semibold">{course.name}</h2>
              <p className="text-sm text-muted-foreground mb-4">by {course.educator_name ?? "—"}</p>
              <Progress value={overall.percentage} className="max-w-md mx-auto" />
              <p className="text-xs mt-2 mb-6">{overall.label} videos watched · {overall.percentage}% complete</p>
              {flatVideos.length > 0 ? (
                <Button onClick={continueLearning}>▶ Continue Learning</Button>
              ) : <p className="text-sm text-muted-foreground">No content yet.</p>}
            </div>
          ) : blocked ? (
            <div className="bg-card border rounded-lg p-8 text-center">
              <p className="mb-4">This video requires enrollment.</p>
              <Button onClick={() => navigate(`/courses/${course.slug}`)}>Enroll now</Button>
            </div>
          ) : (
            <VideoView entry={active} courseId={courseId!} onProgressChange={load} />
          )}
        </main>
      </div>
    </div>
  );
};

function ContentTree({ subjects, activeVideoId, onSelect }: { subjects: CourseSubject[]; activeVideoId: string | null; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setOpen((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <div className="space-y-0.5 text-sm">
      {subjects.map((s) => {
        const { total, done } = (() => {
          let t = 0, d = 0;
          for (const tp of s.topics ?? []) { const r = rollupTopic(tp); t += r.total; d += r.done; }
          return { total: t, done: d };
        })();
        const o = open.has(s.id);
        return (
          <div key={s.id}>
            <button onClick={() => toggle(s.id)} className="w-full flex items-center gap-1 py-1 px-1 hover:bg-muted/50 rounded">
              {o ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {s.icon && <span>{s.icon}</span>}
              <span className="flex-1 text-left font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground">{done}/{total}</span>
            </button>
            {o && (
              <div className="ml-3">
                {(s.topics ?? []).map((t) => {
                  const to = open.has(t.id);
                  const r = rollupTopic(t);
                  const stat = r.total === 0 ? "empty" : r.done === r.total ? "done" : r.done > 0 ? "partial" : "none";
                  return (
                    <div key={t.id}>
                      <button onClick={() => toggle(t.id)} className="w-full flex items-center gap-1 py-1 px-1 hover:bg-muted/50 rounded">
                        {to ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        <span className="flex-1 text-left">{t.name}</span>
                        {stat === "done" && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                        {stat === "partial" && <CircleDot className="h-3 w-3 text-amber-500" />}
                        {stat !== "done" && stat !== "partial" && stat !== "empty" && <Circle className="h-3 w-3 text-muted-foreground" />}
                        <span className="text-[10px] text-muted-foreground ml-1">{r.done}/{r.total}</span>
                      </button>
                      {to && (
                        <div className="ml-4 space-y-0.5">
                          {(t.videos ?? []).map((v) => (
                            <button
                              key={v.id}
                              onClick={() => onSelect(v.id)}
                              className={`w-full text-left text-xs py-1 px-2 rounded flex items-start gap-1 ${activeVideoId === v.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`}
                            >
                              {v.progress?.is_completed ? <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 shrink-0" /> : <Circle className="h-3 w-3 mt-0.5 shrink-0" />}
                              <span className="flex-1 min-w-0">
                                <span className="truncate block">{v.title}</span>
                                <span className="text-[10px] text-muted-foreground truncate block">
                                  {v.subtopic_label?.trim() || "—"}
                                </span>
                              </span>
                              {v.duration_label && <span className="text-[10px] text-muted-foreground shrink-0">{v.duration_label}</span>}
                            </button>
                          ))}
                          {(t.videos ?? []).length === 0 && (
                            <p className="text-[11px] text-muted-foreground px-2 py-1">No videos</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VideoView({ entry, courseId, onProgressChange }: { entry: { v: SubtopicVideo; topic: CourseTopic; subject: CourseSubject }; courseId: string; onProgressChange: () => void }) {
  const { user } = useAuth();
  const { v, topic, subject } = entry;
  const completed = !!v.progress?.is_completed;
  const subLabel = v.subtopic_label?.trim() || "—";
  const toggleComplete = async () => {
    if (!user) return;
    await upsertVideoProgress({
      user_id: user.id, video_id: v.id, subtopic_id: v.subtopic_id ?? null, course_id: courseId, is_completed: !completed,
    });
    toast.success(!completed ? "Marked complete" : "Marked incomplete");
    onProgressChange();
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">{subject.name} › {topic.name} › {subLabel}</div>
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        {v.youtube_video_id ? (
          <iframe
            src={getYouTubeEmbedUrl(v.youtube_video_id)}
            className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
            title={v.title}
          />
        ) : <div className="flex items-center justify-center h-full text-white">Invalid video</div>}
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold">{v.title}</h2>
          <p className="text-xs text-muted-foreground">{subLabel}{v.duration_label ? ` · ${v.duration_label}` : ""}</p>
        </div>
        <Button onClick={toggleComplete} variant={completed ? "outline" : "default"}>
          {completed ? "↩ Mark Incomplete" : "✓ Mark as Complete"}
        </Button>
      </div>

      <Tabs defaultValue="notes">
        <TabsList>
          <TabsTrigger value="notes">📝 Notes</TabsTrigger>
          <TabsTrigger value="pdfs">📄 PDFs ({topic.pdfs?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="about">ℹ️ About</TabsTrigger>
        </TabsList>
        <TabsContent value="notes"><NotesTab video={v} courseId={courseId} /></TabsContent>
        <TabsContent value="pdfs"><PdfsTab topic={topic} /></TabsContent>
        <TabsContent value="about">
          <div className="text-sm space-y-2">
            <p>📍 {subject.name} › {topic.name} › {subLabel}</p>
            <p className="text-xs text-muted-foreground">{topic.videos?.length ?? 0} videos · {topic.pdfs?.length ?? 0} PDFs</p>
          </div>
        </TabsContent>
      </Tabs>
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
    <div className="space-y-2">
      <Textarea value={text} onChange={(e) => onChange(e.target.value)} rows={8} placeholder="Type your notes here…" />
      <p className="text-xs text-muted-foreground">{status}</p>
    </div>
  );
}

function PdfsTab({ topic }: { topic: CourseTopic }) {
  if (!topic.pdfs?.length) return <p className="text-sm text-muted-foreground py-4">No study materials yet.</p>;
  return (
    <div className="space-y-2">
      {topic.pdfs.map((p) => (
        <a key={p.id} href={p.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 border rounded hover:bg-muted/50">
          <FileText className="h-4 w-4" /><span className="flex-1 text-sm">{p.title}</span><span className="text-xs text-muted-foreground">Download</span>
        </a>
      ))}
    </div>
  );
}

export default CourseLearnPage;
