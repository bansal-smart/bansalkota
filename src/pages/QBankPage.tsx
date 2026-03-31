import { useState } from "react";
import { Trophy, Brain, Search, ChevronRight, BookOpen, Beaker, Calculator, Atom, Leaf } from "lucide-react";

const subjectTabs = ["All", "Physics", "Mathematics", "Chemistry", "Biology"];

const topics = [
  { name: "Basics & Laboratory", subject: "Physics", chapters: 3, icon: Atom, gradient: "from-amber-400 to-orange-500" },
  { name: "Mechanics", subject: "Physics", chapters: 5, icon: Atom, gradient: "from-amber-400 to-orange-500" },
  { name: "Thermodynamics", subject: "Physics", chapters: 4, icon: Atom, gradient: "from-amber-400 to-orange-500" },
  { name: "Organic Chemistry", subject: "Chemistry", chapters: 6, icon: Beaker, gradient: "from-blue-400 to-purple-500" },
  { name: "Inorganic Chemistry", subject: "Chemistry", chapters: 4, icon: Beaker, gradient: "from-blue-400 to-purple-500" },
  { name: "Physical Chemistry", subject: "Chemistry", chapters: 5, icon: Beaker, gradient: "from-blue-400 to-purple-500" },
];

const QBankPage = () => {
  const [activeTab, setActiveTab] = useState(0);

  const filtered = activeTab === 0 ? topics : topics.filter(t => t.subject === subjectTabs[activeTab]);

  return (
    <div className="pb-20 lg:pb-0">
      <div className="bg-[hsl(var(--navy))] grid-texture px-4 pt-4 pb-5">
        <h1 className="text-lg font-black font-display text-white">Question Bank</h1>
      </div>

      <div className="p-4 lg:p-6 space-y-4">
        {/* Hero Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-4 text-white relative overflow-hidden">
            <h3 className="text-sm font-bold">Compete</h3>
            <p className="text-[10px] opacity-80 mt-1">See where you rank among peers!</p>
            <Trophy className="absolute right-3 bottom-3 h-10 w-10 opacity-20" />
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-secondary to-secondary-dark p-4 text-white relative overflow-hidden">
            <h3 className="text-sm font-bold">Ask a Doubt</h3>
            <p className="text-[10px] opacity-80 mt-1">Upload image & get instant answers!</p>
            <Brain className="absolute right-3 bottom-3 h-10 w-10 opacity-20" />
          </div>
        </div>

        {/* PYQ Banner */}
        <div className="rounded-xl bg-primary-light border border-primary/10 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">Previous Year Questions</p>
            <p className="text-xs text-muted-foreground">1,000+ questions · 1980 – 2026</p>
            <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">1980 – 2026</span>
          </div>
          <BookOpen className="h-10 w-10 text-primary/30" />
        </div>

        {/* Subject Tabs */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {subjectTabs.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)} className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${i === activeTab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search for a question or topic..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
        </div>

        {/* Topic Cards */}
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(topic => (
            <div key={topic.name} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors cursor-pointer group">
              <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${topic.gradient} flex items-center justify-center mb-3`}>
                <topic.icon className="h-6 w-6 text-white" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">{topic.subject}</p>
              <p className="text-sm font-bold text-foreground">{topic.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{topic.chapters} Chapters</p>
              <ChevronRight className="h-4 w-4 text-muted-foreground mt-2 group-hover:text-primary transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QBankPage;
