import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, MinusCircle, Printer, Sparkles, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TestImage } from "@/components/test/TestImage";

type ResponseQuestion = {
  id: string;
  position: number;
  subject: string | null;
  topic: string | null;
  question_text: string | null;
  question_image_url: string | null;
  question_type: string;
  options: any;
  option_images: string[] | null;
  match_left: any;
  correct_answer: any;
  numerical_answer: number | null;
  explanation: string | null;
  solution_image_url: string | null;
  marks_correct: number | null;
  marks_wrong: number | null;
  selected: any;
};

type SheetData = {
  attempt_id: string;
  test_id: string;
  released: boolean;
  status: string;
  score: number | null;
  metadata: any;
  questions: ResponseQuestion[];
};

const optionLetter = (i: number) => String.fromCharCode(65 + i);

const stringifyAnswer = (val: any): string => {
  if (val == null) return "—";
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") return String(val);
  try { return JSON.stringify(val); } catch { return String(val); }
};

const selectedIndices = (selected: any): number[] => {
  if (selected == null) return [];
  if (Array.isArray(selected)) return selected.map((v) => Number(v)).filter((n) => Number.isInteger(n));
  if (typeof selected === "number") return [selected];
  if (typeof selected === "string" && /^\d+$/.test(selected)) return [Number(selected)];
  return [];
};

const correctIndices = (correct: any): number[] => {
  if (correct == null) return [];
  if (Array.isArray(correct)) return correct.map((v) => Number(v)).filter((n) => Number.isInteger(n));
  if (typeof correct === "number") return [correct];
  if (typeof correct === "string" && /^\d+$/.test(correct)) return [Number(correct)];
  if (typeof correct === "object" && "value" in correct) return correctIndices((correct as any).value);
  return [];
};

