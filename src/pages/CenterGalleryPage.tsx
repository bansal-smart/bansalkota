import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { toast } from "sonner";
import AspectRatioHint from "@/components/admin/AspectRatioHint";

type GalleryKind = "achievement" | "event" | "activity" | "other";

type GalleryRow = {
  id: string;
  centre_id: string;
  image_url: string;
  caption: string | null;
  kind: GalleryKind;
  sort_order: number;
  is_published: boolean;
};

const blank = (centerId: string): Partial<GalleryRow> => ({
  centre_id: centerId,
  image_url: "",
  caption: "",
  kind: "achievement",
  sort_order: 0,
  is_published: true,
});

const CenterGalleryPage = () => {
  const { primaryCenterId } = useCenterAdmin();
  const [items, setItems] = useState<GalleryRow[]>([]);
  const [editing, setEditing] = useState<Partial<GalleryRow> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!primaryCenterId) return;
    const { data } = await (supabase as any)
      .from("centre_gallery")
      .select("*")
      .eq("centre_id", primaryCenterId)
      .order("sort_order");
    setItems((data ?? []) as GalleryRow[]);
  };

  useEffect(() => {
    load();
  }, [primaryCenterId]);

  if (!primaryCenterId) return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `centers/${primaryCenterId}/gallery-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-content").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("site-content").getPublicUrl(path);
    setEditing((e) => ({ ...(e ?? {}), image_url: data.publicUrl }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!editing?.image_url) return toast.error("Image is required");
    setSaving(true);
    const payload = { ...editing, centre_id: primaryCenterId };
    const { error } = editing.id
      ? await (supabase as any).from("centre_gallery").update(payload).eq("id", editing.id)
      : await (supabase as any).from("centre_gallery").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this photo?")) return;
    await (supabase as any).from("centre_gallery").delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black font-display text-foreground flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" /> Centre Gallery
          </h1>
          <p className="text-sm text-muted-foreground">
            Showcase your centre's achievements and events on the public page.
          </p>
        </div>
        <button
          onClick={() => setEditing(blank(primaryCenterId))}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add Photo
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((g) => (
          <div key={g.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <img src={g.image_url} alt={g.caption ?? ""} className="h-36 w-full object-cover" />
            <div className="p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground line-clamp-2">{g.caption || "No caption"}</p>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold uppercase">
                  {g.kind}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${g.is_published ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>
                  {g.is_published ? "Live" : "Hidden"}
                </span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(g)} className="flex-1 rounded-md border border-border px-2 py-1 text-[11px]">Edit</button>
                <button onClick={() => handleDelete(g.id)} className="rounded-md border border-destructive/40 text-destructive px-2 py-1 text-[11px]">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {!items.length && <p className="text-sm text-muted-foreground col-span-full">No photos yet. Add your first one.</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-xl bg-card p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground">{editing.id ? "Edit" : "Add"} gallery photo</h2>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Photo</label>
              {editing.image_url && <img src={editing.image_url} alt="" className="h-32 w-full object-cover rounded-md" />}
              <label className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs cursor-pointer">
                <Upload className="h-3 w-3" /> {uploading ? "Uploading…" : "Upload image"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              </label>
            </div>
            <input value={editing.caption ?? ""} onChange={(e) => setEditing({ ...editing, caption: e.target.value })} placeholder="Caption (optional)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={editing.kind ?? "achievement"} onChange={(e) => setEditing({ ...editing, kind: e.target.value as GalleryKind })} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="achievement">Achievement</option>
                <option value="event">Event</option>
                <option value="activity">Activity</option>
                <option value="other">Other</option>
              </select>
              <input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} placeholder="Sort order" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={editing.is_published ?? true} onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })} />
              Publish on public page
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="rounded-md border border-border px-3 py-2 text-xs">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground inline-flex items-center gap-1">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CenterGalleryPage;
