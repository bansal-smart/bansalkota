import { useEffect, useState } from "react";
import { Trophy, Loader2, Plus, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TS = {
  id: string;
  slug: string;
  title: string;
  target_exam: string | null;
  total_tests: number;
  price: number;
  is_published: boolean;
  is_featured: boolean;
};

const blank = {
  slug: "",
  title: "",
  target_exam: "",
  subject: "",
  description: "",
  total_tests: 0,
  duration_months: 12,
  price: 0,
  original_price: 0,
  is_published: true,
  is_featured: false,
};

const AdminTestSeriesPage = () => {
  const [rows, setRows] = useState<TS[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("test_series").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as TS[]);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.title || !form.slug) {
      toast.error("Title and slug are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("test_series").insert({
      ...form,
      original_price: form.original_price || null,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Test series added");
      setForm(blank);
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this test series?")) return;
    const { error } = await supabase.from("test_series").delete().eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-black">Test Series</h1>
          <p className="text-sm text-muted-foreground">Manage AIR test series products</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Test Series
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Target Exam" value={form.target_exam} onChange={(e) => setForm({ ...form, target_exam: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <input type="number" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Total tests" value={form.total_tests} onChange={(e) => setForm({ ...form, total_tests: Number(e.target.value) })} />
          <input type="number" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Duration (months)" value={form.duration_months} onChange={(e) => setForm({ ...form, duration_months: Number(e.target.value) })} />
          <input type="number" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <input type="number" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Original price" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: Number(e.target.value) })} />
          <textarea className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-3" placeholder="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
            Featured
          </label>
        </div>
        <button onClick={save} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Exam</th>
                <th className="px-4 py-3">Tests</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Featured</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{r.title}</td>
                  <td className="px-4 py-3">{r.target_exam ?? "-"}</td>
                  <td className="px-4 py-3">{r.total_tests}</td>
                  <td className="px-4 py-3">₹{Number(r.price).toLocaleString()}</td>
                  <td className="px-4 py-3">{r.is_featured ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(r.id)} className="text-destructive hover:text-destructive/70">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No test series yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminTestSeriesPage;
