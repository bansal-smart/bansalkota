import { Star, Video, BookOpen, MessageCircle, Search } from "lucide-react";
import { useState } from "react";

const educators = [
  { id: 1, name: "Vikram Thapar", subject: "Physics", rating: 4.9, students: 12400, classes: 340, photo: "VT", color: "from-blue-500 to-blue-600", exp: "12 yrs", speciality: "IIT JEE Advanced" },
  { id: 2, name: "Priya Mehta", subject: "Chemistry", rating: 4.8, students: 9800, classes: 290, photo: "PM", color: "from-green-500 to-green-600", exp: "10 yrs", speciality: "Organic Chemistry" },
  { id: 3, name: "Ananya Iyer", subject: "Mathematics", rating: 4.9, students: 11200, classes: 310, photo: "AI", color: "from-purple-500 to-purple-600", exp: "15 yrs", speciality: "Calculus & Algebra" },
  { id: 4, name: "Karan Deshmukh", subject: "Biology", rating: 4.7, students: 8500, classes: 250, photo: "KD", color: "from-pink-500 to-pink-600", exp: "8 yrs", speciality: "NEET Biology" },
  { id: 5, name: "Sneha Kulkarni", subject: "Physics", rating: 4.8, students: 7600, classes: 180, photo: "SK", color: "from-cyan-500 to-cyan-600", exp: "9 yrs", speciality: "Electromagnetism" },
  { id: 6, name: "Rohan Gupta", subject: "Mathematics", rating: 4.6, students: 6400, classes: 210, photo: "RG", color: "from-amber-500 to-amber-600", exp: "7 yrs", speciality: "Coordinate Geometry" },
];

const EducatorsPage = () => {
  const [search, setSearch] = useState("");
  const filtered = educators.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.subject.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-6 text-white">
        <h1 className="text-2xl font-black font-display">Our Educators</h1>
        <p className="text-white/90 text-sm mt-1">Learn from India's finest faculty — book 1-on-1 or join their batches</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or subject..." className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(edu => (
          <div key={edu.id} className="rounded-xl border border-border bg-card p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${edu.color} text-white text-lg font-bold`}>{edu.photo}</div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{edu.name}</h3>
                <p className="text-xs text-muted-foreground">{edu.subject} · {edu.exp}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-semibold text-foreground">{edu.rating}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Speciality: {edu.speciality}</p>
            <div className="flex gap-2 text-xs text-muted-foreground mb-4">
              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {edu.classes} classes</span>
              <span className="flex items-center gap-1"><Video className="h-3 w-3" /> {edu.students.toLocaleString()} students</span>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity">Book 1-on-1</button>
              <button className="flex-1 rounded-lg border border-border py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1"><MessageCircle className="h-3 w-3" /> Message</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EducatorsPage;
