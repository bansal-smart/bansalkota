import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, Search, Download, X as XIcon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import TablePagination, { TABLE_PAGE_SIZE_ALL } from "@/components/TablePagination";
import { csvField, excelTextField, formatDateTimeIST, downloadCsv } from "@/lib/csvExport";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAuth } from "@/context/AuthContext";

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
  source?: "registration" | "order" | "enquiry";
};

type TestSeriesOption = { id: string; title: string };

const STATUS_OPTIONS = ["all", "registered", "cancelled"] as const;
const SELECT_COLUMNS =
  "id, user_id, test_series_id, test_series_title, full_name, email, phone, class_level, target_exam, school_name, city, state, parent_name, parent_phone, order_id, status, notes, created_at, orders:order_id(status, total, created_at)";

const AdminTestSeriesRegistrationsPage = () => {
  const { isStaff } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [allRawRows, setAllRawRows] = useState<Registration[]>([]);
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

  const load = async () => {
    setLoading(true);
    try {
      // 1. Load test series options for the filter dropdown
      const { data: seriesRows } = await supabase.from("test_series").select("id, title").order("title");
      const seriesList = (seriesRows ?? []) as TestSeriesOption[];
      setSeriesOptions(seriesList);
      const seriesTitlesLower = new Set(seriesList.map((s) => s.title.toLowerCase()));

      const combined: Registration[] = [];
      const knownOrderIds = new Set<string>();
      const knownKeys = new Set<string>();

      // 2. Fetch from test_series_registrations table
      const { data: regData, error: regError } = await supabase
        .from("test_series_registrations")
        .select(SELECT_COLUMNS)
        .order("created_at", { ascending: false });

      if (regError) {
        console.warn("Notice: test_series_registrations fetch:", regError.message);
      } else if (regData) {
        for (const r of regData as unknown as any[]) {
          // The join returns orders.amount (first orders table) — remap to .total
          // so the rest of the UI uses a consistent OrderInfo shape.
          const ordersNorm = r.orders
            ? { status: r.orders.status, total: r.orders.total ?? null, created_at: r.orders.created_at }
            : null;
          combined.push({ ...r, orders: ordersNorm, source: "registration" });
          if (r.order_id) knownOrderIds.add(r.order_id);
          if (r.email && r.test_series_title) {
            knownKeys.add(`${r.email.toLowerCase()}::${r.test_series_title.toLowerCase()}`);
          }
        }
      }

      // 3. Fetch test series purchases from order_items via SECURITY DEFINER RPC
      //    (joins order_items → orders → auth.users → profiles server-side
      //    so we can read email from auth.users which is inaccessible to the client)
      const { data: orderRows, error: oiError } = await supabase
        .rpc("admin_get_test_series_order_registrations");

      if (oiError) {
        console.warn("Notice: admin_get_test_series_order_registrations:", oiError.message);
      } else if (orderRows && orderRows.length > 0) {
        for (const row of orderRows as any[]) {
          if (knownOrderIds.has(row.order_id)) continue;

          const email = row.email || "";
          const title = row.item_title || "Test Series";
          const dedupeKey = email ? `${email.toLowerCase()}::${title.toLowerCase()}` : null;
          if (dedupeKey && knownKeys.has(dedupeKey)) continue;

          const matchingSeries = seriesList.find(
            (s) => s.id === row.item_id || s.title.toLowerCase() === title.toLowerCase()
          );

          const resolvedName =
            row.full_name ||
            row.shipping_name ||
            (row.phone ? row.phone : "Unknown Student");

          combined.push({
            id: `order-item-${row.order_item_id}`,
            user_id: row.user_id || "",
            test_series_id: matchingSeries ? matchingSeries.id : row.item_id || "",
            test_series_title: matchingSeries ? matchingSeries.title : title,
            full_name: resolvedName,
            email: email,
            phone: row.phone || "",
            class_level: row.class_level || "—",
            target_exam: row.target_exam || null,
            school_name: null,
            city: row.city || row.shipping_city || null,
            state: row.state || row.shipping_state || null,
            parent_name: row.father_name || null,
            parent_phone: row.parent_phone || null,
            order_id: row.order_id,
            status: row.order_status === "cancelled" ? "cancelled" : "registered",
            notes: null,
            created_at: row.order_created_at || row.oi_created_at,
            orders: {
              status: row.order_status,
              total: row.order_total ?? row.unit_price ?? null,
              created_at: row.order_created_at || row.oi_created_at,
            },
            source: "order",
          });

          knownOrderIds.add(row.order_id);
          if (dedupeKey) knownKeys.add(dedupeKey);
        }
      }

      // 4. Fetch test series leads from course_enquiries (enquiries submitted on test series)
      const { data: enquiries, error: enqError } = await supabase
        .from("course_enquiries")
        .select("*")
        .order("created_at", { ascending: false });

      if (enqError) {
        console.warn("Notice: course_enquiries fetch:", enqError.message);
      } else if (enquiries && enquiries.length > 0) {
        const tsEnquiries = enquiries.filter((e: any) => {
          const name = (e.course_name || "").toLowerCase();
          return name.includes("test series") || name.includes("test-series") || seriesTitlesLower.has(name);
        });

        for (const e of tsEnquiries) {
          if (e.payment_order_id && knownOrderIds.has(e.payment_order_id)) continue;
          const dedupeKey = e.email && e.course_name ? `${e.email.toLowerCase()}::${e.course_name.toLowerCase()}` : null;
          if (dedupeKey && knownKeys.has(dedupeKey)) continue;

          const matchingSeries = seriesList.find(
            (s) => s.id === e.course_id || s.title.toLowerCase() === (e.course_name || "").toLowerCase()
          );

          combined.push({
            id: `enquiry-${e.id}`,
            user_id: e.user_id || "",
            test_series_id: matchingSeries ? matchingSeries.id : e.course_id || "",
            test_series_title: matchingSeries ? matchingSeries.title : e.course_name,
            full_name: e.full_name || "Lead",
            email: e.email || "",
            phone: e.phone || "",
            class_level: e.class_level || "-",
            target_exam: null,
            school_name: null,
            city: e.city || null,
            state: e.state || null,
            parent_name: null,
            parent_phone: e.parent_phone || null,
            order_id: e.payment_order_id || null,
            status: e.status === "closed" ? "cancelled" : "registered",
            notes: e.admin_notes || e.message || null,
            created_at: e.created_at,
            orders: e.payment_status
              ? {
                  status: e.payment_status,
                  total: e.course_price,
                  created_at: e.paid_at || e.created_at,
                }
              : null,
            source: "enquiry",
          });

          if (e.payment_order_id) knownOrderIds.add(e.payment_order_id);
          if (dedupeKey) knownKeys.add(dedupeKey);
        }
      }

      // Sort all combined entries by created_at desc
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAllRawRows(combined);
    } catch (err: any) {
      toast.error(err.message || "Failed to load registrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, statusFilter, seriesFilter, fromDate, toDate]);

  const filteredRows = useMemo(() => {
    let result = allRawRows;
    const needle = debouncedQ.trim().toLowerCase();

    if (needle) {
      result = result.filter(
        (r) =>
          r.full_name.toLowerCase().includes(needle) ||
          r.email.toLowerCase().includes(needle) ||
          r.phone.includes(needle) ||
          r.test_series_title.toLowerCase().includes(needle) ||
          (r.city && r.city.toLowerCase().includes(needle))
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }

    if (seriesFilter !== "all") {
      result = result.filter((r) => r.test_series_id === seriesFilter || r.test_series_title === seriesFilter);
    }

    if (fromDate) {
      const fromMs = new Date(`${fromDate}T00:00:00`).getTime();
      result = result.filter((r) => new Date(r.created_at).getTime() >= fromMs);
    }

    if (toDate) {
      const toEndMs = new Date(`${toDate}T23:59:59.999`).getTime();
      result = result.filter((r) => new Date(r.created_at).getTime() <= toEndMs);
    }

    return result;
  }, [allRawRows, debouncedQ, statusFilter, seriesFilter, fromDate, toDate]);

  const stats = useMemo(() => {
    const totalCount = filteredRows.length;
    const withOrder = filteredRows.filter((r) => r.orders).length;
    const paid = filteredRows.filter((r) => r.orders?.status === "paid").length;
    const cancelled = filteredRows.filter((r) => r.status === "cancelled").length;
    return { totalCount, withOrder, paid, cancelled };
  }, [filteredRows]);

  const total = filteredRows.length;
  const totalPages = pageSize === TABLE_PAGE_SIZE_ALL ? 1 : Math.max(1, Math.ceil(total / pageSize));

  const rows = useMemo(() => {
    if (pageSize === TABLE_PAGE_SIZE_ALL) return filteredRows;
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const update = async (id: string, patch: Partial<Pick<Registration, "status" | "notes">>) => {
    if (id.startsWith("enquiry-")) {
      const enqId = id.replace("enquiry-", "");
      const enqPatch: any = {};
      if (patch.notes !== undefined) enqPatch.admin_notes = patch.notes;
      if (patch.status !== undefined) enqPatch.status = patch.status === "cancelled" ? "closed" : "converted";
      const { error } = await supabase.from("course_enquiries").update(enqPatch).eq("id", enqId);
      if (error) return toast.error(error.message);
    } else if (id.startsWith("order-item-")) {
      toast.info("Status updated in view.");
    } else {
      const { error } = await supabase.from("test_series_registrations").update(patch).eq("id", id);
      if (error) return toast.error(error.message);
    }
    toast.success("Updated");
    setAllRawRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    if (selected?.id === id) setSelected({ ...selected, ...patch } as Registration);
  };

  const deleteRegistration = async (r: Registration) => {
    const ok = await confirm({
      title: `Delete registration for "${r.full_name}"?`,
      description: "This permanently deletes this Test Series registration record. This cannot be undone.",
      confirmLabel: "Delete registration",
    });
    if (!ok) return;
    setDeletingId(r.id);

    let error: any = null;
    if (r.id.startsWith("enquiry-")) {
      const res = await supabase.from("course_enquiries").delete().eq("id", r.id.replace("enquiry-", ""));
      error = res.error;
    } else if (r.id.startsWith("order-item-")) {
      toast.error("This registration is tied to a completed order. Manage it under Commerce > E-Store Orders.");
      setDeletingId(null);
      return;
    } else {
      const res = await supabase.from("test_series_registrations").delete().eq("id", r.id);
      error = res.error;
    }

    setDeletingId(null);
    if (error) return toast.error(error.message);
    toast.success("Registration deleted");
    setAllRawRows((rs) => rs.filter((row) => row.id !== r.id));
    if (selected?.id === r.id) setSelected(null);
  };

  const exportCsv = () => {
    const headers = [
      "full_name", "email", "phone", "class_level", "target_exam", "test_series_title",
      "school_name", "city", "state", "parent_name", "parent_phone",
      "status", "payment_status", "order_total", "created_at",
    ];
    const exportData = filteredRows.map((r) => [
      csvField(r.full_name),
      csvField(r.email),
      excelTextField(r.phone),
      csvField(r.class_level),
      csvField(r.target_exam),
      csvField(r.test_series_title),
      csvField(r.school_name),
      csvField(r.city),
      csvField(r.state),
      csvField(r.parent_name),
      excelTextField(r.parent_phone),
      csvField(r.status),
      csvField(r.orders?.status ?? "no order"),
      csvField(r.orders?.total ?? ""),
      excelTextField(formatDateTimeIST(r.created_at)),
    ]);
    downloadCsv(`test-series-registrations-${new Date().toISOString().slice(0, 10)}.csv`, headers, exportData);
    toast.success(`Exported ${filteredRows.length} registration${filteredRows.length === 1 ? "" : "s"}`);
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
                {isStaff && <th className="text-left p-3 w-10">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="border-t border-border hover:bg-muted/40 cursor-pointer"
                >
                  <td className="p-3">
                    <div className="font-semibold">{r.full_name}</div>
                    {r.phone && <div className="text-xs text-muted-foreground mt-0.5">{r.phone}</div>}
                    <span className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                      r.source === "order"
                        ? "bg-blue-100 text-blue-700"
                        : r.source === "enquiry"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-green-100 text-green-700"
                    }`}>{r.source ?? "reg"}</span>
                  </td>
                  <td className="p-3">{r.class_level}</td>
                  <td className="p-3 text-xs">{r.email || "—"}<br />{r.phone || "—"}</td>
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
                  {isStaff && (
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => deleteRegistration(r)}
                        disabled={deletingId === r.id}
                        title="Delete registration"
                        className="rounded-md p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        {deletingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={isStaff ? 9 : 8} className="p-10 text-center text-muted-foreground">No registrations match your filters.</td></tr>
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
              <div>
                <h2 className="font-bold">{selected.full_name}</h2>
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  selected.source === "order"
                    ? "bg-blue-100 text-blue-700"
                    : selected.source === "enquiry"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-green-100 text-green-700"
                }`}>
                  {selected.source === "order" ? "Store order" : selected.source === "enquiry" ? "Enquiry lead" : "Registration"}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-muted rounded"><XIcon className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              {/* Student Details */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wide mb-1">Student Info</div>
                <Field label="Full Name" value={selected.full_name || "—"} />
                <Field label="Email" value={selected.email || "—"} />
                <Field label="Phone" value={selected.phone || "—"} />
                <Field label="Class / Level" value={selected.class_level || "—"} />
                <Field label="Target Exam" value={selected.target_exam || "—"} />
                <Field label="School" value={selected.school_name || "—"} />
              </div>

              {/* Location */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wide mb-1">Location</div>
                <Field label="City" value={selected.city || "—"} />
                <Field label="State" value={selected.state || "—"} />
              </div>

              {/* Parent Details */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wide mb-1">Parent Info</div>
                <Field label="Parent Name" value={selected.parent_name || "—"} />
                <Field label="Parent Phone" value={selected.parent_phone || "—"} />
              </div>

              {/* Test Series & Payment */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wide mb-1">Test Series & Payment</div>
                <Field label="Test Series" value={selected.test_series_title} />
                <Field label="Payment Status" value={selected.orders?.status ?? "No order started"} />
                <Field label="Order Total" value={selected.orders?.total != null ? `₹${Number(selected.orders.total).toLocaleString("en-IN")}` : "—"} />
              </div>

              {/* Actions */}
              <div className="pt-1 space-y-2">
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
      {ConfirmDialog}
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
