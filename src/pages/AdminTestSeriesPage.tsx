import { useEffect, useState } from "react";
import { Trophy, Loader2, Plus, Trash2, Pencil, Eye, ImageIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { scopeQueryToCentre } from "@/lib/centreScope";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/TablePagination";

type TS = {
  id: string;
  slug: string;
  title: string;
  target_exam: string | null;
  total_tests: number;
  price: number;
  original_price: number | null;
  is_published: boolean;
  is_featured: boolean;
  thumbnail_url: string | null;
  centre_id: string | null;
  centre: { city: string; area: string | null; is_hq: boolean } | null;
};

const AdminTestSeriesPage = () => {
  const navigate = useNavigate();
  const { isCenterAdmin } = useAuth();
  const { primaryCenterId, loading: centreLoading } = useCenterAdmin();
  // The 2026-07-07 multi-centre backfill (multicentre_backfill_to_kota.sql)
  // gave every pre-existing test series a Kota centre_id, so a hardcoded
  // "centre_id IS NULL" filter here made them all permanently invisible to
  // admins even though they're still live on the public catalogue. Scope
  // like AdminBatchesPage: centre admins see their own centre (+ any truly
  // global rows), staff/super_admin see every centre for full oversight.
  const scopeCentreId = isCenterAdmin ? primaryCenterId : null;
  const [rows, setRows] = useState<TS[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await scopeQueryToCentre(
      supabase
        .from("test_series")
        .select(
          "id, slug, title, target_exam, total_tests, price, original_price, is_published, is_featured, thumbnail_url, centre_id, centre:centres(city, area, is_hq)"
        ),
      scopeCentreId,
      { globalFlagColumn: "is_global" }
    ).order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as TS[]);
    setLoading(false);
  };
  useEffect(() => {
    // Don't fire an unscoped first load before the centre is known.
    if (isCenterAdmin && centreLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCenterAdmin, centreLoading, scopeCentreId]);

  const remove = async (id: string) => {
    if (!confirm("Delete this test series? This cannot be undone.")) return;
    const { error } = await supabase.from("test_series").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  const togglePublish = async (r: TS) => {
    const { error } = await supabase.from("test_series").update({ is_published: !r.is_published }).eq("id", r.id);
    if (error) toast.error(error.message);
    else load();
  };

  const { paged, page, setPage, totalPages, total, pageSize, setPageSize } = usePagination(rows, 25);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="rounded-2xl bg-[#1C3F8E] p-6 text-white flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Trophy className="h-7 w-7" />
          <div>
            <h1 className="text-2xl font-black font-display">Test Series</h1>
            <p className="text-white/90 text-sm mt-1">Manage AIR test series products</p>
          </div>
        </div>
        <Link
          to="/admin/test-series/new"
          className="inline-flex items-center gap-2 rounded-lg bg-white text-primary px-4 py-2 text-sm font-bold shadow-sm hover:bg-white/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Test Series
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Cover</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Centre</th>
                  <th className="px-4 py-3">Exam</th>
                  <th className="px-4 py-3">Tests</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Featured</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="flex h-12 w-16 items-center justify-center overflow-hidden rounded border border-border bg-muted">
                        {r.thumbnail_url ? (
                          <img src={r.thumbnail_url} alt={r.title} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">{r.title}</td>
                    <td className="px-4 py-3">
                      {r.centre
                        ? r.centre.is_hq
                          ? "Kota HQ"
                          : `${r.centre.city}${r.centre.area && r.centre.area !== r.centre.city ? " — " + r.centre.area : ""}`
                        : <span className="text-muted-foreground">Global</span>}
                    </td>
                    <td className="px-4 py-3">{r.target_exam ?? "-"}</td>
                    <td className="px-4 py-3">{r.total_tests}</td>
                    <td className="px-4 py-3">
                      ₹{Number(r.price).toLocaleString()}
                      {r.original_price && Number(r.original_price) > Number(r.price) && (
                        <span className="ml-1 text-xs text-muted-foreground line-through">₹{Number(r.original_price).toLocaleString()}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => togglePublish(r)}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.is_published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}
                      >
                        {r.is_published ? "Published" : "Hidden"}
                      </button>
                    </td>
                    <td className="px-4 py-3">{r.is_featured ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <a href={`/test-series/${r.slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Preview">
                          <Eye className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => navigate(`/admin/test-series/${r.id}/edit`)}
                          className="rounded-lg border border-border bg-background p-1.5 text-primary hover:bg-primary/10"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove(r.id)}
                          className="rounded-lg border border-border bg-background p-1.5 text-destructive hover:bg-muted"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                      No test series yet. Click "New Test Series" to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTestSeriesPage;
