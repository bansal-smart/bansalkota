import { Video, Calendar, Clock, Users, Play, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const upcomingClasses = [
  { id: "1", title: "Thermodynamics — Laws & Applications", teacher: "Vikram Thapar", subject: "Physics", date: "Today, 4:00 PM", students: 142, status: "live" },
  { id: "2", title: "Organic Chemistry — Reaction Mechanisms", teacher: "Priya Mehta", subject: "Chemistry", date: "Today, 6:00 PM", students: 98, status: "upcoming" },
  { id: "3", title: "Differential Calculus — Limits & Continuity", teacher: "Ananya Iyer", subject: "Mathematics", date: "Tomorrow, 10:00 AM", students: 76, status: "upcoming" },
  { id: "4", title: "Human Physiology — Nervous System", teacher: "Karan Deshmukh", subject: "Biology", date: "Tomorrow, 2:00 PM", students: 110, status: "upcoming" },
  { id: "5", title: "Electromagnetic Induction", teacher: "Vikram Thapar", subject: "Physics", date: "Wed, 4:00 PM", students: 130, status: "upcoming" },
];

const pastRecordings = [
  { id: "r1", title: "Newton's Laws — Advanced Problems", teacher: "Vikram Thapar", subject: "Physics", date: "Mar 28", duration: "1h 20m", views: 342 },
  { id: "r2", title: "Chemical Bonding — Hybridization", teacher: "Priya Mehta", subject: "Chemistry", date: "Mar 27", duration: "55m", views: 218 },
  { id: "r3", title: "Integration by Parts", teacher: "Ananya Iyer", subject: "Mathematics", date: "Mar 26", duration: "1h 05m", views: 189 },
  { id: "r4", title: "Cell Division — Meiosis", teacher: "Karan Deshmukh", subject: "Biology", date: "Mar 25", duration: "48m", views: 156 },
];

const subjectColors: Record<string, string> = {
  Physics: "from-blue-500 to-blue-600",
  Chemistry: "from-green-500 to-green-600",
  Mathematics: "from-purple-500 to-purple-600",
  Biology: "from-pink-500 to-pink-600",
};

const LiveClassesListPage = () => (
  <div className="p-4 lg:p-6 space-y-6">
    {/* Header */}
    <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-6 text-white">
      <div className="flex items-center gap-3 mb-2">
        <Video className="h-7 w-7" />
        <h1 className="text-2xl font-black font-display">Live Classes</h1>
      </div>
      <p className="text-white/90 text-sm">Join interactive sessions with top educators in real-time</p>
      <div className="flex gap-4 mt-4">
        <div className="rounded-xl bg-white/20 px-4 py-2 text-center">
          <p className="text-lg font-bold">5</p>
          <p className="text-[10px] text-white/80">This Week</p>
        </div>
        <div className="rounded-xl bg-white/20 px-4 py-2 text-center">
          <p className="text-lg font-bold">1</p>
          <p className="text-[10px] text-white/80">Live Now</p>
        </div>
        <div className="rounded-xl bg-white/20 px-4 py-2 text-center">
          <p className="text-lg font-bold">24</p>
          <p className="text-[10px] text-white/80">Recordings</p>
        </div>
      </div>
    </div>

    {/* Upcoming */}
    <div>
      <h2 className="text-lg font-bold text-foreground mb-3">Upcoming & Live Classes</h2>
      <div className="space-y-3">
        {upcomingClasses.map((cls) => (
          <Link
            key={cls.id}
            to={`/live-classes/${cls.id}`}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${subjectColors[cls.subject]} text-white shrink-0`}>
              <Video className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground truncate">{cls.title}</h3>
                {cls.status === "live" && (
                  <span className="flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" /> LIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{cls.teacher} · {cls.subject}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {cls.date}</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {cls.students} enrolled</span>
              </div>
            </div>
            <button className={`rounded-lg px-4 py-2 text-xs font-bold transition-opacity ${cls.status === "live" ? "bg-destructive text-white hover:opacity-90" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
              {cls.status === "live" ? "Join Now" : "Remind Me"}
            </button>
          </Link>
        ))}
      </div>
    </div>

    {/* Past Recordings */}
    <div>
      <h2 className="text-lg font-bold text-foreground mb-3">Past Recordings</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {pastRecordings.map((rec) => (
          <div key={rec.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${subjectColors[rec.subject]} text-white`}>
                <Play className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">{rec.title}</h3>
                <p className="text-xs text-muted-foreground">{rec.teacher}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {rec.date}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {rec.duration}</span>
              <span className="flex items-center gap-1"><Play className="h-3 w-3" /> {rec.views} views</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default LiveClassesListPage;
