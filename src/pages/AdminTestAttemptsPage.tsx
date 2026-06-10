import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Loader2, Eye, Trash2, Download, RotateCcw, RefreshCcw, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/components/ConfirmDialog";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/TablePagination";

type Attempt = {
  id: string;
  user_id: string;
  test_id: string;
  status: string;
  score: number | null;
  percentile: number | null;
  correct_answers: number | null;
  total_questions: number | null;
  started_at: string | null;
  submitted_at: string | null;
  created_at: string;
  time_spent_seconds: number | null;
};

type Props = { testId?: string; compact?: boolean };

type ReattemptReq = {
  id: string;
  user_id: string;
  test_id: string;
  attempt_id: string | null;
  reason: string | null;
  status: string;
  created_at: string;
};

const AdminTestAttemptsPage = ({ testId, compact }: Props = {}) => {
  const { user, isSuperAdmin } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [tests, setTests] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [testFilter, setTestFilter] = useState<string>(testId ?? "all");
  const [reattempts, setReattempts] = useState<ReattemptReq[]>([]);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("test_attempts")
      .select("id, user_id, test_id, status, score, percentile, correct_answers, total_questions, started_at, submitted_at, created_at, time_spent_seconds")
      .order("created_at", { ascending: false })
      .limit(500);
    if (testId) q = q.eq("test_id", testId);
    const { data } = await q;
    const rows = (data ?? []) as Attempt[];
    setAttempts(rows);

    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const tIds = Array.from(new Set(rows.map((r) => r.test_id).filter(Boolean)));
    const [pRes, tRes] = await Promise.all([
      userIds.length ? supabase.from("profiles").select("user_id, full_name").in("user_id", userIds) : Promise.resolve({ data: [] }),
      tIds.length ? supabase.from("tests").select("id, title, slug").in("id", tIds) : Promise.resolve({ data: [] }),
    ]);
    setProfiles(new Map(((pRes as any).data ?? []).map((p: any) => [p.user_id, p.full_name ?? "Student"])));
    setTests(((tRes as any).data ?? []) as any);
    setLoading(false);
  };

  const loadReattempts = async () => {
    let q = supabase
      .from("test_reattempt_requests")
      .select("id, user_id, test_id, attempt_id, reason, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (testId) q = q.eq("test_id", testId);
    const { data } = await q;
    setReattempts((data ?? []) as ReattemptReq[]);
  };

  const decideReattempt = async (req: ReattemptReq, decision: "approved" | "rejected") => {
    const { error } = await supabase
      .from("test_reattempt_requests")
      .update({
        status: decision,
        decided_by: user?.id ?? null,
        decided_at: new Date().toISOString(),
      })
      .eq("id", req.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Request ${decision}`);
    // If approved, also clear the prior attempt so the student can take a fresh one.
    if (decision === "approved" && req.attempt_id) {
      await supabase.from("test_attempts").delete().eq("id", req.attempt_id);
    }
    loadReattempts();
    load();
  };

  useEffect(() => { load(); loadReattempts(); /* eslint-disable-next-line */ }, [testId]);

  const filtered = useMemo(() => {
    return attempts.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!testId && testFilter !== "all" && a.test_id !== testFilter) return false;
      if (search) {
        const name = (profiles.get(a.user_id) ?? "").toLowerCase();
        const t = tests.find((x) => x.id === a.test_id)?.title?.toLowerCase() ?? "";
        if (!name.includes(search.toLowerCase()) && !t.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [attempts, search, statusFilter, testFilter, profiles, tests, testId]);

  const { paged, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 20);

  const resetAttempt = async (a: Attempt) => {
    const name = profiles.get(a.user_id) ?? "this student";
    const ok = await confirm({
      title: `Reset attempt for ${name}?`,
      description: "The attempt will be permanently deleted so the student can retake the test. This cannot be undone.",
      confirmLabel: "Delete attempt",
    });
    if (!ok) return;
    const { error } = await supabase.from("test_attempts").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Attempt deleted");
    load();
  };

  const exportCsv = () => {
    const rows = [
      ["Student", "Test", "Status", "Score", "Correct", "Total", "Percentile", "Time (s)", "Started", "Submitted"],
      ...filtered.map((a) => {
        const t = tests.find((x) => x.id === a.test_id);
        return [
          profiles.get(a.user_id) ?? "",
          t?.title ?? "",
          a.status,
          a.score ?? "",
          a.correct_answers ?? "",
          a.total_questions ?? "",
          a.percentile ?? "",
          a.time_spent_seconds ?? "",
          a.started_at ?? "",
          a.submitted_at ?? "",
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `test-attempts-${Date.now()}.csv`; link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={compact ? "" : "p-4 lg:p-6 space-y-6"}>
      {ConfirmDialog}
      {!compact && (
        <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-6 text-white">
          <h1 className="text-2xl font-black font-display">Test Attempts</h1>
          <p className="text-white/90 text-sm mt-1">Every student attempt with results, filters and reset controls.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or test..."
            className="w-full rounded-xl border border-border bg-card py-2 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="in_progress">In progress</option>
          <option value="submitted">Submitted</option>
          <option value="auto_submitted">Auto-submitted</option>
        </select>
        {!testId && (
          <select value={testFilter} onChange={(e) => setTestFilter(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm max-w-[220px]">
            <option value="all">All tests</option>
            {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        )}
        <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground hover:opacity-90">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No attempts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Test</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Score</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Correct</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">%ile</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Submitted</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((a) => {
                  const t = tests.find((x) => x.id === a.test_id);
                  const submitted = a.submitted_at ? format(new Date(a.submitted_at), "dd MMM HH:mm") : "—";
                  return (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{profiles.get(a.user_id) ?? "Student"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{t?.title ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          a.status === "submitted" ? "bg-secondary/20 text-secondary" :
                          a.status === "auto_submitted" ? "bg-amber-500/20 text-amber-600" :
                          "bg-primary/10 text-primary"
                        }`}>{a.status?.replace("_", " ")}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">{a.score ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">{a.correct_answers ?? "—"}/{a.total_questions ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-accent">{a.percentile ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">{submitted}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {t?.slug && a.status !== "in_progress" && (
                            <Link to={`/tests/${t.slug}/result/${a.id}`} target="_blank" className="rounded-md p-1.5 text-foreground hover:bg-muted" title="View result">
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                          )}
                          {isSuperAdmin && (
                            <button onClick={() => resetAttempt(a)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10" title="Reset attempt (super admin)">
                              {a.status === "in_progress" ? <RotateCcw className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTestAttemptsPage;
