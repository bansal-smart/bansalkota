import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, ArrowLeft, Pencil, Trash2, Check, X, Eye, Upload, BarChart3, Trophy, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/components/ConfirmDialog";
import AdminTestAttemptsPage from "./AdminTestAttemptsPage";
import DocxBulkImportDialog from "@/components/DocxBulkImportDialog";
import DocxCommonImportDialog from "@/components/DocxCommonImportDialog";
import MathRenderer from "@/components/MathRenderer";
import CbtSettingsPanel from "@/components/admin/CbtSettingsPanel";

type Tab = "summary" | "questions" | "attempts" | "leaderboard" | "analytics";

const safeFmt = (d: string | Date | null | undefined, fmt: string) => {
  if (!d) return "—";
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    if (isNaN(dt.getTime())) return "—";
    return format(dt, fmt);
  } catch { return "—"; }
};

type TestRow = {
  id: string; title: string; slug: string; description: string | null;
  test_type: string; exam_pattern: string; duration_minutes: number;
  total_questions: number; total_marks: number; correct_marks: number; wrong_marks: number;
  is_published: boolean; created_at: string; subjects: string[] | null;
  starts_at: string | null; ends_at: string | null;
};

type QRow = {
  id: string; position: number; subject: string | null; topic: string | null;
  question_text: string; question_type: string | null; difficulty: string | null;
  marks_correct: number | null; marks_wrong: number | null;
};

const AdminTestDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [tab, setTab] = useState<Tab>("summary");
  const [test, setTest] = useState<TestRow | null>(null);
  const [questions, setQuestions] = useState<QRow[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showCommonImport, setShowCommonImport] = useState(false);

  const load = async () => {
    if (!slug) {
      setLoadError("Missing test slug in URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      // Try by slug first, then by id (in case the URL carries an id)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      const q = isUuid
        ? supabase.from("tests").select("*").eq("id", slug).maybeSingle()
        : supabase.from("tests").select("*").eq("slug", slug).maybeSingle();
      const { data: t, error: tErr } = await q;
      if (tErr) throw tErr;
      if (!t) {
        setTest(null);
        setLoading(false);
        return;
      }
      setTest(t as TestRow);

      const [qRes, aRes] = await Promise.all([
        supabase
          .from("test_questions")
          .select("id, position, subject, topic, question_text, question_type, difficulty, marks_correct, marks_wrong")
          .eq("test_id", t.id)
          .order("position"),
        supabase
          .from("test_attempts")
          .select("id, user_id, score, percentile, correct_answers, total_questions, status, submitted_at, time_spent_seconds, answers")
          .eq("test_id", t.id)
          .order("score", { ascending: false })
          .limit(500),
      ]);
      if ((qRes as any).error) console.warn("[AdminTestDetail] questions load error", (qRes as any).error);
      if ((aRes as any).error) console.warn("[AdminTestDetail] attempts load error", (aRes as any).error);
      setQuestions((((qRes as any).data ?? []) as QRow[]));
      const aRows = (((aRes as any).data ?? []) as any[]);
      setAttempts(aRows);
      const userIds = Array.from(new Set(aRows.map((a) => a.user_id).filter(Boolean)));
      if (userIds.length) {
        const { data: p } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        setProfiles(new Map((((p as any) ?? []) as any[]).map((x: any) => [x.user_id, x.full_name ?? "Student"])));
      } else {
        setProfiles(new Map());
      }
    } catch (e: any) {
      console.error("[AdminTestDetail] load failed", e);
      setLoadError(e?.message ?? "Failed to load test.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

  // Analytics (hooks must run before any early return)
  const submitted = useMemo(() => attempts.filter((a) => a.status !== "in_progress"), [attempts]);
  const perQuestion = useMemo(() => {
    const stats: Record<string, { correct: number; attempted: number }> = {};
    try {
      submitted.forEach((a) => {
        const ans = (a && typeof a.answers === "object" && a.answers !== null) ? a.answers : {};
        questions.forEach((q) => {
          const s = stats[q.id] ?? { correct: 0, attempted: 0 };
          const u = ans[q.id];
          const sel = u?.selected;
          const hasSel = sel != null && (Array.isArray(sel) ? sel.length > 0 : String(sel).length > 0);
          if (hasSel) {
            s.attempted++;
            if (u?.isCorrect) s.correct++;
          }
          stats[q.id] = s;
        });
      });
    } catch (e) {
      console.warn("[AdminTestDetail] perQuestion calc skipped", e);
    }
    return questions.map((q) => {
      const s = stats[q.id] ?? { correct: 0, attempted: 0 };
      const acc = s.attempted ? (s.correct / s.attempted) * 100 : 0;
      return { ...q, attempted: s.attempted, correct: s.correct, accuracy: acc };
    });
  }, [questions, submitted]);

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (loadError) {
    return (
      <div className="p-6 lg:p-10">
        <Link to="/admin/tests" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to all tests
        </Link>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="text-sm font-bold text-destructive">Could not load this test</p>
          <p className="mt-1 text-xs text-muted-foreground break-words">{loadError}</p>
          <button onClick={load} className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90">
            Retry
          </button>
        </div>
      </div>
    );
  }
  if (!test) return (
    <div className="p-10 text-center text-sm text-muted-foreground">
      <p>Test not found for slug "{slug}".</p>
      <Link to="/admin/tests" className="mt-3 inline-block text-primary font-semibold hover:underline">Back to all tests</Link>
    </div>
  );

  const togglePublish = async () => {
    const { error } = await supabase.from("tests").update({ is_published: !test.is_published }).eq("id", test.id);
    if (error) return toast.error(error.message);
    toast.success(test.is_published ? "Unpublished" : "Published");
    load();
  };

  const deleteTest = async () => {
    const ok = await confirm({
      title: `Delete "${test.title}" permanently?`,
      description: "All questions and attempts will be removed. This cannot be undone.",
      confirmLabel: "Delete test",
    });
    if (!ok) return;
    const { error } = await supabase.from("tests").delete().eq("id", test.id);
    if (error) return toast.error(error.message);
    toast.success("Test deleted");
    navigate("/admin/tests");
  };

  const deleteQuestion = async (q: QRow) => {
    const ok = await confirm({ title: "Delete this question?", confirmLabel: "Delete" });
    if (!ok) return;
    const { error } = await supabase.from("test_questions").delete().eq("id", q.id);
    if (error) return toast.error(error.message);
    toast.success("Question removed");
    load();
  };

  // Analytics
  const avgScore = submitted.length ? (submitted.reduce((s, a) => s + Number(a.score ?? 0), 0) / submitted.length).toFixed(1) : "—";
  const avgAcc = submitted.length
    ? (submitted.reduce((s, a) => s + (a.total_questions ? (a.correct_answers ?? 0) / a.total_questions * 100 : 0), 0) / submitted.length).toFixed(1)
    : "—";
  const avgTime = submitted.length
    ? Math.round(submitted.reduce((s, a) => s + Number(a.time_spent_seconds ?? 0), 0) / submitted.length / 60)
    : 0;

  const hardest = [...perQuestion].filter((p) => p.attempted > 0).sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);
  const easiest = [...perQuestion].filter((p) => p.attempted > 0).sort((a, b) => b.accuracy - a.accuracy).slice(0, 5);
  const leaderboard = [...submitted].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0)).slice(0, 20);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {ConfirmDialog}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin/tests" className="rounded-lg border border-border p-2 hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">{test.title}</h1>
            <p className="text-xs text-muted-foreground capitalize">{test.test_type} · {test.exam_pattern} · {test.duration_minutes} min</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${test.is_published ? "bg-secondary/20 text-secondary" : "bg-amber-500/20 text-amber-600"}`}>
            {test.is_published ? "Published" : "Draft"}
          </span>
          <button onClick={togglePublish} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted inline-flex items-center gap-1">
            {test.is_published ? <><X className="h-3.5 w-3.5" /> Unpublish</> : <><Check className="h-3.5 w-3.5" /> Publish</>}
          </button>
          <Link to={`/admin/tests/${test.slug}/edit`} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground inline-flex items-center gap-1 hover:opacity-90">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>
          <Link to={`/tests/${test.slug}/take`} target="_blank" className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> Preview
          </Link>
          <Link to={`/admin/tests/${test.slug}/result`} className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground inline-flex items-center gap-1 hover:opacity-90">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Result Sheet
          </Link>
          {isSuperAdmin && (
            <button onClick={deleteTest} className="rounded-lg border border-destructive/30 text-destructive px-3 py-1.5 text-xs font-semibold hover:bg-destructive/10 inline-flex items-center gap-1">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-border flex gap-1 overflow-x-auto scrollbar-hide">
        {[
          { k: "summary", label: "Summary" },
          { k: "questions", label: `Questions (${questions.length})` },
          { k: "attempts", label: `Attempts (${attempts.length})` },
          { k: "leaderboard", label: "Leaderboard" },
          { k: "analytics", label: "Analytics" },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as Tab)}
            className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${tab === t.k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Questions", value: test.total_questions },
            { label: "Total Marks", value: test.total_marks },
            { label: "Marks (correct)", value: `+${test.correct_marks}` },
            { label: "Marks (wrong)", value: test.wrong_marks },
            { label: "Subjects", value: (Array.isArray(test.subjects) ? test.subjects : []).join(", ") || "—" },
            { label: "Created", value: safeFmt(test.created_at, "dd MMM yyyy") },
            { label: "Opens", value: test.starts_at ? safeFmt(test.starts_at, "dd MMM HH:mm") : "Anytime" },
            { label: "Closes", value: test.ends_at ? safeFmt(test.ends_at, "dd MMM HH:mm") : "No deadline" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold text-foreground mt-1 break-words">{s.value}</p>
            </div>
          ))}
          {test.description && (
            <div className="md:col-span-2 lg:col-span-4 rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{test.description}</p>
            </div>
          )}
          <div className="md:col-span-2 lg:col-span-4">
            <CbtSettingsPanel testId={test.id} />
          </div>
        </div>
      )}

      {tab === "questions" && (
        <div className="space-y-3">
          <div className="flex justify-end gap-2 flex-wrap">
            <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:bg-muted">
              <Upload className="h-4 w-4" /> Master import
            </button>
            <button onClick={() => setShowCommonImport(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90">
              <Upload className="h-4 w-4" /> Common import
            </button>
            <Link to={`/admin/tests/${test.slug}/edit`} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">Open editor</Link>
            {questions.length > 0 && (
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: `Delete all ${questions.length} questions in this test?`,
                    description: "This permanently removes every question in this test. Student attempts are kept but will show no questions to grade against.",
                    confirmLabel: "Delete all questions",
                  });
                  if (!ok) return;
                  const { error } = await supabase.from("test_questions").delete().eq("test_id", test.id);
                  if (error) return toast.error(error.message);
                  await supabase.from("tests").update({ total_questions: 0, total_marks: 0 }).eq("id", test.id);
                  toast.success("All questions deleted");
                  load();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" /> Delete all questions
              </button>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Question</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Subject</th>
                <th className="px-3 py-2 text-center">Marks</th>
                <th className="px-3 py-2"></th>
              </tr></thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-muted-foreground">{q.position}</td>
                    <td className="px-3 py-2 text-foreground max-w-md truncate">
                      <MathRenderer content={q.question_text} inline />
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{q.question_type ?? "mcq"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{q.subject ?? "—"}</td>
                    <td className="px-3 py-2 text-center text-xs">+{q.marks_correct ?? 0}/{q.marks_wrong ?? 0}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => deleteQuestion(q)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
                {questions.length === 0 && (
                  <tr><td colSpan={6} className="p-10 text-center text-sm text-muted-foreground">No questions yet. Add some via the editor or bulk import.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "attempts" && <AdminTestAttemptsPage testId={test.id} compact />}

      {tab === "leaderboard" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No submissions yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left">Rank</th>
                <th className="px-4 py-2 text-left">Student</th>
                <th className="px-4 py-2 text-right">Score</th>
                <th className="px-4 py-2 text-right">Correct</th>
                <th className="px-4 py-2 text-right">%ile</th>
                <th className="px-4 py-2 text-right">Time</th>
              </tr></thead>
              <tbody>
                {leaderboard.map((a, i) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-bold flex items-center gap-1.5">{i < 3 && <Trophy className="h-3.5 w-3.5 text-amber-500" />} {i + 1}</td>
                    <td className="px-4 py-2 text-foreground">{profiles.get(a.user_id) ?? "Student"}</td>
                    <td className="px-4 py-2 text-right text-foreground">{a.score}</td>
                    <td className="px-4 py-2 text-right text-xs text-muted-foreground">{a.correct_answers}/{a.total_questions}</td>
                    <td className="px-4 py-2 text-right text-accent">{a.percentile ?? "—"}</td>
                    <td className="px-4 py-2 text-right text-xs text-muted-foreground">{a.time_spent_seconds ? `${Math.round(a.time_spent_seconds / 60)} min` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "analytics" && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Submissions</p><p className="text-2xl font-bold">{submitted.length}</p></div>
            <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Avg Score</p><p className="text-2xl font-bold">{avgScore}</p></div>
            <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Avg Accuracy</p><p className="text-2xl font-bold">{avgAcc}%</p></div>
            <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Avg Time</p><p className="text-2xl font-bold">{avgTime} min</p></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-destructive" /> Hardest 5 questions</h3>
              {hardest.length === 0 ? <p className="text-xs text-muted-foreground py-6 text-center">No data yet.</p> : (
                <ul className="space-y-2">
                  {hardest.map((q) => (
                    <li key={q.id} className="flex items-center gap-2 text-xs">
                      <span className="font-bold w-6 text-muted-foreground">Q{q.position}</span>
                      <span className="flex-1 truncate text-foreground"><MathRenderer content={q.question_text} inline /></span>
                      <span className="font-bold text-destructive">{q.accuracy.toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-secondary" /> Easiest 5 questions</h3>
              {easiest.length === 0 ? <p className="text-xs text-muted-foreground py-6 text-center">No data yet.</p> : (
                <ul className="space-y-2">
                  {easiest.map((q) => (
                    <li key={q.id} className="flex items-center gap-2 text-xs">
                      <span className="font-bold w-6 text-muted-foreground">Q{q.position}</span>
                      <span className="flex-1 truncate text-foreground"><MathRenderer content={q.question_text} inline /></span>
                      <span className="font-bold text-secondary">{q.accuracy.toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <DocxBulkImportDialog open={showImport} onClose={() => setShowImport(false)} onImported={() => { setShowImport(false); load(); }} testId={test.id} />
      <DocxCommonImportDialog open={showCommonImport} onClose={() => setShowCommonImport(false)} onImported={() => { setShowCommonImport(false); load(); }} testId={test.id} examPattern={test.exam_pattern} />
    </div>
  );
};

export default AdminTestDetailPage;
