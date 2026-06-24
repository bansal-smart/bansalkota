import { useEffect, useState } from "react";
import { Loader2, Upload, Trash2, ArrowUp, ArrowDown, Plus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = {
  id?: string;
  image_url: string;
  alt: string | null;
  link: string | null;
  sort_order: number;
  is_active: boolean;
  _dirty?: boolean;
  _new?: boolean;
};

const LandingHeroBannersEditor = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("landing_hero_banners" as any)
      .select("id, image_url, alt, link, sort_order, is_active")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setRows(((data ?? []) as any[]).map((r) => ({ ...r })) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (idx: number, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch, _dirty: true } : r)));
  };

  const uploadImage = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `landing-hero/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("site-content").upload(path, file, { upsert: true });
    if (error) {
      setUploadingIdx(null);
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("site-content").getPublicUrl(path);
    update(idx, { image_url: data.publicUrl });
    setUploadingIdx(null);
    toast.success("Image uploaded");
  };

  const addRow = () => {
    setRows((rs) => [
      ...rs,
      {
        image_url: "",
        alt: "",
        link: "",
        sort_order: rs.length ? Math.max(...rs.map((r) => r.sort_order)) + 1 : 0,
        is_active: true,
        _dirty: true,
        _new: true,
      },
    ]);
  };

  const saveRow = async (idx: number) => {
    const r = rows[idx];
    if (!r.image_url) return toast.error("Upload an image first");
    setSavingId(r.id ?? `new-${idx}`);
    const payload = {
      image_url: r.image_url,
      alt: r.alt || null,
      link: r.link || null,
      sort_order: r.sort_order,
      is_active: r.is_active,
    };
    if (r.id) {
      const { error } = await supabase.from("landing_hero_banners" as any).update(payload).eq("id", r.id);
      if (error) {
        setSavingId(null);
        return toast.error(error.message);
      }
    } else {
      const { data, error } = await supabase
        .from("landing_hero_banners" as any)
        .insert(payload)
        .select("id")
        .single();
      if (error) {
        setSavingId(null);
        return toast.error(error.message);
      }
      update(idx, { id: (data as any).id, _new: false });
    }
    setSavingId(null);
    setRows((rs) => rs.map((x, i) => (i === idx ? { ...x, _dirty: false, _new: false } : x)));
    toast.success("Saved");
  };

  const removeRow = async (idx: number) => {
    const r = rows[idx];
    if (!confirm("Delete this banner?")) return;
    if (r.id) {
      const { error } = await supabase.from("landing_hero_banners" as any).delete().eq("id", r.id);
      if (error) return toast.error(error.message);
    }
    setRows((rs) => rs.filter((_, i) => i !== idx));
    toast.success("Removed");
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= rows.length) return;
    const a = rows[idx];
    const b = rows[j];
    const next = [...rows];
    next[idx] = { ...b, sort_order: a.sort_order };
    next[j] = { ...a, sort_order: b.sort_order };
    setRows(next);
    // Persist both
    if (a.id) await supabase.from("landing_hero_banners" as any).update({ sort_order: b.sort_order }).eq("id", a.id);
    if (b.id) await supabase.from("landing_hero_banners" as any).update({ sort_order: a.sort_order }).eq("id", b.id);
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold">Landing hero banners</h2>
          <p className="text-xs text-muted-foreground">
            These images rotate in the home page hero carousel. Drag order with the arrows. Toggle Active to hide a
            banner without deleting it.
          </p>
        </div>
        <button
          onClick={addRow}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> Add banner
        </button>
      </div>

      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No banners yet. Click "Add banner" to upload the first one.
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={r.id ?? `new-${i}`} className="rounded-xl border border-border bg-background p-3 grid gap-3 md:grid-cols-[180px_1fr_auto] items-start">
            <div>
              {r.image_url ? (
                <img src={r.image_url} alt="" className="h-24 w-44 rounded-lg object-cover border border-border" />
              ) : (
                <div className="h-24 w-44 rounded-lg border border-dashed border-border bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">
                  No image
                </div>
              )}
              <label className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-bold cursor-pointer hover:bg-muted">
                {uploadingIdx === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadImage(i, e.target.files[0])}
                />
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
                placeholder="Alt text (for accessibility)"
                value={r.alt ?? ""}
                onChange={(e) => update(i, { alt: e.target.value })}
              />
              <input
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
                placeholder="Link URL (optional, e.g. /admissions)"
                value={r.link ?? ""}
                onChange={(e) => update(i, { link: e.target.value })}
              />
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={r.is_active}
                  onChange={(e) => update(i, { is_active: e.target.checked })}
                />
                Active
              </label>
              <div className="text-xs text-muted-foreground">Sort: {r.sort_order}</div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex gap-1">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-30"
                  title="Move up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                  className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-30"
                  title="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                onClick={() => saveRow(i)}
                disabled={!r._dirty || savingId !== null}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {savingId === (r.id ?? `new-${i}`) ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                Save
              </button>
              <button
                onClick={() => removeRow(i)}
                className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 text-destructive px-2.5 py-1.5 text-xs font-bold hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LandingHeroBannersEditor;
