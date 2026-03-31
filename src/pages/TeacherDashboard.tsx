import { Users, BookOpen, MessageCircle, Star, Video, Clock, TrendingUp, IndianRupee, ArrowRight, AlertCircle, ClipboardCheck, Calendar, Bot, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from "recharts";
import { Link } from "react-router-dom";

const stats = [
  { label: "Total Students", value: "847", icon: Users, change: "+23 new this week", color: "text-primary" },
  { label: "Active Courses", value: "12", icon: BookOpen, change: "3 ongoing batches", color: "text-secondary" },
  { label: "Pending Doubts", value: "38", icon: MessageCircle, change: "Respond within 24hrs", color: "text-destructive" },
  { label: "Avg Rating", value: "4.8", icon: Star, change: "Based on 1,204 reviews", color: "text-accent" },
];

const quickActions = [
  { icon: Calendar, label: "Schedule Class", desc: "Create live session", link: "/teacher/create-course", gradient: "from-primary to-primary-dark" },
  { icon: ClipboardCheck, label: "Create Test", desc: "New assessment", link: "/teacher/create-test", gradient: "from-secondary to-secondary-dark" },
  { icon: Bot, label: "Answer Doubts", desc: "38 pending", link: "/teacher/doubts", gradient: "from-accent to-primary" },
  { icon: BarChart3, label: "Analytics", desc: "View insights", link: "/teacher/analytics", gradient: "from-primary-dark to-accent" },
];

const upcomingClasses = [
  { time: "10:00 AM", day: "Today", name: "Electrostatics & Capacitors", batch: "JEE 2026 Batch A", students: 142, live: true },
  { time: "2:00 PM", day: "Today", name: "Organic Chemistry — Alcohols", batch: "NEET 2026", students: 98, live: false },
  { time: "10:00 AM", day: "Tomorrow", name: "Coordinate Geometry", batch: "JEE 2026 Batch B", students: 120, live: false },
];

const scoreDistribution = [
  { range: "0-72", students: 12 },
  { range: "72-144", students: 28 },
  { range: "144-216", students: 45 },
  { range: "216-288", students: 38 },
  { range: "288-360", students: 15 },
];

const pendingDoubts = [
  { student: "Aditya Rajan", subject: "Physics", topic: "Electrostatics", question: "Sir, how to solve Gauss's law problems with non-uniform charge...", time: "2h ago", urgent: true },
  { student: "Ishita Bansal", subject: "Chemistry", topic: "Organic", question: "Why does SN1 reaction prefer tertiary carbon over primary?", time: "4h ago", urgent: false },
  { student: "Karan Malhotra", subject: "Physics", topic: "Optics", question: "Can you explain the difference between real and virtual images in...", time: "6h ago", urgent: false },
];

const dailyEarnings = [
  { day: "Mon", amount: 6200 },
  { day: "Tue", amount: 7800 },
  { day: "Wed", amount: 5400 },
  { day: "Thu", amount: 8900 },
  { day: "Fri", amount: 7100 },
  { day: "Sat", amount: 6800 },
  { day: "Sun", amount: 5900 },
];

const TeacherDashboard = () => (
  <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
    {/* Greeting */}
    <div className="animate-fade-in-up">
      <h1 className="text-xl font-bold text-foreground">Good morning, Vikram Sir</h1>
      <p className="text-sm text-muted-foreground">12 students joined today</p>
    </div>

    {/* Quick Actions */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
      {quickActions.map(qa => (
        <Link key={qa.label} to={qa.link} className={`rounded-xl bg-gradient-to-br ${qa.gradient} p-4 text-center hover-lift group`}>
          <qa.icon className="h-6 w-6 text-white mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-xs font-bold text-white">{qa.label}</p>
          <p className="text-[10px] text-white/70">{qa.desc}</p>
        </Link>
      ))}
    </div>

    {/* Stats Row */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-border bg-card p-4 hover-lift">
          <div className="flex items-center justify-between">
            <s.icon className={`h-5 w-5 ${s.color}`} />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
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
            <button className="text-xs font-semibold text-primary hover:underline">+ Schedule New</button>
          </div>
          <div className="space-y-3">
            {upcomingClasses.map((c, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3 hover-lift">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  {c.live ? <Video className="h-5 w-5 text-primary" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.batch} · {c.students} students</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-foreground">{c.time}</p>
                  <p className="text-[10px] text-muted-foreground">{c.day}</p>
                </div>
                {c.live ? (
                  <button className="shrink-0 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">Start Now</button>
                ) : (
                  <button className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-background">Edit</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 animate-fade-in-up">
          <h2 className="text-sm font-bold text-foreground mb-4">Student Performance — Last Test</h2>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="hsl(215,16%,47%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(215,16%,47%)" />
              <Tooltip />
              <Bar dataKey="students" fill="hsl(24,95%,53%)" radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="students" stroke="hsl(0,84%,60%)" strokeDasharray="5 5" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-4 animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">Pending Doubts (38)</h2>
            <a href="/teacher/doubts" className="text-xs text-primary font-semibold hover:underline">View All</a>
          </div>
          <div className="space-y-3">
            {pendingDoubts.map((d, i) => (
              <div key={i} className="rounded-lg border border-border p-3 hover-lift">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {d.student.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="text-xs font-semibold text-foreground">{d.student}</span>
                  {d.urgent && <AlertCircle className="h-3 w-3 text-destructive" />}
                </div>
                <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary mb-1">{d.subject} · {d.topic}</span>
                <p className="text-xs text-muted-foreground line-clamp-1">{d.question}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-muted-foreground">{d.time}</span>
                  <button className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5">Answer Now <ArrowRight className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 animate-fade-in-up">
          <h2 className="text-sm font-bold text-foreground mb-1">Earnings This Month</h2>
          <p className="text-2xl font-bold text-secondary mb-3 flex items-center gap-1"><IndianRupee className="h-5 w-5" />48,200</p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={dailyEarnings}>
              <Bar dataKey="amount" fill="hsl(160,93%,39%)" radius={[4, 4, 0, 0]} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Earnings']} />
            </BarChart>
          </ResponsiveContainer>
          <button className="mt-2 text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">View Earnings Report <ArrowRight className="h-3 w-3" /></button>
        </div>
      </div>
    </div>
  </div>
);

export default TeacherDashboard;
