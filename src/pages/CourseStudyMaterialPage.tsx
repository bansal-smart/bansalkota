import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  BookOpen,
  ChevronRight,
  FileText,
  PlayCircle,
  ClipboardCheck,
  ArrowLeft,
  Loader2,
  Download,
  Atom,
  FlaskConical,
  Sigma,
  Leaf,
  GraduationCap,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type Course = { id: string; slug: string; name: string; subject: string; target_exam: string | null };
type Chapter = { id: string; title: string; position: number; subject: string | null };
type Lesson = { id: string; chapter_id: string; slug: string; title: string; type: string; duration_seconds: number };
type Pdf = { id: string; chapter_id: string | null; title: string; file_url: string };
type ChapterTest = { id: string; slug: string; title: string; chapter_id?: string | null };
type ChapterQuiz = { id: string; chapter_id: string; title: string; description: string | null; position: number };
type QuizAttempt = { quiz_id: string; score: number; total: number };
type ProgressRow = { lesson_slug: string; is_completed: boolean };
type Enrollment = { last_lesson_title: string | null; progress_percent: number | null };
type Profile = { full_name: string | null; avatar_url: string | null };

type Tab = "videos" | "pdfs" | "quizzes";
const PAGE_SIZE = 6;

const subjectsForExam = (exam: string | null | undefined, fallback: string): string[] => {
  const e = (exam ?? "").toLowerCase();
  if (e.includes("neet")) return ["Physics", "Chemistry", "Biology"];
  if (e.includes("jee")) return ["Physics", "Chemistry", "Mathematics"];
  if (e.includes("foundation")) return ["Physics", "Chemistry", "Mathematics", "Biology"];
  return [fallback || "General"];
};

const chapterSubjectFor = (chapter: Chapter): string | null => {
  if (chapter.subject) return chapter.subject;
  const t = chapter.title.toLowerCase();
  if (/(physics|kinematic|motion|force|energy|wave|optic|electric|magnet|thermo)/i.test(t)) return "Physics";
  if (/(chem|atom|periodic|bond|reaction|organic|acid|base|mole|hydrocarb)/i.test(t)) return "Chemistry";
  if (/(math|algebra|calculus|trig|geometry|integ|differ|matrix|probability|vector)/i.test(t)) return "Mathematics";
  if (/(bio|cell|plant|animal|human|gene|ecology|organism)/i.test(t)) return "Biology";
  return null;
};

const SUBJECT_THEME: Record<
  string,
  { icon: typeof Atom; token: string; label: string }
> = {
  physics: { icon: Atom, token: "subject-physics", label: "Physics" },
  chemistry: { icon: FlaskConical, token: "subject-chemistry", label: "Chemistry" },
  mathematics: { icon: Sigma, token: "subject-math", label: "Mathematics" },
  maths: { icon: Sigma, token: "subject-math", label: "Mathematics" },
  math: { icon: Sigma, token: "subject-math", label: "Mathematics" },
  biology: { icon: Leaf, token: "subject-bio", label: "Biology" },
  bio: { icon: Leaf, token: "subject-bio", label: "Biology" },
};

const themeFor = (subject?: string | null) => {
  const key = (subject ?? "").toLowerCase().trim();
  return SUBJECT_THEME[key] ?? { icon: GraduationCap, token: "primary", label: subject || "Course" };
};

const CourseStudyMaterialPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [pdfs, setPdfs] = useState<Pdf[]>([]);
  const [tests, setTests] = useState<ChapterTest[]>([]);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [openChapter, setOpenChapter] = useState<string | null>(null);
  const [chapterTab, setChapterTab] = useState<Record<string, Tab>>({});
  const [chapterPage, setChapterPage] = useState<Record<string, number>>({});

  const [chapterQuizzes, setChapterQuizzes] = useState<ChapterQuiz[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<Record<string, QuizAttempt>>({});
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data: c } = await supabase
        .from("courses")
        .select("id, slug, name, subject, target_exam")
        .eq("slug", slug)
        .maybeSingle();
      if (!active || !c) {
        setLoading(false);
        return;
      }
      setCourse(c as Course);

      // restore last picked subject
      const saved = typeof window !== "undefined" ? localStorage.getItem(`study:subject:${slug}`) : null;
      if (saved) setSelectedSubject(saved);


      const [chRes, lessRes, pdfRes, testRes, quizRes, progRes, enrRes, profRes, attRes] = await Promise.all([
        supabase.from("chapters").select("id, title, position, subject").eq("course_id", c.id).order("position"),
        supabase
          .from("lessons")
          .select("id, chapter_id, slug, title, type, duration_seconds")
          .eq("course_id", c.id)
          .order("position"),
        supabase
          .from("course_resources")
          .select("id, chapter_id, title, file_url")
          .eq("course_id", c.id)
          .eq("resource_type", "pdf")
          .eq("is_published", true)
          .order("position"),
        supabase.from("tests").select("id, slug, title, course_id").eq("course_id", c.id).eq("is_published", true),
        supabase
          .from("chapter_quizzes")
          .select("id, chapter_id, title, description, position")
          .eq("course_id", c.id)
          .eq("is_published", true)
          .order("position"),
        user
          ? supabase
              .from("lesson_progress")
              .select("lesson_slug, is_completed")
              .eq("user_id", user.id)
              .eq("course_id", c.id)
          : Promise.resolve({ data: [] as ProgressRow[] }),
        user
          ? supabase
              .from("enrollments")
              .select("last_lesson_title, progress_percent")
              .eq("user_id", user.id)
              .eq("course_id", c.id)
              .eq("is_active", true)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        user
          ? supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
        user
          ? supabase
              .from("chapter_quiz_attempts")
              .select("quiz_id, score, total")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as QuizAttempt[] }),
      ]);
      if (!active) return;
      setChapters((chRes.data ?? []) as Chapter[]);
      setLessons((lessRes.data ?? []) as Lesson[]);
      setPdfs((pdfRes.data ?? []) as Pdf[]);
      setTests((testRes.data ?? []) as ChapterTest[]);
      const progMap: Record<string, boolean> = {};
      ((progRes.data ?? []) as ProgressRow[]).forEach((p) => {
        progMap[p.lesson_slug] = p.is_completed;
      });
      setProgress(progMap);
      setEnrollment((enrRes.data ?? null) as Enrollment | null);
      setProfile((profRes.data ?? null) as Profile | null);
      if (chRes.data?.[0]) setOpenChapter(chRes.data[0].id);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [slug, user]);

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

  const totals = useMemo(() => {
    let videos = 0,
      quizzes = 0,
      pdfsCount = 0,
      completed = 0;
    lessons.forEach((l) => {
      if (l.type === "quiz") quizzes++;
      else videos++;
      if (progress[l.slug]) completed++;
    });
    pdfsCount = pdfs.length;
    const totalLessons = lessons.length;
    const pct = totalLessons ? Math.round((completed / totalLessons) * 100) : 0;
    return { videos, quizzes, pdfsCount, completed, totalLessons, pct };
  }, [lessons, pdfs, progress]);

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
        <Link to="/my-courses" className="mt-3 inline-block text-sm font-bold text-primary">
          Back to My Courses
        </Link>
      </div>
    );
  }

  const theme = themeFor(course.subject);
  const ThemeIcon = theme.icon;
  const tone = `hsl(var(--${theme.token}))`;
  const toneSoft = `hsl(var(--${theme.token}) / 0.12)`;
  const initials = (profile?.full_name ?? "S")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="pb-24 lg:pb-10">
      {/* HERO */}
      <div
        className="relative overflow-hidden px-4 py-6 lg:px-8 lg:py-8"
        style={{
          background: `linear-gradient(135deg, hsl(var(--navy)) 0%, hsl(var(--navy2)) 60%, ${tone} 140%)`,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full blur-3xl opacity-25"
          style={{ background: tone }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 bottom-0 h-56 w-56 rounded-full blur-3xl opacity-15"
          style={{ background: tone }}
        />

        <div className="relative max-w-6xl mx-auto">
          <Link
            to="/my-courses"
            className="inline-flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> My Courses
          </Link>

          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 ring-white/20"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <ThemeIcon className="h-7 w-7" style={{ color: tone }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
                  Study Material · {theme.label}
                </p>
                <h1 className="mt-1 font-display text-xl font-black text-white lg:text-3xl leading-tight">
                  {course.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/70">
                  <span className="inline-flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" /> {chapters.length} chapters
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <PlayCircle className="h-3.5 w-3.5" /> {totals.videos} videos
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" /> {totals.pdfsCount} PDFs
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ClipboardCheck className="h-3.5 w-3.5" /> {totals.quizzes} quizzes
                  </span>
                </div>
              </div>
            </div>

            {/* Progress ring */}
            <div className="flex items-center gap-4 self-start lg:self-auto">
              <ProgressRing value={totals.pct} tone={tone} />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Your progress</p>
                <p className="text-white font-display text-lg font-black">
                  {totals.completed}/{totals.totalLessons} lessons
                </p>
                <p className="text-[11px] text-white/60">Keep going, you're doing great!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Resume strip */}
        {enrollment?.last_lesson_title && (
          <section
            className="rounded-2xl border border-border bg-card p-4 lg:p-5 shadow-sm flex items-center gap-4"
            style={{ background: `linear-gradient(90deg, ${toneSoft}, hsl(var(--card)))` }}
          >
            <Avatar className="h-12 w-12 ring-2" style={{ boxShadow: `0 0 0 2px ${tone}` } as React.CSSProperties}>
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Continue where you left off
              </p>
              <p className="text-sm font-bold text-foreground truncate">{enrollment.last_lesson_title}</p>
              <div className="mt-2 flex items-center gap-3">
                <Progress value={enrollment.progress_percent ?? totals.pct} className="h-1.5 flex-1 max-w-[200px]" />
                <span className="text-[11px] text-muted-foreground">{enrollment.progress_percent ?? totals.pct}%</span>
              </div>
            </div>
            <Link
              to={`/courses/${course.slug}/learn`}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:opacity-90 transition-opacity"
            >
              <PlayCircle className="h-4 w-4" /> Resume
            </Link>
          </section>
        )}

        {/* Chapters */}
        {chapters.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="font-display text-lg font-bold text-foreground">No chapters yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Content will appear here once your instructor publishes it.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base lg:text-lg font-black text-foreground">Chapters</h2>
              <p className="text-xs text-muted-foreground">{chapters.length} total</p>
            </div>

            <div className="space-y-3">
              {chapters.map((ch) => {
                const { videos, quizzes } = lessonsByChapter.get(ch.id) ?? { videos: [], quizzes: [] };
                const chPdfs = pdfsByChapter.get(ch.id) ?? [];
                const open = openChapter === ch.id;
                const tab = chapterTab[ch.id] ?? "videos";
                const page = chapterPage[ch.id] ?? 1;

                const chapterTotal = videos.length + chPdfs.length + quizzes.length;
                const chCompleted =
                  videos.filter((v) => progress[v.slug]).length + quizzes.filter((q) => progress[q.slug]).length;
                const chPct =
                  videos.length + quizzes.length
                    ? Math.round((chCompleted / (videos.length + quizzes.length)) * 100)
                    : 0;

                const items: Array<
                  | { kind: "video"; data: Lesson }
                  | { kind: "pdf"; data: Pdf }
                  | { kind: "quiz"; data: Lesson }
                > = [];
                if (tab === "videos") videos.forEach((v) => items.push({ kind: "video", data: v }));
                if (tab === "pdfs") chPdfs.forEach((p) => items.push({ kind: "pdf", data: p }));
                if (tab === "quizzes") quizzes.forEach((q) => items.push({ kind: "quiz", data: q }));

                const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
                const safePage = Math.min(page, totalPages);
                const pageItems = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

                return (
                  <section
                    key={ch.id}
                    className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm transition-shadow hover:shadow-md"
                  >
                    <button
                      onClick={() => setOpenChapter(open ? null : ch.id)}
                      className="flex w-full items-center gap-4 px-4 py-4 lg:px-5 hover:bg-muted/30 transition-colors text-left"
                    >
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-display font-black text-sm"
                        style={{ background: toneSoft, color: tone }}
                      >
                        {String(ch.position || 0).padStart(2, "0")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm lg:text-base font-bold text-foreground truncate">{ch.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <PlayCircle className="h-3 w-3" /> {videos.length}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <FileText className="h-3 w-3" /> {chPdfs.length}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <ClipboardCheck className="h-3 w-3" /> {quizzes.length}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> {chCompleted}/{videos.length + quizzes.length}
                          </span>
                        </div>
                        <div className="mt-2 h-1 w-full max-w-xs rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${chPct}%`, background: tone }}
                          />
                        </div>
                      </div>
                      <ChevronRight
                        className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
                      />
                    </button>

                    {open && (
                      <div className="border-t border-border">
                        {/* Tabs */}
                        <div className="flex gap-1 border-b border-border bg-muted/20 px-2 py-2 overflow-x-auto no-scrollbar">
                          {(
                            [
                              { k: "videos", label: "Video Lectures", icon: PlayCircle, count: videos.length },
                              { k: "pdfs", label: "PDFs", icon: FileText, count: chPdfs.length },
                              { k: "quizzes", label: "Quizzes", icon: ClipboardCheck, count: quizzes.length },
                            ] as Array<{ k: Tab; label: string; icon: typeof PlayCircle; count: number }>
                          ).map((t) => {
                            const active = tab === t.k;
                            return (
                              <button
                                key={t.k}
                                onClick={() => {
                                  setChapterTab((prev) => ({ ...prev, [ch.id]: t.k }));
                                  setChapterPage((prev) => ({ ...prev, [ch.id]: 1 }));
                                }}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                                  active
                                    ? "bg-card text-foreground shadow-sm border border-border"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                                style={active ? { color: tone } : undefined}
                              >
                                <t.icon className="h-3.5 w-3.5" />
                                {t.label}
                                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  {t.count}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Items */}
                        {pageItems.length === 0 ? (
                          <EmptyState tab={tab} />
                        ) : (
                          <ul className="divide-y divide-border">
                            {pageItems.map((it) => {
                              if (it.kind === "pdf") {
                                return (
                                  <li key={it.data.id}>
                                    <a
                                      href={it.data.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-3 px-4 lg:px-5 py-3 hover:bg-muted/30 transition-colors group"
                                    >
                                      <div
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                        style={{ background: toneSoft, color: tone }}
                                      >
                                        <FileText className="h-4 w-4" />
                                      </div>
                                      <p className="flex-1 text-sm font-medium text-foreground truncate">
                                        {it.data.title}
                                      </p>
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground group-hover:text-foreground">
                                        <Download className="h-3.5 w-3.5" /> Open
                                      </span>
                                    </a>
                                  </li>
                                );
                              }
                              const lesson = it.data as Lesson;
                              const done = progress[lesson.slug];
                              const Icon = it.kind === "video" ? PlayCircle : ClipboardCheck;
                              return (
                                <li key={lesson.id}>
                                  <Link
                                    to={`/courses/${course.slug}/learn?lesson=${lesson.slug}`}
                                    state={{ from: "study", chapterId: ch.id }}
                                    className="flex items-center gap-3 px-4 lg:px-5 py-3 hover:bg-muted/30 transition-colors group"
                                  >
                                    <div
                                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                      style={{ background: toneSoft, color: tone }}
                                    >
                                      <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {Math.max(1, Math.round((lesson.duration_seconds || 0) / 60))} min
                                      </p>
                                    </div>
                                    <span
                                      className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                        done
                                          ? "bg-emerald-500/15 text-emerald-600"
                                          : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      {done ? (
                                        <>
                                          <CheckCircle2 className="h-3 w-3" /> Done
                                        </>
                                      ) : (
                                        "Start"
                                      )}
                                    </span>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}

                        {totalPages > 1 && (
                          <div className="border-t border-border px-3 py-2">
                            <Pagination>
                              <PaginationContent>
                                <PaginationItem>
                                  <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setChapterPage((prev) => ({
                                        ...prev,
                                        [ch.id]: Math.max(1, safePage - 1),
                                      }));
                                    }}
                                    aria-disabled={safePage === 1}
                                  />
                                </PaginationItem>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                  <PaginationItem key={p}>
                                    <PaginationLink
                                      href="#"
                                      isActive={p === safePage}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setChapterPage((prev) => ({ ...prev, [ch.id]: p }));
                                      }}
                                    >
                                      {p}
                                    </PaginationLink>
                                  </PaginationItem>
                                ))}
                                <PaginationItem>
                                  <PaginationNext
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setChapterPage((prev) => ({
                                        ...prev,
                                        [ch.id]: Math.min(totalPages, safePage + 1),
                                      }));
                                    }}
                                    aria-disabled={safePage === totalPages}
                                  />
                                </PaginationItem>
                              </PaginationContent>
                            </Pagination>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>

            {tests.length > 0 && (
              <section className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="px-4 lg:px-5 py-3 border-b border-border flex items-center gap-2 bg-muted/20">
                  <ClipboardCheck className="h-4 w-4" style={{ color: tone }} />
                  <p className="text-sm font-bold text-foreground">Course Tests</p>
                  <span className="ml-auto text-[11px] text-muted-foreground">{tests.length} tests</span>
                </div>
                <ul className="divide-y divide-border">
                  {tests.map((t) => (
                    <li key={t.id}>
                      <Link
                        to={`/tests/${t.slug}/take`}
                        className="flex items-center gap-3 px-4 lg:px-5 py-3 hover:bg-muted/30 transition-colors"
                      >
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: toneSoft, color: tone }}
                        >
                          <ClipboardCheck className="h-4 w-4" />
                        </div>
                        <span className="flex-1 text-sm font-medium text-foreground truncate">{t.title}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ProgressRing = ({ value, tone }: { value: number; tone: string }) => {
  const size = 72;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          fill="none"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-display font-black text-base">{value}%</span>
      </div>
    </div>
  );
};

const EmptyState = ({ tab }: { tab: Tab }) => {
  const config = {
    videos: { icon: PlayCircle, text: "No video lectures in this chapter yet." },
    pdfs: { icon: FileText, text: "No PDFs uploaded for this chapter yet." },
    quizzes: { icon: ClipboardCheck, text: "No quizzes available for this chapter yet." },
  }[tab];
  const Icon = config.icon;
  return (
    <div className="py-10 px-4 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{config.text}</p>
    </div>
  );
};

export default CourseStudyMaterialPage;
