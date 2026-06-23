import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";

type Attempt = {
  id: string;
  user_id: string;
  score: number | null;
  total_questions: number | null;
  correct_answers: number | null;
  percentile: number | null;
  status: string;
  submitted_at: string | null;
  time_spent_seconds: number | null;
};

type Student = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
};

const CenterTestResultsPage = () => {
  const { testId } = useParams<{ testId: string }>();
  const { primaryCenterId } = useCenterAdmin();
  const [testTitle, setTestTitle] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!primaryCenterId || !testId) return;
    (async () => {
      setLoading(true);
      const [{ data: test }, { data: profileRows }] = await Promise.all([
        supabase.from("tests").select("title").eq("id", testId).maybeSingle(),
        (supabase as any).from("profiles").select("id, full_name, email, phone_number").eq("centre_id", primaryCenterId),
      ]);
      setTestTitle(test?.title ?? "");
      const studentList = (profileRows ?? []) as any[];
      setStudents(studentList);

      if (studentList.length) {
        const { data: attRows } = await supabase
          .from("test_attempts")
          .select("id, user_id, score, total_questions, correct_answers, percentile, status, submitted_at, time_spent_seconds")
          .eq("test_id", testId)
          .in("user_id", studentList.map((s) => s.id));
        setAttempts((attRows ?? []) as any);
      } else {
        setAttempts([]);
      }
      setLoading(false);
    })();
  }, [primaryCenterId, testId]);

  const rows = useMemo(() => {
    const byUser: Record<string, Attempt | undefined> = {};
    for (const a of attempts) {
      const existing = byUser[a.user_id];
      if (!existing || (a.submitted_at ?? "") > (existing.submitted_at ?? "")) byUser[a.user_id] = a;
    }
    return students.map((s) => ({ student: s, attempt: byUser[s.id] }));
  }, [students, attempts]);

  if (!primaryCenterId) return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;

  const submitted = rows.filter((r) => r.attempt?.status === "submitted").length;
  const absent = rows.length - submitted;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <Link to="/center/tests" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to Test Platform
      </Link>
      <div>
        <h1 className="text-2xl font-black font-display text-foreground">{testTitle || "Test"} — Results</h1>
        <p className="text-sm text-muted-foreground">Showing results for students mapped to your centre only.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-md">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Mapped</p>
          <p className="text-xl font-black text-foreground">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Submitted</p>
          <p className="text-xl font-black text-secondary">{submitted}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Absent</p>
          <p className="text-xl font-black text-muted-foreground">{absent}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Correct</th>
              <th className="px-4 py-3">Percentile</th>
              <th className="px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!loading && rows.map(({ student, attempt }) => (
              <tr key={student.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{student.full_name ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {student.email}
                  {student.phone_number && <div>{student.phone_number}</div>}
                </td>
                <td className="px-4 py-3">
                  {attempt ? (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${attempt.status === "submitted" ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>
                      {attempt.status}
                    </span>
                  ) : (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-muted text-muted-foreground">absent</span>
                  )}
                </td>
                <td className="px-4 py-3">{attempt?.score ?? "—"}</td>
                <td className="px-4 py-3">{attempt ? `${attempt.correct_answers ?? 0} / ${attempt.total_questions ?? 0}` : "—"}</td>
                <td className="px-4 py-3">{attempt?.percentile ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{attempt?.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : "—"}</td>
              </tr>
            ))}
            {!loading && !rows.length && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No mapped students yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CenterTestResultsPage;
