import { useState } from "react";
import { Search, ChevronRight, Clock, FileText, Filter, Keyboard } from "lucide-react";
import { Link } from "react-router-dom";
import LiveBadge from "@/components/LiveBadge";

const tabs = ["All Tests", "My Tests"];
const subTabs = ["Ongoing Tests", "Previous Year Tests", "Past Tests", "Bookmarked"];

const tests = [
  { id: "1", name: "JEE Main 2026 (Jan 21) Shift 1", sub: "IIT JEE Previous Year Question Papers 2011-2026", category: "PREVIOUS YEAR TESTS", questions: 25, duration: 180, ongoing: false },
  { id: "2", name: "JEE Advanced 2025 (Paper – 2)", sub: "IIT JEE Previous Year Question Papers 2011-2026", category: "PREVIOUS YEAR TESTS", questions: 48, duration: 180, ongoing: false },
  { id: "3", name: "JEE Advanced 2025 (Paper – 1)", sub: "IIT JEE Previous Year Question Papers 2011-2026", category: "PREVIOUS YEAR TESTS", questions: 48, duration: 180, ongoing: false },
  { id: "4", name: "JEE Main 2025 (Apr) Shift 2", sub: "IIT JEE Previous Year Question Papers 2011-2026", category: "PREVIOUS YEAR TESTS", questions: 90, duration: 180, ongoing: false },
  { id: "5", name: "JEE Main Mock Test #12", sub: "Full Length Mock Tests", category: "MOCK TESTS", questions: 90, duration: 180, ongoing: true },
  { id: "6", name: "Physics Chapter Test — Electrostatics", sub: "Chapter-wise Tests", category: "CHAPTER TESTS", questions: 30, duration: 45, ongoing: false },
];

const TestListPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState(1);

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header Tabs */}
      <div className="bg-[hsl(var(--navy))] grid-texture px-4 pt-4 pb-0">
        <div className="flex gap-6">
          {tabs.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)} className={`pb-3 text-sm font-bold transition-colors ${i === activeTab ? "text-white border-b-2 border-white" : "text-white/60 hover:text-white/80"}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 lg:p-6 space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input type="text" placeholder="Search for tests..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
          <Keyboard className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        {/* Sub Tabs */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {subTabs.map((tab, i) => (
            <button key={tab} onClick={() => setActiveSubTab(i)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${i === activeSubTab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {["All status", "Educator", "All subscription types"].map((f) => (
            <button key={f} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/30">
              <Filter className="h-3 w-3" /> {f}
            </button>
          ))}
        </div>

        {/* Test Cards */}
        <div className="space-y-3">
          {tests.map((test) => (
            <Link key={test.id} to={`/tests/${test.id}/take`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors group">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">{test.category}</p>
                <p className="text-sm font-bold text-foreground mb-0.5">{test.name}</p>
                <p className="text-xs text-muted-foreground mb-2">{test.sub}</p>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    <FileText className="h-3 w-3" /> {test.questions} questions
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    <Clock className="h-3 w-3" /> {test.duration} min
                  </span>
                  {test.ongoing && <LiveBadge />}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestListPage;
