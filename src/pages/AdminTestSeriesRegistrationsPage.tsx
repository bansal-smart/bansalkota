import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, Search, Download, X as XIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import TablePagination, { TABLE_PAGE_SIZE_ALL } from "@/components/TablePagination";

type OrderInfo = { status: string; total: number | null; created_at: string } | null;

type Registration = {
  id: string;
  user_id: string;
  test_series_id: string;
  test_series_title: string;
  full_name: string;
  email: string;
  phone: string;
  class_level: string;
  target_exam: string | null;
  school_name: string | null;
  city: string | null;
  state: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  order_id: string | null;
  status: "registered" | "cancelled";
  notes: string | null;
  created_at: string;
  orders: OrderInfo;
};

type TestSeriesOption = { id: string; title: string };

const STATUS_OPTIONS = ["all", "registered", "cancelled"] as const;
const SELECT_COLUMNS =
  "id, user_id, test_series_id, test_series_title, full_name, email, phone, class_level, target_exam, school_name, city, state, parent_name, parent_phone, order_id, status, notes, created_at, orders:order_id(status, total, created_at)";

const AdminTestSeriesRegistrationsPage = () => {
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [seriesOptions, setSeriesOptions] = useState<TestSeriesOption[]>([]);
  const [selected, setSelected] = useState<Registration | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const applyFilters = (query: any) => {
    if (debouncedQ.trim()) {
      const needle = debouncedQ.trim().replace(/[%(),]/g, " ");
      query = query.or(
        `full_name.ilike.%${needle}%,email.ilike.%${needle}%,phone.ilike.%${needle}%,test_series_title.ilike.%${needle}%`,
      );
    }
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (seriesFilter !== "all") query = query.eq("test_series_id", seriesFilter);
    if (fromDate) query = query.gte("created_at", `${fromDate}T00:00:00`);
    if (toDate) {
      const end = new Date(`${toDate}T00:00:00`);
      end.setDate(end.getDate() + 1);
      query = query.lt("created_at", end.toISOString());
    }
    return query;
  };

  const load = async () => {
    setLoading(true);
    const { data: seriesRows } = await supabase.from("test_series").select("id, title").order("title");
    setSeriesOptions((seriesRows ?? []) as TestSeriesOption[]);

    if (pageSize === TABLE_PAGE_SIZE_ALL) {
      const all: Registration[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await applyFilters(
          supabase
            .from("test_series_registrations")
            .select(SELECT_COLUMNS)
            .order("created_at", { ascending: false })
            .range(from, from + 999),
        );
        if (error) {
          toast.error(error.message);
          break;
        }
        const chunk = (data ?? []) as unknown as Registration[];
        all.push(...chunk);
        if (chunk.length < 1000) break;
        from += 1000;
      }
      setRows(all);
      setTotal(all.length);
    } else {
      const { data, error, count } = await applyFilters(
        supabase
          .from("test_series_registrations")
          .select(SELECT_COLUMNS, { count: "exact" })
          .order("created_at", { ascending: false })
          .range((page - 1) * pageSize, (page - 1) * pageSize + pageSize - 1),
      );
      if (error) toast.error(error.message);
      else {
        setRows((data ?? []) as unknown as Registration[]);
        setTotal(count ?? 0);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, statusFilter, seriesFilter, fromDate, toDate, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, statusFilter, seriesFilter, fromDate, toDate]);

  const totalPages = pageSize === TABLE_PAGE_SIZE_ALL ? 1 : Math.max(1, Math.ceil(total / pageSize));

  const stats = useMemo(() => {
    const totalCount = rows.length;
    const withOrder = rows.filter((r) => r.orders).length;
    const paid = rows.filter((r) => r.orders?.status === "paid").length;
    const cancelled = rows.filter((r) => r.status === "cancelled").length;
    return { totalCount, withOrder, paid, cancelled };
  }, [rows]);

  const update = async (id: string, patch: Partial<Pick<Registration, "status" | "notes">>) => {
    const { error } = await supabase.from("test_series_registrations").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    if (selected?.id === id) setSelected({ ...selected, ...patch } as Registration);
  };

  const exportCsv = async () => {
    const exportRows: Registration[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await applyFilters(
        supabase
          .from("test_series_registrations")
          .select(SELECT_COLUMNS)
          .order("created_at", { ascending: false })
          .range(from, from + 999),
      );
      if (error) return toast.error(error.message);
      exportRows.push(...((data ?? []) as unknown as Registration[]));
      if (!data || data.length < 1000) break;
      from += 1000;
    }
    const headers = [
      "full_name", "email", "phone", "class_level", "target_exam", "test_series_title",
      "school_name", "city", "state", "parent_name", "parent_phone",
      "status", "payment_status", "order_total", "created_at",
    ];
    const csv = [headers.join(",")]
      .concat(
        exportRows.map((r) => {
          const flat: Record<string, unknown> = {
            ...r,
            payment_status: r.orders?.status ?? "no order",
            order_total: r.orders?.total ?? "",
          };
          return headers
            .map((h) => {
              const v = flat[h];
              const s = v == null ? "" : String(v).replace(/"/g, '""');
              return `"${s}"`;
            })
            .join(",");
        }),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-series-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exportRows.length} registration${exportRows.length === 1 ? "" : "s"}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-bansal-orange" /> Test Series Registrations
          </h1>
          <p className="text-sm text-muted-foreground">Leads captured before Test Series checkout</p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"
        >
          <Download className="h-4 w-4" /> Export {total ? `(${total} filtered)` : "CSV"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: stats.totalCount },
          { label: "With order", value: stats.withOrder },
          { label: "Paid", value: stats.paid },
          { label: "Cancelled", value: stats.cancelled },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-bold text-foreground mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, phone, test series…"
            className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o} value={o}>Status: {o}</option>
          ))}
        </select>
        <select
          value={seriesFilter}
          onChange={(e) => setSeriesFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Test series: all</option>
          {seriesOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
          From
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-transparent text-foreground outline-none" />
        </label>
        <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
          To
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-transparent text-foreground outline-none" />
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Class</th>
                <th className="text-left p-3">Contact</th>
                <th className="text-left p-3">Test Series</th>
                <th className="text-left p-3">City</th>
                <th className="text-left p-3">Payment</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="border-t border-border hover:bg-muted/40 cursor-pointer"
                >
                  <td className="p-3 font-semibold">{r.full_name}</td>
                  <td className="p-3">{r.class_level}</td>
                  <td className="p-3 text-xs">{r.email}<br />{r.phone}</td>
                  <td className="p-3">{r.test_series_title}</td>
                  <td className="p-3">{r.city ?? "—"}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        r.orders?.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : r.orders?.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : r.orders
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.orders?.status ?? "no order"}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex rounded-full bg-bansal-blue/10 text-bansal-blue px-2 py-0.5 text-[10px] font-bold">{r.status}</span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">No registrations match your filters.</td></tr>
              )}
            </tbody>
          </table>
          <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md bg-card shadow-2xl overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border bg-card">
              <h2 className="font-bold">{selected.full_name}</h2>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-muted rounded"><XIcon className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-4 text-sm">
              <Field label="Email" value={selected.email} />
              <Field label="Phone" value={selected.phone} />
              <Field label="Class" value={selected.class_level} />
              {selected.target_exam && <Field label="Target Exam" value={selected.target_exam} />}
              <Field label="Test Series" value={selected.test_series_title} />
              {selected.school_name && <Field label="School" value={selected.school_name} />}
              {selected.city && <Field label="City / State" value={`${selected.city}, ${selected.state ?? ""}`} />}
              {selected.parent_name && <Field label="Parent" value={`${selected.parent_name} · ${selected.parent_phone ?? ""}`} />}
              <Field label="Payment status" value={selected.orders?.status ?? "No order started"} />
              {selected.orders?.total != null && <Field label="Order total" value={`₹${Number(selected.orders.total).toLocaleString("en-IN")}`} />}

              <div className="pt-3 border-t border-border space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Registration status</label>
                <select
                  value={selected.status}
                  onChange={(e) => update(selected.id, { status: e.target.value as Registration["status"] })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="registered">registered</option>
                  <option value="cancelled">cancelled</option>
                </select>

                <label className="text-xs font-semibold text-muted-foreground">Notes</label>
                <textarea
                  defaultValue={selected.notes ?? ""}
                  onBlur={(e) => e.target.value !== (selected.notes ?? "") && update(selected.id, { notes: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[11px] uppercase text-muted-foreground font-semibold">{label}</div>
    <div className="text-foreground">{value}</div>
  </div>
);

export default AdminTestSeriesRegistrationsPage;
