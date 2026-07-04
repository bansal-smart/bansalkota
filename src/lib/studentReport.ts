import { supabase } from "@/integrations/supabase/client";

export type SubjectBreakdown = { subject: string; score: number; maxScore: number };

export type TestEntry = {
  testName: string;
  submittedAt: string | null;
  score: number;
  totalMarks: number;
  accuracyPct: number;
  percentile: number | null;
  rank: number | null;
  rankOf: number | null;
  subjects: SubjectBreakdown[];
  isAbsent: boolean;
};

export type StudentReportData = {
  student: {
    name: string;
    email?: string | null;
    targetExam?: string | null;
    classLevel?: string | null;
    mentorName?: string | null;
  };
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

export async function fetchStudentReport(studentId: string): Promise<StudentReportData> {
  const nowIso = new Date().toISOString();

  const [profileRes, attemptsRes, enrollRes] = await Promise.all([
    safe(
      supabase
        .from("profiles")
        .select("full_name, target_exam, class_level, batch_id")
        .eq("user_id", studentId)
        .maybeSingle(),
    ),
    safe(
      (supabase as any)
        .from("test_attempts")
        .select("id, test_id, test_name, score, total_questions, correct_answers, percentile, submitted_at, status, metadata")
        .eq("user_id", studentId)
        .in("status", ["submitted", "auto_submitted"]),
    ),
    safe(
      (supabase as any)
        .from("enrollments")
        .select("course_id")
        .eq("user_id", studentId)
        .eq("is_active", true),
    ),
  ]);

  const profile = (profileRes as any)?.data ?? {};
  const mentorName: string | null = null;
  const batchId = profile.batch_id as string | null | undefined;
  const courseIds = ((enrollRes as any)?.data ?? []).map((e: any) => e.course_id).filter(Boolean);

  const attempts = ((attemptsRes as any)?.data ?? []) as any[];

  // Audience: concluded tests explicitly assigned to this student's batch or
  // enrolled course — used to detect tests they were expected to take but
  // skipped. Open-to-all CBTs (empty cbt_allowed_batch_ids) are excluded
  // since we can't tell whether this specific student was really assigned.
  let audienceTests: any[] = [];
  if (batchId || courseIds.length) {
    const { data: candidateTests } = await safe(
      (supabase as any)
        .from("tests")
        .select("id, title, ends_at, total_marks, cbt_allowed_batch_ids, course_id")
        .lt("ends_at", nowIso),
    ) ?? { data: [] };
    audienceTests = (candidateTests ?? []).filter((t: any) => {
      const batchMatch = batchId && Array.isArray(t.cbt_allowed_batch_ids) && t.cbt_allowed_batch_ids.length > 0
        && t.cbt_allowed_batch_ids.includes(batchId);
      const courseMatch = t.course_id && courseIds.includes(t.course_id);
      return batchMatch || courseMatch;
    });
  }

  // Per-test rank comes from the same RPC the student's own result page
  // uses; admins are authorized to call it for any attempt.
  const rankByAttemptId = new Map<string, { rank: number | null; total: number | null; percentile: number | null }>();
  await Promise.all(
    attempts.map(async (a) => {
      const { data } = await safe((supabase as any).rpc("get_test_rank", { _attempt_id: a.id }));
      const r = data as { rank?: number; total?: number; percentile?: number } | null;
      rankByAttemptId.set(a.id, {
        rank: r?.rank ?? null,
        total: r?.total ?? null,
        percentile: r?.percentile ?? null,
      });
    }),
  );

  const totalQ = attempts.reduce((s, a) => s + (a.total_questions || 0), 0);
  const correctQ = attempts.reduce((s, a) => s + (a.correct_answers || 0), 0);
  const totalScore = attempts.reduce((s, a) => s + (a.score || 0), 0);
  const maxPossible = attempts.reduce((s, a) => s + (a.total_questions || 0) * 4, 0);
  const avgScorePct = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;
  const avgAccuracyPct = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;
  const bestPercentile = attempts.reduce((m, a) => Math.max(m, a.percentile || 0), 0);

  const attemptedTestIds = new Set(attempts.map((a) => a.test_id).filter(Boolean));

  type Sortable = TestEntry & { sortDate: string };

  const attemptEntries: Sortable[] = attempts.map((a) => {
    const subjects = subjectBreakdownFromAttempt(a);
    const totalMarks = subjects.length
      ? subjects.reduce((s, x) => s + x.maxScore, 0)
      : (a.total_questions || 0) * 4;
    const rankInfo = rankByAttemptId.get(a.id);
    return {
      testName: a.test_name || "Test",
      submittedAt: a.submitted_at ?? null,
      sortDate: a.submitted_at ?? "",
      score: Number(a.score ?? 0),
      totalMarks,
      accuracyPct: a.total_questions ? Math.round(((a.correct_answers || 0) / a.total_questions) * 100) : 0,
      percentile: rankInfo?.percentile ?? a.percentile ?? null,
      rank: rankInfo?.rank ?? null,
      rankOf: rankInfo?.total ?? null,
      subjects,
      isAbsent: false,
    };
  });

  const absentEntries: Sortable[] = audienceTests
    .filter((t) => !attemptedTestIds.has(t.id))
    .map((t) => ({
      testName: t.title || "Test",
      submittedAt: null,
      sortDate: t.ends_at ?? "",
      score: 0,
      totalMarks: Number(t.total_marks ?? 0),
      accuracyPct: 0,
      percentile: null,
      rank: null,
      rankOf: null,
      subjects: [],
      isAbsent: true,
    }));

  const list: TestEntry[] = [...attemptEntries, ...absentEntries]
    .sort((a, b) => b.sortDate.localeCompare(a.sortDate))
    .map(({ sortDate, ...t }) => t);

  // Aggregate subject performance across every test — summed score/max (not
  // an average of percentages) so bigger tests weigh correctly. Attempted
  // tests only; absences carry no subject marks.
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

  // Test-performance trend — every test actually taken, oldest to newest.
  const trend = attemptEntries
    .filter((t) => t.submittedAt)
    .sort((a, b) => a.sortDate.localeCompare(b.sortDate))
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
    tests: { attempts: attempts.length, avgScorePct, avgAccuracyPct, bestPercentile, bySubject, trend, list },
  };
}
