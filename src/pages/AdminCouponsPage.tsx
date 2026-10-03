import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

type Scope = "course" | "test_series" | "cart" | "boost";
const SCOPES: { key: Scope; label: string }[] = [
  { key: "course", label: "Courses" },
  { key: "test_series", label: "Test series" },
  { key: "cart", label: "E-store cart" },
  { key: "boost", label: "BOOST" },
];

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "flat";
  discount_value: number;
  max_discount_amount: number | null;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  per_user_limit: number;
  applicable_scope: Scope[];
  is_active: boolean;
  created_at: string;
};

type FormState = {
  id: string | null;
  code: string;
  description: string;
  discount_type: "percent" | "flat";
  discount_value: string;
  max_discount_amount: string;
  valid_from: string;
  valid_until: string;
  usage_limit: string;
  per_user_limit: string;
  applicable_scope: Scope[];
  is_active: boolean;
};

const EMPTY: FormState = {
  id: null,
  code: "",
  description: "",
  discount_type: "percent",
  discount_value: "",
  max_discount_amount: "",
  valid_from: "",
  valid_until: "",
  usage_limit: "",
  per_user_limit: "1",
  applicable_scope: SCOPES.map((s) => s.key),
  is_active: true,
};

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
const db = supabase as any;

const AdminCouponsPage = () => {
  const { isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [confirmed, setConfirmed] = useState<Record<string, number>>({});
  const [form, setForm] = useState<FormState | null>(null);

  const load = async () => {
    const [{ data: cs, error }, { data: reds }] = await Promise.all([
      db.from("coupons").select("*").order("created_at", { ascending: false }),
      db.from("coupon_redemptions").select("coupon_id").eq("status", "confirmed"),
    ]);
    if (error) toast.error(error.message);
    setCoupons((cs ?? []) as Coupon[]);
    const counts: Record<string, number> = {};
    (reds ?? []).forEach((r: { coupon_id: string }) => { counts[r.coupon_id] = (counts[r.coupon_id] ?? 0) + 1; });
    setConfirmed(counts);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const edit = (c: Coupon) =>
    setForm({
      id: c.id,
      code: c.code,
      description: c.description ?? "",
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      max_discount_amount: c.max_discount_amount == null ? "" : String(c.max_discount_amount),
      valid_from: toLocalInput(c.valid_from),
      valid_until: toLocalInput(c.valid_until),
      usage_limit: c.usage_limit == null ? "" : String(c.usage_limit),
      per_user_limit: String(c.per_user_limit),
      applicable_scope: c.applicable_scope,
      is_active: c.is_active,
    });

  const save = async () => {
    if (!form) return;
    const code = form.code.trim().toUpperCase();
    const value = Number(form.discount_value);
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return toast.error("Code must be 3-40 letters, digits, - or _");
    if (!(value > 0)) return toast.error("Enter a discount value greater than 0");
    if (form.discount_type === "percent" && value > 100) return toast.error("Percent discount cannot exceed 100");
    if (form.applicable_scope.length === 0) return toast.error("Select at least one applicable purchase type");
    const perUser = Number(form.per_user_limit);
    if (!(perUser >= 1)) return toast.error("Per-user limit must be at least 1");
    const from = fromLocalInput(form.valid_from);
    const until = fromLocalInput(form.valid_until);
    if (from && until && new Date(until) <= new Date(from)) return toast.error("'Valid until' must be after 'Valid from'");

    const payload = {
      code,
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: value,
      max_discount_amount: form.discount_type === "percent" ? numOrNull(form.max_discount_amount) : null,
      valid_from: from,
      valid_until: until,
      usage_limit: numOrNull(form.usage_limit),
      per_user_limit: perUser,
      applicable_scope: form.applicable_scope,
      is_active: form.is_active,
    };
    setSaving(true);
    const { error } = form.id
      ? await db.from("coupons").update(payload).eq("id", form.id)
      : await db.from("coupons").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.code === "23505" ? "That coupon code already exists" : error.message);
    toast.success(form.id ? "Coupon updated" : "Coupon created");
    setForm(null);
    void load();
  };

  const toggleActive = async (c: Coupon) => {
    const { error } = await db.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_active: !c.is_active } : x)));
  };

  const remove = async (c: Coupon) => {
    if (!window.confirm(`Delete coupon ${c.code}? Past redemption records for it will also be removed.`)) return;
    const { error } = await db.from("coupons").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Coupon deleted");
    void load();
  };

  const toggleScope = (s: Scope) =>
    setForm((f) =>
      f ? { ...f, applicable_scope: f.applicable_scope.includes(s) ? f.applicable_scope.filter((x) => x !== s) : [...f.applicable_scope, s] } : f,
    );

  const rows = useMemo(() => coupons, [coupons]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <div className="p-6 text-sm text-muted-foreground">Only super admins can manage coupons.</div>;
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#1C3F8E] p-6 text-white">
        <div>
          <div className="flex items-center gap-3">
            <Tag className="h-7 w-7" />
            <h1 className="font-display text-2xl font-black">Coupons</h1>
          </div>
          <p className="mt-1 text-sm text-white/90">Discount codes students can apply at checkout.</p>
        </div>
        <button
          onClick={() => setForm({ ...EMPTY })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#1C3F8E]"
        >
          <Plus className="h-4 w-4" /> New coupon
        </button>
      </div>

      {form && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">{form.id ? "Edit coupon" : "New coupon"}</h2>
            <button onClick={() => setForm(null)} aria-label="Close" className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-xs font-semibold text-muted-foreground">Code *
              <input className={`${inputClass} mt-1 uppercase`} value={form.code} maxLength={40} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">Description
              <input className={`${inputClass} mt-1`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">Discount type *
              <select className={`${inputClass} mt-1`} value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percent" | "flat" })}>
                <option value="percent">Percent off (%)</option>
                <option value="flat">Flat amount off (₹)</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">{form.discount_type === "percent" ? "Percent *" : "Amount (₹) *"}
              <input type="number" min="0" step="any" className={`${inputClass} mt-1`} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
            </label>
            {form.discount_type === "percent" && (
              <label className="text-xs font-semibold text-muted-foreground">Max discount (₹, optional)
                <input type="number" min="0" step="any" className={`${inputClass} mt-1`} value={form.max_discount_amount} onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })} />
              </label>
            )}
            <label className="text-xs font-semibold text-muted-foreground">Valid from
              <input type="datetime-local" className={`${inputClass} mt-1`} value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">Valid until
              <input type="datetime-local" className={`${inputClass} mt-1`} value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">Total usage limit (blank = unlimited)
              <input type="number" min="1" className={`${inputClass} mt-1`} value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">Uses per student *
              <input type="number" min="1" className={`${inputClass} mt-1`} value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })} />
            </label>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Applies to *</p>
            <div className="flex flex-wrap gap-4 text-sm">
              {SCOPES.map((s) => (
                <label key={s.key} className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={form.applicable_scope.includes(s.key)} onChange={() => toggleScope(s.key)} />
                  {s.label}
                </label>
              ))}
              <label className="inline-flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Active
              </label>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setForm(null)} disabled={saving} className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Applies to</th>
              <th className="px-4 py-3">Validity</th>
              <th className="px-4 py-3">Used</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No coupons yet.</td></tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-border align-top">
                <td className="px-4 py-3">
                  <div className="font-mono font-bold">{c.code}</div>
                  {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
                </td>
                <td className="px-4 py-3">
                  {c.discount_type === "percent" ? `${c.discount_value}%` : `₹${Number(c.discount_value).toLocaleString("en-IN")}`}
                  {c.discount_type === "percent" && c.max_discount_amount != null && (
                    <div className="text-xs text-muted-foreground">max ₹{Number(c.max_discount_amount).toLocaleString("en-IN")}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">{c.applicable_scope.map((s) => SCOPES.find((x) => x.key === s)?.label ?? s).join(", ")}</td>
                <td className="px-4 py-3 text-xs">
                  {c.valid_from ? new Date(c.valid_from).toLocaleString() : "Any time"}
                  <br />→ {c.valid_until ? new Date(c.valid_until).toLocaleString() : "No expiry"}
                </td>
                <td className="px-4 py-3">
                  {confirmed[c.id] ?? 0}{c.usage_limit != null ? ` / ${c.usage_limit}` : ""}
                  <div className="text-xs text-muted-foreground">{c.per_user_limit}/student</div>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(c)}
                    aria-label={c.is_active ? "Deactivate coupon" : "Activate coupon"}
                    className={`relative h-6 w-11 rounded-full transition-colors ${c.is_active ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${c.is_active ? "translate-x-5" : ""}`} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => edit(c)} aria-label="Edit" className="rounded p-1.5 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(c)} aria-label="Delete" className="rounded p-1.5 text-destructive hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCouponsPage;
