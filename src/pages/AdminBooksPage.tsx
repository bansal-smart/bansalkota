import { useEffect, useState } from "react";
import { BookOpen, Boxes, Loader2, Plus, Trash2, Save } from "lucide-react";
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

type Pack = {
  id: string;
  slug: string;
  title: string;
  target_exam: string | null;
  class_level: string | null;
  price: number;
  original_price: number | null;
  is_published: boolean;
  items?: { book_id: string; book?: { title: string } | null }[];
};

const blankBook = {
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

const blankPack = {
  slug: "",
  title: "",
  description: "",
  target_exam: "",
  class_level: "",
  price: 0,
  original_price: 0,
  is_published: true,
};

const AdminBooksPage = () => {
  const [tab, setTab] = useState<"books" | "packs">("books");

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-black">Store</h1>
          <p className="text-sm text-muted-foreground">Manage printed books and curated module packs</p>
        </div>
      </div>

      <div className="inline-flex rounded-xl border border-border bg-card p-1">
        <button
          onClick={() => setTab("books")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold ${tab === "books" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          <BookOpen className="h-4 w-4" /> Books
        </button>
        <button
          onClick={() => setTab("packs")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold ${tab === "packs" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          <Boxes className="h-4 w-4" /> Module Packs
        </button>
      </div>

      {tab === "books" ? <BooksTab /> : <PacksTab />}
    </div>
  );
};

const BooksTab = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(blankBook);
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
    if (!form.title || !form.slug) return toast.error("Title and slug are required");
    setSaving(true);
    const { error } = await supabase.from("books").insert({ ...form, original_price: form.original_price || null });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Book added");
      setForm(blankBook);
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
    <>
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-bold">
          <Plus className="h-4 w-4" /> Add Book
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Target Exam" value={form.target_exam} onChange={(e) => setForm({ ...form, target_exam: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Class Level" value={form.class_level} onChange={(e) => setForm({ ...form, class_level: e.target.value })} />
          <input type="number" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <input type="number" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Original Price" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: Number(e.target.value) })} />
          <input type="number" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
        </div>
        <button onClick={save} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Book
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
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
    </>
  );
};

const PacksTab = () => {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(blankPack);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: b }] = await Promise.all([
      supabase
        .from("module_packs")
        .select("*, items:module_pack_items(book_id, book:books(title))")
        .order("created_at", { ascending: false }),
      supabase.from("books").select("*").order("title"),
    ]);
    setPacks((p ?? []) as unknown as Pack[]);
    setBooks((b ?? []) as Book[]);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const toggleBook = (id: string) =>
    setSelectedBookIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = async () => {
    if (!form.title || !form.slug) return toast.error("Title and slug are required");
    if (selectedBookIds.length === 0) return toast.error("Select at least one book for the pack");
    setSaving(true);
    const { data: pack, error } = await supabase
      .from("module_packs")
      .insert({ ...form, original_price: form.original_price || null })
      .select("id")
      .single();
    if (error || !pack) {
      setSaving(false);
      toast.error(error?.message ?? "Could not save pack");
      return;
    }
    const itemsErr = (
      await supabase
        .from("module_pack_items")
        .insert(selectedBookIds.map((book_id, i) => ({ pack_id: pack.id, book_id, position: i })))
    ).error;
    setSaving(false);
    if (itemsErr) toast.error(itemsErr.message);
    else {
      toast.success("Pack created");
      setForm(blankPack);
      setSelectedBookIds([]);
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this pack?")) return;
    const { error } = await supabase.from("module_packs").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  const togglePublish = async (p: Pack) => {
    const { error } = await supabase.from("module_packs").update({ is_published: !p.is_published }).eq("id", p.id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-bold">
          <Plus className="h-4 w-4" /> Create Module Pack
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-3" placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Target Exam" value={form.target_exam} onChange={(e) => setForm({ ...form, target_exam: e.target.value })} />
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Class Level" value={form.class_level} onChange={(e) => setForm({ ...form, class_level: e.target.value })} />
          <div />
          <input type="number" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Pack Price" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <input type="number" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Original (sum) Price" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: Number(e.target.value) })} />
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-bold">Books in this pack ({selectedBookIds.length})</p>
          <div className="max-h-60 overflow-y-auto rounded-lg border border-border bg-background p-3">
            {books.length === 0 ? (
              <p className="text-sm text-muted-foreground">Create books first.</p>
            ) : (
              books.map((b) => (
                <label key={b.id} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedBookIds.includes(b.id)}
                    onChange={() => toggleBook(b.id)}
                  />
                  <span className="flex-1">{b.title}</span>
                  <span className="text-xs text-muted-foreground">₹{Number(b.price).toLocaleString()}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <button onClick={save} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Pack
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Books</th>
                <th className="px-4 py-3">Exam</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {packs.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{p.title}</td>
                  <td className="px-4 py-3">{(p.items ?? []).length}</td>
                  <td className="px-4 py-3">{p.target_exam ?? "-"}</td>
                  <td className="px-4 py-3">{p.class_level ?? "-"}</td>
                  <td className="px-4 py-3">₹{Number(p.price).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => togglePublish(p)} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.is_published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                      {p.is_published ? "Published" : "Hidden"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(p.id)} className="text-destructive hover:text-destructive/70">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {packs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No module packs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

export default AdminBooksPage;
