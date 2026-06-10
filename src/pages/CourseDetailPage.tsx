import { useEffect, useMemo, useState } from "react";
import {
  Play,
  CheckCircle2,
  Star,
  Users,
  Clock,
  ShieldCheck,
  ChevronDown,
  Loader2,
  Lock,
  FileText,
  Video,
  ArrowRight,
  Tag,
  GraduationCap,
  MapPin,
  Calendar,
  BadgeCheck,
  BookOpen,
  ClipboardList,
  HelpCircle,
  Backpack,
  Shirt,
  Umbrella,
  CreditCard,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useCourseDetail } from "@/hooks/useCourseDetail";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CourseReviews } from "@/components/CourseReviews";

type EnrollmentInfo = {
  id: string;
  progress_percent: number;
  completed_lessons: number;
  last_lesson_title: string | null;
  last_accessed_at: string | null;
};

// ----- Fallback data (Bansal-styled demo) -----

const FALLBACK_COMMENCEMENT = [
  { stream: "JEE (Main + Advanced)", phase: "Phase I", medium: "English", target: "2028", eligibility: "Class 10th to 11th Moving", mode: "Direct/BOOST", date: "01/04/2026" },
  { stream: "JEE (Main + Advanced)", phase: "Phase II", medium: "English", target: "2028", eligibility: "Class 10th to 11th Moving", mode: "Direct/BOOST", date: "27/05/2026" },
];

const BOARD_SCHOLARSHIPS = [
  { range: "95% +", pct: "55%" },
  { range: "90 to 95%", pct: "50%" },
  { range: "80 to 89%", pct: "45%" },
  { range: "75 to 79%", pct: "40%" },
];

const OLYMPIAD_SCHOLARSHIPS = [
  { label: "Stage III Qualified (Int'l Jr. Astronomy / Jr. Science Olympiad – HBCSE / NSEs)", pct: "100%" },
  { label: "Stage II Qualified (Int'l Jr. Astronomy / Jr. Science Olympiad – HBCSE / NSEs)", pct: "90%" },
  { label: "Stage I Qualified (Int'l Jr. Astronomy / Jr. Science Olympiad – HBCSE / NSEs)", pct: "75%" },
  { label: "Stage III Qualified (Int'l Sr. Astronomy / Physics / Chemistry / Maths / Biology – HBCSE / NSEs)", pct: "100%" },
  { label: "Stage II Qualified (Int'l Sr. Astronomy / Physics / Chemistry / Maths / Biology – HBCSE / NSEs)", pct: "90%" },
  { label: "Stage I Qualified (Int'l Sr. Olympiads – HBCSE / NSEs)", pct: "75%" },
  { label: "Based on Pre-RMO", pct: "25%" },
];

const SERVICES = [
  { icon: BookOpen, label: "Study Material" },
  { icon: Video, label: "Recorded Lectures" },
  { icon: ClipboardList, label: "Test Series" },
  { icon: Shirt, label: "T-Shirt" },
  { icon: Umbrella, label: "Umbrella" },
  { icon: HelpCircle, label: "Doubt Classes" },
  { icon: Backpack, label: "Bag" },
];

const formatBytes = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const detectMode = (c: { name: string; description: string | null; badge: string | null }) => {
  const h = `${c.name} ${c.description ?? ""} ${c.badge ?? ""}`.toLowerCase();
  if (h.includes("residential")) return "Residential";
  if (h.includes("offline")) return "Offline";
  return "Online";
};

const detectCategory = (c: { target_exam: string | null; name: string; description: string | null }) => {
  const h = `${c.target_exam ?? ""} ${c.name} ${c.description ?? ""}`.toLowerCase();
  if (h.includes("neet")) return "NEET";
  if (h.includes("foundation")) return "Pre Foundation";
  if (h.includes("jee") || h.includes("iit")) return "IIT-JEE";
  return c.target_exam || "JEE";
};

const CourseDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { course, chapters, pdfs, loading } = useCourseDetail(slug);
  const [expandedChapter, setExpandedChapter] = useState(0);
  const [enrollment, setEnrollment] = useState<EnrollmentInfo | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [completedSlugs, setCompletedSlugs] = useState<Set<string>>(new Set());

  const enrolled = !!enrollment;

  useEffect(() => {
    if (!user || !course) {
      setEnrollment(null);
      setCompletedSlugs(new Set());
      return;
    }
    (async () => {
      const { data: enr } = await supabase
        .from("enrollments")
        .select("id, progress_percent, completed_lessons, last_lesson_title, last_accessed_at")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .eq("is_active", true)
        .maybeSingle();
      setEnrollment(enr as EnrollmentInfo | null);

      if (enr) {
        const { data: prog } = await supabase
          .from("lesson_progress")
          .select("lesson_slug, is_completed")
          .eq("user_id", user.id)
          .eq("course_id", course.id);
        setCompletedSlugs(new Set((prog ?? []).filter((p) => p.is_completed).map((p) => p.lesson_slug)));
      }
    })();
  }, [user, course]);

  const flatLessons = useMemo(() => chapters.flatMap((c) => c.lessons), [chapters]);
  const totalLessons = flatLessons.length;
  const completedCount = flatLessons.filter((l) => completedSlugs.has(l.slug)).length;
  const totalHours = course?.duration_hours || 120;
  const progressPercent = enrollment?.progress_percent ?? 0;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-black text-foreground">Course not found</h1>
        <Link to="/courses" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to courses
        </Link>
      </div>
    );
  }

  const mode = detectMode(course);
  const category = detectCategory(course);
  const subjects = course.subject
    ? course.subject.split(/[,/]/).map((s) => s.trim()).filter(Boolean)
    : ["Physics", "Chemistry", "Mathematics"];

  const educationLevel = course.target_exam?.toLowerCase().includes("foundation")
    ? "Class 9th–10th"
    : "Class 11th–12th";

  const includes = [
    { icon: GraduationCap, label: "Education Level", value: educationLevel },
    { icon: Clock, label: "Duration", value: `${totalHours >= 100 ? "Up to 12 Months" : `${totalHours} hrs`}` },
    { icon: Video, label: "Mode", value: mode },
    { icon: BookOpen, label: "Language", value: "English / Hindi" },
  ];

  const courseAny = course as unknown as { what_youll_learn?: string[] | null; requirements?: string[] | null };
  const whyChoose = (courseAny.what_youll_learn && courseAny.what_youll_learn.length > 0)
    ? courseAny.what_youll_learn
    : [
        "India's most trusted IIT-JEE coaching institute",
        "Highly experienced faculty with a proven success record",
        "Intensive classroom teaching with concept-based learning",
        "Regular doubt-solving sessions and mentorship support",
        "Weekly tests with performance analysis and ranking",
        "Proven study material and structured curriculum",
      ];

  const handleEnrollClick = () => {
    if (!user) {
      toast.info("Please sign in to enroll");
      navigate("/login");
      return;
    }
    if (enrolled) {
      navigate(`/courses/${course.slug}/learn`);
      return;
    }
    setEnrollOpen(true);
  };

  const handleConfirmEnroll = async () => {
    if (!user || !course) return;
    setEnrolling(true);
    const { data, error } = await supabase
      .from("enrollments")
      .insert({ user_id: user.id, course_id: course.id, is_active: true })
      .select("id, progress_percent, completed_lessons, last_lesson_title, last_accessed_at")
      .maybeSingle();
    setEnrolling(false);
    if (error) {
      toast.error(error.message || "Could not enroll");
      return;
    }
    setEnrollment(data as EnrollmentInfo);
    setEnrollOpen(false);
    toast.success("You're enrolled! Start learning anytime.");
  };

  const discount =
    course.original_price && course.original_price > course.price
      ? Math.round(((Number(course.original_price) - Number(course.price)) / Number(course.original_price)) * 100)
      : course.discount_percent || 0;

  const price = Number(course.price);
  const firstInstallment = Math.round(price * 0.75);
  const secondInstallment = price - firstInstallment;

  return (
    <div className="bg-background pb-16">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-3 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">Home</Link>
          {" / "}
          <Link to="/courses" className="hover:text-primary">Courses</Link>
          {" / "}
          <span className="text-foreground font-medium">{course.name}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-8">
        {/* LEFT COLUMN */}
        <div className="min-w-0 space-y-8">
          {/* Mode + Category chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--navy))] px-3 py-1.5 text-xs font-bold text-white">
              <Video className="h-3.5 w-3.5" /> {mode}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
              <Tag className="h-3.5 w-3.5" /> Category: {category}
            </span>
            {enrolled && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary/15 px-3 py-1.5 text-xs font-bold text-secondary">
                <CheckCircle2 className="h-3.5 w-3.5" /> Enrolled
              </span>
            )}
          </div>

          {/* Title + intro */}
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-black text-foreground leading-tight">
              {course.name}
            </h1>
            {course.description && (
              <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl">
                {course.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                <strong className="text-foreground">{Number(course.rating || 4.8).toFixed(1)}</strong>
                <span>({(course.total_enrolled || 2100).toLocaleString()} reviews)</span>
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-primary" /> {(course.total_enrolled || 12400).toLocaleString()} enrolled
              </span>
            </div>
          </div>

          {/* Subjects Covered */}
          <section>
            <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-3">Subjects Covered</h3>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <span key={s} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
                  {s}
                </span>
              ))}
            </div>
          </section>

          {/* This Course Includes */}
          <section>
            <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-3">This Course Includes</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {includes.map((it) => (
                <div key={it.label} className="rounded-2xl border border-border bg-card p-4">
                  <it.icon className="h-5 w-5 text-primary mb-2" />
                  <p className="text-[11px] text-muted-foreground">{it.label}</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{it.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Enrolled progress (only if enrolled) */}
          {enrolled && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-bold text-foreground">Your progress</p>
                  <p className="text-xs text-muted-foreground">{completedCount} of {totalLessons} lessons completed</p>
                </div>
                <button
                  onClick={() => navigate(`/courses/${course.slug}/learn`)}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-dark transition-colors"
                >
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-2 bg-secondary transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
            </section>
          )}

          {/* Know Your Teachers */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display text-lg font-black text-foreground mb-4">Know Your Teachers</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {FALLBACK_TEACHERS.map((t) => (
                <div key={t.name} className="rounded-xl border border-border bg-background overflow-hidden">
                  <div className="aspect-square bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center">
                    <span className="font-display text-2xl font-black text-primary">
                      {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold text-foreground truncate">{t.name}</p>
                    <div className="flex items-center justify-between gap-1 mt-1">
                      <p className="text-[11px] text-muted-foreground truncate">{t.subject}</p>
                      <span className="text-[10px] font-bold rounded-full bg-primary/10 text-primary px-1.5 py-0.5 shrink-0">
                        {t.years}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Know More Details */}
          <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-display text-lg font-black text-foreground">Know More Details</h3>
            <div>
              <p className="text-sm font-bold text-foreground">{course.name} — Bansal Classes Kota</p>
              <p className="text-xs text-primary mt-1">{mode} Classroom Program · {category}</p>
              <p className="text-xs text-foreground mt-1">
                <span className="font-bold">Target:</span> {category} 2028 ·
                <span className="font-bold"> Duration:</span> 1 Year ·
                <span className="font-bold"> Commencement:</span> 01/04/2026
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <DetailRow label="Course Name" value={course.name} />
              <DetailRow label="Eligibility" value="Class X Pass" />
              <DetailRow label="Mode" value={`${mode} Classroom Coaching`} />
              <DetailRow label="Location" value="Bansal Classes, Kota" icon={MapPin} />
              <DetailRow label="Target Exam" value={`${category} — 2028`} />
              <DetailRow label="Admission Process" value="Direct / BOOST" icon={BadgeCheck} />
            </div>

            <div>
              <p className="text-sm font-bold text-foreground mb-1.5">Fee Structure:</p>
              <p className="text-xs text-foreground">
                Actual Fee (Incl. GST): <span className="font-bold text-primary">₹{price.toLocaleString()}/-</span>{" "}
                <span className="text-muted-foreground">[Fees may vary from centre to centre]</span>
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-muted-foreground">1st Installment</p>
                  <p className="font-bold text-foreground">₹{firstInstallment.toLocaleString()}/-</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-muted-foreground">2nd Installment</p>
                  <p className="font-bold text-foreground">₹{secondInstallment.toLocaleString()}/-</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-foreground mb-2">Why Choose this Batch at Bansal Classes?</p>
              <ul className="space-y-1.5">
                {whyChoose.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Commencement Dates */}
          <section>
            <h3 className="font-display text-xl font-black text-foreground mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Class Commencement Dates
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-xs min-w-[640px]">
                <thead className="bg-muted/40">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2.5 font-bold">Stream</th>
                    <th className="px-3 py-2.5 font-bold">Phase</th>
                    <th className="px-3 py-2.5 font-bold">Medium</th>
                    <th className="px-3 py-2.5 font-bold">Target</th>
                    <th className="px-3 py-2.5 font-bold">Eligibility</th>
                    <th className="px-3 py-2.5 font-bold">Admission Mode</th>
                    <th className="px-3 py-2.5 font-bold">Commencement</th>
                  </tr>
                </thead>
                <tbody>
                  {FALLBACK_COMMENCEMENT.map((r, i) => (
                    <tr key={i} className="border-t border-border text-foreground">
                      <td className="px-3 py-3">{r.stream}</td>
                      <td className="px-3 py-3">{r.phase}</td>
                      <td className="px-3 py-3">{r.medium}</td>
                      <td className="px-3 py-3">{r.target}</td>
                      <td className="px-3 py-3">{r.eligibility}</td>
                      <td className="px-3 py-3">{r.mode}</td>
                      <td className="px-3 py-3 font-bold text-primary">{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Scholarships */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="bg-primary/10 px-4 py-3">
                <p className="font-display text-sm font-black text-foreground">Scholarship — Board Performance</p>
                <p className="text-[11px] text-muted-foreground">For 10th Pass Students</p>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-muted/30">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-4 py-2 font-bold">Board %</th>
                    <th className="px-4 py-2 font-bold text-right">Scholarship</th>
                  </tr>
                </thead>
                <tbody>
                  {BOARD_SCHOLARSHIPS.map((s) => (
                    <tr key={s.range} className="border-t border-border text-foreground">
                      <td className="px-4 py-2.5">{s.range}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-primary">{s.pct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="bg-primary/10 px-4 py-3">
                <p className="font-display text-sm font-black text-foreground">Scholarship — Olympiads</p>
                <p className="text-[11px] text-muted-foreground">For Class XI / XII admissions, Session 2025–26</p>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {OLYMPIAD_SCHOLARSHIPS.map((s) => (
                    <tr key={s.label} className="border-t border-border text-foreground first:border-t-0">
                      <td className="px-4 py-2.5 pr-2 leading-snug">{s.label}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-primary whitespace-nowrap">{s.pct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Curriculum (if any) */}
          {chapters.length > 0 && (
            <section>
              <h3 className="font-display text-xl font-black text-foreground mb-3">Curriculum</h3>
              <div className="space-y-3">
                {chapters.map((ch, i) => (
                  <div key={ch.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                    <button
                      onClick={() => setExpandedChapter(expandedChapter === i ? -1 : i)}
                      className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-sm font-bold text-foreground text-left">{ch.title}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{ch.lessons.length} lessons</span>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedChapter === i ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    {expandedChapter === i && (
                      <div className="border-t border-border px-4 py-2 space-y-1">
                        {ch.lessons.map((l) => {
                          const isDone = completedSlugs.has(l.slug);
                          return (
                            <div key={l.id} className="flex items-center gap-2 text-sm py-2 pl-2">
                              {isDone ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
                              ) : enrolled || l.is_free_preview ? (
                                <Play className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              <span className={`flex-1 ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                {l.title}
                              </span>
                              <span className="text-xs text-muted-foreground">{Math.round(l.duration_seconds / 60)} min</span>
                              {l.is_free_preview && (
                                <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">FREE</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* PDFs */}
          {pdfs.length > 0 && (
            <section>
              <h3 className="font-display text-xl font-black text-foreground mb-3">PDF Notes</h3>
              <div className="space-y-2">
                {pdfs.map((pdf) => (
                  <div key={pdf.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{pdf.title}</p>
                      <p className="text-[11px] text-muted-foreground">PDF{pdf.size_bytes ? ` · ${formatBytes(pdf.size_bytes)}` : ""}</p>
                    </div>
                    {enrolled ? (
                      <a href={pdf.file_url} download target="_blank" rel="noopener noreferrer"
                        className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-dark transition-colors shrink-0">
                        Download
                      </a>
                    ) : (
                      <span className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground shrink-0">
                        <Lock className="h-3.5 w-3.5" /> Enroll
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <CourseReviews courseId={course.id} enrolled={enrolled} />
        </div>

        {/* RIGHT COLUMN */}
        <aside className="lg:sticky lg:top-24 self-start space-y-4">
          {/* Banner + payment card */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="aspect-[4/3] bg-gradient-to-br from-[hsl(var(--navy))] to-[hsl(var(--navy2))] flex items-center justify-center overflow-hidden">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course.name} className="h-full w-full object-contain p-3" />
              ) : (
                <div className="text-center text-white px-4">
                  <p className="font-display text-3xl font-black text-primary">{category}</p>
                  <p className="font-display text-xl font-black mt-1">{course.name}</p>
                </div>
              )}
            </div>

            <div className="p-5 space-y-4">
              {/* Price */}
              <div className="flex items-baseline gap-2 flex-wrap">
                {course.original_price && course.original_price > course.price && (
                  <span className="text-sm text-muted-foreground line-through">
                    ₹{Number(course.original_price).toLocaleString()}
                  </span>
                )}
                <span className="font-display text-2xl font-black text-foreground">
                  ₹{price.toLocaleString()}
                </span>
                {discount > 0 && (
                  <span className="text-xs font-bold text-destructive">{discount}% Off</span>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-bold text-foreground mb-3">Payment Details</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price</span>
                    <span className="text-foreground">₹{price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coupon Discount</span>
                    <span className="text-foreground">- ₹0</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 mt-2">
                    <span className="font-bold text-foreground">Total Payable</span>
                    <span className="font-bold text-foreground">₹{price.toLocaleString()}.00</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleEnrollClick}
                className="w-full rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                {enrolled ? `Continue Learning` : `Pay Now ₹${price.toLocaleString()}.00`}
              </button>

              <button className="w-full text-center text-xs font-semibold text-primary hover:underline">
                View Coupon Code &gt;
              </button>

              {/* Trust strip */}
              <div className="flex items-center justify-center gap-2 pt-2">
                {["VISA", "MC", "PayPal", "GPay", "UPI"].map((p) => (
                  <span key={p} className="rounded-md border border-border bg-background px-2 py-1 text-[10px] font-bold text-muted-foreground">
                    {p}
                  </span>
                ))}
              </div>
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Safe and secure payment · 100% authentic
              </p>
            </div>
          </div>

          {/* Our Services */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="font-display text-sm font-black text-center text-foreground mb-4">Our Services</p>
            <div className="grid grid-cols-3 gap-3">
              {SERVICES.map((s) => (
                <div key={s.label} className="flex flex-col items-center text-center gap-1.5">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-[10px] font-semibold text-foreground leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Enroll dialog */}
      <Dialog open={enrollOpen} onOpenChange={(o) => !enrolling && setEnrollOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Confirm Enrollment</DialogTitle>
            <DialogDescription>
              Confirm your enrollment in{" "}
              <span className="font-semibold text-foreground">{course.name}</span>. Online payments are coming soon —
              for now you'll be enrolled in demo mode and can start learning immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-muted/40 p-3 text-xs text-foreground space-y-1">
            <p><span className="text-muted-foreground">Course:</span> {course.name}</p>
            <p><span className="text-muted-foreground">Price:</span> ₹{price.toLocaleString()}</p>
            <p className="flex items-center gap-1.5"><CreditCard className="h-3 w-3 text-muted-foreground" /> Demo payment flow</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" asChild disabled={enrolling}>
              <Link to="/contact">Contact Support</Link>
            </Button>
            <Button onClick={handleConfirmEnroll} disabled={enrolling}>
              {enrolling ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Enrolling…</>) : (<>Mark as Enrolled</>)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailRow = ({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Video }) => (
  <div className="flex items-start gap-1.5">
    {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />}
    <p className="text-foreground">
      <span className="font-bold">{label}:</span> <span className="text-muted-foreground">{value}</span>
    </p>
  </div>
);

export default CourseDetailPage;
