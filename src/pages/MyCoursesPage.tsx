import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, Play, Clock, Star, ArrowRight, Sparkles, GraduationCap, Trophy, Zap, FlaskConical, Compass, Atom, Loader2 } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import { toast } from "sonner";

type Course = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  subject: string;
  educator_name: string;
  thumbnail_url: string | null;
  rating: number;
  total_lessons: number;
  duration_hours: number;
  badge: string | null;
};

type Enrollment = {
  id: string;
  course_id: string;
  progress_percent: number;
  completed_lessons: number;
  last_lesson_title: string | null;
  last_accessed_at: string | null;
  course: Course;
};

const subjectIcon: Record<string, React.ElementType> = {
  Physics: Zap,
  Chemistry: FlaskConical,
  Maths: Compass,
  Biology: Atom,
  All: GraduationCap,
};

const subjectGradient: Record<string, string> = {
  Physics: "from-primary to-primary-dark",
  Chemistry: "from-secondary to-secondary-dark",
  Maths: "from-accent to-primary",
  Biology: "from-secondary to-accent",
  All: "from-primary to-accent",
};

const MyCoursesPage = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("enrollments")
        .select("id, course_id, progress_percent, completed_lessons, last_lesson_title, last_accessed_at, course:courses(*)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("last_accessed_at", { ascending: false, nullsFirst: false });

      if (error) {
        toast.error("Could not load your courses");
        setLoading(false);
        return;
      }
      setEnrollments((data ?? []) as unknown as Enrollment[]);
      setLoading(false);
    };
    load();
  }, [user]);

  if (!user) {
    return (
      <div className="p-6 lg:p-10">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <GraduationCap className="mx-auto mb-3 h-10 w-10 text-primary" />
          <h2 className="font-display text-xl font-black text-foreground">Sign in to see your courses</h2>
          <p className="mt-2 text-sm text-muted-foreground">Track your progress, pick up where you left off, and unlock your full learning dashboard.</p>
          <Link to="/login" className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
            Login <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const continueLearning = enrollments.filter((e) => e.progress_percent < 100).slice(0, 3);
  const allEnrolled = enrollments;
  const completed = enrollments.filter((e) => e.progress_percent >= 100);

  return (
    <div className="pb-20 lg:pb-0">
      <div className="space-y-7 p-4 lg:p-6">
        {/* Header */}
        <div className="animate-fade-in-up">
          <h1 className="font-display text-2xl font-black text-foreground lg:text-3xl">My Learning</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {enrollments.length === 0
              ? "You haven't enrolled in any courses yet — explore the catalog to get started."
              : `${enrollments.length} active course${enrollments.length === 1 ? "" : "s"} · ${completed.length} completed`}
          </p>
        </div>

        {/* Stats strip */}
        {enrollments.length > 0 && (
          <div className="grid grid-cols-3 gap-3 stagger-children">
            <div className="rounded-2xl border border-border bg-card p-4">
              <BookOpen className="mb-1.5 h-5 w-5 text-primary" />
              <p className="font-display text-2xl font-black text-foreground">{enrollments.length}</p>
              <p className="text-xs text-muted-foreground">Enrolled</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <Trophy className="mb-1.5 h-5 w-5 text-secondary" />
              <p className="font-display text-2xl font-black text-foreground">{completed.length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <Sparkles className="mb-1.5 h-5 w-5 text-accent" />
              <p className="font-display text-2xl font-black text-foreground">
                {Math.round(enrollments.reduce((sum, e) => sum + e.progress_percent, 0) / Math.max(enrollments.length, 1))}%
              </p>
              <p className="text-xs text-muted-foreground">Avg Progress</p>
            </div>
          </div>
        )}

        {/* Continue Learning Hero */}
        {continueLearning.length > 0 && (
          <section className="animate-fade-in-up">
            <SectionHeader title="Continue Learning" viewAllLink="/courses" />
            <div className="grid gap-4 lg:grid-cols-3">
              {continueLearning.map((e, idx) => {
                const Icon = subjectIcon[e.course.subject] ?? BookOpen;
                const gradient = subjectGradient[e.course.subject] ?? "from-primary to-accent";
                const isHero = idx === 0;
                return (
                  <Link
                    key={e.id}
                    to={`/courses/${e.course.slug}/learn`}
                    className={`group relative overflow-hidden rounded-2xl border border-border bg-card hover-lift ${isHero ? "lg:col-span-2 lg:row-span-1" : ""}`}
                  >
                    <div className={`bg-gradient-to-br ${gradient} ${isHero ? "h-44 lg:h-56" : "h-32"} relative flex items-center justify-center`}>
                      <Icon className={`text-white/30 ${isHero ? "h-24 w-24" : "h-14 w-14"}`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">{e.course.subject}</p>
                          <p className={`truncate font-display font-black text-white ${isHero ? "text-lg lg:text-xl" : "text-sm"}`}>{e.course.name}</p>
                        </div>
                        <div className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/95 text-primary shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="h-4 w-4 fill-current" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-muted-foreground">{e.course.educator_name}</p>
                      {e.last_lesson_title && (
                        <p className="mt-1 truncate text-xs font-semibold text-foreground">Up next: {e.last_lesson_title}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">{e.progress_percent}% complete</span>
                        <span className="text-[10px] text-muted-foreground">{e.completed_lessons}/{e.course.total_lessons} lessons</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${e.progress_percent}%` }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* All My Courses */}
        <section className="animate-fade-in-up">
          <SectionHeader title="All My Courses" viewAllLink="/courses" />
          {allEnrolled.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="font-display text-lg font-bold text-foreground">No courses yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Browse the catalog to find your perfect batch.</p>
              <Link to="/courses" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
                Explore Courses <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
              {allEnrolled.map((e) => {
                const Icon = subjectIcon[e.course.subject] ?? BookOpen;
                const gradient = subjectGradient[e.course.subject] ?? "from-primary to-accent";
                return (
                  <Link
                    key={e.id}
                    to={`/courses/${e.course.slug}`}
                    className="group overflow-hidden rounded-2xl border border-border bg-card hover-lift"
                  >
                    <div className={`relative flex h-32 items-center justify-center bg-gradient-to-br ${gradient}`}>
                      <Icon className="h-12 w-12 text-white/40" />
                      {e.course.badge && (
                        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-foreground">
                          {e.course.badge}
                        </span>
                      )}
                      <div className="absolute right-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                        {e.progress_percent}%
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{e.course.subject}</p>
                      <h3 className="mt-0.5 line-clamp-2 font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {e.course.name}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">{e.course.educator_name}</p>
                      <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3 fill-secondary text-secondary" /> {e.course.rating}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {e.course.duration_hours}h
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="h-3 w-3" /> {e.course.total_lessons}
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${e.progress_percent}%` }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default MyCoursesPage;
