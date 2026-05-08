import { useEffect, useMemo, useState } from "react";
import { Target, Trophy, ClipboardCheck, BookOpen } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import Spinner from "@/components/Spinner";

type Attempt = {
  id: string;
  test_id: string | null;
  test_name: string;
  subject: string | null;
  score: number;
  total_questions: number;
  correct_answers: number;
  percentile: number | null;
  attempted_at: string;
  tests?: { exam_pattern: string | null; subjects: string[] | null } | null;
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const AnalyticsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [activeSubject, setActiveSubject] = useState<string>("Overall");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("test_attempts")
        .select("id, test_id, test_name, subject, score, total_questions, correct_answers, percentile, attempted_at, tests(exam_pattern, subjects)")
        .eq("user_id", user.id)
        .in("status", ["submitted", "auto_submitted"])
        .order("attempted_at", { ascending: false });
      setAttempts((data ?? []) as any);
      setLoading(false);
    })();
  }, [user?.id]);

  const subjectOf = (a: Attempt) => a.subject || a.tests?.subjects?.[0] || "General";

  const subjects = useMemo(() => {
    const set = new Set<string>();
    attempts.forEach(a => set.add(subjectOf(a)));
    return ["Overall", ...Array.from(set)];
  }, [attempts]);

  const filtered = useMemo(
    () => activeSubject === "Overall" ? attempts : attempts.filter(a => subjectOf(a) === activeSubject),
    [attempts, activeSubject],
  );

  const stats = useMemo(() => {
    const total = filtered.length;
    const totalQ = filtered.reduce((s, a) => s + (a.total_questions || 0), 0);
    const totalC = filtered.reduce((s, a) => s + (a.correct_answers || 0), 0);
    const accuracy = totalQ ? Math.round((totalC / totalQ) * 100) : 0;
    const bestPct = filtered.reduce((m, a) => Math.max(m, Number(a.percentile ?? 0)), 0);
    const bestScore = filtered.reduce((m, a) => {
      const r = a.total_questions ? a.correct_answers / a.total_questions : 0;
      return r > m ? r : m;
    }, 0);
    return {
      total,
      accuracy,
      bestPercentile: bestPct ? `${bestPct.toFixed(1)}%` : "—",
      bestScore: total ? `${Math.round(bestScore * 100)}%` : "—",
    };
  }, [filtered]);

  const scoreTrend = useMemo(() => {
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return [...filtered]
      .filter(a => new Date(a.attempted_at).getTime() >= since)
      .sort((a, b) => +new Date(a.attempted_at) - +new Date(b.attempted_at))
      .map(a => ({ date: fmtDate(a.attempted_at), score: Number(a.score) || 0 }));
  }, [filtered]);

  const chapterwise = useMemo(() => {
    const map = new Map<string, { subject: string; total: number; correct: number; questions: number; tests: number }>();
    filtered.forEach(a => {
      const key = subjectOf(a);
      const cur = map.get(key) ?? { subject: key, total: 0, correct: 0, questions: 0, tests: 0 };
      cur.questions += a.total_questions || 0;
      cur.correct += a.correct_answers || 0;
      cur.tests += 1;
      map.set(key, cur);
    });
    return Array.from(map.values()).map(r => ({
      ...r,
      accuracy: r.questions ? Math.round((r.correct / r.questions) * 100) : 0,
    }));
  }, [filtered]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner /></div>;
  }

  return (
    <div className="pb-20 lg:pb-0">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-primary-dark p-6 text-primary-foreground">
        <h1 className="text-lg font-black font-display mb-4 text-white">My Performance Analytics</h1>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: ClipboardCheck, value: String(stats.total), label: "Total Tests" },
            { icon: Target, value: `${stats.accuracy}%`, label: "Avg Accuracy" },
            { icon: Trophy, value: stats.bestPercentile, label: "Best Percentile" },
            { icon: BookOpen, value: stats.bestScore, label: "Best Score" },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-xl bg-white/95 p-3 shadow-sm">
              <kpi.icon className="h-4 w-4 text-primary mb-1" />
              <p className="text-xl font-black font-display text-navy">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground font-medium">{kpi.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 lg:p-6 space-y-5">
        {/* Score Trend */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold font-display text-foreground mb-4">Score Trend — Last 30 Days</h3>
          {scoreTrend.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No tests in the last 30 days.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={scoreTrend}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fill="url(#scoreGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Subject Tabs */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {subjects.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubject(tab)}
              className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                tab === activeSubject ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50 border border-border"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Chapter / Subject-wise */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold font-display text-foreground mb-4">Chapterwise Accuracy</h3>
          {chapterwise.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, chapterwise.length * 40)}>
              <BarChart data={chapterwise} layout="vertical" margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="subject" tick={{ fontSize: 11 }} width={100} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => `${v}%`} />
                <Bar dataKey="accuracy" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Test History */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-5 pb-3">
            <h3 className="text-sm font-bold font-display text-foreground">Test History</h3>
          </div>
          <div className="overflow-x-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center px-5">No attempts yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Test", "Subject", "Date", "Score", "Accuracy", "%ile"].map(h => (
                      <th key={h} className="px-5 py-2 text-left font-bold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const acc = t.total_questions ? Math.round((t.correct_answers / t.total_questions) * 100) : 0;
                    return (
                      <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-5 py-3 font-semibold text-foreground">{t.test_name}</td>
                        <td className="px-5 py-3 text-muted-foreground">{subjectOf(t)}</td>
                        <td className="px-5 py-3 text-muted-foreground">{fmtDate(t.attempted_at)}</td>
                        <td className="px-5 py-3 font-bold text-foreground">{Number(t.score)} / {t.total_questions}</td>
                        <td className="px-5 py-3 font-bold text-secondary">{acc}%</td>
                        <td className="px-5 py-3 font-bold text-primary">{t.percentile != null ? `${Number(t.percentile).toFixed(1)}%` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
