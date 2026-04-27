import { useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type DraftQuestion = {
  subject: string;
  topic: string;
  text: string;
  options: string[];
  correct: number;
};

const CreateTestPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [testType, setTestType] = useState("mock");
  const [examPattern, setExamPattern] = useState("jee-main");
  const [duration, setDuration] = useState(180);
  const [correctMarks, setCorrectMarks] = useState(4);
  const [wrongMarks, setWrongMarks] = useState(-1);
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    { subject: "Physics", topic: "", text: "", options: ["", "", "", ""], correct: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const updateQ = (i: number, patch: Partial<DraftQuestion>) => {
    const next = [...questions];
    next[i] = { ...next[i], ...patch };
    setQuestions(next);
  };

  const submit = async (publish: boolean) => {
    if (!user) return toast.error("Sign in required");
    if (!title.trim()) return toast.error("Title required");
    const validQ = questions.filter((q) => q.text.trim() && q.options.every((o) => o.trim()));
    if (validQ.length === 0) return toast.error("Add at least one complete question");

    setSubmitting(true);
    const slug = `${slugify(title)}-${Date.now().toString(36)}`;
    const subjects = Array.from(new Set(validQ.map((q) => q.subject)));

    const { data: test, error } = await supabase
      .from("tests")
      .insert({
        title,
        slug,
        description,
        test_type: testType,
        exam_pattern: examPattern,
        subjects,
        duration_minutes: duration,
        correct_marks: correctMarks,
        wrong_marks: wrongMarks,
        total_questions: validQ.length,
        total_marks: validQ.length * correctMarks,
        is_published: publish,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !test) {
      toast.error(error?.message ?? "Could not create test");
      setSubmitting(false);
      return;
    }

    const rows = validQ.map((q, i) => ({
      test_id: test.id,
      position: i,
      subject: q.subject,
      topic: q.topic || null,
      question_text: q.text,
      question_type: "mcq-single",
      options: q.options.map((t, id) => ({ id, text: t })),
      correct_answer: q.correct,
      marks_correct: correctMarks,
      marks_wrong: wrongMarks,
    }));
    await supabase.from("test_questions").insert(rows);

    toast.success(publish ? "Test published" : "Draft saved");
    setSubmitting(false);
    navigate("/teacher/dashboard");
  };

  return (
    <div className="p-4 lg:p-6 pb-24 lg:pb-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">Create New Test</h1>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Basic Setup</h2>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Test title" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description (optional)" rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none" />
        <div className="grid grid-cols-2 gap-3">
          <select value={testType} onChange={(e) => setTestType(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
            <option value="mock">Mock Test</option>
            <option value="chapter">Chapter Test</option>
            <option value="pyq">Previous Year</option>
            <option value="practice">Practice</option>
          </select>
          <select value={examPattern} onChange={(e) => setExamPattern(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
            <option value="jee-main">JEE Main</option>
            <option value="jee-advanced">JEE Advanced</option>
            <option value="neet">NEET</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground">Duration (min)</label>
            <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Correct marks</label>
            <input type="number" value={correctMarks} onChange={(e) => setCorrectMarks(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Wrong marks</label>
            <input type="number" value={wrongMarks} onChange={(e) => setWrongMarks(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Questions ({questions.length})</h2>
          <button
            onClick={() => setQuestions([...questions, { subject: "Physics", topic: "", text: "", options: ["", "", "", ""], correct: 0 }])}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3 w-3" /> Add Question
          </button>
        </div>
        {questions.map((q, i) => (
          <div key={i} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Q{i + 1}</span>
              <select value={q.subject} onChange={(e) => updateQ(i, { subject: e.target.value })} className="rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none">
                <option>Physics</option>
                <option>Chemistry</option>
                <option>Mathematics</option>
                <option>Biology</option>
              </select>
              <input value={q.topic} onChange={(e) => updateQ(i, { topic: e.target.value })} placeholder="Topic" className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none" />
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive cursor-pointer" onClick={() => setQuestions(questions.filter((_, j) => j !== i))} />
            </div>
            <textarea value={q.text} onChange={(e) => updateQ(i, { text: e.target.value })} placeholder="Question text..." rows={2} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none resize-none" />
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={q.correct === oi}
                  onChange={() => updateQ(i, { correct: oi })}
                  className="shrink-0"
                />
                <span className="text-xs font-bold w-4">{String.fromCharCode(65 + oi)}.</span>
                <input
                  value={opt}
                  onChange={(e) => {
                    const next = [...q.options];
                    next[oi] = e.target.value;
                    updateQ(i, { options: next });
                  }}
                  placeholder={`Option ${oi + 1}`}
                  className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none"
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button disabled={submitting} onClick={() => submit(false)} className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground disabled:opacity-50">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save Draft"}
        </button>
        <button disabled={submitting} onClick={() => submit(true)} className="flex-1 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground disabled:opacity-50">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Publish Test"}
        </button>
      </div>
    </div>
  );
};

export default CreateTestPage;
