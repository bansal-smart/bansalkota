import { useEffect, useState } from "react";
import { Trophy, Target, TrendingUp, RotateCcw, Home, Loader2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type SubjectStat = { total: number; correct: number; attempted: number; score: number };

const TestResultPage = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<{ id: string; test_name: string; score: number; total_questions: number; correct_answers: number; percentile: number | null; time_spent_seconds: number; test_id: string | null } | null>(null);
  const [subjects, setSubjects] = useState<Record<string, SubjectStat>>({});

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("test_attempts")
        .select("id, test_name, score, total_questions, correct_answers, percentile, time_spent_seconds, test_id, answers")
        .eq("id", id)
        .maybeSingle();
      if (!data) {
        setLoading(false);
        return;
      }
      setAttempt(data);

      // Build subject breakdown from questions + answers
      if (data.test_id) {
        const { data: qs } = await supabase
          .from("test_questions")
          .select("id, subject, correct_answer, marks_correct, marks_wrong")
          .eq("test_id", data.test_id);
        const ans = (data.answers ?? {}) as Record<string, { selected: number | null }>;
        const breakdown: Record<string, SubjectStat> = {};
        (qs ?? []).forEach((q) => {
          const subj = q.subject ?? "General";
          if (!breakdown[subj]) breakdown[subj] = { total: 0, correct: 0, attempted: 0, score: 0 };
          breakdown[subj].total += 1;
          const userSel = ans[q.id]?.selected;
          if (userSel != null) {
            breakdown[subj].attempted += 1;
            if (q.correct_answer === userSel) {
              breakdown[subj].correct += 1;
              breakdown[subj].score += Number(q.marks_correct ?? 4);
            } else {
              breakdown[subj].score += Number(q.marks_wrong ?? -1);
            }
          }
        });
        setSubjects(breakdown);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }
  if (!attempt) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Result not found.</div>;
  }

  const accuracy = attempt.total_questions > 0 ? Math.round((attempt.correct_answers / attempt.total_questions) * 100) : 0;
  const minutes = Math.floor(attempt.time_spent_seconds / 60);

  return (
    <div className="pb-20 lg:pb-0">
      <div className="bg-gradient-to-br from-primary to-primary-dark grid-texture p-6 text-center">
        <h1 className="text-2xl font-black font-display text-white mb-4">{attempt.test_name}</h1>
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
          <div className="rounded-xl bg-white/15 backdrop-blur p-3">
            <Trophy className="h-5 w-5 text-white mx-auto mb-1" />
            <p className="text-xl font-black text-white">{Number(attempt.score).toFixed(1)}</p>
            <p className="text-[10px] text-white/80">Score</p>
          </div>
          <div className="rounded-xl bg-white/15 backdrop-blur p-3">
            <Target className="h-5 w-5 text-white mx-auto mb-1" />
            <p className="text-xl font-black text-white">{accuracy}%</p>
            <p className="text-[10px] text-white/80">Accuracy</p>
          </div>
          <div className="rounded-xl bg-white/15 backdrop-blur p-3">
            <TrendingUp className="h-5 w-5 text-white mx-auto mb-1" />
            <p className="text-xl font-black text-white">{attempt.percentile != null ? `${attempt.percentile}%` : "—"}</p>
            <p className="text-[10px] text-white/80">Percentile</p>
          </div>
        </div>
        <p className="text-xs text-white/70 mt-3">Completed in {minutes} min</p>
      </div>

      <div className="p-4 lg:p-6 space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold text-foreground mb-3">Subject-wise Breakdown</h2>
          {Object.keys(subjects).length === 0 ? (
            <p className="text-xs text-muted-foreground">No subject data available.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(subjects).map(([subj, stat]) => {
                const acc = stat.attempted > 0 ? Math.round((stat.correct / stat.attempted) * 100) : 0;
                return (
                  <div key={subj} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-foreground">{subj}</span>
                      <span className="text-muted-foreground">
                        {stat.correct}/{stat.total} correct · {Number(stat.score).toFixed(1)} marks
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${acc}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Link to="/my-tests" className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground text-center inline-flex items-center justify-center gap-1">
            <RotateCcw className="h-3.5 w-3.5" /> Back to Tests
          </Link>
          <Link to="/dashboard" className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground text-center inline-flex items-center justify-center gap-1">
            <Home className="h-3.5 w-3.5" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TestResultPage;
