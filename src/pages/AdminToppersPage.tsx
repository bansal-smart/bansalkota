import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Loader2, Plus, Save, Trash2, Trophy, Upload, X, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BulkCsvDialog, { type CsvField } from "@/components/BulkCsvDialog";
import AspectRatioHint from "@/components/admin/AspectRatioHint";

type Topper = {
  id: string;
  name: string;
  exam: string;
  rank_label: string | null;
  year: number | null;
  score: string | null;
  photo_url: string | null;
  quote: string | null;
  city: string | null;
  category: string | null;
  sort_order: number;
  is_published: boolean;
  is_alumni: boolean;
  current_position: string | null;
  company: string | null;
  batch_year: number | null;
};

const blank: Partial<Topper> = {
  name: "",
  exam: "JEE",
  rank_label: "",
  year: new Date().getFullYear(),
  score: "",
  photo_url: "",
  quote: "",
  city: "",
  category: "",
  sort_order: 0,
  is_published: true,
  is_alumni: false,
  current_position: "",
  company: "",
  batch_year: null,
};

const AdminToppersPage = () => {
  const [items, setItems] = useState<Topper[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Topper>>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [view, setView] = useState<"all" | "toppers" | "alumni">("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("toppers").select("*").order("sort_order");
    setItems((data ?? []) as Topper[]);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    if (view === "toppers") return items.filter((t) => !t.is_alumni);
    if (view === "alumni") return items.filter((t) => t.is_alumni);
    return items;
  }, [items, view]);
  useEffect(() => {
    load();
  }, []);

  const startEdit = (t: Topper) => {
    setEditingId(t.id);
    setForm(t);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const reset = () => {
    setEditingId(null);
    setForm(blank);
  };

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safe = (form.name || "topper").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const path = `toppers/${safe}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-content").upload(path, file, { upsert: true });
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("site-content").getPublicUrl(path);
    setForm((f) => ({ ...f, photo_url: data.publicUrl }));
    setUploading(false);
    toast.success("Photo uploaded");
  };

  const save = async () => {
    if (!form.name || !form.exam) return toast.error("Name and exam are required");
    setSaving(true);
    const payload = {
      name: form.name,
      exam: form.exam,
      rank_label: form.rank_label || null,
      year: form.year ? Number(form.year) : null,
      score: form.score || null,
      photo_url: form.photo_url || null,
      quote: form.quote || null,
      city: form.city || null,
      category: form.category || null,
      sort_order: Number(form.sort_order ?? 0),
      is_published: form.is_published ?? true,
      is_alumni: form.is_alumni ?? false,
      current_position: form.current_position || null,
      company: form.company || null,
      batch_year: form.batch_year ? Number(form.batch_year) : null,
    };
    const { error } = editingId
      ? await supabase.from("toppers").update(payload).eq("id", editingId)
      : await supabase.from("toppers").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Topper updated" : "Topper added");
    reset();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this topper?")) return;
    const { error } = await supabase.from("toppers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  const togglePublish = async (t: Topper) => {
    const { error } = await supabase.from("toppers").update({ is_published: !t.is_published }).eq("id", t.id);
    if (error) toast.error(error.message);
    else load();
  };

  const bulkFields: CsvField[] = [
    { key: "name", label: "name", required: true, example: "Aarav Sharma" },
    { key: "exam", label: "exam", required: true, example: "JEE" },
    { key: "rank_label", label: "rank_label", example: "AIR 12" },
    { key: "year", label: "year", parse: (v) => (v ? Number(v) : null), example: "2024" },
    { key: "score", label: "score", example: "295/300" },
    { key: "photo_url", label: "photo_url", example: "https://..." },
    { key: "quote", label: "quote", example: "Bansal shaped my journey." },
    { key: "city", label: "city", example: "Kota" },
    { key: "category", label: "category", example: "Engineering" },
    { key: "sort_order", label: "sort_order", parse: (v) => (v ? Number(v) : 0), example: "0" },
    {
      key: "is_published",
      label: "is_published",
      parse: (v) => !["false", "0", "no", ""].includes(String(v).toLowerCase().trim()),
      example: "true",
    },
    {
      key: "is_alumni",
      label: "is_alumni",
      parse: (v) => ["true", "1", "yes"].includes(String(v).toLowerCase().trim()),
      example: "false",
    },
    { key: "current_position", label: "current_position", example: "Software Engineer" },
    { key: "company", label: "company", example: "Google" },
    { key: "batch_year", label: "batch_year", parse: (v) => (v ? Number(v) : null), example: "2018" },
  ];

  const importRow = async (row: Record<string, any>) => {
    if (!row.name || !row.exam) return "Missing name or exam";
    const { error } = await supabase
      .from("toppers")
      .upsert([row as any], { onConflict: "name,exam,year", ignoreDuplicates: false });
    if (error) return error.message;
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Trophy className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-black">Toppers &amp; Alumni</h1>
            <p className="text-sm text-muted-foreground">
              Featured achievers shown on the Achievements page, and alumni shown on the Alumni page.
            </p>
          </div>
        </div>
        <button
          onClick={() => setBulkOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold hover:bg-muted"
        >
          <FileSpreadsheet className="h-4 w-4" /> Bulk CSV import / export
        </button>
      </div>

      <div className="flex gap-2 text-xs font-bold">
        {(["all", "toppers", "alumni"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setView(k)}
            className={`rounded-full px-3 py-1.5 border transition ${
              view === k
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            {k === "all" ? "All" : k === "toppers" ? "Toppers only" : "Alumni only"}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold">
            <Plus className="h-4 w-4" /> {editingId ? "Edit Topper" : "Add Topper"}
          </h2>
          {editingId && (
            <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <X className="h-3 w-3" /> Cancel
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Name *" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Exam (JEE / NEET / Olympiad)" value={form.exam ?? ""} onChange={(e) => setForm({ ...form, exam: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Rank (AIR 1, Top 100…)" value={form.rank_label ?? ""} onChange={(e) => setForm({ ...form, rank_label: e.target.value })} />
          <input type="number" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Year" value={form.year ?? ("" as any)} onChange={(e) => setForm({ ...form, year: e.target.value ? Number(e.target.value) : (null as any) })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Score (e.g. 360/360)" value={form.score ?? ""} onChange={(e) => setForm({ ...form, score: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="City" value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Category (Engineering / Medical / Foundation)" value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input type="number" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Sort order" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_published ?? true} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Published</label>
          <textarea className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-3" rows={2} placeholder="Quote / story (optional)" value={form.quote ?? ""} onChange={(e) => setForm({ ...form, quote: e.target.value })} />
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-4">
          <label className="flex items-center gap-2 text-sm font-bold text-bansal-blue">
            <GraduationCap className="h-4 w-4" />
            <input type="checkbox" checked={form.is_alumni ?? false} onChange={(e) => setForm({ ...form, is_alumni: e.target.checked })} />
            Show on Alumni page (Bansalite)
          </label>
          {form.is_alumni && (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Current position (e.g. Software Engineer)" value={form.current_position ?? ""} onChange={(e) => setForm({ ...form, current_position: e.target.value })} />
              <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Company / institution" value={form.company ?? ""} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              <input type="number" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Batch year (e.g. 2015)" value={form.batch_year ?? ("" as any)} onChange={(e) => setForm({ ...form, batch_year: e.target.value ? Number(e.target.value) : (null as any) })} />
            </div>
          )}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] items-end">
          <div>
            <label className="text-xs font-bold text-muted-foreground">Photo</label>
            <div className="mt-1 flex items-center gap-3">
              {form.photo_url ? (
                <img src={form.photo_url} alt="" className="h-16 w-16 rounded-full object-cover border border-border" />
              ) : (
                <div className="h-16 w-16 rounded-full border border-dashed border-border bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground">No</div>
              )}
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold cursor-pointer hover:bg-muted">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload photo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              </label>
              {form.photo_url && (
                <button onClick={() => setForm({ ...form, photo_url: "" })} className="text-xs text-destructive hover:underline">Remove</button>
              )}
            </div>
          </div>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {editingId ? "Update" : "Add"} Topper
          </button>
        </div>
      </div>

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
                  <th className="px-4 py-3">Topper</th>
                  <th className="px-4 py-3">Exam</th>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {t.photo_url ? (
                          <img src={t.photo_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-muted" />
                        )}
                        <div>
                          <div className="font-semibold flex items-center gap-1.5">
                            {t.name}
                            {t.is_alumni && (
                              <span title="Alumni" className="rounded-full bg-bansal-orange/10 px-1.5 py-0.5 text-[9px] font-bold text-bansal-orange uppercase tracking-wide">
                                Alumni
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {t.is_alumni
                              ? [t.current_position, t.company].filter(Boolean).join(" · ") || t.city || ""
                              : t.city ?? ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{t.exam}</td>
                    <td className="px-4 py-3">{t.rank_label ?? "-"}</td>
                    <td className="px-4 py-3">{t.batch_year ?? t.year ?? "-"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => togglePublish(t)} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.is_published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                        {t.is_published ? "Published" : "Hidden"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => startEdit(t)} className="text-primary hover:underline text-xs font-semibold">Edit</button>
                      <button onClick={() => remove(t.id)} className="text-destructive hover:text-destructive/70">
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No entries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BulkCsvDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk import / export — Toppers & Alumni"
        description="CSV columns: name, exam, rank_label, year, score, photo_url, quote, city, category, sort_order, is_published, is_alumni (true/false), current_position, company, batch_year. Upserts by (name, exam, year)."
        fields={bulkFields}
        exportRows={items}
        importRow={importRow}
        onDone={load}
        fileBase="toppers-alumni"
      />
    </div>
  );
};

export default AdminToppersPage;
