import { useEffect, useState } from "react";
import { Loader2, Search, X, Trash2, UserPlus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

type StudentRow = {
  assignment_id: string;
  user_id: string;
  full_name: string | null;
  roll_number: string | null;
  phone: string | null;
  class_level: string | null;
  target_exam: string | null;
  batch_label: string | null;
  attempt_status: string | null;
};

type CandidateRow = {
  user_id: string;
  full_name: string | null;
  roll_number: string | null;
  phone: string | null;
  class_level: string | null;
  target_exam: string | null;
  batch_label: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  testId: string | null;
  testName: string;
  centreId: string | null;
};

const CenterTestStudentsDialog = ({ open, onClose, testId, testName, centreId }: Props) => {
  const { isSuperAdmin, isAdmin, isCenterAdmin } = useAuth();
  const canManage = isSuperAdmin || isAdmin || isCenterAdmin;

  const [tab, setTab] = useState<"assigned" | "assign">("assigned");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [streamFilter, setStreamFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  // assign tab state
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignClassFilter, setAssignClassFilter] = useState("all");
  const [assignStreamFilter, setAssignStreamFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);

  const loadAssigned = async () => {
    if (!testId || !centreId) return;
    setLoading(true);
    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("user_id, full_name, roll_number, phone, class_level, target_exam, batch_label")
      .eq("centre_id", centreId);
    if (pErr) {
      toast.error(pErr.message);
      setLoading(false);
      return;
    }
    const ids = (profs ?? []).map((p: any) => p.user_id);
    if (ids.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const [{ data: asg, error: aErr }, { data: att }] = await Promise.all([
      supabase
        .from("test_assignments" as any)
        .select("id, user_id")
        .eq("test_id", testId)
        .eq("is_active", true)
        .in("user_id", ids),
      supabase
        .from("test_attempts")
        .select("user_id, status")
        .eq("test_id", testId)
        .in("user_id", ids),
    ]);
    if (aErr) {
      toast.error(aErr.message);
      setLoading(false);
      return;
    }
    const profMap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
    const attemptMap = new Map((att ?? []).map((a: any) => [a.user_id, a.status]));
    const merged: StudentRow[] = ((asg ?? []) as any[]).map((a: any) => {
      const p: any = profMap.get(a.user_id) ?? {};
      return {
        assignment_id: a.id,
        user_id: a.user_id,
        full_name: p.full_name ?? null,
        roll_number: p.roll_number ?? null,
        phone: p.phone ?? null,
        class_level: p.class_level ?? null,
        target_exam: p.target_exam ?? null,
        batch_label: p.batch_label ?? null,
        attempt_status: attemptMap.get(a.user_id) ?? null,
      };
    });
    setRows(merged);
    setLoading(false);
  };

  const loadCandidates = async () => {
    if (!testId || !centreId) return;
    setLoading(true);
    const { data: profs, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, roll_number, phone, class_level, target_exam, batch_label")
      .eq("centre_id", centreId);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const ids = (profs ?? []).map((p: any) => p.user_id);
    let assignedIds = new Set<string>();
    if (ids.length) {
      const { data: asg } = await supabase
        .from("test_assignments" as any)
        .select("user_id")
        .eq("test_id", testId)
        .eq("is_active", true)
        .in("user_id", ids);
      assignedIds = new Set(((asg ?? []) as any[]).map((a) => a.user_id));
    }
    setCandidates(((profs ?? []) as any[]).filter((p) => !assignedIds.has(p.user_id)));
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    if (tab === "assigned") loadAssigned();
    else loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, testId, centreId, tab]);

  const removeAssignment = async (row: StudentRow) => {
    if (!canManage) return;
    setBusyId(row.assignment_id);
    const { error } = await supabase
      .from("test_assignments" as any)
      .delete()
      .eq("id", row.assignment_id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.assignment_id !== row.assignment_id));
    toast.success("Removed from test");
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const assignSelected = async () => {
    if (!testId || selected.size === 0) return;
    setAssigning(true);
    const payload = Array.from(selected).map((user_id) => ({
      user_id,
      test_id: testId,
      is_active: true,
    }));
    const { error } = await supabase.from("test_assignments" as any).insert(payload as any);
    setAssigning(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Assigned ${payload.length} student${payload.length > 1 ? "s" : ""} to test`);
    setSelected(new Set());
    setTab("assigned");
  };

  const classOptions = Array.from(new Set(rows.map((r) => r.class_level).filter(Boolean))).sort() as string[];
  const streamOptions = Array.from(new Set(rows.map((r) => r.target_exam).filter(Boolean))).sort() as string[];
  const assignClassOptions = Array.from(new Set(candidates.map((r) => r.class_level).filter(Boolean))).sort() as string[];
  const assignStreamOptions = Array.from(new Set(candidates.map((r) => r.target_exam).filter(Boolean))).sort() as string[];

  const filtered = rows.filter((r) => {
    if (classFilter !== "all" && (r.class_level ?? "") !== classFilter) return false;
    if (streamFilter !== "all" && (r.target_exam ?? "") !== streamFilter) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.full_name ?? "").toLowerCase().includes(q) ||
      (r.roll_number ?? "").toLowerCase().includes(q) ||
      (r.phone ?? "").toLowerCase().includes(q)
    );
  });

  const filteredCandidates = candidates.filter((r) => {
    if (assignClassFilter !== "all" && (r.class_level ?? "") !== assignClassFilter) return false;
    if (assignStreamFilter !== "all" && (r.target_exam ?? "") !== assignStreamFilter) return false;
    const q = assignSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.full_name ?? "").toLowerCase().includes(q) ||
      (r.roll_number ?? "").toLowerCase().includes(q) ||
      (r.phone ?? "").toLowerCase().includes(q)
    );
  });

  if (!open) return null;

  const statusLabel = (s: string | null) => {
    if (!s) return "Not started";
    if (s === "in_progress") return "In progress";
    if (s === "submitted") return "Submitted";
    return s;
  };
  const statusColor = (s: string | null) => {
    if (s === "submitted") return "bg-secondary/20 text-secondary";
    if (s === "in_progress") return "bg-amber-500/20 text-amber-600";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-card shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Manage Students</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{testName}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-border px-4 pt-3">
          <button
            onClick={() => setTab("assigned")}
            className={`rounded-t-md px-3 py-2 text-xs font-semibold transition-colors ${
              tab === "assigned" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Assigned ({rows.length})
          </button>
          {canManage && (
            <button
              onClick={() => setTab("assign")}
              className={`inline-flex items-center gap-1 rounded-t-md px-3 py-2 text-xs font-semibold transition-colors ${
                tab === "assign" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="h-3 w-3" />
              Assign Students
            </button>
          )}
        </div>

        {tab === "assigned" ? (
          <>
            <div className="p-4 border-b border-border flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, roll number or phone..."
                  className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:border-primary"
                />
              </div>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="rounded-xl border border-border bg-background py-2 px-3 text-sm outline-none focus:border-primary"
              >
                <option value="all">All classes</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={streamFilter}
                onChange={(e) => setStreamFilter(e.target.value)}
                className="rounded-xl border border-border bg-background py-2 px-3 text-sm outline-none focus:border-primary"
              >
                <option value="all">All streams</option>
                {streamOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No students are assigned to this test yet.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/60">
                    <tr className="border-b border-border">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Roll</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Class</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Batch</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Phone</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.assignment_id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2 font-medium text-foreground">{r.full_name ?? "—"}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{r.roll_number ?? "—"}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{r.class_level ?? "—"}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{r.batch_label ?? "—"}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{r.phone ?? "—"}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor(r.attempt_status)}`}>
                            {statusLabel(r.attempt_status)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {canManage ? (
                            <button
                              onClick={() => removeAssignment(r)}
                              disabled={busyId === r.assignment_id}
                              className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                            >
                              {busyId === r.assignment_id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                              Remove
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border-b border-border flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  placeholder="Search students to assign..."
                  className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:border-primary"
                />
              </div>
              <select
                value={assignClassFilter}
                onChange={(e) => setAssignClassFilter(e.target.value)}
                className="rounded-xl border border-border bg-background py-2 px-3 text-sm outline-none focus:border-primary"
              >
                <option value="all">All classes</option>
                {assignClassOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={assignStreamFilter}
                onChange={(e) => setAssignStreamFilter(e.target.value)}
                className="rounded-xl border border-border bg-background py-2 px-3 text-sm outline-none focus:border-primary"
              >
                <option value="all">All streams</option>
                {assignStreamOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                onClick={assignSelected}
                disabled={selected.size === 0 || assigning}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                Assign ({selected.size})
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  All centre students are already assigned to this test.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/60">
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 w-10"></th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Roll</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Class</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Batch</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map((r) => {
                      const checked = selected.has(r.user_id);
                      return (
                        <tr
                          key={r.user_id}
                          onClick={() => toggleSelect(r.user_id)}
                          className={`border-b border-border last:border-0 cursor-pointer ${
                            checked ? "bg-primary/5" : "hover:bg-muted/30"
                          }`}
                        >
                          <td className="px-3 py-2 text-center">
                            <div
                              className={`mx-auto h-4 w-4 rounded border flex items-center justify-center ${
                                checked ? "bg-primary border-primary" : "border-border"
                              }`}
                            >
                              {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                          </td>
                          <td className="px-4 py-2 font-medium text-foreground">{r.full_name ?? "—"}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{r.roll_number ?? "—"}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{r.class_level ?? "—"}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{r.batch_label ?? "—"}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{r.phone ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        <div className="border-t border-border p-3 text-right">
          <button
            onClick={onClose}
            className="rounded-lg bg-muted px-4 py-2 text-sm font-semibold hover:bg-muted/80"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CenterTestStudentsDialog;
