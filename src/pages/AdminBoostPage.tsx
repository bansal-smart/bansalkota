import { useEffect, useMemo, useState } from "react";
import { Award, Loader2, Search, Download, Check, X as XIcon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { toast } from "sonner";
import BoostSettingsPanel from "@/components/admin/BoostSettingsPanel";
import BoostSyllabusPanel from "@/components/admin/BoostSyllabusPanel";
import { useAuth } from "@/context/AuthContext";
import TablePagination from "@/components/TablePagination";
import { INDIAN_STATES_AND_UTS } from "@/lib/indianStates";
import { useConfirm } from "@/components/ConfirmDialog";

const EXAM_MODE_OPTIONS = ["all", "Online", "Offline"] as const;

type Registration = {
  id: string;
  admit_card_number: string;
  full_name: string;
  email: string;
  phone: string;
  whatsapp: string | null;
  date_of_birth: string | null;
  class_level: string;
  target_exam: string;
  school_name: string | null;
  city: string | null;
  state: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  preferred_centre_label: string | null;
  exam_mode: string | null;
  exam_slot: string | null;
  amount: number;
  payment_status: "pending" | "paid" | "failed";
  payment_ref: string | null;
  status: "registered" | "confirmed" | "attended" | "cancelled";
  notes: string | null;
  created_at: string;
};

type Centre = { id: string; city: string; area: string | null };

const STATUS_OPTIONS = ["all", "registered", "confirmed", "attended", "cancelled"] as const;
const PAYMENT_OPTIONS = ["all", "pending", "paid", "failed"] as const;

const AdminBoostPage = () => {
  const { isCenterAdmin, isStaff } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [payFilter, setPayFilter] = useState<(typeof PAYMENT_OPTIONS)[number]>("all");
  const [centreFilter, setCentreFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [examModeFilter, setExamModeFilter] = useState<(typeof EXAM_MODE_OPTIONS)[number]>("all");
  const [examSlotFilter, setExamSlotFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [centres, setCentres] = useState<Centre[]>([]);
  const [filterValues, setFilterValues] = useState({ cities: [] as string[], classes: [] as string[], examSlots: [] as string[] });
  const [selected, setSelected] = useState<Registration | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const applyFilters = (query: any) => {
    if (debouncedQ.trim()) {
      const needle = debouncedQ.trim().replace(/[%(),]/g, " ");
      query = query.or(`full_name.ilike.%${needle}%,email.ilike.%${needle}%,phone.ilike.%${needle}%,admit_card_number.ilike.%${needle}%,city.ilike.%${needle}%`);
    }
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (payFilter !== "all") query = query.eq("payment_status", payFilter);
    if (centreFilter !== "all") query = query.eq("preferred_centre_id", centreFilter);
    if (cityFilter !== "all") query = query.eq("city", cityFilter);
    if (stateFilter !== "all") query = query.eq("state", stateFilter);
    if (classFilter !== "all") query = query.eq("class_level", classFilter);
    if (examModeFilter !== "all") query = query.eq("exam_mode", examModeFilter);
    if (examSlotFilter !== "all") query = query.eq("exam_slot", examSlotFilter);
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
    const [{ data, error, count }, { data: centreRows }, { data: optionRows }] = await Promise.all([
      applyFilters(supabase
      .from("boost_registrations")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1)),
      supabase.from("centres").select("id, city, area").order("city"),
      supabase.from("boost_registrations").select("city, class_level, exam_slot").limit(10000),
    ]);
    if (error) toast.error(error.message);
    else {
      setRows((data ?? []) as Registration[]);
      setTotal(count ?? 0);
    }
    setCentres((centreRows ?? []) as Centre[]);
    const options = (optionRows ?? []) as Array<{ city: string | null; class_level: string; exam_slot: string | null }>;
    setFilterValues({
      cities: Array.from(new Set(options.map((r) => r.city).filter(Boolean) as string[])).sort(),
      classes: Array.from(new Set(options.map((r) => r.class_level).filter(Boolean))).sort(),
      examSlots: Array.from(new Set(options.map((r) => r.exam_slot).filter(Boolean) as string[])).sort(),
    });
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, [debouncedQ, statusFilter, payFilter, centreFilter, cityFilter, stateFilter, classFilter, examModeFilter, examSlotFilter, fromDate, toDate, page, pageSize]);

  useEffect(() => { setPage(0); }, [debouncedQ, statusFilter, payFilter, centreFilter, cityFilter, stateFilter, classFilter, examModeFilter, examSlotFilter, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const filtered = rows;

  const stats = useMemo(() => {
    const total = rows.length;
    const paid = rows.filter((r) => r.payment_status === "paid").length;
    const confirmed = rows.filter((r) => r.status === "confirmed").length;
    const attended = rows.filter((r) => r.status === "attended").length;
    const revenue = rows.filter((r) => r.payment_status === "paid").reduce((s, r) => s + Number(r.amount || 0), 0);
    return { total, paid, confirmed, attended, revenue };
  }, [rows]);

  const update = async (id: string, patch: Partial<Registration>) => {
    const full: any = { ...patch };
    // When admin marks paid manually, also stamp paid_at + auto-confirm
    if (patch.payment_status === "paid") {
      full.paid_at = new Date().toISOString();
      const cur = rows.find((r) => r.id === id);
      if (cur && cur.status === "registered") full.status = "confirmed";
    }
    const { error } = await supabase.from("boost_registrations").update(full).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...full } : r)));
    if (selected?.id === id) setSelected({ ...selected, ...full } as Registration);
  };


  const deleteRegistration = async (r: Registration) => {
    const ok = await confirm({
      title: `Delete registration for "${r.full_name}"?`,
      description: "This permanently deletes this BOOST registration record. This cannot be undone.",
      confirmLabel: "Delete registration",
    });
    if (!ok) return;
    setDeletingId(r.id);
    const { error } = await supabase.from("boost_registrations").delete().eq("id", r.id);
    setDeletingId(null);
    if (error) return toast.error(error.message);
    toast.success("Registration deleted");
    setRows((rs) => rs.filter((row) => row.id !== r.id));
    setTotal((t) => Math.max(0, t - 1));
    if (selected?.id === r.id) setSelected(null);
  };

  const exportCsv = async () => {
    const exportRows: Registration[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await applyFilters(supabase
        .from("boost_registrations")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + 999));
      if (error) return toast.error(error.message);
      exportRows.push(...((data ?? []) as Registration[]));
      if (!data || data.length < 1000) break;
      from += 1000;
    }
    const headers = [
      "admit_card_number","full_name","email","phone","whatsapp","date_of_birth","class_level","target_exam",
      "school_name","city","state","parent_name","parent_phone","preferred_centre_label","exam_mode","exam_slot",
      "amount","payment_status","payment_ref","status","created_at",
    ];
    const csv = [headers.join(",")]
      .concat(
        exportRows.map((r) =>
          headers
            .map((h) => {
              const v = (r as any)[h];
              const s = v == null ? "" : String(v).replace(/"/g, '""');
              return `"${s}"`;
            })
            .join(","),
        ),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boost-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exportRows.length} registration${exportRows.length === 1 ? "" : "s"}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-bansal-orange" /> BOOST Registrations
          </h1>
          <p className="text-sm text-muted-foreground">Manage scholarship exam registrations and payments</p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"
        >
          <Download className="h-4 w-4" /> Export {total ? `(${total} filtered)` : "CSV"}
        </button>
      </div>

      {/* Exam dates/price and syllabus resources are global (not per-centre) —
          only HQ admins manage them; centre staff only work their own leads below. */}
      {!isCenterAdmin && (
        <>
          <BoostSettingsPanel />
          <BoostSyllabusPanel />
        </>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total", value: stats.total },
          { label: "Paid", value: stats.paid },
          { label: "Confirmed", value: stats.confirmed },
          { label: "Attended", value: stats.attended },
          { label: "Revenue", value: `₹${stats.revenue.toLocaleString("en-IN")}` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-bold text-foreground mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, phone, admit card…"
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
          value={payFilter}
          onChange={(e) => setPayFilter(e.target.value as any)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {PAYMENT_OPTIONS.map((o) => (
            <option key={o} value={o}>Payment: {o}</option>
          ))}
        </select>
        <select value={centreFilter} onChange={(e) => setCentreFilter(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="all">Centre: all</option>
          {centres.map((c) => <option key={c.id} value={c.id}>{c.city}{c.area && c.area !== c.city ? ` — ${c.area}` : ""}</option>)}
        </select>
        <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="all">City: all</option>
          {filterValues.cities.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="all">State: all</option>
          {INDIAN_STATES_AND_UTS.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="all">Class: all</option>
          {filterValues.classes.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select value={examModeFilter} onChange={(e) => setExamModeFilter(e.target.value as any)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          {EXAM_MODE_OPTIONS.map((o) => <option key={o} value={o}>Exam Mode: {o}</option>)}
        </select>
        <select value={examSlotFilter} onChange={(e) => setExamSlotFilter(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="all">Exam Slot: all</option>
          {filterValues.examSlots.map((value) => <option key={value} value={value}>{value}</option>)}
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

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase">
              <tr>
                <th className="text-left p-3">Admit Card</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Class · Exam</th>
                <th className="text-left p-3">Contact</th>
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
                  <td className="p-3 font-mono text-xs">{r.admit_card_number}</td>
                  <td className="p-3 font-semibold">{r.full_name}</td>
                  <td className="p-3">{r.class_level} · {r.target_exam}</td>
                  <td className="p-3 text-xs">{r.email}<br />{r.phone}</td>
                  <td className="p-3">{r.city ?? "—"}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        r.payment_status === "paid" ? "bg-green-100 text-green-700"
                        : r.payment_status === "failed" ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                      }`}>{r.payment_status}</span>
                      {r.payment_status !== "paid" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); update(r.id, { payment_status: "paid" }); }}
                          className="inline-flex items-center gap-1 rounded-md border border-green-600 text-green-700 px-2 py-0.5 text-[10px] font-semibold hover:bg-green-50"
                          title="Mark as paid (e.g. offline payment received)"
                        >
                          <Check className="h-3 w-3" /> Mark Paid
                        </button>
                      )}
                    </div>
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
          <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-full max-w-md bg-card shadow-2xl overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border bg-card">
              <h2 className="font-bold">Registration · {selected.admit_card_number}</h2>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-muted rounded"><XIcon className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-4 text-sm">
              <Field label="Name" value={selected.full_name} />
              <Field label="Email" value={selected.email} />
              <Field label="Phone" value={selected.phone} />
              {selected.whatsapp && <Field label="WhatsApp" value={selected.whatsapp} />}
              {selected.date_of_birth && <Field label="DOB" value={selected.date_of_birth} />}
              <Field label="Class" value={selected.class_level} />
              <Field label="Target Exam" value={selected.target_exam} />
              {selected.school_name && <Field label="School" value={selected.school_name} />}
              {selected.city && <Field label="City / State" value={`${selected.city}, ${selected.state ?? ""}`} />}
              {selected.parent_name && <Field label="Parent" value={`${selected.parent_name} · ${selected.parent_phone ?? ""}`} />}
              {selected.preferred_centre_label && <Field label="Centre" value={selected.preferred_centre_label} />}
              {selected.exam_mode && <Field label="Exam Mode" value={selected.exam_mode} />}
              {selected.exam_slot && <Field label="Slot" value={selected.exam_slot} />}
              <Field label="Amount" value={`₹${Number(selected.amount).toLocaleString("en-IN")}`} />
              {selected.payment_ref && <Field label="Payment ref" value={selected.payment_ref} />}

              <div className="pt-3 border-t border-border space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Payment status</label>
                <select
                  value={selected.payment_status}
                  onChange={(e) => update(selected.id, { payment_status: e.target.value as any })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="pending">pending</option>
                  <option value="paid">paid</option>
                  <option value="failed">failed</option>
                </select>

                <label className="text-xs font-semibold text-muted-foreground">Registration status</label>
                <select
                  value={selected.status}
                  onChange={(e) => update(selected.id, { status: e.target.value as any })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="registered">registered</option>
                  <option value="confirmed">confirmed</option>
                  <option value="attended">attended</option>
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

export default AdminBoostPage;
