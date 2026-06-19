import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Loader2, LifeBuoy, CheckCircle2, ArrowLeft, Filter } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type SupportRow = {
  id: string;
  user_id: string;
  attempt_id: string | null;
  test_id: string | null;
  question_position: number | null;
  message: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
  // joined
  test_title?: string | null;
  student_name?: string | null;
  student_phone?: string | null;
};

const AdminTestSupportPage = () => {
  const [rows, setRows] = useState<SupportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [resolving, setResolving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("test_support_queries")
      .select("id, user_id, attempt_id, test_id, question_position, message, status, created_at, resolved_at, resolution_note")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") query = query.eq("status", filter);

    const { data, error } = await query;
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const queries = (data ?? []) as SupportRow[];
    const userIds = Array.from(new Set(queries.map((q) => q.user_id).filter(Boolean)));
    const testIds = Array.from(new Set(queries.map((q) => q.test_id).filter(Boolean) as string[]));

    const [profilesRes, testsRes] = await Promise.all([
      userIds.length
        ? supabase.from("profiles").select("user_id, full_name, phone").in("user_id", userIds)
        : Promise.resolve({ data: [], error: null } as { data: { user_id: string; full_name: string | null; phone: string | null }[]; error: null }),
      testIds.length
        ? supabase.from("tests").select("id, title").in("id", testIds)
        : Promise.resolve({ data: [], error: null } as { data: { id: string; title: string }[]; error: null }),
    ]);

    const profileMap = new Map(
      (profilesRes.data ?? []).map((p) => [p.user_id, { name: p.full_name, phone: p.phone }]),
    );
    const testMap = new Map((testsRes.data ?? []).map((t) => [t.id, t.title]));

    setRows(
      queries.map((q) => ({
        ...q,
        student_name: q.user_id ? profileMap.get(q.user_id)?.name ?? null : null,
        student_phone: q.user_id ? profileMap.get(q.user_id)?.phone ?? null : null,
        test_title: q.test_id ? testMap.get(q.test_id) ?? null : null,
      })),
    );
    setLoading(false);
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const markResolved = async (id: string) => {
    setResolving(id);
    const { error } = await supabase
      .from("test_support_queries")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", id);
    setResolving(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Marked resolved");
    void load();
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin/tests-hub" className="text-xs text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Test Hub
          </Link>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-5 text-white flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/20 p-2.5">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black font-display">Test Support Queries</h1>
            <p className="text-white/90 text-xs mt-0.5">
              Live technical and platform issues raised by students during a test.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-neutral-500" />
        {(["open", "resolved", "all"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
              filter === k
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-sm text-neutral-500">
          No {filter === "all" ? "" : filter} support queries right now.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className={`rounded-xl border bg-white p-4 shadow-sm ${
                r.status === "open" ? "border-amber-300" : "border-neutral-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-neutral-900">
                      {r.student_name || "Unknown student"}
                    </span>
                    {r.student_phone && (
                      <a href={`tel:${r.student_phone}`} className="text-xs text-blue-600 hover:underline">
                        {r.student_phone}
                      </a>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        r.status === "open"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    Test: <b>{r.test_title || "—"}</b>
                    {r.question_position ? <> · Q#{r.question_position}</> : null}
                    <> · {new Date(r.created_at).toLocaleString()}</>
                  </p>
                  <p className="mt-2 text-sm text-neutral-800 whitespace-pre-wrap">{r.message}</p>
                </div>

                {r.status === "open" && (
                  <button
                    disabled={resolving === r.id}
                    onClick={() => markResolved(r.id)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-2 text-xs font-bold text-white"
                  >
                    {resolving === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTestSupportPage;
