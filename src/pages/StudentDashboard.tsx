import { Zap, Target, ClipboardCheck, Trophy, AlertTriangle } from "lucide-react";
import StatCard from "@/components/StatCard";
import SectionHeader from "@/components/SectionHeader";
import LiveBadge from "@/components/LiveBadge";
import { useAppStore } from "@/store/useAppStore";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const scheduleData = [
  { time: "09:00 AM", title: "Electrostatics & Capacitors", subject: "Physics", teacher: "Ramesh Kumar", status: "completed", color: "from-primary to-primary-dark" },
  { time: "11:30 AM", title: "Organic Chemistry Reactions", subject: "Chemistry", teacher: "Priya Sharma", status: "missed", color: "from-secondary to-secondary-dark" },
  { time: "03:00 PM", title: "Calculus Integration", subject: "Maths", teacher: "AK Bansal", status: "live", color: "from-accent to-[#D97706]" },
  { time: "06:30 PM", title: "Modern Physics", subject: "Physics", teacher: "Ramesh Kumar", status: "upcoming", color: "from-[hsl(271,91%,65%)] to-[hsl(271,81%,45%)]" },
];

const trendData = [
  { name: "Jun 7", you: 60, topper: 90, avg: 70 },
  { name: "Jun 14", you: 68, topper: 92, avg: 70 },
  { name: "Jun 21", you: 75, topper: 95, avg: 71 },
  { name: "Jul 1", you: 82, topper: 100, avg: 70 },
  { name: "Jul 14", you: 90, topper: 105, avg: 72 },
  { name: "Jul 21", you: 95, topper: 110, avg: 70 },
];

const upcomingTests = [
  { name: "JEE Main Mock #7", date: "Tomorrow", duration: "3hrs", questions: 90, status: "Register" },
  { name: "Chemistry Chapter Test", date: "Apr 3", duration: "45min", questions: 30, status: "Enrolled" },
  { name: "NEET Full Mock April", date: "Apr 5", duration: "3hrs", questions: 200, status: "Register" },
];

const educators = [
  { name: "Ramesh Kumar", subject: "Physics", followers: "12.5K", emoji: "⚡", color: "from-primary to-primary-dark" },
  { name: "Priya Sharma", subject: "Chemistry", followers: "9.8K", emoji: "🧪", color: "from-secondary to-secondary-dark" },
  { name: "AK Bansal", subject: "Mathematics", followers: "15.2K", emoji: "📐", color: "from-accent to-[#D97706]" },
];

