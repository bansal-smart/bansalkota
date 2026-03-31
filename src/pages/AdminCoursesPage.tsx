import { BookOpen, Search, Check, X, Eye } from "lucide-react";
import { useState } from "react";

const courses = [
  { id: 1, title: "Complete Physics — JEE Advanced", teacher: "Vikram Thapar", students: 3200, status: "approved", revenue: "₹14.2L", date: "Jan 15, 2026" },
  { id: 2, title: "NEET Biology Mastery", teacher: "Karan Deshmukh", students: 2800, status: "approved", revenue: "₹9.8L", date: "Feb 1, 2026" },
  { id: 3, title: "Mathematics Pro — JEE Mains", teacher: "Ananya Iyer", students: 2100, status: "approved", revenue: "₹11.5L", date: "Feb 10, 2026" },
  { id: 4, title: "Organic Chemistry Crash", teacher: "Priya Mehta", students: 0, status: "pending", revenue: "—", date: "Mar 28, 2026" },
  { id: 5, title: "Advanced Calculus", teacher: "Rohan Gupta", students: 0, status: "pending", revenue: "—", date: "Mar 30, 2026" },
  { id: 6, title: "Mechanics Revision", teacher: "Sneha Kulkarni", students: 950, status: "rejected", revenue: "₹2.1L", date: "Mar 15, 2026" },
];

const statusColors: Record<string, string> = { approved: "bg-secondary/20 text-secondary", pending: "bg-amber-500/20 text-amber-600", rejected: "bg-destructive/20 text-destructive" };

const AdminCoursesPage = () => {
  const [search, setSearch] = useState("");
  const filtered = courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()) || c.teacher.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-6 text-white">
        <h1 className="text-2xl font-black font-display">Courses Management</h1>
        <p className="text-white/90 text-sm mt-1">Review, approve, and manage all platform courses</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses or teachers..." className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Course</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Teacher</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Students</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Revenue</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{c.title}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{c.teacher}</td>
                  <td className="px-4 py-3 text-center text-xs text-foreground">{c.students.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-xs text-foreground">{c.revenue}</td>
                  <td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[c.status]}`}>{c.status}</span></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"><Eye className="h-3.5 w-3.5" /></button>
                      {c.status === "pending" && <>
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

export default AdminCoursesPage;
