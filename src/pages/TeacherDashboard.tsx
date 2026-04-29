import { Users, BookOpen, MessageCircle, Star, Video, Clock, Wallet, ArrowRight, AlertCircle, ClipboardCheck, Calendar, Bot, BarChart3, ExternalLink } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Bar } from "recharts";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useTeacherDashboard } from "@/hooks/useTeacherDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const formatRelativeDay = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, tomorrow)) return "Tomorrow";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

const formatRelativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const TeacherDashboard = () => {
  const { loading, greetingName, newToday, stats, upcomingClasses, pendingDoubts, scoreDistribution, lastTestTitle } = useTeacherDashboard();
  const { user } = useAuth();
  const [payoutRequested, setPayoutRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const requestPayoutSetup = async () => {
    if (!user) return;
    setRequesting(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", user.id)
        .maybeSingle();
      const { error } = await supabase.from("enquiries").insert({
        source: "payout_setup",
        name: profile?.full_name || greetingName || "Teacher",
        email: user.email || "",
        phone: profile?.phone || null,
        message: "Please enable payouts for my account.",
      });
      if (error) throw error;
      setPayoutRequested(true);
      toast({ title: "Request sent", description: "Our team will reach out within 2 business days." });
    } catch (e: any) {
      toast({ title: "Could not submit", description: e.message ?? "Try again", variant: "destructive" });
    } finally {
      setRequesting(false);
    }
  };

  const openMeeting = async (cls: typeof upcomingClasses[number]) => {
    if (!cls.meeting_url) return;
    if (cls.status !== "live") {
      // best-effort mark as live
      await supabase.from("live_classes").update({ status: "live" }).eq("id", cls.id);
    }
    window.open(cls.meeting_url, "_blank", "noopener,noreferrer");
  };

  const statCards = [
    { label: "Total Students", value: stats.totalStudents.toString(), icon: Users, change: stats.newThisWeek > 0 ? `+${stats.newThisWeek} new this week` : "No new this week", color: "text-primary" },
    { label: "Active Courses", value: stats.activeCourses.toString(), icon: BookOpen, change: `${stats.ongoingBatches} ongoing`, color: "text-secondary" },
    { label: "Pending Doubts", value: stats.pendingDoubts.toString(), icon: MessageCircle, change: stats.pendingDoubts > 0 ? "Respond within 24hrs" : "All caught up", color: "text-destructive" },
    { label: "Avg Rating", value: stats.avgRating ? stats.avgRating.toFixed(1) : "—", icon: Star, change: stats.totalReviews > 0 ? `Based on ${stats.totalReviews.toLocaleString()} students` : "No reviews yet", color: "text-accent" },
  ];

  const quickActions = [
    { icon: Calendar, label: "Schedule Class", desc: "Create live session", link: "/teacher/live-classes", gradient: "from-primary to-primary-dark" },
    { icon: ClipboardCheck, label: "Create Test", desc: "New assessment", link: "/teacher/create-test", gradient: "from-secondary to-secondary-dark" },
    { icon: Bot, label: "Answer Doubts", desc: stats.pendingDoubts > 0 ? `${stats.pendingDoubts} pending` : "All answered", link: "/teacher/doubts", gradient: "from-accent to-primary" },
    { icon: BarChart3, label: "Analytics", desc: "View insights", link: "/teacher/analytics", gradient: "from-primary-dark to-accent" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
      <div className="animate-fade-in-up">
        <h1 className="text-xl font-bold text-foreground">
          {greeting()}, {loading ? "..." : greetingName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading your dashboard..." : newToday > 0 ? `${newToday} student${newToday === 1 ? "" : "s"} joined today` : "No new students today"}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
        {quickActions.map(qa => (
          <Link key={qa.label} to={qa.link} className={`rounded-xl bg-gradient-to-br ${qa.gradient} p-4 text-center hover-lift group`}>
            <qa.icon className="h-6 w-6 text-white mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-white">{qa.label}</p>
            <p className="text-[10px] text-white/70">{qa.desc}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 hover-lift">
            <div className="flex items-center justify-between">
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-16" />
            ) : (
              <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
            )}
            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{s.change}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-4 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-foreground">Upcoming Classes</h2>
              <Link to="/teacher/live-classes" className="text-xs font-semibold text-primary hover:underline">+ Schedule New</Link>
            </div>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : upcomingClasses.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No upcoming classes scheduled.</p>
              ) : (
                upcomingClasses.map((c) => {
                  const isLive = c.status === "live";
                  return (
                    <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border p-3 hover-lift">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        {isLive ? <Video className="h-5 w-5 text-primary" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.batch} · {c.students} registered</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium text-foreground">{formatTime(c.starts_at)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatRelativeDay(c.starts_at)}</p>
                      </div>
                      {isLive ? (
                        <Link to={`/live/${c.id}`} className="shrink-0 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">Start Now</Link>
                      ) : (
                        <Link to="/teacher/live-classes" className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-background">Edit</Link>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 animate-fade-in-up">
            <h2 className="text-sm font-bold text-foreground mb-4">
              Student Performance{lastTestTitle ? ` — ${lastTestTitle}` : ""}
            </h2>
            {loading ? (
              <Skeleton className="h-56 w-full" />
            ) : scoreDistribution.length === 0 || scoreDistribution.every(b => b.students === 0) ? (
              <p className="text-xs text-muted-foreground py-12 text-center">No test attempts yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="hsl(215,16%,47%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(215,16%,47%)" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="students" fill="hsl(24,95%,53%)" radius={[6, 6, 0, 0]} />
                  <Line type="monotone" dataKey="students" stroke="hsl(0,84%,60%)" strokeDasharray="5 5" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4 animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">Pending Doubts ({stats.pendingDoubts})</h2>
              <Link to="/teacher/doubts" className="text-xs text-primary font-semibold hover:underline">View All</Link>
            </div>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
              ) : pendingDoubts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No pending doubts — you're all caught up!</p>
              ) : (
                pendingDoubts.map((d) => (
                  <div key={d.id} className="rounded-lg border border-border p-3 hover-lift">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {d.student.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="text-xs font-semibold text-foreground">{d.student}</span>
                      {d.urgent && <AlertCircle className="h-3 w-3 text-destructive" />}
                    </div>
                    <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary mb-1">
                      {d.subject}{d.topic ? ` · ${d.topic}` : ""}
                    </span>
                    <p className="text-xs text-muted-foreground line-clamp-1">{d.question}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">{formatRelativeTime(d.created_at)}</span>
                      <Link to="/teacher/doubts" className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5">
                        Answer Now <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 animate-fade-in-up">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold text-foreground">Earnings This Month</h2>
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Sample</span>
            </div>
            <p className="text-2xl font-bold text-secondary mb-3 flex items-center gap-1"><IndianRupee className="h-5 w-5" />48,200</p>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={dailyEarnings}>
                <Bar dataKey="amount" fill="hsl(160,93%,39%)" radius={[4, 4, 0, 0]} />
                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Earnings']} />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-[10px] text-muted-foreground">Payouts dashboard coming soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
