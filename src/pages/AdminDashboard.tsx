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
  { name: "Arjun Mehta", email: "arjun@gmail.com", plan: "Pro", joined: "2 min ago", status: "active" },
  { name: "Priya Sharma", email: "priya@gmail.com", plan: "Free", joined: "15 min ago", status: "active" },
  { name: "Rahul Singh", email: "rahul@yahoo.com", plan: "Elite", joined: "1 hr ago", status: "active" },
  { name: "Sneha Gupta", email: "sneha@gmail.com", plan: "Pro", joined: "2 hr ago", status: "active" },
  { name: "Vikram Joshi", email: "vikram@outlook.com", plan: "Free", joined: "3 hr ago", status: "active" },
];

const topCourses = [
  { rank: 1, name: "JEE Physics Booster", teacher: "Ramesh Sir", enrolled: 847, revenue: "₹11L", rating: 4.9 },
  { rank: 2, name: "NEET Biology Complete", teacher: "Priya Ma'am", enrolled: 623, revenue: "₹8.1L", rating: 4.8 },
  { rank: 3, name: "JEE Chemistry Crash", teacher: "Ajay Sir", enrolled: 534, revenue: "₹6.9L", rating: 4.7 },
  { rank: 4, name: "Class 12 Mathematics", teacher: "Neha Ma'am", enrolled: 412, revenue: "₹5.4L", rating: 4.6 },
  { rank: 5, name: "JEE Advanced Problems", teacher: "Ramesh Sir", enrolled: 389, revenue: "₹5.1L", rating: 4.8 },
];

const regionData = [
  { name: "India", value: 89, color: "hsl(24,95%,53%)" },
  { name: "Dubai", value: 8, color: "hsl(160,93%,39%)" },
  { name: "Other", value: 3, color: "hsl(220,14%,90%)" },
];

const liveClasses = [
  { name: "Electrostatics", teacher: "Ramesh Sir", viewers: 142, duration: "45 min" },
  { name: "Organic Chemistry", teacher: "Ajay Sir", viewers: 98, duration: "32 min" },
  { name: "Integration", teacher: "Neha Ma'am", viewers: 76, duration: "18 min" },
];

const AdminDashboard = () => (
  <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
    {/* Stats */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-border bg-card p-4">
          <s.icon className={`h-5 w-5 ${s.color}`} />
          <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
          <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
          <p className="mt-1 text-[10px] text-muted2">{s.change}</p>
        </div>
      ))}
    </div>

    {/* Revenue Chart */}
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold text-foreground mb-4">Revenue — Last 30 Days</h2>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={revenueData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
          <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(215,16%,47%)" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(215,16%,47%)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
          <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']} />
          <Area type="monotone" dataKey="revenue" stroke="hsl(24,95%,53%)" fill="hsl(24,95%,53%)" fillOpacity={0.15} />
        </AreaChart>
      </ResponsiveContainer>
    </div>

    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left — 2/3 */}
      <div className="lg:col-span-2 space-y-6">
        {/* Recent Users */}
        <div className="rounded-xl border border-border bg-card p-4">
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

        {/* Top Courses */}
        <div className="rounded-xl border border-border bg-card p-4">
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

      {/* Right — 1/3 */}
      <div className="space-y-6">
        {/* Live Classes */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-bold text-foreground mb-3">Currently Live: {liveClasses.length} classes</h2>
          <div className="space-y-2">
            {liveClasses.map((c, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
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

        {/* Pending Approvals */}
        <div className="rounded-xl border border-border bg-card p-4">
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

        {/* Region Breakdown */}
        <div className="rounded-xl border border-border bg-card p-4">
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
