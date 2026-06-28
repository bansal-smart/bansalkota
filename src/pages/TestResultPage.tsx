import { useEffect, useMemo, useState } from "react";
import {
  Trophy, Target, TrendingUp, RotateCcw, Home, Loader2, CheckCircle2, XCircle,
  MinusCircle, Clock, Award, ChevronRight, Lock, Medal, Users, Activity, RefreshCcw,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { calcPercent } from "@/lib/progress";

const slugifySubject = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "general";

type SubjectStat = { total: number; correct: number; attempted: number; score: number; maxScore: number };

type Attempt = {
  id: string;
  test_name: string;
  score: number | null;
  total_questions: number | null;
  correct_answers: number | null;
  percentile: number | null;
  time_spent_seconds: number | null;
  test_id: string | null;
  answers: Record<string, { selected: number | null }> | null;
};

type TestRow = {
  id: string;
  ends_at: string | null;
  auto_release: boolean | null;
  results_released_at: string | null;
  total_marks: number | null;
  solution_pdf_path: string | null;
};

type RankInfo = {
  released: boolean;
  excluded?: boolean;
  rank?: number;
  total?: number;
  percentile?: number;
  your_score?: number;
  topper_score?: number;
  average_score?: number;
  release_at?: string | null;
};

const useCountdown = (target: string | null | undefined) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (!target) return null;
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return "now";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
};

const PIE_COLORS = ["#10b981", "#ef4444", "#94a3b8"];

