import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Loader2, Upload, Megaphone, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { toast } from "sonner";

type UpdateRow = {
  id: string;
  centre_id: string;
  title: string;
  body: string;
  image_url: string | null;
  posted_at: string;
  is_published: boolean;
};

const blank = (centerId: string): Partial<UpdateRow> => ({
  centre_id: centerId,
  title: "",
  body: "",
  image_url: null,
  posted_at: new Date().toISOString(),
  is_published: true,
});

const CenterUpdatesPage = () => {
  const { primaryCenterId } = useCenterAdmin();
  const [items, setItems] = useState<UpdateRow[]>([]);
  const [editing, setEditing] = useState<Partial<UpdateRow> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!primaryCenterId) return;
    const { data } = await (supabase as any)
      .from("centre_updates")
      .select("*")
      .eq("centre_id", primaryCenterId)
      .order("posted_at", { ascending: false });
    setItems((data ?? []) as UpdateRow[]);
  };

  useEffect(() => {
    load();
  }, [primaryCenterId]);

  if (!primaryCenterId) return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `centers/${primaryCenterId}/update-${Date.now()}.${ext}`;
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
    if (!editing?.title?.trim() || !editing?.body?.trim()) {
      return toast.error("Title and body are required");
    }
    setSaving(true);
    const payload = { ...editing, centre_id: primaryCenterId };
    const { error } = editing.id
      ? await (supabase as any).from("centre_updates").update(payload).eq("id", editing.id)
      : await (supabase as any).from("centre_updates").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Update posted");
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this update?")) return;
    await (supabase as any).from("centre_updates").delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black font-display text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" /> Centre Updates & Feed
          </h1>
          <p className="text-sm text-muted-foreground">
            Post news, batch starts, events and announcements. They appear on your public centre page.
          </p>
        </div>
        <button
          onClick={() => setEditing(blank(primaryCenterId))}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New Update
        </button>
      </div>

      <div className="space-y-3">
        {items.map((u) => (
          <article key={u.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3 text-primary" />
                  {new Date(u.posted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  <span className={`rounded-full px-2 py-0.5 font-bold ${u.is_published ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>
                    {u.is_published ? "Live" : "Hidden"}
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground">{u.title}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line mt-1 line-clamp-3">{u.body}</p>
              </div>
              {u.image_url && <img src={u.image_url} alt="" className="h-20 w-20 object-cover rounded-md shrink-0" />}
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => setEditing(u)} className="rounded-md border border-border px-2 py-1 text-[11px]">Edit</button>
                <button onClick={() => handleDelete(u.id)} className="rounded-md border border-destructive/40 text-destructive px-2 py-1 text-[11px]">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </article>
        ))}
        {!items.length && <p className="text-sm text-muted-foreground">No updates yet. Post your first one.</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-xl bg-card p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground">{editing.id ? "Edit" : "New"} update</h2>
            <input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Title (e.g. New JEE batch starts Jul 1)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <textarea value={editing.body ?? ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} placeholder="Write the update…" rows={5} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none" />
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Image (optional)</label>
              {editing.image_url && <img src={editing.image_url} alt="" className="h-24 w-full object-cover rounded-md" />}
              <label className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs cursor-pointer">
                <Upload className="h-3 w-3" /> {uploading ? "Uploading…" : "Upload image"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="datetime-local"
                value={editing.posted_at ? new Date(editing.posted_at).toISOString().slice(0, 16) : ""}
                onChange={(e) => setEditing({ ...editing, posted_at: new Date(e.target.value).toISOString() })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={editing.is_published ?? true} onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })} />
                Publish on public page
              </label>
            </div>
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

export default CenterUpdatesPage;
