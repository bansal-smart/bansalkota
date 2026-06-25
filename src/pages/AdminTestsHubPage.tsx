import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow, subDays, startOfDay } from "date-fns";
import {
  ClipboardCheck, FileText, Library, Users, TrendingUp, Loader2, Upload, ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

type Stat = { label: string; value: string; icon: any; hint?: string; color: string };

const fetchHub = async () => {
  const todayIso = startOfDay(new Date()).toISOString();
  const weekIso = subDays(new Date(), 7).toISOString();
  const thirtyIso = subDays(new Date(), 30).toISOString();

  const [
    testsRes, qBankRes, qByTypeRes, attTodayRes, attWeekRes, attAllRes,
    attRecent, attChart, attLast7, importsRes, profilesRes,
  ] = await Promise.all([
    supabase.from("tests").select("id, is_published"),
    supabase.from("question_bank").select("id, subject"),
    supabase.from("test_questions").select("subject"),
    supabase.from("test_attempts").select("id", { count: "exact", head: true }).gte("created_at", todayIso),
    supabase.from("test_attempts").select("id", { count: "exact", head: true }).gte("created_at", weekIso),
    supabase.from("test_attempts").select("id", { count: "exact", head: true }),
    supabase.from("test_attempts")
      .select("id, user_id, test_id, score, percentile, status, submitted_at, created_at, total_questions, correct_answers")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("test_attempts")
      .select("created_at, score, total_questions")
      .gte("created_at", thirtyIso)
      .limit(2000),
    supabase.from("test_attempts")
      .select("test_id, score, total_questions, correct_answers, status")
      .gte("created_at", weekIso)
      .limit(2000),
    supabase.from("question_import_batches")
      .select("id, filename, status, question_count, image_count, created_at, uploaded_by")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("profiles").select("user_id, full_name").limit(1000),
  ]);

  const testIds = Array.from(new Set((attLast7.data ?? []).map((a: any) => a.test_id).filter(Boolean)));
  const testsForTop = testIds.length
    ? (await supabase.from("tests").select("id, slug, title").in("id", testIds)).data ?? []
    : [];

  return {
    tests: (testsRes.data ?? []) as { id: string; is_published: boolean }[],
    bank: (qBankRes.data ?? []) as { id: string; subject: string | null }[],
    testQs: (qByTypeRes.data ?? []) as { subject: string | null }[],
    attemptsToday: attTodayRes.count ?? 0,
    attemptsWeek: attWeekRes.count ?? 0,
    attemptsAll: attAllRes.count ?? 0,
    recent: (attRecent.data ?? []) as any[],
    chart: (attChart.data ?? []) as any[],
    last7: (attLast7.data ?? []) as any[],
    imports: (importsRes.data ?? []) as any[],
    profiles: new Map((profilesRes.data ?? []).map((p: any) => [p.user_id, p.full_name])),
    testsById: new Map(testsForTop.map((t: any) => [t.id, t])),
  };
};

const subjectColors: Record<string, string> = {
  Physics: "hsl(24,95%,53%)",
  Chemistry: "hsl(199,89%,48%)",
  Mathematics: "hsl(142,71%,45%)",
  Maths: "hsl(142,71%,45%)",
  Biology: "hsl(280,70%,55%)",
};

const AdminTestsHubPage = () => {
  const { data, isLoading } = useQuery({ queryKey: ["admin-tests-hub"], queryFn: fetchHub, staleTime: 60_000 });

  if (isLoading || !data) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const totalTests = data.tests.length;
  const publishedTests = data.tests.filter((t) => t.is_published).length;
  const bankBySubject: Record<string, number> = {};
  data.bank.forEach((q) => { const k = q.subject || "Other"; bankBySubject[k] = (bankBySubject[k] ?? 0) + 1; });

  // last 30 day chart
  const buckets: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) buckets[format(subDays(new Date(), i), "dd MMM")] = 0;
  data.chart.forEach((r: any) => {
    const k = format(new Date(r.created_at), "dd MMM");
    if (k in buckets) buckets[k]++;
  });
  const chartData = Object.entries(buckets).map(([day, attempts]) => ({ day, attempts }));

  // avg accuracy last 7d
  let acc = 0, accN = 0;
  data.last7.forEach((r: any) => {
    if (r.total_questions > 0 && r.correct_answers != null) { acc += (r.correct_answers / r.total_questions) * 100; accN++; }
  });
  const avgAccuracy = accN ? (acc / accN).toFixed(1) : "—";

  // top tests by attempts last 7d
  const byTest: Record<string, { n: number; score: number; scoreN: number }> = {};
  data.last7.forEach((r: any) => {
    if (!r.test_id) return;
    const b = byTest[r.test_id] ?? { n: 0, score: 0, scoreN: 0 };
    b.n++;
    if (r.score != null && r.total_questions > 0) { b.score += (r.correct_answers / r.total_questions) * 100; b.scoreN++; }
    byTest[r.test_id] = b;
  });
  const topTests = Object.entries(byTest)
    .map(([id, v]) => ({ id, ...v, avg: v.scoreN ? (v.score / v.scoreN).toFixed(1) : "—" }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);

  const subjectAcc: Record<string, { c: number; t: number }> = {};
  data.last7.forEach((r: any) => { /* subject is per-attempt aggregate; skip detailed */ });

  const bankChart = Object.entries(bankBySubject).map(([name, value]) => ({ name, value }));

  const stats: Stat[] = [
    { label: "Tests", value: `${publishedTests}/${totalTests}`, icon: ClipboardCheck, hint: "Published / Total", color: "text-primary" },
    { label: "Question Bank", value: data.bank.length.toLocaleString(), icon: Library, hint: `${data.testQs.length} in tests`, color: "text-accent" },
    { label: "Attempts Today", value: data.attemptsToday.toLocaleString(), icon: TrendingUp, hint: `${data.attemptsWeek} this week`, color: "text-secondary" },
    { label: "Total Attempts", value: data.attemptsAll.toLocaleString(), icon: Users, hint: `Avg accuracy ${avgAccuracy}%`, color: "text-primary" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 hover-lift">
            <s.icon className={`h-5 w-5 ${s.color}`} />
            <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            {s.hint && <p className="mt-1 text-[10px] text-muted-foreground">{s.hint}</p>}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold text-foreground mb-3">Attempts — Last 30 Days</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <defs>
              <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(24,95%,53%)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(24,95%,53%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="attempts" stroke="hsl(24,95%,53%)" fill="url(#attGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">Top Tests (last 7 days)</h2>
              <Link to="/admin/tests" className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
                All tests <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {topTests.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No attempts in the last 7 days.</p>
            ) : (
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2">Test</th>
                  <th className="text-right py-2">Attempts</th>
                  <th className="text-right py-2">Avg %</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {topTests.map((t) => {
                    const test: any = data.testsById.get(t.id);
                    return (
                      <tr key={t.id} className="border-b border-border last:border-0">
                        <td className="py-2.5 font-medium text-foreground">{test?.title ?? "—"}</td>
                        <td className="py-2.5 text-right text-foreground">{t.n}</td>
                        <td className="py-2.5 text-right text-secondary font-medium">{t.avg}%</td>
                        <td className="py-2.5 text-right">
                          {test?.slug && (
                            <Link to={`/admin/tests/${test.slug}`} className="text-primary hover:underline">Manage</Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">Recent Attempts</h2>
              <Link to="/admin/test-attempts" className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2">Student</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-right py-2">Score</th>
                  <th className="text-right py-2">%ile</th>
                  <th className="text-right py-2">When</th>
                </tr></thead>
                <tbody>
                  {data.recent.map((a: any) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="py-2 font-medium text-foreground">{data.profiles.get(a.user_id) ?? "Student"}</td>
                      <td className="py-2 text-muted-foreground capitalize">{a.status?.replace("_", " ")}</td>
                      <td className="py-2 text-right text-foreground">{a.score ?? "—"}</td>
                      <td className="py-2 text-right text-accent">{a.percentile ?? "—"}</td>
                      <td className="py-2 text-right text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-bold text-foreground mb-3">Question Bank by Subject</h2>
            {bankChart.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No questions yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={bankChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(24,95%,53%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><Upload className="h-4 w-4 text-primary" />Recent Imports</h2>
              <Link to="/admin/test-imports" className="text-xs text-primary font-semibold hover:underline">View all</Link>
            </div>
            {data.imports.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No imports yet.</p>
            ) : (
              <div className="space-y-2">
                {data.imports.map((b: any) => (
                  <div key={b.id} className="rounded-lg border border-border p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                        <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                        {b.filename}
                      </p>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                        b.status === "completed" ? "bg-secondary/20 text-secondary" :
                        b.status === "failed" ? "bg-destructive/20 text-destructive" : "bg-amber-500/20 text-amber-600"
                      }`}>{b.status}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {b.question_count ?? 0} Qs · {b.image_count ?? 0} imgs · {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTestsHubPage;