const TestResultPage = () => {
  const { attemptId: id, slug } = useParams<{ attemptId: string; slug: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [subjects, setSubjects] = useState<Record<string, SubjectStat>>({});
  const [test, setTest] = useState<TestRow | null>(null);
  const [rankInfo, setRankInfo] = useState<RankInfo | null>(null);
  const [reattemptStatus, setReattemptStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const [reattemptReason, setReattemptReason] = useState("");
  const [reattemptOpen, setReattemptOpen] = useState(false);
  const [reattemptSubmitting, setReattemptSubmitting] = useState(false);

  // Load latest re-attempt request status for this user + test
  useEffect(() => {
    if (!user || !attempt?.test_id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("test_reattempt_requests")
        .select("status")
        .eq("user_id", user.id)
        .eq("test_id", attempt.test_id!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      const s = (data?.status as typeof reattemptStatus | undefined) ?? "none";
      setReattemptStatus(s);
    })();
    return () => { cancelled = true; };
  }, [user, attempt?.test_id]);

  const submitReattemptRequest = async () => {
    if (!user || !attempt?.test_id) return;
    if (!reattemptReason.trim()) {
      toast.error("Please add a short reason for your request.");
      return;
    }
    setReattemptSubmitting(true);
    const { error } = await supabase.from("test_reattempt_requests").insert({
      user_id: user.id,
      test_id: attempt.test_id,
      attempt_id: attempt.id,
      reason: reattemptReason.trim().slice(0, 500),
      status: "pending",
    });
    setReattemptSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setReattemptStatus("pending");
    setReattemptOpen(false);
    setReattemptReason("");
    toast.success("Re-attempt request sent to admin for approval.");
  };


  const fetchRank = async (attemptId: string) => {
    const { data } = await supabase.rpc("get_test_rank", { _attempt_id: attemptId });
    if (data) setRankInfo(data as RankInfo);
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data: bundle, error } = await supabase.rpc("get_test_result_bundle", { _attempt_id: id });
      if (cancelled) return;
      if (error || !bundle) { setLoading(false); return; }

      const att = (bundle as any).attempt;
      const t = (bundle as any).test;
      const subjectsMax = ((bundle as any).subjects_max ?? {}) as Record<string, { total: number; max_score: number }>;
      const rank = (bundle as any).rank;

      setAttempt(att as unknown as Attempt);
      if (t) {
        const { data: extra } = await (supabase as any).from("tests").select("solution_pdf_path").eq("id", t.id).maybeSingle();
        setTest({ ...(t as TestRow), solution_pdf_path: extra?.solution_pdf_path ?? null });
      }
      if (rank) setRankInfo(rank as RankInfo);

      const breakdown: Record<string, SubjectStat> = {};
      const metaSubjects = att?.metadata?.subjects as
        | Record<string, { total?: number; correct?: number; attempted?: number; score?: number }>
        | undefined;
      if (metaSubjects && Object.keys(metaSubjects).length) {
        Object.entries(metaSubjects).forEach(([subj, st]) => {
          breakdown[subj] = {
            total: Number(st?.total ?? subjectsMax[subj]?.total ?? 0),
            correct: Number(st?.correct ?? 0),
            attempted: Number(st?.attempted ?? 0),
            score: Number(st?.score ?? 0),
            maxScore: Number(subjectsMax[subj]?.max_score ?? Number(st?.total ?? 0) * 4),
          };
        });
      }
      setSubjects(breakdown);
      setLoading(false);
    })();

    const ch = supabase
      .channel(`result_${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tests" }, () => { fetchRank(id); })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [id]);

  // Re-poll rank when countdown likely passed
  useEffect(() => {
    if (rankInfo?.released || !test?.ends_at) return;
    const ms = new Date(test.ends_at).getTime() - Date.now();
    if (ms <= 0 || ms > 60 * 60 * 1000) return;
    const t = setTimeout(() => id && fetchRank(id), ms + 1500);
    return () => clearTimeout(t);
  }, [rankInfo, test, id]);

  const countdown = useCountdown(rankInfo?.released ? null : (rankInfo?.release_at ?? test?.ends_at));

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  if (!attempt) return <div className="p-10 text-center text-sm text-muted-foreground">Result not found.</div>;

  const total = Number(attempt.total_questions ?? 0);
  const correct = Number(attempt.correct_answers ?? 0);
  const score = Number(attempt.score ?? 0);
  const answersMap = (attempt.answers ?? {}) as Record<string, { selected: number | null }>;
  const attempted = Object.values(answersMap).filter((a) => a?.selected != null).length;
  const wrong = Math.max(0, attempted - correct);
  const unattempted = Math.max(0, total - attempted);
  const accuracy = calcPercent(correct, attempted || total);
  const seconds = Number(attempt.time_spent_seconds ?? 0);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const avgSecPerQ = total > 0 ? Math.round(seconds / total) : 0;

  const released = !!rankInfo?.released;
  const performanceLabel = accuracy >= 80 ? "Excellent" : accuracy >= 60 ? "Good" : accuracy >= 40 ? "Keep going" : "Needs work";

  const pieData = [
    { name: "Correct", value: correct },
    { name: "Wrong", value: wrong },
    { name: "Unattempted", value: unattempted },
  ];
  const subjectChartData = Object.entries(subjects).map(([s, st]) => ({
    subject: s,
    score: Math.max(0, Number(st.score.toFixed(1))),
    max: Number(st.maxScore.toFixed(1)),
    accuracy: calcPercent(st.correct, st.attempted || st.total),
  }));

  return (
    <div className="pb-20 lg:pb-0">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 px-6 py-8 text-center">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative">
          <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur">
            <Award className="h-3.5 w-3.5" /> {performanceLabel}
          </div>
          <h1 className="font-display text-2xl font-black text-white">{attempt.test_name}</h1>
          <p className="mt-2 text-xs text-white/80">Your score</p>
          <p className="font-display text-5xl font-black text-white">{score.toFixed(1)}</p>
          {test?.total_marks ? <p className="text-xs text-white/70">out of {test.total_marks}</p> : null}

          <div className="mt-4 grid max-w-md mx-auto grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/15 p-3 backdrop-blur">
              <Target className="mx-auto mb-1 h-5 w-5 text-white" />
              <p className="text-xl font-black text-white">{accuracy}%</p>
              <p className="text-[10px] text-white/80">Accuracy</p>
            </div>
            <div className="rounded-xl bg-white/15 p-3 backdrop-blur">
              <Clock className="mx-auto mb-1 h-5 w-5 text-white" />
              <p className="text-xl font-black text-white">{minutes}m</p>
              <p className="text-[10px] text-white/80">Time</p>
            </div>
            <div className="rounded-xl bg-white/15 p-3 backdrop-blur">
              <TrendingUp className="mx-auto mb-1 h-5 w-5 text-white" />
              <p className="text-xl font-black text-white">{released && !rankInfo?.excluded && rankInfo?.percentile != null ? `${Number(rankInfo.percentile).toFixed(1)}%` : "—"}</p>
              <p className="text-[10px] text-white/80">Percentile</p>
            </div>
          </div>
          <p className="mt-3 inline-flex items-center gap-1 text-xs text-white/80">
            <Clock className="h-3 w-3" /> Completed in {minutes}m {secs}s · ~{avgSecPerQ}s/Q
          </p>
        </div>
      </div>

      <div className="space-y-5 p-4 lg:p-6 max-w-6xl mx-auto">
        {/* Rank panel */}
        {rankInfo?.excluded ? (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 text-center">
            <Lock className="mx-auto h-6 w-6 text-amber-600" />
            <p className="mt-2 font-display text-sm font-bold text-foreground">Your result for this test has been excluded by the admin</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You will not appear in rank, percentile or topper statistics. Please contact your center for details.
            </p>
          </div>
        ) : released ? (
          <div className="grid gap-3 sm:grid-cols-4 rounded-2xl border border-border bg-card p-5">
            <div className="text-center">
              <Medal className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-1 font-display text-2xl font-black text-foreground">#{rankInfo?.rank}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your Rank</p>
            </div>
            <div className="text-center">
              <Users className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-1 font-display text-2xl font-black text-foreground">{rankInfo?.total}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Attempts</p>
            </div>
            <div className="text-center">
              <Trophy className="mx-auto h-5 w-5 text-amber-500" />
              <p className="mt-1 font-display text-2xl font-black text-foreground">{Number(rankInfo?.topper_score ?? 0).toFixed(1)}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Topper Score</p>
            </div>
            <div className="text-center">
              <Activity className="mx-auto h-5 w-5 text-blue-500" />
              <p className="mt-1 font-display text-2xl font-black text-foreground">{Number(rankInfo?.average_score ?? 0).toFixed(1)}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Average Score</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5 text-center">
            <Lock className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 font-display text-sm font-bold text-foreground">Rank & comparison unlock after the test window closes</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {test?.ends_at ? (
                <>Releases on {new Date(test.ends_at).toLocaleString()} {countdown && countdown !== "now" ? <span className="font-semibold text-primary"> · in {countdown}</span> : null}</>
              ) : "Awaiting release"}
            </p>
          </div>
        )}

        {/* Question stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile icon={CheckCircle2} label="Correct" value={correct} tone="success" />
          <StatTile icon={XCircle} label="Wrong" value={wrong} tone="danger" />
          <StatTile icon={MinusCircle} label="Unattempted" value={unattempted} tone="muted" />
          <StatTile icon={Target} label="Total" value={total} tone="primary" />
        </div>

        {test?.results_released_at && test?.solution_pdf_path && (
          <div className="rounded-2xl border border-secondary/40 bg-secondary/5 p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-foreground">Official Solution PDF</p>
              <p className="text-xs text-muted-foreground">Detailed solutions are now available.</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const { data, error } = await supabase.storage.from("test-solutions").createSignedUrl(test.solution_pdf_path as string, 60 * 10);
                if (error || !data?.signedUrl) return;
                window.open(data.signedUrl, "_blank");
              }}
              className="rounded-lg bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground hover:opacity-90"
            >
              Download Solution PDF
            </button>
          </div>
        )}

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold text-foreground">Answer breakdown</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold text-foreground">Subject-wise score vs max</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="subject" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="score" fill="#F97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="max" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Comparison strip */}
        {released && rankInfo && !rankInfo.excluded && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold text-foreground">You vs Topper vs Average</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: "You", value: Number(score.toFixed(1)) },
                  { name: "Topper", value: Number((rankInfo.topper_score ?? 0).toFixed(1)) },
                  { name: "Average", value: Number((rankInfo.average_score ?? 0).toFixed(1)) },
                ]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1E293B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Subject breakdown table */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-foreground">Subject-wise Breakdown</h2>
            <Link
              to={`/tests/${slug}/result/${id}/responses`}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
            >
              View detailed response sheet <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {Object.keys(subjects).length === 0 ? (
            <p className="text-xs text-muted-foreground">No subject data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-2 py-2 text-left font-semibold">Subject</th>
                    <th className="px-2 py-2 text-right font-semibold">Attempted</th>
                    <th className="px-2 py-2 text-right font-semibold">Correct</th>
                    <th className="px-2 py-2 text-right font-semibold">Accuracy</th>
                    <th className="px-2 py-2 text-right font-semibold">Score</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(subjects).map(([subj, stat]) => {
                    const acc = calcPercent(stat.correct, stat.attempted || stat.total);
                    return (
                      <tr key={subj} className="border-b last:border-0">
                        <td className="px-2 py-3 font-bold text-foreground">{subj}</td>
                        <td className="px-2 py-3 text-right">{stat.attempted}/{stat.total}</td>
                        <td className="px-2 py-3 text-right text-emerald-600 font-semibold">{stat.correct}</td>
                        <td className="px-2 py-3 text-right">{acc}%</td>
                        <td className="px-2 py-3 text-right font-semibold">{stat.score.toFixed(1)} / {stat.maxScore.toFixed(0)}</td>
                        <td className="px-2 py-3 text-right">
                          <Link to={`/tests/${slug}/result/${id}/subject/${slugifySubject(subj)}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                            Review <ChevronRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Re-attempt request panel */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-black text-foreground flex items-center gap-2">
                <RefreshCcw className="h-4 w-4 text-primary" /> Re-attempt this test
              </h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-md">
                Want to take this test again? Submit a request — your admin will review and approve it. Once approved, you can start a fresh attempt from the test page.
              </p>
            </div>
            <div>
              {reattemptStatus === "pending" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-[11px] font-bold">
                  <Clock className="h-3 w-3" /> Pending admin approval
                </span>
              )}
              {reattemptStatus === "approved" && (
                <Link to={`/tests/${slug}/instructions`} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-3 py-1.5 text-[11px] font-bold hover:bg-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approved — Start fresh attempt
                </Link>
              )}
              {reattemptStatus === "rejected" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-3 py-1 text-[11px] font-bold">
                  <XCircle className="h-3 w-3" /> Last request rejected
                </span>
              )}
              {(reattemptStatus === "none" || reattemptStatus === "rejected") && !reattemptOpen && (
                <button
                  onClick={() => setReattemptOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                >
                  <RefreshCcw className="h-3.5 w-3.5" /> Request Re-attempt
                </button>
              )}
            </div>
          </div>
          {reattemptOpen && (
            <div className="mt-4 rounded-xl border border-border bg-background p-4 space-y-3">
              <label className="block text-xs font-bold text-foreground">
                Reason for re-attempt
                <textarea
                  value={reattemptReason}
                  onChange={(e) => setReattemptReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. Lost internet connection during the test / wanted more practice on Mechanics…"
                  className="mt-1.5 block w-full rounded-lg border border-border bg-card px-3 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setReattemptOpen(false); setReattemptReason(""); }}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50"
                >Cancel</button>
                <button
                  onClick={submitReattemptRequest}
                  disabled={reattemptSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {reattemptSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                  Submit Request
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">

          <Link to="/my-tests" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50">
            <RotateCcw className="h-3.5 w-3.5" /> Back to Tests
          </Link>
          <Link to="/dashboard" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
            <Home className="h-3.5 w-3.5" /> Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

const StatTile = ({ icon: Icon, label, value, tone }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: number;
  tone: "success" | "danger" | "muted" | "primary";
}) => {
  const tones: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700",
    danger: "bg-red-50 text-red-700",
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <div className={`mx-auto mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="font-display text-xl font-black text-foreground">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
};

export default TestResultPage;
