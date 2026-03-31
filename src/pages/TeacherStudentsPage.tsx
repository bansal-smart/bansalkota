import { Users, Search, BarChart3, Clock, TrendingUp } from "lucide-react";
import { useState } from "react";

const students = [
  { id: 1, name: "Aarav Sharma", batch: "JEE Adv 2026", progress: 78, lastActive: "2 hrs ago", testsCompleted: 24, avgScore: 82, initials: "AS" },
  { id: 2, name: "Ishita Patel", batch: "JEE Adv 2026", progress: 92, lastActive: "30 min ago", testsCompleted: 28, avgScore: 91, initials: "IP" },
  { id: 3, name: "Dev Ranganathan", batch: "JEE Mains 2026", progress: 65, lastActive: "1 day ago", testsCompleted: 18, avgScore: 74, initials: "DR" },
  { id: 4, name: "Meera Joshi", batch: "JEE Adv 2026", progress: 85, lastActive: "5 hrs ago", testsCompleted: 26, avgScore: 88, initials: "MJ" },
  { id: 5, name: "Arjun Nair", batch: "JEE Mains 2026", progress: 58, lastActive: "3 days ago", testsCompleted: 12, avgScore: 67, initials: "AN" },
  { id: 6, name: "Zara Khan", batch: "JEE Adv 2026", progress: 95, lastActive: "1 hr ago", testsCompleted: 30, avgScore: 94, initials: "ZK" },
  { id: 7, name: "Riya Gupta", batch: "JEE Mains 2026", progress: 71, lastActive: "6 hrs ago", testsCompleted: 20, avgScore: 76, initials: "RG" },
  { id: 8, name: "Kabir Singh", batch: "JEE Adv 2026", progress: 44, lastActive: "5 days ago", testsCompleted: 8, avgScore: 55, initials: "KS" },
];

const TeacherStudentsPage = () => {
  const [search, setSearch] = useState("");
  const filtered = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.batch.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-6 text-white">
        <h1 className="text-2xl font-black font-display">My Students</h1>
        <p className="text-white/90 text-sm mt-1">Track performance and engagement across your batches</p>
        <div className="flex gap-4 mt-4">
          <div className="rounded-xl bg-white/20 px-4 py-2 text-center"><p className="text-lg font-bold">{students.length}</p><p className="text-[10px] text-white/80">Total</p></div>
          <div className="rounded-xl bg-white/20 px-4 py-2 text-center"><p className="text-lg font-bold">79%</p><p className="text-[10px] text-white/80">Avg Progress</p></div>
          <div className="rounded-xl bg-white/20 px-4 py-2 text-center"><p className="text-lg font-bold">78</p><p className="text-[10px] text-white/80">Avg Score</p></div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Student</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Batch</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Progress</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Avg Score</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Tests</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{s.initials}</div>
                      <span className="font-medium text-foreground">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{s.batch}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${s.progress}%` }} /></div>
                      <span className="text-xs font-semibold text-foreground">{s.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center"><span className={`text-xs font-bold ${s.avgScore >= 80 ? "text-secondary" : s.avgScore >= 60 ? "text-amber-500" : "text-destructive"}`}>{s.avgScore}%</span></td>
                  <td className="px-4 py-3 text-center text-xs text-foreground">{s.testsCompleted}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {s.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherStudentsPage;
