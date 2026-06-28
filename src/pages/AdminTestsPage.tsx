import { useEffect, useState } from "react";
import { Search, Check, X, Eye, Loader2, Plus, Pencil, Trash2, FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/components/ConfirmDialog";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/TablePagination";

type AdminTest = {
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
  cbt_allowed_batch_ids: string[] | null;
};

type BatchOpt = { id: string; name: string };
type StatusFilter = "all" | "upcoming" | "active" | "previous" | "untimed";

const computeStatus = (t: AdminTest, now: number): Exclude<StatusFilter, "all"> => {
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

const AdminTestsPage = () => {
  const { isSuperAdmin } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [tests, setTests] = useState<AdminTest[]>([]);
  const [batches, setBatches] = useState<BatchOpt[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [batchFilter, setBatchFilter] = useState<string>("all"); // "all" | "unrestricted" | batchId
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: testRows }, { data: batchRows }] = await Promise.all([
      supabase
        .from("tests")
        .select(
          "id, title, slug, test_type, exam_pattern, total_questions, duration_minutes, is_published, created_at, starts_at, ends_at, cbt_allowed_batch_ids",
        )
        .order("created_at", { ascending: false }),
      supabase.from("course_batches").select("id, name").order("name"),
    ]);
    setTests((testRows ?? []) as AdminTest[]);
    setBatches((batchRows ?? []) as BatchOpt[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const togglePublish = async (t: AdminTest, publish: boolean) => {
    const { error } = await supabase.from("tests").update({ is_published: publish }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success(publish ? "Test published" : "Test unpublished");
    load();
  };

  const deleteTest = async (t: AdminTest) => {
    const ok = await confirm({
      title: `Delete "${t.title}" permanently?`,
      description:
        "This will permanently remove the test and all its questions and student attempts. This cannot be undone.",
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
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && computeStatus(t, now) !== statusFilter) return false;
    if (batchFilter !== "all") {
      const ids = t.cbt_allowed_batch_ids ?? [];
      if (batchFilter === "unrestricted") {
        if (ids.length > 0) return false;
      } else if (!ids.includes(batchFilter)) {
        return false;
      }
    }
    return true;
  });
  const { paged, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 15);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, batchFilter]);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {ConfirmDialog}
      <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-6 text-white flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black font-display">Tests Management</h1>
          <p className="text-white/90 text-sm mt-1">Create, edit and publish test papers</p>
        </div>
        <Link to="/admin/tests/new" className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-primary hover:bg-white/90">
          <Plus className="h-4 w-4" /> New test
        </Link>
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
        <select
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none max-w-[260px]"
          title="Filter by batch"
        >
          <option value="all">All batches</option>
          <option value="unrestricted">Unrestricted (no batch)</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Questions</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Duration</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{t.title}</td>
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
                        <Link to={`/admin/tests/${t.slug || t.id}`} className="rounded-md px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/10" title="Manage">
                          Manage
                        </Link>
                        <a href={`/tests/${t.slug || t.id}/take`} target="_blank" rel="noreferrer" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors" title="Preview">
                          <Eye className="h-3.5 w-3.5" />
                        </a>
                        <Link to={`/admin/tests/${t.slug || t.id}/edit`} className="rounded-md p-1.5 text-foreground hover:bg-muted transition-colors" title="Edit test">
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <Link to={`/admin/tests/${t.slug || t.id}/result`} className="rounded-md p-1.5 text-secondary hover:bg-secondary/10 transition-colors" title="Result sheet">
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                        </Link>
                        {!t.is_published ? (
                          <button onClick={() => togglePublish(t, true)} className="rounded-md p-1.5 text-secondary hover:bg-secondary/10">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button onClick={() => togglePublish(t, false)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={() => deleteTest(t)}
                            className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                            title="Delete test (super admin)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTestsPage;
