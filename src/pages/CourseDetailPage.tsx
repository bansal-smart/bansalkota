import { useEffect, useState } from "react";
import { Play, CheckCircle2, Video, ClipboardCheck, FileText, Shield, Share2, Heart, ChevronDown, Loader2, Lock } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useCourseDetail } from "@/hooks/useCourseDetail";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import EnrollmentModal from "@/components/EnrollmentModal";

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
      <div className="p-10 text-center">
        <h1 className="font-display text-xl font-black text-foreground">Course not found</h1>
        <Link to="/courses" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to courses
        </Link>
      </div>
    );
  }

  const tabs = ["About", "Syllabus"];
  const totalLessons = chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);
  const totalMinutes = Math.round(chapters.reduce((sum, ch) => sum + ch.lessons.reduce((s, l) => s + l.duration_seconds, 0), 0) / 60);
  const previewLesson = chapters[0]?.lessons.find((l) => l.is_free_preview) ?? chapters[0]?.lessons[0];

  const highlights = [
    { icon: Video, label: `${totalLessons} Lectures`, value: String(totalLessons) },
    { icon: ClipboardCheck, label: "Tests", value: "30" },
    { icon: FileText, label: "PDF Notes", value: "50+" },
    { icon: Play, label: `${Math.floor(totalMinutes / 60)}h Total`, value: `${Math.floor(totalMinutes / 60)}h` },
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

  return (
    <div className="pb-20 lg:pb-0">
      <div className="px-4 py-3 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-primary">
          Home
        </Link>{" "}
        /{" "}
        <Link to="/courses" className="hover:text-primary">
          Courses
        </Link>{" "}
        / <span className="text-foreground font-medium">{course.name}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 px-4 lg:px-6">
        <div className="flex-1 space-y-5">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark relative h-52 flex items-center justify-center overflow-hidden">
            {previewLesson?.video_url && previewLesson.is_free_preview ? (
              <video src={previewLesson.video_url} controls className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <button className="h-16 w-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors">
                <Play className="h-7 w-7 text-white ml-1" />
              </button>
            )}
          </div>

          <div className="flex gap-4 border-b border-border">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`pb-3 text-sm font-semibold transition-colors ${i === activeTab ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 0 && (
            <div className="space-y-5">
              <div className="grid grid-cols-4 gap-3">
                {highlights.map((h) => (
                  <div key={h.label} className="rounded-xl border border-border p-3 text-center">
                    <h.icon className="h-5 w-5 text-primary mx-auto mb-1" />
                    <p className="text-xs font-bold text-foreground">{h.value}</p>
                    <p className="text-[10px] text-muted-foreground">{h.label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-bold font-display text-foreground mb-3">About this course</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{course.description || "No description provided yet."}</p>
              </div>
            </div>
          )}

          {activeTab === 1 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-bold font-display text-foreground mb-3">Syllabus</h3>
              <div className="space-y-2">
                {chapters.map((ch, i) => (
                  <div key={ch.id} className="rounded-xl border border-border overflow-hidden">
                    <button
                      onClick={() => setExpandedChapter(expandedChapter === i ? -1 : i)}
                      className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-xs font-bold text-foreground text-left">{ch.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{ch.lessons.length} lessons</span>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedChapter === i ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    {expandedChapter === i && (
                      <div className="border-t border-border px-4 py-2 space-y-1">
                        {ch.lessons.map((l) => (
                          <div key={l.id} className="flex items-center gap-2 text-xs text-muted-foreground py-1.5 pl-2">
                            {enrolled || l.is_free_preview ? <Play className="h-3 w-3 text-primary" /> : <Lock className="h-3 w-3" />}
                            <span className="flex-1">{l.title}</span>
                            <span className="text-[10px]">{Math.round(l.duration_seconds / 60)} min</span>
                            {l.is_free_preview && (
                              <span className="rounded-full bg-secondary/10 px-1.5 py-0.5 text-[9px] font-bold text-secondary">FREE</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:w-[300px] shrink-0">
          <div className="sticky top-[70px] rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold font-display text-foreground">{course.name}</h3>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-black font-display text-foreground">₹{Number(course.price).toLocaleString()}</span>
              {course.original_price && course.original_price > course.price && (
                <span className="text-sm text-muted-foreground line-through">₹{Number(course.original_price).toLocaleString()}</span>
              )}
            </div>
            {!!course.discount_percent && course.discount_percent > 0 && (
              <span className="inline-block rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">{course.discount_percent}% OFF</span>
            )}

            <button
              onClick={handleEnrollClick}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary-dark transition-colors"
            >
              {enrolled ? "Continue Learning" : "Enroll Now"}
            </button>

            <div className="space-y-2 pt-2 border-t border-border">
              {[`${totalLessons} Lectures`, `${Math.floor(totalMinutes / 60)}h Total content`, "PDF Notes", "Doubt Support"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
                  {item}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-2 border-t border-border">
              <Shield className="h-3 w-3" /> 7-day money-back guarantee
            </div>

            <div className="flex gap-3 pt-2">
              <button className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-muted/30 flex items-center justify-center gap-1">
                <Share2 className="h-3 w-3" /> Share
              </button>
              <button className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-muted/30 flex items-center justify-center gap-1">
                <Heart className="h-3 w-3" /> Wishlist
              </button>
            </div>
          </div>
        </div>
      </div>

      <EnrollmentModal
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        courseId={course.id}
        courseName={course.name}
        coursePrice={Number(course.price)}
        onEnrolled={() => {
          setEnrolled(true);
          setEnrollOpen(false);
          navigate(`/courses/${course.slug}/learn`);
        }}
      />
    </div>
  );
};

export default CourseDetailPage;
