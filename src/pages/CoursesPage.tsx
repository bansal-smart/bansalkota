import { useState } from "react";
import { Star, Users, ChevronRight, Zap, FlaskConical, Compass, Atom, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const goalFilters = ["IIT JEE", "NEET", "Class 11", "Class 12"];
const subjectFilters = ["All", "Physics", "Chemistry", "Maths", "Biology"];

const courses = [
  { slug: "jee-physics-booster", name: "JEE Physics Complete — Booster Batch", desc: "Master all physics concepts with Ramesh Sir", educator: "Ramesh Kumar", rating: 4.8, enrolled: "2.1K", price: 1300, original: 2500, discount: 47, subject: "Physics", icon: Zap, gradient: "from-primary to-primary-dark", badge: "ONGOING", badgeColor: "bg-secondary text-secondary-foreground" },
  { slug: "organic-chemistry-crash", name: "Organic Chemistry — Crash Course", desc: "Complete organic chemistry in 30 days", educator: "Priya Sharma", rating: 4.7, enrolled: "1.8K", price: 999, original: 1999, discount: 50, subject: "Chemistry", icon: FlaskConical, gradient: "from-blue-500 to-purple-600", badge: "NEW", badgeColor: "bg-accent text-accent-foreground" },
  { slug: "calculus-masterclass", name: "Calculus Integration Masterclass", desc: "Advanced integration techniques for JEE", educator: "AK Bansal", rating: 4.9, enrolled: "3.2K", price: 1500, original: 2800, discount: 46, subject: "Maths", icon: Compass, gradient: "from-secondary to-secondary-dark", badge: null, badgeColor: "" },
  { slug: "jee-full-syllabus", name: "JEE 2027 Full Syllabus Batch", desc: "Complete JEE preparation from scratch", educator: "Multiple Educators", rating: 4.6, enrolled: "5.4K", price: 4999, original: 9999, discount: 50, subject: "All", icon: Atom, gradient: "from-accent to-amber-600", badge: "POPULAR", badgeColor: "bg-primary text-primary-foreground" },
  { slug: "neet-biology", name: "NEET Biology Complete Course", desc: "Botany + Zoology comprehensive coverage", educator: "Dr. Meera Patel", rating: 4.8, enrolled: "4.1K", price: 2499, original: 4999, discount: 50, subject: "Biology", icon: Atom, gradient: "from-green-500 to-teal-600", badge: null, badgeColor: "" },
  { slug: "physics-chapter-wise", name: "Physics Chapter-wise Tests Bundle", desc: "100+ chapter tests with detailed solutions", educator: "Ramesh Kumar", rating: 4.5, enrolled: "1.2K", price: 799, original: 1499, discount: 47, subject: "Physics", icon: Zap, gradient: "from-primary to-primary-dark", badge: null, badgeColor: "" },
];

const CoursesPage = () => {
  const [activeGoal, setActiveGoal] = useState(0);
  const [activeSubject, setActiveSubject] = useState(0);
  const [activeView, setActiveView] = useState<"all" | "my">("all");

  return (
    <div className="pb-20 lg:pb-0">
      <div className="p-4 lg:p-6 space-y-5">
        {/* Title + Tabs */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black font-display text-foreground">Popular Batches</h1>
          <div className="flex gap-1">
            {(["all", "my"] as const).map(v => (
              <button key={v} onClick={() => setActiveView(v)} className={`px-3 py-1 text-xs font-semibold rounded-lg ${activeView === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"}`}>
                {v === "all" ? "All Courses" : "My Courses"}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {goalFilters.map((g, i) => (
              <button key={g} onClick={() => setActiveGoal(i)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${i === activeGoal ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-muted/30"}`}>{g}</button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {subjectFilters.map((s, i) => (
              <button key={s} onClick={() => setActiveSubject(i)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${i === activeSubject ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/50"}`}>{s}</button>
            ))}
          </div>
        </div>

        {/* Featured Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-primary to-accent p-5 text-white relative overflow-hidden">
          <h3 className="text-sm font-bold">Early Access — JEE 2027 Batch Now Open</h3>
          <p className="text-xs opacity-80 mt-1 mb-3">Limited seats available</p>
          <div className="h-1.5 w-48 rounded-full bg-white/20 mb-2"><div className="h-1.5 w-32 rounded-full bg-white" /></div>
          <p className="text-[10px] opacity-70 mb-3">67% seats filled</p>
          <button className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-4 py-2 text-xs font-bold hover:bg-white/30 transition-colors">Book Seat <ArrowRight className="h-3 w-3" /></button>
        </div>

        {/* Course Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(c => (
            <Link key={c.slug} to={`/courses/${c.slug}`} className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow group">
              <div className={`h-36 bg-gradient-to-br ${c.gradient} relative flex items-center justify-center`}>
                <c.icon className="h-12 w-12 text-white/30" />
                {c.badge && <span className={`absolute top-3 left-3 rounded-full px-2 py-0.5 text-[10px] font-bold ${c.badgeColor}`}>{c.badge}</span>}
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white">{c.educator.split(" ").map(n => n[0]).join("")}</div>
                  <span className="text-[10px] text-white/80">{c.educator}</span>
                </div>
              </div>
              <div className="p-4">
                <p className="text-[10px] font-bold text-primary uppercase">{c.subject}</p>
                <p className="text-sm font-bold text-foreground mt-1 line-clamp-2">{c.name}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.desc}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-accent fill-accent" /> {c.rating}</span>
                  <span className="flex items-center gap-0.5"><Users className="h-3 w-3" /> {c.enrolled}</span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs line-through text-muted-foreground">₹{c.original.toLocaleString()}</span>
                  <span className="text-sm font-bold text-foreground">₹{c.price.toLocaleString()}/mo</span>
                  <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">{c.discount}% OFF</span>
                </div>
                <button className="mt-3 w-full rounded-xl border border-primary py-2 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  View Batch <ChevronRight className="inline h-3 w-3" />
                </button>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CoursesPage;
