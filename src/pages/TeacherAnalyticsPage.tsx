import { BarChart3, TrendingUp, Users, DollarSign, Eye, BookOpen } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const engagementData = [
  { day: "Mon", views: 320, doubts: 18 },
  { day: "Tue", views: 410, doubts: 24 },
  { day: "Wed", views: 380, doubts: 20 },
  { day: "Thu", views: 520, doubts: 32 },
  { day: "Fri", views: 490, doubts: 28 },
  { day: "Sat", views: 610, doubts: 35 },
  { day: "Sun", views: 450, doubts: 22 },
];

const revenueData = [
  { month: "Oct", revenue: 42000 },
  { month: "Nov", revenue: 58000 },
  { month: "Dec", revenue: 51000 },
  { month: "Jan", revenue: 72000 },
  { month: "Feb", revenue: 68000 },
  { month: "Mar", revenue: 85000 },
];

const subjectDist = [
  { name: "Physics", value: 45, color: "#3b82f6" },
  { name: "Electromagnetism", value: 30, color: "#06b6d4" },
  { name: "Optics", value: 25, color: "#6366f1" },
];

const stats = [
  { label: "Total Students", value: "5,950", icon: Users, change: "+12%", color: "from-blue-500 to-blue-600" },
  { label: "Total Revenue", value: "₹24.2L", icon: DollarSign, change: "+18%", color: "from-green-500 to-green-600" },
  { label: "Lecture Views", value: "34,200", icon: Eye, change: "+8%", color: "from-purple-500 to-purple-600" },
  { label: "Avg Test Score", value: "76%", icon: BarChart3, change: "+3%", color: "from-primary to-accent" },
];

const TeacherAnalyticsPage = () => (
  <div className="p-4 lg:p-6 space-y-6">
    <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-6 text-white">
      <h1 className="text-2xl font-black font-display">Analytics</h1>
      <p className="text-white/90 text-sm mt-1">Track your teaching impact and revenue</p>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${s.color} text-white`}><s.icon className="h-4 w-4" /></div>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
          <p className="text-xl font-black text-foreground">{s.value}</p>
          <p className="text-xs font-semibold text-secondary mt-0.5">{s.change} this month</p>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-foreground mb-4">Student Engagement (This Week)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={engagementData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip />
            <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="doubts" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-foreground mb-4">Revenue Trend (6 Months)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip />
            <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-foreground mb-4">Course Distribution</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={subjectDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {subjectDist.map(entry => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-foreground mb-4">Top Performing Students</h3>
        <div className="space-y-3">
          {[
            { name: "Zara Khan", score: 94, initials: "ZK" },
            { name: "Ishita Patel", score: 91, initials: "IP" },
            { name: "Meera Joshi", score: 88, initials: "MJ" },
            { name: "Aarav Sharma", score: 82, initials: "AS" },
          ].map((s, i) => (
            <div key={s.name} className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{s.initials}</div>
              <span className="flex-1 text-sm font-medium text-foreground">{s.name}</span>
              <span className="text-sm font-bold text-secondary">{s.score}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default TeacherAnalyticsPage;
