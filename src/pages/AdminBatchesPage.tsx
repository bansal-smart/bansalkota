import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Users, Database, Trash2, Globe, Copy, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import roster from "@/data/cbtRoster.json";
import { CBT_KIOSK_URL, SECRET_ADMIN_URL } from "@/lib/brand";

type ImportRow = {
  roll_number: string;
  full_name: string;
  phone: string;
  dob: string | null;
  course: string;
  stream: string;
  batch_code: string;
  class_level: string;
};

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

  // XLSX import state
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [parsedFileName, setParsedFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<Array<{ roll_number: string; error?: string }>>([]);

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

  // ----- Excel import (RegNo / StudentName / CONTACTNO / Dob / COURSE / STREAM / BATCH) -----
  const deriveClassLevel = (batch: string): string => {
    const m = batch.trim().toUpperCase().match(/^(XIII|XII|XI|X|IX)\b/);
    return m ? m[1] : "XI";
  };

  const excelDateToISO = (v: unknown): string | null => {
    if (v == null || v === "") return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === "number") {
      // Excel serial date
      const d = XLSX.SSF.parse_date_code(v);
      if (!d) return null;
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
    }
    const s = String(v).trim();
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
  };

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      const mapped: ImportRow[] = rows
        .map((r) => {
          const get = (...keys: string[]): string => {
            for (const k of keys) {
              const found = Object.keys(r).find((kk) => kk.trim().toLowerCase() === k.toLowerCase());
              if (found && r[found] != null && String(r[found]).trim() !== "") return String(r[found]).trim();
            }
            return "";
          };
          const batch = get("BATCH", "batch_code");
          return {
            roll_number: get("RegNo", "roll_number", "Roll No", "ROLL NO").replace(/\.0$/, ""),
            full_name: get("StudentName", "full_name", "Name"),
            phone: get("CONTACTNO", "phone", "Mobile").replace(/\.0$/, "").replace(/\D/g, "").slice(-10),
            dob: excelDateToISO(r[Object.keys(r).find((k) => k.trim().toLowerCase() === "dob") ?? ""] ?? null),
            course: get("COURSE", "course"),
            stream: get("STREAM", "stream") || "JEE",
            batch_code: batch,
            class_level: deriveClassLevel(batch),
          };
        })
        .filter((r) => r.roll_number && r.full_name && r.phone && r.batch_code);
      if (!mapped.length) {
        toast.error("No valid rows found. Check column headers: RegNo, StudentName, CONTACTNO, COURSE, STREAM, BATCH.");
        return;
      }
      setParsedRows(mapped);
      setParsedFileName(file.name);
      setImportErrors([]);
      toast.success(`Parsed ${mapped.length} students from ${file.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read Excel file");
    }
  };

  const submitImport = async () => {
    if (!parsedRows.length) return;
    setImporting(true);
    setImportErrors([]);
    try {
      const { data, error } = await supabase.functions.invoke("cbt-bulk-setup", {
        body: { rows: parsedRows },
      });
      if (error) throw error;
      const payload = data as {
        summary?: { total: number; created: number; updated: number; errors: number };
        results?: Array<{ roll_number: string; status: string; error?: string }>;
      };
      const summary = payload?.summary;
      if (summary) {
        toast.success(`Import done · ${summary.created} created · ${summary.updated} updated · ${summary.errors} errors`);
      } else {
        toast.success("Import finished");
      }
      const errs = (payload?.results ?? []).filter((r) => r.status === "error");
      setImportErrors(errs);
      if (!errs.length) {
        setParsedRows([]);
        setParsedFileName("");
        if (fileRef.current) fileRef.current.value = "";
      }
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const uniqueBatchesInParse = Array.from(new Set(parsedRows.map((r) => r.batch_code)));
  const uniqueCoursesInParse = Array.from(new Set(parsedRows.map((r) => r.course)));



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

      {/* Excel Importer */}
      <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-card p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2"><FileSpreadsheet className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="text-sm font-bold text-foreground">Import students from Excel</p>
              <p className="text-[11px] text-muted-foreground">Columns expected: <code>RegNo · StudentName · CONTACTNO · Dob · COURSE · STREAM · BATCH</code></p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:bg-muted">
            <Upload className="h-3.5 w-3.5" /> Choose .xlsx file
          </button>
        </div>

        {parsedRows.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="rounded-full bg-primary/10 px-2 py-1 font-bold text-primary">{parsedFileName}</span>
              <span className="rounded-full bg-secondary/10 px-2 py-1 font-bold text-secondary">{parsedRows.length} students</span>
              <span className="rounded-full bg-muted px-2 py-1 font-medium text-foreground">Courses: {uniqueCoursesInParse.join(", ")}</span>
              <span className="rounded-full bg-muted px-2 py-1 font-medium text-foreground">Batches: {uniqueBatchesInParse.join(", ")}</span>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">Roll</th><th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Phone</th><th className="p-2 text-left">Course</th>
                    <th className="p-2 text-left">Batch</th><th className="p-2 text-left">Class</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 10).map((r) => (
                    <tr key={r.roll_number} className="border-t border-border">
                      <td className="p-2 font-mono">{r.roll_number}</td>
                      <td className="p-2">{r.full_name}</td>
                      <td className="p-2 font-mono">{r.phone}</td>
                      <td className="p-2">{r.course}</td>
                      <td className="p-2 font-bold text-primary">{r.batch_code}</td>
                      <td className="p-2">{r.class_level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 10 && (
                <div className="bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground text-center">
                  + {parsedRows.length - 10} more rows
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={submitImport}
                disabled={importing}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                Import {parsedRows.length} students
              </button>
              <button
                onClick={() => { setParsedRows([]); setParsedFileName(""); setImportErrors([]); if (fileRef.current) fileRef.current.value = ""; }}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground">
                Clear
              </button>
            </div>
            {importErrors.length > 0 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-[11px]">
                <p className="font-bold text-destructive mb-1">{importErrors.length} row(s) failed:</p>
                <ul className="space-y-0.5 max-h-32 overflow-auto">
                  {importErrors.map((e) => (
                    <li key={e.roll_number} className="font-mono text-destructive/80">{e.roll_number} — {e.error ?? "unknown error"}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
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
