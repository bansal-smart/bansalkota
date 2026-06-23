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
  const [bulkOpen, setBulkOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    if (!primaryCenterId) return;
    setLoading(true);
    const [{ data, error }, { data: bs }] = await Promise.all([
      (supabase as any)
        .from("profiles")
        .select("id, user_id, full_name, phone, roll_number, target_exam, class_level, city, batch_id, student_status, created_at")
        .eq("centre_id", primaryCenterId)
        .order("full_name", { ascending: true }),
      (supabase as any)
        .from("course_batches")
        .select("id, name, code")
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

  const filtered = useMemo(() => {
    const lq = q.trim().toLowerCase();
    return items.filter((s) => {
      if (statusFilter !== "all" && s.student_status !== statusFilter) return false;
      if (batchFilter !== "all" && (s.batch_id ?? "") !== batchFilter) return false;
      if (!lq) return true;
      return (
        (s.full_name || "").toLowerCase().includes(lq) ||
        (s.phone || "").includes(lq) ||
        (s.roll_number || "").toLowerCase().includes(lq)
      );
    });
  }, [items, q, statusFilter, batchFilter]);

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
  const updateBatch = (s: Student, batchId: string) =>
    updateStudent(s, { batch_id: batchId || null });

  // Bulk CSV fields — import looks students up by phone or roll_number and updates centre/status
  const csvFields: CsvField[] = [
    { key: "roll_number", label: "Roll Number", example: "BC-2026-001" },
    { key: "phone", label: "Phone", example: "9876543210" },
    { key: "full_name", label: "Full Name", example: "Riya Sharma" },
    { key: "class_level", label: "Class", example: "Class 11" },
    { key: "target_exam", label: "Target Exam", example: "IIT JEE" },
    { key: "city", label: "City", example: "Kota" },
    {
      key: "student_status",
      label: "Status",
      example: "active",
      parse: (v: string) => {
        const x = v.trim().toLowerCase().replace(/\s+/g, "_");
        if (!["active", "inactive", "passed_out", "dropped"].includes(x)) {
          throw new Error("Status must be active/inactive/passed_out/dropped");
        }
        return x;
      },
    },
  ];

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
                <th className="px-4 py-2 font-bold">Name</th>
                <th className="px-4 py-2 font-bold">Roll No</th>
                <th className="px-4 py-2 font-bold">Phone</th>
                <th className="px-4 py-2 font-bold">Class</th>
                <th className="px-4 py-2 font-bold">Target</th>
                <th className="px-4 py-2 font-bold">Batch</th>
                <th className="px-4 py-2 font-bold">Status</th>
                <th className="px-4 py-2 font-bold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-2 font-semibold text-foreground">{s.full_name || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.roll_number || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.phone || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.class_level || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.target_exam || "—"}</td>
                  <td className="px-4 py-2">
                    <select
                      disabled={savingId === s.id}
                      value={s.batch_id ?? ""}
                      onChange={(e) => updateBatch(s, e.target.value)}
                      className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] max-w-[160px]"
                    >
                      <option value="">— None —</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}{b.code ? ` (${b.code})` : ""}</option>
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
                  <td className="px-4 py-2 text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No students match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <BulkCsvDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk import / export Students"
        description="Export your current roster, or upload a CSV to update existing students by phone or roll number. Status can be active, inactive, passed_out or dropped."
        fields={csvFields}
        fileBase="centre-students"
        exportRows={filtered as any}
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
    phone: "",
    roll_number: "",
    class_level: "",
    target_exam: "JEE",
    city: "",
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
        phone: form.phone.trim() || null,
        roll_number: form.roll_number.trim() || null,
        class_level: form.class_level.trim() || null,
        target_exam: form.target_exam.trim() || null,
        city: form.city.trim() || null,
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
            <Field label="Full Name *" className="col-span-2">
              <input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Roll Number">
              <input value={form.roll_number} onChange={(e) => set("roll_number", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Class">
              <select value={form.class_level} onChange={(e) => set("class_level", e.target.value)} className={inputCls}>
                <option value="">—</option>
                {["Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12","Dropper"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Target Exam">
              <select value={form.target_exam} onChange={(e) => set("target_exam", e.target.value)} className={inputCls}>
                {["JEE","NEET","Foundation","Other"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Batch" className="col-span-2">
              <select value={form.batch_id} onChange={(e) => set("batch_id", e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}{b.code ? ` (${b.code})` : ""}</option>
                ))}
              </select>
            </Field>
            <Field label="City">
              <input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Email (optional)">
              <input value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} placeholder="auto-generated" />
            </Field>
            <Field label="Password (optional)" className="col-span-2">
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

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

const Field = ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
  <label className={`flex flex-col gap-1 text-xs font-semibold text-muted-foreground ${className ?? ""}`}>
    {label}
    {children}
  </label>
);

export default CenterStudentsPage;
