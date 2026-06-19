import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import BulkCsvDialog, { type CsvField } from "@/components/BulkCsvDialog";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2, Users } from "lucide-react";

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

const CenterStudentsPage = () => {
  const { primaryCenterId } = useCenterAdmin();
  const [items, setItems] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    if (!primaryCenterId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("id, user_id, full_name, phone, roll_number, target_exam, class_level, city, batch_id, student_status, created_at")
      .eq("centre_id", primaryCenterId)
      .order("full_name", { ascending: true });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Student[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryCenterId]);

  if (!primaryCenterId) return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;

  const filtered = useMemo(() => {
    const lq = q.trim().toLowerCase();
    return items.filter((s) => {
      if (statusFilter !== "all" && s.student_status !== statusFilter) return false;
      if (!lq) return true;
      return (
        (s.full_name || "").toLowerCase().includes(lq) ||
        (s.phone || "").includes(lq) ||
        (s.roll_number || "").toLowerCase().includes(lq)
      );
    });
  }, [items, q, statusFilter]);

  const updateStatus = async (s: Student, next: Status) => {
    setSavingId(s.id);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ student_status: next })
      .eq("id", s.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    setItems((arr) => arr.map((x) => (x.id === s.id ? { ...x, student_status: next } : x)));
    toast.success("Status updated");
  };

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
        <button
          onClick={() => setBulkOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold hover:bg-muted"
        >
          <FileSpreadsheet className="h-4 w-4" /> Bulk import / export
        </button>
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
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No students match.</td></tr>
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
    </div>
  );
};

export default CenterStudentsPage;
