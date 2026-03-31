import { useState } from "react";
import { Plus, Upload, Brain, GraduationCap, ThumbsUp, ThumbsDown, Clock, CheckCircle2, Loader2, X } from "lucide-react";

const filterTabs = ["All", "Pending", "Answered", "AI Solved"];

const mockDoubts = [
  { id: 1, subject: "Physics", question: "How does the magnetic field due to a solenoid differ from a bar magnet at large distances?", status: "answered", answeredBy: "Teacher: Ramesh Sir", time: "2 hours ago" },
  { id: 2, subject: "Chemistry", question: "Explain the mechanism of SN1 reaction with an example.", status: "ai-solved", answeredBy: "AI", time: "5 hours ago" },
  { id: 3, subject: "Maths", question: "How to solve integration by parts for trigonometric functions?", status: "pending", answeredBy: null, time: "1 day ago" },
  { id: 4, subject: "Physics", question: "Derive the expression for electric field due to a uniformly charged ring.", status: "answered", answeredBy: "Teacher: Priya Ma'am", time: "2 days ago" },
  { id: 5, subject: "Chemistry", question: "What is the difference between thermodynamic and kinetic stability?", status: "pending", answeredBy: null, time: "3 days ago" },
];

const subjectColors: Record<string, string> = {
  Physics: "bg-primary/10 text-primary",
  Chemistry: "bg-secondary/10 text-secondary",
  Maths: "bg-accent/10 text-accent",
};

const statusDot: Record<string, string> = {
  pending: "bg-accent",
  answered: "bg-secondary",
  "ai-solved": "bg-primary",
};

const DoubtPage = () => {
  const [activeFilter, setActiveFilter] = useState(0);
  const [showAIResponse, setShowAIResponse] = useState(false);

  return (
    <div className="pb-20 lg:pb-0">
      <div className="p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Left - Doubt List */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black font-display text-foreground">My Doubts</h2>
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-dark transition-colors">
                <Plus className="h-3.5 w-3.5" /> Ask New Doubt
              </button>
            </div>

            <div className="flex gap-1">
              {filterTabs.map((tab, i) => (
                <button key={tab} onClick={() => setActiveFilter(i)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${i === activeFilter ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"}`}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {mockDoubts.map(d => (
                <div key={d.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDot[d.status]}`} />
                    <div className="flex-1 min-w-0">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${subjectColors[d.subject]}`}>{d.subject}</span>
                      <p className="text-sm text-foreground mt-1 line-clamp-2">{d.question}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{d.time}</span>
                        {d.answeredBy && <span>· {d.answeredBy}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Ask Doubt / AI Response */}
          <div className="lg:w-[380px] space-y-4">
            {/* Ask Form */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-bold font-display text-foreground flex items-center gap-2 mb-4">
                <Brain className="h-4 w-4 text-primary" /> Ask a Doubt
              </h3>
              <div className="space-y-3">
                <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
                  <option>Physics</option><option>Chemistry</option><option>Mathematics</option><option>Biology</option>
                </select>
                <input type="text" placeholder="Topic (e.g., Electrostatics)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary" />
                <textarea rows={4} placeholder="Type your question here..." className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-none" />
                <div className="rounded-xl border-2 border-dashed border-border p-6 text-center cursor-pointer hover:border-primary/30 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Upload image of your doubt</p>
                  <p className="text-[10px] text-muted-foreground mt-1">JPG, PNG, PDF</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setShowAIResponse(true)} className="rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-dark transition-colors flex items-center justify-center gap-1.5">
                    <Brain className="h-3.5 w-3.5" /> Solve with AI
                  </button>
                  <button className="rounded-xl bg-secondary py-2.5 text-xs font-bold text-secondary-foreground hover:bg-secondary-dark transition-colors flex items-center justify-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5" /> Ask Teacher
                  </button>
                </div>
              </div>
            </div>

            {/* AI Response */}
            {showAIResponse && (
              <div className="rounded-2xl border border-primary/20 bg-primary-light p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">AI Solution</span>
                  </div>
                  <button onClick={() => setShowAIResponse(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>
                <div className="space-y-3">
                  {[
                    "The magnetic field of a solenoid at points far away resembles that of a bar magnet.",
                    "At large distances, both produce a dipole field that falls off as 1/r³.",
                    "The key difference is in the near-field region where the solenoid field is uniform inside.",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                      <p className="text-xs text-foreground leading-relaxed">{step}</p>
                    </div>
                  ))}
                  <div className="rounded-lg bg-secondary/10 p-3 text-xs font-medium text-secondary">Final Answer: Both are equivalent dipole sources at large distances.</div>
                </div>
                <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
                  <span>Was this helpful?</span>
                  <button className="hover:text-secondary"><ThumbsUp className="h-4 w-4" /></button>
                  <button className="hover:text-destructive"><ThumbsDown className="h-4 w-4" /></button>
                  <button className="ml-auto text-primary hover:underline text-[10px]">Ask Teacher for clarification</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoubtPage;
