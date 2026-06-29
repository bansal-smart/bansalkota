import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Loader2, Upload, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { toast } from "sonner";
import AspectRatioHint from "@/components/admin/AspectRatioHint";

type Banner = {
  id: string;
  centre_id: string;
  image_url: string;
  link: string | null;
  sort_order: number;
  is_active: boolean;
};

const blank = (centerId: string): Partial<Banner> => ({
  centre_id: centerId,
  image_url: "",
  link: "",
  sort_order: 0,
  is_active: true,
});

const CenterCarouselBannersPage = () => {
  const { primaryCenterId } = useCenterAdmin();
  const [items, setItems] = useState<Banner[]>([]);
  const [editing, setEditing] = useState<Partial<Banner> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!primaryCenterId) return;
    const { data } = await supabase
      .from("centre_carousel_banners" as any)
      .select("*")
      .eq("centre_id", primaryCenterId)
      .order("sort_order");
    setItems((data ?? []) as any);
  };

  useEffect(() => {
    load();
  }, [primaryCenterId]);

  if (!primaryCenterId)
    return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `centers/${primaryCenterId}/carousel/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("site-content")
      .upload(path, file, { upsert: true });
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
    if (!editing?.image_url) {
      toast.error("Banner image is required");
      return;
    }
    setSaving(true);
    const payload = {
      centre_id: primaryCenterId,
      image_url: editing.image_url,
      link: editing.link || null,
      sort_order: editing.sort_order ?? items.length,
      is_active: editing.is_active ?? true,
    };
    const { error } = editing.id
      ? await (supabase as any)
          .from("centre_carousel_banners" as any)
          .update(payload)
          .eq("id", editing.id)
      : await (supabase as any).from("centre_carousel_banners" as any).insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Banner saved");
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    await (supabase as any).from("centre_carousel_banners" as any).delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black font-display text-foreground">Centre Banner</h1>
          <p className="text-sm text-muted-foreground">
            Carousel banners shown at the top of your centre's public page.
          </p>
        </div>
        <button
          onClick={() => setEditing(blank(primaryCenterId))}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add Banner
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((b) => (
          <div key={b.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <img src={b.image_url} alt="" className="aspect-[2/1] w-full object-cover" />
            <div className="p-4 space-y-2">
              {b.link && (
                <p className="text-xs text-muted-foreground truncate">
                  <span className="font-semibold text-foreground">Link:</span> {b.link}
                </p>
              )}
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setEditing(b)}
                  className="rounded-md border border-border px-3 py-1 text-xs"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="rounded-md border border-destructive/40 text-destructive px-3 py-1 text-xs inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
                <span
                  className={`ml-auto rounded-full px-2 py-1 text-[10px] font-bold ${
                    b.is_active
                      ? "bg-secondary/10 text-secondary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {b.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        ))}
        {!items.length && (
          <p className="text-sm text-muted-foreground">No banners yet. Add your first one.</p>
        )}
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-card p-6 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-foreground">
              {editing.id ? "Edit" : "Add"} Banner
            </h2>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Banner image</label>
              <AspectRatioHint ratio="2:1" size="1600×800" note="centre hero carousel slide" />
              {editing.image_url && (
                <img
                  src={editing.image_url}
                  alt=""
                  className="aspect-[2/1] w-full object-cover rounded-md"
                />
              )}
              <label className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs cursor-pointer">
                <Upload className="h-3 w-3" /> {uploading ? "Uploading…" : "Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
              </label>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Link (optional)</label>
              <input
                value={editing.link ?? ""}
                onChange={(e) => setEditing({ ...editing, link: e.target.value })}
                placeholder="https://… or /courses/..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={editing.sort_order ?? 0}
                onChange={(e) =>
                  setEditing({ ...editing, sort_order: Number(e.target.value) })
                }
                placeholder="Sort order"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={editing.is_active ?? true}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                />
                Active
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-md border border-border px-3 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground inline-flex items-center gap-1"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}{" "}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CenterCarouselBannersPage;
