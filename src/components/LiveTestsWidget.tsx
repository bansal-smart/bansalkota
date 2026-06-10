import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, FileText, ChevronRight, Radio, CalendarClock, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

type TestRow = {
  id: string;
  title: string;
  slug: string;
  exam_pattern: string;
  test_type: string;
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  starts_at: string | null;
  ends_at: string | null;
};

type Status = "live" | "upcoming" | "ended" | "anytime";

const statusOf = (t: TestRow, now: number): Status => {
  const s = t.starts_at ? new Date(t.starts_at).getTime() : null;
  const e = t.ends_at ? new Date(t.ends_at).getTime() : null;
  if (s === null && e === null) return "anytime";
  if (s !== null && now < s) return "upcoming";
  if (e !== null && now > e) return "ended";
  return "live";
};

const fmtCountdown = (ms: number) => {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "starting now";
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `in ${d}d ${h % 24}h`;
};

const LiveTestsWidget = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState<TestRow[]>([]);
  const [attempts, setAttempts] = useState<Record<string, string>>({});
  const [recent, setRecent] = useState<Array<{ id: string; test_name: string; score: number | null; submitted_at: string; slug: string | null; test_id: string | null }>>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const [tRes, aRes, rRes] = await Promise.all([
        supabase
          .from("tests")
          .select("id,title,slug,exam_pattern,test_type,duration_minutes,total_questions,total_marks,starts_at,ends_at")
          .eq("is_published", true)
          .order("starts_at", { ascending: true, nullsFirst: false })
          .limit(20),
        supabase.from("test_attempts").select("test_id,status").eq("user_id", user.id),
        supabase
          .from("test_attempts")
          .select("id, test_name, score, submitted_at, test_id, tests(slug)")
          .eq("user_id", user.id)
          .in("status", ["submitted", "auto_submitted"])
          .order("submitted_at", { ascending: false })
          .limit(3),
      ]);
      if (!active) return;
      setTests((tRes.data ?? []) as TestRow[]);
      const m: Record<string, string> = {};
      (aRes.data ?? []).forEach((a: any) => { if (a.test_id) m[a.test_id] = a.status; });
      setAttempts(m);
      setRecent(((rRes.data ?? []) as any[]).map((r) => ({
        id: r.id, test_name: r.test_name, score: r.score, submitted_at: r.submitted_at,
        test_id: r.test_id, slug: r.tests?.slug ?? null,
      })));
    };
    load();
    const ch = supabase
      .channel("dash_tests")
      .on("postgres_changes", { event: "*", schema: "public", table: "tests" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "test_attempts", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [user]);


  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const visible = useMemo(() => {
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return tests
      .map((t) => ({ t, status: statusOf(t, now) }))
      .filter(({ t, status }) => {
        if (status === "live") return true;
        if (status === "upcoming") {
          const s = new Date(t.starts_at!).getTime();
          return s - now <= sevenDays;
        }
        return false;
      })
      .sort((a, b) => {
        // Live first, then nearest start
        if (a.status !== b.status) return a.status === "live" ? -1 : 1;
        const sa = a.t.starts_at ? new Date(a.t.starts_at).getTime() : Infinity;
        const sb = b.t.starts_at ? new Date(b.t.starts_at).getTime() : Infinity;
        return sa - sb;
      })
      .slice(0, 4);
  }, [tests, now]);

  if (visible.length === 0 && recent.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-black text-foreground">Live & Upcoming Tests</h2>
          <p className="text-xs text-muted-foreground">Scheduled tests for you to attend</p>
        </div>
        <Link to="/my-tests" className="text-xs font-bold text-primary hover:underline">All tests →</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map(({ t, status }) => {
          const attempt = attempts[t.id];
          const startMs = t.starts_at ? new Date(t.starts_at).getTime() : null;
          const isLive = status === "live";
          const submitted = attempt === "submitted" || attempt === "auto_submitted";
          const inProgress = attempt === "in_progress";

          return (
            <Link
              key={t.id}
              to={submitted ? `/my-tests` : `/tests/${t.slug}/instructions`}
              className={`group relative flex flex-col rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${isLive ? "border-red-300 bg-red-50/40" : "border-border bg-card"}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  {t.exam_pattern} · {t.test_type}
                </span>
                {isLive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                    <Radio className="h-2.5 w-2.5 animate-pulse" /> Live
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    <CalendarClock className="h-2.5 w-2.5" />
                    {startMs ? fmtCountdown(startMs - now) : "Soon"}
                  </span>
                )}
              </div>

              <h3 className="mt-2 line-clamp-2 text-sm font-bold text-foreground group-hover:text-primary">{t.title}</h3>

              <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {t.total_questions} Qs</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t.duration_minutes} min</span>
                <span>{t.total_marks} marks</span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                {submitted ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Submitted</span>
                ) : inProgress ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700">Resume</span>
                ) : isLive ? (
                  <span className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold text-white">Attend now</span>
                ) : (
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">View details</span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>

      {recent.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent results</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {recent.map((r) => (
              <Link
                key={r.id}
                to={r.slug ? `/tests/${r.slug}/result/${r.id}` : `/my-tests`}
                className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Trophy className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground group-hover:text-primary">{r.test_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Score {Number(r.score ?? 0).toFixed(1)} · {new Date(r.submitted_at).toLocaleDateString()}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default LiveTestsWidget;
