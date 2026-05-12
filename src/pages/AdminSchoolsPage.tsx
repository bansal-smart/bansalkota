import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { School, Plus, Edit3, Trash2, Loader2, X, Upload, Users, ChevronRight, Copy } from "lucide-react";

type SchoolRow = {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  country: string | null;
  board: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  student_count?: number;
};

type Draft = Partial<SchoolRow> & { name: string };
const empty: Draft = { name: "", board: "CBSE", is_active: true };

const BOARDS = ["CBSE", "ICSE", "IB", "CBSE-i", "State Board", "Other"];

type CsvRow = { full_name?: string; email?: string; phone?: string; class_level?: string; target_exam?: string; city?: string };
type ResultRow = { email: string | null; status: string; error?: string; temp_password?: string | null };

const AdminSchoolsPage = () => {
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SchoolRow | null>(null);
  const [students, setStudents] = useState<Array<{ user_id: string; full_name: string | null; class_level: string | null; target_exam: string | null }>>([]);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);

  const reload = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("schools").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    const list: SchoolRow[] = data ?? [];

    if (list.length) {
      const ids = list.map((s) => s.id);
      const { data: counts } = await (supabase as any)
        .from("profiles").select("school_id").in("school_id", ids);
      const map = new Map<string, number>();
      (counts ?? []).forEach((r: any) => map.set(r.school_id, (map.get(r.school_id) ?? 0) + 1));
      list.forEach((s) => (s.student_count = map.get(s.id) ?? 0));
    }
    setSchools(list);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const loadStudents = async (s: SchoolRow) => {
    setSelected(s);
    setStudents([]);
    const { data } = await (supabase as any)
      .from("profiles").select("user_id, full_name, class_level, target_exam")
      .eq("school_id", s.id).order("full_name", { ascending: true });
    setStudents(data ?? []);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name?.trim()) return toast.error("Name is required");
    setSaving(true);
    const payload: any = {
      name: editing.name.trim(),
      code: editing.code?.trim() || null,
      city: editing.city?.trim() || null,
      country: editing.country?.trim() || null,
      board: editing.board || null,
      contact_person: editing.contact_person?.trim() || null,
      contact_email: editing.contact_email?.trim() || null,
      contact_phone: editing.contact_phone?.trim() || null,
      address: editing.address?.trim() || null,
      is_active: editing.is_active ?? true,
    };
    const { error } = editing.id
      ? await (supabase as any).from("schools").update(payload).eq("id", editing.id)
      : await (supabase as any).from("schools").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing.id ? "School updated" : "School created");
    setEditing(null);
    reload();
  };

  const remove = async (s: SchoolRow) => {
    if (!confirm(`Delete "${s.name}"? Students will keep their accounts but be unlinked.`)) return;
    const { error } = await (supabase as any).from("schools").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    reload();
  };

  const parseCsv = (text: string): CsvRow[] => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const cells = line.split(",").map((c) => c.trim());
      const row: CsvRow = {};
      headers.forEach((h, i) => {
        const v = cells[i] ?? "";
        if (!v) return;
        if (["full_name", "email", "phone", "class_level", "target_exam", "city"].includes(h)) {
          (row as any)[h] = v;
        }
      });
      return row;
    }).filter((r) => r.email);
  };

  const parsedRows = useMemo(() => parseCsv(csvText), [csvText]);

  const upload = async () => {
    if (!selected) return;
    if (!parsedRows.length) return toast.error("No valid rows. Header must include 'email'.");
    setUploading(true);
    setResults(null);
    const { data, error } = await supabase.functions.invoke("bulk-onboard-school-students", {
      body: { school_id: selected.id, rows: parsedRows },
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    setResults((data as any)?.results ?? []);
    const s = (data as any)?.summary;
    toast.success(`${s?.created ?? 0} created · ${s?.linked_existing ?? 0} linked · ${s?.errors ?? 0} errors`);
    loadStudents(selected);
  };

  const filtered = schools.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.code ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <School className="h-5 w-5 text-primary" /> Schools
          </h1>
          <p className="text-sm text-muted-foreground">Add partner schools and bulk-onboard their students.</p>
        </div>
        <button onClick={() => setEditing({ ...empty })}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 inline-flex items-center gap-1">
          <Plus className="h-4 w-4" /> New School
        </button>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or code…"
        className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-sm" />

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr className="text-left">
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Code</th>
                <th className="px-3 py-2 font-semibold">City</th>
                <th className="px-3 py-2 font-semibold">Board</th>
                <th className="px-3 py-2 font-semibold">Students</th>
                <th className="px-3 py-2 font-semibold w-24">Status</th>
                <th className="px-3 py-2 w-40" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2 font-bold text-foreground">{s.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{s.code || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{s.city || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{s.board || "—"}</td>
                  <td className="px-3 py-2"><span className="inline-flex items-center gap-1 font-semibold"><Users className="h-3 w-3" />{s.student_count ?? 0}</span></td>
                  <td className="px-3 py-2">{s.is_active ? <span className="text-secondary font-bold">Active</span> : <span className="text-muted-foreground">Inactive</span>}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => loadStudents(s)} className="p-1 hover:bg-muted rounded" title="View students"><ChevronRight className="h-4 w-4" /></button>
                    <button onClick={() => setEditing({ ...s })} className="p-1 hover:bg-muted rounded ml-1"><Edit3 className="h-4 w-4" /></button>
                    <button onClick={() => remove(s)} className="p-1 hover:bg-destructive/10 text-destructive rounded ml-1"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No schools yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit dialog */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-card rounded-xl shadow-xl max-w-lg w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing.id ? "Edit School" : "New School"}</h2>
              <button onClick={() => setEditing(null)} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <Field label="Name *"><Input v={editing.name} on={(v) => setEditing({ ...editing, name: v })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Code"><Input v={editing.code ?? ""} on={(v) => setEditing({ ...editing, code: v })} /></Field>
              <Field label="Board">
                <select value={editing.board ?? ""} onChange={(e) => setEditing({ ...editing, board: e.target.value })} className="sch-input">
                  <option value="">—</option>
                  {BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="City"><Input v={editing.city ?? ""} on={(v) => setEditing({ ...editing, city: v })} /></Field>
              <Field label="Country"><Input v={editing.country ?? ""} on={(v) => setEditing({ ...editing, country: v })} /></Field>
            </div>
            <Field label="Contact person"><Input v={editing.contact_person ?? ""} on={(v) => setEditing({ ...editing, contact_person: v })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Contact email"><Input v={editing.contact_email ?? ""} on={(v) => setEditing({ ...editing, contact_email: v })} /></Field>
              <Field label="Contact phone"><Input v={editing.contact_phone ?? ""} on={(v) => setEditing({ ...editing, contact_phone: v })} /></Field>
            </div>
            <Field label="Address">
              <textarea rows={2} value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} className="sch-input" />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
              Active
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* School detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-40 bg-black/50 flex justify-end" onClick={() => { setSelected(null); setResults(null); setCsvOpen(false); setCsvText(""); }}>
          <div className="bg-card w-full max-w-2xl h-full overflow-y-auto p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{selected.name}</h2>
                <p className="text-xs text-muted-foreground">{selected.city || "—"} · {selected.board || "—"}</p>
              </div>
              <button onClick={() => { setSelected(null); setResults(null); setCsvOpen(false); }} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setCsvOpen((v) => !v)} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground inline-flex items-center gap-1">
                <Upload className="h-4 w-4" /> Bulk upload students
              </button>
              <span className="text-sm text-muted-foreground">{students.length} student{students.length === 1 ? "" : "s"} associated</span>
            </div>

            {csvOpen && (
              <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Paste CSV with header row. Columns: <code>full_name, email, phone, class_level, target_exam, city</code>. Email is required.
                </p>
                <textarea rows={8} value={csvText} onChange={(e) => setCsvText(e.target.value)}
                  placeholder={"full_name,email,phone,class_level,target_exam,city\nAarav Sharma,aarav@example.com,9999999999,12,JEE Main,Delhi"}
                  className="sch-input font-mono text-xs" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{parsedRows.length} valid row{parsedRows.length === 1 ? "" : "s"} parsed</span>
                  <button onClick={upload} disabled={uploading || !parsedRows.length}
                    className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">
                    {uploading ? "Onboarding..." : `Onboard ${parsedRows.length}`}
                  </button>
                </div>
              </div>
            )}

            {results && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-3 py-2 bg-muted text-xs font-bold uppercase tracking-wider">Onboarding results</div>
                <table className="w-full text-xs">
                  <thead className="bg-muted/50"><tr><th className="px-2 py-1 text-left">Email</th><th className="px-2 py-1 text-left">Status</th><th className="px-2 py-1 text-left">Temp password / Error</th></tr></thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-2 py-1">{r.email}</td>
                        <td className={`px-2 py-1 font-semibold ${r.status === "error" ? "text-destructive" : r.status === "created" ? "text-secondary" : "text-foreground"}`}>{r.status}</td>
                        <td className="px-2 py-1">
                          {r.error ?? (r.temp_password ? (
                            <span className="inline-flex items-center gap-1 font-mono">
                              {r.temp_password}
                              <button onClick={() => { navigator.clipboard.writeText(r.temp_password!); toast.success("Copied"); }} className="p-0.5 hover:bg-muted rounded"><Copy className="h-3 w-3" /></button>
                            </span>
                          ) : "—")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-2 bg-muted text-xs font-bold uppercase tracking-wider">Students</div>
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-left"><th className="px-2 py-1">Name</th><th className="px-2 py-1">Class</th><th className="px-2 py-1">Target Exam</th></tr></thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.user_id} className="border-t border-border">
                      <td className="px-2 py-1">{s.full_name || "—"}</td>
                      <td className="px-2 py-1 text-muted-foreground">{s.class_level || "—"}</td>
                      <td className="px-2 py-1 text-muted-foreground">{s.target_exam || "—"}</td>
                    </tr>
                  ))}
                  {students.length === 0 && <tr><td colSpan={3} className="px-2 py-6 text-center text-muted-foreground">No students yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style>{`.sch-input { width: 100%; border: 1px solid hsl(var(--border)); background: hsl(var(--background)); border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; } .sch-input:focus { border-color: hsl(var(--primary)); }`}</style>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</span>
    {children}
  </label>
);

const Input = ({ v, on }: { v: string | undefined | null; on: (s: string) => void }) => (
  <input value={v ?? ""} onChange={(e) => on(e.target.value)} className="sch-input" />
);

export default AdminSchoolsPage;
