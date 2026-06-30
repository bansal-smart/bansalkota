import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Loader2, Eye, Trash2, Download, RotateCcw, RefreshCcw, CheckCircle2, XCircle, Clock, Play, Radio } from "lucide-react";

import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import useDebouncedValue from "@/hooks/useDebouncedValue";
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
  const [notAttempted, setNotAttempted] = useState<{ user_id: string; full_name: string | null; batch_name: string | null }[]>([]);
  const [liveConnected, setLiveConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [testFilter, setTestFilter] = useState<string>(testId ?? "all");
  const [reattempts, setReattempts] = useState<ReattemptReq[]>([]);
  const [reopenFor, setReopenFor] = useState<Attempt | null>(null);
  const [reopenMinutes, setReopenMinutes] = useState<number>(60);
  const [reopenFresh, setReopenFresh] = useState<boolean>(true);
  const [reopenReason, setReopenReason] = useState<string>("");
  const [reopening, setReopening] = useState(false);

  const openReopen = (a: Attempt) => {
    setReopenFor(a);
    setReopenFresh(true);
    setReopenReason("");
    const t = tests.find((x) => x.id === a.test_id);
    // default to test duration when known via attempt total -> fallback 60
    setReopenMinutes(60);
    // Fetch the test duration for a nicer default
    supabase.from("tests").select("duration_minutes").eq("id", a.test_id).maybeSingle().then(({ data }) => {
      if (data?.duration_minutes) setReopenMinutes(data.duration_minutes);
    });
  };

  const confirmReopen = async () => {
    if (!reopenFor) return;
    if (reopenMinutes < 1 || reopenMinutes > 600) { toast.error("Minutes must be between 1 and 600"); return; }
    setReopening(true);
    const { error } = await supabase.rpc("admin_reopen_attempt" as any, {
      _attempt_id: reopenFor.id,
      _extra_minutes: reopenMinutes,
      _fresh: reopenFresh,
      _reason: reopenReason || null,
    });
    setReopening(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Attempt reopened with ${reopenMinutes} min`);
    setReopenFor(null);
    load();
  };

  const quickResume = async (a: Attempt) => {
    const { data: t } = await supabase.from("tests").select("duration_minutes").eq("id", a.test_id).maybeSingle();
    const usedMins = (a.time_spent_seconds ?? 0) / 60;
    const remaining = Math.max(5, Math.round((t?.duration_minutes ?? 60) - usedMins));
    const { error } = await supabase.rpc("admin_reopen_attempt" as any, {
      _attempt_id: a.id,
      _extra_minutes: remaining,
      _fresh: false,
      _reason: "Quick resume by admin",
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Resumed with ${remaining} min — student keeps all answers`);
    load();
  };

  const effectiveTestId = testId ?? (testFilter !== "all" ? testFilter : null);

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

  // Load the "absent" (not attempted) roster whenever a single test is in focus
  // (either via the testId prop or via the test dropdown).
  useEffect(() => {
    let active = true;
    (async () => {
      if (!effectiveTestId) { setNotAttempted([]); return; }
      const { data: naRows, error: naErr } = await (supabase as any)
        .rpc("admin_test_not_attempted", { _test_id: effectiveTestId });
      if (!active) return;
      if (!naErr) setNotAttempted((naRows ?? []) as any);
    })();
    return () => { active = false; };
  }, [effectiveTestId]);


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

  // Realtime: live status updates on test_attempts (per-test when scoped, else global)
  useEffect(() => {
    const channelName = testId ? `admin-attempts-${testId}` : `admin-attempts-all`;
    const filter = testId ? `test_id=eq.${testId}` : undefined;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "test_attempts", ...(filter ? { filter } : {}) },
        (payload: any) => {
          setAttempts((prev) => {
            if (payload.eventType === "DELETE") {
              const id = payload.old?.id;
              return prev.filter((a) => a.id !== id);
            }
            const next = payload.new as Attempt;
            if (!next?.id) return prev;
            const idx = prev.findIndex((a) => a.id === next.id);
            if (idx === -1) {
              // INSERT — remove from notAttempted if present
              setNotAttempted((na) => na.filter((s) => s.user_id !== next.user_id));
              return [next, ...prev];
            }
            const copy = prev.slice();
            copy[idx] = { ...copy[idx], ...next };
            return copy;
          });
          // Make sure we have profile name for any new user
          const uid = (payload.new as any)?.user_id;
          if (uid && !profiles.has(uid)) {
            supabase.from("profiles").select("user_id, full_name").eq("user_id", uid).maybeSingle()
              .then(({ data }) => {
                if (data) setProfiles((m) => new Map(m).set(data.user_id, data.full_name ?? "Student"));
              });
          }
        }
      )
      .subscribe((status) => {
        setLiveConnected(status === "SUBSCRIBED");
      });
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  type Row = (Attempt & { __na?: false }) | { __na: true; id: string; user_id: string; test_id: string; status: "not_attempted"; score: null; percentile: null; correct_answers: null; total_questions: null; started_at: null; submitted_at: null; created_at: string; time_spent_seconds: null; batch_name: string | null };

  const combined: Row[] = useMemo(() => {
    const attemptedUserIds = new Set(attempts.map((a) => a.user_id));
    const naRows: Row[] = testId
      ? notAttempted
          .filter((s) => !attemptedUserIds.has(s.user_id))
          .map((s) => ({
            __na: true as const,
            id: `na-${s.user_id}`,
            user_id: s.user_id,
            test_id: testId,
            status: "not_attempted" as const,
            score: null, percentile: null, correct_answers: null, total_questions: null,
            started_at: null, submitted_at: null, created_at: "",
            time_spent_seconds: null,
            batch_name: s.batch_name,
          }))
      : [];
    // Inject names into profiles map for NA students
    if (testId && notAttempted.length) {
      setProfiles((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const s of notAttempted) {
          if (!next.has(s.user_id)) { next.set(s.user_id, s.full_name ?? "Student"); changed = true; }
        }
        return changed ? next : prev;
      });
    }
    return [...attempts.map((a) => a as Row), ...naRows];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempts, notAttempted, testId]);

  const filtered = useMemo(() => {
    return combined.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!testId && testFilter !== "all" && a.test_id !== testFilter) return false;
      if (debouncedSearch) {
        const name = (profiles.get(a.user_id) ?? "").toLowerCase();
        const t = tests.find((x) => x.id === a.test_id)?.title?.toLowerCase() ?? "";
        if (!name.includes(debouncedSearch.toLowerCase()) && !t.includes(debouncedSearch.toLowerCase())) return false;
      }
      return true;
    });
  }, [combined, debouncedSearch, statusFilter, testFilter, profiles, tests, testId]);

  const counts = useMemo(() => {
    const c = { not_attempted: 0, in_progress: 0, submitted: 0, auto_submitted: 0 };
    for (const r of combined) {
      if (r.status === "not_attempted") c.not_attempted++;
      else if (r.status === "in_progress") c.in_progress++;
      else if (r.status === "submitted") c.submitted++;
      else if (r.status === "auto_submitted") c.auto_submitted++;
    }
    return c;
  }, [combined]);

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

      {/* Pending Re-attempt Requests */}
      {(() => {
        const pending = reattempts.filter((r) => r.status === "pending");
        if (pending.length === 0) return null;
        return (
          <div className="rounded-2xl border border-amber-300 bg-amber-50/60 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4 text-amber-700" />
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-800">
                {pending.length} pending re-attempt request{pending.length > 1 ? "s" : ""}
              </h2>
            </div>
            <div className="space-y-2">
              {pending.map((r) => {
                const t = tests.find((x) => x.id === r.test_id);
                const name = profiles.get(r.user_id) ?? "Student";
                return (
                  <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white border border-amber-200 p-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground">{name} <span className="text-muted-foreground">· {t?.title ?? "—"}</span></p>
                      {r.reason && <p className="mt-0.5 text-muted-foreground italic line-clamp-2">"{r.reason}"</p>}
                      <p className="mt-0.5 text-[10px] text-muted-foreground">Requested {format(new Date(r.created_at), "dd MMM HH:mm")}</p>
                    </div>
                    <button onClick={() => decideReattempt(r, "approved")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button onClick={() => decideReattempt(r, "rejected")} className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 font-bold text-white hover:bg-red-700">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}


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
          {testId && <option value="not_attempted">Not attempted</option>}
          <option value="in_progress">In progress</option>
          <option value="submitted">Submitted</option>
          <option value="auto_submitted">Auto-submitted</option>
        </select>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${liveConnected ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`} title={liveConnected ? "Realtime connected" : "Realtime offline"}>
          <Radio className={`h-3 w-3 ${liveConnected ? "animate-pulse" : ""}`} /> {liveConnected ? "Live" : "Offline"}
        </span>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {testId && (
          <div className="rounded-lg border border-border bg-card p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Not Attempted</p><p className="text-lg font-black text-foreground">{counts.not_attempted}</p></div>
        )}
        <div className="rounded-lg border border-border bg-card p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">In Progress</p><p className="text-lg font-black text-primary">{counts.in_progress}</p></div>
        <div className="rounded-lg border border-border bg-card p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Submitted</p><p className="text-lg font-black text-secondary">{counts.submitted}</p></div>
        <div className="rounded-lg border border-border bg-card p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Auto-submitted</p><p className="text-lg font-black text-amber-600">{counts.auto_submitted}</p></div>
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
                          a.status === "not_attempted" ? "bg-muted text-muted-foreground" :
                          "bg-primary/10 text-primary animate-pulse"
                        }`}>{a.status === "not_attempted" ? "not attempted" : a.status?.replace("_", " ")}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">{a.score ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">{a.correct_answers ?? "—"}/{a.total_questions ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-accent">{a.percentile ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">{submitted}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {a.status === "not_attempted" ? (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          ) : (
                            <>
                              {t?.slug && a.status !== "in_progress" && (
                                <Link to={`/tests/${t.slug}/result/${a.id}`} target="_blank" className="rounded-md p-1.5 text-foreground hover:bg-muted" title="View result">
                                  <Eye className="h-3.5 w-3.5" />
                                </Link>
                              )}
                              {a.status !== "in_progress" && (
                                <>
                                  <button onClick={() => quickResume(a as Attempt)} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-100" title="Quick resume (keep answers, give remaining time)">
                                    <Play className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => openReopen(a as Attempt)} className="rounded-md p-1.5 text-amber-600 hover:bg-amber-100" title="Re-allow with custom time">
                                    <Clock className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                              {isSuperAdmin && (
                                <button onClick={() => resetAttempt(a as Attempt)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10" title="Reset attempt (super admin)">
                                  {a.status === "in_progress" ? <RotateCcw className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                                </button>
                              )}
                            </>
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


      {reopenFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !reopening && setReopenFor(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-lg font-black font-display">Re-allow attempt</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {profiles.get(reopenFor.user_id) ?? "Student"} · {tests.find((x) => x.id === reopenFor.test_id)?.title ?? "Test"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setReopenFresh(true)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${reopenFresh ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground"}`}>
                  Fresh attempt<br/><span className="font-normal text-[10px] opacity-70">Clears all answers</span>
                </button>
                <button onClick={() => setReopenFresh(false)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${!reopenFresh ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground"}`}>
                  Resume<br/><span className="font-normal text-[10px] opacity-70">Keeps previous answers</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Allowed duration (minutes)</label>
              <input
                type="number"
                min={1}
                max={600}
                value={reopenMinutes}
                onChange={(e) => setReopenMinutes(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">From now, the student gets this many minutes regardless of the test's global window.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Reason (optional)</label>
              <textarea
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                rows={2}
                placeholder="e.g. Technical glitch at 9:10"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setReopenFor(null)} disabled={reopening} className="rounded-lg border border-border px-3 py-2 text-xs font-bold">Cancel</button>
              <button onClick={confirmReopen} disabled={reopening} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50 inline-flex items-center gap-1.5">
                {reopening && <Loader2 className="h-3 w-3 animate-spin" />}
                Re-allow with {reopenMinutes} min
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTestAttemptsPage;
