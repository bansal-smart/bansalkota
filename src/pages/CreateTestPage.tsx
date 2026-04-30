import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, GripVertical, BookMarked } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import QuestionBankPanel from "@/components/QuestionBankPanel";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { BankQuestion } from "@/hooks/useQuestionBank";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type DraftQuestion = {
  source: "manual" | "bank";
  bank_id?: string;
  subject: string;
  topic: string;
  text: string;
  options: string[];
  correct: number;
};

const blankQuestion = (): DraftQuestion => ({
  source: "manual",
  subject: "Physics",
  topic: "",
  text: "",
  options: ["", "", "", ""],
  correct: 0,
});

const fromBank = (q: BankQuestion): DraftQuestion => ({
  source: "bank",
  bank_id: q.id,
  subject: q.subject,
  topic: q.topic || "",
  text: q.question_text,
  options: q.options.map((o) => o.text),
  correct: typeof q.correct_answer === "number" ? q.correct_answer : 0,
});

const DropZone = ({ children, empty }: { children: React.ReactNode; empty: boolean }) => {
  const { setNodeRef, isOver } = useDroppable({ id: "test-drop" });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border-2 border-dashed transition-colors ${isOver ? "border-primary bg-primary/5" : "border-border"} ${empty ? "min-h-[120px] flex items-center justify-center p-6" : "p-2 space-y-2"}`}
    >
      {empty ? (
        <p className="text-xs text-muted-foreground text-center">
          Drag questions from the Question Bank, or add a manual question below.
        </p>
      ) : children}
    </div>
  );
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
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [bankSheetOpen, setBankSheetOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const updateQ = (i: number, patch: Partial<DraftQuestion>) => {
    const next = [...questions];
    next[i] = { ...next[i], ...patch };
    setQuestions(next);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    if (e.over?.id !== "test-drop") return;
    const bankQ = e.active.data.current?.question as BankQuestion | undefined;
    if (!bankQ) return;
    if (questions.some((q) => q.bank_id === bankQ.id)) {
      toast.info("Already added to this test");
      return;
    }
    setQuestions((prev) => [...prev, fromBank(bankQ)]);
    toast.success("Question added");
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

  const LeftPane = (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Create New Test</h1>
        <p className="text-xs text-muted-foreground mt-1">Drag questions from the bank on the right, or add manual ones.</p>
      </div>

      {/* Basic setup */}
      <div className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Basic Setup</h2>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Test title" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description (optional)" rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

      {/* Questions */}
      <div className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-bold text-foreground">Test Questions ({questions.length})</h2>
          <div className="flex items-center gap-2">
            <Sheet open={bankSheetOpen} onOpenChange={setBankSheetOpen}>
              <SheetTrigger asChild>
                <button className="lg:hidden inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground">
                  <BookMarked className="h-3 w-3" /> Open Bank
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-full sm:max-w-md">
                <div className="h-full"><QuestionBankPanel draggable compact /></div>
              </SheetContent>
            </Sheet>
            <button
              onClick={() => setQuestions([...questions, blankQuestion()])}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <Plus className="h-3 w-3" /> Add Manual
            </button>
          </div>
        </div>

        <DropZone empty={questions.length === 0}>
          {questions.map((q, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2 bg-background">
              <div className="flex items-center gap-2 flex-wrap">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-bold text-muted-foreground">Q{i + 1}</span>
                {q.source === "bank" && (
                  <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">From Bank</span>
                )}
                <select value={q.subject} onChange={(e) => updateQ(i, { subject: e.target.value })} className="rounded-lg border border-border bg-card px-2 py-1 text-xs outline-none">
                  <option>Physics</option>
                  <option>Chemistry</option>
                  <option>Mathematics</option>
                  <option>Biology</option>
                </select>
                <input value={q.topic} onChange={(e) => updateQ(i, { topic: e.target.value })} placeholder="Topic" className="flex-1 min-w-[120px] rounded-lg border border-border bg-card px-2 py-1 text-xs outline-none" />
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive cursor-pointer shrink-0" onClick={() => setQuestions(questions.filter((_, j) => j !== i))} />
              </div>
              <textarea value={q.text} onChange={(e) => updateQ(i, { text: e.target.value })} placeholder="Question text..." rows={2} className="w-full rounded-lg border border-border bg-card px-2 py-1 text-xs outline-none resize-none" />
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
                    className="flex-1 rounded-lg border border-border bg-card px-2 py-1 text-xs outline-none"
                  />
                </div>
              ))}
            </div>
          ))}
        </DropZone>
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

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex">
        {/* Left pane (form) */}
        <div className="flex-1 lg:w-1/2 lg:flex-none px-4 md:px-6 xl:px-8 py-4">
          <div className="max-w-3xl mx-auto">{LeftPane}</div>
        </div>

        {/* Right pane (Question Bank) — desktop only, sticky with its own scroll */}
        <aside className="hidden lg:flex lg:w-1/2 border-l border-border bg-muted/30 flex-col sticky top-[57px] self-start h-[calc(100vh-57px)]">
          <QuestionBankPanel draggable compact />
        </aside>
      </div>
    </DndContext>
  );
};

export default CreateTestPage;
