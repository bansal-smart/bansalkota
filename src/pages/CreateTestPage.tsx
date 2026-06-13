import { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Trash2, Loader2, GripVertical, BookMarked, FileText, Image as ImageIcon, Upload } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import QuestionBankPanel from "@/components/QuestionBankPanel";
import DocxBulkImportDialog from "@/components/DocxBulkImportDialog";
import DocxCommonImportDialog from "@/components/DocxCommonImportDialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { BankQuestion } from "@/hooks/useQuestionBank";
import { useExams } from "@/hooks/useExams";
import { syncTestStats } from "@/lib/tests/syncTestStats";
import MathRenderer from "@/components/MathRenderer";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type QType = "mcq-single" | "mcq-multi" | "numerical" | "integer";

type DraftQuestion = {
  id?: string;
  imported?: boolean;
  source: "manual" | "bank";
  bank_id?: string;
  type: QType;
  subject: string;
  topic: string;
  text: string;
  imageUrl: string | null;     // optional diagram / figure
  options: string[];           // used by mcq-*
  optionImages: string[];      // per-option image URLs (index-aligned, "" = none)
  correct: number;             // used by mcq-single
  correctMulti: number[];      // used by mcq-multi
  partial: boolean;            // used by mcq-multi
  numericalAnswer: string;     // used by numerical / integer
  tolerance: number;           // used by numerical
  marksCorrect: number;        // per-question positive marks
  marksWrong: number;          // per-question negative marks
};

const blankQuestion = (defaults: { correct: number; wrong: number }): DraftQuestion => ({
  source: "manual",
  type: "mcq-single",
  subject: "Physics",
  topic: "",
  text: "",
  imageUrl: null,
  options: ["", "", "", ""],
  optionImages: ["", "", "", ""],
  correct: 0,
  correctMulti: [],
  partial: false,
  numericalAnswer: "",
  tolerance: 0,
  marksCorrect: defaults.correct,
  marksWrong: defaults.wrong,
});

const fromBank = (q: BankQuestion, defaults: { correct: number; wrong: number }): DraftQuestion => {
  const bankType = ((q as any).question_type ?? "mcq-single") as QType;
  const corr = (q as any).correct_answer;
  const correctIdx = typeof corr === "number" ? corr
    : (corr && typeof corr === "object" && "value" in corr) ? 0
    : 0;
  const correctArr = Array.isArray(corr) ? (corr as number[]) : [];
  const numericalVal = (q as any).numerical_answer != null
    ? String((q as any).numerical_answer)
    : (corr && typeof corr === "object" && "value" in corr ? String((corr as any).value) : "");
  return {
    source: "bank",
    bank_id: q.id,
    type: bankType,
    subject: q.subject,
    topic: q.topic || "",
    text: q.question_text,
    imageUrl: (q as any).question_image_url ?? null,
    options: (q.options ?? []).map((o) => o.text),
    optionImages: Array.isArray((q as any).option_images) ? (q as any).option_images.map((s: any) => String(s ?? "")) : ["", "", "", ""],
    correct: correctIdx,
    correctMulti: correctArr,
    partial: !!(q as any).partial_marking,
    numericalAnswer: numericalVal,
    tolerance: Number((q as any).tolerance ?? 0),
    // Auto-set marks from the bank question; fall back to test defaults
    marksCorrect: Number(q.marks_correct ?? defaults.correct),
    marksWrong: Number(q.marks_wrong ?? defaults.wrong),
  };
};

const hasRenderableContent = (value: string) =>
  value.replace(/<[^>]*>/g, "").trim().length > 0 || /<img\b/i.test(value);

