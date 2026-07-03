import { supabase } from "@/integrations/supabase/client";

export type MonthRange = { start: Date; end: Date; label: string };

export const monthRange = (year: number, monthIndex: number): MonthRange => {
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  const label = start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return { start, end, label };
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
  };
  attendance: { registered: number; attended: number; percent: number };
  courses: { name: string; progress: number }[];
  engagement: {
    doubtsAsked: number;
    doubtsAnswered: number;
    activeDays: number;
    minutesStudied: number;
  };
};

const safe = <T,>(p: PromiseLike<T>) => Promise.resolve(p).catch(() => null as any);

export async function fetchStudentReport(
  studentId: string,
  range: MonthRange,
): Promise<StudentReportData> {
  const startIso = range.start.toISOString();
  const endIso = range.end.toISOString();
  const startDate = range.start.toISOString().slice(0, 10);
  const endDate = range.end.toISOString().slice(0, 10);

  const [profileRes, attemptsRes, attendanceRes, enrollRes, doubtsRes, sessionsRes] =
    await Promise.all([
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
          .select("score, total_questions, correct_answers, percentile, subject, submitted_at, status")
          .eq("user_id", studentId)
          .in("status", ["submitted", "auto_submitted"])
          .gte("submitted_at", startIso)
          .lt("submitted_at", endIso),
      ),
      safe(
        (supabase as any)
          .from("live_class_attendance")
          .select("status, class_id, live_classes!inner(starts_at)")
          .eq("user_id", studentId)
          .gte("live_classes.starts_at", startIso)
          .lt("live_classes.starts_at", endIso),
      ),
      safe(
        (supabase as any)
          .from("enrollments")
          .select("progress_percent, courses(name)")
          .eq("user_id", studentId)
          .eq("is_active", true),
      ),
      safe(
        (supabase as any)
          .from("doubts")
          .select("id, status, created_at")
          .eq("user_id", studentId)
          .gte("created_at", startIso)
          .lt("created_at", endIso),
      ),
      safe(
        (supabase as any)
          .from("study_sessions")
          .select("session_date, minutes_studied")
          .eq("user_id", studentId)
          .gte("session_date", startDate)
          .lt("session_date", endDate),
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

  const subjMap = new Map<string, { sumPct: number; n: number }>();
  attempts.forEach((a) => {
    const subj = a.subject || "General";
    const denom = (a.total_questions || 0) * 4;
    const pct = denom > 0 ? ((a.score || 0) / denom) * 100 : 0;
    const cur = subjMap.get(subj) || { sumPct: 0, n: 0 };
    cur.sumPct += pct;
    cur.n += 1;
    subjMap.set(subj, cur);
  });
  const bySubject = Array.from(subjMap.entries()).map(([subject, v]) => ({
    subject,
    avgPct: Math.round(v.sumPct / v.n),
    attempts: v.n,
  }));

  const trend = attempts
    .filter((a) => a.submitted_at)
    .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at))
    .map((a) => {
      const denom = (a.total_questions || 0) * 4;
      return {
        date: new Date(a.submitted_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        pct: denom > 0 ? Math.round(((a.score || 0) / denom) * 100) : 0,
      };
    });

  const att = ((attendanceRes as any)?.data ?? []) as any[];
  const registered = att.length;
  const attended = att.filter((a) => a.status === "attended" || a.status === "joined").length;
  const attendance = {
    registered,
    attended,
    percent: registered > 0 ? Math.round((attended / registered) * 100) : 0,
  };

  const courses = (((enrollRes as any)?.data ?? []) as any[])
    .map((e) => ({ name: e.courses?.name || "Course", progress: e.progress_percent || 0 }))
    .slice(0, 6);

  const doubts = ((doubtsRes as any)?.data ?? []) as any[];
  const sessions = ((sessionsRes as any)?.data ?? []) as any[];
  const engagement = {
    doubtsAsked: doubts.length,
    doubtsAnswered: doubts.filter((d) => d.status === "answered").length,
    activeDays: new Set(sessions.map((s) => s.session_date)).size,
    minutesStudied: sessions.reduce((s, x) => s + (x.minutes_studied || 0), 0),
  };

  return {
    student: {
      name: (profile as any).full_name || "Student",
      targetExam: (profile as any).target_exam,
      classLevel: (profile as any).class_level,
      mentorName,
    },
    period: range.label,
    tests: { attempts: attempts.length, avgScorePct, avgAccuracyPct, bestPercentile, bySubject, trend },
    attendance,
    courses,
    engagement,
  };
}
