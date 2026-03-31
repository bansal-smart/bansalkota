import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, GripVertical, Image, Flag } from "lucide-react";

const CreateTestPage = () => {
  const [step, setStep] = useState(1);
  const [testSetup, setTestSetup] = useState({
    title: "", type: "mock", pattern: "jee-main", subjects: ["physics", "chemistry", "mathematics"], duration: 180,
    correctMarks: 4, wrongMarks: -1, visibility: "public",
  });
  const [questions, setQuestions] = useState([
    { id: 1, subject: "Physics", topic: "Electrostatics", text: "In the circuit shown, find the equivalent resistance between A and B.", type: "mcq-single", options: ["2Ω", "4Ω", "6Ω", "8Ω"], correct: 1, difficulty: "medium" },
    { id: 2, subject: "Chemistry", topic: "Organic", text: "Which of the following is an electrophilic addition reaction?", type: "mcq-single", options: ["HBr + Alkene", "NaOH + Ester", "KMnO4 + Alkene", "None"], correct: 0, difficulty: "easy" },
  ]);
  const [editingQ, setEditingQ] = useState(0);

  return (
    <div className="p-4 lg:p-6 pb-24 lg:pb-6">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {["Test Setup", "Add Questions", "Review & Publish"].map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${step > i + 1 ? "bg-secondary text-secondary-foreground" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {step > i + 1 ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${step === i + 1 ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
            </div>
          ))}
        </div>
        <div className="h-1.5 rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
      </div>

      {/* Step 1: Test Setup */}
      {step === 1 && (
        <div className="max-w-xl mx-auto rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Test Setup</h2>
          <div>
            <label className="text-xs font-semibold text-foreground">Test Title</label>
            <input value={testSetup.title} onChange={(e) => setTestSetup({ ...testSetup, title: e.target.value })} placeholder="e.g. JEE Main Mock Test #12" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground">Test Type</label>
              <select className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
                <option>Mock Test</option><option>Chapter Test</option><option>PYQ</option><option>Practice</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Exam Pattern</label>
              <select className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
                <option>JEE Main</option><option>JEE Advanced</option><option>NEET</option><option>Class 11</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Duration (minutes)</label>
            <input type="number" value={testSetup.duration} onChange={(e) => setTestSetup({ ...testSetup, duration: +e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground">Correct Answer Marks</label>
              <input type="number" value={testSetup.correctMarks} onChange={(e) => setTestSetup({ ...testSetup, correctMarks: +e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Wrong Answer Marks</label>
              <input type="number" value={testSetup.wrongMarks} onChange={(e) => setTestSetup({ ...testSetup, wrongMarks: +e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Visibility</label>
            <div className="mt-1 flex gap-2">
              {["Public", "Course Only", "Private"].map((v) => (
                <button key={v} className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${testSetup.visibility === v.toLowerCase().replace(' ', '-') ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-background"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setStep(2)} className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Next: Add Questions <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 2: Add Questions */}
      {step === 2 && (
        <div className="grid lg:grid-cols-[280px_1fr] gap-4">
          {/* Question List */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-foreground">Questions ({questions.length})</h3>
              <button onClick={() => setQuestions([...questions, { id: questions.length + 1, subject: "Physics", topic: "", text: "", type: "mcq-single", options: ["", "", "", ""], correct: 0, difficulty: "medium" }])} className="rounded-lg bg-primary p-1.5 text-primary-foreground"><Plus className="h-3.5 w-3.5" /></button>
            </div>
            <div className="space-y-1">
              {questions.map((q, i) => (
                <button key={q.id} onClick={() => setEditingQ(i)} className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors ${editingQ === i ? "bg-primary/10 border border-primary" : "hover:bg-background border border-transparent"}`}>
                  <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-[10px] font-bold text-primary shrink-0">[{q.subject[0]}]</span>
                  <span className="text-xs text-foreground truncate flex-1">Q{q.id}: {q.text || "New question"}</span>
                  <Trash2 className="h-3 w-3 text-muted-foreground shrink-0 hover:text-destructive" onClick={(e) => { e.stopPropagation(); setQuestions(questions.filter((_, j) => j !== i)); }} />
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground text-center">{questions.length} questions · {questions.length * testSetup.correctMarks} marks</p>
          </div>

          {/* Question Editor */}
          {questions[editingQ] && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <div className="flex gap-2 flex-wrap">
                {["MCQ - Single", "MCQ - Multiple", "Numerical"].map((t) => (
                  <button key={t} className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${questions[editingQ].type === t.toLowerCase().replace(/ /g, '-') ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{t}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Subject</label>
                  <select value={questions[editingQ].subject} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
                    <option>Physics</option><option>Chemistry</option><option>Mathematics</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Difficulty</label>
                  <div className="mt-1 flex gap-1">
                    {["Easy", "Medium", "Hard"].map((d) => (
                      <button key={d} className={`rounded-lg px-2 py-1.5 text-xs font-medium flex-1 ${questions[editingQ].difficulty === d.toLowerCase() ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>{d}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Question</label>
                <textarea value={questions[editingQ].text} onChange={(e) => { const q = [...questions]; q[editingQ].text = e.target.value; setQuestions(q); }} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none" placeholder="Enter your question..." />
                <button className="mt-1 flex items-center gap-1 text-xs text-primary font-medium hover:underline"><Image className="h-3 w-3" /> Add Image</button>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Options</label>
                <div className="mt-1 space-y-2">
                  {questions[editingQ].options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button onClick={() => { const q = [...questions]; q[editingQ].correct = oi; setQuestions(q); }} className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 ${questions[editingQ].correct === oi ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>
                        {String.fromCharCode(65 + oi)}
                      </button>
                      <input value={opt} onChange={(e) => { const q = [...questions]; q[editingQ].options[oi] = e.target.value; setQuestions(q); }} className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none" placeholder={`Option ${String.fromCharCode(65 + oi)}`} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setQuestions([...questions, { id: questions.length + 1, subject: "Physics", topic: "", text: "", type: "mcq-single", options: ["", "", "", ""], correct: 0, difficulty: "medium" }]); setEditingQ(questions.length); }} className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Save & Add Next</button>
                <button className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground">Save & Exit</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="max-w-xl mx-auto rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Review & Publish</h2>
          <div className="rounded-lg border border-border p-4 space-y-2">
            <p className="text-sm"><span className="font-semibold text-foreground">Title:</span> <span className="text-muted-foreground">{testSetup.title || "Untitled Test"}</span></p>
            <p className="text-sm"><span className="font-semibold text-foreground">Duration:</span> <span className="text-muted-foreground">{testSetup.duration} min</span></p>
            <p className="text-sm"><span className="font-semibold text-foreground">Questions:</span> <span className="text-muted-foreground">{questions.length}</span></p>
            <p className="text-sm"><span className="font-semibold text-foreground">Total Marks:</span> <span className="text-muted-foreground">{questions.length * testSetup.correctMarks}</span></p>
            <p className="text-sm"><span className="font-semibold text-foreground">Marking:</span> <span className="text-secondary">+{testSetup.correctMarks}</span> / <span className="text-destructive">{testSetup.wrongMarks}</span></p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground flex items-center justify-center gap-1"><ArrowLeft className="h-4 w-4" /> Back to Edit</button>
            <button className="flex-1 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground">Publish Test</button>
          </div>
          <button className="w-full text-center text-xs text-muted-foreground hover:text-foreground">Save as Draft</button>
        </div>
      )}

      {/* Step Navigation */}
      {step === 2 && (
        <div className="flex justify-between mt-6">
          <button onClick={() => setStep(1)} className="flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Back</button>
          <button onClick={() => setStep(3)} className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Review & Publish <ArrowRight className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
};

export default CreateTestPage;
