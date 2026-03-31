import { useState } from "react";
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2, Maximize2, Settings, Download, Lock, CheckCircle2, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

const chapters = [
  {
    name: "Mechanics", lectures: [
      { title: "Introduction", duration: "12:30", status: "completed" },
      { title: "Newton's Laws", duration: "45:00", status: "completed" },
      { title: "Friction", duration: "38:20", status: "playing" },
      { title: "Circular Motion", duration: "42:10", status: "locked" },
    ],
  },
  {
    name: "Thermodynamics", lectures: [
      { title: "Heat & Temperature", duration: "35:00", status: "locked" },
      { title: "Laws of Thermodynamics", duration: "48:00", status: "locked" },
    ],
  },
];

const speeds = ["0.5x", "0.75x", "1x", "1.25x", "1.5x", "2x"];

const LecturePlayerPage = () => {
  const [playing, setPlaying] = useState(false);
  const [expandedChapter, setExpandedChapter] = useState(0);
  const [activeSpeed, setActiveSpeed] = useState(2);
  const [progress] = useState(45);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(222, 47%, 8%)" }}>
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-[hsl(var(--navy))]">
        <div className="flex items-center gap-3">
          <Link to="/courses/jee-physics-booster" className="text-white"><ArrowLeft className="h-5 w-5" /></Link>
          <span className="text-sm font-bold text-white">JEE Physics Booster</span>
        </div>
        <span className="text-xs text-white/60">Lecture 3/48</span>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Video Area */}
        <div className="flex-1 flex flex-col">
          {/* Video */}
          <div className="relative aspect-video bg-black flex items-center justify-center">
            <div className="text-center">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary-dark/20 mx-auto flex items-center justify-center mb-3">
                <Play className="h-8 w-8 text-white/50 ml-1" />
              </div>
              <p className="text-white/40 text-sm">Friction — Mechanics</p>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-12 inset-x-0 px-4">
              <div className="h-1 rounded-full bg-white/20 cursor-pointer">
                <div className="h-1 rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button><SkipBack className="h-4 w-4 text-white/80" /></button>
                <button className="rounded-full bg-white/10 p-1"><SkipBack className="h-3 w-3 text-white/80" /></button>
                <button onClick={() => setPlaying(!playing)} className="h-10 w-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary-dark transition-colors">
                  {playing ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white ml-0.5" />}
                </button>
                <button className="rounded-full bg-white/10 p-1"><SkipForward className="h-3 w-3 text-white/80" /></button>
                <button><SkipForward className="h-4 w-4 text-white/80" /></button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/60">17:12 / 38:20</span>
                <div className="flex gap-0.5">
                  {speeds.map((s, i) => (
                    <button key={s} onClick={() => setActiveSpeed(i)} className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${i === activeSpeed ? "bg-primary text-white" : "text-white/50 hover:text-white/80"}`}>{s}</button>
                  ))}
                </div>
                <button><Volume2 className="h-4 w-4 text-white/80" /></button>
                <button><Settings className="h-4 w-4 text-white/80" /></button>
                <button><Download className="h-4 w-4 text-white/80" /></button>
                <button><Maximize2 className="h-4 w-4 text-white/80" /></button>
              </div>
            </div>
          </div>

          {/* Below Video Tabs */}
          <div className="flex gap-4 px-4 py-3 border-b border-white/10">
            {["Notes", "Doubts", "Resources"].map((tab, i) => (
              <button key={tab} className={`text-xs font-semibold ${i === 0 ? "text-primary" : "text-white/50 hover:text-white/80"}`}>{tab}</button>
            ))}
          </div>
          <div className="flex-1 p-4">
            <textarea placeholder="Take notes for this lecture..." className="w-full h-32 rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white/80 placeholder:text-white/30 outline-none resize-none focus:border-primary/50" />
          </div>
        </div>

        {/* Curriculum Sidebar */}
        <div className="lg:w-[320px] border-l border-white/10 bg-[hsl(var(--navy2))] overflow-y-auto">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-sm font-bold text-white">Course Content</h3>
            <p className="text-[10px] text-white/50 mt-1">3 of 48 completed</p>
            <div className="h-1.5 rounded-full bg-white/10 mt-2"><div className="h-1.5 rounded-full bg-secondary" style={{ width: "6%" }} /></div>
          </div>
          <div className="space-y-0">
            {chapters.map((ch, ci) => (
              <div key={ch.name}>
                <button onClick={() => setExpandedChapter(expandedChapter === ci ? -1 : ci)} className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/5 transition-colors">
                  <span className="text-xs font-bold text-white">{ch.name} ({ch.lectures.length})</span>
                  <ChevronDown className={`h-4 w-4 text-white/50 transition-transform ${expandedChapter === ci ? "rotate-180" : ""}`} />
                </button>
                {expandedChapter === ci && (
                  <div className="space-y-0">
                    {ch.lectures.map((lec, li) => (
                      <div key={lec.title} className={`flex items-center gap-3 px-4 py-2.5 text-xs ${lec.status === "playing" ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-white/5"} transition-colors cursor-pointer`}>
                        {lec.status === "completed" && <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />}
                        {lec.status === "playing" && <Play className="h-4 w-4 text-primary shrink-0" />}
                        {lec.status === "locked" && <Lock className="h-4 w-4 text-white/30 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${lec.status === "locked" ? "text-white/30" : "text-white/80"}`}>{lec.title}</p>
                          <p className="text-white/40 text-[10px]">{lec.duration}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LecturePlayerPage;
