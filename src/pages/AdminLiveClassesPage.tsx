import { Video, Calendar, Users, Clock } from "lucide-react";

const classes = [
  { id: 1, title: "Thermodynamics — Laws", teacher: "Vikram Thapar", batch: "JEE Adv 2026", date: "Today, 4:00 PM", enrolled: 142, status: "live" },
  { id: 2, title: "Organic Chemistry — Reactions", teacher: "Priya Mehta", batch: "JEE Adv 2026", date: "Today, 6:00 PM", enrolled: 98, status: "upcoming" },
  { id: 3, title: "Differential Calculus", teacher: "Ananya Iyer", batch: "JEE Mains 2026", date: "Tomorrow, 10:00 AM", enrolled: 76, status: "upcoming" },
  { id: 4, title: "Human Physiology", teacher: "Karan Deshmukh", batch: "NEET 2026", date: "Tomorrow, 2:00 PM", enrolled: 110, status: "upcoming" },
  { id: 5, title: "Newton's Laws", teacher: "Vikram Thapar", batch: "JEE Adv 2026", date: "Mar 28", enrolled: 142, status: "completed" },
  { id: 6, title: "Chemical Bonding", teacher: "Priya Mehta", batch: "JEE Adv 2026", date: "Mar 27", enrolled: 98, status: "completed" },
];

const statusColors: Record<string, string> = { live: "bg-destructive text-white", upcoming: "bg-primary/20 text-primary", completed: "bg-muted text-muted-foreground" };

const AdminLiveClassesPage = () => (
  <div className="p-4 lg:p-6 space-y-6">
    <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-6 text-white">
      <h1 className="text-2xl font-black font-display">Live Classes</h1>
      <p className="text-white/90 text-sm mt-1">Monitor all scheduled and ongoing live sessions</p>
      <div className="flex gap-4 mt-4">
        <div className="rounded-xl bg-white/20 px-4 py-2 text-center"><p className="text-lg font-bold">1</p><p className="text-[10px] text-white/80">Live Now</p></div>
        <div className="rounded-xl bg-white/20 px-4 py-2 text-center"><p className="text-lg font-bold">3</p><p className="text-[10px] text-white/80">Upcoming</p></div>
        <div className="rounded-xl bg-white/20 px-4 py-2 text-center"><p className="text-lg font-bold">128</p><p className="text-[10px] text-white/80">Total This Month</p></div>
      </div>
    </div>

    <div className="space-y-3">
      {classes.map(cls => (
        <div key={cls.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0"><Video className="h-5 w-5" /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground truncate">{cls.title}</h3>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[cls.status]}`}>{cls.status}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{cls.teacher} · {cls.batch}</p>
            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {cls.date}</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {cls.enrolled} enrolled</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default AdminLiveClassesPage;