const DropZone = ({ children, empty }: { children: React.ReactNode; empty: boolean }) => {
  const { setNodeRef, isOver } = useDroppable({ id: "test-drop" });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border-2 border-dashed transition-colors ${isOver ? "border-primary bg-primary/5" : "border-border"} ${empty ? "min-h-[120px] flex items-center justify-center p-6" : "p-2 space-y-2"}`}
    >
      {empty ? (
        <p className="text-xs text-muted-foreground text-center">
          Drag questions from the Question Bank, or add a manual question below.
        </p>
      ) : children}
    </div>
  );
};

const CreateTestPage = () => {
  const { exams: examList } = useExams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ testId?: string; slug?: string }>();
  const slugParam = params.slug;
  const testIdParam = params.testId;

  const isAdminContext = location.pathname.startsWith("/admin");
  const isEditMode = Boolean(slugParam || testIdParam);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [testType, setTestType] = useState("mock");
  const [examPattern, setExamPattern] = useState("jee-main");
  const [duration, setDuration] = useState(180);
  const [correctMarks, setCorrectMarks] = useState(4);
  const [wrongMarks, setWrongMarks] = useState(-1);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [bankSheetOpen, setBankSheetOpen] = useState(false);
  const [courseId, setCourseId] = useState<string>("");
  const [myCourses, setMyCourses] = useState<{ id: string; name: string }[]>([]);
  const [resolvedTestId, setResolvedTestId] = useState<string | null>(testIdParam ?? null);
  const [docxImportOpen, setDocxImportOpen] = useState(false);
  const [commonImportOpen, setCommonImportOpen] = useState(false);
  const [importTargetTestId, setImportTargetTestId] = useState<string | null>(null);
  const [createdDraftSlug, setCreatedDraftSlug] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [testMode, setTestMode] = useState<"digital" | "cbt">("digital");
  const [allowedBatches, setAllowedBatches] = useState<string[]>([]);
  const [batchOptions, setBatchOptions] = useState<{ id: string; code: string; name: string }[]>([]);
  const importedQuestionCount = useRef(0);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Load courses (admin sees all, teacher sees own)
  useEffect(() => {
    if (!user) return;
    let ignore = false;
    (async () => {
      const q = supabase.from("courses").select("id,name").order("created_at", { ascending: false });
      const { data } = isAdminContext ? await q : await q.eq("created_by", user.id);
      if (!ignore) setMyCourses(data ?? []);
    })();
    return () => { ignore = true; };
  }, [user, isAdminContext]);

  // Load all batches for CBT batch picker
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("course_batches").select("id, code, name").order("code");
      setBatchOptions((data ?? []) as { id: string; code: string; name: string }[]);
    })();
  }, []);

  // Load existing test for edit mode (by slug or id)
  useEffect(() => {
    if (!isEditMode) return;
    let ignore = false;
    (async () => {
      const baseQ = supabase.from("tests").select("*");
      const isUuid = (s?: string) => !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      const useId = testIdParam || (slugParam && isUuid(slugParam) ? slugParam : null);
      const { data: test } = useId
        ? await baseQ.eq("id", useId).maybeSingle()
        : await baseQ.eq("slug", slugParam!).maybeSingle();
      if (ignore) return;
      if (!test) {
        toast.error("Test not found");
        navigate(isAdminContext ? "/admin/tests" : "/teacher/dashboard");
        return;
      }
      const { data: tqs } = await supabase
        .from("test_questions")
        .select("*")
        .eq("test_id", test.id)
        .order("position");
      if (ignore) return;
      setResolvedTestId(test.id);
      importedQuestionCount.current = (tqs ?? []).length;
      setTitle(test.title ?? "");
      setDescription(test.description ?? "");
      setTestType(test.test_type ?? "mock");
      setExamPattern(test.exam_pattern ?? "jee-main");
      setDuration(test.duration_minutes ?? 180);
      setCorrectMarks(Number(test.correct_marks ?? 4));
      setWrongMarks(Number(test.wrong_marks ?? -1));
      setCourseId(test.course_id ?? "");
      setTestMode(((test as { test_mode?: string }).test_mode === "cbt" ? "cbt" : "digital"));
      setAllowedBatches(Array.isArray((test as { cbt_allowed_batch_ids?: string[] }).cbt_allowed_batch_ids)
        ? ((test as { cbt_allowed_batch_ids?: string[] }).cbt_allowed_batch_ids as string[])
        : []);
      setQuestions(
        (tqs ?? []).map((q: any) => {
          const type = (q.question_type ?? "mcq-single") as QType;
          const correctIdx = typeof q.correct_answer === "number" ? q.correct_answer : 0;
          const correctArr = Array.isArray(q.correct_answer) ? (q.correct_answer as number[]) : [];
          return {
            source: "manual" as const,
            id: q.id,
            imported: Boolean(q.import_batch_id || q.source_filename),
            type,
            subject: q.subject ?? "Physics",
            topic: q.topic ?? "",
            text: q.question_text ?? "",
            imageUrl: q.question_image_url ?? null,
            options: Array.isArray(q.options)
              ? q.options.map((o: any) => (typeof o === "string" ? o : o?.text ?? ""))
              : ["", "", "", ""],
            optionImages: Array.isArray(q.option_images)
              ? (q.option_images as any[]).map((s) => String(s ?? ""))
              : ["", "", "", ""],
            correct: correctIdx,
            correctMulti: correctArr,
            partial: !!q.partial_marking,
            numericalAnswer: q.numerical_answer != null ? String(q.numerical_answer) : "",
            tolerance: Number(q.tolerance ?? 0),
            marksCorrect: Number(q.marks_correct ?? 4),
            marksWrong: Number(q.marks_wrong ?? -1),
          };
        }),
      );
      setLoading(false);
    })();
    return () => { ignore = true; };
  }, [isEditMode, slugParam, testIdParam, isAdminContext, navigate, reloadKey]);

  const updateQ = (i: number, patch: Partial<DraftQuestion>) => {
    const next = [...questions];
    next[i] = { ...next[i], ...patch };
    setQuestions(next);
  };

  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const uploadQuestionImage = async (i: number, file: File) => {
    if (!user) return toast.error("Sign in required");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    if (!file.type.startsWith("image/")) return toast.error("File must be an image");
    setUploadingIdx(i);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("question-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("question-images").getPublicUrl(path);
      updateQ(i, { imageUrl: data.publicUrl });
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploadingIdx(null);
    }
  };

  const [uploadingOpt, setUploadingOpt] = useState<string | null>(null); // `${i}:${oi}`
  const uploadOptionImage = async (i: number, oi: number, file: File) => {
    if (!user) return toast.error("Sign in required");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    if (!file.type.startsWith("image/")) return toast.error("File must be an image");
    const key = `${i}:${oi}`;
    setUploadingOpt(key);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("question-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("question-images").getPublicUrl(path);
      const next = [...(questions[i].optionImages ?? ["", "", "", ""])];
      while (next.length <= oi) next.push("");
      next[oi] = data.publicUrl;
      updateQ(i, { optionImages: next });
      toast.success("Option image uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploadingOpt(null);
    }
  };

  const addedBankIds = useMemo(
    () => new Set(questions.map((q) => q.bank_id).filter(Boolean) as string[]),
    [questions],
  );

  const addFromBank = (bankQ: BankQuestion) => {
    if (addedBankIds.has(bankQ.id)) {
      toast.info("Already added to this test");
      return;
    }
    setQuestions((prev) => [...prev, fromBank(bankQ, { correct: correctMarks, wrong: wrongMarks })]);
    toast.success("Question added");
  };

  const handleDragEnd = (e: DragEndEvent) => {
    if (e.over?.id !== "test-drop") return;
    const bankQ = e.active.data.current?.question as BankQuestion | undefined;
    if (!bankQ) return;
    addFromBank(bankQ);
  };

  const ensureDraftForImport = async (): Promise<string | null> => {
    if (resolvedTestId) return resolvedTestId;
    if (!user) {
      toast.error("Sign in required");
      return null;
    }
    if (!title.trim()) {
      toast.error("Enter a test name first");
      return null;
    }

    setSubmitting(true);
    const slug = `${slugify(title)}-${Date.now().toString(36)}`;
    const { data: test, error } = await supabase
      .from("tests")
      .insert({
        title,
        description,
        test_type: testType,
        exam_pattern: examPattern,
        subjects: [],
        duration_minutes: duration,
        correct_marks: correctMarks,
        wrong_marks: wrongMarks,
        total_questions: 0,
        total_marks: 0,
        is_published: false,
        course_id: courseId || null,
        test_mode: testMode,
        cbt_enabled: testMode === "cbt",
        cbt_allowed_batch_ids: testMode === "cbt" ? allowedBatches : null,
        slug,
        created_by: user.id,
      })
      .select("id, slug")
      .single();
    setSubmitting(false);

    if (error || !test) {
      toast.error(error?.message ?? "Could not create draft test");
      return null;
    }

    setResolvedTestId(test.id);
    setCreatedDraftSlug(test.slug);
    toast.success("Draft test created — questions will import directly into it");
    return test.id;
  };

  const openDocxImport = async (method: "master" | "common") => {
    const tid = await ensureDraftForImport();
    if (!tid) return;
    setImportTargetTestId(tid);
    if (method === "common") setCommonImportOpen(true);
    else setDocxImportOpen(true);
  };

  const afterImport = () => {
    setDocxImportOpen(false);
    setCommonImportOpen(false);
    setReloadKey((k) => k + 1);
    toast.success("Questions appended — reloading list");
    if (!isEditMode && createdDraftSlug) {
      navigate(`/admin/tests/${createdDraftSlug}/edit`, { replace: true });
    }
  };

  const publishImportedDraft = async () => {
    if (!resolvedTestId) return toast.error("Create or import into a test first");
    setSubmitting(true);
    try {
      await syncTestStats(resolvedTestId);
      const { error } = await supabase
        .from("tests")
        .update({
          title,
          description,
          test_type: testType,
          exam_pattern: examPattern,
          duration_minutes: duration,
          correct_marks: correctMarks,
          wrong_marks: wrongMarks,
          course_id: courseId || null,
          test_mode: testMode,
          cbt_enabled: testMode === "cbt",
          cbt_allowed_batch_ids: testMode === "cbt" ? allowedBatches : null,
          is_published: true,
        })
        .eq("id", resolvedTestId);
      if (error) throw error;
      toast.success("Test published with imported questions");
      navigate(isAdminContext ? "/admin/tests" : "/teacher/dashboard");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not publish imported test");
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (publish: boolean) => {
    if (!user) return toast.error("Sign in required");
    if (!title.trim()) return toast.error("Title required");
    const isComplete = (q: DraftQuestion) => {
      if (!hasRenderableContent(q.text)) return false;
      const hasOptionContent =
        q.options.some((o) => o.trim()) ||
        q.optionImages.some(Boolean) ||
        /<img\b/i.test(q.text);
      if (q.type === "mcq-single") return q.options.length >= 2 && hasOptionContent && Number.isInteger(q.correct);
      if (q.type === "mcq-multi") return q.options.length >= 2 && hasOptionContent && q.correctMulti.length > 0;
      if (q.type === "numerical" || q.type === "integer") return q.numericalAnswer.trim() !== "" && !Number.isNaN(Number(q.numericalAnswer));
      return false;
    };
    if (isEditMode && resolvedTestId && questions.some((q) => q.imported)) {
      return publishImportedDraft();
    }

    const validQ = questions.filter(isComplete);
    if (validQ.length === 0) return toast.error("Add at least one complete question");

    setSubmitting(true);

    const subjects = Array.from(new Set(validQ.map((q) => q.subject)));

    const basePayload = {
      title,
      description,
      test_type: testType,
      exam_pattern: examPattern,
      subjects,
      duration_minutes: duration,
      correct_marks: correctMarks,
      wrong_marks: wrongMarks,
      total_questions: validQ.length,
      total_marks: validQ.reduce((s, q) => s + Number(q.marksCorrect || 0), 0),
      is_published: publish,
      course_id: courseId || null,
      test_mode: testMode,
      cbt_enabled: testMode === "cbt",
      cbt_allowed_batch_ids: testMode === "cbt" ? allowedBatches : null,
    };

    let savedTestId: string | null = resolvedTestId;

    if (isEditMode && resolvedTestId) {
      const { error } = await supabase.from("tests").update(basePayload).eq("id", resolvedTestId);
      if (error) {
        toast.error(error.message);
        setSubmitting(false);
        return;
      }
      await supabase.from("test_questions").delete().eq("test_id", resolvedTestId);
    } else {
      const slug = `${slugify(title)}-${Date.now().toString(36)}`;
      const { data: test, error } = await supabase
        .from("tests")
        .insert({ ...basePayload, slug, created_by: user.id })
        .select("id")
        .single();
      if (error || !test) {
        toast.error(error?.message ?? "Could not create test");
        setSubmitting(false);
        return;
      }
      savedTestId = test.id;
    }

    const rows = validQ.map((q, i) => {
      const base: any = {
        test_id: savedTestId,
        position: i,
        subject: q.subject,
        topic: q.topic || null,
        question_text: q.text,
        question_image_url: q.imageUrl || null,
        question_type: q.type,
        marks_correct: Number(q.marksCorrect ?? correctMarks),
        marks_wrong: Number(q.marksWrong ?? wrongMarks),
        options: [],
        option_images: [],
        correct_answer: null,
      };
      // Normalize option_images to match option count
      const optImgs = (q.optionImages ?? []).slice(0, q.options.length);
      while (optImgs.length < q.options.length) optImgs.push("");
      if (q.type !== "numerical" && q.type !== "integer") {
        base.option_images = optImgs;
      }
      // Remove the duplicate stub `correct_answer: null` below by overwriting later
      if (q.type === "mcq-single") {
        base.options = q.options.map((t, id) => ({ id, text: t }));
        base.correct_answer = q.correct;
      } else if (q.type === "mcq-multi") {
        base.options = q.options.map((t, id) => ({ id, text: t }));
        base.correct_answer = q.correctMulti.slice().sort((a, b) => a - b);
        base.partial_marking = q.partial;
      } else if (q.type === "numerical" || q.type === "integer") {
        base.options = [];
        base.correct_answer = { value: Number(q.numericalAnswer) };
        base.numerical_answer = Number(q.numericalAnswer);
        base.tolerance = q.type === "integer" ? 0 : Number(q.tolerance || 0);
        base.answer_format = q.type === "integer" ? "integer" : "decimal";
      }
      return base;
    });
    const { error: qErr } = await supabase.from("test_questions").insert(rows);
    if (qErr) {
      toast.error(qErr.message);
      setSubmitting(false);
      return;
    }

    toast.success(
      isEditMode
        ? publish
          ? "Test updated and published"
          : "Test saved as draft"
        : publish
          ? "Test published"
          : "Draft saved",
    );
    setSubmitting(false);
    navigate(isAdminContext ? "/admin/tests" : "/teacher/dashboard");
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
  const labelCls = "block text-xs font-semibold text-foreground mb-1.5";

  const LeftPane = (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {isEditMode ? "Edit Test" : "Create New Test"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drag questions from the bank on the right, or add manual ones.
          </p>
        </div>
      </div>

      {/* Test Details card */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <h2 className="text-lg font-bold text-foreground">Test Details</h2>

        <div>
          <label className={labelCls}>Test Mode</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { v: "digital", label: "Digital (Web + App)", hint: "Students take this from inside the LMS after logging in." },
              { v: "cbt", label: "CBT (Kiosk Only)", hint: "Students take this on lab computers at /cbt using roll no + mobile." },
            ] as const).map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setTestMode(opt.v)}
                className={`text-left rounded-xl border p-3 transition ${testMode === opt.v ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
              >
                <p className={`text-sm font-bold ${testMode === opt.v ? "text-primary" : "text-foreground"}`}>{opt.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{opt.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {testMode === "cbt" && (
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kiosk URL</p>
              <code className="text-xs bg-background rounded px-2 py-1 inline-block mt-1">{typeof window !== "undefined" ? `${window.location.origin}/cbt` : "/cbt"}</code>
              <p className="text-[10px] text-muted-foreground mt-1">All CBT tests use this single fixed link. Students log in with roll no + mobile.</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-1.5">Allowed batches <span className="text-muted-foreground font-normal">({allowedBatches.length === 0 ? "open to all batches" : `${allowedBatches.length} selected`})</span></p>
              <div className="flex flex-wrap gap-1.5">
                {batchOptions.length === 0 && <p className="text-[11px] text-muted-foreground">No batches yet — create them under Batches & CBT Setup.</p>}
                {batchOptions.map((b) => {
                  const sel = allowedBatches.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setAllowedBatches(sel ? allowedBatches.filter((x) => x !== b.id) : [...allowedBatches, b.id])}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground hover:bg-muted"}`}
                    >
                      {b.code}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>Test Name</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Class 11 Maths Practice — Trigonometry"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description (optional)"
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Test Type</label>
            <select value={testType} onChange={(e) => setTestType(e.target.value)} className={inputCls}>
              <option value="mock">Mock Test</option>
              <option value="chapter">Chapter Test</option>
              <option value="pyq">Previous Year</option>
              <option value="practice">Practice</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Exam Pattern</label>
            <select value={examPattern} onChange={(e) => setExamPattern(e.target.value)} className={inputCls}>
              {examList.length === 0 && (
                <>
                  <option value="jee-main">JEE Main</option>
                  <option value="jee-advanced">JEE Advanced</option>
                  <option value="neet">NEET</option>
                </>
              )}
              {examList.map((x) => (
                <option key={x.id} value={x.code || x.name.toLowerCase().replace(/\s+/g, "-")}>
                  {x.name}
                </option>
              ))}
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Associate with Course</label>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputCls}>
            <option value="">Standalone test (not linked to any course)</option>
            {myCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Linked tests will appear inside the selected course for enrolled students.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Duration (min)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 0)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Correct marks</label>
            <input
              type="number"
              value={correctMarks}
              onChange={(e) => setCorrectMarks(Number(e.target.value) || 0)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Wrong marks</label>
            <input
              type="number"
              value={wrongMarks}
              onChange={(e) => setWrongMarks(Number(e.target.value) || 0)}
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* Selected Questions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-lg font-bold text-foreground">
            Selected Questions <span className="text-muted-foreground font-semibold">({questions.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <Sheet open={bankSheetOpen} onOpenChange={setBankSheetOpen}>
              <SheetTrigger asChild>
                <button className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted">
                  <BookMarked className="h-3.5 w-3.5" /> Open Bank
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-full sm:max-w-md">
                <div className="h-full">
                  <QuestionBankPanel draggable compact onAdd={addFromBank} addedBankIds={addedBankIds} />
                </div>
              </SheetContent>
            </Sheet>
            <button
              onClick={() => openDocxImport("master")}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              title="Master method — parses numbered questions with (1)–(4) options and Answer: line"
            >
              <FileText className="h-3.5 w-3.5" /> Master import
            </button>
            <button
              onClick={() => openDocxImport("common")}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
              title="Common method — cropped 3-column .docx where the printed question + options are one block"
            >
              <FileText className="h-3.5 w-3.5" /> Common import
            </button>
            <button
              onClick={() => setQuestions([...questions, blankQuestion({ correct: correctMarks, wrong: wrongMarks })])}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> Add Manual
            </button>
          </div>
        </div>

        <DropZone empty={questions.length === 0}>
          {questions.map((q, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                  Q{i + 1}
                </span>
                {q.source === "bank" && (
                  <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    From Bank
                  </span>
                )}
                <select
                  value={q.subject}
                  onChange={(e) => updateQ(i, { subject: e.target.value })}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none"
                >
                  <option>Physics</option>
                  <option>Chemistry</option>
                  <option>Mathematics</option>
                  <option>Biology</option>
                </select>
                <input
                  value={q.topic}
                  onChange={(e) => updateQ(i, { topic: e.target.value })}
                  placeholder="Topic"
                  className="flex-1 min-w-[120px] rounded-md border border-border bg-background px-2 py-1 text-xs outline-none"
                />
                <select
                  value={q.type}
                  onChange={(e) => updateQ(i, { type: e.target.value as QType })}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none"
                  title="Question type"
                >
                  <option value="mcq-single">Single Correct</option>
                  <option value="mcq-multi">Multiple Correct</option>
                  <option value="numerical">Numerical</option>
                  <option value="integer">Integer</option>
                </select>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground" title="Auto-set from the question bank; edit per question">
                  <span>+</span>
                  <input
                    type="number"
                    step="0.25"
                    value={q.marksCorrect}
                    onChange={(e) => updateQ(i, { marksCorrect: Number(e.target.value) })}
                    className="w-12 rounded-md border border-border bg-background px-1 py-1 text-xs text-foreground outline-none tabular-nums"
                    aria-label="Marks for correct"
                  />
                  <span>/</span>
                  <input
                    type="number"
                    step="0.25"
                    value={q.marksWrong}
                    onChange={(e) => updateQ(i, { marksWrong: Number(e.target.value) })}
                    className="w-12 rounded-md border border-border bg-background px-1 py-1 text-xs text-foreground outline-none tabular-nums"
                    aria-label="Marks for wrong"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setQuestions(questions.filter((_, j) => j !== i))}
                  className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  aria-label="Remove question"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                value={q.text}
                onChange={(e) => updateQ(i, { text: e.target.value })}
                placeholder="Question text (LaTeX supported, e.g. $x^2$)"
                rows={2}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none resize-none"
              />

              {/* Question image (diagram / figure) */}
              <div className="flex items-start gap-3">
                {q.imageUrl ? (
                  <div className="relative">
                    <img src={q.imageUrl} alt="Question diagram" className="max-h-36 rounded-md border border-border" />
                    <div className="absolute -top-2 -right-2 flex gap-1">
                      <label className="cursor-pointer rounded-full bg-primary text-primary-foreground p-1 shadow" title="Replace image">
                        <Upload className="h-3 w-3" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadQuestionImage(i, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => updateQ(i, { imageUrl: null })}
                        className="rounded-full bg-destructive text-destructive-foreground p-1 shadow"
                        title="Remove image"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted cursor-pointer">
                    {uploadingIdx === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
                    {uploadingIdx === i ? "Uploading…" : "Add image (PNG/JPG ≤5MB)"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadQuestionImage(i, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>


              {(q.type === "mcq-single" || q.type === "mcq-multi") && (
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => {
                    const isCorrect = q.type === "mcq-multi" ? q.correctMulti.includes(oi) : q.correct === oi;
                    const optImg = q.optionImages?.[oi] || "";
                    const optKey = `${i}:${oi}`;
                    return (
                      <div
                        key={oi}
                        className={`rounded-lg border px-3 py-1.5 transition-colors ${
                          isCorrect ? "border-secondary bg-secondary/10" : "border-border bg-background"
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer">
                          {q.type === "mcq-multi" ? (
                            <input
                              type="checkbox"
                              checked={isCorrect}
                              onChange={() => {
                                const set = new Set(q.correctMulti);
                                if (set.has(oi)) set.delete(oi); else set.add(oi);
                                updateQ(i, { correctMulti: Array.from(set).sort((a, b) => a - b) });
                              }}
                              className="shrink-0 accent-secondary"
                            />
                          ) : (
                            <input
                              type="radio"
                              checked={isCorrect}
                              onChange={() => updateQ(i, { correct: oi })}
                              className="shrink-0 accent-secondary"
                            />
                          )}
                          <span className="text-xs font-bold w-5 text-foreground">{String.fromCharCode(65 + oi)}.</span>
                          <input
                            value={opt}
                            onChange={(e) => {
                              const next = [...q.options];
                              next[oi] = e.target.value;
                              updateQ(i, { options: next });
                            }}
                            placeholder={`Option ${oi + 1} — LaTeX OK ($x^2$)`}
                            className="flex-1 bg-transparent text-sm outline-none"
                          />
                          {optImg ? (
                            <span className="relative inline-flex items-center">
                              <img src={optImg} alt="" className="h-8 w-8 rounded border border-border object-cover" />
                              <label className="ml-1 cursor-pointer rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary" title="Replace">
                                ↻
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadOptionImage(i, oi, f); e.target.value = ""; }} />
                              </label>
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); const next = [...(q.optionImages ?? [])]; next[oi] = ""; updateQ(i, { optionImages: next }); }}
                                className="ml-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive"
                                title="Remove image"
                              >
                                ×
                              </button>
                            </span>
                          ) : (
                            <label className="cursor-pointer rounded-md border border-dashed border-border px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-muted" title="Add image to this option">
                              {uploadingOpt === optKey ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadOptionImage(i, oi, f); e.target.value = ""; }} />
                            </label>
                          )}
                        </label>
                      </div>
                    );
                  })}
                  {q.type === "mcq-multi" && (
                    <label className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <input type="checkbox" checked={q.partial} onChange={(e) => updateQ(i, { partial: e.target.checked })} />
                      Enable partial marking (proportional credit when subset of correct options is selected, no wrong picks)
                    </label>
                  )}
                </div>
              )}

              {(q.type === "numerical" || q.type === "integer") && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-foreground">
                      Correct {q.type === "integer" ? "Integer" : "Numerical"} Answer
                    </label>
                    <input
                      value={q.numericalAnswer}
                      onChange={(e) => updateQ(i, { numericalAnswer: e.target.value })}
                      placeholder={q.type === "integer" ? "e.g. 7" : "e.g. 3.14"}
                      inputMode="decimal"
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none tabular-nums"
                    />
                  </div>
                  {q.type === "numerical" && (
                    <div>
                      <label className="text-[11px] font-semibold text-foreground">Tolerance (±)</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={q.tolerance}
                        onChange={(e) => updateQ(i, { tolerance: Number(e.target.value) || 0 })}
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none tabular-nums"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </DropZone>
      </section>
    </div>
  );

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex">
        {/* Left pane (form) */}
        <div className="flex-1 lg:w-1/2 lg:flex-none px-4 md:px-8 py-6 pb-28">
          <div className="max-w-3xl mx-auto">{LeftPane}</div>
        </div>

        {/* Right pane (Question Bank) — desktop only, sticky with its own scroll */}
        <aside className="hidden lg:flex lg:w-1/2 border-l border-border bg-muted/30 flex-col sticky top-[57px] self-start h-[calc(100vh-57px)]">
          <QuestionBankPanel draggable compact onAdd={addFromBank} addedBankIds={addedBankIds} />
        </aside>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 left-0 right-0 z-20 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="lg:w-1/2 px-4 md:px-8 py-3">
          <div className="max-w-3xl mx-auto flex gap-3">
            <button
              disabled={submitting}
              onClick={() => submit(false)}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save Draft"}
            </button>
            <button
              disabled={submitting}
              onClick={() => questions.length === 0 && importedQuestionCount.current > 0 ? publishImportedDraft() : submit(true)}
              className="flex-1 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : isEditMode ? (
                "Save & Publish"
              ) : (
                "Publish Test"
              )}
            </button>
          </div>
        </div>
      </div>
      <DocxBulkImportDialog
        open={docxImportOpen}
        onClose={() => setDocxImportOpen(false)}
        onImported={afterImport}
        testId={importTargetTestId ?? resolvedTestId ?? undefined}
      />
      <DocxCommonImportDialog
        open={commonImportOpen}
        onClose={() => setCommonImportOpen(false)}
        onImported={afterImport}
        testId={importTargetTestId ?? resolvedTestId ?? undefined}
      />
    </DndContext>
  );
};

export default CreateTestPage;
