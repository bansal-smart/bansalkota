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
import { useBoostSettings } from "@/hooks/useBoostSettings";
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
import CourseEnquiryDialog from "@/components/CourseEnquiryDialog";
import { Sparkles } from "lucide-react";

type EnrollmentInfo = {
  id: string;
  progress_percent: number;
  completed_lessons: number;
  last_lesson_title: string | null;
  last_accessed_at: string | null;
};

// ----- Fallback data (Bansal-styled demo) -----

export const SERVICE_OPTIONS = [
  { key: "study_material", icon: BookOpen, label: "Study Material" },
  { key: "recorded_lectures", icon: Video, label: "Recorded Lectures" },
  { key: "test_series", icon: ClipboardList, label: "Test Series" },
  { key: "t_shirt", icon: Shirt, label: "T-Shirt" },
  { key: "umbrella", icon: Umbrella, label: "Umbrella" },
  { key: "doubt_classes", icon: HelpCircle, label: "Doubt Classes" },
  { key: "bag", icon: Backpack, label: "Bag" },
] as const;


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
  const boost = useBoostSettings();

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

  const mode = course.mode || detectMode(course);
  const category = detectCategory(course);
  const subjects =
    course.subjects_covered && course.subjects_covered.length > 0
      ? course.subjects_covered
      : course.subject
      ? course.subject
          .split(/[,/]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : ["Physics", "Chemistry", "Mathematics"];

  const educationLevel =
    course.education_level ||
    (course.target_exam?.toLowerCase().includes("foundation") ? "Class 9th–10th" : "Class 11th–12th");

  const durationLabel =
    course.duration_label || `${totalHours >= 100 ? "Up to 12 Months" : `${totalHours} hrs`}`;
  const languageLabel = course.language || "English / Hindi";

  const includes = [
    { icon: GraduationCap, label: "Education Level", value: educationLevel },
    { icon: Clock, label: "Duration", value: durationLabel },
    { icon: Video, label: "Mode", value: mode },
    { icon: BookOpen, label: "Language", value: languageLabel },
  ];

  const selectedServices = SERVICE_OPTIONS.filter((s) =>
    (course.included_services ?? []).includes(s.key),
  );


  const courseAny = course as unknown as { what_youll_learn?: string[] | null; requirements?: string[] | null };
  const whyChoose =
    courseAny.what_youll_learn && courseAny.what_youll_learn.length > 0
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
    if (enrolled) {
      navigate(`/courses/${course.slug}/learn`);
      return;
    }
    setEnrollOpen(true);
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
          <Link to="/" className="hover:text-primary">
            Home
          </Link>
          {" / "}
          <Link to="/courses" className="hover:text-primary">
            Courses
          </Link>
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
            {(course.short_description || course.description) && (
              <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl">
                {course.short_description || course.description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                <strong className="text-foreground">{Number(course.rating || 4.8).toFixed(1)}</strong>
                <span>({(course.total_enrolled || 2100).toLocaleString("en-IN")} reviews)</span>
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-primary" /> {(course.total_enrolled || 12400).toLocaleString("en-IN")}{" "}
                enrolled
              </span>
            </div>
          </div>

          {/* Subjects Covered */}
          <section>
            <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-3">Subjects Covered</h3>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
          </section>

          {/* This Course Includes */}
          <section>
            <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-3">
              This Course Includes
            </h3>
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
                  <p className="text-xs text-muted-foreground">
                    {completedCount} of {totalLessons} lessons completed
                  </p>
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

          {/* BOOST Scholarship Strip */}
          <section className="relative overflow-hidden rounded-2xl bg-bansal-blue text-white">
            <div className="absolute inset-0 grid-texture opacity-50" />
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-bansal-orange/20 blur-3xl" />
            <div className="relative px-5 py-6 sm:px-6 sm:py-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <span className="inline-flex items-center rounded-full bg-bansal-orange px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                    BOOST 2026
                  </span>
                  <h3 className="mt-3 font-display text-xl font-extrabold leading-tight sm:text-2xl">
                    Bansal Open Opportunity Scholarship Test
                  </h3>
                  <p className="mt-2 text-sm text-white/85">
                    Up to <span className="font-bold text-bansal-orange">90% Scholarship</span>. Open to Class V to XII. Just{" "}
                    <span className="font-bold text-bansal-orange">₹{boost.priceInr}</span> to register.
                  </p>
                  {boost.examDateLabels.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {boost.examDateLabels.map((d) => (
                        <span key={d} className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <Link
                    to="/boost"
                    className="inline-flex items-center gap-2 rounded-lg bg-bansal-orange px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-bansal-orange-dark"
                  >
                    Explore Now <ArrowRight className="h-4 w-4" />
                  </Link>
                  {boost.applyBeforeLabel && (
                    <p className="mt-2 text-[11px] text-white/70">{boost.applyBeforeLabel}</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Know More Details */}
          <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-display text-lg font-black text-foreground">Know More Details</h3>

            {course.description_html ? (
              <div
                className="prose prose-sm max-w-none prose-headings:font-display prose-headings:text-foreground prose-headings:mt-6 prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground [&_p:empty]:block [&_p:empty]:h-4 [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1"
                dangerouslySetInnerHTML={{ __html: course.description_html }}
              />
            ) : (
              <>
                <div>
                  <p className="text-sm font-bold text-foreground">{course.name} — Bansal Classes Kota</p>
                  <p className="text-xs text-primary mt-1">
                    {mode} Classroom Program · {category}
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
                    Actual Fee (Incl. GST): <span className="font-bold text-primary">₹{price.toLocaleString("en-IN")}/-</span>{" "}
                    <span className="text-muted-foreground">[Fees may vary from centre to centre]</span>
                  </p>
                </div>
              </>
            )}

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
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${expandedChapter === i ? "rotate-180" : ""}`}
                        />
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
                              <span
                                className={`flex-1 ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}
                              >
                                {l.title}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {Math.round(l.duration_seconds / 60)} min
                              </span>
                              {l.is_free_preview && (
                                <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">
                                  FREE
                                </span>
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
                      <p className="text-[11px] text-muted-foreground">
                        PDF{pdf.size_bytes ? ` · ${formatBytes(pdf.size_bytes)}` : ""}
                      </p>
                    </div>
                    {enrolled ? (
                      <a
                        href={pdf.file_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-dark transition-colors shrink-0"
                      >
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
            <div className="bg-gradient-to-br from-[hsl(var(--navy))] to-[hsl(var(--navy2))] flex items-center justify-center overflow-hidden">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course.name} className="w-full h-auto object-contain" />
              ) : (
                <div className="text-center text-white px-4 aspect-[4/3] flex flex-col items-center justify-center w-full">
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
                    ₹{Number(course.original_price).toLocaleString("en-IN")}
                  </span>
                )}
                <span className="font-display text-2xl font-black text-foreground">₹{price.toLocaleString("en-IN")}</span>
                {discount > 0 && <span className="text-xs font-bold text-destructive">{discount}% Off</span>}
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-bold text-foreground mb-3">Payment Details</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price</span>
                    <span className="text-foreground">₹{price.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coupon Discount</span>
                    <span className="text-foreground">- ₹0</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 mt-2">
                    <span className="font-bold text-foreground">Total Payable</span>
                    <span className="font-bold text-foreground">₹{price.toLocaleString("en-IN")}.00</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleEnrollClick}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                {enrolled ? `Continue Learning` : `Enroll Now`}
              </button>

              {/* Trust strip */}
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Safe and secure payment · 100% authentic
              </p>
            </div>
          </div>

          {/* Course Includes */}
          {selectedServices.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="font-display text-sm font-black text-center text-foreground mb-4">Course Includes</p>
              <div className="grid grid-cols-3 gap-3">
                {selectedServices.map((s) => (
                  <div key={s.key} className="flex flex-col items-center text-center gap-1.5">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <s.icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-[10px] font-semibold text-foreground leading-tight">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </aside>
      </div>

      {/* Enrollment enquiry + payment dialog */}
      <CourseEnquiryDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        course={{ id: course.id, name: course.name, price: course.price }}
      />
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
