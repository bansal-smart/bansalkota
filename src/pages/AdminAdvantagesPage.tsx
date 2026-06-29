import { useEffect, useState } from "react";
import { ImageIcon, Loader2, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AspectRatioHint from "@/components/admin/AspectRatioHint";

type Advantage = {
  id: string;
  title: string | null;
  image_url: string;
  alt_text: string | null;
  link_url: string;
  sort_order: number;
  is_active: boolean;
};

const emptyForm = { title: "", image_url: "", alt_text: "", link_url: "#lead-form", sort_order: 0, is_active: true };

const AdminAdvantagesPage = () => {
  const [items, setItems] = useState<Advantage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Advantage | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("landing_advantages" as any) as any)
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setItems((data as Advantage[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, sort_order: items.length }); setShowForm(true); };
  const openEdit = (p: Advantage) => {
    setEditing(p);
    setForm({
      title: p.title ?? "",
      image_url: p.image_url,
      alt_text: p.alt_text ?? "",
      link_url: p.link_url ?? "",
      sort_order: p.sort_order,
      is_active: p.is_active,
    });
    setShowForm(true);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `landing-advantages/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("site-content").upload(path, file, { upsert: true });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("site-content").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl }));
    setUploading(false);
    toast.success("Image uploaded");
  };

  const save = async () => {
    if (!form.image_url) return toast.error("Please upload an image");
    if (!form.link_url.trim()) return toast.error("Please enter a link URL");
    setSaving(true);
    const payload = {
      title: form.title.trim() || null,
      image_url: form.image_url,
      alt_text: form.alt_text.trim() || null,
      link_url: form.link_url.trim(),
      sort_order: form.sort_order,
      is_active: form.is_active,
    };
    const { error } = editing
      ? await (supabase.from("landing_advantages" as any) as any).update(payload).eq("id", editing.id)
      : await (supabase.from("landing_advantages" as any) as any).insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Updated" : "Added");
    setShowForm(false);
    void load();
  };

  const remove = async (p: Advantage) => {
    if (!confirm(`Delete this advantage tile?`)) return;
    const { error } = await (supabase.from("landing_advantages" as any) as any).delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    void load();
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <ImageIcon className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-black">Built-In Advantages</h1>
            <p className="text-sm text-muted-foreground">
              Manage the two image tiles in the "Built-In Advantages" section on the homepage. Use <code>#lead-form</code> to link to the homepage enquiry form.
            </p>
          </div>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Tile
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No tiles yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
              <img src={p.image_url} alt={p.alt_text ?? ""} className="w-full aspect-square object-cover bg-muted" />
              <div className="p-3 space-y-2">
                <p className="text-sm font-bold">{p.title || "(no title)"}</p>
                <p className="text-xs text-muted-foreground truncate">→ {p.link_url}</p>
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
              <h2 className="font-bold text-lg">{editing ? "Edit Tile" : "Add Tile"}</h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Tile image</label>
                <AspectRatioHint ratio="1:1 (square)" size="1024×1024" note="rendered as a square tile on the homepage" />
                <div className="mt-1 flex items-center gap-3">
                  {form.image_url ? (
                    <img src={form.image_url} alt="" className="h-24 w-40 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="h-24 w-40 rounded-lg border border-dashed border-border bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground">No image</div>
                  )}
                  <label className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold cursor-pointer hover:bg-muted">
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Title (internal)</label>
                <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="e.g. Personal Mentorship" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Alt text (accessibility)</label>
                <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={form.alt_text} onChange={(e) => setForm({ ...form, alt_text: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Link URL</label>
                <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="#lead-form or /dashboard or https://…" value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
                <p className="mt-1 text-[11px] text-muted-foreground">Use <code>#lead-form</code> to scroll to the homepage enquiry form.</p>
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
                {editing ? "Save changes" : "Add tile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAdvantagesPage;
