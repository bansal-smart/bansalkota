import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Download, X, ChevronLeft, ChevronRight, Loader2, Trash2, Save, Mail, GraduationCap, UserPlus, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import BulkCsvDialog, { type BulkServerResult } from "@/components/BulkCsvDialog";
import TablePagination from "@/components/TablePagination";

type StudentRow = {
  user_id: string;
  full_name: string | null;
  father_name: string | null;
  phone: string | null;
  parent_phone: string | null;
  avatar_url: string | null;
  country: string | null;
  city: string | null;
  target_exam: string | null;
  class_level: string | null;
  goal: string | null;
  plan: string;
  is_suspended: boolean;
  onboarding_completed: boolean;
  doubt_preference: string;
  created_at: string;
  email?: string | null;
  roll_number: string | null;
  dob: string | null;
  centre_id?: string | null;
  centre_name?: string | null;
  batch_id?: string | null;
  batch_name?: string | null;
  batch_label?: string | null;
};

type CentreLite = { id: string; city: string; area: string | null; slug: string };
type BatchLite = { id: string; name: string; code: string | null };
type CourseLite = { id: string; name: string };

const STREAM_OPTIONS = ["JEE", "NEET", "Foundation", "Olympiad"];
const CLASS_OPTIONS = ["VI", "VII", "VIII", "IX", "X", "XI", "XII", "Dropper"];

const PAGE_SIZE = 25;

const centreLabel = (c: { city: string; area: string | null }) =>
  c.area ? `${c.city} — ${c.area}` : c.city;


