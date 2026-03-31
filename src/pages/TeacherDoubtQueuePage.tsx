import { useState } from "react";
import { AlertCircle, Clock, CheckCircle2, Send, Image, ArrowRight, Bot } from "lucide-react";

const doubts = [
  { id: 1, student: "Aditya Rajan", class: "12th", batch: "JEE 2026 A", subject: "Physics", topic: "Electrostatics", question: "Sir, how do I apply Gauss's law to find the electric field due to a non-uniformly charged sphere? I tried using the formula but the symmetry argument doesn't seem to work here.", time: "2h ago", urgent: true, status: "pending", hasImage: true, aiAnswer: "To apply Gauss's Law for non-uniform charge distribution, you need to consider the charge enclosed within a Gaussian surface. For a sphere with charge density ρ(r), integrate ρ from 0 to r to find Q_enc, then use E·4πr² = Q_enc/ε₀." },
  { id: 2, student: "Ishita Bansal", class: "12th", batch: "NEET 2026", subject: "Chemistry", topic: "Organic Reactions", question: "Why does SN1 reaction prefer tertiary carbon over primary? Isn't the primary carbon more accessible for the nucleophile?", time: "4h ago", urgent: false, status: "pending", hasImage: false, aiAnswer: null },
  { id: 3, student: "Karan Malhotra", class: "11th", batch: "JEE 2027", subject: "Physics", topic: "Optics", question: "Can you explain the difference between real and virtual images in concave mirrors with ray diagrams?", time: "6h ago", urgent: false, status: "pending", hasImage: false, aiAnswer: null },
  { id: 4, student: "Divya Nair", class: "12th", batch: "NEET 2026", subject: "Biology", topic: "Genetics", question: "How do we determine if a trait is autosomal dominant or recessive from a pedigree chart?", time: "12h ago", urgent: true, status: "answered", hasImage: true, aiAnswer: null },
  { id: 5, student: "Saurabh Pillai", class: "12th", batch: "JEE 2026 B", subject: "Mathematics", topic: "Integration", question: "How to solve integration by partial fractions when the denominator has repeated roots?", time: "1d ago", urgent: false, status: "answered", hasImage: false, aiAnswer: null },
];

const TeacherDoubtQueuePage = () => {
  const [filter, setFilter] = useState("all");
  const [selectedDoubt, setSelectedDoubt] = useState(doubts[0]);
  const [answer, setAnswer] = useState("");

  const filtered = filter === "all" ? doubts : doubts.filter(d => d.status === filter);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-57px)]">
      <div className="lg:w-[380px] border-r border-border bg-card overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-bold text-foreground">Doubt Queue</h1>
          <div className="flex gap-2 mt-3">
            {[{ key: "all", label: "All (38)" }, { key: "pending", label: "Pending (22)" }, { key: "answered", label: "Answered (16)" }].map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground border border-border"}`}>{f.label}</button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((d) => (
            <button key={d.id} onClick={() => setSelectedDoubt(d)} className={`w-full text-left p-4 hover:bg-background transition-colors ${selectedDoubt?.id === d.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-accent/10 text-[10px] font-bold text-primary">
                  {d.student.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-foreground">{d.student}</span>
                  <span className="text-[10px] text-muted-foreground ml-1">· {d.class}</span>
                </div>
                {d.urgent && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
              </div>
              <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{d.subject}</span>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.question}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted2 flex items-center gap-1"><Clock className="h-3 w-3" />{d.time}</span>
                <span className={`flex items-center gap-1 text-[10px] font-medium ${d.status === "pending" ? "text-destructive" : "text-secondary"}`}>
                  {d.status === "pending" ? "Pending" : <><CheckCircle2 className="h-3 w-3" /> Answered</>}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {selectedDoubt ? (
          <div className="max-w-2xl space-y-4 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-accent/10 text-sm font-bold text-primary">
                {selectedDoubt.student.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedDoubt.student}</p>
                <p className="text-xs text-muted-foreground">{selectedDoubt.class} · {selectedDoubt.batch}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary mb-2">{selectedDoubt.subject} · {selectedDoubt.topic}</span>
              <p className="text-sm text-foreground leading-relaxed">{selectedDoubt.question}</p>
              {selectedDoubt.hasImage && (
                <div className="mt-3 rounded-lg bg-muted h-32 flex items-center justify-center">
                  <Image className="h-8 w-8 text-muted-foreground" />
                  <span className="ml-2 text-xs text-muted-foreground">Student uploaded image</span>
                </div>
              )}
            </div>

            {selectedDoubt.aiAnswer && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-primary">AI answered this — review and confirm or correct</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{selectedDoubt.aiAnswer}</p>
                <div className="flex gap-2 mt-3">
                  <button className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Confirm AI Answer</button>
                  <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">Write Custom Answer</button>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-4">
              <label className="text-xs font-semibold text-foreground">Your Answer</label>
              <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none focus:border-primary" placeholder="Type your answer here..." />
              <div className="flex items-center justify-between mt-3">
                <button className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"><Image className="h-3 w-3" /> Attach Image/Diagram</button>
                <button className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground flex items-center gap-1"><Send className="h-3.5 w-3.5" /> Submit Answer</button>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">Student will be notified when you submit</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Select a doubt to answer</div>
        )}
      </div>
    </div>
  );
};

export default TeacherDoubtQueuePage;
