import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Circle, CircleDot, Menu, FileText, ChevronRight, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { fetchCourseContentTree, upsertVideoProgress } from "@/lib/api/course-content";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
import { rollupCourseProgress, rollupSubject } from "@/lib/course-progress";
import type { CourseSubject, SubtopicVideo, CourseSubtopic, CourseTopic } from "@/types/course-content";

const CourseLearnPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [params, setParams] = useSearchParams();
  const videoIdParam = params.get("video");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [subjects, setSubjects] = useState<CourseSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const load = async () => {
    if (!courseId) return;
    setLoading(true);
    const { data: c } = await supabase.from("courses").select("id,name,slug,thumbnail_url,educator_name").eq("id", courseId).maybeSingle();
    setCourse(c);
    const tree = await fetchCourseContentTree(courseId, user?.id ?? null);
    setSubjects(tree);

    // Access check
    if (user) {
      const { data: enr } = await supabase.from("enrollments").select("id").eq("user_id", user.id).eq("course_id", courseId).eq("is_active", true).maybeSingle();
      setAllowed(!!enr);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [courseId, user?.id]);

  const flatVideos = useMemo(() => {
    const list: { v: SubtopicVideo; subtopic: CourseSubtopic; topic: CourseTopic; subject: CourseSubject }[] = [];
    for (const s of subjects) for (const t of s.topics ?? []) for (const st of t.subtopics ?? []) for (const v of st.videos ?? []) list.push({ v, subtopic: st, topic: t, subject: s });
    return list;
  }, [subjects]);

  const active = useMemo(() => flatVideos.find((x) => x.v.id === videoIdParam) ?? null, [flatVideos, videoIdParam]);

  // If user has no enrollment and video isn't preview, block
  const blocked = !!active && !active.v.is_preview && !allowed;

  const overall = useMemo(() => rollupCourseProgress(subjects), [subjects]);

  const selectVideo = async (videoId: string) => {
    setParams({ video: videoId }, { replace: true });
    const v = flatVideos.find((x) => x.v.id === videoId);
    if (v && user) {
      await upsertVideoProgress({
        user_id: user.id, video_id: v.v.id, subtopic_id: v.subtopic.id, course_id: courseId!,
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
        const { total, done } = rollupSubject(s);
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
                  return (
                    <div key={t.id}>
                      <button onClick={() => toggle(t.id)} className="w-full flex items-center gap-1 py-1 px-1 hover:bg-muted/50 rounded">
                        {to ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        <span className="flex-1 text-left">{t.name}</span>
                      </button>
                      {to && (
                        <div className="ml-3">
                          {(t.subtopics ?? []).map((st) => {
                            const so = open.has(st.id);
                            const stDone = (st.videos ?? []).filter((v) => v.progress?.is_completed).length;
                            const stTot = st.videos?.length ?? 0;
                            const stat = stTot === 0 ? "empty" : stDone === stTot ? "done" : stDone > 0 ? "partial" : "none";
                            return (
                              <div key={st.id}>
                                <button onClick={() => toggle(st.id)} className="w-full flex items-center gap-1 py-1 px-1 hover:bg-muted/50 rounded">
                                  {so ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                  <span className="flex-1 text-left text-xs">{st.name}</span>
                                  {stat === "done" && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                                  {stat === "partial" && <CircleDot className="h-3 w-3 text-amber-500" />}
                                  {stat === "none" && <Circle className="h-3 w-3 text-muted-foreground" />}
                                </button>
                                {so && (
                                  <div className="ml-4 space-y-0.5">
                                    {(st.videos ?? []).map((v) => (
                                      <button key={v.id} onClick={() => onSelect(v.id)}
                                        className={`w-full text-left text-xs py-1 px-2 rounded flex items-center gap-1 ${activeVideoId === v.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`}>
                                        {v.progress?.is_completed ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <Circle className="h-3 w-3" />}
                                        <span className="truncate flex-1">{v.title}</span>
                                        {v.duration_label && <span className="text-[10px] text-muted-foreground">{v.duration_label}</span>}
                                      </button>
                                    ))}
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
            )}
          </div>
        );
      })}
    </div>
  );
}

function VideoView({ entry, courseId, onProgressChange }: { entry: { v: SubtopicVideo; subtopic: CourseSubtopic; topic: CourseTopic; subject: CourseSubject }; courseId: string; onProgressChange: () => void }) {
  const { user } = useAuth();
  const { v, subtopic, topic, subject } = entry;
  const completed = !!v.progress?.is_completed;
  const toggleComplete = async () => {
    if (!user) return;
    await upsertVideoProgress({
      user_id: user.id, video_id: v.id, subtopic_id: subtopic.id, course_id: courseId, is_completed: !completed,
    });
    toast.success(!completed ? "Marked complete" : "Marked incomplete");
    onProgressChange();
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">{subject.name} › {topic.name} › {subtopic.name}</div>
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
          {v.duration_label && <p className="text-xs text-muted-foreground">{v.duration_label}</p>}
        </div>
        <Button onClick={toggleComplete} variant={completed ? "outline" : "default"}>
          {completed ? "↩ Mark Incomplete" : "✓ Mark as Complete"}
        </Button>
      </div>

      <Tabs defaultValue="notes">
        <TabsList>
          <TabsTrigger value="notes">📝 Notes</TabsTrigger>
          <TabsTrigger value="pdfs">📄 PDFs ({subtopic.pdfs?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="about">ℹ️ About</TabsTrigger>
        </TabsList>
        <TabsContent value="notes"><NotesTab video={v} subtopicId={subtopic.id} courseId={courseId} /></TabsContent>
        <TabsContent value="pdfs"><PdfsTab subtopic={subtopic} /></TabsContent>
        <TabsContent value="about">
          <div className="text-sm space-y-2">
            <p>📍 {subject.name} › {topic.name} › {subtopic.name}</p>
            {subtopic.description && <p className="text-muted-foreground">{subtopic.description}</p>}
            <p className="text-xs text-muted-foreground">{subtopic.videos?.length ?? 0} videos · {subtopic.pdfs?.length ?? 0} PDFs</p>
          </div>
        </TabsContent>
      </Tabs>

    </div>
  );
}

function NotesTab({ video, subtopicId, courseId }: { video: SubtopicVideo; subtopicId: string; courseId: string }) {
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
        user_id: user.id, video_id: video.id, subtopic_id: subtopicId, course_id: courseId, note_text: val,
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

function PdfsTab({ subtopic }: { subtopic: CourseSubtopic }) {
  if (!subtopic.pdfs?.length) return <p className="text-sm text-muted-foreground py-4">No study materials yet.</p>;
  return (
    <div className="space-y-2">
      {subtopic.pdfs.map((p) => (
        <a key={p.id} href={p.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 border rounded hover:bg-muted/50">
          <FileText className="h-4 w-4" /><span className="flex-1 text-sm">{p.title}</span><span className="text-xs text-muted-foreground">Download</span>
        </a>
      ))}
    </div>
  );
}

function QuizTab({ subtopic, courseId }: { subtopic: CourseSubtopic; courseId: string }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [attempt, setAttempt] = useState<any | null>(null);
  const [taking, setTaking] = useState(false);
  const [answers, setAnswers] = useState<Record<string, "a" | "b" | "c" | "d">>({});
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    if (!subtopic.quiz?.id) return;
    (async () => {
      const { data: qs } = await supabase.from("subtopic_quiz_questions" as any).select("*").eq("quiz_id", subtopic.quiz!.id).order("position");
      setQuestions(qs ?? []);
      if (user) {
        const { data: at } = await supabase.from("subtopic_quiz_attempts" as any).select("*").eq("user_id", user.id).eq("quiz_id", subtopic.quiz!.id).order("submitted_at", { ascending: false }).limit(1).maybeSingle();
        setAttempt(at);
      }
    })();
  }, [subtopic.quiz?.id, user?.id]);

  if (!subtopic.quiz) return <p className="text-sm text-muted-foreground py-4">No quiz for this subtopic.</p>;

  const start = () => { setAnswers({}); setTaking(true); startedAt.current = Date.now(); };

  const submit = async () => {
    if (!user || !subtopic.quiz) return;
    setSubmitting(true);
    let score = 0, total = 0;
    for (const q of questions) {
      total += q.marks;
      const a = answers[q.id];
      if (!a) continue;
      if (a === q.correct_option) score += q.marks;
      else score -= Number(q.negative_marks) || 0;
    }
    const passed = total > 0 && (score / total) * 100 >= subtopic.quiz.pass_percentage;
    const { data } = await supabase.from("subtopic_quiz_attempts" as any).insert({
      quiz_id: subtopic.quiz.id, user_id: user.id, course_id: courseId, subtopic_id: subtopic.id,
      answers, score, total_marks: total, passed, time_taken_seconds: Math.round((Date.now() - startedAt.current) / 1000),
    }).select().single();
    setAttempt(data); setTaking(false); setSubmitting(false);
    toast.success(`Score: ${score}/${total} · ${passed ? "Passed ✓" : "Try again"}`);
  };

  if (taking) {
    return (
      <div className="space-y-4">
        <div className="font-semibold">{subtopic.quiz.title}</div>
        {questions.map((q, i) => (
          <div key={q.id} className="border rounded p-3 space-y-2">
            <p className="text-sm font-medium">Q{i + 1}. {q.question_text}</p>
            {(["a", "b", "c", "d"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" name={q.id} checked={answers[q.id] === k} onChange={() => setAnswers({ ...answers, [q.id]: k })} />
                <span>{k.toUpperCase()}. {q[`option_${k}`]}</span>
              </label>
            ))}
          </div>
        ))}
        <div className="flex gap-2">
          <Button onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit Quiz"}</Button>
          <Button variant="outline" onClick={() => setTaking(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded p-4 space-y-2">
      <div className="font-semibold">{subtopic.quiz.title}</div>
      <p className="text-xs text-muted-foreground">{questions.length} Q · {subtopic.quiz.time_limit_minutes ?? "No"} min · Pass {subtopic.quiz.pass_percentage}%</p>
      {attempt && (
        <p className="text-sm">Last attempt: {attempt.score}/{attempt.total_marks} {attempt.passed ? <Badge variant="default">Passed</Badge> : <Badge variant="secondary">Failed</Badge>}</p>
      )}
      <Button onClick={start}>{attempt ? "Retake Quiz" : "Start Quiz"}</Button>
    </div>
  );
}

export default CourseLearnPage;
