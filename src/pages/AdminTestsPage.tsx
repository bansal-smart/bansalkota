import { ClipboardCheck, Search, Check, X, Eye, Users, Clock } from "lucide-react";
import { useState } from "react";

const tests = [
  { id: 1, title: "JEE Advanced Mock Test 1", teacher: "Vikram Thapar", questions: 60, duration: "3 hrs", attempts: 2840, status: "approved", date: "Mar 15" },
  { id: 2, title: "NEET Full Syllabus Test", teacher: "Karan Deshmukh", questions: 180, duration: "3 hrs", attempts: 3200, status: "approved", date: "Mar 18" },
  { id: 3, title: "Mathematics Chapter Test — Calculus", teacher: "Ananya Iyer", questions: 30, duration: "1 hr", attempts: 1500, status: "approved", date: "Mar 20" },
  { id: 4, title: "Chemistry Weekly Quiz #12", teacher: "Priya Mehta", questions: 25, duration: "45 min", attempts: 0, status: "pending", date: "Mar 29" },
  { id: 5, title: "Physics DPP — Electrostatics", teacher: "Sneha Kulkarni", questions: 20, duration: "30 min", attempts: 0, status: "pending", date: "Mar 30" },
];

const statusColors: Record<string, string> = { approved: "bg-secondary/20 text-secondary", pending: "bg-amber-500/20 text-amber-600" };

const AdminTestsPage = () => {
  const [search, setSearch] = useState("");
  const filtered = tests.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-6 text-white">
        <h1 className="text-2xl font-black font-display">Tests Management</h1>
        <p className="text-white/90 text-sm mt-1">Review and approve test papers from educators</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tests..." className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Test</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Teacher</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Questions</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Duration</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Attempts</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{t.title}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{t.teacher}</td>
                  <td className="px-4 py-3 text-center text-xs text-foreground">{t.questions}</td>
                  <td className="px-4 py-3 text-center text-xs text-foreground">{t.duration}</td>
                  <td className="px-4 py-3 text-center text-xs text-foreground">{t.attempts.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[t.status]}`}>{t.status}</span></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"><Eye className="h-3.5 w-3.5" /></button>
                      {t.status === "pending" && <>
                        <button className="rounded-md p-1.5 text-secondary hover:bg-secondary/10 transition-colors"><Check className="h-3.5 w-3.5" /></button>
                        <button className="rounded-md p-1.5 text-destructive hover:bg-destructive/10 transition-colors"><X className="h-3.5 w-3.5" /></button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminTestsPage;
