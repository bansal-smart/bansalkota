import { useEffect, useState } from "react";
import { Loader2, Search, X, ShieldOff, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

type StudentRow = {
  enrollment_id: string;
  user_id: string;
  is_active: boolean;
  progress_percent: number | null;
  last_accessed_at: string | null;
  full_name: string | null;
  roll_number: string | null;
  phone: string | null;
  class_level: string | null;
  batch_label: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  courseId: string | null;
  courseName: string;
  centreId: string | null;
};

const CenterCourseStudentsDialog = ({ open, onClose, courseId, courseName, centreId }: Props) => {
  const { isSuperAdmin, isAdmin, isCenterAdmin } = useAuth();
  const canSuspend = isSuperAdmin || isAdmin || isCenterAdmin;

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !courseId || !centreId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Get all profiles in this centre, then their enrollments for this course
      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, full_name, roll_number, phone, class_level, batch_label")
        .eq("centre_id", centreId);
      if (pErr) {
        toast.error(pErr.message);
        if (!cancelled) setLoading(false);
        return;
      }
      const ids = (profs ?? []).map((p: any) => p.user_id);
      if (ids.length === 0) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }
      const { data: enr, error: eErr } = await supabase
        .from("enrollments")
        .select("id, user_id, is_active, progress_percent, last_accessed_at")
        .eq("course_id", courseId)
        .in("user_id", ids);
      if (eErr) {
        toast.error(eErr.message);
        if (!cancelled) setLoading(false);
        return;
      }
      const profMap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      const merged: StudentRow[] = (enr ?? []).map((e: any) => {
        const p: any = profMap.get(e.user_id) ?? {};
        return {
          enrollment_id: e.id,
          user_id: e.user_id,
          is_active: !!e.is_active,
          progress_percent: e.progress_percent,
          last_accessed_at: e.last_accessed_at,
          full_name: p.full_name ?? null,
          roll_number: p.roll_number ?? null,
          phone: p.phone ?? null,
          class_level: p.class_level ?? null,
          batch_label: p.batch_label ?? null,
        };
      });
      if (!cancelled) {
        setRows(merged);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, courseId, centreId]);

  const toggleAccess = async (row: StudentRow) => {
    if (!canSuspend) return;
    setBusyId(row.enrollment_id);
    const next = !row.is_active;
    const { error } = await supabase
      .from("enrollments")
      .update({ is_active: next })
      .eq("id", row.enrollment_id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((prev) => prev.map((r) => (r.enrollment_id === row.enrollment_id ? { ...r, is_active: next } : r)));
    toast.success(next ? "Access resumed" : "Access suspended");
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.full_name ?? "").toLowerCase().includes(q) ||
      (r.roll_number ?? "").toLowerCase().includes(q) ||
      (r.phone ?? "").toLowerCase().includes(q)
    );
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-card shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Manage Students</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{courseName}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, roll number or phone..."
              className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No students from your centre are enrolled in this course.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Roll</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Class</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Batch</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Phone</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Progress</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.enrollment_id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium text-foreground">{r.full_name ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.roll_number ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.class_level ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.batch_label ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.phone ?? "—"}</td>
                    <td className="px-4 py-2 text-center text-xs">{r.progress_percent ?? 0}%</td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          r.is_active
                            ? "bg-secondary/20 text-secondary"
                            : "bg-amber-500/20 text-amber-600"
                        }`}
                      >
                        {r.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {canSuspend ? (
                        <button
                          onClick={() => toggleAccess(r)}
                          disabled={busyId === r.enrollment_id}
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                            r.is_active
                              ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                              : "bg-secondary/10 text-secondary hover:bg-secondary/20"
                          }`}
                        >
                          {busyId === r.enrollment_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : r.is_active ? (
                            <ShieldOff className="h-3 w-3" />
                          ) : (
                            <ShieldCheck className="h-3 w-3" />
                          )}
                          {r.is_active ? "Suspend" : "Resume"}
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-border p-3 text-right">
          <button
            onClick={onClose}
            className="rounded-lg bg-muted px-4 py-2 text-sm font-semibold hover:bg-muted/80"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CenterCourseStudentsDialog;
