import { BookOpen, Video, ClipboardCheck, BarChart3, Play, Calendar, ArrowRight, Flame, Target, Trophy, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { useDashboardData } from "@/hooks/useDashboardData";
import LiveBadge from "@/components/LiveBadge";
import LiveTestsWidget from "@/components/LiveTestsWidget";

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

const greetingFor = (d: Date) => {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
};

const quickNav = [
  { icon: BookOpen, label: "My Course", desc: "Study material",   link: "/my-courses" },
  { icon: Video, label: "Live Class",   desc: "Join live sessions", link: "/my-live-classes" },
  { icon: ClipboardCheck, label: "Live Test", desc: "Take a test", link: "/my-tests" },
  { icon: BarChart3, label: "My Progress", desc: "Detailed analytics", link: "/analytics" },
];

const StudentDashboard = () => {
  const { user } = useAppStore();
  const firstName = user?.full_name?.split(" ")[0] || "Student";
  const data = useDashboardData();
  const greeting = greetingFor(new Date());
  const resume = data.continueWatching[0];
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-20 lg:p-8 lg:pb-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-secondary via-secondary to-primary p-6 lg:p-8">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{today}</p>
            <h1 className="mt-1 font-display text-3xl font-black leading-tight lg:text-4xl">
              {greeting}, {firstName}.
            </h1>
            <p className="mt-2 max-w-md text-sm text-white/80">
              {resume
                ? "Pick up where you left off — every focused minute counts."
                : "Ready to start? Open your course and take the first lesson today."}
            </p>
          </div>

          {resume ? (
            <Link
              to={`/my-courses/${resume.lesson_slug ? resume.course_id : resume.course_id}`}
              className="group flex items-center gap-4 rounded-2xl bg-white/95 p-3 pr-5 shadow-2xl backdrop-blur transition-transform hover:-translate-y-0.5 lg:min-w-[340px]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-primary-foreground">
                <Play className="h-5 w-5 fill-current" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Resume learning</p>
                <p className="truncate text-sm font-bold text-foreground">{resume.lesson_title || resume.course_name}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${resume.progress_pct}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">{resume.progress_pct}%</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <Link
              to="/my-courses"
              className="inline-flex items-center gap-2 self-start rounded-full bg-white px-5 py-2.5 text-sm font-bold text-secondary shadow-xl hover:-translate-y-0.5 transition-transform"
            >
              Open My Course <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>

      {/* Quick nav */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {quickNav.map((q) => (
          <Link
            key={q.label}
            to={q.link}
            className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <q.icon className="h-5 w-5" />
            </div>
            <p className="font-display text-sm font-bold text-foreground">{q.label}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{q.desc}</p>
          </Link>
        ))}
      </section>

      {/* Progress + Schedule */}
      <section className="grid gap-5 lg:grid-cols-3">
        {/* Progress card */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-black text-foreground">My Progress</h2>
              <p className="text-xs text-muted-foreground">Snapshot of how you're tracking right now</p>
            </div>
            <Link to="/analytics" className="text-xs font-bold text-primary hover:underline">View details →</Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric icon={Flame}   tone="primary"   value={`${data.streak}`} unit={data.streak === 1 ? "day" : "days"} label="Current Streak" />
            <Metric icon={Target}  tone="secondary" value={data.accuracyPct !== null ? `${data.accuracyPct}` : "—"} unit={data.accuracyPct !== null ? "%" : ""} label="Overall Accuracy" />
            <Metric icon={ClipboardCheck} tone="accent" value={`${data.testsCompleted}`} label="Tests Completed" />
            <Metric icon={Trophy}  tone="primary"   value={data.percentile !== null ? `${data.percentile}` : "—"} unit={data.percentile !== null ? "%ile" : ""} label="AIR Percentile" />
          </div>

          {data.subjectPerformance.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subject Performance</p>
              {data.subjectPerformance.slice(0, 3).map((s, i) => (
                <div key={s.subject}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold text-foreground">{s.subject}</span>
                    <span className="font-bold text-foreground">{s.pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${i % 3 === 0 ? "bg-primary" : i % 3 === 1 ? "bg-secondary" : "bg-accent"}`}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's schedule */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-black text-foreground">Today</h2>
              <p className="text-xs text-muted-foreground">Live classes & tests</p>
            </div>
            <Link to="/my-live-classes" className="text-xs font-bold text-primary hover:underline">All →</Link>
          </div>
          {data.todaySchedule.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-8 text-center">
              <Calendar className="mb-2 h-7 w-7 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No classes today</p>
              <Link to="/my-live-classes" className="mt-1 text-xs font-bold text-primary">Browse schedule</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.todaySchedule.slice(0, 4).map((cls) => {
                const isLive = cls.status === "live";
                const isCompleted = cls.status === "completed";
                return (
                  <div key={cls.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <span className="text-[9px] font-bold uppercase">{formatTime(cls.starts_at).split(" ")[1]}</span>
                      <span className="text-xs font-black">{formatTime(cls.starts_at).split(" ")[0]}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-foreground">{cls.title}</p>
                        {isLive && <LiveBadge />}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{cls.educator_name}</p>
                      {isLive ? (
                        <Link to={`/live-classes/${cls.slug}`} className="mt-1.5 inline-flex rounded-md bg-destructive px-2.5 py-1 text-[10px] font-bold text-destructive-foreground">Join Now</Link>
                      ) : isCompleted ? (
                        <span className="mt-1 inline-block text-[10px] font-medium text-muted-foreground">Recording available</span>
                      ) : (
                        <span className="mt-1 inline-block text-[10px] font-medium text-muted-foreground">Upcoming</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Continue learning */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-black text-foreground">Continue Learning</h2>
            <p className="text-xs text-muted-foreground">Jump back into your courses</p>
          </div>
          <Link to="/my-courses" className="text-xs font-bold text-primary hover:underline">All courses →</Link>
        </div>

        {data.continueWatching.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
            <Sparkles className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-foreground">Nothing in progress yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Open My Course to start your first lesson.</p>
            <Link to="/my-courses" className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
              Open My Course <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.continueWatching.slice(0, 3).map((cw) => (
              <Link
                key={cw.course_id + cw.lesson_slug}
                to={`/my-courses`}
                className="group rounded-xl border border-border p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
                  <Play className="h-4 w-4 fill-current" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{cw.subject || cw.course_name}</p>
                <p className="mt-0.5 line-clamp-2 text-sm font-bold text-foreground group-hover:text-primary">{cw.lesson_title || cw.course_name}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${cw.progress_pct}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-primary">{cw.progress_pct}%</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const toneMap = {
  primary:   "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  accent:    "bg-accent/10 text-accent",
} as const;

const Metric = ({ icon: Icon, value, unit, label, tone }: { icon: React.ElementType; value: string; unit?: string; label: string; tone: keyof typeof toneMap }) => (
  <div className="rounded-xl border border-border p-4">
    <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${toneMap[tone]}`}>
      <Icon className="h-4 w-4" />
    </div>
    <p className="font-display text-2xl font-black leading-none text-foreground">
      {value}
      {unit && <span className="ml-0.5 text-sm font-bold text-muted-foreground">{unit}</span>}
    </p>
    <p className="mt-1.5 text-[11px] text-muted-foreground">{label}</p>
  </div>
);

export default StudentDashboard;
