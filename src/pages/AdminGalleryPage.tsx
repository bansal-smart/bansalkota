import { useEffect, useState } from "react";
import { Image as ImageIcon, Video as VideoIcon, Loader2, Plus, Save, Trash2, Upload, X, Film, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AspectRatioHint from "@/components/admin/AspectRatioHint";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SortableImageProps = {
  id: string;
  url: string;
  onRemove: () => void;
};

const SortableImage = ({ id, url, onRemove }: SortableImageProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group rounded-lg overflow-hidden border border-border bg-card"
    >
      <img src={url} alt="" className="aspect-square object-cover w-full" />
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 rounded-full bg-black/70 p-1 text-white cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white opacity-0 group-hover:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

type Album = {
  id: string;
  kind: "image" | "video";
  title: string;
  video_url: string | null;
  cover_url: string | null;
  sort_order: number;
  is_active: boolean;
};

type AlbumImage = { id: string; album_id: string; image_url: string; sort_order: number };

const sb: any = supabase;

const AdminGalleryPage = () => {
  const [tab, setTab] = useState<"image" | "video">("image");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [images, setImages] = useState<Record<string, AlbumImage[]>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Album | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Album, "id">>({
    kind: "image",
    title: "",
    video_url: "",
    cover_url: "",
    sort_order: 0,
    is_active: true,
  });
  const [editingImages, setEditingImages] = useState<AlbumImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: a } = await sb
      .from("gallery_albums")
      .select("*")
      .eq("kind", tab)
      .order("sort_order");
    const list = (a ?? []) as Album[];
    setAlbums(list);
    if (tab === "image" && list.length) {
      const ids = list.map((x) => x.id);
      const { data: imgs } = await sb
        .from("gallery_album_images")
        .select("*")
        .in("album_id", ids)
        .order("sort_order");
      const grouped: Record<string, AlbumImage[]> = {};
      ((imgs ?? []) as AlbumImage[]).forEach((i) => {
        grouped[i.album_id] = grouped[i.album_id] || [];
        grouped[i.album_id].push(i);
      });
      setImages(grouped);
    } else {
      setImages({});
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, [tab]);

  const openNew = () => {
    setEditing(null);
    setForm({
      kind: tab,
      title: "",
      video_url: "",
      cover_url: "",
      sort_order: albums.length,
      is_active: true,
    });
    setEditingImages([]);
    setShowForm(true);
  };

  const openEdit = (a: Album) => {
    setEditing(a);
    setForm({
      kind: a.kind,
      title: a.title,
      video_url: a.video_url ?? "",
      cover_url: a.cover_url ?? "",
      sort_order: a.sort_order,
      is_active: a.is_active,
    });
    setEditingImages(images[a.id] ?? []);
    setShowForm(true);
  };

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("site-content").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("site-content").getPublicUrl(path);
    return data.publicUrl;
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadFile(file, "gallery/covers");
      setForm((f) => ({ ...f, cover_url: url }));
      toast.success("Cover uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const uploadVideo = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadFile(file, "gallery/videos");
      setForm((f) => ({ ...f, video_url: url }));
      toast.success("Video uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const uploadAlbumImages = async (files: FileList) => {
    setUploading(true);
    try {
      const uploaded: AlbumImage[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadFile(files[i], "gallery/images");
        uploaded.push({
          id: `tmp-${Date.now()}-${i}`,
          album_id: "",
          image_url: url,
          sort_order: editingImages.length + i,
        });
      }
      setEditingImages((prev) => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} image(s) uploaded`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (id: string) => setEditingImages((prev) => prev.filter((p) => p.id !== id));

  const save = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    if (form.kind === "video" && !form.video_url) return toast.error("Video URL or upload required");
    if (form.kind === "image" && editingImages.length === 0)
      return toast.error("Add at least one image");
    setSaving(true);
    try {
      const payload = {
        kind: form.kind,
        title: form.title.trim(),
        video_url: form.video_url || null,
        cover_url: form.cover_url || null,
        sort_order: form.sort_order,
        is_active: form.is_active,
      };
      let albumId = editing?.id;
      if (editing) {
        const { error } = await sb.from("gallery_albums").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from("gallery_albums").insert(payload).select("id").single();
        if (error) throw error;
        albumId = data.id;
      }
      if (form.kind === "image" && albumId) {
        // Reset images: delete existing then re-insert in current order
        await sb.from("gallery_album_images").delete().eq("album_id", albumId);
        const rows = editingImages.map((im, idx) => ({
          album_id: albumId,
          image_url: im.image_url,
          sort_order: idx,
        }));
        if (rows.length) {
          const { error } = await sb.from("gallery_album_images").insert(rows);
          if (error) throw error;
        }
      }
      toast.success(editing ? "Updated" : "Created");
      setShowForm(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: Album) => {
    if (!confirm(`Delete "${a.title}"?`)) return;
    const { error } = await sb.from("gallery_albums").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleImageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setEditingImages((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex).map((im, idx) => ({ ...im, sort_order: idx }));
    });
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <ImageIcon className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-black">Gallery Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage Image albums and Video gallery shown on the public Galleries page.
            </p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add {tab === "image" ? "Album" : "Video"}
        </button>
      </div>

      <div className="flex gap-2 border-b border-border">
        {(["image", "video"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px ${
              tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            {k === "image" ? <ImageIcon className="h-4 w-4 inline mr-1" /> : <VideoIcon className="h-4 w-4 inline mr-1" />}
            {k === "image" ? "Image Albums" : "Video Gallery"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : albums.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No {tab === "image" ? "albums" : "videos"} yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {albums.map((a) => {
            const cover = a.cover_url || images[a.id]?.[0]?.image_url;
            return (
              <div key={a.id} className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
                <div className="aspect-video bg-muted relative">
                  {a.kind === "video" ? (
                    a.cover_url ? (
                      <img src={a.cover_url} alt={a.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Film className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )
                  ) : cover ? (
                    <img src={cover} alt={a.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  {a.kind === "image" && (
                    <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {(images[a.id] ?? []).length} photos
                    </span>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-sm font-bold line-clamp-2">{a.title}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Order: {a.sort_order}</span>
                    <span className={a.is_active ? "text-green-600 font-bold" : ""}>
                      {a.is_active ? "Active" : "Hidden"}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => openEdit(a)}
                      className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs font-bold hover:bg-muted"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(a)}
                      className="rounded-lg border border-destructive/30 text-destructive px-2 py-1.5 text-xs font-bold hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
              <h2 className="font-bold text-lg">
                {editing ? "Edit" : "Add"} {form.kind === "image" ? "Image Album" : "Video"}
              </h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Title</label>
                <input
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder={form.kind === "image" ? "e.g. JEE MAIN 2026 Result Celebration" : "e.g. Tilak before JEE Main 2026"}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              {form.kind === "video" ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground">Video URL (YouTube embed, MP4 link, etc.)</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      placeholder="https://..."
                      value={form.video_url ?? ""}
                      onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                    />
                    <label className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold cursor-pointer hover:bg-muted">
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Or upload video file
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])}
                      />
                    </label>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground">Thumbnail (optional)</label>
                    <div className="mt-1 flex items-center gap-3">
                      {form.cover_url ? (
                        <img src={form.cover_url} alt="" className="h-24 w-32 rounded-lg object-cover border border-border" />
                      ) : (
                        <div className="h-24 w-32 rounded-lg border border-dashed border-border bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground">
                          No image
                        </div>
                      )}
                      <label className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold cursor-pointer hover:bg-muted">
                        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])}
                        />
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground">Album images</label>
                    <label className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold cursor-pointer hover:bg-muted">
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload images
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => e.target.files && uploadAlbumImages(e.target.files)}
                      />
                    </label>
                  </div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleImageDragEnd}
                  >
                    <SortableContext items={editingImages.map((i) => i.id)} strategy={rectSortingStrategy}>
                      <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {editingImages.map((im) => (
                          <SortableImage
                            key={im.id}
                            id={im.id}
                            url={im.image_url}
                            onRemove={() => removeImage(im.id)}
                          />
                        ))}
                        {editingImages.length === 0 && (
                          <div className="col-span-full rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                            No images yet. Upload one or more.
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>
                  {editingImages.length > 1 && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Drag the handle on each image to reorder. The order here is how they appear on the website.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground">Sort order</label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <label className="flex items-end gap-2 text-sm pb-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  Active (visible on site)
                </label>
              </div>

              <button
                onClick={save}
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editing ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGalleryPage;
