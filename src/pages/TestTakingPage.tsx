import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Flag, Clock, Loader2, AlertTriangle, X, ZoomIn, ZoomOut, Delete, Info, Menu, Flame, CheckCircle2, LifeBuoy, Send, ShieldAlert } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import MathRenderer from "@/components/MathRenderer";
import PaletteShape, { type PaletteStatus } from "@/components/test/PaletteShape";
import CandidateCard from "@/components/test/CandidateCard";
import MatchFollowing, { type MatchItem } from "@/components/test/MatchFollowing";
import ReportQuestionButton from "@/components/test/ReportQuestionButton";

type QuestionType =
  | "mcq-single"
  | "mcq-multi"
  | "numerical"
  | "integer"
  | "assertion-reason"
  | "match-following";

type TestQuestion = {
  id: string;
  position: number;
  subject: string | null;
  topic: string | null;
  sub_topic: string | null;
  question_text: string;
  question_image_url: string | null;
  question_type: QuestionType;
  options: { id: number; text: string }[];
  option_images: string[] | null;
  match_left: MatchItem[] | null;
  marks_correct: number;
  marks_wrong: number;
  marks_unanswered: number;
  partial_marking: boolean;
  answer_format: string | null;
  answer_range_min: number | null;
  answer_range_max: number | null;
};


type QStatus = "not-visited" | "answered" | "not-answered" | "marked" | "answered-marked";

type AnswerVal =
  | { selected: number | null; time_spent?: number }
  | { selected: number[]; time_spent?: number }
  | { selected: string; time_spent?: number }
  | { selected: Record<string, string>; time_spent?: number };

const isMulti = (t: QuestionType) => t === "mcq-multi";
const isNumeric = (t: QuestionType) => t === "numerical" || t === "integer";
const isMatch = (t: QuestionType) => t === "match-following";

const TestTakingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [test, setTest] = useState<{ id: string; title: string; duration_minutes: number; total_questions: number } | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [currentQ, setCurrentQ] = useState(0);
  const [activeSubject, setActiveSubject] = useState<string>("ALL");
  const [activeTopic, setActiveTopic] = useState<string>("ALL");
  const [answers, setAnswers] = useState<Record<string, AnswerVal>>({});
  const [statuses, setStatuses] = useState<Record<string, QStatus>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [showAutoBlocked, setShowAutoBlocked] = useState(false);
  const tabSwitchesRef = useRef(0);
  const blockedRef = useRef(false);
  const lastViolationAtRef = useRef<number>(0);
  // Support query modal
  const [showSupport, setShowSupport] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportSent, setSupportSent] = useState(false);
  const submitRef = useRef<(auto?: boolean) => void>(() => {});
  const persistProgressRef = useRef<((a?: Record<string, AnswerVal>, s?: Record<string, QStatus>, c?: Set<string>) => Promise<unknown>) | null>(null);
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const successTargetRef = useRef<string>("/dashboard");
  const [showInstructions, setShowInstructions] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [savedAgo, setSavedAgo] = useState<number | null>(null);
  const [candidate, setCandidate] = useState<{ name: string | null; avatar: string | null }>({ name: null, avatar: null });

  const lastSavedRef = useRef<number>(0);
  const lastPayloadHashRef = useRef<string>("");
  const lastTabSwitchesSavedRef = useRef<number>(0);
  const lastSavedAnswersRef = useRef<Record<string, AnswerVal>>({});
  const lastSavedStatusesRef = useRef<Record<string, QStatus>>({});
  const enteredAtRef = useRef<number>(Date.now());
  const answersRef = useRef<Record<string, AnswerVal>>({});
  const statusesRef = useRef<Record<string, QStatus>>({});
  const explicitClearsRef = useRef<Set<string>>(new Set());

  // Override window set by admin "reopen with extra time"
  const [overrideMinutes, setOverrideMinutes] = useState<number | null>(null);
  const [overrideStartedAt, setOverrideStartedAt] = useState<Date | null>(null);

  // Image preloading
  const [loadedImgs, setLoadedImgs] = useState<Set<string>>(new Set());
  const [preloadProgress, setPreloadProgress] = useState<{ loaded: number; total: number }>({ loaded: 0, total: 0 });

  // Guard so the loader runs only ONCE per (slug, user.id).
  // Without this, an auth-session refresh changes `user`'s identity, the effect
  // re-fires, and setAnswers(existing.answers) wipes any local answers the
  // student has typed but not yet auto-saved (up to 15s of work).
  const loadedKeyRef = useRef<string | null>(null);

  // Load test + existing in-progress attempt
  useEffect(() => {
    if (authLoading || !slug) return;
    if (!user) { navigate("/login"); return; }
    const key = `${slug}::${user.id}`;
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;
    (async () => {
      setLoading(true);
      const { data: t } = await supabase
        .from("tests")
        .select("id, title, duration_minutes, total_questions, instructions_image_url")
        .eq("slug", slug).maybeSingle();
      if (!t) { toast.error("Test not found"); navigate("/my-tests"); return; }
      // Legacy instruction images were saved as `/object/public/question-images/...`
      // but the bucket is private — re-sign so the <img> can load.
      const legacyPublic = (t as any).instructions_image_url as string | null;
      if (legacyPublic && /\/storage\/v1\/object\/public\/question-images\//.test(legacyPublic)) {
        const path = legacyPublic.split("/object/public/question-images/")[1];
        if (path) {
          const { data: signed } = await supabase.storage
            .from("question-images")
            .createSignedUrl(decodeURIComponent(path), 60 * 60 * 24 * 365);
          if (signed?.signedUrl) (t as any).instructions_image_url = signed.signedUrl;
        }
      }
      setTest(t);


      const { data: qs, error: qErr } = await supabase
        .from("test_questions")
        .select("id, position, subject, topic, sub_topic, question_text, question_image_url, question_type, options, option_images, match_left, marks_correct, marks_wrong, marks_unanswered, partial_marking, answer_format, answer_range_min, answer_range_max")
        .eq("test_id", t.id).order("position");
      if (qErr) {
        console.error("[TestTakingPage] questions load failed", qErr);
        toast.error(`Could not load questions: ${qErr.message}`);
      }
      setQuestions((qs ?? []) as unknown as TestQuestion[]);

      const { data: existing } = await supabase
        .from("test_attempts")
        .select("id, started_at, answers, question_statuses, status, time_override_minutes, time_override_started_at")
        .eq("user_id", user.id).eq("test_id", t.id).eq("status", "in_progress").maybeSingle();

      if (existing) {
        setAttemptId(existing.id);
        setStartedAt(new Date(existing.started_at as string));
        // Recover any answers lost in a crash by merging the latest snapshot.
        try {
          const { data: restored } = await supabase.rpc("restore_attempt_from_snapshot", { _attempt_id: existing.id });
          const count = (restored as any)?.restored ?? 0;
          if (count > 0) toast.success(`Restored ${count} answers from auto-backup`);
        } catch (e) { /* non-fatal */ }
        // Re-fetch in case snapshot restore widened the row
        const { data: fresh } = await supabase
          .from("test_attempts").select("answers, question_statuses")
          .eq("id", existing.id).maybeSingle();
        const dbAnswers = ((fresh?.answers ?? existing.answers) as Record<string, AnswerVal>) ?? {};
        const dbStatuses = ((fresh?.question_statuses ?? existing.question_statuses) as Record<string, QStatus>) ?? {};
        // Merge browser-local backup (last-resort offline copy)
        let localBackup: Record<string, AnswerVal> = {};
        let localStatusBackup: Record<string, QStatus> = {};
        try {
          const raw = localStorage.getItem(`attempt:${existing.id}:answers`);
          if (raw) localBackup = JSON.parse(raw);
          const rawS = localStorage.getItem(`attempt:${existing.id}:statuses`);
          if (rawS) localStatusBackup = JSON.parse(rawS);
        } catch { /* ignore */ }
        setAnswers((local) => ({ ...dbAnswers, ...localBackup, ...local }));
        setStatuses((local) => ({ ...dbStatuses, ...localStatusBackup, ...local }));
        if ((existing as any).time_override_minutes) {
          setOverrideMinutes((existing as any).time_override_minutes);
          setOverrideStartedAt(new Date((existing as any).time_override_started_at));
        }
        setStarted(true);
      }

      // Candidate profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      setCandidate({
        name: prof?.full_name?.trim() || user.email?.split("@")[0] || "Candidate",
        avatar: prof?.avatar_url || null,
      });

      setLoading(false);
    })();
  }, [slug, user?.id, authLoading, navigate]);

  // Timer
  useEffect(() => {
    if (!started || !startedAt || !test) return;
    const tick = () => {
      // Use admin override window if present, else regular test duration from started_at
      const base = overrideStartedAt ?? startedAt;
      const durMins = overrideMinutes ?? test.duration_minutes;
      const elapsed = Math.floor((Date.now() - base.getTime()) / 1000);
      const remaining = Math.max(0, durMins * 60 - elapsed);
      setSecondsLeft(remaining);
      if (remaining === 0) { setShowSubmit(true); /* Student must click Submit — no auto submission */ }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, startedAt, test, overrideMinutes, overrideStartedAt]);

  // Preload all question + option images so navigation feels instant
  useEffect(() => {
    if (!questions.length) return;
    const urls = new Set<string>();
    questions.forEach((q) => {
      if (q.question_image_url) urls.add(q.question_image_url);
      (q.option_images ?? []).forEach((u) => { if (u) urls.add(u); });
    });
    const list = Array.from(urls);
    setPreloadProgress({ loaded: 0, total: list.length });
    if (list.length === 0) return;
    let cancelled = false;
    let done = 0;
    list.forEach((url) => {
      const img = new Image();
      const finish = () => {
        if (cancelled) return;
        done += 1;
        setLoadedImgs((prev) => {
          if (prev.has(url)) return prev;
          const next = new Set(prev); next.add(url); return next;
        });
        setPreloadProgress({ loaded: done, total: list.length });
      };
      img.onload = finish;
      img.onerror = finish;
      img.src = url;
    });
    return () => { cancelled = true; };
  }, [questions]);

  // Warn on close
  useEffect(() => {
    if (!started) return;
    const beforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [started]);

  // Tab/window switch — 3 strikes and the test auto-submits.
  useEffect(() => {
    if (!started) return;

    const registerViolation = () => {
      if (blockedRef.current) return;
      // Debounce: ignore duplicate fires within 500ms (visibilitychange + blur may both fire)
      const now = Date.now();
      if (now - lastViolationAtRef.current < 500) return;
      lastViolationAtRef.current = now;

      const next = tabSwitchesRef.current + 1;
      tabSwitchesRef.current = next;
      setTabSwitches(next);

      // Always flush current progress to the server immediately on every violation
      // so that even if the next action auto-submits, the most-recent answers are persisted.
      void persistProgressRef.current?.(answersRef.current, statusesRef.current);

      if (next >= 3) {
        blockedRef.current = true;
        setShowTabWarning(false);
        setShowAutoBlocked(true);
        // Persist once more, THEN auto-submit, so submit_test_attempt scores the latest answers.
        (async () => {
          try { await persistProgressRef.current?.(answersRef.current, statusesRef.current); } catch { /* ignore */ }
          try { await submitRef.current?.(true); } catch { /* ignore */ }
        })();
      } else {
        setShowTabWarning(true);
      }
    };

    // Only flag genuine tab/window switches (incl. opening a new tab or
    // minimising the browser). We intentionally do NOT listen on `window.blur`
    // because that also fires when the user clicks the taskbar, focuses a
    // system notification, or alt-tabs to another app while the browser tab
    // itself stays visible — which the user does not want flagged.
    const onVisibility = () => {
      if (document.hidden) registerViolation();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const noContext = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", noContext);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("contextmenu", noContext);
    };
  }, [started]);


  // Sync refs so auto-save always reads latest state
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { statusesRef.current = statuses; }, [statuses]);

  const selectedIsEmpty = (selected: unknown) => {
    if (selected === null || selected === undefined) return true;
    if (Array.isArray(selected)) return selected.length === 0;
    if (typeof selected === "string") return selected.trim().length === 0;
    if (typeof selected === "object") return Object.keys(selected as Record<string, unknown>).length === 0;
    return false;
  };

  const answerHasSelection = (answer?: AnswerVal) => !selectedIsEmpty((answer as any)?.selected);

  const mergeSafeAnswers = (
    serverAnswers: Record<string, AnswerVal>,
    localAnswers: Record<string, AnswerVal>,
    explicitClears: Set<string>,
  ) => {
    const merged: Record<string, AnswerVal> = { ...serverAnswers };
    Object.entries(localAnswers).forEach(([qid, localAnswer]) => {
      const serverAnswer = serverAnswers[qid];
      if (!explicitClears.has(qid) && answerHasSelection(serverAnswer) && !answerHasSelection(localAnswer)) {
        merged[qid] = { ...localAnswer, selected: (serverAnswer as any).selected } as AnswerVal;
        return;
      }
      merged[qid] = localAnswer;
    });
    return merged;
  };

  const mergeSafeStatuses = (
    serverStatuses: Record<string, QStatus>,
    localStatuses: Record<string, QStatus>,
    mergedAnswers: Record<string, AnswerVal>,
    explicitClears: Set<string>,
  ) => {
    const merged: Record<string, QStatus> = { ...serverStatuses, ...localStatuses };
    Object.keys(mergedAnswers).forEach((qid) => {
      if (!explicitClears.has(qid) && answerHasSelection(mergedAnswers[qid])) {
        const current = merged[qid];
        merged[qid] = current === "marked" || current === "answered-marked" ? "answered-marked" : "answered";
      }
    });
    return merged;
  };

  const persistProgress = useCallback(async (
    nextAnswers?: Record<string, AnswerVal>,
    nextStatuses?: Record<string, QStatus>,
    clearIds: Set<string> = explicitClearsRef.current,
  ) => {
    if (!attemptId) return null;

    const localAnswers = nextAnswers ?? answersRef.current;
    const localStatuses = nextStatuses ?? statusesRef.current;

    // Skip when nothing has actually changed since the last successful save.
    const metadataChanged = tabSwitches !== lastTabSwitchesSavedRef.current || (clearIds && clearIds.size > 0);
    const hashSource = JSON.stringify({ a: localAnswers, s: localStatuses, c: clearIds ? Array.from(clearIds) : [] });
    if (!metadataChanged && hashSource === lastPayloadHashRef.current) {
      return { answers: localAnswers, statuses: localStatuses };
    }

    // Build per-key deltas vs. our last successful save snapshot.
    const lastA = lastSavedAnswersRef.current;
    const lastS = lastSavedStatusesRef.current;
    const answerChanges: Record<string, AnswerVal> = {};
    for (const [qid, val] of Object.entries(localAnswers)) {
      if (clearIds.has(qid)) continue;
      if (JSON.stringify(lastA[qid]) !== JSON.stringify(val)) answerChanges[qid] = val;
    }
    const statusChanges: Record<string, QStatus> = {};
    for (const [qid, val] of Object.entries(localStatuses)) {
      if (clearIds.has(qid)) continue;
      if (lastS[qid] !== val) statusChanges[qid] = val;
    }

    const timeSpent = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0;

    const { error } = await supabase.rpc("save_test_attempt_delta", {
      _attempt_id: attemptId,
      _answer_changes: answerChanges as unknown as never,
      _status_changes: statusChanges as unknown as never,
      _clear_ids: Array.from(clearIds),
      _tab_switches: metadataChanged ? tabSwitches : null,
      _time_spent: timeSpent,
    });

    if (error) {
      if (import.meta.env.DEV) console.error("[TestTakingPage] delta save failed", error);
      return null;
    }

    // Reflect the new server state locally
    const mergedAnswers: Record<string, AnswerVal> = { ...localAnswers };
    const mergedStatuses: Record<string, QStatus> = { ...localStatuses };
    clearIds?.forEach((id) => {
      delete mergedAnswers[id];
      delete mergedStatuses[id];
      explicitClearsRef.current.delete(id);
    });
    answersRef.current = mergedAnswers;
    statusesRef.current = mergedStatuses;
    lastSavedAnswersRef.current = { ...mergedAnswers };
    lastSavedStatusesRef.current = { ...mergedStatuses };
    lastSavedRef.current = Date.now();
    lastPayloadHashRef.current = JSON.stringify({ a: mergedAnswers, s: mergedStatuses, c: [] });
    lastTabSwitchesSavedRef.current = tabSwitches;
    setSavedAgo(0);
    return { answers: mergedAnswers, statuses: mergedStatuses };
  }, [attemptId, startedAt, tabSwitches]);

  const autoSave = useCallback(async () => {
    if (!attemptId) return;
    if (Date.now() - lastSavedRef.current < 3000) return;
    await persistProgress();
  }, [attemptId, persistProgress]);

  const saveNow = useCallback(async (
    nextAnswers?: Record<string, AnswerVal>,
    nextStatuses?: Record<string, QStatus>,
    clearIds?: Set<string>,
  ) => {
    await persistProgress(nextAnswers, nextStatuses, clearIds);
  }, [persistProgress]);

  // Periodic safety-net autosave (every 20s) — debounced effect below handles the common path.
  useEffect(() => {
    if (!attemptId) return;
    const t = setInterval(autoSave, 20000);
    return () => clearInterval(t);
  }, [attemptId, autoSave]);

  // Debounced save on answer/status change (3s). The hash guard skips no-op writes.
  useEffect(() => {
    if (!attemptId) return;
    const t = setTimeout(() => { void persistProgress(); }, 3000);
    return () => clearTimeout(t);
  }, [answers, statuses, attemptId, persistProgress]);



  // localStorage write-through (browser-side backup for total network loss)
  useEffect(() => {
    if (!attemptId) return;
    try {
      localStorage.setItem(`attempt:${attemptId}:answers`, JSON.stringify(answers));
      localStorage.setItem(`attempt:${attemptId}:statuses`, JSON.stringify(statuses));
    } catch { /* quota — non-fatal */ }
  }, [answers, statuses, attemptId]);

  // Save on tab hide / page unload using fetch keepalive
  useEffect(() => {
    if (!attemptId) return;
    const flush = () => { void persistProgress(); };
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [attemptId, persistProgress]);

  // "Saved Xs ago" ticker
  useEffect(() => {
    if (savedAgo === null) return;
    const t = setInterval(() => setSavedAgo((v) => (v === null ? null : v + 1)), 1000);
    return () => clearInterval(t);
  }, [savedAgo]);

  const startAttempt = async () => {
    if (!user || !test) return;
    if (questions.length === 0) {
      toast.error("No questions found for this test. Please contact your administrator.");
      return;
    }
    const { data, error } = await supabase.from("test_attempts").insert({
      user_id: user.id, test_id: test.id, test_name: test.title, status: "in_progress",
      started_at: new Date().toISOString(), answers: {}, question_statuses: {},
    }).select("id, started_at").single();
    if (error || !data) { toast.error("Could not start test"); return; }
    setAttemptId(data.id);
    setStartedAt(new Date(data.started_at as string));
    setStarted(true);
  };

  // Subject grouping — NTA-style, no "ALL"
  const subjects = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    questions.forEach((q) => {
      const s = q.subject || "General";
      if (!seen.has(s)) { seen.add(s); list.push(s); }
    });
    return list;
  }, [questions]);

  // Initialize activeSubject when subjects load
  useEffect(() => {
    if (subjects.length && (activeSubject === "ALL" || !subjects.includes(activeSubject))) {
      setActiveSubject(subjects[0]);
    }
  }, [subjects, activeSubject]);

  const subjectIndices = useMemo(() => {
    return questions
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => (q.subject || "General") === activeSubject)
      .filter(({ q }) => activeTopic === "ALL" || (q.topic || "Other") === activeTopic);
  }, [questions, activeSubject, activeTopic]);

  // Topics available within the active subject
  const topicsForSubject = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    questions.forEach((q) => {
      if ((q.subject || "General") !== activeSubject) return;
      const t = q.topic || "Other";
      if (!seen.has(t)) { seen.add(t); list.push(t); }
    });
    return list;
  }, [questions, activeSubject]);

  // Reset topic when subject changes
  useEffect(() => { setActiveTopic("ALL"); }, [activeSubject]);

  // Indices grouped by subject (for full palette view)
  const groupedIndices = useMemo(() => {
    return subjects.map((s) => ({
      subject: s,
      items: questions
        .map((q, i) => ({ q, i }))
        .filter(({ q }) => (q.subject || "General") === s),
    }));
  }, [subjects, questions]);

  const q = questions[currentQ];

  // Track time-spent when leaving a question
  const accrueTimeAndJump = useCallback((newIdx: number) => {
    if (q) {
      const delta = Math.floor((Date.now() - enteredAtRef.current) / 1000);
      setAnswers((prev) => {
        const cur = prev[q.id];
        const prevTime = cur?.time_spent ?? 0;
        const next = { ...prev, [q.id]: { ...(cur ?? { selected: null }), time_spent: prevTime + delta } as AnswerVal };
        answersRef.current = next;
        return next;
      });
    }
    enteredAtRef.current = Date.now();
    setCurrentQ(newIdx);
    const target = questions[newIdx];
    if (target) {
      const targetSub = target.subject || "General";
      setActiveSubject((cur) => (cur !== targetSub ? targetSub : cur));
    }
    setPaletteOpen(false);
  }, [q, questions]);

  // When user lands on a fresh question, mark as not-answered if still unvisited
  useEffect(() => {
    if (!q) return;
    setStatuses((s) => (s[q.id] ? s : { ...s, [q.id]: "not-answered" }));
  }, [q]);

  const updateStatus = (id: string, status: QStatus) => setStatuses((prev) => {
    const next = { ...prev, [id]: status };
    statusesRef.current = next;
    return next;
  });

  const hasAnswer = (qq: TestQuestion, a?: AnswerVal): boolean => {
    if (!a) return false;
    const s = (a as any).selected;
    if (s === null || s === undefined) return false;
    if (Array.isArray(s)) return s.length > 0;
    if (typeof s === "string") return s.trim().length > 0;
    if (typeof s === "object") return Object.keys(s).length > 0;
    return true;
  };

  const handleSingleSelect = (optIdx: number) => {
    if (!q) return;
    explicitClearsRef.current.delete(q.id);
    setAnswers((prev) => {
      const next = { ...prev, [q.id]: { ...(prev[q.id] ?? {}), selected: optIdx } as AnswerVal };
      answersRef.current = next;
      return next;
    });
    const wasMarked = statuses[q.id] === "marked" || statuses[q.id] === "answered-marked";
    updateStatus(q.id, wasMarked ? "answered-marked" : "answered");
  };

  const handleMultiToggle = (optIdx: number) => {
    if (!q) return;
    explicitClearsRef.current.delete(q.id);
    setAnswers((prev) => {
      const cur = prev[q.id];
      const arr: number[] = Array.isArray((cur as any)?.selected) ? [...(cur as any).selected] : [];
      const i = arr.indexOf(optIdx);
      if (i >= 0) arr.splice(i, 1); else arr.push(optIdx);
      arr.sort((a, b) => a - b);
      const wasMarked = statuses[q.id] === "marked" || statuses[q.id] === "answered-marked";
      updateStatus(q.id, arr.length > 0 ? (wasMarked ? "answered-marked" : "answered") : (wasMarked ? "marked" : "not-answered"));
      const next = { ...prev, [q.id]: { ...(cur ?? {}), selected: arr } as AnswerVal };
      answersRef.current = next;
      return next;
    });
  };

  const handleNumericInput = (value: string) => {
    if (!q) return;
    explicitClearsRef.current.delete(q.id);
    setAnswers((prev) => {
      const next = { ...prev, [q.id]: { ...(prev[q.id] ?? {}), selected: value } as AnswerVal };
      answersRef.current = next;
      return next;
    });
    const wasMarked = statuses[q.id] === "marked" || statuses[q.id] === "answered-marked";
    updateStatus(q.id, value.trim() ? (wasMarked ? "answered-marked" : "answered") : (wasMarked ? "marked" : "not-answered"));
  };

  const handleMatchChange = (next: Record<string, string>) => {
    if (!q) return;
    explicitClearsRef.current.delete(q.id);
    setAnswers((prev) => {
      const merged = { ...prev, [q.id]: { ...(prev[q.id] ?? {}), selected: next } as AnswerVal };
      answersRef.current = merged;
      return merged;
    });
    const wasMarked = statuses[q.id] === "marked" || statuses[q.id] === "answered-marked";
    const filled = Object.keys(next).length > 0;
    updateStatus(q.id, filled ? (wasMarked ? "answered-marked" : "answered") : (wasMarked ? "marked" : "not-answered"));
  };

  const handleNext = () => { autoSave(); if (currentQ < questions.length - 1) accrueTimeAndJump(currentQ + 1); };
  const handlePrev = () => currentQ > 0 && accrueTimeAndJump(currentQ - 1);
  const handleMarkAndNext = () => {
    if (!q) return;
    const nextStatus = hasAnswer(q, answers[q.id]) ? "answered-marked" : "marked";
    updateStatus(q.id, nextStatus);
    saveNow(undefined, { ...statusesRef.current, [q.id]: nextStatus });
    handleNext();
  };
  const handleSaveAndMark = () => {
    if (!q) return;
    const nextStatus = hasAnswer(q, answers[q.id]) ? "answered-marked" : "marked";
    updateStatus(q.id, nextStatus);
    saveNow(undefined, { ...statusesRef.current, [q.id]: nextStatus });
  };
  const handleClear = () => {
    if (!q) return;
    const wasMarked = statuses[q.id] === "marked" || statuses[q.id] === "answered-marked";
    const nextStatus: QStatus = wasMarked ? "marked" : "not-answered";
    const cleared: AnswerVal = isMulti(q.question_type)
      ? { selected: [], time_spent: (answers[q.id] as any)?.time_spent }
      : isNumeric(q.question_type)
        ? { selected: "", time_spent: (answers[q.id] as any)?.time_spent }
        : isMatch(q.question_type)
          ? { selected: {}, time_spent: (answers[q.id] as any)?.time_spent }
          : { selected: null, time_spent: (answers[q.id] as any)?.time_spent };
    const clearIds = new Set([q.id]);
    explicitClearsRef.current.add(q.id);
    setAnswers((prev) => {
      const next = { ...prev, [q.id]: cleared };
      answersRef.current = next;
      return next;
    });
    updateStatus(q.id, nextStatus);
    saveNow({ ...answersRef.current, [q.id]: cleared }, { ...statusesRef.current, [q.id]: nextStatus }, clearIds);
  };

  const handleSubmit = async (auto = false) => {
    if (!attemptId) return;
    setSubmitting(true);
    // Always read from refs so auto-submit (triggered from event handlers) sees
    // the latest answers/statuses, not a stale React-closure snapshot.
    const latestAnswers: Record<string, AnswerVal> = { ...answersRef.current };
    const latestStatuses: Record<string, QStatus> = { ...statusesRef.current };
    // Accrue final time for current question
    if (q) {
      const delta = Math.floor((Date.now() - enteredAtRef.current) / 1000);
      const cur = latestAnswers[q.id] ?? ({ selected: null } as AnswerVal);
      latestAnswers[q.id] = { ...cur, time_spent: ((cur.time_spent ?? 0) + delta) } as AnswerVal;
    }
    answersRef.current = latestAnswers;
    statusesRef.current = latestStatuses;
    const saved = await persistProgress(latestAnswers, latestStatuses);
    await supabase.from("test_attempts").update({
      answers: saved?.answers ?? latestAnswers,
      question_statuses: saved?.statuses ?? latestStatuses,
      status: auto ? "auto_submitted" : "submitted",
      submitted_at: new Date().toISOString(),
      time_spent_seconds: startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0,
      metadata: {
        tab_switches: tabSwitchesRef.current,
        ...(blockedRef.current ? { auto_submitted_reason: "window_switch" } : {}),
      },
    }).eq("id", attemptId);
    const { error } = await supabase.rpc("submit_test_attempt", { _attempt_id: attemptId });
    if (error) toast.error(error.message);
    try {
      localStorage.removeItem(`attempt:${attemptId}:answers`);
      localStorage.removeItem(`attempt:${attemptId}:statuses`);
    } catch { /* ignore */ }
    successTargetRef.current = user?.email?.endsWith("@cbt.bansal.local")
      ? "/cbt/submitted"
      : `/tests/${slug}/result/${attemptId}`;
    // When blocked by window-switch we show a dedicated modal instead of success
    if (!blockedRef.current) setShowSuccess(true);
  };

  // Keep latest handleSubmit accessible from tab-visibility listener
  submitRef.current = handleSubmit;
  persistProgressRef.current = persistProgress;

  const counts = useMemo(() => {
    return questions.reduce((acc, qq) => {
      const s = statuses[qq.id];
      if (s === "answered") acc.answered++;
      else if (s === "not-answered") acc.notAnswered++;
      else if (s === "marked") acc.marked++;
      else if (s === "answered-marked") acc.answeredMarked++;
      else acc.notVisited++;
      return acc;
    }, { answered: 0, notAnswered: 0, marked: 0, answeredMarked: 0, notVisited: 0 });
  }, [questions, statuses]);

  // Status → palette shape
  const toShape = (s?: QStatus): PaletteStatus => (s as PaletteStatus) || "not-visited";

  // Keyboard shortcuts
  useEffect(() => {
    if (!started) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") { e.preventDefault(); handleNext(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); handlePrev(); }
      else if (e.key === "m" || e.key === "M") { e.preventDefault(); handleMarkAndNext(); }
      else if (e.key === "c" || e.key === "C") { e.preventDefault(); handleClear(); }
      else if (e.key === "Enter") { e.preventDefault(); handleNext(); }
      else if (/^[1-9]$/.test(e.key) && q && !isNumeric(q.question_type) && !isMatch(q.question_type)) {
        const idx = parseInt(e.key, 10) - 1;
        if (q.options[idx]) {
          if (isMulti(q.question_type)) handleMultiToggle(idx); else handleSingleSelect(idx);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, q, currentQ]);

  if (loading || authLoading) {
    return <div className="min-h-screen bg-neutral-50 flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }
  if (!test) return null;

  if (!started) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-card rounded-2xl border border-border p-6 space-y-5">
          <h2 className="text-xl font-black font-display text-foreground text-center">{test.title}</h2>
          <p className="text-sm text-muted-foreground text-center">{questions.length} questions · {test.duration_minutes} minutes</p>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
            <p className="text-xs font-bold text-amber-700 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Important — please read</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>Once started, the timer cannot be paused.</li>
              <li>Tab switching and right-click are logged.</li>
              <li>Your progress saves automatically every 15 seconds.</li>
              <li>The test auto-submits when time is up.</li>
              <li>Use the question palette on the right to navigate.</li>
              <li>Shortcuts: ← → navigate · 1-9 select option · M mark · C clear · Enter Save &amp; Next.</li>
            </ul>
          </div>
          {preloadProgress.total > 0 && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-center gap-2 text-xs text-muted-foreground">
              {preloadProgress.loaded < preloadProgress.total ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Pre-loading question images… {preloadProgress.loaded} / {preloadProgress.total}</>
              ) : (
                <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> All {preloadProgress.total} images ready</>
              )}
            </div>
          )}
          <button
            onClick={startAttempt}
            disabled={questions.length === 0}
            className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {questions.length === 0 ? "No questions in this test yet" : "I'm ready · Start Test"}
          </button>
          <Link to="/my-tests" className="block text-center text-xs text-muted-foreground hover:text-foreground">Back to test list</Link>
        </div>
      </div>
    );
  }

  if (!q) {
    return <div className="min-h-screen bg-neutral-50 flex items-center justify-center"><p className="text-sm text-muted-foreground">No questions available.</p></div>;
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  const lowTime = secondsLeft < 300;
  const numericValue = isNumeric(q.question_type) ? ((answers[q.id] as any)?.selected as string) || "" : "";

  const subjectIndex = subjectIndices.findIndex(({ i }) => i === currentQ);
  const subjectPosLabel = `${currentQ + 1} / ${questions.length}`;

  const typeLabel =
    q.question_type === "mcq-single" ? "Single Correct (MCQ)" :
    q.question_type === "mcq-multi" ? "Multiple Correct (MSQ)" :
    q.question_type === "integer" ? "Integer Type" :
    q.question_type === "numerical" ? "Numerical Answer" :
    q.question_type === "match-following" ? "Match the Following" :
    "Assertion & Reason";

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col select-none">
      {/* === Strip 1: Brand + test + candidate === */}
      <header className="bg-[#1E293B] text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-md bg-primary/20 flex items-center justify-center">
            <Flame className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-white/60">Computer Based Test</p>
            <p className="text-sm font-bold truncate">{test.title}</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2.5">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-white/60">Candidate</p>
            <p className="text-sm font-bold truncate max-w-[180px]">{candidate.name || "Candidate"}</p>
          </div>
          <div className="h-10 w-10 rounded-md overflow-hidden border-2 border-white/20 bg-white/10 flex items-center justify-center">
            {candidate.avatar ? (
              <img src={candidate.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-base font-black">{(candidate.name || "C").charAt(0).toUpperCase()}</span>
            )}
          </div>
        </div>
      </header>

      {/* === Strip 2: Timer + actions === */}
      <div className="bg-white border-b border-neutral-200 px-4 py-2 flex items-center gap-3">
        <button onClick={() => setShowInstructions(true)} className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50">
          <Info className="h-3.5 w-3.5" /> View Instructions
        </button>
        <button onClick={() => setPaletteOpen((v) => !v)} className="lg:hidden inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-bold text-neutral-700">
          <Menu className="h-3.5 w-3.5" /> Palette
        </button>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-neutral-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {savedAgo === null ? "Auto-save on" : savedAgo < 5 ? "Saved just now" : `Saved ${savedAgo}s ago`}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => { setSupportSent(false); setSupportMessage(""); setShowSupport(true); }}
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100"
            title="Need help during the test?"
          >
            <LifeBuoy className="h-3.5 w-3.5" /> Need help?
          </button>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] uppercase tracking-wide text-neutral-500">Time Left</p>
          </div>
          <div className={`flex items-center gap-2 rounded-md px-4 py-2 text-base font-black tabular-nums ${lowTime ? "bg-red-600 text-white animate-pulse" : "bg-[#1E293B] text-white"}`}>
            <Clock className="h-4 w-4" />
            {hh > 0 ? `${String(hh).padStart(2, "0")}:` : ""}{String(mm).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
        </div>
      </div>

      {/* === Strip 3: Subject tabs === */}
      {subjects.length > 1 && (
        <div className="border-b border-neutral-200 bg-white px-4 flex items-end gap-1 overflow-x-auto">
          {subjects.map((s) => {
            const isActive = activeSubject === s;
            const firstIdx = questions.findIndex((qq) => (qq.subject || "General") === s);
            return (
              <button key={s} onClick={() => { setActiveSubject(s); if (firstIdx >= 0) accrueTimeAndJump(firstIdx); }}
                className={`shrink-0 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors uppercase tracking-wide ${isActive ? "border-primary text-primary bg-primary/5" : "border-transparent text-neutral-600 hover:text-neutral-900"}`}>
                {s}
              </button>
            );
          })}
          <span className="ml-auto py-2.5 text-[11px] text-neutral-500">Section A</span>
        </div>
      )}

      {/* === Strip 3b: Topic pills (within active subject) === */}
      {topicsForSubject.length > 1 && (
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 pr-1 shrink-0">Topic:</span>
          <button
            onClick={() => setActiveTopic("ALL")}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${activeTopic === "ALL" ? "bg-primary text-white" : "bg-white border border-neutral-200 text-neutral-700 hover:border-primary/40"}`}
          >
            All
          </button>
          {topicsForSubject.map((t) => {
            const count = questions.filter((qq) => (qq.subject || "General") === activeSubject && (qq.topic || "Other") === t).length;
            const isActive = activeTopic === t;
            return (
              <button
                key={t}
                onClick={() => {
                  setActiveTopic(t);
                  const firstIdx = questions.findIndex((qq) => (qq.subject || "General") === activeSubject && (qq.topic || "Other") === t);
                  if (firstIdx >= 0) accrueTimeAndJump(firstIdx);
                }}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${isActive ? "bg-primary text-white" : "bg-white border border-neutral-200 text-neutral-700 hover:border-primary/40"}`}
              >
                {t} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      )}



      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* === Question area === */}
        <div className="flex-1 overflow-y-auto bg-neutral-50">
          <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-4">
            {/* Question meta */}
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <div>
                <p className="text-base font-black text-neutral-900">Question No. {currentQ + 1}</p>
                <p className="text-[11px] text-neutral-500">{activeSubject} · {subjectPosLabel}</p>
                {(statuses[q.id] === "marked" || statuses[q.id] === "answered-marked") && (
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                    <Flag className="h-3 w-3" /> Marked for Review
                  </div>
                )}
              </div>
              <div className="flex items-start gap-3">
                <div className="text-right text-[11px]">
                  <p className="text-neutral-500">Marks</p>
                  <p className="font-bold tabular-nums"><span className="text-emerald-600">+{q.marks_correct}</span> <span className="text-neutral-400">/</span> <span className="text-red-600">{q.marks_wrong}</span></p>
                </div>
                {test && attemptId && (
                  <ReportQuestionButton testId={test.id} questionId={q.id} attemptId={attemptId} questionNumber={currentQ + 1} />
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px]">
              <span className="rounded bg-neutral-200 px-2 py-0.5 font-bold text-neutral-700 uppercase">{typeLabel}</span>
              {q.topic && <span className="text-neutral-500">Topic: {q.topic}</span>}
              {q.sub_topic && <span className="text-neutral-400">· {q.sub_topic}</span>}
            </div>

            {/* Question card */}
            <div className="rounded-lg border border-neutral-200 bg-white p-5 space-y-4 shadow-sm">
              <div className="text-[15px] text-neutral-900 leading-relaxed"><MathRenderer content={q.question_text} /></div>

              {q.question_image_url && !/<img\b/i.test(q.question_text || "") && (
                <div className="relative inline-block min-h-[80px]">
                  {!loadedImgs.has(q.question_image_url) && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 rounded border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-xs text-neutral-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading question image…
                    </div>
                  )}
                  <img
                    src={q.question_image_url}
                    alt=""
                    onLoad={() => setLoadedImgs((prev) => { if (prev.has(q.question_image_url!)) return prev; const n = new Set(prev); n.add(q.question_image_url!); return n; })}
                    className={`rounded border border-neutral-200 max-h-72 select-none pointer-events-none ${loadedImgs.has(q.question_image_url) ? "opacity-100" : "opacity-0"}`}
                    draggable="false"
                  />
                </div>
              )}

              {/* Input */}
              {isMatch(q.question_type) ? (
                <MatchFollowing
                  left={(q.match_left ?? []) as MatchItem[]}
                  options={q.options}
                  optionImages={q.option_images ?? undefined}
                  value={((answers[q.id] as any)?.selected as Record<string, string>) || {}}
                  onChange={handleMatchChange}
                />
              ) : isNumeric(q.question_type) ? (
                <NumericInput
                  value={numericValue}
                  onChange={handleNumericInput}
                  questionType={q.question_type}
                  rangeMin={q.answer_range_min}
                  rangeMax={q.answer_range_max}
                />
              ) : isMulti(q.question_type) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {q.options.map((opt) => {
                    const sel: number[] = Array.isArray((answers[q.id] as any)?.selected) ? (answers[q.id] as any).selected : [];
                    const selected = sel.includes(opt.id);
                    const img = q.option_images?.[opt.id];
                    return (
                      <button key={opt.id} onClick={() => handleMultiToggle(opt.id)}
                        className={`w-full text-left rounded-md border-2 px-4 py-3 text-[14px] transition-all flex items-start gap-3 ${selected ? "border-primary bg-primary/5" : "border-neutral-200 bg-white hover:border-neutral-400"}`}>
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${selected ? "border-primary bg-primary text-white" : "border-neutral-400"}`}>
                          {selected && <CheckCircle2 className="h-3 w-3" />}
                        </span>
                        <div className="flex-1">
                          <span className="font-bold mr-1">{String.fromCharCode(65 + opt.id)}.</span>
                          <MathRenderer content={opt.text} inline />
                          {img && <img src={img} alt="" className="mt-2 max-h-32 rounded border border-neutral-200" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {q.options.map((opt) => {
                    const selected = (answers[q.id] as any)?.selected === opt.id;
                    const img = q.option_images?.[opt.id];
                    return (
                      <button key={opt.id} onClick={() => handleSingleSelect(opt.id)}
                        className={`w-full text-left rounded-md border-2 px-4 py-3 text-[14px] transition-all flex items-start gap-3 ${selected ? "border-primary bg-primary/5" : "border-neutral-200 bg-white hover:border-neutral-400"}`}>
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-primary" : "border-neutral-400"}`}>
                          {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                        </span>
                        <div className="flex-1">
                          <span className="font-bold mr-1">{String.fromCharCode(65 + opt.id)}.</span>
                          <MathRenderer content={opt.text} inline />
                          {img && <img src={img} alt="" className="mt-2 max-h-32 rounded border border-neutral-200" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <p className="text-[10px] text-neutral-400 text-center pb-2">
              Shortcuts: ← → navigate · 1-9 select · M mark · C clear · Enter save &amp; next
            </p>
          </div>
        </div>

        {/* === Right rail === */}
        <aside className={`lg:w-[300px] lg:shrink-0 border-t lg:border-t-0 lg:border-l border-neutral-200 bg-white flex flex-col ${paletteOpen ? "fixed inset-x-0 bottom-0 top-24 z-40 lg:static" : "hidden lg:flex"}`}>
          <div className="p-3 space-y-3 overflow-y-auto flex-1">
            <CandidateCard name={candidate.name} avatarUrl={candidate.avatar} />

            {/* Legend */}
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 grid grid-cols-2 gap-y-2 gap-x-3">
              <LegendRow status="answered" label="Answered" count={counts.answered} />
              <LegendRow status="not-answered" label="Not Answered" count={counts.notAnswered} />
              <LegendRow status="not-visited" label="Not Visited" count={counts.notVisited} />
              <LegendRow status="marked" label="Marked" count={counts.marked} />
              <LegendRow status="answered-marked" label="Answered & Marked" count={counts.answeredMarked} />
            </div>

            {/* Palette — subject switcher + active subject only */}
            <div className="space-y-3">
              {subjects.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {subjects.map((s) => {
                    const isActive = activeSubject === s;
                    return (
                      <button
                        key={s}
                        onClick={() => {
                          setActiveSubject(s);
                          const firstIdx = questions.findIndex((qq) => (qq.subject || "General") === s);
                          if (firstIdx >= 0) accrueTimeAndJump(firstIdx);
                        }}
                        className={`flex-1 min-w-[70px] rounded-md px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${isActive ? "bg-primary text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"}`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-col min-h-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-0.5 flex-1 bg-neutral-200" />
                  <p className="text-[10px] font-black uppercase tracking-wider text-neutral-600">{activeSubject} — Section A</p>
                  <div className="h-0.5 flex-1 bg-neutral-200" />
                </div>
                <div className="max-h-[320px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-6 gap-1.5">
                    {subjectIndices.map(({ i }, posIdx) => {
                      const qq = questions[i];
                      return (
                        <PaletteShape key={qq.id} status={toShape(statuses[qq.id])} active={i === currentQ} size={30} onClick={() => accrueTimeAndJump(i)} title={`Q${i + 1}`}>
                          {i + 1}
                        </PaletteShape>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

          </div>

          <div className="border-t border-neutral-200 p-3">
            <button onClick={() => { setPaletteOpen(false); setShowSubmit(true); }} disabled={submitting}
              className="w-full rounded-md bg-red-600 hover:bg-red-700 py-2.5 text-sm font-black text-white uppercase tracking-wide disabled:opacity-50">
              {submitting ? "Submitting..." : "Submit Test"}
            </button>
          </div>
        </aside>
      </div>

      {/* === Sticky action bar === */}
      <div className="sticky bottom-0 z-30 bg-white border-t border-neutral-200 px-3 py-2.5 flex flex-wrap items-center gap-2 shadow-[0_-2px_4px_rgba(0,0,0,0.04)]">
        <button onClick={handleMarkAndNext}
          className="rounded-md border border-violet-400 bg-violet-50 px-3 py-2 text-[11px] font-bold text-violet-700 hover:bg-violet-100 flex items-center gap-1.5 uppercase">
          <Flag className="h-3 w-3" /> Mark for Review &amp; Next
        </button>
        <button onClick={handleClear}
          className="rounded-md border border-neutral-300 px-3 py-2 text-[11px] font-bold text-neutral-700 hover:bg-neutral-50 uppercase">
          Clear Response
        </button>
        <button onClick={handleSaveAndMark}
          className="rounded-md border border-violet-400 px-3 py-2 text-[11px] font-bold text-violet-700 hover:bg-violet-50 uppercase">
          Save &amp; Mark for Review
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={handlePrev} disabled={currentQ === 0}
            className="rounded-md border border-neutral-300 px-3 py-2 text-[11px] font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 flex items-center gap-1 uppercase">
            <ArrowLeft className="h-3 w-3" /> Back
          </button>
          <button onClick={handleNext} disabled={currentQ === questions.length - 1} autoFocus
            className="rounded-md bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-[12px] font-black text-white disabled:opacity-40 flex items-center gap-1 uppercase shadow-md ring-2 ring-emerald-200 focus:outline-none focus:ring-emerald-400">
            Save &amp; Next <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* === Image zoom modal === */}
      {zoomImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setZoomImg(null)}>
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button onClick={(e) => { e.stopPropagation(); setZoomLevel((z) => Math.max(0.5, z - 0.25)); }} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><ZoomOut className="h-5 w-5" /></button>
            <span className="text-white text-xs font-bold tabular-nums w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={(e) => { e.stopPropagation(); setZoomLevel((z) => Math.min(4, z + 0.25)); }} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><ZoomIn className="h-5 w-5" /></button>
            <button onClick={() => setZoomImg(null)} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
          </div>
          <div className="overflow-auto max-h-[90vh] max-w-[95vw]" onClick={(e) => e.stopPropagation()}
            onWheel={(e) => { e.preventDefault(); setZoomLevel((z) => Math.max(0.5, Math.min(4, z + (e.deltaY < 0 ? 0.1 : -0.1)))); }}>
            <img src={zoomImg} alt="" className="rounded-lg transition-transform origin-center"
              style={{ transform: `scale(${zoomLevel})` }} />
          </div>
        </div>
      )}

      {/* === Instructions modal === */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowInstructions(false)}>
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 sticky top-0 bg-white pb-2 -mt-2 pt-2 border-b border-neutral-100">
              <h3 className="font-display text-lg font-black text-neutral-900">Test Instructions</h3>
              <button onClick={() => setShowInstructions(false)} className="rounded-full p-1 hover:bg-neutral-100"><X className="h-4 w-4" /></button>
            </div>
            {(test as any)?.instructions_image_url && (
              <div className="mb-4 overflow-hidden rounded-lg border border-neutral-200 bg-white">
                <img
                  src={(test as any).instructions_image_url}
                  alt="Exam instructions"
                  className="block h-auto w-full object-contain"
                />
              </div>
            )}
            <ul className="text-xs text-neutral-700 space-y-2 list-disc pl-4">
              <li>The test is timed. Auto-submits when time is up.</li>
              <li>Use the right palette to jump to any question.</li>
              <li>Answered &amp; Marked questions <b>are evaluated</b>.</li>
              <li>Only Marked (without an answer) is treated as unanswered.</li>
              <li>Tab switching, right-click and copy are logged.</li>
              <li>Shortcuts: ← → navigate · 1-9 select option · M mark · C clear · Enter save &amp; next.</li>
            </ul>
            <button onClick={() => setShowInstructions(false)} className="mt-5 w-full rounded-md bg-primary py-2 text-xs font-bold text-primary-foreground uppercase">Got it</button>
          </div>
        </div>
      )}

      {/* === Submit summary modal === */}
      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="font-display text-lg font-black text-neutral-900">Are you sure you want to submit for evaluation?</h3>
            <p className="mt-1 text-xs text-neutral-500">Review your attempt summary below. Once submitted you cannot change your answers.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <SummaryRow status="answered" label="Answered" v={counts.answered} />
              <SummaryRow status="not-answered" label="Not Answered" v={counts.notAnswered} />
              <SummaryRow status="marked" label="Marked" v={counts.marked} />
              <SummaryRow status="answered-marked" label="Answered & Marked" v={counts.answeredMarked} />
              <SummaryRow status="not-visited" label="Not Visited" v={counts.notVisited} />
              <div className="flex items-center gap-2 rounded-md border-2 border-primary/40 bg-primary/5 px-3 py-2">
                <span className="flex-1 text-neutral-700 font-bold">Total</span>
                <span className="font-black tabular-nums text-neutral-900">{questions.length}</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-neutral-500">
              Answered &amp; Marked questions <b>will be evaluated</b>. Click <b>Yes</b> to submit.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowSubmit(false)} className="rounded-md border border-neutral-300 px-5 py-2 text-xs font-bold uppercase">No</button>
              <button onClick={() => { setShowSubmit(false); handleSubmit(false); }}
                className="rounded-md bg-red-600 hover:bg-red-700 px-5 py-2 text-xs font-black text-white uppercase">Yes, Submit</button>
            </div>
          </div>
        </div>
      )}

      {showTabWarning && !showAutoBlocked && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border-t-4 border-red-600">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-black text-neutral-900">
                  {tabSwitches === 1 ? "Warning 1 of 3 — Window Switch Detected" : "Final Warning — 1 chance left"}
                </h3>
                <p className="mt-2 text-sm text-neutral-700 leading-relaxed">
                  {tabSwitches === 1
                    ? "You switched away from the test window. You have 2 more chances before your test is auto-submitted."
                    : "You have switched windows twice. The next switch will auto-submit your test immediately."}
                </p>
                <p className="mt-3 text-xs text-neutral-500">
                  Violations: <b className="text-red-600">{tabSwitches}</b> / 3
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowTabWarning(false)}
                className="rounded-md bg-red-600 hover:bg-red-700 px-5 py-2 text-xs font-black text-white uppercase"
              >
                I understand, continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showAutoBlocked && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl border-t-4 border-red-600 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <ShieldAlert className="h-12 w-12 text-red-600" />
            </div>
            <h3 className="mt-5 font-display text-xl font-black text-neutral-900">
              Test auto-submitted
            </h3>
            <p className="mt-3 text-sm text-neutral-600 leading-relaxed">
              You switched the test window 3 times. As per the exam policy, your test has been
              submitted automatically. The Bansal team will review your attempt.
            </p>
            <button
              onClick={() => navigate(successTargetRef.current, { replace: true })}
              className="mt-6 w-full rounded-md bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs font-black text-white uppercase tracking-wider"
            >
              Exit Test
            </button>
          </div>
        </div>
      )}

      {showSupport && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border-t-4 border-amber-500">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <LifeBuoy className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg font-black text-neutral-900">Need help?</h3>
                <p className="mt-1 text-xs text-neutral-600">
                  Send a message to the Bansal support team. We'll get back to you as soon as possible.
                </p>
              </div>
              <button onClick={() => setShowSupport(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {supportSent ? (
              <div className="mt-5 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                <p className="mt-2 text-sm font-bold text-emerald-800">Your request has been received.</p>
                <p className="mt-1 text-xs text-emerald-700">Continue your test — support will contact you shortly.</p>
                <button
                  onClick={() => setShowSupport(false)}
                  className="mt-4 rounded-md bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-black text-white uppercase"
                >
                  Back to test
                </button>
              </div>
            ) : (
              <>
                <div className="mt-4 rounded-md bg-neutral-50 border border-neutral-200 p-3 text-[11px] text-neutral-600 space-y-0.5">
                  <p><b>Student:</b> {candidate.name || "—"}</p>
                  <p><b>Test:</b> {test.title}</p>
                  <p><b>Question:</b> #{currentQ + 1} of {questions.length}</p>
                </div>
                <textarea
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value.slice(0, 1000))}
                  placeholder="Describe the issue you're facing (10–1000 characters)…"
                  rows={4}
                  className="mt-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                />
                <div className="mt-1 text-right text-[10px] text-neutral-500">{supportMessage.length}/1000</div>
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setShowSupport(false)}
                    className="rounded-md border border-neutral-300 px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={supportMessage.trim().length < 10 || supportSubmitting}
                    onClick={async () => {
                      if (supportMessage.trim().length < 10) {
                        toast.error("Please describe the issue (at least 10 characters).");
                        return;
                      }
                      setSupportSubmitting(true);
                      const { error } = await supabase.from("test_support_queries").insert({
                        attempt_id: attemptId,
                        test_id: test.id,
                        question_position: currentQ + 1,
                        message: supportMessage.trim(),
                      });
                      setSupportSubmitting(false);
                      if (error) {
                        toast.error(error.message);
                        return;
                      }
                      setSupportSent(true);
                      setSupportMessage("");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-xs font-black text-white uppercase"
                  >
                    {supportSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Send Request
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl border-t-4 border-green-600 text-center animate-in zoom-in-95 fade-in duration-200">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h3 className="mt-5 font-display text-xl font-black text-neutral-900">
              Your exam has been submitted successfully
            </h3>
            <p className="mt-3 text-sm text-neutral-600 leading-relaxed">
              Your result will be announced by the Bansal Team soon.
              <br />
              <span className="font-semibold text-neutral-800">Best of luck, Beta! 🌟</span>
            </p>
            <button
              onClick={() => { setShowSuccess(false); navigate(successTargetRef.current, { replace: true }); }}
              className="mt-6 w-full rounded-md bg-green-600 hover:bg-green-700 px-5 py-2.5 text-xs font-black text-white uppercase tracking-wider"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const LegendRow = ({ status, label, count }: { status: PaletteStatus; label: string; count: number }) => (
  <div className="flex items-center gap-2 text-[10px] text-neutral-700">
    <PaletteShape status={status} size={22} asButton={false}>
      <span className="text-[9px]">{count}</span>
    </PaletteShape>
    <span className="flex-1 leading-tight">{label}</span>
  </div>
);

const SummaryRow = ({ status, label, v }: { status: PaletteStatus; label: string; v: number }) => (
  <div className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2">
    <PaletteShape status={status} size={22} asButton={false}>
      <span className="text-[9px]">{v}</span>
    </PaletteShape>
    <span className="flex-1 text-neutral-700 truncate">{label}</span>
    <span className="font-black tabular-nums text-neutral-900">{v}</span>
  </div>
);


const NumericInput = ({
  value,
  onChange,
  questionType,
  rangeMin,
  rangeMax,
}: {
  value: string;
  onChange: (v: string) => void;
  questionType: "integer" | "numerical";
  rangeMin?: number | null;
  rangeMax?: number | null;
}) => {
  const isRange = rangeMin != null && rangeMax != null;
  const lo = isRange ? Math.min(Number(rangeMin), Number(rangeMax)) : null;
  const hi = isRange ? Math.max(Number(rangeMin), Number(rangeMax)) : null;

  // Both numerical and integer questions accept decimals and negatives.
  const allowDecimal = true;
  const allowNeg = true;

  // Defensive: strip any disallowed characters that may have come from a stored answer
  useEffect(() => {
    if (!value) return;
    let cleaned = value;
    if (!allowDecimal) cleaned = cleaned.replace(/\./g, "");
    if (!allowNeg) cleaned = cleaned.replace(/-/g, "");
    else {
      // keep only a single leading minus
      const neg = cleaned.startsWith("-");
      cleaned = (neg ? "-" : "") + cleaned.replace(/-/g, "");
    }
    if (allowDecimal) {
      const firstDot = cleaned.indexOf(".");
      if (firstDot !== -1) {
        cleaned =
          cleaned.slice(0, firstDot + 1) +
          cleaned.slice(firstDot + 1).replace(/\./g, "");
      }
    }
    if (cleaned !== value) onChange(cleaned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, questionType]);

  const press = (k: string) => {
    if (k === "back") return onChange(value.slice(0, -1));
    if (k === "clear") return onChange("");
    if (k === ".") {
      if (!allowDecimal || value.includes(".")) return;
      return onChange(value + ".");
    }
    if (k === "-") {
      if (!allowNeg) return;
      if (value.startsWith("-")) return onChange(value.slice(1));
      return onChange("-" + value);
    }
    onChange(value + k);
  };

  const placeholder = "";

  return (
    <div className="space-y-3">
      {isRange && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          <span className="font-bold uppercase tracking-wide text-[10px] mr-2">Range Answer</span>
          Any value between <b className="tabular-nums">{lo}</b> and <b className="tabular-nums">{hi}</b> (inclusive) will be marked correct.
        </div>
      )}
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
        <p className="text-[10px] font-bold uppercase text-muted-foreground">Your Answer</p>
        <input value={value} readOnly placeholder={placeholder}
          className="mt-1 w-full bg-transparent text-2xl font-bold tabular-nums text-foreground outline-none" />
      </div>
      <div className="grid grid-cols-5 gap-1.5 max-w-sm">
        {["7","8","9","back","clear","4","5","6",".","-","1","2","3","0"].map((k) => {
          const disabled =
            (k === "." && !allowDecimal) ||
            (k === "-" && !allowNeg);
          return (
            <button
              key={k}
              onClick={() => { if (!disabled) press(k); }}
              disabled={disabled}
              className={`h-11 rounded-lg border border-border text-sm font-bold transition-colors ${
                disabled
                  ? "bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
                  : k === "back" || k === "clear"
                    ? "bg-muted/50 text-foreground/70 hover:bg-muted"
                    : "bg-card text-foreground hover:bg-muted"
              }`}>
              {k === "back" ? <Delete className="mx-auto h-4 w-4" /> : k === "clear" ? "C" : k}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Decimals and negative numbers are allowed.
      </p>
    </div>
  );

};

export default TestTakingPage;

