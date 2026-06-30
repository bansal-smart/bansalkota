import { useEffect, useState } from "react";
import { Loader2, Plus, Users, Trash2, Globe, Copy, Pencil, Info, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CBT_KIOSK_URL, SECRET_ADMIN_URL } from "@/lib/brand";

type CourseRow = { id: string; name: string; slug: string };
type BatchRow = {
  id: string;
  code: string;
  name: string;
  class_level: string | null;
  is_active: boolean;
  course_id: string;
  centre_id: string | null;
};

const CLASS_OPTIONS = ["VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"];

const AdminBatchesPage = () => {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ courseId: "", code: "", name: "", class_level: "XI" });
  const [editing, setEditing] = useState<BatchRow | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: cs }, { data: bs }] = await Promise.all([
      supabase.from("courses").select("id, name, slug").order("name"),
      supabase.from("course_batches").select("*").order("code"),
    ]);
    setCourses((cs ?? []) as CourseRow[]);
    setBatches((bs ?? []) as BatchRow[]);

    const { data: profs } = await supabase
      .from("profiles")
      .select("batch_id")
      .not("batch_id", "is", null);
    const counts: Record<string, number> = {};
    (profs ?? []).forEach((p: { batch_id: string | null }) => {
      if (!p.batch_id) return;
      counts[p.batch_id] = (counts[p.batch_id] ?? 0) + 1;
    });
    setStudentCounts(counts);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createBatch = async () => {
    if (!form.courseId || !form.code) return toast.error("Course and code are required");
    const { error } = await supabase.from("course_batches").insert({
      course_id: form.courseId,
      code: form.code.trim(),
      name: form.name.trim() || form.code.trim(),
      class_level: form.class_level || null,
      is_active: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Batch created");
    setForm({ courseId: "", code: "", name: "", class_level: "XI" });
    load();
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.course_id || !editing.code.trim()) return toast.error("Course and code are required");
    setSavingEdit(true);
    const { error } = await supabase.from("course_batches")
      .update({
        course_id: editing.course_id,
        code: editing.code.trim(),
        name: editing.name.trim() || editing.code.trim(),
        class_level: editing.class_level,
        is_active: editing.is_active,
      })
      .eq("id", editing.id);
    setSavingEdit(false);
    if (error) return toast.error(error.message);
    toast.success("Batch updated");
    setEditing(null);
    load();
  };

  const deleteBatch = async (id: string) => {
    if (!confirm("Delete this batch? Students tagged to it will be untagged.")) return;
    const { error } = await supabase.from("course_batches").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  // Group batches by course for display
  const grouped = courses
    .map((c) => ({ course: c, items: batches.filter((b) => b.course_id === c.id) }))
    .filter((g) => g.items.length > 0);
  const orphans = batches.filter((b) => !courses.find((c) => c.id === b.course_id));

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Course Batches</h1>
        <p className="text-xs text-muted-foreground">Each batch belongs to a course. A single course can have many batches. Used for offline cohorts, CBT gating, and reporting.</p>
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-foreground">
          To enrol students into batches in bulk, go to{" "}
          <Link to="/admin/students" className="font-bold text-primary underline">Students → Bulk Import</Link>
          {" "}and include a <code className="rounded bg-background px-1 py-0.5 font-mono">batch_code</code> column matching the batch codes below.
        </div>
      </div>

      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold uppercase tracking-wider text-primary">CBT Kiosk Link</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-foreground truncate">{CBT_KIOSK_URL}</p>
            <p className="text-[10px] text-muted-foreground">Single fixed link for all CBT tests</p>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(CBT_KIOSK_URL); toast.success("Kiosk link copied"); }}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 inline-flex items-center gap-1.5 shrink-0">
            <Copy className="h-3.5 w-3.5" /> Copy Link
          </button>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Open this URL on lab computers in kiosk mode. Students log in with their roll number + mobile and see every live CBT test for their batch.</p>
      </div>

      <div className="rounded-2xl border border-bansal-navy/30 bg-bansal-navy/5 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-4 w-4 text-bansal-navy" />
          <p className="text-xs font-bold uppercase tracking-wider text-bansal-navy">Secret Admin URL · super_admin only</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-foreground truncate">{SECRET_ADMIN_URL}</p>
            <p className="text-[10px] text-muted-foreground">Hidden command-centre entry — not linked anywhere public.</p>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(SECRET_ADMIN_URL); toast.success("Secret URL copied"); }}
            className="rounded-lg bg-bansal-navy px-3 py-2 text-xs font-bold text-white hover:opacity-90 inline-flex items-center gap-1.5 shrink-0">
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-bold text-foreground mb-3">Add a new batch</p>
        <div className="grid md:grid-cols-5 gap-3">
          <select
            value={form.courseId}
            onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Course…</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="Code e.g. XI-J1" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Display name (optional)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <select value={form.class_level} onChange={(e) => setForm({ ...form, class_level: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={createBatch}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground inline-flex items-center justify-center gap-1 hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> Create batch
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : batches.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">No batches yet.</div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ course, items }) => (
            <div key={course.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="bg-muted/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground">
                {course.name} <span className="text-muted-foreground font-medium normal-case">· {items.length} batch{items.length === 1 ? "" : "es"}</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/20">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Code</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Class</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Students</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <td className="px-4 py-2 font-mono text-xs">{b.code}</td>
                      <td className="px-4 py-2">{b.name}</td>
                      <td className="px-4 py-2">{b.class_level ?? "—"}</td>
                      <td className="px-4 py-2">
                        {b.is_active
                          ? <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Active</span>
                          : <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">Inactive</span>}
                      </td>
                      <td className="px-4 py-2"><span className="inline-flex items-center gap-1 text-xs"><Users className="h-3 w-3" /> {studentCounts[b.id] ?? 0}</span></td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => setEditing(b)} title="Edit batch" className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteBatch(b.id)} title="Delete batch" className="rounded p-1.5 text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {orphans.length > 0 && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 overflow-hidden">
              <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-destructive">Batches without a valid course</div>
              <table className="w-full text-sm">
                <tbody>
                  {orphans.map((b) => (
                    <tr key={b.id} className="border-t border-destructive/20">
                      <td className="px-4 py-2 font-mono text-xs">{b.code}</td>
                      <td className="px-4 py-2">{b.name}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => setEditing(b)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteBatch(b.id)} className="rounded p-1.5 text-destructive hover:bg-destructive/10 ml-1">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !savingEdit && setEditing(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-5">
              <div className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" />
                <h2 className="font-bold">Edit Batch</h2>
              </div>
              <button onClick={() => !savingEdit && setEditing(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Course *</label>
                <select
                  value={editing.course_id}
                  onChange={(e) => setEditing({ ...editing, course_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select course…</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground">Code *</label>
                  <input
                    value={editing.code}
                    onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground">Class</label>
                  <select
                    value={editing.class_level ?? ""}
                    onChange={(e) => setEditing({ ...editing, class_level: e.target.value || null })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Display name</label>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.is_active}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                />
                Active
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border p-5">
              <button onClick={() => setEditing(null)} disabled={savingEdit}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={savingEdit}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 inline-flex items-center gap-2 disabled:opacity-60">
                {savingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBatchesPage;