const exportCsv = (rows: StudentRow[]) => {
  const header = [
    "Roll No", "Student Name", "Father's Name", "Contact No.", "Parent No.",
    "DOB", "Stream", "Class", "Batch", "Centre", "Email", "Plan", "Joined",
  ];
  const lines = rows.map((u) =>
    [
      u.roll_number ?? "", u.full_name ?? "", u.father_name ?? "",
      u.phone ?? "", u.parent_phone ?? "",
      u.dob ?? "", u.target_exam ?? "", u.class_level ?? "",
      u.batch_name ?? u.batch_label ?? "", u.centre_name ?? "",
      u.email ?? "", u.plan,
      new Date(u.created_at).toISOString(),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const PLAN_OPTIONS = ["Free", "Pro", "Elite"];

function CoursesMultiSelect({
  label,
  courses,
  value,
  onChange,
}: {
  label: string;
  courses: CourseLite[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selectedSet = new Set(value);
  const filtered = courses.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (id: string) => {
    if (selectedSet.has(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };
  const selectedNames = courses.filter((c) => selectedSet.has(c.id)).map((c) => c.name);
  return (
    <div className="text-xs font-semibold text-muted-foreground space-y-1">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="text-[10px] text-muted-foreground">{value.length} selected</span>
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary hover:bg-muted/40"
      >
        {selectedNames.length
          ? selectedNames.slice(0, 3).join(", ") + (selectedNames.length > 3 ? ` +${selectedNames.length - 3} more` : "")
          : "Select courses..."}
      </button>
      {open && (
        <div className="rounded-lg border border-border bg-background p-2 max-h-56 overflow-y-auto space-y-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search courses..."
            className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
          />
          {filtered.length === 0 && (
            <div className="text-[11px] text-muted-foreground px-2 py-1">No courses found</div>
          )}
          {filtered.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-xs font-medium text-foreground px-2 py-1 rounded hover:bg-muted/50 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedSet.has(c.id)}
                onChange={() => toggle(c.id)}
              />
              <span className="truncate">{c.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}


const AdminStudentsPage = () => {

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [drawer, setDrawer] = useState<StudentRow | null>(null);
  const [edit, setEdit] = useState<Partial<StudentRow>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<StudentRow | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [centres, setCentres] = useState<CentreLite[]>([]);
  const [batches, setBatches] = useState<BatchLite[]>([]);
  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [centreFilter, setCentreFilter] = useState<string>(""); // "", "none", or centre id
  const [bulkOpen, setBulkOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const emptyAdd = {
    roll_number: "", full_name: "", father_name: "", phone: "", parent_phone: "",
    dob: "", target_exam: "", class_level: "", batch: "", centre: "",
  };
  const [addForm, setAddForm] = useState<Record<string, string>>(emptyAdd);
  const [addCourseIds, setAddCourseIds] = useState<string[]>([]);
  const [editCourseIds, setEditCourseIds] = useState<string[]>([]);

  const submitAddStudent = async () => {
    if (!addForm.roll_number.trim() || !addForm.full_name.trim() || !addForm.centre.trim()) {
      return toast.error("Roll No, Student Name and Centre are required");
    }
    setAddSaving(true);
    try {
      const row: Record<string, any> = {};
      Object.entries(addForm).forEach(([k, v]) => { row[k] = v.trim() === "" ? null : v.trim(); });
      if (addCourseIds.length) row.course_ids = addCourseIds;
      const { data, error } = await supabase.functions.invoke("bulk-import", {
        body: { kind: "students", rows: [row], dry_run: false },
      });
      if (error) throw new Error(error.message);
      const res = data as BulkServerResult;
      if (res.errors > 0) {
        throw new Error(res.results.find((r) => !r.ok)?.error || "Failed to add student");
      }
      toast.success("Student added");
      setAddOpen(false);
      setAddForm(emptyAdd);
      setAddCourseIds([]);
      load();
    } catch (e: any) {
      toast.error("Add failed", { description: e.message });
    } finally {
      setAddSaving(false);
    }
  };

  useEffect(() => {
    (async () => {
      const [{ data: cs }, { data: bs }, { data: crs }] = await Promise.all([
        (supabase as any).from("centres").select("id, city, area, slug").order("city"),
        (supabase as any).from("course_batches").select("id, name, code").order("name"),
        (supabase as any).from("courses").select("id, name").order("name"),
      ]);
      setCentres((cs as CentreLite[]) ?? []);
      setBatches((bs as BatchLite[]) ?? []);
      setCourses((crs as CourseLite[]) ?? []);
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Get user_ids that have the student role, excluding anyone who also holds a staff role
      // (handle_new_user auto-grants 'student' to every new auth user, including centre/teacher/admin staff).
      const { data: roleRows, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rErr) throw rErr;
      const studentSet = new Set<string>();
      const staffSet = new Set<string>();
      (roleRows ?? []).forEach((r: { user_id: string; role: string }) => {
        if (r.role === "student") studentSet.add(r.user_id);
        else if (["center_admin", "admin", "super_admin", "teacher", "mentor"].includes(r.role)) staffSet.add(r.user_id);
      });
      const studentIds = Array.from(studentSet).filter((id) => !staffSet.has(id));
      if (!studentIds.length) {
        setRows([]); setTotal(0); setLoading(false); return;
      }

      let query = (supabase as any)
        .from("profiles")
        .select(
          "user_id, full_name, father_name, phone, parent_phone, avatar_url, country, city, target_exam, class_level, goal, plan, is_suspended, onboarding_completed, doubt_preference, created_at, roll_number, dob, centre_id, batch_id, batch_label",
          { count: "exact" },
        )
        .in("user_id", studentIds)
        .order("created_at", { ascending: false });

      if (debouncedSearch.trim()) {
        const s = debouncedSearch.trim();
        query = query.or(`full_name.ilike.%${s}%,phone.ilike.%${s}%,city.ilike.%${s}%,target_exam.ilike.%${s}%,roll_number.ilike.%${s}%`);
      }
      if (centreFilter === "none") query = query.is("centre_id", null);
      else if (centreFilter) query = query.eq("centre_id", centreFilter);

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count, error } = await query.range(from, to);
      if (error) throw error;

      const baseRows = (data ?? []) as StudentRow[];
      const centreMap = new Map(centres.map((c) => [c.id, centreLabel(c)]));
      const batchMap = new Map(batches.map((b) => [b.id, b.name]));
      baseRows.forEach((r) => {
        r.centre_name = r.centre_id ? centreMap.get(r.centre_id) ?? null : null;
        r.batch_name = r.batch_id ? batchMap.get(r.batch_id) ?? null : null;
      });

      // Fetch emails via edge function for visible rows
      let emails: Record<string, string | null> = {};
      if (baseRows.length) {
        const { data: emailData } = await supabase.functions.invoke("manage-student", {
          body: { action: "get_emails", user_ids: baseRows.map((r) => r.user_id) },
        });
        emails = emailData?.emails ?? {};
      }
      setRows(baseRows.map((r) => ({ ...r, email: emails[r.user_id] ?? null })));
      setTotal(count ?? 0);
    } catch (e: any) {
      toast.error("Failed to load students", { description: e.message });

    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, centreFilter, centres, batches]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: refresh when profiles or roles change
  useEffect(() => {
    const ch = supabase
      .channel("admin-students-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allSelected = useMemo(() => rows.length > 0 && rows.every((r) => selected.includes(r.user_id)), [rows, selected]);

  const openDrawer = async (u: StudentRow) => {
    setDrawer(u);
    setEdit({
      roll_number: u.roll_number ?? "",
      full_name: u.full_name ?? "",
      father_name: u.father_name ?? "",
      phone: u.phone ?? "",
      parent_phone: u.parent_phone ?? "",
      dob: u.dob ?? "",
      target_exam: u.target_exam ?? "",
      class_level: u.class_level ?? "",
      batch_id: u.batch_id ?? "",
      centre_id: u.centre_id ?? "",
      city: u.city ?? "",
      country: u.country ?? "",
    });
    setEditCourseIds([]);
    const { data: er } = await (supabase as any)
      .from("enrollments")
      .select("course_id")
      .eq("user_id", u.user_id)
      .eq("is_active", true);
    setEditCourseIds(((er ?? []) as Array<{ course_id: string }>).map((r) => r.course_id));
  };

  const saveEdit = async () => {
    if (!drawer) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = { action: "update", user_id: drawer.user_id };
      Object.entries(edit).forEach(([k, v]) => {
        payload[k] = typeof v === "string" && v.trim() === "" ? null : v;
      });
      payload.course_ids = editCourseIds;
      const { error } = await supabase.functions.invoke("manage-student", { body: payload });
      if (error) throw error;
      toast.success("Student updated");
      setDrawer(null);
      load();
    } catch (e: any) {
      toast.error("Update failed", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleSuspend = async (u: StudentRow) => {
    const { error } = await supabase.from("profiles").update({ is_suspended: !u.is_suspended }).eq("user_id", u.user_id);
    if (error) return toast.error(error.message);
    toast.success(u.is_suspended ? "Student unsuspended" : "Student suspended");
    setDrawer(null);
    load();
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("manage-student", {
        body: { action: "delete", user_id: confirmDelete.user_id },
      });
      if (error) throw error;
      toast.success("Student deleted");
      setConfirmDelete(null);
      setDrawer(null);
      setSelected((s) => s.filter((id) => id !== confirmDelete.user_id));
      load();
    } catch (e: any) {
      toast.error("Delete failed", { description: e.message });
    } finally {
      setDeleting(false);
    }
  };

  const exportSelected = async () => {
    if (selected.length) {
      const target = rows.filter((r) => selected.includes(r.user_id));
      if (!target.length) return toast.error("Nothing to export");
      return exportCsv(target);
    }
    const tId = toast.loading("Preparing export…");
    try {
      const { data: roleRows, error: rErr } = await supabase
        .from("user_roles").select("user_id").eq("role", "student");
      if (rErr) throw rErr;
      const studentIds = Array.from(new Set((roleRows ?? []).map((r) => r.user_id)));
      if (!studentIds.length) { toast.dismiss(tId); return toast.error("Nothing to export"); }

      const all: StudentRow[] = [];
      const BATCH = 1000;
      for (let i = 0; i < studentIds.length; i += BATCH) {
        const slice = studentIds.slice(i, i + BATCH);
        let q = (supabase as any)
          .from("profiles")
          .select("user_id, full_name, father_name, phone, parent_phone, avatar_url, country, city, target_exam, class_level, goal, plan, is_suspended, onboarding_completed, doubt_preference, created_at, roll_number, dob, centre_id, batch_id, batch_label")
          .in("user_id", slice)
          .order("created_at", { ascending: false });
        if (debouncedSearch.trim()) {
          const s = debouncedSearch.trim();
          q = q.or(`full_name.ilike.%${s}%,phone.ilike.%${s}%,city.ilike.%${s}%,target_exam.ilike.%${s}%,roll_number.ilike.%${s}%`);
        }
        if (centreFilter === "none") q = q.is("centre_id", null);
        else if (centreFilter) q = q.eq("centre_id", centreFilter);

        let from = 0;
        while (true) {
          const { data, error } = await q.range(from, from + 999);
          if (error) throw error;
          const chunk = (data ?? []) as StudentRow[];
          all.push(...chunk);
          if (chunk.length < 1000) break;
          from += 1000;
        }
      }

      const centreMap = new Map(centres.map((c) => [c.id, centreLabel(c)]));
      const batchMap = new Map(batches.map((b) => [b.id, b.name]));
      all.forEach((r) => {
        r.centre_name = r.centre_id ? centreMap.get(r.centre_id) ?? null : null;
        r.batch_name = r.batch_id ? batchMap.get(r.batch_id) ?? null : null;
      });

      // Fetch emails in batches
      const emails: Record<string, string | null> = {};
      for (let i = 0; i < all.length; i += 200) {
        const ids = all.slice(i, i + 200).map((r) => r.user_id);
        const { data: emailData } = await supabase.functions.invoke("manage-student", {
          body: { action: "get_emails", user_ids: ids },
        });
        Object.assign(emails, emailData?.emails ?? {});
      }
      const withEmails = all.map((r) => ({ ...r, email: emails[r.user_id] ?? null }));
      toast.dismiss(tId);
      if (!withEmails.length) return toast.error("Nothing to export");
      exportCsv(withEmails);
      toast.success(`Exported ${withEmails.length} students`);
    } catch (e: any) {
      toast.dismiss(tId);
      toast.error("Export failed", { description: e.message });
    }
  };

  const doBulkDelete = async () => {
    if (!selected.length) return;
    setBulkDeleting(true);
    setBulkProgress({ done: 0, total: selected.length });
    let ok = 0;
    let fail = 0;
    for (const user_id of selected) {
      try {
        const { error } = await supabase.functions.invoke("manage-student", {
          body: { action: "delete", user_id },
        });
        if (error) throw error;
        ok++;
      } catch {
        fail++;
      }
      setBulkProgress((p) => ({ done: p.done + 1, total: p.total }));
    }
    setBulkDeleting(false);
    setConfirmBulkDelete(false);
    setSelected([]);
    toast.success(`Deleted ${ok} student${ok === 1 ? "" : "s"}${fail ? ` · ${fail} failed` : ""}`);
    load();
  };


  return (
    <div className="p-4 lg:p-6 space-y-4 pb-24 lg:pb-6">
      <div className="flex items-center justify-between flex-wrap gap-3 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Students</h1>
            <p className="text-xs text-muted-foreground">{total} total · live data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setAddForm(emptyAdd); setAddOpen(true); }}
            className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
          >
            <UserPlus className="h-3.5 w-3.5" /> Add Student
          </button>
          <button
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground"
          >
            <Upload className="h-3.5 w-3.5" /> Bulk enrollments
          </button>
          <button
            onClick={exportSelected}
            className="flex items-center gap-1.5 rounded-lg bg-[#0F1729] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0F1729]/90 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export {selected.length ? `(${selected.length})` : "All"}
          </button>
        </div>
      </div>

      <BulkCsvDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk import students"
        description="Upload a CSV/XLSX with one row per student. Existing students (matched by roll number or phone) are updated; new students are created automatically. Centre is matched by city name."
        fileBase="students"
        fields={[
          { key: "roll_number", label: "Roll No", required: true, example: "1001" },
          { key: "full_name", label: "Student Name", required: true, example: "Aviral Singh" },
          { key: "father_name", label: "Father's Name", example: "Ashok Kumar Singh" },
          { key: "phone", label: "Contact No.", example: "7857852344" },
          { key: "parent_phone", label: "Parent No.", example: "7909075201" },
          { key: "dob", label: "DOB", example: "2008-05-12" },
          { key: "target_exam", label: "Stream", example: "JEE" },
          { key: "class_level", label: "Class", example: "XI" },
          { key: "batch", label: "Batch", example: "Bull's Eye" },
          { key: "centre", label: "Centre", required: true, example: "Jamshedpur" },
        ]}
        bulkImport={async (rows, dryRun): Promise<BulkServerResult> => {
          const { data, error } = await supabase.functions.invoke("bulk-import", {
            body: { kind: "students", rows, dry_run: dryRun },
          });
          if (error) throw new Error(error.message);
          return data as BulkServerResult;
        }}
        onDone={() => load()}
      />

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !addSaving && setAddOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-card border border-border shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-5">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <h2 className="font-bold">Add Student</h2>
              </div>
              <button onClick={() => !addSaving && setAddOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { k: "roll_number", l: "Roll No *", ph: "1001", type: "text" },
                { k: "full_name", l: "Student Name *", ph: "Aviral Singh", type: "text" },
                { k: "father_name", l: "Father's Name", ph: "Ashok Kumar Singh", type: "text" },
                { k: "phone", l: "Contact No.", ph: "7857852344", type: "text" },
                { k: "parent_phone", l: "Parent No.", ph: "7909075201", type: "text" },
                { k: "dob", l: "DOB", ph: "", type: "date" },
                { k: "target_exam", l: "Stream", ph: "Select stream", type: "select", options: STREAM_OPTIONS },
                { k: "class_level", l: "Class", ph: "Select class", type: "select", options: CLASS_OPTIONS },
                { k: "centre", l: "Centre *", ph: "Select centre", type: "select", options: centres.map((c) => centreLabel(c)) },
              ] as Array<{ k: string; l: string; ph: string; type: string; options?: string[] }>).map((f) => (
                <label key={f.k} className="text-xs font-semibold text-muted-foreground space-y-1">
                  <span>{f.l}</span>
                  {f.type === "select" ? (
                    <select
                      value={addForm[f.k] ?? ""}
                      onChange={(e) => setAddForm((s) => ({ ...s, [f.k]: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    >
                      <option value="">{f.ph}</option>
                      {(f.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type}
                      value={addForm[f.k] ?? ""}
                      onChange={(e) => setAddForm((s) => ({ ...s, [f.k]: e.target.value }))}
                      placeholder={f.ph}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                  )}
                </label>
              ))}
              <div className="sm:col-span-2">
                <CoursesMultiSelect
                  label="Courses (assign one or more)"
                  courses={courses}
                  value={addCourseIds}
                  onChange={setAddCourseIds}
                />
              </div>
            </div>


            <div className="flex items-center justify-end gap-2 border-t border-border p-4">
              <button
                onClick={() => setAddOpen(false)}
                disabled={addSaving}
                className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitAddStudent}
                disabled={addSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {addSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                {addSaving ? "Adding..." : "Add Student"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name, phone, roll no, city, or target exam..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={centreFilter}
          onChange={(e) => { setCentreFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-border bg-background py-2 px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">All Centres</option>
          <option value="none">No centre assigned</option>
          {centres.map((c) => <option key={c.id} value={c.id}>{centreLabel(c)}</option>)}
        </select>
      </div>


      {selected.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3 flex-wrap">
          <span className="text-xs font-medium text-foreground">{selected.length} selected</span>
          <button
            onClick={() => exportCsv(rows.filter((r) => selected.includes(r.user_id)))}
            className="rounded-lg bg-background border border-border px-3 py-1 text-[10px] font-medium text-muted-foreground flex items-center gap-1"
          >
            <Download className="h-3 w-3" /> Export CSV
          </button>
          <button
            onClick={() => setConfirmBulkDelete(true)}
            className="rounded-lg bg-destructive px-3 py-1 text-[10px] font-bold text-destructive-foreground flex items-center gap-1 hover:bg-destructive/90"
          >
            <Trash2 className="h-3 w-3" /> Delete selected
          </button>
          <button
            onClick={() => setSelected([])}
            className="rounded-lg bg-background border border-border px-3 py-1 text-[10px] font-medium text-muted-foreground"
          >
            Clear
          </button>

        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in-up">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-background text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={allSelected}
                    onChange={(e) => setSelected(e.target.checked ? rows.map((u) => u.user_id) : [])}
                  />
                </th>
                <th className="p-3 text-left font-medium">Roll No</th>
                <th className="p-3 text-left font-medium">Name</th>
                <th className="p-3 text-left font-medium hidden xl:table-cell">Father's Name</th>
                <th className="p-3 text-left font-medium hidden sm:table-cell">Contact</th>
                <th className="p-3 text-left font-medium hidden xl:table-cell">Parent No.</th>
                <th className="p-3 text-left font-medium hidden xl:table-cell">DOB</th>
                <th className="p-3 text-left font-medium hidden lg:table-cell">Stream</th>
                <th className="p-3 text-left font-medium hidden lg:table-cell">Class</th>
                <th className="p-3 text-left font-medium hidden lg:table-cell">Batch</th>
                <th className="p-3 text-left font-medium hidden md:table-cell">Centre</th>
                <th className="p-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="p-10 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-10 text-center text-muted-foreground">No students found.</td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr
                    key={u.user_id}
                    onClick={() => openDrawer(u)}
                    className="border-b border-border hover:bg-background/50 cursor-pointer"
                  >
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={selected.includes(u.user_id)}
                        onChange={(e) =>
                          setSelected(e.target.checked ? [...selected, u.user_id] : selected.filter((id) => id !== u.user_id))
                        }
                      />
                    </td>
                    <td className="p-3 font-mono text-[11px] text-muted-foreground">{u.roll_number || "—"}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-[10px] font-bold text-primary shrink-0 overflow-hidden">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            (u.full_name ?? "U").split(" ").map((n) => n[0]).join("").slice(0, 2)
                          )}
                        </div>
                        <span className="font-medium text-foreground truncate">{u.full_name || "Unnamed"}</span>
                      </div>
                    </td>
                    <td className="p-3 hidden xl:table-cell text-muted-foreground truncate max-w-[160px]">{u.father_name || "—"}</td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground">{u.phone || "—"}</td>
                    <td className="p-3 hidden xl:table-cell text-muted-foreground">{u.parent_phone || "—"}</td>
                    <td className="p-3 hidden xl:table-cell text-muted-foreground">{u.dob ? new Date(u.dob).toLocaleDateString() : "—"}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">{u.target_exam || "—"}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">{u.class_level || "—"}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground truncate max-w-[140px]">{u.batch_name || u.batch_label || "—"}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground truncate max-w-[140px]">{u.centre_name || "—"}</td>
                    <td className="p-3">
                      {u.is_suspended ? (

                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive uppercase">Suspended</span>
                      ) : (
                        <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary uppercase">Active</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TablePagination
        page={page + 1}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={(p) => setPage(p - 1)}
      />

      {/* Edit Modal */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !saving && setDrawer(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-card border border-border shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-xs font-bold text-primary overflow-hidden shrink-0">
                  {drawer.avatar_url ? (
                    <img src={drawer.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (drawer.full_name ?? "U").split(" ").map((n) => n[0]).join("").slice(0, 2)
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-foreground truncate">{drawer.full_name || "Edit Student"}</h2>
                  <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {drawer.email || "No email"}
                  </p>
                </div>
              </div>
              <button onClick={() => !saving && setDrawer(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { k: "roll_number", l: "Roll No", ph: "1001", type: "text" },
                { k: "full_name", l: "Student Name", ph: "Aviral Singh", type: "text" },
                { k: "father_name", l: "Father's Name", ph: "Ashok Kumar Singh", type: "text" },
                { k: "phone", l: "Contact No.", ph: "7857852344", type: "text" },
                { k: "parent_phone", l: "Parent No.", ph: "7909075201", type: "text" },
                { k: "dob", l: "DOB", ph: "", type: "date" },
                { k: "target_exam", l: "Stream", ph: "Select stream", type: "select", options: STREAM_OPTIONS.map((o) => ({ value: o, label: o })) },
                { k: "class_level", l: "Class", ph: "Select class", type: "select", options: CLASS_OPTIONS.map((o) => ({ value: o, label: o })) },
                { k: "batch_id", l: "Batch (optional)", ph: "Select batch", type: "select", options: batches.map((b) => ({ value: b.id, label: b.code ? `${b.name} · ${b.code}` : b.name })) },
                { k: "centre_id", l: "Centre", ph: "Select centre", type: "select", options: centres.map((c) => ({ value: c.id, label: centreLabel(c) })) },
              ] as Array<{ k: string; l: string; ph: string; type: string; options?: Array<{ value: string; label: string }> }>).map((f) => (
                <label key={f.k} className="text-xs font-semibold text-muted-foreground space-y-1">
                  <span>{f.l}</span>
                  {f.type === "select" ? (
                    <select
                      value={((edit as any)[f.k] as string) ?? ""}
                      onChange={(e) => setEdit((s) => ({ ...s, [f.k]: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    >
                      <option value="">{f.ph}</option>
                      {(f.options ?? []).map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type}
                      value={((edit as any)[f.k] as string) ?? ""}
                      onChange={(e) => setEdit((s) => ({ ...s, [f.k]: e.target.value }))}
                      placeholder={f.ph}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                  )}
                </label>
              ))}
              <div className="sm:col-span-2">
                <CoursesMultiSelect
                  label="Courses (assigned)"
                  courses={courses}
                  value={editCourseIds}
                  onChange={setEditCourseIds}
                />
              </div>
            </div>


            <div className="px-5 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg">
              <div className="rounded-lg border border-border bg-background/50 p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Joined</p>
                <p className="text-xs font-medium text-foreground">{new Date(drawer.created_at).toLocaleDateString()}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Onboarding</p>
                <p className="text-xs font-medium text-foreground">{drawer.onboarding_completed ? "Done" : "Pending"}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Doubt routing</p>
                <p className="text-xs font-medium text-foreground capitalize">{drawer.doubt_preference}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Status</p>
                <p className={`text-xs font-medium ${drawer.is_suspended ? "text-destructive" : "text-secondary"}`}>
                  {drawer.is_suspended ? "Suspended" : "Active"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border p-4 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleSuspend(drawer)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                    drawer.is_suspended ? "border-secondary/30 text-secondary" : "border-destructive/30 text-destructive"
                  }`}
                >
                  {drawer.is_suspended ? "Unsuspend" : "Suspend"}
                </button>
                <button
                  onClick={() => setConfirmDelete(drawer)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => !saving && setDrawer(null)}
                  disabled={saving}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !deleting && setConfirmDelete(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-card p-5 border border-border shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 shrink-0">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-foreground">Delete student permanently?</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  This will permanently delete <span className="font-semibold text-foreground">{confirmDelete.full_name || "this student"}</span> and all their data (profile, progress, attempts, enrollments). This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                disabled={deleting}
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={doDelete}
                className="rounded-lg bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
                Delete forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm bulk delete */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !bulkDeleting && setConfirmBulkDelete(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-card p-5 border border-border shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 shrink-0">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-foreground">Delete {selected.length} student{selected.length === 1 ? "" : "s"}?</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  This will permanently delete the selected students and all their data (profiles, progress, attempts, enrollments). This action cannot be undone.
                </p>
                {bulkDeleting && (
                  <p className="mt-2 text-[11px] font-medium text-foreground">
                    Deleting {bulkProgress.done} / {bulkProgress.total}…
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                disabled={bulkDeleting}
                onClick={() => setConfirmBulkDelete(false)}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={bulkDeleting}
                onClick={doBulkDelete}
                className="rounded-lg bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                {bulkDeleting && <Loader2 className="h-3 w-3 animate-spin" />}
                Delete {selected.length} forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
};

export default AdminStudentsPage;
