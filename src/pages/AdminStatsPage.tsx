import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = {
  id?: string;
  key: string;
  label: string;
  value: string;
  suffix: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
};

const ICONS = ["Trophy", "GraduationCap", "Star", "ShieldCheck", "Award", "Sparkles", "Target", "BookOpen", "Users"];

const blank = (): Row => ({ key: "", label: "", value: "", suffix: "", icon: "Trophy", sort_order: 0, is_active: true });

const AdminStatsPage = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("site_stats").select("*").order("sort_order");
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = (i: number, patch: Partial<Row>) =>
    setRows((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const save = async (i: number) => {
    const r = rows[i];
    if (!r.key.trim() || !r.label.trim() || !r.value.trim()) { toast.error("Key, label and value are required"); return; }
    setSavingId(r.id ?? `new-${i}`);
    if (r.id) {
      const { error } = await supabase.from("site_stats").update(r).eq("id", r.id);
      if (error) toast.error(error.message); else toast.success("Saved");
    } else {
      const { data, error } = await supabase.from("site_stats").insert(r).select().single();
      if (error) toast.error(error.message);
      else { toast.success("Added"); setRows((cur) => cur.map((x, idx) => (idx === i ? (data as Row) : x))); }
    }
    setSavingId(null);
  };

  const remove = async (i: number) => {
    const r = rows[i];
    if (!confirm("Delete this stat?")) return;
    if (r.id) {
      const { error } = await supabase.from("site_stats").delete().eq("id", r.id);
      if (error) { toast.error(error.message); return; }
    }
    setRows((cur) => cur.filter((_, idx) => idx !== i));
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black">Homepage Stats</h1>
          <p className="text-sm text-muted-foreground">Counter strip shown on the landing page</p>
        </div>
        <button onClick={() => setRows((cur) => [...cur, blank()])}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={r.id ?? `new-${i}`} className="rounded-xl border bg-card p-4 grid sm:grid-cols-7 gap-2 items-end">
            <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Key" value={r.key}
              onChange={(e) => update(i, { key: e.target.value })} />
            <input className="rounded-lg border px-3 py-2 text-sm sm:col-span-2" placeholder="Label" value={r.label}
              onChange={(e) => update(i, { label: e.target.value })} />
            <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Value" value={r.value}
              onChange={(e) => update(i, { value: e.target.value })} />
            <select className="rounded-lg border px-3 py-2 text-sm" value={r.icon ?? "Trophy"}
              onChange={(e) => update(i, { icon: e.target.value })}>
              {ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
            </select>
            <input type="number" className="rounded-lg border px-3 py-2 text-sm" placeholder="Order"
              value={r.sort_order} onChange={(e) => update(i, { sort_order: Number(e.target.value) })} />
            <div className="flex gap-1 justify-end">
              <button onClick={() => update(i, { is_active: !r.is_active })}>
                {r.is_active ? <ToggleRight className="h-5 w-5 text-emerald-600" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
              </button>
              <button onClick={() => save(i)} className="rounded-lg bg-primary p-2 text-primary-foreground" disabled={savingId === (r.id ?? `new-${i}`)}>
                {savingId === (r.id ?? `new-${i}`) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </button>
              <button onClick={() => remove(i)} className="rounded-lg border p-2 text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-center py-12 text-muted-foreground">No stats yet</div>}
      </div>
    </div>
  );
};

export default AdminStatsPage;
