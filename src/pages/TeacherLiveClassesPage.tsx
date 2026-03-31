import { Video, Plus, Calendar, Clock, Users, Play } from "lucide-react";
import { useState } from "react";

const classes = [
  { id: 1, title: "Thermodynamics — Laws & Applications", batch: "JEE Adv 2026", date: "Today, 4:00 PM", duration: "1h 30m", enrolled: 142, status: "live" },
  { id: 2, title: "Wave Optics — Interference", batch: "JEE Adv 2026", date: "Tomorrow, 4:00 PM", duration: "1h 15m", enrolled: 130, status: "upcoming" },
  { id: 3, title: "Rotational Motion — Torque", batch: "JEE Mains 2026", date: "Wed, 6:00 PM", duration: "1h", enrolled: 98, status: "upcoming" },
  { id: 4, title: "Newton's Laws — Advanced Problems", batch: "JEE Adv 2026", date: "Mar 28", duration: "1h 20m", enrolled: 142, status: "completed" },
  { id: 5, title: "Kinematics — 2D Motion", batch: "JEE Mains 2026", date: "Mar 26", duration: "55m", enrolled: 98, status: "completed" },
];

const TeacherLiveClassesPage = () => {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const filtered = classes.filter(c => tab === "upcoming" ? c.status !== "completed" : c.status === "completed");

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-6 text-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black font-display">Live Classes</h1>
          <p className="text-white/90 text-sm mt-1">Schedule and manage your live sessions</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg bg-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/30 transition-colors">
          <Plus className="h-4 w-4" /> Schedule Class
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab("upcoming")} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${tab === "upcoming" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Upcoming & Live</button>
        <button onClick={() => setTab("past")} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${tab === "past" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Past Classes</button>
      </div>

      <div className="space-y-3">
        {filtered.map(cls => (
          <div key={cls.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${cls.status === "live" ? "bg-destructive" : cls.status === "completed" ? "bg-muted" : "bg-primary"} text-white shrink-0`}>
              {cls.status === "completed" ? <Play className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground truncate">{cls.title}</h3>
                {cls.status === "live" && <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">LIVE</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{cls.batch}</p>
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {cls.date}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {cls.duration}</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {cls.enrolled}</span>
              </div>
            </div>
            <button className={`rounded-lg px-4 py-2 text-xs font-bold ${cls.status === "live" ? "bg-destructive text-white" : cls.status === "completed" ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"} hover:opacity-90 transition-opacity`}>
              {cls.status === "live" ? "Go Live" : cls.status === "completed" ? "View Recording" : "Edit"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherLiveClassesPage;
