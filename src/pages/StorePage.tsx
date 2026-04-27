import { ShoppingBag, Star, Clock, Check, Search, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const courses = [
  { id: 1, title: "JEE Advanced Complete Physics", teacher: "Vikram Thapar", price: 4999, originalPrice: 8999, rating: 4.9, students: 3200, duration: "120+ hrs", features: ["Live classes", "Test series", "Doubt support"], color: "from-blue-500 to-blue-600", tag: "Bestseller" },
  { id: 2, title: "NEET Biology Mastery", teacher: "Karan Deshmukh", price: 3999, originalPrice: 6999, rating: 4.8, students: 2800, duration: "90+ hrs", features: ["Video lectures", "QBank access", "Weekly tests"], color: "from-pink-500 to-pink-600", tag: "Popular" },
  { id: 3, title: "Mathematics Pro — JEE Mains+Adv", teacher: "Ananya Iyer", price: 5499, originalPrice: 9999, rating: 4.9, students: 2100, duration: "150+ hrs", features: ["Live + recorded", "DPPs", "Rank predictor"], color: "from-purple-500 to-purple-600", tag: "New" },
  { id: 4, title: "Organic Chemistry Crash Course", teacher: "Priya Mehta", price: 1999, originalPrice: 3999, rating: 4.7, students: 1800, duration: "45 hrs", features: ["Reaction mechanisms", "Practice sheets", "Live doubts"], color: "from-green-500 to-green-600", tag: "" },
  { id: 5, title: "Board Exam Topper Pack", teacher: "Multiple Faculty", price: 2999, originalPrice: 5999, rating: 4.6, students: 4200, duration: "200+ hrs", features: ["All subjects", "Sample papers", "Revision notes"], color: "from-amber-500 to-amber-600", tag: "Best Value" },
  { id: 6, title: "1-on-1 Mentorship — 10 Sessions", teacher: "Choose Your Mentor", price: 9999, originalPrice: 14999, rating: 5.0, students: 320, duration: "10 sessions", features: ["Personal mentor", "Custom plan", "Priority doubts"], color: "from-primary to-accent", tag: "Premium" },
];

const StorePage = () => {
  const [search, setSearch] = useState("");
  const filtered = courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <ShoppingBag className="h-7 w-7" />
          <h1 className="text-2xl font-black font-display">Course Store</h1>
        </div>
        <p className="text-white/90 text-sm">Enroll in courses, test series, and mentorship programs</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..." className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(course => (
          <div key={course.id} className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow">
            <div className={`h-28 bg-gradient-to-br ${course.color} p-4 flex flex-col justify-between`}>
              {course.tag && <span className="self-start rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">{course.tag}</span>}
              <h3 className="text-sm font-bold text-white leading-tight">{course.title}</h3>
            </div>
            <div className="p-4">
              <p className="text-xs text-muted-foreground">{course.teacher}</p>
              <div className="flex items-center gap-2 mt-2">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-semibold text-foreground">{course.rating}</span>
                <span className="text-xs text-muted-foreground">· {course.students.toLocaleString()} students</span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {course.duration}
              </div>
              <ul className="mt-3 space-y-1">
                {course.features.map(f => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground"><Check className="h-3 w-3 text-secondary" /> {f}</li>
                ))}
              </ul>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-lg font-black text-foreground">₹{course.price.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground line-through">₹{course.originalPrice.toLocaleString()}</span>
                <span className="text-xs font-bold text-secondary">{Math.round((1 - course.price / course.originalPrice) * 100)}% off</span>
              </div>
              <button
                onClick={() => toast.info("Payment integration is not yet implemented", { description: "Checkout will be enabled in a future update." })}
                className="w-full mt-3 rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Enroll Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StorePage;
