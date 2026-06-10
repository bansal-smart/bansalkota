import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = {
  id?: string;
  name: string;
  rank_label: string | null;
  quote: string;
  avatar_url: string | null;
  rating: number | null;
  region: string | null;
  sort_order: number;
  is_active: boolean;
};

const blank = (): Row => ({
  name: "",
  rank_label: "",
  quote: "",
  avatar_url: "",
  rating: 5,
  region: "",
  sort_order: 0,
  is_active: true,
});

const AdminTestimonialsPage = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("site_testimonials")
      .select("*")
      .order("sort_order");
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (idx: number, patch: Partial<Row>) => {
    setRows((cur) => cur.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const save = async (idx: number) => {
    const row = rows[idx];
    if (!row.name.trim() || !row.quote.trim()) {
      toast.error("Name and quote are required");
      return;
    }
    setSavingId(row.id ?? `new-${idx}`);
    const payload = { ...row, rating: row.rating ?? 5 };
    if (row.id) {
      const { error } = await supabase.from("site_testimonials").update(payload).eq("id", row.id);
      if (error) toast.error(error.message);
      else toast.success("Saved");
    } else {
      const { data, error } = await supabase.from("site_testimonials").insert(payload).select().single();
      if (error) toast.error(error.message);
      else {
        toast.success("Added");
        setRows((cur) => cur.map((r, i) => (i === idx ? (data as Row) : r)));
      }
    }
    setSavingId(null);
  };

  const remove = async (idx: number) => {
    const row = rows[idx];
    if (!confirm("Delete this testimonial?")) return;
    if (row.id) {
      const { error } = await supabase.from("site_testimonials").delete().eq("id", row.id);
      if (error) { toast.error(error.message); return; }
    }
    setRows((cur) => cur.filter((_, i) => i !== idx));
    toast.success("Deleted");
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black">Testimonials</h1>
          <p className="text-sm text-muted-foreground">Manage student quotes shown on the homepage</p>
        </div>
        <button
          onClick={() => setRows((cur) => [...cur, blank()])}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      <div className="space-y-4">
        {rows.map((r, i) => (
          <div key={r.id ?? `new-${i}`} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Name" value={r.name}
                onChange={(e) => update(i, { name: e.target.value })} />
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Rank label (e.g. AIR 47 — JEE 2024)"
                value={r.rank_label ?? ""} onChange={(e) => update(i, { rank_label: e.target.value })} />
            </div>
            <textarea className="w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]" placeholder="Quote"
              value={r.quote} onChange={(e) => update(i, { quote: e.target.value })} />
            <div className="grid sm:grid-cols-4 gap-3">
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Avatar URL"
                value={r.avatar_url ?? ""} onChange={(e) => update(i, { avatar_url: e.target.value })} />
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Region" value={r.region ?? ""}
                onChange={(e) => update(i, { region: e.target.value })} />
              <input type="number" className="rounded-lg border px-3 py-2 text-sm" placeholder="Sort order"
                value={r.sort_order} onChange={(e) => update(i, { sort_order: Number(e.target.value) })} />
              <button onClick={() => update(i, { is_active: !r.is_active })}
                className="inline-flex items-center gap-2 text-sm font-medium">
                {r.is_active ? <ToggleRight className="h-5 w-5 text-emerald-600" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                {r.is_active ? "Active" : "Hidden"}
              </button>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t">
              <button onClick={() => remove(i)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-destructive">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
              <button onClick={() => save(i)} disabled={savingId === (r.id ?? `new-${i}`)}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                {savingId === (r.id ?? `new-${i}`) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-center py-12 text-muted-foreground">No testimonials yet</div>}
      </div>
    </div>
  );
};

export default AdminTestimonialsPage;
