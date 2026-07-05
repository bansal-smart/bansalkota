import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import BulkCsvDialog, { type CsvField } from "@/components/BulkCsvDialog";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2, Users, UserPlus, X, Copy } from "lucide-react";

type Status = "active" | "inactive" | "passed_out" | "dropped";

type Student = {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  roll_number: string | null;
  target_exam: string | null;
  class_level: string | null;
  city: string | null;
  batch_id: string | null;
  student_status: Status;
  created_at: string;
  father_name: string | null;
  parent_phone: string | null;
  dob: string | null;
};

const STATUS_LABEL: Record<Status, string> = {
  active: "Active",
  inactive: "Inactive",
  passed_out: "Passed out",
  dropped: "Dropped",
};

const STATUS_COLOR: Record<Status, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-amber-100 text-amber-700",
  passed_out: "bg-blue-100 text-blue-700",
  dropped: "bg-rose-100 text-rose-700",
};

type Batch = { id: string; name: string; code: string | null };

const CenterStudentsPage = () => {
  const { primaryCenterId } = useCenterAdmin();
  const [items, setItems] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [streamFilter, setStreamFilter] = useState<string>("all");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Student | null>(null);

  const load = async () => {
    if (!primaryCenterId) return;
    setLoading(true);
    const [{ data, error }, { data: bs }] = await Promise.all([
      (supabase as any)
        .from("profiles")
        .select("id, user_id, full_name, phone, roll_number, target_exam, class_level, city, batch_id, student_status, created_at, father_name, parent_phone, dob")
        .eq("centre_id", primaryCenterId)
        .order("full_name", { ascending: true }),
      (supabase as any)
        .from("course_batches")
        .select("id, name, code")
        .eq("centre_id", primaryCenterId)
        .eq("is_active", true)
        .order("name"),
    ]);
    if (error) toast.error(error.message);
    setItems((data ?? []) as Student[]);
    setBatches((bs ?? []) as Batch[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryCenterId]);

  const classOptions = useMemo(
    () => Array.from(new Set(items.map((s) => s.class_level).filter(Boolean))).sort() as string[],
    [items],
  );
  const streamOptions = useMemo(
    () => Array.from(new Set(items.map((s) => s.target_exam).filter(Boolean))).sort() as string[],
    [items],
  );

  const filtered = useMemo(() => {
    const lq = q.trim().toLowerCase();
    return items.filter((s) => {
      if (statusFilter !== "all" && s.student_status !== statusFilter) return false;
      if (batchFilter !== "all" && (s.batch_id ?? "") !== batchFilter) return false;
      if (classFilter !== "all" && (s.class_level ?? "") !== classFilter) return false;
      if (streamFilter !== "all" && (s.target_exam ?? "") !== streamFilter) return false;
      if (!lq) return true;
      return (
        (s.full_name || "").toLowerCase().includes(lq) ||
        (s.phone || "").includes(lq) ||
        (s.roll_number || "").toLowerCase().includes(lq)
      );
    });
  }, [items, q, statusFilter, batchFilter, classFilter, streamFilter]);

  if (!primaryCenterId) return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;

  const updateStudent = async (s: Student, patch: Partial<Student>) => {
    setSavingId(s.id);
    const { error } = await (supabase as any)
      .from("profiles")
      .update(patch)
      .eq("id", s.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    setItems((arr) => arr.map((x) => (x.id === s.id ? { ...x, ...patch } : x)));
    toast.success("Updated");
  };
  const updateStatus = (s: Student, next: Status) => updateStudent(s, { student_status: next });

  // batch_id is a locked field under RLS (centre staff can't change it via a raw
  // profiles update) — reassignment has to go through this SECURITY DEFINER RPC,
  // which validates the caller and that the batch belongs to this centre.
  const updateBatch = async (s: Student, batchId: string) => {
    setSavingId(s.id);
    const { error } = await (supabase as any).rpc("centre_update_student_batch", {
      _user_id: s.user_id,
      _batch_id: batchId || null,
    });
    setSavingId(null);
    if (error) return toast.error(error.message);
    setItems((arr) => arr.map((x) => (x.id === s.id ? { ...x, batch_id: batchId || null } : x)));
    toast.success("Updated");
  };

  // Bulk CSV fields — matches the standard Bansal students-template.csv format.
  // Import looks students up by roll no. or contact no. and creates/updates them;
  // the bulk-import edge function accepts these exact column keys.
  const csvFields: CsvField[] = [
    { key: "roll_no", label: "Roll No", example: "1001" },
    { key: "student_name", label: "Student Name", required: true, example: "Aviral Singh" },
    { key: "fathers_name", label: "Father's Name", example: "Ashok Kumar Singh" },
    { key: "contact_no", label: "Contact No.", example: "7857852344" },
    { key: "parent_no", label: "Parent No.", example: "7909075201" },
    { key: "dob", label: "DOB", example: "2008-05-12" },
    { key: "stream", label: "Stream", example: "JEE" },
    { key: "class", label: "Class", example: "XI" },
    { key: "batch_code", label: "Batch Code", example: "XI-J1" },
  ];

  // Export uses the same column labels/order as the import template, mapped
  // from the DB row shape shown in the table.
  const exportRows = filtered.map((s) => ({
    roll_no: s.roll_number,
    student_name: s.full_name,
    fathers_name: s.father_name,
    contact_no: s.phone,
    parent_no: s.parent_phone,
    dob: s.dob,
    stream: s.target_exam,
    class: s.class_level,
    batch_code: batches.find((b) => b.id === s.batch_id)?.code ?? "",
  }));

  const bulkImport = async (rows: Record<string, any>[], dry_run: boolean) => {
    const { data, error } = await (supabase as any).functions.invoke("bulk-import", {
      body: { kind: "students", rows, dry_run, centre_id: primaryCenterId },
    });
    if (error) throw new Error(error.message || "Bulk import failed");
    return data;
  };

  return (
    <div className="p-6 lg:p-8 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-black font-display text-foreground">My Students</h1>
            <p className="text-sm text-muted-foreground">
              Students mapped to your centre. Manage status and roster details.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" /> Add Student
          </button>
          <button
            onClick={() => setBulkOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold hover:bg-muted"
          >
            <FileSpreadsheet className="h-4 w-4" /> Bulk import / export
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, phone or roll number"
          className="flex-1 min-w-[200px] rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All batches</option>
          <option value="">— Unassigned —</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}{b.code ? ` (${b.code})` : ""}</option>
          ))}
        </select>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All classes</option>
          {classOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={streamFilter}
          onChange={(e) => setStreamFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All streams</option>
          {streamOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} of {items.length}</span>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase">
              <tr>
                <th className="px-4 py-2 font-bold">Roll No</th>
                <th className="px-4 py-2 font-bold">Student Name</th>
                <th className="px-4 py-2 font-bold">Father's Name</th>
                <th className="px-4 py-2 font-bold">Contact No.</th>
                <th className="px-4 py-2 font-bold">Parent No.</th>
                <th className="px-4 py-2 font-bold">DOB</th>
                <th className="px-4 py-2 font-bold">Stream</th>
                <th className="px-4 py-2 font-bold">Class</th>
                <th className="px-4 py-2 font-bold">Batch Code</th>
                <th className="px-4 py-2 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-2 text-muted-foreground">{s.roll_number || "—"}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => setEditing(s)}
                      className="font-semibold text-foreground hover:text-primary hover:underline text-left"
                      title="Click to view/edit details"
                    >
                      {s.full_name || "—"}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{s.father_name || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.phone || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.parent_phone || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.dob || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.target_exam || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.class_level || "—"}</td>
                  <td className="px-4 py-2">
                    <select
                      disabled={savingId === s.id}
                      value={s.batch_id ?? ""}
                      onChange={(e) => updateBatch(s, e.target.value)}
                      className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] max-w-[160px]"
                    >
                      <option value="">— None —</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>{b.code ?? b.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[s.student_status]}`}>
                        {STATUS_LABEL[s.student_status]}
                      </span>
                      <select
                        disabled={savingId === s.id}
                        value={s.student_status}
                        onChange={(e) => updateStatus(s, e.target.value as Status)}
                        className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px]"
                      >
                        {(Object.keys(STATUS_LABEL) as Status[]).map((st) => (
                          <option key={st} value={st}>{STATUS_LABEL[st]}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">No students match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <BulkCsvDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk import / export Students"
        description="Export your current roster, or upload a CSV using the standard students-template format to add new students or update existing ones (matched by Roll No. or Contact No.). Batch Code must match an existing batch at your centre."
        fields={csvFields}
        fileBase="centre-students"
        exportRows={exportRows}
        bulkImport={bulkImport}
        onDone={load}
      />

      {addOpen && (
        <AddStudentDialog
          centreId={primaryCenterId}
          batches={batches}
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false);
            load();
          }}
        />
      )}

      {editing && (
        <EditStudentDialog
          student={editing}
          onClose={() => setEditing(null)}
          onSaved={(patch) => {
            setItems((arr) => arr.map((x) => (x.id === editing.id ? { ...x, ...patch } : x)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
};

type AddDialogProps = {
  centreId: string;
  batches: Batch[];
  onClose: () => void;
  onCreated: () => void;
};

const AddStudentDialog = ({ centreId, batches, onClose, onCreated }: AddDialogProps) => {
  const [form, setForm] = useState({
    full_name: "",
    father_name: "",
    phone: "",
    parent_phone: "",
    roll_number: "",
    dob: "",
    class_level: "",
    target_exam: "JEE",
    batch_id: "",
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.full_name.trim()) return toast.error("Name is required");
    if (!form.phone.trim() && !form.roll_number.trim())
      return toast.error("Phone or roll number is required");
    setSubmitting(true);
    const { data, error } = await (supabase as any).functions.invoke("center-create-student", {
      body: {
        centre_id: centreId,
        full_name: form.full_name.trim(),
        father_name: form.father_name.trim() || null,
        phone: form.phone.trim() || null,
        parent_phone: form.parent_phone.trim() || null,
        roll_number: form.roll_number.trim() || null,
        dob: form.dob.trim() || null,
        class_level: form.class_level.trim() || null,
        target_exam: form.target_exam.trim() || null,
        batch_id: form.batch_id || null,
        email: form.email.trim() || null,
        password: form.password || null,
      },
    });
    setSubmitting(false);
    if (error || data?.error) {
      toast.error(error?.message || data?.error || "Failed to create student");
      return;
    }
    toast.success("Student added");
    setResult({ email: data.email, password: data.password });
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-lg font-black font-display">Add Student</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {result ? (
          <div className="space-y-3 p-5">
            <p className="text-sm text-muted-foreground">
              Student created successfully. Share these login details with the student:
            </p>
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span><b>Email:</b> {result.email}</span>
                <button onClick={() => copy(result.email)} className="rounded p-1 hover:bg-background">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span><b>Password:</b> {result.password}</span>
                <button onClick={() => copy(result.password)} className="rounded p-1 hover:bg-background">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={onCreated}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-5 max-h-[70vh] overflow-y-auto">
            <Field label="Roll No">
              <input value={form.roll_number} onChange={(e) => set("roll_number", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Student Name *">
              <input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Father's Name">
              <input value={form.father_name} onChange={(e) => set("father_name", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Contact No.">
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Parent No.">
              <input value={form.parent_phone} onChange={(e) => set("parent_phone", e.target.value)} className={inputCls} />
            </Field>
            <Field label="DOB">
              <input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Stream">
              <select value={form.target_exam} onChange={(e) => set("target_exam", e.target.value)} className={inputCls}>
                {["JEE","NEET","Foundation","Other"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Class">
              <select value={form.class_level} onChange={(e) => set("class_level", e.target.value)} className={inputCls}>
                <option value="">—</option>
                {["Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12","Dropper"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Batch Code" className="col-span-2">
              <select value={form.batch_id} onChange={(e) => set("batch_id", e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.code ?? b.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Email (optional)">
              <input value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} placeholder="auto-generated" />
            </Field>
            <Field label="Password (optional)">
              <input value={form.password} onChange={(e) => set("password", e.target.value)} className={inputCls} placeholder="auto-generated (min 8 chars)" />
            </Field>
            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-muted">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Student
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

type EditDialogProps = {
  student: Student;
  onClose: () => void;
  onSaved: (patch: Partial<Student>) => void;
};

type CourseOpt = { id: string; name: string };

const EditStudentDialog = ({ student, onClose, onSaved }: EditDialogProps) => {
  const [form, setForm] = useState({
    full_name: student.full_name ?? "",
    father_name: student.father_name ?? "",
    phone: student.phone ?? "",
    parent_phone: student.parent_phone ?? "",
    roll_number: student.roll_number ?? "",
    dob: student.dob ?? "",
    class_level: student.class_level ?? "",
    target_exam: student.target_exam ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState<CourseOpt[]>([]);
  const [courseId, setCourseId] = useState<string>("");
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingCourses(true);
      const [{ data: courseRows }, { data: enrolled }] = await Promise.all([
        supabase.from("courses").select("id, name").order("sort_order", { ascending: true }),
        supabase.from("enrollments").select("course_id").eq("user_id", student.user_id).eq("is_active", true).limit(1).maybeSingle(),
      ]);
      setCourses((courseRows ?? []) as CourseOpt[]);
      setCourseId((enrolled as any)?.course_id ?? "");
      setLoadingCourses(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.user_id]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.full_name.trim()) return toast.error("Name is required");
    setSaving(true);
    const patch = {
      full_name: form.full_name.trim(),
      father_name: form.father_name.trim() || null,
      phone: form.phone.trim() || null,
      parent_phone: form.parent_phone.trim() || null,
      dob: form.dob.trim() || null,
      class_level: form.class_level.trim() || null,
      target_exam: form.target_exam.trim() || null,
    };
    const { error } = await (supabase as any).from("profiles").update(patch).eq("id", student.id);
    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }
    if (courseId) {
      const { error: enrollErr } = await supabase
        .from("enrollments")
        .upsert(
          { user_id: student.user_id, course_id: courseId, is_active: true },
          { onConflict: "user_id,course_id" },
        );
      if (enrollErr) {
        setSaving(false);
        toast.error(`Student updated, but course assignment failed: ${enrollErr.message}`);
        onSaved(patch);
        return;
      }
    }
    setSaving(false);
    toast.success("Student updated");
    onSaved(patch);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-lg font-black font-display">Edit Student</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 p-5 max-h-[70vh] overflow-y-auto">
          <Field label="Roll No">
            <input value={form.roll_number} disabled className={`${inputCls} opacity-60 cursor-not-allowed`} title="Roll number can't be changed here" />
          </Field>
          <Field label="Student Name *">
            <input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Father's Name">
            <input value={form.father_name} onChange={(e) => set("father_name", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Contact No.">
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Parent No.">
            <input value={form.parent_phone} onChange={(e) => set("parent_phone", e.target.value)} className={inputCls} />
          </Field>
          <Field label="DOB">
            <input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Stream">
            <select value={form.target_exam} onChange={(e) => set("target_exam", e.target.value)} className={inputCls}>
              <option value="">—</option>
              {["JEE","NEET","Foundation","Other"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Class">
            <select value={form.class_level} onChange={(e) => set("class_level", e.target.value)} className={inputCls}>
              <option value="">—</option>
              {["Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12","Dropper"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Course" className="col-span-2">
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              disabled={loadingCourses}
              className={inputCls}
            >
              <option value="">— None —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-muted">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

const Field = ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
  <label className={`flex flex-col gap-1 text-xs font-semibold text-muted-foreground ${className ?? ""}`}>
    {label}
    {children}
  </label>
);

export default CenterStudentsPage;
