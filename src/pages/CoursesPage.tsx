import { useState } from "react";
import { Star, Users, ChevronRight, Loader2, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { useCourses } from "@/hooks/useCourses";
import coursePhysics from "@/assets/course-physics.png";
import courseChemistry from "@/assets/course-chemistry.png";
import courseMaths from "@/assets/course-maths.png";
import courseBiology from "@/assets/course-biology.png";

const goalFilters = ["All", "JEE", "NEET", "Class 11", "Class 12"];
const subjectFilters = ["All", "Physics", "Chemistry", "Maths", "Biology"];

const courseImages: Record<string, string> = {
  Physics: coursePhysics,
  Chemistry: courseChemistry,
  Maths: courseMaths,
  Biology: courseBiology,
};

const CoursesPage = () => {
  const [activeGoal, setActiveGoal] = useState(0);
  const [activeSubject, setActiveSubject] = useState(0);

  const { courses, loading } = useCourses(goalFilters[activeGoal], subjectFilters[activeSubject]);

  return (
    <div className="pb-20 lg:pb-0">
      <div className="p-4 lg:p-6 space-y-5">
        <div className="flex items-center justify-between animate-fade-in-up">
          <div>
            <h1 className="text-lg font-black font-display text-foreground">Popular Batches</h1>
            <p className="text-xs text-muted-foreground">{courses.length} course{courses.length === 1 ? "" : "s"} available</p>
          </div>
          <Link to="/my-courses" className="px-3 py-1 text-xs font-semibold rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground">
            My Courses
          </Link>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {goalFilters.map((g, i) => (
              <button
                key={g}
                onClick={() => setActiveGoal(i)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  i === activeGoal ? "bg-gradient-to-r from-primary to-accent text-primary-foreground" : "border border-border text-muted-foreground hover:bg-muted/30"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {subjectFilters.map((s, i) => (
              <button
                key={s}
                onClick={() => setActiveSubject(i)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  i === activeSubject ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <GraduationCap className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="font-display text-lg font-bold text-foreground">No courses match these filters</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try a different exam or subject combination.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {courses.map((c) => {
              const img = c.thumbnail_url || courseImages[c.subject] || coursePhysics;
              return (
                <Link key={c.id} to={`/courses/${c.slug}`} className="rounded-2xl border border-border bg-card overflow-hidden hover-lift group">
                  <div className="h-36 bg-gradient-to-br from-primary to-accent relative flex items-center justify-center overflow-hidden">
                    <img src={img} alt={c.subject} loading="lazy" className="h-24 w-24 object-contain opacity-60" />
                    {c.badge && (
                      <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-foreground">{c.badge}</span>
                    )}
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                        {c.educator_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <span className="text-[10px] text-white/80">{c.educator_name}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] font-bold text-primary uppercase">{c.subject}</p>
                    <p className="text-sm font-bold text-foreground mt-1 line-clamp-2">{c.name}</p>
                    {c.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 text-accent fill-accent" /> {Number(c.rating).toFixed(1)}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Users className="h-3 w-3" /> {(c.total_enrolled ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {c.original_price && c.original_price > c.price && (
                        <span className="text-xs line-through text-muted-foreground">₹{Number(c.original_price).toLocaleString()}</span>
                      )}
                      <span className="text-sm font-bold text-foreground">₹{Number(c.price).toLocaleString()}</span>
                      {!!c.discount_percent && c.discount_percent > 0 && (
                        <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">{c.discount_percent}% OFF</span>
                      )}
                    </div>
                    <button className="mt-3 w-full rounded-xl border border-primary py-2 text-xs font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      View Batch <ChevronRight className="inline h-3 w-3" />
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursesPage;
