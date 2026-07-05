import { useEffect, useMemo, useState } from "react";
import { Search, Check, X, Eye, Loader2, Plus, Pencil, Trash2, FileSpreadsheet, ClipboardList, Users2, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { useCenterPermissions } from "@/hooks/useCenterPermissions";
import { useConfirm } from "@/components/ConfirmDialog";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/TablePagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import CenterTestStudentsDialog from "@/components/CenterTestStudentsDialog";

type CenterTest = {
  id: string;
  title: string;
  slug: string;
  test_type: string;
  exam_pattern: string;
  total_questions: number;
  duration_minutes: number;
  is_published: boolean;
  created_at: string;
  starts_at: string | null;
  ends_at: string | null;
  centre_id: string | null;
  cbt_allowed_batch_ids: string[] | null;
};

type BatchOpt = { id: string; code: string; name: string };
type StatusFilter = "all" | "upcoming" | "active" | "previous" | "untimed";

const computeStatus = (t: CenterTest, now: number): Exclude<StatusFilter, "all"> => {
  const s = t.starts_at ? new Date(t.starts_at).getTime() : null;
  const e = t.ends_at ? new Date(t.ends_at).getTime() : null;
  if (s === null && e === null) return "untimed";
  if (s !== null && s > now) return "upcoming";
  if (e !== null && e < now) return "previous";
  return "active";
};

const STATUS_LABEL: Record<Exclude<StatusFilter, "all">, string> = {
  upcoming: "Upcoming",
  active: "Active",
  previous: "Previous",
  untimed: "Untimed",
};

const AssignBatchesDialog = ({
  test,
  batches,
  onClose,
  onSaved,
}: {
  test: CenterTest;
  batches: BatchOpt[];
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [selected, setSelected] = useState<string[]>(() =>
    (test.cbt_allowed_batch_ids ?? []).filter((id) => batches.some((b) => b.id === id)),
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.rpc("centre_assign_test_batches" as any, {
      _test_id: test.id,
      _batch_ids: selected,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Assignment updated");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign "{test.title}" to your batches</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Select which of your centre's batches can take this test. Leave none selected to not target any specific batch of yours.
        </p>
        <div className="max-h-64 overflow-y-auto space-y-1.5 py-2">
          {batches.length === 0 && <p className="text-xs text-muted-foreground">No batches found for your centre.</p>}
          {batches.map((b) => {
            const sel = selected.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelected(sel ? selected.filter((x) => x !== b.id) : [...selected, b.id])}
                className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                  sel ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
                }`}
              >
                <span>{b.name} <span className="text-xs text-muted-foreground">({b.code})</span></span>
                {sel && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium">Cancel</button>
          <button disabled={saving} onClick={save} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save Assignment"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CenterTestsPage = () => {
  const { primaryCenterId, loading: centerLoading } = useCenterAdmin();
  const { isAdmin, can } = useCenterPermissions();
  const { confirm, ConfirmDialog } = useConfirm();
  const [tests, setTests] = useState<CenterTest[]>([]);
  const [batches, setBatches] = useState<BatchOpt[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [assignTarget, setAssignTarget] = useState<CenterTest | null>(null);
  const [studentsTarget, setStudentsTarget] = useState<CenterTest | null>(null);

  const canCreate = isAdmin || can("test_platform", "create");
  const canEdit = isAdmin || can("test_platform", "edit");
  const canDelete = isAdmin || can("test_platform", "delete");
  const canViewTestSeries = isAdmin || can("test_series", "view");

  const load = async () => {
    if (!primaryCenterId) return;
    setLoading(true);
    const [{ data: testRows }, { data: batchRows }] = await Promise.all([
      supabase
        .from("tests")
        .select("id, title, slug, test_type, exam_pattern, total_questions, duration_minutes, is_published, created_at, starts_at, ends_at, centre_id, cbt_allowed_batch_ids")
        .or(`centre_id.eq.${primaryCenterId},centre_id.is.null`)
        .order("created_at", { ascending: false }),
      supabase.from("course_batches").select("id, code, name").eq("centre_id", primaryCenterId).order("code"),
    ]);
    setTests((testRows ?? []) as CenterTest[]);
    setBatches((batchRows ?? []) as BatchOpt[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryCenterId]);

  const togglePublish = async (t: CenterTest, publish: boolean) => {
    const { error } = await supabase.from("tests").update({ is_published: publish }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success(publish ? "Test published" : "Test unpublished");
    load();
  };

  const deleteTest = async (t: CenterTest) => {
    const ok = await confirm({
      title: `Delete "${t.title}" permanently?`,
      description: "This will permanently remove the test and all its questions and student attempts. This cannot be undone.",
      confirmLabel: "Delete test",
    });
    if (!ok) return;
    const { error } = await supabase.from("tests").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Test deleted");
    load();
  };

  const now = Date.now();
  const filtered = tests.filter((t) => {
    if (debouncedSearch && !t.title.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
    if (statusFilter !== "all" && computeStatus(t, now) !== statusFilter) return false;
    return true;
  });
  const { paged, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 15);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter]);

  const assignedCount = useMemo(() => {
    const batchIds = new Set(batches.map((b) => b.id));
    return (t: CenterTest) => (t.cbt_allowed_batch_ids ?? []).filter((id) => batchIds.has(id)).length;
  }, [batches]);

  if (centerLoading) return <div className="p-8 text-sm text-muted-foreground">Loading centre…</div>;
  if (!primaryCenterId) return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {ConfirmDialog}
      {assignTarget && (
        <AssignBatchesDialog
          test={assignTarget}
          batches={batches}
          onClose={() => setAssignTarget(null)}
          onSaved={() => {
            setAssignTarget(null);
            load();
          }}
        />
      )}
      <CenterTestStudentsDialog
        open={!!studentsTarget}
        onClose={() => setStudentsTarget(null)}
        testId={studentsTarget?.id ?? null}
        testName={studentsTarget?.title ?? ""}
        centreId={primaryCenterId}
      />
      <div className="rounded-2xl bg-[#1C3F8E] p-6 text-white flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/15 p-2.5">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black font-display">Test Platform</h1>
            <p className="text-white/90 text-sm mt-1">Create tests for your centre, or assign Bansal's tests to your students</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canViewTestSeries && (
            <Link to="/center/test-series" className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20">
              <Trophy className="h-4 w-4" /> Test Series
            </Link>
          )}
          {canCreate && (
            <Link to="/center/tests/new" className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-primary hover:bg-white/90">
              <Plus className="h-4 w-4" /> New test
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tests..."
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          title="Filter by status"
        >
          <option value="all">All exams</option>
          <option value="upcoming">{STATUS_LABEL.upcoming}</option>
          <option value="active">{STATUS_LABEL.active}</option>
          <option value="previous">{STATUS_LABEL.previous}</option>
          <option value="untimed">{STATUS_LABEL.untimed}</option>
        </select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No tests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Test</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Owner</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Questions</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Duration</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((t) => {
                  const isOwn = t.centre_id === primaryCenterId;
                  return (
                    <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{t.title}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isOwn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {isOwn ? "Your centre" : "Bansal (global)"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs capitalize">{t.test_type} · {t.exam_pattern}</td>
                      <td className="px-4 py-3 text-center text-xs text-foreground">{t.total_questions}</td>
                      <td className="px-4 py-3 text-center text-xs text-foreground">{t.duration_minutes} min</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            t.is_published ? "bg-secondary/20 text-secondary" : "bg-amber-500/20 text-amber-600"
                          }`}
                        >
                          {t.is_published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <a href={`/tests/${t.slug || t.id}/take`} target="_blank" rel="noreferrer" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors" title="Preview">
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                          {isOwn ? (
                            <>
                              {canEdit && (
                                <Link to={`/center/tests/${t.slug || t.id}/edit`} className="rounded-md p-1.5 text-foreground hover:bg-muted transition-colors" title="Edit test">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Link>
                              )}
                              <Link to={`/center/tests/${t.id}/results`} className="rounded-md p-1.5 text-secondary hover:bg-secondary/10 transition-colors" title="Results">
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                              </Link>
                              {canEdit && (
                                !t.is_published ? (
                                  <button onClick={() => togglePublish(t, true)} className="rounded-md p-1.5 text-secondary hover:bg-secondary/10">
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                ) : (
                                  <button onClick={() => togglePublish(t, false)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => deleteTest(t)}
                                  className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                                  title="Delete test"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  onClick={() => setStudentsTarget(t)}
                                  className="rounded-md px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/10 inline-flex items-center gap-1"
                                  title="Manage students"
                                >
                                  <Users2 className="h-3.5 w-3.5" /> Manage Students
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <Link to={`/center/tests/${t.id}/results`} className="rounded-md p-1.5 text-secondary hover:bg-secondary/10 transition-colors" title="Results">
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                              </Link>
                              {canEdit && (
                                <button
                                  onClick={() => setAssignTarget(t)}
                                  className="rounded-md px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/10 inline-flex items-center gap-1"
                                  title="Assign to batches"
                                >
                                  <Users2 className="h-3.5 w-3.5" /> Batches{assignedCount(t) > 0 ? ` (${assignedCount(t)})` : ""}
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  onClick={() => setStudentsTarget(t)}
                                  className="rounded-md px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/10 inline-flex items-center gap-1"
                                  title="Manage students"
                                >
                                  <Users2 className="h-3.5 w-3.5" /> Manage Students
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
    </div>
  );
};

export default CenterTestsPage;
