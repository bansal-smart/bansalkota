import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Flag, Clock, Loader2, AlertTriangle, X, ZoomIn, ZoomOut, Delete, Info, Menu, Flame, CheckCircle2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import MathRenderer from "@/components/MathRenderer";
import PaletteShape, { type PaletteStatus } from "@/components/test/PaletteShape";
import CandidateCard from "@/components/test/CandidateCard";

type QuestionType = "mcq-single" | "mcq-multi" | "numerical" | "integer" | "assertion-reason";

type TestQuestion = {
  id: string;
  position: number;
  subject: string | null;
  topic: string | null;
  question_text: string;
  question_image_url: string | null;
  question_type: QuestionType;
  options: { id: number; text: string }[];
  option_images: string[] | null;
  marks_correct: number;
  marks_wrong: number;
  marks_unanswered: number;
  partial_marking: boolean;
  answer_format: string | null;
};

type QStatus = "not-visited" | "answered" | "not-answered" | "marked" | "answered-marked";

type AnswerVal =
  | { selected: number | null; time_spent?: number }
  | { selected: number[]; time_spent?: number }
  | { selected: string; time_spent?: number };

const isMulti = (t: QuestionType) => t === "mcq-multi";
const isNumeric = (t: QuestionType) => t === "numerical" || t === "integer";

const TestTakingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [test, setTest] = useState<{ id: string; title: string; duration_minutes: number; total_questions: number } | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [currentQ, setCurrentQ] = useState(0);
  const [activeSubject, setActiveSubject] = useState<string>("ALL");
  const [answers, setAnswers] = useState<Record<string, AnswerVal>>({});
  const [statuses, setStatuses] = useState<Record<string, QStatus>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);

  const lastSavedRef = useRef<number>(0);
  const enteredAtRef = useRef<number>(Date.now());

  // Load test + existing in-progress attempt
  useEffect(() => {
    if (authLoading || !slug) return;
    if (!user) { navigate("/login"); return; }
    (async () => {
      setLoading(true);
      const { data: t } = await supabase
        .from("tests")
        .select("id, title, duration_minutes, total_questions")
        .eq("slug", slug).maybeSingle();
      if (!t) { toast.error("Test not found"); navigate("/my-tests"); return; }
      setTest(t);

      const { data: qs } = await supabase
        .from("test_questions")
        .select("id, position, subject, topic, question_text, question_image_url, question_type, options, option_images, marks_correct, marks_wrong, marks_unanswered, partial_marking, answer_format")
        .eq("test_id", t.id).order("position");
      setQuestions((qs ?? []) as unknown as TestQuestion[]);

      const { data: existing } = await supabase
        .from("test_attempts")
        .select("id, started_at, answers, question_statuses, status")
        .eq("user_id", user.id).eq("test_id", t.id).eq("status", "in_progress").maybeSingle();

      if (existing) {
        setAttemptId(existing.id);
        setStartedAt(new Date(existing.started_at as string));
        setAnswers((existing.answers as Record<string, AnswerVal>) ?? {});
        setStatuses((existing.question_statuses as Record<string, QStatus>) ?? {});
        setStarted(true);
      }
      setLoading(false);
    })();
  }, [slug, user, authLoading, navigate]);

  // Timer
  useEffect(() => {
    if (!started || !startedAt || !test) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      const remaining = Math.max(0, test.duration_minutes * 60 - elapsed);
      setSecondsLeft(remaining);
      if (remaining === 0) handleSubmit(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, startedAt, test]);

  // Warn on close
  useEffect(() => {
    if (!started) return;
    const beforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [started]);

  // Tab visibility
  useEffect(() => {
    if (!started) return;
    const handler = () => {
      if (document.hidden) { setTabSwitches((s) => s + 1); toast.warning("Tab switching is logged"); }
    };
    document.addEventListener("visibilitychange", handler);
    const noContext = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", noContext);
    return () => {
      document.removeEventListener("visibilitychange", handler);
      document.removeEventListener("contextmenu", noContext);
    };
  }, [started]);

  // Auto-save every 15s
  useEffect(() => {
    if (!attemptId) return;
    const t = setInterval(autoSave, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, answers, statuses]);

  const autoSave = useCallback(async () => {
    if (!attemptId) return;
    if (Date.now() - lastSavedRef.current < 3000) return;
    lastSavedRef.current = Date.now();
    await supabase.from("test_attempts").update({
      answers, question_statuses: statuses,
      time_spent_seconds: startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0,
      metadata: { tab_switches: tabSwitches },
    }).eq("id", attemptId);
  }, [attemptId, answers, statuses, startedAt, tabSwitches]);

  const startAttempt = async () => {
    if (!user || !test) return;
    const { data, error } = await supabase.from("test_attempts").insert({
      user_id: user.id, test_id: test.id, test_name: test.title, status: "in_progress",
      started_at: new Date().toISOString(), answers: {}, question_statuses: {},
    }).select("id, started_at").single();
    if (error || !data) { toast.error("Could not start test"); return; }
    setAttemptId(data.id);
    setStartedAt(new Date(data.started_at as string));
    setStarted(true);
  };

  // Subject grouping
  const subjects = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => set.add(q.subject || "General"));
    return ["ALL", ...Array.from(set)];
  }, [questions]);

  const subjectIndices = useMemo(() => {
    return questions
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => activeSubject === "ALL" || (q.subject || "General") === activeSubject);
  }, [questions, activeSubject]);

  const q = questions[currentQ];

  // Track time-spent when leaving a question
  const accrueTimeAndJump = useCallback((newIdx: number) => {
    if (q) {
      const delta = Math.floor((Date.now() - enteredAtRef.current) / 1000);
      setAnswers((prev) => {
        const cur = prev[q.id];
        const prevTime = cur?.time_spent ?? 0;
        return { ...prev, [q.id]: { ...(cur ?? { selected: null }), time_spent: prevTime + delta } as AnswerVal };
      });
    }
    enteredAtRef.current = Date.now();
    setCurrentQ(newIdx);
  }, [q]);

  // When user lands on a fresh question, mark as not-answered if still unvisited
  useEffect(() => {
    if (!q) return;
    setStatuses((s) => (s[q.id] ? s : { ...s, [q.id]: "not-answered" }));
  }, [q]);

  const updateStatus = (id: string, status: QStatus) => setStatuses((prev) => ({ ...prev, [id]: status }));

  const hasAnswer = (qq: TestQuestion, a?: AnswerVal): boolean => {
    if (!a) return false;
    const s = (a as any).selected;
    if (s === null || s === undefined) return false;
    if (Array.isArray(s)) return s.length > 0;
    if (typeof s === "string") return s.trim().length > 0;
    return true;
  };

  const handleSingleSelect = (optIdx: number) => {
    if (!q) return;
    setAnswers((prev) => ({ ...prev, [q.id]: { ...(prev[q.id] ?? {}), selected: optIdx } as AnswerVal }));
    const wasMarked = statuses[q.id] === "marked" || statuses[q.id] === "answered-marked";
    updateStatus(q.id, wasMarked ? "answered-marked" : "answered");
  };

  const handleMultiToggle = (optIdx: number) => {
    if (!q) return;
    setAnswers((prev) => {
      const cur = prev[q.id];
      const arr: number[] = Array.isArray((cur as any)?.selected) ? [...(cur as any).selected] : [];
      const i = arr.indexOf(optIdx);
      if (i >= 0) arr.splice(i, 1); else arr.push(optIdx);
      arr.sort((a, b) => a - b);
      const wasMarked = statuses[q.id] === "marked" || statuses[q.id] === "answered-marked";
      updateStatus(q.id, arr.length > 0 ? (wasMarked ? "answered-marked" : "answered") : (wasMarked ? "marked" : "not-answered"));
      return { ...prev, [q.id]: { ...(cur ?? {}), selected: arr } as AnswerVal };
    });
  };

  const handleNumericInput = (value: string) => {
    if (!q) return;
    setAnswers((prev) => ({ ...prev, [q.id]: { ...(prev[q.id] ?? {}), selected: value } as AnswerVal }));
    const wasMarked = statuses[q.id] === "marked" || statuses[q.id] === "answered-marked";
    updateStatus(q.id, value.trim() ? (wasMarked ? "answered-marked" : "answered") : (wasMarked ? "marked" : "not-answered"));
  };

  const handleNext = () => { autoSave(); if (currentQ < questions.length - 1) accrueTimeAndJump(currentQ + 1); };
  const handlePrev = () => currentQ > 0 && accrueTimeAndJump(currentQ - 1);
  const handleMarkAndNext = () => {
    if (!q) return;
    updateStatus(q.id, hasAnswer(q, answers[q.id]) ? "answered-marked" : "marked");
    handleNext();
  };
  const handleSaveAndMark = () => {
    if (!q) return;
    updateStatus(q.id, hasAnswer(q, answers[q.id]) ? "answered-marked" : "marked");
    autoSave();
  };
  const handleClear = () => {
    if (!q) return;
    setAnswers((prev) => ({ ...prev, [q.id]: { ...(prev[q.id] ?? {}), selected: isMulti(q.question_type) ? [] : isNumeric(q.question_type) ? "" : null } as AnswerVal }));
    updateStatus(q.id, "not-answered");
  };

  const handleSubmit = async (auto = false) => {
    if (!attemptId) return;
    setSubmitting(true);
    // Accrue final time for current question
    if (q) {
      const delta = Math.floor((Date.now() - enteredAtRef.current) / 1000);
      answers[q.id] = { ...(answers[q.id] ?? { selected: null }), time_spent: ((answers[q.id]?.time_spent ?? 0) + delta) } as AnswerVal;
    }
    await supabase.from("test_attempts").update({
      answers, question_statuses: statuses,
      status: auto ? "auto_submitted" : "submitted",
      submitted_at: new Date().toISOString(),
      time_spent_seconds: startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0,
      metadata: { tab_switches: tabSwitches },
    }).eq("id", attemptId);
    const { error } = await supabase.rpc("submit_test_attempt", { _attempt_id: attemptId });
    if (error) toast.error(error.message);
    navigate(`/tests/${slug}/result/${attemptId}`);
  };

  const counts = useMemo(() => {
    return questions.reduce((acc, qq) => {
      const s = statuses[qq.id];
      if (s === "answered") acc.answered++;
      else if (s === "not-answered") acc.notAnswered++;
      else if (s === "marked") acc.marked++;
      else if (s === "answered-marked") acc.answeredMarked++;
      else acc.notVisited++;
      return acc;
    }, { answered: 0, notAnswered: 0, marked: 0, answeredMarked: 0, notVisited: 0 });
  }, [questions, statuses]);

  // NTA-style palette colors
  const getStatusColor = (s?: QStatus) => {
    switch (s) {
      case "answered": return "bg-emerald-500 text-white";
      case "not-answered": return "bg-red-500 text-white";
      case "marked": return "bg-violet-500 text-white";
      case "answered-marked": return "bg-violet-500 text-white ring-2 ring-emerald-400";
      default: return "bg-muted text-foreground/60";
    }
  };

  if (loading || authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }
  if (!test) return null;

  if (!started) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-card rounded-2xl border border-border p-6 space-y-5">
          <h2 className="text-xl font-black font-display text-foreground text-center">{test.title}</h2>
          <p className="text-sm text-muted-foreground text-center">{questions.length} questions · {test.duration_minutes} minutes</p>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
            <p className="text-xs font-bold text-amber-700 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Important</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>Once started, the timer cannot be paused.</li>
              <li>Tab switching and right-click are logged.</li>
              <li>Your progress saves automatically every 15 seconds.</li>
              <li>The test auto-submits when time is up.</li>
            </ul>
          </div>
          <button onClick={startAttempt} className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground">Start Test</button>
          <Link to="/my-tests" className="block text-center text-xs text-muted-foreground hover:text-foreground">Back to test list</Link>
        </div>
      </div>
    );
  }

  if (!q) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-sm text-muted-foreground">No questions available.</p></div>;
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const lowTime = secondsLeft < 300;
  const numericValue = isNumeric(q.question_type) ? ((answers[q.id] as any)?.selected as string) || "" : "";

  return (
    <div className="min-h-screen bg-background flex flex-col select-none">
      {/* Top bar */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground truncate">{test.title}</p>
          <p className="text-[10px] text-muted-foreground">Question {currentQ + 1} / {questions.length}</p>
        </div>
        <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold tabular-nums ${lowTime ? "bg-red-500 text-white animate-pulse" : "bg-primary/10 text-primary"}`}>
          <Clock className="h-4 w-4" /> {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </div>
      </header>

      {/* Subject tabs */}
      {subjects.length > 2 && (
        <div className="border-b border-border bg-card px-4 py-2 flex gap-2 overflow-x-auto">
          {subjects.map((s) => (
            <button key={s} onClick={() => setActiveSubject(s)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${activeSubject === s ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70 hover:bg-muted/70"}`}>
              {s === "ALL" ? "All Subjects" : s}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="flex-1 p-4 lg:p-6 space-y-4">
          {/* Question card */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              {q.subject && <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary uppercase">{q.subject}</span>}
              {q.topic && <span>· {q.topic}</span>}
              <span className="rounded bg-muted px-1.5 py-0.5 font-bold uppercase">{q.question_type.replace("mcq-", "").replace("-", " ")}</span>
              <span className="ml-auto font-semibold text-foreground/80">+{q.marks_correct} / {q.marks_wrong}</span>
            </div>

            <div className="text-sm text-foreground leading-relaxed"><MathRenderer content={q.question_text} /></div>

            {q.question_image_url && (
              <button onClick={() => setZoomImg(q.question_image_url)} className="relative inline-block group">
                <img src={q.question_image_url} alt="" className="rounded-lg max-h-64" />
                <span className="absolute right-2 top-2 rounded bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100">
                  <ZoomIn className="h-3 w-3" />
                </span>
              </button>
            )}

            {/* Type-specific input */}
            {isNumeric(q.question_type) ? (
              <NumericInput value={numericValue} onChange={handleNumericInput} format={q.answer_format ?? (q.question_type === "integer" ? "integer" : "decimal")} />
            ) : isMulti(q.question_type) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map((opt) => {
                  const sel: number[] = Array.isArray((answers[q.id] as any)?.selected) ? (answers[q.id] as any).selected : [];
                  const selected = sel.includes(opt.id);
                  const img = q.option_images?.[opt.id];
                  return (
                    <button key={opt.id} onClick={() => handleMultiToggle(opt.id)}
                      className={`w-full text-left rounded-xl border-2 px-4 py-3 text-sm transition-all flex items-start gap-3 ${selected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}>
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
                        {selected && <span className="text-[10px] font-black">✓</span>}
                      </span>
                      <div className="flex-1">
                        <span className="font-bold mr-1">{String.fromCharCode(65 + opt.id)}.</span>
                        <MathRenderer content={opt.text} inline />
                        {img && <img src={img} alt="" className="mt-2 max-h-32 rounded" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map((opt) => {
                  const selected = (answers[q.id] as any)?.selected === opt.id;
                  const img = q.option_images?.[opt.id];
                  return (
                    <button key={opt.id} onClick={() => handleSingleSelect(opt.id)}
                      className={`w-full text-left rounded-xl border-2 px-4 py-3 text-sm transition-all flex items-start gap-3 ${selected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}>
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-primary" : "border-muted-foreground/40"}`}>
                        {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                      </span>
                      <div className="flex-1">
                        <span className="font-bold mr-1">{String.fromCharCode(65 + opt.id)}.</span>
                        <MathRenderer content={opt.text} inline />
                        {img && <img src={img} alt="" className="mt-2 max-h-32 rounded" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className="flex flex-wrap gap-2">
            <button onClick={handlePrev} disabled={currentQ === 0} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground disabled:opacity-40 flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Previous
            </button>
            <button onClick={handleClear} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground">Clear Response</button>
            <button onClick={handleSaveAndMark} className="rounded-lg border border-violet-500/40 px-3 py-2 text-xs font-medium text-violet-700">
              Save & Mark for Review
            </button>
            <button onClick={handleMarkAndNext} className="rounded-lg border border-violet-500/40 px-3 py-2 text-xs font-medium text-violet-700 flex items-center gap-1">
              <Flag className="h-3 w-3" /> Mark & Next
            </button>
            <button onClick={handleNext} disabled={currentQ === questions.length - 1}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40 flex items-center gap-1">
              Save & Next <ArrowRight className="h-3 w-3" />
            </button>
            <button onClick={() => setShowSubmit(true)} disabled={submitting}
              className="ml-auto rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
              {submitting ? "Submitting..." : "Submit Test"}
            </button>
          </div>
        </div>

        {/* Palette */}
        <aside className="lg:w-[280px] border-t lg:border-t-0 lg:border-l border-border bg-card p-4">
          <p className="text-xs font-bold text-foreground mb-3">Question Palette</p>
          <div className="grid grid-cols-6 lg:grid-cols-5 gap-1.5">
            {subjectIndices.map(({ q: qq, i }) => (
              <button key={qq.id} onClick={() => accrueTimeAndJump(i)}
                className={`h-9 rounded-lg text-xs font-bold ${getStatusColor(statuses[qq.id])} ${i === currentQ ? "ring-2 ring-primary ring-offset-1" : ""}`}>
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-1.5 text-[10px] text-foreground/70">
            <LegendRow color="bg-emerald-500" label="Answered" count={counts.answered} />
            <LegendRow color="bg-red-500" label="Not Answered" count={counts.notAnswered} />
            <LegendRow color="bg-violet-500" label="Marked for Review" count={counts.marked} />
            <LegendRow color="bg-violet-500 ring-2 ring-emerald-400" label="Answered & Marked" count={counts.answeredMarked} />
            <LegendRow color="bg-muted" label="Not Visited" count={counts.notVisited} />
          </div>
        </aside>
      </div>

      {/* Zoom modal */}
      {zoomImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setZoomImg(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white" onClick={() => setZoomImg(null)}><X className="h-5 w-5" /></button>
          <img src={zoomImg} alt="" className="max-h-[90vh] max-w-[95vw] rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Submit summary modal */}
      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl">
            <h3 className="font-display text-lg font-black text-foreground">Submit your test?</h3>
            <p className="mt-1 text-xs text-muted-foreground">Review your attempt summary below. Once submitted you can't change answers.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <SummaryRow color="bg-emerald-500" label="Answered" v={counts.answered} />
              <SummaryRow color="bg-red-500" label="Not Answered" v={counts.notAnswered} />
              <SummaryRow color="bg-violet-500" label="Marked" v={counts.marked} />
              <SummaryRow color="bg-violet-500 ring-2 ring-emerald-400" label="Ans + Marked" v={counts.answeredMarked} />
              <SummaryRow color="bg-muted" label="Not Visited" v={counts.notVisited} />
              <SummaryRow color="bg-primary" label="Total" v={questions.length} />
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Answered &amp; Marked questions <b>will be evaluated</b>.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowSubmit(false)} className="rounded-lg border border-border px-4 py-2 text-xs font-bold">Cancel</button>
              <button onClick={() => { setShowSubmit(false); handleSubmit(false); }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white">Submit Final</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LegendRow = ({ color, label, count }: { color: string; label: string; count: number }) => (
  <div className="flex items-center gap-2">
    <span className={`inline-block h-3 w-3 rounded ${color}`} />
    <span className="flex-1">{label}</span>
    <span className="font-bold tabular-nums">{count}</span>
  </div>
);

const SummaryRow = ({ color, label, v }: { color: string; label: string; v: number }) => (
  <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
    <span className={`inline-block h-3 w-3 rounded ${color}`} />
    <span className="flex-1 text-foreground/80">{label}</span>
    <span className="font-black tabular-nums text-foreground">{v}</span>
  </div>
);

const NumericInput = ({ value, onChange, format }: { value: string; onChange: (v: string) => void; format: string }) => {
  const allowDecimal = format !== "integer";
  const allowNeg = true;

  const press = (k: string) => {
    if (k === "back") return onChange(value.slice(0, -1));
    if (k === "clear") return onChange("");
    if (k === "." && (!allowDecimal || value.includes("."))) return;
    if (k === "-") {
      if (!allowNeg) return;
      if (value.startsWith("-")) return onChange(value.slice(1));
      return onChange("-" + value);
    }
    onChange(value + k);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
        <p className="text-[10px] font-bold uppercase text-muted-foreground">Your Answer</p>
        <input value={value} readOnly placeholder={allowDecimal ? "e.g. 3.14" : "Integer"}
          className="mt-1 w-full bg-transparent text-2xl font-bold tabular-nums text-foreground outline-none" />
      </div>
      <div className="grid grid-cols-5 gap-1.5 max-w-sm">
        {["7","8","9","back","clear","4","5","6",".","-","1","2","3","0"].map((k) => (
          <button key={k} onClick={() => press(k)}
            className={`h-11 rounded-lg border border-border text-sm font-bold transition-colors hover:bg-muted ${k === "back" || k === "clear" ? "bg-muted/50 text-foreground/70" : "bg-card text-foreground"}`}>
            {k === "back" ? <Delete className="mx-auto h-4 w-4" /> : k === "clear" ? "C" : k}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        {allowDecimal ? "Enter a decimal number." : "Enter an integer only."} Use the keypad above.
      </p>
    </div>
  );
};

export default TestTakingPage;
