import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Clock, FileText, LogOut, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatTestDateTime } from "@/lib/utils";


type LiveTest = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  starts_at: string | null;
  ends_at: string | null;
  subjects: string[] | null;
  open_window_minutes?: number | null;
  has_in_progress_attempt?: boolean;
};

const ACTIVATION_LEAD_MS = 60_000;

const CbtLiveTestsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<LiveTest[]>([]);
  const [studentName, setStudentName] = useState("");
  const [roll, setRoll] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/cbt", { replace: true }); return; }
      // Enforce kiosk users only
      const isKiosk = user.email?.endsWith("@cbt.bansal.local") || user.email === "it-testing@bansal.internal";
      if (!isKiosk) {
        toast.error("This area is for CBT kiosk users only.");
        await supabase.auth.signOut();
        navigate("/cbt", { replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, roll_number, batch_id, course_batches:batch_id(code)")
        .eq("user_id", user.id)
        .maybeSingle();
      const prof = profile as { full_name: string; roll_number: string | null; batch_id: string | null; course_batches: { code: string } | null } | null;
      setStudentName(prof?.full_name ?? "");
      setRoll(prof?.roll_number ?? "");
      setBatchCode(prof?.course_batches?.code ?? "");

      const { data, error } = await supabase.rpc("cbt_live_tests_for_batch", {
        _batch_id: prof?.batch_id ?? null,
      });
      if (error) toast.error(error.message);
      const baseTests = (data ?? []) as LiveTest[];

      // Enrich with open_window_minutes (entry-window cutoff) and in-progress attempt flag.
      if (baseTests.length) {
        const ids = baseTests.map((t) => t.id);
        const [{ data: meta }, { data: attempts }] = await Promise.all([
          supabase.from("tests").select("id, open_window_minutes").in("id", ids),
          supabase
            .from("test_attempts")
            .select("test_id")
            .eq("user_id", user.id)
            .eq("status", "in_progress")
            .in("test_id", ids),
        ]);
        const owmMap = new Map<string, number | null>(
          (meta ?? []).map((m: { id: string; open_window_minutes: number | null }) => [m.id, m.open_window_minutes]),
        );
        const inProgressSet = new Set<string>((attempts ?? []).map((a: { test_id: string }) => a.test_id));
        baseTests.forEach((t) => {
          t.open_window_minutes = owmMap.get(t.id) ?? null;
          t.has_in_progress_attempt = inProgressSet.has(t.id);
        });
      }
      setTests(baseTests);
      setLoading(false);
    })();
  }, [navigate]);

  const startTest = async (testId: string) => {
    const { data: t } = await supabase.from("tests").select("slug").eq("id", testId).maybeSingle();
    const slug = (t as { slug?: string } | null)?.slug;
    if (!slug) return toast.error("Test not available");
    navigate(`/tests/${slug}/take`);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/cbt", { replace: true });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">CBT Kiosk</p>
            <h1 className="text-lg font-bold text-foreground">{studentName || "Student"}</h1>
            <p className="text-xs text-muted-foreground">Roll {roll}{batchCode ? ` · Batch ${batchCode}` : ""}</p>
          </div>
          <button onClick={signOut} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Live tests for you</h2>
          <p className="text-xs text-muted-foreground">These tests are active right now. Click Start when your invigilator allows.</p>
        </div>

        {tests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm font-semibold text-foreground">No tests scheduled for your batch</p>
            <p className="mt-1 text-xs text-muted-foreground">Wait for your invigilator's instructions.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {tests.map((t) => {
              const startMs = t.starts_at ? new Date(t.starts_at).getTime() : null;
              const endMs = t.ends_at ? new Date(t.ends_at).getTime() : null;
              const entryDeadlineMs =
                startMs !== null && t.open_window_minutes != null && t.open_window_minutes > 0
                  ? startMs + t.open_window_minutes * 60_000
                  : null;
              const notYetOpen = startMs !== null && now < startMs - ACTIVATION_LEAD_MS;
              const closed = endMs !== null && now > endMs;
              const entryClosed =
                !t.has_in_progress_attempt && entryDeadlineMs !== null && now > entryDeadlineMs;
              const canStart = !notYetOpen && !closed && !entryClosed;

              let statusLabel = t.has_in_progress_attempt ? "Resume" : "Active now";
              let statusClass = "bg-emerald-100 text-emerald-700";
              let countdown: string | null = null;
              if (closed) {
                statusLabel = "Closed";
                statusClass = "bg-muted text-muted-foreground";
              } else if (entryClosed) {
                statusLabel = "Entry closed";
                statusClass = "bg-red-100 text-red-700";
              } else if (notYetOpen && startMs) {
                statusLabel = `Starts ${formatTestDateTime(new Date(startMs).toISOString())}`;
                statusClass = "bg-amber-100 text-amber-800";
                const diff = Math.max(0, startMs - ACTIVATION_LEAD_MS - now);
                const h = Math.floor(diff / 3_600_000);
                const m = Math.floor((diff % 3_600_000) / 60_000);
                const s = Math.floor((diff % 60_000) / 1000);
                countdown = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
              }

              return (
                <div key={t.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-foreground">{t.title}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusClass}`}>{statusLabel}</span>
                      </div>
                      {t.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                      <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {t.duration_minutes} min</span>
                        <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" /> {t.total_questions} questions · {t.total_marks} marks</span>
                        {t.subjects && t.subjects.length > 0 && <span>{t.subjects.join(" · ")}</span>}
                        {t.ends_at && <span>Closes {formatTestDateTime(t.ends_at)}</span>}
                      </div>
                      {countdown && (
                        <p className="mt-2 text-xs font-semibold text-amber-700">Opens in <span className="font-display text-base font-black tabular-nums">{countdown}</span></p>
                      )}
                    </div>
                    <button
                      onClick={() => canStart && startTest(t.id)}
                      disabled={!canStart}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <PlayCircle className="h-4 w-4" /> Start Test
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default CbtLiveTestsPage;
