import { supabase } from "@/integrations/supabase/client";

export type MonthRange = { start: Date; end: Date; label: string };

export const monthRange = (year: number, monthIndex: number): MonthRange => {
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  const label = start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return { start, end, label };
};

export type SubjectBreakdown = { subject: string; score: number; maxScore: number };

export type TestEntry = {
  testName: string;
  submittedAt: string | null;
  score: number;
  totalMarks: number;
  accuracyPct: number;
  percentile: number | null;
  subjects: SubjectBreakdown[];
};

export type StudentReportData = {
  student: {
    name: string;
    email?: string | null;
    targetExam?: string | null;
    classLevel?: string | null;
    mentorName?: string | null;
  };
  period: string;
  tests: {
    attempts: number;
    avgScorePct: number;
    avgAccuracyPct: number;
    bestPercentile: number;
    bySubject: { subject: string; avgPct: number; attempts: number }[];
    trend: { date: string; pct: number }[];
    list: TestEntry[];
  };
};

const safe = <T,>(p: PromiseLike<T>) => Promise.resolve(p).catch(() => null as any);

// Per-question metadata is the most accurate source of subject-wise marks
// (mirrors the logic on the student's own result page). Falls back to the
// coarser metadata.subjects map for older attempts that lack it.
function subjectBreakdownFromAttempt(a: any): SubjectBreakdown[] {
  const metaQuestions = (a?.metadata?.questions ?? []) as Array<{
    subject?: string; marks?: number; max_marks?: number;
  }>;
  if (Array.isArray(metaQuestions) && metaQuestions.length) {
    const map = new Map<string, SubjectBreakdown>();
    metaQuestions.forEach((q) => {
      const subj = q.subject || "General";
      const cur = map.get(subj) ?? { subject: subj, score: 0, maxScore: 0 };
      cur.score += Number(q.marks ?? 0);
      cur.maxScore += Number(q.max_marks ?? 0);
      map.set(subj, cur);
    });
    return Array.from(map.values());
  }
  const metaSubjects = a?.metadata?.subjects as Record<string, unknown> | undefined;
  if (metaSubjects && Object.keys(metaSubjects).length) {
    return Object.entries(metaSubjects).map(([subject, v]) => {
      if (v && typeof v === "object") {
        const s = v as { score?: number; total?: number };
        return { subject, score: Number(s.score ?? 0), maxScore: Number(s.total ?? 0) * 4 };
      }
      return { subject, score: Number(v ?? 0), maxScore: 0 };
    });
  }
  return [];
}

export async function fetchStudentReport(
  studentId: string,
  range: MonthRange,
): Promise<StudentReportData> {
  const startIso = range.start.toISOString();
  const endIso = range.end.toISOString();

  const [profileRes, attemptsRes] = await Promise.all([
    safe(
      supabase
        .from("profiles")
        .select("full_name, target_exam, class_level")
        .eq("user_id", studentId)
        .maybeSingle(),
    ),
    safe(
      (supabase as any)
        .from("test_attempts")
        .select("test_name, score, total_questions, correct_answers, percentile, submitted_at, status, metadata")
        .eq("user_id", studentId)
        .in("status", ["submitted", "auto_submitted"])
        .gte("submitted_at", startIso)
        .lt("submitted_at", endIso),
    ),
  ]);

  const profile = (profileRes as any)?.data ?? {};
  const mentorName: string | null = null;

  const attempts = ((attemptsRes as any)?.data ?? []) as any[];
  const totalQ = attempts.reduce((s, a) => s + (a.total_questions || 0), 0);
  const correctQ = attempts.reduce((s, a) => s + (a.correct_answers || 0), 0);
  const totalScore = attempts.reduce((s, a) => s + (a.score || 0), 0);
  const maxPossible = attempts.reduce((s, a) => s + (a.total_questions || 0) * 4, 0);
  const avgScorePct = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;
  const avgAccuracyPct = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;
  const bestPercentile = attempts.reduce((m, a) => Math.max(m, a.percentile || 0), 0);

  const list: TestEntry[] = attempts.map((a) => {
    const subjects = subjectBreakdownFromAttempt(a);
    const totalMarks = subjects.length
      ? subjects.reduce((s, x) => s + x.maxScore, 0)
      : (a.total_questions || 0) * 4;
    return {
      testName: a.test_name || "Test",
      submittedAt: a.submitted_at ?? null,
      score: Number(a.score ?? 0),
      totalMarks,
      accuracyPct: a.total_questions ? Math.round(((a.correct_answers || 0) / a.total_questions) * 100) : 0,
      percentile: a.percentile ?? null,
      subjects,
    };
  }).sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));

  // Aggregate subject performance across every test in the month — summed
  // score/max (not an average of percentages) so bigger tests weigh correctly.
  const subjAgg = new Map<string, { score: number; maxScore: number; attempts: number }>();
  list.forEach((t) => {
    t.subjects.forEach((s) => {
      const cur = subjAgg.get(s.subject) ?? { score: 0, maxScore: 0, attempts: 0 };
      cur.score += s.score;
      cur.maxScore += s.maxScore;
      cur.attempts += 1;
      subjAgg.set(s.subject, cur);
    });
  });
  const bySubject = Array.from(subjAgg.entries()).map(([subject, v]) => ({
    subject,
    avgPct: v.maxScore > 0 ? Math.round((v.score / v.maxScore) * 100) : 0,
    attempts: v.attempts,
  }));

  const trend = [...list]
    .filter((t) => t.submittedAt)
    .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""))
    .map((t) => ({
      date: new Date(t.submittedAt as string).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      pct: t.totalMarks > 0 ? Math.round((t.score / t.totalMarks) * 100) : 0,
    }));

  return {
    student: {
      name: (profile as any).full_name || "Student",
      targetExam: (profile as any).target_exam,
      classLevel: (profile as any).class_level,
      mentorName,
    },
    period: range.label,
    tests: { attempts: attempts.length, avgScorePct, avgAccuracyPct, bestPercentile, bySubject, trend, list },
  };
}
