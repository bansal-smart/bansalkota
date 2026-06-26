import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, ClipboardList, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/TablePagination";

type CentreStudent = {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  roll_number: string | null;
  class_level: string | null;
  target_exam: string | null;
  batch_label: string | null;
  attempts: number;
  last_attempt_at: string | null;
};

const CenterTestSeriesPage = () => {
  const { primaryCenterId, primaryCenter, loading: centerLoading } = useCenterAdmin();
  const [students, setStudents] = useState<CentreStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!primaryCenterId) return;
    (async () => {
      setLoading(true);
      const { data: profiles, error } = await (supabase as any)
        .from("profiles")
        .select("id, user_id, full_name, phone, roll_number, class_level, target_exam, batch_label")
        .eq("centre_id", primaryCenterId)
        .order("full_name", { ascending: true });
      if (error) {
        setStudents([]);
        setLoading(false);
        return;
      }
      const rows = (profiles ?? []) as any[];
      const userIds = rows.map((r) => r.user_id).filter(Boolean);
      let attemptsByUser: Record<string, { count: number; last: string | null }> = {};
      if (userIds.length) {
        const { data: attempts } = await (supabase as any)
          .from("test_attempts")
          .select("user_id, submitted_at, created_at")
          .in("user_id", userIds);
        (attempts ?? []).forEach((a: any) => {
          const e = attemptsByUser[a.user_id] ?? { count: 0, last: null };
          e.count += 1;
          const ts = a.submitted_at || a.created_at;
          if (ts && (!e.last || ts > e.last)) e.last = ts;
          attemptsByUser[a.user_id] = e;
        });
      }
      setStudents(
        rows.map((r) => ({
          ...r,
          attempts: attemptsByUser[r.user_id]?.count ?? 0,
          last_attempt_at: attemptsByUser[r.user_id]?.last ?? null,
        })),
      );
      setLoading(false);
    })();
  }, [primaryCenterId]);

  const filtered = useMemo(() => {
    const lq = q.trim().toLowerCase();
    if (!lq) return students;
    return students.filter(
      (s) =>
        (s.full_name || "").toLowerCase().includes(lq) ||
        (s.phone || "").includes(lq) ||
        (s.roll_number || "").toLowerCase().includes(lq),
    );
  }, [students, q]);

  const { paged, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 20);

  if (centerLoading) return <div className="p-8 text-sm text-muted-foreground">Loading centre…</div>;
  if (!primaryCenterId) return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="rounded-2xl bg-[#1C3F8E] p-6 text-white">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7" />
          <div>
            <h1 className="text-2xl font-black font-display">Test Series</h1>
            <p className="text-white/90 text-sm mt-1">
              Students associated with {primaryCenter?.city ?? "your centre"} and their test activity
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, phone or roll number..."
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" /> {filtered.length} of {students.length}
        </span>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No students found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Roll No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Target</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Batch</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Tests Attempted</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Last Attempt</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{s.full_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{s.roll_number || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{s.phone || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{s.class_level || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{s.target_exam || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{s.batch_label || "—"}</td>
                    <td className="px-4 py-3 text-center font-semibold text-foreground">{s.attempts}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {s.last_attempt_at ? new Date(s.last_attempt_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CenterTestSeriesPage;
