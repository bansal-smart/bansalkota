import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2, Pencil, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("site_testimonials")
      .select("*")
      .order("sort_order");
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startAdd = () => setEditing(blank());
  const startEdit = (r: Row) => setEditing({ ...r });

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.quote.trim()) {
      toast.error("Name and quote are required");
      return;
    }
    setSaving(true);
    const payload = { ...editing, rating: editing.rating ?? 5 };
    if (editing.id) {
      const { error } = await supabase
        .from("site_testimonials")
        .update(payload)
        .eq("id", editing.id);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("site_testimonials").insert(payload);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setEditing(null);
    toast.success("Saved");
    load();
  };

  const remove = async (r: Row) => {
    if (!r.id) return;
    if (!confirm("Delete this testimonial?")) return;
    const { error } = await supabase.from("site_testimonials").delete().eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    load();
  };

  if (loading)
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black">Testimonials</h1>
          <p className="text-sm text-muted-foreground">
            Manage student quotes shown on the homepage
          </p>
        </div>
        <button
          onClick={startAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Add testimonial
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row sm:items-start gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-base font-bold">{r.name}</span>
                {r.rank_label && (
                  <span className="rounded-full bg-bansal-orange/10 text-bansal-orange text-[11px] font-bold px-2 py-0.5">
                    {r.rank_label}
                  </span>
                )}
                {!r.is_active && (
                  <span className="rounded-full bg-muted text-muted-foreground text-[11px] font-semibold px-2 py-0.5">
                    Hidden
                  </span>
                )}
                {r.rating != null && (
                  <span className="inline-flex items-center gap-0.5 text-amber-500 text-xs">
                    {Array.from({ length: Math.max(0, Math.min(5, r.rating)) }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-current" />
                    ))}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2 italic">
                "{r.quote}"
              </p>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {r.region && <>Region: {r.region} · </>}Sort: {r.sort_order}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => startEdit(r)}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold hover:bg-muted"
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
              <button
                onClick={() => remove(r)}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No testimonials yet</div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit testimonial" : "Add testimonial"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold">Name</label>
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">
                    Rank label (e.g. AIR 47 — JEE 2024)
                  </label>
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={editing.rank_label ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, rank_label: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold">Quote</label>
                <textarea
                  className="w-full rounded-lg border px-3 py-2 text-sm min-h-[100px]"
                  value={editing.quote}
                  onChange={(e) => setEditing({ ...editing, quote: e.target.value })}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold">Avatar URL</label>
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={editing.avatar_url ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, avatar_url: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">Region</label>
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={editing.region ?? ""}
                    onChange={(e) => setEditing({ ...editing, region: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold">Rating (1–5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={editing.rating ?? 5}
                    onChange={(e) =>
                      setEditing({ ...editing, rating: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">Sort order</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={editing.sort_order}
                    onChange={(e) =>
                      setEditing({ ...editing, sort_order: Number(e.target.value) })
                    }
                  />
                </div>
                <label className="flex items-end gap-2 text-sm font-medium pb-2">
                  <input
                    type="checkbox"
                    checked={editing.is_active}
                    onChange={(e) =>
                      setEditing({ ...editing, is_active: e.target.checked })
                    }
                  />
                  Active
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <button
              onClick={() => setEditing(null)}
              className="rounded-lg border px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTestimonialsPage;