const TestResponseSheetPage = () => {
  const { attemptId, slug } = useParams<{ attemptId: string; slug: string }>();
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "correct" | "wrong" | "unattempted">("all");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!attemptId) return;
      const { data: res, error } = await supabase.rpc("get_attempt_response_sheet", {
        _attempt_id: attemptId,
      });
      if (!alive) return;
      if (error) {
        toast.error(error.message || "Could not load response sheet");
        setLoading(false);
        return;
      }
      setData(res as SheetData);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [attemptId]);

  const perQuestion = useMemo<Record<string, any>>(() => {
    const out: Record<string, any> = {};
    const arr = data?.metadata?.questions;
    if (Array.isArray(arr)) for (const q of arr) out[q.question_id] = q;
    return out;
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.questions.filter((q) => {
      const meta = perQuestion[q.id];
      const attempted = !!meta?.attempted;
      const correct = !!meta?.is_correct;
      if (filter === "correct") return attempted && correct;
      if (filter === "wrong") return attempted && !correct;
      if (filter === "unattempted") return !attempted;
      return true;
    });
  }, [data, perQuestion, filter]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }
  if (!data) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Response sheet not available.</div>;
  }

  const counts = data.questions.reduce(
    (acc, q) => {
      const m = perQuestion[q.id];
      if (!m?.attempted) acc.unattempted++;
      else if (m.is_correct) acc.correct++;
      else acc.wrong++;
      return acc;
    },
    { correct: 0, wrong: 0, unattempted: 0 }
  );

  return (
    <div className="pb-16">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <Link to={`/tests/${slug}/result/${attemptId}`} className="inline-flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to result
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "correct", "wrong", "unattempted"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${
                  filter === f
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
                {f === "correct" && ` (${counts.correct})`}
                {f === "wrong" && ` (${counts.wrong})`}
                {f === "unattempted" && ` (${counts.unattempted})`}
              </button>
            ))}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-foreground hover:bg-muted"
            >
              <Printer className="h-3.5 w-3.5" /> Print / PDF
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-4 p-4 lg:p-6">
        <header className="rounded-2xl border border-border bg-card p-5 print:border-0 print:p-0">
          <h1 className="font-display text-xl font-black text-foreground">Detailed Response Sheet</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.questions.length} questions · Score {Number(data.score ?? 0).toFixed(1)}
            {data.released ? "" : " · Correct answers will appear after the result release window"}
          </p>
        </header>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No questions match this filter.
          </div>
        ) : (
          filtered.map((q) => {
            const meta = perQuestion[q.id] || {};
            const attempted = !!meta.attempted;
            const isCorrect = !!meta.is_correct;
            const marks = Number(meta.marks ?? 0);
            const max = Number(meta.max_marks ?? q.marks_correct ?? 0);
            const sel = selectedIndices(q.selected);
            const corr = correctIndices(q.correct_answer);

            const stateBadge = !attempted
              ? { label: "Unattempted", cls: "bg-muted text-muted-foreground", Icon: MinusCircle }
              : isCorrect
              ? { label: "Correct", cls: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 }
              : { label: "Wrong", cls: "bg-red-100 text-red-700", Icon: XCircle };

            const opts: any[] = Array.isArray(q.options) ? q.options : [];
            const isNumerical = q.question_type === "numerical" || q.question_type === "integer";

            return (
              <article key={q.id} className="rounded-2xl border border-border bg-card p-5 print:break-inside-avoid">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-bold text-foreground">Q{q.position}</span>
                    {q.subject && <span className="text-xs font-semibold text-muted-foreground">{q.subject}</span>}
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{q.question_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${stateBadge.cls}`}>
                      <stateBadge.Icon className="h-3 w-3" /> {stateBadge.label}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {marks >= 0 ? "+" : ""}{marks} / {max}
                    </span>
                  </div>
                </div>

                {q.question_text && (
                  <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: q.question_text }} />
                )}
                {q.question_image_url && (
                  <TestImage src={q.question_image_url} alt={`Question ${q.position}`} className="mt-3 max-h-[400px] rounded-lg border border-border" />
                )}

                {isNumerical ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your answer</p>
                      <p className="mt-1 font-mono text-sm font-bold text-foreground">{stringifyAnswer(q.selected)}</p>
                    </div>
                    {data.released && (
                      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-emerald-700">Correct answer</p>
                        <p className="mt-1 font-mono text-sm font-bold text-emerald-700">
                          {q.numerical_answer != null ? String(q.numerical_answer) : stringifyAnswer(q.correct_answer)}
                        </p>
                      </div>
                    )}
                  </div>
                ) : opts.length > 0 ? (
                  <ol className="mt-4 space-y-2">
                    {opts.map((opt: any, idx: number) => {
                      const wasSelected = sel.includes(idx);
                      const isRight = data.released && corr.includes(idx);
                      const wrong = wasSelected && data.released && !corr.includes(idx);
                      const cls = isRight
                        ? "border-emerald-400 bg-emerald-50"
                        : wrong
                        ? "border-red-400 bg-red-50"
                        : wasSelected
                        ? "border-primary/60 bg-primary/5"
                        : "border-border bg-card";
                      return (
                        <li key={idx} className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${cls}`}>
                          <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isRight ? "bg-emerald-500 text-white" : wrong ? "bg-red-500 text-white" : "bg-muted text-foreground"
                          }`}>
                            {optionLetter(idx)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: typeof opt === "string" ? opt : opt?.text ?? optionLetter(idx) }} />
                            {q.option_images?.[idx] && (
                              <TestImage src={q.option_images[idx]!} alt={`Option ${optionLetter(idx)}`} className="mt-2 max-h-40 rounded border border-border" />
                            )}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1 text-[10px] uppercase tracking-wider">
                            {wasSelected && <span className="font-bold text-primary">Your pick</span>}
                            {isRight && <span className="font-bold text-emerald-700">Correct</span>}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your response</p>
                    <p className="mt-1 font-mono text-sm text-foreground">{stringifyAnswer(q.selected)}</p>
                    {data.released && (
                      <>
                        <p className="mt-3 text-[10px] uppercase tracking-wider text-emerald-700">Correct response</p>
                        <p className="mt-1 font-mono text-sm text-emerald-700">{stringifyAnswer(q.correct_answer)}</p>
                      </>
                    )}
                  </div>
                )}

                {data.released && q.explanation && (
                  <details className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
                    <summary className="cursor-pointer text-xs font-bold text-foreground">Solution / Explanation</summary>
                    <div className="prose prose-sm mt-2 max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                    {q.solution_image_url && (
                      <TestImage src={q.solution_image_url} alt="Solution" className="mt-2 max-h-[400px] rounded border border-border" />
                    )}
                  </details>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TestResponseSheetPage;
