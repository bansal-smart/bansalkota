import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Trophy, RotateCcw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type Quiz = { id: string; title: string; description: string | null; chapter_id: string; course_id: string };
type Question = {
  id: string;
  position: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
};

const ChapterQuizPage = () => {
  const { slug, quizId } = useParams<{ slug: string; chapterId: string; quizId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!quizId) return;
    (async () => {
      setLoading(true);
      const [qRes, questRes] = await Promise.all([
        supabase.from("chapter_quizzes").select("id, title, description, chapter_id, course_id").eq("id", quizId).maybeSingle(),
        supabase.from("chapter_quiz_questions").select("id, position, question, options, correct_index, explanation").eq("quiz_id", quizId).order("position"),
      ]);
      setQuiz((qRes.data ?? null) as Quiz | null);
      setQuestions(((questRes.data ?? []) as any[]).map((q) => ({ ...q, options: Array.isArray(q.options) ? q.options : [] })));
      setLoading(false);
    })();
  }, [quizId]);

  const total = questions.length;
  const score = useMemo(
    () => questions.reduce((s, q) => (answers[q.id] === q.correct_index ? s + 1 : s), 0),
    [answers, questions],
  );

  const handleSelect = (qid: string, idx: number) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qid]: idx }));
  };

  const handleSubmit = async () => {
    if (!user || !quiz) return;
    setSaving(true);
    const finalScore = questions.reduce((s, q) => (answers[q.id] === q.correct_index ? s + 1 : s), 0);
    await supabase.from("chapter_quiz_attempts").insert({
      user_id: user.id,
      quiz_id: quiz.id,
      score: finalScore,
      total: questions.length,
      answers,
    });
    setSubmitted(true);
    setSaving(false);
    toast.success(`You scored ${finalScore}/${questions.length}`);
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrent(0);
    setSubmitted(false);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!quiz || total === 0) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm text-muted-foreground">Quiz not found or has no questions yet.</p>
        <Link to={`/my-courses/${slug}`} className="mt-3 inline-block text-sm font-bold text-primary">
          Back to Study Material
        </Link>
      </div>
    );
  }

  // Results screen
  if (submitted) {
    const pct = Math.round((score / total) * 100);
    const tone = pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-destructive";
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 lg:py-10">
        <Link to={`/my-courses/${slug}`} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Study Material
        </Link>

        <div className="mt-4 rounded-3xl border border-border bg-card p-6 lg:p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Trophy className="h-8 w-8" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-black text-foreground lg:text-3xl">Quiz Complete!</h1>
          <p className="mt-1 text-sm text-muted-foreground">{quiz.title}</p>
          <div className={`mt-6 font-display text-5xl font-black ${tone}`}>{pct}%</div>
          <p className="mt-1 text-sm font-bold text-foreground">{score} / {total} correct</p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={handleRetry} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
              <RotateCcw className="h-4 w-4" /> Retry
            </button>
            <button onClick={() => navigate(`/my-courses/${slug}`)} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted">
              Done
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Review answers</p>
          {questions.map((q, i) => {
            const selected = answers[q.id];
            const isCorrect = selected === q.correct_index;
            return (
              <div key={q.id} className="rounded-2xl border border-border bg-card p-4 lg:p-5">
                <div className="flex items-start gap-3">
                  {isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-muted-foreground">Question {i + 1}</p>
                    <p className="mt-1 text-sm font-bold text-foreground">{q.question}</p>
                    <div className="mt-3 space-y-1.5">
                      {q.options.map((opt, idx) => {
                        const isAnswer = idx === q.correct_index;
                        const isSelected = idx === selected;
                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                              isAnswer
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold"
                                : isSelected
                                ? "border-destructive/40 bg-destructive/10 text-destructive font-semibold"
                                : "border-border text-foreground"
                            }`}
                          >
                            <span className="font-bold">{String.fromCharCode(65 + idx)}.</span>
                            <span className="flex-1">{opt}</span>
                            {isAnswer && <span className="text-[10px] font-bold uppercase">Correct</span>}
                            {isSelected && !isAnswer && <span className="text-[10px] font-bold uppercase">Your answer</span>}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <p className="mt-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                        <span className="font-bold text-foreground">Explanation: </span>{q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Quiz-taking screen
  const q = questions[current];
  const selected = answers[q.id];
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round(((current + 1) / total) * 100);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:py-8">
      <Link to={`/my-courses/${slug}`} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Exit Quiz
      </Link>

      <div className="mt-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="font-display text-lg font-black text-foreground">{quiz.title}</p>
          <span className="text-xs font-bold text-muted-foreground">{current + 1} / {total}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 lg:p-6 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Question {current + 1}
        </p>
        <h2 className="mt-2 font-display text-lg lg:text-xl font-black text-foreground">{q.question}</h2>

        <div className="mt-5 space-y-2">
          {q.options.map((opt, idx) => {
            const isSelected = selected === idx;
            return (
              <button
                key={idx}
                onClick={() => handleSelect(q.id, idx)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground font-bold ring-2 ring-primary/30"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-xs text-muted-foreground hidden sm:inline">{answeredCount} of {total} answered</span>
        {current < total - 1 ? (
          <button
            onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={saving || answeredCount < total}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Quiz"}
          </button>
        )}
      </div>
    </div>
  );
};

export default ChapterQuizPage;
