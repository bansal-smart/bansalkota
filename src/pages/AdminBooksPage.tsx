import { useEffect, useState } from "react";
import { BookOpen, Loader2, Plus, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Book = {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  subject: string | null;
  target_exam: string | null;
  class_level: string | null;
  price: number;
  original_price: number | null;
  stock: number;
  is_published: boolean;
};

const blank = {
  slug: "",
  title: "",
  author: "",
  subject: "",
  target_exam: "",
  class_level: "",
  price: 0,
  original_price: 0,
  stock: 0,
  is_published: true,
};

const AdminBooksPage = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("books").select("*").order("created_at", { ascending: false });
    setBooks((data ?? []) as Book[]);
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
    const { error } = await supabase.from("books").insert({
      ...form,
      original_price: form.original_price || null,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Book added");
      setForm(blank);
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this book?")) return;
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  const togglePublish = async (b: Book) => {
    const { error } = await supabase.from("books").update({ is_published: !b.is_published }).eq("id", b.id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-black">Books / E-Store</h1>
          <p className="text-sm text-muted-foreground">Manage printed books and study material</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Book
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Slug (e.g. jee-physics-vol1)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Target Exam (JEE Advanced / NEET / Foundation)" value={form.target_exam} onChange={(e) => setForm({ ...form, target_exam: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Class Level (Class 11)" value={form.class_level} onChange={(e) => setForm({ ...form, class_level: e.target.value })} />
          <input type="number" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <input type="number" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Original Price" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: Number(e.target.value) })} />
          <input type="number" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
        </div>
        <button onClick={save} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Book
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
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{b.title}</td>
                  <td className="px-4 py-3">{b.target_exam ?? "-"}</td>
                  <td className="px-4 py-3">{b.class_level ?? "-"}</td>
                  <td className="px-4 py-3">₹{Number(b.price).toLocaleString()}</td>
                  <td className="px-4 py-3">{b.stock}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => togglePublish(b)} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${b.is_published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                      {b.is_published ? "Published" : "Hidden"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(b.id)} className="text-destructive hover:text-destructive/70">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {books.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No books yet.
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

export default AdminBooksPage;
