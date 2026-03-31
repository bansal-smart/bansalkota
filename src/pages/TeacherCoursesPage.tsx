import { BookOpen, Plus, Users, Star, Eye, Edit, Archive, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const courses = [
  { id: 1, title: "Complete Physics — JEE Advanced", students: 3200, rating: 4.9, lectures: 85, revenue: "₹14.2L", status: "active", color: "from-blue-500 to-blue-600" },
  { id: 2, title: "Electromagnetism Masterclass", students: 1800, rating: 4.8, lectures: 42, revenue: "₹6.8L", status: "active", color: "from-cyan-500 to-cyan-600" },
  { id: 3, title: "Optics & Modern Physics", students: 950, rating: 4.7, lectures: 28, revenue: "₹3.2L", status: "draft", color: "from-indigo-500 to-indigo-600" },
];

const TeacherCoursesPage = () => (
  <div className="p-4 lg:p-6 space-y-6">
    <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-6 text-white flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-black font-display">My Courses</h1>
        <p className="text-white/90 text-sm mt-1">Manage your courses, lectures, and enrollments</p>
      </div>
      <Link to="/teacher/courses/create" className="flex items-center gap-1.5 rounded-lg bg-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/30 transition-colors">
        <Plus className="h-4 w-4" /> New Course
      </Link>
    </div>

    <div className="space-y-4">
      {courses.map(c => (
        <div key={c.id} className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${c.color} text-white shrink-0`}>
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">{c.title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.status === "active" ? "bg-secondary/20 text-secondary" : "bg-muted text-muted-foreground"}`}>{c.status}</span>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.students.toLocaleString()} students</span>
                <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {c.rating}</span>
                <span>{c.lectures} lectures</span>
                <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /> {c.revenue} earned</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted transition-colors"><Eye className="h-4 w-4" /></button>
              <button className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted transition-colors"><Edit className="h-4 w-4" /></button>
              <button className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted transition-colors"><Archive className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default TeacherCoursesPage;
