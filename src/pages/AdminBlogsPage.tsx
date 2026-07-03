import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AspectRatioHint from "@/components/admin/AspectRatioHint";
import RichTextEditor from "@/components/RichTextEditor";
import { slugify } from "@/lib/validators";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  content_html: string;
  tags: string[];
  status: string; // 'draft' | 'published'
  author_name: string | null;
  published_at: string | null;
  sort_order: number;
  updated_at: string;
};

const emptyForm = {
  slug: "",
  title: "",
  excerpt: "",
  cover_image_url: "",
  content_html: "",
  tags: "",
  status: "draft" as "draft" | "published",
  author_name: "",
  sort_order: 0,
};

const AdminBlogsPage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Post | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setPosts((data as Post[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, sort_order: posts.length }); setShowForm(true); };
  const openEdit = (p: Post) => {
    setEditing(p);
    setForm({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt ?? "",
      cover_image_url: p.cover_image_url ?? "",
      content_html: p.content_html ?? "",
      tags: (p.tags ?? []).join(", "),
      status: (p.status === "published" ? "published" : "draft"),
      author_name: p.author_name ?? "",
      sort_order: p.sort_order,
    });
    setShowForm(true);
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `blog-covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("site-content").upload(path, file, { upsert: true });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("site-content").getPublicUrl(path);
    setForm((f) => ({ ...f, cover_image_url: data.publicUrl }));
    setUploading(false);
    toast.success("Cover uploaded");
  };

  const autoSlug = useMemo(() => slugify(form.title || ""), [form.title]);

  const save = async (publishNow?: boolean) => {
    if (!form.title.trim()) return toast.error("Please enter a title");
    if (!form.content_html.trim()) return toast.error("Please add content");
    const finalSlug = (form.slug.trim() || autoSlug).toLowerCase();
    if (!finalSlug) return toast.error("Slug is required");
    setSaving(true);
    const status = publishNow ? "published" : form.status;
    const payload = {
      slug: finalSlug,
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || null,
      cover_image_url: form.cover_image_url || null,
      content_html: form.content_html,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      status,
      author_name: form.author_name.trim() || null,
      sort_order: form.sort_order,
      published_at: status === "published" ? (editing?.published_at ?? new Date().toISOString()) : null,
    };
    const { error } = editing
      ? await supabase.from("blog_posts").update(payload).eq("id", editing.id)
      : await supabase.from("blog_posts").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Post updated" : "Post created");
    setShowForm(false);
    void load();
  };

  const remove = async (p: Post) => {
    if (!confirm(`Delete blog post "${p.title}"?`)) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    void load();
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-black">Blogs</h1>
            <p className="text-sm text-muted-foreground">Write and publish blog posts. Supports rich text, images, tables and code.</p>
          </div>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New Post
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No posts yet.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Slug</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Order</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{p.title}</td>
                  <td className="px-4 py-2 text-muted-foreground">{p.slug}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${p.status === "published" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-2">{p.sort_order}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="rounded-lg border border-border px-2 py-1 text-xs font-bold hover:bg-muted">Edit</button>
                      <button onClick={() => remove(p)} className="rounded-lg border border-destructive/30 text-destructive px-2 py-1 text-xs font-bold hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl border border-border w-full max-w-3xl max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="font-bold text-lg">{editing ? "Edit Post" : "New Post"}</h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Title</label>
                <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground">Slug</label>
                  <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder={autoSlug || "auto-generated-from-title"} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground">Author name</label>
                  <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Cover image</label>
                <AspectRatioHint ratio="16:9 (landscape)" size="1280×720" note="blog cover" />
                <div className="mt-1 flex items-center gap-3">
                  {form.cover_image_url ? (
                    <img src={form.cover_image_url} alt="" className="h-24 w-40 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="h-24 w-40 rounded-lg border border-dashed border-border bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground">No cover</div>
                  )}
                  <label className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold cursor-pointer hover:bg-muted">
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Excerpt</label>
                <textarea className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Content</label>
                <RichTextEditor value={form.content_html} onChange={(v) => setForm({ ...form, content_html: v })} placeholder="Write your blog post here…" />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-muted-foreground">Tags (comma separated)</label>
                  <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground">Sort order</label>
                  <input type="number" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button onClick={() => save(false)} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-bold hover:bg-muted disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save draft
                </button>
                <button onClick={() => save(true)} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBlogsPage;
