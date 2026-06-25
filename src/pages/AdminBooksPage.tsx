import { useEffect, useRef, useState } from "react";
import { BookOpen, Boxes, Loader2, Plus, Trash2, Save, Pencil, Upload, X, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
  cover_url: string | null;
  description: string | null;
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

const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology", "Mental Ability", "Mixed / General"];
const TARGET_EXAMS = ["JEE", "NEET", "NTSE / Olympiads", "Foundation", "CBSE / Board", "Mixed"];
const CLASS_LEVELS = ["Class V", "Class VI", "Class VII", "Class VIII", "Class IX", "Class X", "Class XI", "Class XII", "XI & XII", "Droppers"];

type BookForm = {
  slug: string;
  title: string;
  author: string;
  subject: string;
  target_exam: string;
  class_level: string;
  price: number;
  original_price: number;
  stock: number;
  is_published: boolean;
  cover_url: string;
  description: string;
};

const blankBook: BookForm = {
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
  cover_url: "",
  description: "",
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

const CoverUploader = ({ value, onChange }: { value: string; onChange: (url: string) => void }) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB");
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `book-covers/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("site-content").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) {
      setUploading(false);
      return toast.error(error.message);
    }
    const { data } = supabase.storage.from("site-content").getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
  };

  return (
    <div className="space-y-2">
      <Label>Cover image</Label>
      <div className="flex items-start gap-3">
        <div className="flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
          {value ? (
            <img src={value} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold hover:bg-muted disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {value ? "Replace" : "Upload"} cover
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-destructive hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" /> Remove
            </button>
          )}
          <p className="text-[11px] text-muted-foreground">PNG / JPG, up to 5 MB</p>
        </div>
      </div>
    </div>
  );
};

const BookFormFields = ({ form, setForm }: { form: BookForm; setForm: (f: BookForm) => void }) => {
  return (
    <div className="space-y-4">
      <CoverUploader value={form.cover_url} onChange={(url) => setForm({ ...form, cover_url: url })} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="bk-title">Title *</Label>
          <input id="bk-title" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Book title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bk-stock">Stock</Label>
          <input id="bk-stock" type="number" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bk-author">Author</Label>
          <input id="bk-author" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Author name" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
        </div>

        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Select value={form.subject || undefined} onValueChange={(v) => setForm({ ...form, subject: v })}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Target exam</Label>
          <Select value={form.target_exam || undefined} onValueChange={(v) => setForm({ ...form, target_exam: v })}>
            <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
            <SelectContent>
              {TARGET_EXAMS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Class level</Label>
          <Select value={form.class_level || undefined} onValueChange={(v) => setForm({ ...form, class_level: v })}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {CLASS_LEVELS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bk-price">Price (₹) *</Label>
          <input id="bk-price" type="number" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bk-original">Original price (₹)</Label>
          <input id="bk-original" type="number" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Optional" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: Number(e.target.value) })} />
        </div>

        <div className="space-y-1.5 md:col-span-3">
          <Label htmlFor="bk-desc">Description</Label>
          <textarea id="bk-desc" rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Short description shown on the store page" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div className="space-y-1.5 md:col-span-3">
          <Label htmlFor="bk-desc">Description</Label>
          <textarea id="bk-desc" rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Short description shown on the store page" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </div>
    </div>
  );
};

const EditBookModal = ({ book, onClose, onSaved }: { book: Book | null; onClose: () => void; onSaved: () => void }) => {
  const [form, setForm] = useState<BookForm>(blankBook);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (book) {
      setForm({
        slug: book.slug ?? "",
        title: book.title ?? "",
        author: book.author ?? "",
        subject: book.subject ?? "",
        target_exam: book.target_exam ?? "",
        class_level: book.class_level ?? "",
        price: Number(book.price ?? 0),
        original_price: Number(book.original_price ?? 0),
        stock: Number(book.stock ?? 0),
        is_published: book.is_published,
        cover_url: book.cover_url ?? "",
        description: book.description ?? "",
      });
    }
  }, [book]);

  const save = async () => {
    if (!book) return;
    if (!form.title || !form.slug) return toast.error("Title is required");
    setSaving(true);
    const { error } = await supabase
      .from("books")
      .update({
        ...form,
        original_price: form.original_price || null,
        cover_url: form.cover_url || null,
        description: form.description || null,
        author: form.author || null,
        subject: form.subject || null,
        target_exam: form.target_exam || null,
        class_level: form.class_level || null,
      })
      .eq("id", book.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Book updated");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={!!book} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit book</DialogTitle>
        </DialogHeader>
        <BookFormFields form={form} setForm={setForm} />
        <DialogFooter>
          <button onClick={onClose} className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-bold hover:bg-muted">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const BooksTab = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<BookForm>(blankBook);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);

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
    if (!form.title) return toast.error("Title is required");
    setSaving(true);
    const baseSlug = form.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "book";
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await supabase.from("books").insert({
      ...form,
      slug,
      original_price: form.original_price || null,
      cover_url: form.cover_url || null,
      description: form.description || null,
      author: form.author || null,
      subject: form.subject || null,
      target_exam: form.target_exam || null,
      class_level: form.class_level || null,
    });
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
        <h2 className="mb-4 flex items-center gap-2 font-bold">
          <Plus className="h-4 w-4" /> Add Book
        </h2>
        <BookFormFields form={form} setForm={setForm} />
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
                <th className="px-4 py-3">Cover</th>
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
                  <td className="px-4 py-3">
                    <div className="flex h-14 w-10 items-center justify-center overflow-hidden rounded border border-border bg-muted">
                      {b.cover_url ? (
                        <img src={b.cover_url} alt={b.title} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </td>
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
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setEditing(b)} className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(b.id)} className="rounded-lg border border-border bg-background p-1.5 text-destructive hover:bg-muted" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {books.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    No books yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <EditBookModal book={editing} onClose={() => setEditing(null)} onSaved={load} />
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
