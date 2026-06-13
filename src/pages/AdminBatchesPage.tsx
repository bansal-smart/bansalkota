import { useEffect, useState } from "react";
import { Loader2, Plus, Users, Database, Trash2, Globe, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import roster from "@/data/cbtRoster.json";

type CourseRow = { id: string; name: string; slug: string };
type BatchRow = {
  id: string;
  code: string;
  name: string;
  class_level: string | null;
  is_active: boolean;
  course_id: string;
  center_id: string | null;
};

const AdminBatchesPage = () => {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const [form, setForm] = useState({ courseId: "", code: "", name: "", class_level: "XI" });

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

  const deleteBatch = async (id: string) => {
    if (!confirm("Delete this batch? Students tagged to it will be untagged.")) return;
    const { error } = await supabase.from("course_batches").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const runImport = async () => {
    if (!confirm(`Run CBT bulk setup? This will create / refresh ${roster.length} students at the Kota centre and provision the matching courses & batches.`)) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("cbt-bulk-setup", {
        body: { rows: roster },
      });
      if (error) throw error;
      const summary = (data as { summary?: { total: number; created: number; updated: number; errors: number } })?.summary;
      if (summary) {
        toast.success(`Done · created ${summary.created}, updated ${summary.updated}, errors ${summary.errors}`);
      } else {
        toast.success("Bulk setup finished");
      }
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk setup failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Course Batches</h1>
          <p className="text-xs text-muted-foreground">J1/J2, V1/V2 etc. Used for offline cohorts, CBT gating, and reporting.</p>
        </div>
        <button
          onClick={runImport}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
          Run Kota CBT bulk setup ({roster.length} students)
        </button>
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
            <option value="XI">XI</option>
            <option value="XII">XII</option>
            <option value="XIII">XIII (Dropper)</option>
          </select>
          <button onClick={createBatch}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground inline-flex items-center justify-center gap-1 hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> Create batch
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : batches.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No batches yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Code</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Course</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Class</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Students</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => {
                const course = courses.find((c) => c.id === b.course_id);
                return (
                  <tr key={b.id} className="border-t border-border">
                    <td className="px-4 py-2 font-mono text-xs">{b.code}</td>
                    <td className="px-4 py-2">{b.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{course?.name ?? "—"}</td>
                    <td className="px-4 py-2">{b.class_level ?? "—"}</td>
                    <td className="px-4 py-2"><span className="inline-flex items-center gap-1 text-xs"><Users className="h-3 w-3" /> {studentCounts[b.id] ?? 0}</span></td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => deleteBatch(b.id)} className="text-destructive hover:opacity-80">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminBatchesPage;
