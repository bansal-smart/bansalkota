import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Plus, Save, Trash2, Upload, X, Users, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Center = {
  id: string;
  slug: string;
  city: string;
  area: string | null;
  state: string;
  region: string;
  address: string;
  phone: string;
  email: string | null;
  is_hq: boolean;
  established: number | null;
  theme: string;
  image_url: string | null;
  verified: boolean;
  is_published: boolean;
  sort_order: number;
};

const REGIONS = ["North", "South", "East", "West", "Central"];
const THEMES = ["metro", "hills", "heritage", "coastal", "temple", "plains", "east", "tier2"];

const blank: Partial<Center> = {
  slug: "",
  city: "",
  area: "",
  state: "",
  region: "North",
  address: "",
  phone: "",
  email: "",
  is_hq: false,
  established: undefined as any,
  theme: "metro",
  image_url: "",
  verified: false,
  is_published: true,
  sort_order: 0,
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const AdminCentersPage = () => {
  const [items, setItems] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All");
  const [form, setForm] = useState<Partial<Center>>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("centers")
      .select("*")
      .order("sort_order")
      .limit(500);
    if (error) toast.error(error.message);
    setItems((data ?? []) as Center[]);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      if (region !== "All" && c.region !== region) return false;
      if (!q) return true;
      return (
        c.city.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        (c.area ?? "").toLowerCase().includes(q) ||
        c.slug.includes(q)
      );
    });
  }, [items, search, region]);

  const startEdit = (c: Center) => {
    setEditingId(c.id);
    setForm({ ...c, area: c.area ?? "", email: c.email ?? "", image_url: c.image_url ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    setEditingId(null);
    setForm(blank);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `centers/${slugify(form.slug || form.city || "center")}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-content").upload(path, file, { upsert: true });
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("site-content").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl }));
    setUploading(false);
    toast.success("Image uploaded");
  };

  const save = async () => {
    if (!form.city || !form.state) return toast.error("City and State are required");
    const slug = form.slug || slugify(`${form.city}${form.area ? "-" + form.area : ""}`);
    setSaving(true);
    const payload = {
      slug,
      city: form.city,
      area: form.area || null,
      state: form.state,
      region: form.region || "North",
      address: form.address || "",
      phone: form.phone || "",
      email: form.email || null,
      is_hq: !!form.is_hq,
      established: form.established ? Number(form.established) : null,
      theme: form.theme || "metro",
      image_url: form.image_url || null,
      verified: !!form.verified,
      is_published: form.is_published ?? true,
      sort_order: Number(form.sort_order ?? 0),
    };
    const { error } = editingId
      ? await supabase.from("centers").update(payload).eq("id", editingId)
      : await supabase.from("centers").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Center updated" : "Center added");
    reset();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this center?")) return;
    const { error } = await supabase.from("centers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  const togglePublish = async (c: Center) => {
    const { error } = await supabase
      .from("centers")
      .update({ is_published: !c.is_published })
      .eq("id", c.id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-black">Centres</h1>
          <p className="text-sm text-muted-foreground">
            Manage Bansal Classes centres shown on the public Centres page.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold">
            <Plus className="h-4 w-4" /> {editingId ? "Edit Centre" : "Add Centre"}
          </h2>
          {editingId && (
            <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <X className="h-3 w-3" /> Cancel edit
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="City *" value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Area (optional)" value={form.area ?? ""} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="State *" value={form.state ?? ""} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={form.region ?? "North"} onChange={(e) => setForm({ ...form, region: e.target.value })}>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={form.theme ?? "metro"} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
            {THEMES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Slug (auto)" value={form.slug ?? ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <textarea className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-3" rows={2} placeholder="Address" value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Phone" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input type="number" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Established Year" value={form.established ?? ("" as any)} onChange={(e) => setForm({ ...form, established: e.target.value ? Number(e.target.value) : (undefined as any) })} />
          <input type="number" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Sort order" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_hq} onChange={(e) => setForm({ ...form, is_hq: e.target.checked })} /> Headquarters</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.verified} onChange={(e) => setForm({ ...form, verified: e.target.checked })} /> Verified</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_published ?? true} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Published</label>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] items-end">
          <div>
            <label className="text-xs font-bold text-muted-foreground">Centre image</label>
            <div className="mt-1 flex items-center gap-3">
              {form.image_url ? (
                <img src={form.image_url} alt="" className="h-16 w-24 rounded-lg object-cover border border-border" />
              ) : (
                <div className="h-16 w-24 rounded-lg border border-dashed border-border bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground">No image</div>
              )}
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold cursor-pointer hover:bg-muted">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
              </label>
              {form.image_url && (
                <button onClick={() => setForm({ ...form, image_url: "" })} className="text-xs text-destructive hover:underline">Remove</button>
              )}
            </div>
          </div>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {editingId ? "Update" : "Add"} Centre
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          placeholder="Search city, state, slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <select value={region} onChange={(e) => setRegion(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option>All</option>
          {REGIONS.map((r) => <option key={r}>{r}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} of {items.length}</span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Centre</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{c.city}{c.area && c.area !== c.city ? ` — ${c.area}` : ""}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>{c.slug}</span>
                        {c.is_hq && <span className="rounded bg-primary/10 text-primary px-1 font-bold">HQ</span>}
                        {c.verified && <span className="rounded bg-green-100 text-green-700 px-1 font-bold">Verified</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">{c.state}</td>
                    <td className="px-4 py-3">{c.region}</td>
                    <td className="px-4 py-3 text-xs">{c.phone}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => togglePublish(c)} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.is_published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                        {c.is_published ? "Published" : "Hidden"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => startEdit(c)} className="text-primary hover:underline text-xs font-semibold">Edit</button>
                      <button onClick={() => remove(c.id)} className="text-destructive hover:text-destructive/70">
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No centres match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCentersPage;
