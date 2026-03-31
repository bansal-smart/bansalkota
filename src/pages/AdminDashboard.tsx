import { Users, IndianRupee, BookOpen, Target, Video, Clock, ArrowRight, AlertCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const stats = [
  { label: "Total Users", value: "12,847", icon: Users, change: "+234 today", color: "text-primary" },
  { label: "Monthly Revenue", value: "₹48.2L", icon: IndianRupee, change: "+12% from last month", color: "text-secondary" },
  { label: "Active Courses", value: "48", icon: BookOpen, change: "12 published this month", color: "text-primary" },
  { label: "Tests Today", value: "2,341", icon: Target, change: "Peak at 11 AM", color: "text-accent" },
];

const revenueData = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  revenue: Math.floor(Math.random() * 80000 + 120000),
}));

const recentUsers = [
  { name: "Aditya Rajan", email: "aditya@gmail.com", plan: "Pro", joined: "2 min ago", status: "active" },
  { name: "Ishita Bansal", email: "ishita@gmail.com", plan: "Free", joined: "15 min ago", status: "active" },
  { name: "Karan Malhotra", email: "karan@yahoo.com", plan: "Elite", joined: "1 hr ago", status: "active" },
  { name: "Divya Nair", email: "divya@gmail.com", plan: "Pro", joined: "2 hr ago", status: "active" },
  { name: "Saurabh Pillai", email: "saurabh@outlook.com", plan: "Free", joined: "3 hr ago", status: "active" },
];

const topCourses = [
  { rank: 1, name: "JEE Physics Booster", teacher: "Vikram Thapar", enrolled: 847, revenue: "₹11L", rating: 4.9 },
  { rank: 2, name: "NEET Biology Complete", teacher: "Dr. Kavitha Menon", enrolled: 623, revenue: "₹8.1L", rating: 4.8 },
  { rank: 3, name: "JEE Chemistry Crash", teacher: "Rohan Kapoor", enrolled: 534, revenue: "₹6.9L", rating: 4.7 },
  { rank: 4, name: "Class 12 Mathematics", teacher: "Meghna Joshi", enrolled: 412, revenue: "₹5.4L", rating: 4.6 },
  { rank: 5, name: "JEE Advanced Problems", teacher: "Vikram Thapar", enrolled: 389, revenue: "₹5.1L", rating: 4.8 },
];

const regionData = [
  { name: "India", value: 89, color: "hsl(24,95%,53%)" },
  { name: "Dubai", value: 8, color: "hsl(160,93%,39%)" },
  { name: "Other", value: 3, color: "hsl(220,14%,90%)" },
];

const liveClasses = [
  { name: "Electrostatics", teacher: "Vikram Thapar", viewers: 142, duration: "45 min" },
  { name: "Organic Chemistry", teacher: "Rohan Kapoor", viewers: 98, duration: "32 min" },
  { name: "Integration", teacher: "Meghna Joshi", viewers: 76, duration: "18 min" },
];

const AdminDashboard = () => (
  <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
    {/* Stats */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-border bg-card p-4 hover-lift">
          <s.icon className={`h-5 w-5 ${s.color}`} />
          <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
          <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
          <p className="mt-1 text-[10px] text-muted2">{s.change}</p>
        </div>
      ))}
    </div>

    {/* Revenue Chart */}
    <div className="rounded-xl border border-border bg-card p-4 animate-fade-in-up">
      <h2 className="text-sm font-bold text-foreground mb-4">Revenue — Last 30 Days</h2>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={revenueData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
          <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(215,16%,47%)" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(215,16%,47%)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
          <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']} />
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(24,95%,53%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(24,95%,53%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="revenue" stroke="hsl(24,95%,53%)" fill="url(#revenueGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>

    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-xl border border-border bg-card p-4 animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">Recent Users (Today)</h2>
            <a href="/admin/users" className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">View All <ArrowRight className="h-3 w-3" /></a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-2 font-medium">Name</th><th className="text-left py-2 font-medium">Email</th><th className="text-left py-2 font-medium">Plan</th><th className="text-left py-2 font-medium">Joined</th></tr></thead>
              <tbody>
                {recentUsers.map((u, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-medium text-foreground">{u.name}</td>
                    <td className="py-2.5 text-muted-foreground">{u.email}</td>
                    <td className="py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${u.plan === "Elite" ? "bg-accent/20 text-accent" : u.plan === "Pro" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{u.plan}</span></td>
                    <td className="py-2.5 text-muted-foreground">{u.joined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 animate-fade-in-up">
          <h2 className="text-sm font-bold text-foreground mb-3">Top Courses</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-2 font-medium">#</th><th className="text-left py-2 font-medium">Course</th><th className="text-left py-2 font-medium">Teacher</th><th className="text-right py-2 font-medium">Enrolled</th><th className="text-right py-2 font-medium">Revenue</th><th className="text-right py-2 font-medium">Rating</th></tr></thead>
              <tbody>
                {topCourses.map((c) => (
                  <tr key={c.rank} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-bold text-muted-foreground">{c.rank}</td>
                    <td className="py-2.5 font-medium text-foreground">{c.name}</td>
                    <td className="py-2.5 text-muted-foreground">{c.teacher}</td>
                    <td className="py-2.5 text-right text-foreground">{c.enrolled}</td>
                    <td className="py-2.5 text-right text-secondary font-medium">{c.revenue}</td>
                    <td className="py-2.5 text-right text-accent font-medium">{c.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-4 animate-fade-in-up">
          <h2 className="text-sm font-bold text-foreground mb-3">Currently Live: {liveClasses.length} classes</h2>
          <div className="space-y-2">
            {liveClasses.map((c, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3 hover-lift">
                <div className="flex h-2.5 w-2.5 rounded-full bg-destructive animate-live-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.teacher} · {c.viewers} viewers</p>
                </div>
                <span className="text-[10px] text-muted-foreground">{c.duration}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 animate-fade-in-up">
          <h2 className="text-sm font-bold text-foreground mb-3">Pending Approvals</h2>
          <div className="space-y-2">
            {[{ label: "New teacher requests", count: 5 }, { label: "Course reviews", count: 12 }, { label: "Reported content", count: 2 }].map((a) => (
              <div key={a.label} className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                <span className="text-xs text-foreground">{a.label}</span>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive/10 px-1 text-[10px] font-bold text-destructive">{a.count}</span>
              </div>
            ))}
          </div>
          <button className="mt-3 text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">Review All <ArrowRight className="h-3 w-3" /></button>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 animate-fade-in-up">
          <h2 className="text-sm font-bold text-foreground mb-3">Region Breakdown</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={regionData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                {regionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v}%`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {regionData.map((r) => (
              <div key={r.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="text-[10px] text-muted-foreground">{r.name} ({r.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default AdminDashboard;
