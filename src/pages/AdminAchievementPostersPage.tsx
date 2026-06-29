import { useEffect, useState } from "react";
import { Award, Loader2, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AspectRatioHint from "@/components/admin/AspectRatioHint";

type Poster = {
  id: string;
  image_url: string;
  caption: string;
  sort_order: number;
  is_active: boolean;
};

const emptyForm = { image_url: "", caption: "", sort_order: 0, is_active: true };

const AdminAchievementPostersPage = () => {
  const [posters, setPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Poster | null>(null);
  const [form, setForm] = useState<Omit<Poster, "id">>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("achievement_posters")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setPosters((data as Poster[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, sort_order: posters.length });
    setShowForm(true);
  };

  const openEdit = (p: Poster) => {
    setEditing(p);
    setForm({ image_url: p.image_url, caption: p.caption, sort_order: p.sort_order, is_active: p.is_active });
    setShowForm(true);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `achievement-posters/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("site-content").upload(path, file, { upsert: true });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("site-content").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl }));
    setUploading(false);
    toast.success("Image uploaded");
  };

  const save = async () => {
    if (!form.image_url) return toast.error("Please upload a poster image");
    if (!form.caption.trim()) return toast.error("Please add a caption");
    setSaving(true);
    const payload = { ...form, caption: form.caption.trim() };
    const { error } = editing
      ? await supabase.from("achievement_posters").update(payload).eq("id", editing.id)
      : await supabase.from("achievement_posters").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Poster updated" : "Poster added");
    setShowForm(false);
    load();
  };

  const remove = async (p: Poster) => {
    if (!confirm(`Delete poster "${p.caption}"?`)) return;
    const { error } = await supabase.from("achievement_posters").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Award className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-black">Achievement Posters</h1>
            <p className="text-sm text-muted-foreground">
              Upload result posters shown on the public Achievements page. Each card is just an image with a caption below it.
            </p>
          </div>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Poster
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : posters.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No posters yet. Click <span className="font-bold">Add Poster</span> to upload your first result image.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {posters.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
              <img src={p.image_url} alt={p.caption} className="w-full aspect-[3/4] object-cover bg-muted" />
              <div className="p-3 space-y-2">
                <p className="text-sm font-bold text-center">{p.caption}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Order: {p.sort_order}</span>
                  <span className={p.is_active ? "text-green-600 font-bold" : "text-muted-foreground"}>{p.is_active ? "Active" : "Hidden"}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => openEdit(p)} className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs font-bold hover:bg-muted">Edit</button>
                  <button onClick={() => remove(p)} className="rounded-lg border border-destructive/30 text-destructive px-2 py-1.5 text-xs font-bold hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold text-lg">{editing ? "Edit Poster" : "Add Poster"}</h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Poster image</label>
                <AspectRatioHint ratio="3:4 (portrait)" size="900×1200" note="achievement poster card" />
                <div className="mt-1 flex items-center gap-3">
                  {form.image_url ? (
                    <img src={form.image_url} alt="" className="h-32 w-24 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="h-32 w-24 rounded-lg border border-dashed border-border bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground text-center px-1">No image</div>
                  )}
                  <label className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold cursor-pointer hover:bg-muted">
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Caption (shown below image)</label>
                <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="e.g. JEE MAIN 2026 Result" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground">Sort order</label>
                  <input type="number" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
                <label className="flex items-end gap-2 text-sm pb-2">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                  Active (visible on site)
                </label>
              </div>
              <button onClick={save} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editing ? "Save changes" : "Add poster"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAchievementPostersPage;
