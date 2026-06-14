import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, FileText, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type TestRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  test_type: string;
  exam_pattern: string;
  subjects: string[] | null;
  duration_minutes: number;
  correct_marks: number;
  wrong_marks: number;
  total_questions: number;
  total_marks: number;
  starts_at: string | null;
  ends_at: string | null;
  is_published: boolean;
};

const paletteLegend = [
  { color: "bg-muted text-muted-foreground", label: "Not Visited" },
  { color: "bg-red-500 text-white", label: "Not Answered" },
  { color: "bg-emerald-500 text-white", label: "Answered" },
  { color: "bg-violet-500 text-white", label: "Marked for Review" },
  { color: "bg-violet-500 text-white ring-2 ring-emerald-400", label: "Answered & Marked (evaluated)" },
];

const TestInstructionsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<TestRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!slug) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("tests").select("*").eq("slug", slug).maybeSingle();
      if (!active) return;
      setTest((data ?? null) as TestRow | null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ACTIVATION_LEAD_MS = 60_000;
  const startsAt = test?.starts_at ? new Date(test.starts_at).getTime() : null;
  const endsAt = test?.ends_at ? new Date(test.ends_at).getTime() : null;
  const notYetOpen = startsAt !== null && now < startsAt - ACTIVATION_LEAD_MS;
  const closed = endsAt !== null && now > endsAt;

  const countdown = useMemo(() => {
    if (!startsAt || !notYetOpen) return null;
    const diff = Math.max(0, startsAt - ACTIVATION_LEAD_MS - now);
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1000);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [startsAt, now, notYetOpen]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <h1 className="font-display text-xl font-black text-foreground">Test not found</h1>
        <Link to="/my-tests" className="mt-3 inline-block text-sm font-bold text-primary">Back to tests</Link>
      </div>
    );
  }

  const canStart = agreed && !notYetOpen && !closed;

  return (
    <div className="mx-auto max-w-4xl p-4 pb-24 lg:p-8">
      <Link to="/my-tests" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All tests
      </Link>

      <header className="mt-4 rounded-2xl bg-gradient-to-br from-secondary to-primary p-6 text-white shadow-lg">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
          {test.exam_pattern} · {test.test_type}
        </p>
        <h1 className="mt-1 font-display text-2xl font-black lg:text-3xl">{test.title}</h1>
        {test.description && <p className="mt-2 text-sm text-white/85">{test.description}</p>}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={Clock} label="Duration" value={`${test.duration_minutes} min`} />
          <Stat icon={FileText} label="Questions" value={`${test.total_questions}`} />
          <Stat icon={ShieldCheck} label="Total Marks" value={`${test.total_marks}`} />
          <Stat icon={AlertTriangle} label="Marking" value={`+${test.correct_marks} / ${test.wrong_marks}`} />
        </div>
      </header>

      {notYetOpen && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <p className="text-xs font-bold uppercase tracking-wider">Test opens in</p>
          <p className="mt-1 font-display text-2xl font-black tabular-nums">{countdown}</p>
        </div>
      )}

      {closed && (
        <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-700">
          This test window has closed.
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-black text-foreground">General instructions</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-foreground/85">
          <li>The total duration is <b>{test.duration_minutes} minutes</b>. The clock starts the moment you click <b>Start Test</b> and cannot be paused.</li>
          <li>The test will <b>auto-submit</b> when the timer hits zero. Any unsaved answer is preserved.</li>
          <li>Each correct answer carries <b>+{test.correct_marks}</b> mark{Math.abs(Number(test.correct_marks)) === 1 ? "" : "s"}. Each wrong answer carries <b>{test.wrong_marks}</b>. Unanswered questions are not penalised.</li>
          <li>You may navigate freely between questions using the palette on the right. Status colours are listed below.</li>
          <li>Use <b>Save &amp; Next</b> to record an answer, <b>Mark for Review</b> to flag a question. Answered &amp; marked questions are still evaluated.</li>
          <li>Do not refresh, close, or navigate away during the test. Progress is saved automatically every few seconds.</li>
        </ol>

        <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Question palette legend</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {paletteLegend.map((p) => (
            <div key={p.label} className="flex items-center gap-3">
              <span className={`flex h-7 w-7 items-center justify-center rounded text-xs font-bold ${p.color}`}>1</span>
              <span className="text-sm text-foreground/85">{p.label}</span>
            </div>
          ))}
        </div>

        {test.subjects && test.subjects.length > 0 && (
          <p className="mt-6 text-sm text-muted-foreground">
            <b className="text-foreground">Subjects:</b> {test.subjects.join(" · ")}
          </p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 accent-primary"
          />
          <span className="text-sm text-foreground/85">
            I have read and understood the instructions. I declare that I will not use any unfair means during the test and that any malpractice may lead to disqualification.
          </span>
        </label>

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            to="/my-tests"
            className="rounded-full border border-border px-5 py-2.5 text-center text-sm font-bold text-foreground hover:bg-muted"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={!canStart}
            onClick={() => navigate(`/tests/${test.slug}/take`)}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {notYetOpen ? "Test not open yet" : closed ? "Test closed" : "Start Test"}
          </button>
        </div>
      </section>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
    <div className="flex items-center gap-2 text-white/70">
      <Icon className="h-3.5 w-3.5" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <p className="mt-1 font-display text-lg font-black text-white">{value}</p>
  </div>
);

export default TestInstructionsPage;
