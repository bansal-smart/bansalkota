import { useEffect, useState } from "react";
import {
  Play,
  CheckCircle2,
  Star,
  Users,
  Clock,
  ShieldCheck,
  Heart,
  ChevronDown,
  Loader2,
  Lock,
  FileText,
  Video,
  ClipboardCheck,
  Timer,
  AlertCircle,
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

const CourseDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { course, chapters, loading } = useCourseDetail(slug);
  const [activeTab, setActiveTab] = useState(0);
  const [expandedChapter, setExpandedChapter] = useState(0);
  const [enrolled, setEnrolled] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);

  useEffect(() => {
    if (!user || !course) return;
    supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => setEnrolled(!!data));
  }, [user, course]);

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

  const totalLessons = chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);
  const totalMinutes = Math.round(
    chapters.reduce((sum, ch) => sum + ch.lessons.reduce((s, l) => s + l.duration_seconds, 0), 0) /
      60,
  );
  const totalHours = course.duration_hours || Math.max(1, Math.floor(totalMinutes / 60));

  const initials = course.educator_name
    ? course.educator_name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase())
        .join("")
    : "ED";

  const tabs = ["About", "Lectures", "Tests", "PDF Notes", "Time"];

  const stats = [
    { value: String(totalLessons || 32), label: "Lectures" },
    { value: "12", label: "Tests" },
    { value: "18", label: "PDFs" },
    { value: `${totalHours}h`, label: "Total Time" },
    { value: `${Number(course.rating || 4.8).toFixed(1)}★`, label: "Rating" },
  ];

  const whatYoullLearn = [
    "Core fundamentals and theory",
    "Problem-solving techniques",
    "Formula derivations explained",
    "JEE/NEET exam strategies",
    "Previous year paper analysis",
    "Topic-wise revision shortcuts",
    "Conceptual clarity exercises",
    "Formula cheats and quick notes",
  ];

  const requirements = [
    "Class 11/12 mathematics background",
    "Basic algebra and calculus",
    "Curiosity and dedication",
  ];

  const includes = [
    `${totalLessons || 32} video lectures`,
    "12 practice tests",
    "18 PDF notes",
    "Lifetime access",
    "Certificate of completion",
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

  const discount =
    course.original_price && course.original_price > course.price
      ? Math.round(((Number(course.original_price) - Number(course.price)) / Number(course.original_price)) * 100)
      : course.discount_percent || 0;

  return (
    <div className="bg-background pb-16">
      {/* Hero */}
      <section className="border-b border-border bg-[hsl(var(--muted))]/30">
        <div className="container mx-auto px-4 py-6">
          <div className="text-xs text-muted-foreground mb-4">
            <Link to="/" className="hover:text-primary">Home</Link>
            {" / "}
            <Link to="/courses" className="hover:text-primary">Courses</Link>
            {" / "}
            <span className="text-foreground font-medium">{course.name}</span>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Thumbnail */}
            <div className="w-full md:w-72 shrink-0">
              <div className="aspect-video rounded-2xl border-2 border-dashed border-border bg-card flex items-center justify-center overflow-hidden">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">course image</span>
                )}
              </div>
            </div>

            {/* Title + meta */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-2">
                {course.subject}
                {course.target_exam ? ` · ${course.target_exam}` : ""}
              </p>
              <h1 className="font-display text-3xl md:text-4xl font-black text-foreground leading-tight">
                {course.name}
              </h1>
              {course.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
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
                  <Users className="h-3.5 w-3.5 text-primary" />
                  {(course.total_enrolled || 12400).toLocaleString()} enrolled
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  {totalHours} hrs
                </span>
                {course.badge && (
                  <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
                    {course.badge}
                  </span>
                )}
                <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary" /> Ongoing
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-[10px] font-black text-primary-foreground">
                  {initials}
                </div>
                <p className="text-xs text-muted-foreground">
                  By <span className="font-semibold text-foreground">{course.educator_name}</span>
                  {" · "}
                  <span>{course.subject} Department</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <div className="min-w-0">
          {/* Tabs */}
          <div className="flex gap-6 border-b border-border overflow-x-auto">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`pb-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                  i === activeTab
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* About */}
          {activeTab === 0 && (
            <div className="mt-6 space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl border border-border bg-card p-4 text-center"
                  >
                    <p className="font-display text-2xl font-black text-foreground">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground mb-2">
                  About this course
                </h3>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {course.description ||
                    "Full course description text explaining the scope, depth, and approach of this course. Students will learn everything from foundational principles to advanced applications through a mix of video lectures, practice tests, and downloadable notes."}
                </p>
              </div>

              <div>
                <h3 className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground mb-3">
                  What you'll learn
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {whatYoullLearn.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="text-muted-foreground mt-0.5">—</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground mb-3">
                  Requirements
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {requirements.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="text-muted-foreground mt-0.5">—</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Lectures */}
          {activeTab === 1 && (
            <div className="mt-6 space-y-2">
              {chapters.length === 0 ? (
                <p className="text-sm text-muted-foreground">No lectures published yet.</p>
              ) : (
                chapters.map((ch, i) => (
                  <div key={ch.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                    <button
                      onClick={() => setExpandedChapter(expandedChapter === i ? -1 : i)}
                      className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-sm font-bold text-foreground text-left">{ch.title}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{ch.lessons.length} lessons</span>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            expandedChapter === i ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>
                    {expandedChapter === i && (
                      <div className="border-t border-border px-4 py-2 space-y-1">
                        {ch.lessons.map((l) => (
                          <div
                            key={l.id}
                            className="flex items-center gap-2 text-sm text-muted-foreground py-2 pl-2"
                          >
                            {enrolled || l.is_free_preview ? (
                              <Play className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Lock className="h-3.5 w-3.5" />
                            )}
                            <span className="flex-1 text-foreground">{l.title}</span>
                            <span className="text-xs">{Math.round(l.duration_seconds / 60)} min</span>
                            {l.is_free_preview && (
                              <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">
                                FREE
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tests / PDFs / Time placeholders */}
          {activeTab === 2 && (
            <EmptyTab icon={ClipboardCheck} title="Practice Tests" description="Topic-wise and full-length mock tests will appear here once published." />
          )}
          {activeTab === 3 && (
            <EmptyTab icon={FileText} title="PDF Notes" description="Downloadable notes and formula sheets will be available here." />
          )}
          {activeTab === 4 && (
            <EmptyTab icon={Timer} title="Course Schedule" description="Live class schedule and session timings will be listed here." />
          )}
        </div>

        {/* Sticky purchase card */}
        <aside className="lg:sticky lg:top-24 self-start">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="aspect-video rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground overflow-hidden">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt="preview" className="h-full w-full object-cover" />
              ) : (
                "course preview"
              )}
            </div>

            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-display text-3xl font-black text-foreground">
                ₹{Number(course.price).toLocaleString()}
              </span>
              {course.original_price && course.original_price > course.price && (
                <span className="text-sm text-muted-foreground line-through">
                  ₹{Number(course.original_price).toLocaleString()}
                </span>
              )}
              {discount > 0 && (
                <span className="ml-auto rounded-full bg-secondary/10 px-2 py-0.5 text-[11px] font-bold text-secondary">
                  {discount}% OFF
                </span>
              )}
            </div>

            <p className="flex items-center gap-1.5 text-[11px] text-destructive">
              <AlertCircle className="h-3 w-3" /> 2 days left at this price
            </p>

            <button
              onClick={handleEnrollClick}
              className="w-full rounded-xl bg-foreground py-3 text-sm font-bold text-background hover:opacity-90 transition-opacity"
            >
              {enrolled ? "Continue Learning →" : "Enroll Now →"}
            </button>

            <button className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors flex items-center justify-center gap-2">
              <Heart className="h-4 w-4" /> Add to Wishlist
            </button>

            <div className="pt-3 border-t border-border space-y-2">
              <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
                This course includes
              </p>
              {includes.map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
                  {item}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              7-day money-back guarantee
            </div>
          </div>
        </aside>
      </div>

      {/* Payment coming soon dialog */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Payments coming soon</DialogTitle>
            <DialogDescription>
              Online payment integration is not yet enabled. To enroll in{" "}
              <span className="font-semibold text-foreground">{course.name}</span>, please contact
              our support team and we'll get you set up manually.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-muted/40 p-3 text-xs text-foreground space-y-1">
            <p>
              <span className="text-muted-foreground">Email:</span>{" "}
              <a className="text-primary font-semibold" href="mailto:support@arke.pro">
                support@arke.pro
              </a>
            </p>
            <p>
              <span className="text-muted-foreground">Course:</span> {course.name}
            </p>
            <p>
              <span className="text-muted-foreground">Price:</span> ₹
              {Number(course.price).toLocaleString()}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>
              Close
            </Button>
            <Button asChild>
              <Link to="/contact">Contact Support</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const EmptyTab = ({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Video;
  title: string;
  description: string;
}) => (
  <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
    <Icon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
    <h4 className="font-display text-base font-bold text-foreground">{title}</h4>
    <p className="text-xs text-muted-foreground mt-1">{description}</p>
  </div>
);

export default CourseDetailPage;
