import { useEffect, useMemo, useState } from "react";
import { Award, Loader2, Search, Download, Check, X as XIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BoostSettingsPanel from "@/components/admin/BoostSettingsPanel";

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
  exam_slot: string | null;
  amount: number;
  payment_status: "pending" | "paid" | "failed";
  payment_ref: string | null;
  status: "registered" | "confirmed" | "attended" | "cancelled";
  notes: string | null;
  created_at: string;
};

const STATUS_OPTIONS = ["all", "registered", "confirmed", "attended", "cancelled"] as const;
const PAYMENT_OPTIONS = ["all", "pending", "paid", "failed"] as const;

const AdminBoostPage = () => {
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [payFilter, setPayFilter] = useState<(typeof PAYMENT_OPTIONS)[number]>("all");
  const [selected, setSelected] = useState<Registration | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("boost_registrations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Registration[]);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (payFilter !== "all" && r.payment_status !== payFilter) return false;
      if (!needle) return true;
      return (
        r.full_name.toLowerCase().includes(needle) ||
        r.email.toLowerCase().includes(needle) ||
        r.phone.includes(needle) ||
        (r.admit_card_number ?? "").toLowerCase().includes(needle) ||
        (r.city ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, statusFilter, payFilter]);

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


  const exportCsv = () => {
    const headers = [
      "admit_card_number","full_name","email","phone","whatsapp","date_of_birth","class_level","target_exam",
      "school_name","city","state","parent_name","parent_phone","preferred_centre_label","exam_slot",
      "amount","payment_status","payment_ref","status","created_at",
    ];
    const csv = [headers.join(",")]
      .concat(
        filtered.map((r) =>
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
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <BoostSettingsPanel />

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
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
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
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      r.payment_status === "paid" ? "bg-green-100 text-green-700"
                      : r.payment_status === "failed" ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                    }`}>{r.payment_status}</span>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex rounded-full bg-bansal-blue/10 text-bansal-blue px-2 py-0.5 text-[10px] font-bold">{r.status}</span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">No registrations match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md bg-card shadow-2xl overflow-y-auto">
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
