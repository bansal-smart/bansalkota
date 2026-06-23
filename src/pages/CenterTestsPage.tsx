import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, ArrowRight, Users, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";

type Test = {
  id: string;
  slug: string;
  title: string;
  test_type: string;
  exam_pattern: string;
  subjects: string[] | null;
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  starts_at: string | null;
  ends_at: string | null;
};

const CenterTestsPage = () => {
  const { primaryCenterId } = useCenterAdmin();
  const [tests, setTests] = useState<Test[]>([]);
  const [studentIds, setStudentIds] = useState<Set<string>>(new Set());
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!primaryCenterId) return;
    (async () => {
      setLoading(true);
      const [{ data: testRows }, { data: profileRows }] = await Promise.all([
        supabase
          .from("tests")
          .select("id, slug, title, test_type, exam_pattern, subjects, duration_minutes, total_questions, total_marks, starts_at, ends_at")
          .eq("is_published", true)
          .order("created_at", { ascending: false }),
        (supabase as any).from("profiles").select("id").eq("centre_id", primaryCenterId),
      ]);
      const ids = new Set<string>((profileRows ?? []).map((p: any) => p.id));
      setStudentIds(ids);
      setTests((testRows ?? []) as any);

      if (ids.size && testRows?.length) {
        const { data: attempts } = await supabase
          .from("test_attempts")
          .select("test_id, user_id")
          .in("user_id", Array.from(ids))
          .in("test_id", testRows.map((t: any) => t.id));
        const counts: Record<string, number> = {};
        for (const a of (attempts ?? []) as any[]) {
          counts[a.test_id] = (counts[a.test_id] ?? 0) + 1;
        }
        setAttemptCounts(counts);
      }
      setLoading(false);
    })();
  }, [primaryCenterId]);

  const filtered = useMemo(() => {
    if (!q.trim()) return tests;
    const needle = q.toLowerCase();
    return tests.filter((t) => t.title.toLowerCase().includes(needle));
  }, [q, tests]);

  if (!primaryCenterId) return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black font-display text-foreground">Test Platform</h1>
        <p className="text-sm text-muted-foreground">
          Browse tests published by the Bansal super admin and track how your mapped students are performing.
          Your students can take any published test from their dashboards.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tests"
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <Users className="h-3 w-3" /> {studentIds.size} mapped students
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Test</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Questions</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Window</th>
              <th className="px-4 py-3">Attempts</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!loading && filtered.map((t) => (
              <tr key={t.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="font-bold text-foreground inline-flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    {t.title}
                  </div>
                  <div className="text-xs text-muted-foreground">{(t.subjects ?? []).join(" · ")}</div>
                </td>
                <td className="px-4 py-3 text-xs">{t.test_type}<div className="text-muted-foreground">{t.exam_pattern}</div></td>
                <td className="px-4 py-3">{t.total_questions}</td>
                <td className="px-4 py-3">{t.duration_minutes} min</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {t.starts_at ? new Date(t.starts_at).toLocaleString() : "—"}
                  {t.ends_at ? <> → {new Date(t.ends_at).toLocaleString()}</> : null}
                </td>
                <td className="px-4 py-3 font-bold">{attemptCounts[t.id] ?? 0}</td>
                <td className="px-4 py-3">
                  <Link
                    to={`/center/tests/${t.id}/results`}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20"
                  >
                    View Results <ArrowRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && !filtered.length && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No tests found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CenterTestsPage;