const StudentDashboard = () => {
  const { user } = useAppStore();
  const firstName = user?.full_name?.split(" ")[0] || "Student";

  return (
    <div className="flex gap-0 pb-20 lg:pb-0">
      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-6 min-w-0">
        {/* Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-black font-display text-foreground lg:text-2xl">Good morning, {firstName} 👋</h1>
            <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-background transition-colors">📞 Talk to Counsellor</button>
            <button className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-dark transition-colors">Enroll in Course</button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-4">
          <StatCard icon={Zap} value="8 day" label="Current Streak" trend="↑ 3 from last week" stripeColor="primary" />
          <StatCard icon={Target} value="84%" label="Overall Accuracy" trend="↑ 2.3% improvement" stripeColor="secondary" />
          <StatCard icon={ClipboardCheck} value="23" label="Tests Completed" trend="↑ 5 this month" stripeColor="accent" />
          <StatCard icon={Trophy} value="99.2%ile" label="All India Percentile" trend="↑ from 98.8" stripeColor="purple" />
        </div>

        {/* Today's Schedule */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-6">
          <SectionHeader title="Today's Schedule" viewAllLink="/live-classes" />
          <div className="space-y-3">
            {scheduleData.map((cls) => (
              <div key={cls.title} className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-background/50 transition-colors">
                <div className={`h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br ${cls.color} flex items-center justify-center text-lg`}>
                  {cls.subject === "Physics" ? "⚡" : cls.subject === "Chemistry" ? "🧪" : "📐"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${cls.status === 'live' ? 'text-destructive' : cls.status === 'missed' ? 'text-destructive' : cls.status === 'completed' ? 'text-muted-foreground' : 'text-primary'}`}>
                      {cls.time}
                    </span>
                    {cls.status === 'live' && <LiveBadge />}
                  </div>
                  <p className="text-sm font-bold text-foreground truncate">{cls.title}</p>
                  <p className="text-xs text-muted-foreground">{cls.teacher}</p>
                </div>
                <div className="shrink-0">
                  {cls.status === "live" && (
                    <button className="rounded-lg bg-secondary px-4 py-1.5 text-xs font-bold text-secondary-foreground hover:bg-secondary-dark transition-colors">Join Now</button>
                  )}
                  {cls.status === "upcoming" && (
                    <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-background transition-colors">Set Reminder</button>
                  )}
                  {cls.status === "completed" && (
                    <span className="text-xs font-medium text-muted-foreground">Recording ▶</span>
                  )}
                  {cls.status === "missed" && (
                    <span className="text-xs font-medium text-destructive">Missed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Educators */}
        <div className="mb-6">
          <SectionHeader title="Top Educators" viewAllLink="/educators" />
          <div className="grid gap-4 sm:grid-cols-3">
            {educators.map((edu) => (
              <div key={edu.name} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className={`h-20 bg-gradient-to-br ${edu.color} flex items-center justify-center text-3xl`}>
                  {edu.emoji}
                </div>
                <div className="p-4 text-center">
                  <p className="text-sm font-bold font-display text-foreground">{edu.name} ✓</p>
                  <p className="text-xs text-muted-foreground">{edu.subject}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{edu.followers} followers</p>
                  <button className="mt-3 w-full rounded-lg border border-primary px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary-light transition-colors">Follow</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="hidden xl:block w-[280px] shrink-0 border-l border-border bg-card p-5 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
        <h3 className="text-sm font-bold font-display text-foreground mb-4">My Performance</h3>

        {/* Rank Cards */}
        <div className="space-y-3 mb-5">
          <div className="rounded-xl bg-gradient-to-br from-primary to-primary-dark p-4 text-primary-foreground">
            <p className="text-xs font-medium opacity-80">All India Percentile</p>
            <p className="text-3xl font-black font-display">99.2</p>
            <p className="text-xs font-medium opacity-80">Batch Rank #3</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-secondary to-secondary-dark p-4 text-secondary-foreground">
            <p className="text-xs font-medium opacity-80">Centre Percentile</p>
            <p className="text-3xl font-black font-display">94.5</p>
            <p className="text-xs font-medium opacity-80">Top 5.5%</p>
          </div>
        </div>

        {/* Subject Performance */}
        <div className="rounded-xl border border-border p-4 mb-5">
          <p className="text-sm font-bold font-display text-foreground mb-3">Subject Performance</p>
          {[
            { subject: "Physics", pct: 87, color: "bg-primary" },
            { subject: "Chemistry", pct: 79, color: "bg-secondary" },
            { subject: "Mathematics", pct: 91, color: "bg-accent" },
          ].map((s) => (
            <div key={s.subject} className="mb-3 last:mb-0">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-foreground">{s.subject}</span>
                <span className="font-bold text-foreground">{s.pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className={`h-2 rounded-full ${s.color} transition-all`} style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Score Trend */}
        <div className="rounded-xl border border-border p-4 mb-5">
          <p className="text-sm font-bold font-display text-foreground mb-3">Score Trend vs Topper</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={trendData}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="you" stroke="hsl(222, 81%, 58%)" strokeWidth={2} dot={{ r: 2 }} name="You" />
              <Line type="monotone" dataKey="topper" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 2 }} name="Topper" />
              <Line type="monotone" dataKey="avg" stroke="hsl(215, 16%, 47%)" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Average" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Weak Topics */}
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 mb-5">
          <p className="text-sm font-bold text-destructive flex items-center gap-1 mb-3">
            <AlertTriangle className="h-4 w-4" /> Weak Topics
          </p>
          {[
            { topic: "Thermodynamics", pct: 52 },
            { topic: "Organic Reactions", pct: 61 },
            { topic: "Rotational Motion", pct: 68 },
          ].map((t) => (
            <div key={t.topic} className="flex justify-between text-xs mb-2">
              <span className="text-foreground">{t.topic}</span>
              <span className={`font-bold ${t.pct < 65 ? 'text-destructive' : 'text-accent'}`}>{t.pct}%</span>
            </div>
          ))}
          <button className="mt-2 w-full rounded-pill bg-destructive py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 transition-colors">
            Practice Weak Topics →
          </button>
        </div>

        {/* Upcoming Tests */}
        <div className="mb-5">
          <p className="text-sm font-bold font-display text-foreground mb-3">Upcoming Tests</p>
          <div className="space-y-2">
            {upcomingTests.map((t) => (
              <div key={t.name} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="h-9 w-9 rounded-lg bg-primary-light flex items-center justify-center">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.date} · {t.duration}</p>
                </div>
                <span className={`rounded-pill px-2 py-0.5 text-[10px] font-bold ${t.status === 'Enrolled' ? 'bg-secondary-light text-secondary' : 'bg-primary-light text-primary'}`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mini Calendar */}
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold font-display text-foreground">March 2026</p>
            <div className="flex gap-1">
              <button className="rounded p-1 text-muted-foreground hover:bg-background">◂</button>
              <button className="rounded p-1 text-muted-foreground hover:bg-background">▸</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <span key={i} className="font-bold text-muted-foreground py-1">{d}</span>
            ))}
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const isToday = day === 31;
              const hasClass = [2, 5, 8, 12, 15, 19, 22, 26, 29, 31].includes(day);
              return (
                <button key={day} className={`relative py-1 text-xs rounded ${isToday ? 'bg-primary text-primary-foreground font-bold' : 'text-foreground hover:bg-background'}`}>
                  {day}
                  {hasClass && !isToday && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-secondary" />}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-secondary" /> Class</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Today</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
