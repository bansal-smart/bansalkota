import { useState } from "react";
import { ArrowLeft, ArrowRight, Flag, Clock, MoreVertical, CheckCircle2, Circle, XCircle, Bookmark } from "lucide-react";
import { Link } from "react-router-dom";

const mockQuestions = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  text: i === 6
    ? "A wire of length L carries a current I. It is bent to form a circular loop. The magnetic moment of the loop is:"
    : `Sample question ${i + 1} for the mock test. This tests your understanding of core concepts in physics.`,
  topic: ["Current Electricity", "Electrostatics", "Magnetism", "Optics", "Mechanics"][i % 5],
  options: ["πIL²/4", "IL²/4π", "IL²/2π", "2πIL²"],
  correct: 1,
  marks: { positive: 4, negative: 1 },
}));

type QStatus = "not-visited" | "answered" | "not-answered" | "marked" | "answered-marked";

const TestTakingPage = () => {
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<Record<number, number | null>>({});
  const [statuses, setStatuses] = useState<Record<number, QStatus>>({});
  const [showPalette, setShowPalette] = useState(true);

  const q = mockQuestions[currentQ];

  const updateStatus = (idx: number, status: QStatus) => setStatuses(prev => ({ ...prev, [idx]: status }));

  const handleSelect = (optIdx: number) => {
    setSelected(prev => ({ ...prev, [currentQ]: optIdx }));
    updateStatus(currentQ, "answered");
  };

  const handleNext = () => {
    if (currentQ < mockQuestions.length - 1) {
      const nextIdx = currentQ + 1;
      if (!statuses[nextIdx]) updateStatus(nextIdx, "not-answered");
      setCurrentQ(nextIdx);
    }
  };

  const handlePrev = () => {
    if (currentQ > 0) setCurrentQ(currentQ - 1);
  };

  const handleMarkAndNext = () => {
    updateStatus(currentQ, selected[currentQ] != null ? "answered-marked" : "marked");
    handleNext();
  };

  const handleClear = () => {
    setSelected(prev => ({ ...prev, [currentQ]: null }));
    updateStatus(currentQ, "not-answered");
  };

  const getStatusColor = (s?: QStatus) => {
    switch (s) {
      case "answered": return "bg-secondary text-secondary-foreground";
      case "not-answered": return "bg-destructive text-destructive-foreground";
      case "marked": return "bg-accent text-accent-foreground";
      case "answered-marked": return "bg-primary text-primary-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const statusCounts = {
    answered: Object.values(statuses).filter(s => s === "answered").length,
    notAnswered: Object.values(statuses).filter(s => s === "not-answered").length,
    marked: Object.values(statuses).filter(s => s === "marked").length,
    notVisited: mockQuestions.length - Object.keys(statuses).length,
    answeredMarked: Object.values(statuses).filter(s => s === "answered-marked").length,
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-card rounded-2xl border border-border p-6 space-y-5">
          <h2 className="text-xl font-black font-display text-foreground text-center">JEE Main Mock #7</h2>
          <p className="text-sm text-muted-foreground text-center">Full length mock test — 25 questions — 180 minutes</p>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50"><tr><th className="p-2 text-left font-bold text-foreground">Section</th><th className="p-2 text-center font-bold">Questions</th><th className="p-2 text-center font-bold">Marks</th><th className="p-2 text-center font-bold">Negative</th></tr></thead>
              <tbody>
                {["Physics", "Chemistry", "Mathematics"].map(s => (
                  <tr key={s} className="border-t border-border"><td className="p-2 font-medium text-foreground">{s}</td><td className="p-2 text-center text-muted-foreground">25</td><td className="p-2 text-center text-muted-foreground">100</td><td className="p-2 text-center text-destructive">-1</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
            <li>Each correct answer carries +4 marks</li>
            <li>Each incorrect answer carries -1 mark penalty</li>
            <li>Unanswered questions carry 0 marks</li>
            <li>Calculator is not allowed</li>
          </ul>
          <button onClick={() => { setStarted(true); updateStatus(0, "not-answered"); }} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary-dark transition-colors">
            I have read all instructions. Start Test
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-[hsl(var(--navy))] px-4 py-3 text-white">
        <Link to="/tests" className="text-sm font-bold">JEE Main Mock #7</Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-accent/20 px-3 py-1">
            <Clock className="h-3.5 w-3.5 text-accent" />
            <span className="text-sm font-bold font-display text-accent">01:47:23</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/tests/1/result" className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold hover:bg-primary-dark transition-colors">Submit Test</Link>
          <button><MoreVertical className="h-5 w-5" /></button>
        </div>
      </header>

      {/* Section Tabs */}
      <div className="flex gap-2 overflow-x-auto px-4 py-2 bg-card border-b border-border">
        {["Physics (25)", "Chemistry (25)", "Mathematics (25)"].map((s, i) => (
          <button key={s} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold ${i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"}`}>{s}</button>
        ))}
      </div>

      <div className="flex flex-1">
        {/* Question Area */}
        <div className="flex-1 p-4 lg:p-6">
          <div className="bg-card rounded-2xl border border-border p-5">
            {/* Question Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Q.{q.id} of {mockQuestions.length}</span>
                <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">+{q.marks.positive}</span>
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">-{q.marks.negative}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">{q.topic}</span>
                <button className={`p-1.5 rounded-lg transition-colors ${statuses[currentQ]?.includes("marked") ? "text-accent" : "text-muted-foreground hover:text-accent"}`}>
                  <Flag className="h-4 w-4" />
                </button>
                <span className="text-[10px] text-muted-foreground">0:47s</span>
              </div>
            </div>

            {/* Question Text */}
            <p className="text-sm font-medium text-foreground mb-6 leading-relaxed">{q.text}</p>

            {/* Options */}
            <div className="space-y-3">
              {q.options.map((opt, i) => {
                const isSelected = selected[currentQ] === i;
                return (
                  <button key={i} onClick={() => handleSelect(i)} className={`flex items-center gap-3 w-full rounded-xl border p-4 text-left transition-all ${isSelected ? "border-primary bg-primary-light" : "border-border hover:border-primary/30 hover:bg-primary-light/50"}`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isSelected ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className={`text-sm ${isSelected ? "font-semibold text-foreground" : "text-foreground"}`}>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <button onClick={handlePrev} disabled={currentQ === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/30 disabled:opacity-40">
              <ArrowLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <div className="flex gap-2">
              <button onClick={handleMarkAndNext} className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-4 py-2 text-xs font-semibold text-accent hover:bg-accent/20">
                <Bookmark className="h-3.5 w-3.5" /> Mark & Next
              </button>
              <button onClick={handleClear} className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/30">Clear</button>
            </div>
            <button onClick={handleNext} disabled={currentQ === mockQuestions.length - 1} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-dark disabled:opacity-40">
              Next <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Question Palette */}
        {showPalette && (
          <div className="hidden lg:block w-[240px] shrink-0 border-l border-border bg-card p-4 overflow-y-auto">
            <h3 className="text-sm font-bold text-foreground mb-3">Question Palette</h3>
            <div className="space-y-2 text-[10px] mb-4">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-secondary" /> Answered ({statusCounts.answered})</div>
              <div className="flex items-center gap-2"><XCircle className="h-3 w-3 text-destructive" /> Not Answered ({statusCounts.notAnswered})</div>
              <div className="flex items-center gap-2"><Flag className="h-3 w-3 text-accent" /> Marked ({statusCounts.marked})</div>
              <div className="flex items-center gap-2"><Circle className="h-3 w-3 text-muted-foreground" /> Not Visited ({statusCounts.notVisited})</div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {mockQuestions.map((_, i) => (
                <button key={i} onClick={() => { setCurrentQ(i); if (!statuses[i]) updateStatus(i, "not-answered"); }} className={`h-8 w-8 rounded-lg text-[10px] font-bold ${i === currentQ ? "ring-2 ring-primary" : ""} ${getStatusColor(statuses[i])}`}>
                  {i + 1}
                </button>
              ))}
            </div>
            <Link to="/tests/1/result" className="mt-6 block w-full rounded-xl bg-secondary py-2.5 text-center text-xs font-bold text-secondary-foreground hover:bg-secondary-dark transition-colors">
              Submit Test
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestTakingPage;
