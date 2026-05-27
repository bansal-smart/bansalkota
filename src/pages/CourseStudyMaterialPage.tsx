import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, ChevronRight, FileText, PlayCircle, ClipboardCheck, ArrowLeft, Loader2, Download } from "lucide-react";

type Course = { id: string; slug: string; name: string; subject: string };
type Chapter = { id: string; title: string; position: number };
type Lesson = { id: string; chapter_id: string; slug: string; title: string; type: string; duration_seconds: number };
type Pdf = { id: string; chapter_id: string | null; title: string; file_url: string };
type ChapterTest = { id: string; slug: string; title: string; chapter_id?: string | null };

type Tab = "all" | "videos" | "pdfs" | "quizzes";

const CourseStudyMaterialPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [pdfs, setPdfs] = useState<Pdf[]>([]);
  const [tests, setTests] = useState<ChapterTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [openChapter, setOpenChapter] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    if (!slug) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data: c } = await supabase
        .from("courses")
        .select("id, slug, name, subject")
        .eq("slug", slug)
        .maybeSingle();
      if (!active || !c) { setLoading(false); return; }
      setCourse(c as Course);

      const [chRes, lessRes, pdfRes, testRes] = await Promise.all([
        supabase.from("chapters").select("id, title, position").eq("course_id", c.id).order("position"),
        supabase.from("lessons").select("id, chapter_id, slug, title, type, duration_seconds").eq("course_id", c.id).order("position"),
        supabase.from("course_resources").select("id, chapter_id, title, file_url").eq("course_id", c.id).eq("resource_type", "pdf").eq("is_published", true).order("position"),
        supabase.from("tests").select("id, slug, title, course_id").eq("course_id", c.id).eq("is_published", true),
      ]);
      if (!active) return;
      setChapters((chRes.data ?? []) as Chapter[]);
      setLessons((lessRes.data ?? []) as Lesson[]);
      setPdfs((pdfRes.data ?? []) as Pdf[]);
      setTests((testRes.data ?? []) as ChapterTest[]);
      if (chRes.data?.[0]) setOpenChapter(chRes.data[0].id);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [slug]);

  const lessonsByChapter = useMemo(() => {
    const map = new Map<string, { videos: Lesson[]; quizzes: Lesson[] }>();
    chapters.forEach((c) => map.set(c.id, { videos: [], quizzes: [] }));
    lessons.forEach((l) => {
      const bucket = map.get(l.chapter_id);
      if (!bucket) return;
      if (l.type === "quiz") bucket.quizzes.push(l);
      else bucket.videos.push(l);
    });
    return map;
  }, [chapters, lessons]);

  const pdfsByChapter = useMemo(() => {
    const map = new Map<string, Pdf[]>();
    chapters.forEach((c) => map.set(c.id, []));
    pdfs.forEach((p) => {
      if (p.chapter_id && map.has(p.chapter_id)) map.get(p.chapter_id)!.push(p);
    });
    return map;
  }, [chapters, pdfs]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm text-muted-foreground">Course not found.</p>
        <Link to="/my-courses" className="mt-3 inline-block text-sm font-bold text-primary">Back to My Courses</Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "all", label: "All", icon: BookOpen },
    { key: "videos", label: "Video Lectures", icon: PlayCircle },
    { key: "pdfs", label: "PDFs", icon: FileText },
    { key: "quizzes", label: "Quizzes", icon: ClipboardCheck },
  ];

  return (
    <div className="pb-20 lg:pb-0">
      <div className="bg-gradient-to-br from-primary to-primary/80 px-4 py-5 lg:px-6">
        <Link to="/my-courses" className="inline-flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> My Course
        </Link>
        <h1 className="mt-2 font-display text-xl font-black text-white lg:text-2xl">{course.name}</h1>
        <p className="text-xs text-white/80">Study Material · {course.subject}</p>
      </div>

      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:bg-muted/30"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {chapters.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="font-display text-lg font-bold text-foreground">No chapters yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Content will appear here once your instructor publishes it.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chapters.map((ch) => {
              const { videos, quizzes } = lessonsByChapter.get(ch.id) ?? { videos: [], quizzes: [] };
              const chPdfs = pdfsByChapter.get(ch.id) ?? [];
              const showVideos = tab === "all" || tab === "videos";
              const showPdfs = tab === "all" || tab === "pdfs";
              const showQuizzes = tab === "all" || tab === "quizzes";
              const totalShown =
                (showVideos ? videos.length : 0) +
                (showPdfs ? chPdfs.length : 0) +
                (showQuizzes ? quizzes.length : 0);
              if (totalShown === 0) return null;
              const open = openChapter === ch.id;
              return (
                <section key={ch.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => setOpenChapter(open ? null : ch.id)}
                    className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                        {ch.position || "·"}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-foreground">{ch.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {videos.length} videos · {chPdfs.length} PDFs · {quizzes.length} quizzes
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
                  </button>

                  {open && (
                    <div className="border-t border-border">
                      {showVideos && videos.length > 0 && (
                        <Group title="Video Lectures" icon={PlayCircle}>
                          {videos.map((l) => (
                            <Link
                              key={l.id}
                              to={`/courses/${course.slug}/learn?lesson=${l.slug}`}
                              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors"
                            >
                              <PlayCircle className="h-4 w-4 text-primary shrink-0" />
                              <span className="flex-1 text-sm text-foreground truncate">{l.title}</span>
                              <span className="text-[10px] text-muted-foreground">{Math.round((l.duration_seconds || 0) / 60)} min</span>
                            </Link>
                          ))}
                        </Group>
                      )}

                      {showPdfs && chPdfs.length > 0 && (
                        <Group title="PDFs" icon={FileText}>
                          {chPdfs.map((p) => (
                            <a
                              key={p.id}
                              href={p.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors"
                            >
                              <FileText className="h-4 w-4 text-secondary shrink-0" />
                              <span className="flex-1 text-sm text-foreground truncate">{p.title}</span>
                              <Download className="h-4 w-4 text-muted-foreground" />
                            </a>
                          ))}
                        </Group>
                      )}

                      {showQuizzes && quizzes.length > 0 && (
                        <Group title="Quizzes" icon={ClipboardCheck}>
                          {quizzes.map((l) => (
                            <Link
                              key={l.id}
                              to={`/courses/${course.slug}/learn?lesson=${l.slug}`}
                              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors"
                            >
                              <ClipboardCheck className="h-4 w-4 text-accent shrink-0" />
                              <span className="flex-1 text-sm text-foreground truncate">{l.title}</span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                          ))}
                        </Group>
                      )}
                    </div>
                  )}
                </section>
              );
            })}

            {tests.length > 0 && (tab === "all" || tab === "quizzes") && (
              <section className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  <p className="text-sm font-bold text-foreground">Course Tests</p>
                </div>
                <div className="p-2">
                  {tests.map((t) => (
                    <Link
                      key={t.id}
                      to={`/tests/${t.slug}/take`}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors"
                    >
                      <ClipboardCheck className="h-4 w-4 text-primary shrink-0" />
                      <span className="flex-1 text-sm text-foreground truncate">{t.title}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Group = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <div className="p-3 border-b border-border last:border-b-0">
    <div className="flex items-center gap-2 px-1 mb-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
    </div>
    <div className="space-y-0.5">{children}</div>
  </div>
);

export default CourseStudyMaterialPage;
