import { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Trash2, Loader2, GripVertical, BookMarked, FileText, Image as ImageIcon, Upload, HelpCircle } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import AspectRatioHint from "@/components/admin/AspectRatioHint";
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
import MasterImportInstructions from "@/components/MasterImportInstructions";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { BankQuestion } from "@/hooks/useQuestionBank";
import { useExams } from "@/hooks/useExams";
import { syncTestStats } from "@/lib/tests/syncTestStats";
import MathRenderer from "@/components/MathRenderer";
import { useConfirm } from "@/components/ConfirmDialog";
import { formatTestDate } from "@/lib/utils";


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
  rangeEnabled: boolean;       // integer/numerical: accept any value in [min, max]
  rangeMin: string;
  rangeMax: string;
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
  rangeEnabled: false,
  rangeMin: "",
  rangeMax: "",
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
    rangeEnabled: (q as any).answer_range_min != null && (q as any).answer_range_max != null,
    rangeMin: (q as any).answer_range_min != null ? String((q as any).answer_range_min) : "",
    rangeMax: (q as any).answer_range_max != null ? String((q as any).answer_range_max) : "",
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
  const [instructionsImageUrl, setInstructionsImageUrl] = useState<string>("");
  // Persist a stable (token-free) public-format URL — display layer re-signs at runtime.
  const stableInstructionsUrl = (u: string) =>
    (u || "").replace(/\/storage\/v1\/object\/sign\/question-images\/([^?]+)(\?.*)?$/, "/storage/v1/object/public/question-images/$1") || null;
  const [uploadingInstructions, setUploadingInstructions] = useState(false);
  const [testType, setTestType] = useState("mock");
  const [examPattern, setExamPattern] = useState("jee-main");
  const [optionLabelStyle, setOptionLabelStyle] = useState<"auto" | "numeric" | "alpha">("auto");
  const [duration, setDuration] = useState(180);
  const [correctMarks, setCorrectMarks] = useState(4);
  const [wrongMarks, setWrongMarks] = useState(-1);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<Set<number>>(new Set());
  const { confirm, ConfirmDialog } = useConfirm();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [bankSheetOpen, setBankSheetOpen] = useState(false);
  const [courseId, setCourseId] = useState<string>("");
  const [myCourses, setMyCourses] = useState<{ id: string; name: string }[]>([]);
  const [resolvedTestId, setResolvedTestId] = useState<string | null>(testIdParam ?? null);
  const [docxImportOpen, setDocxImportOpen] = useState(false);
  const [masterInstructionsOpen, setMasterInstructionsOpen] = useState(false);
  const [commonImportOpen, setCommonImportOpen] = useState(false);
  const [importTargetTestId, setImportTargetTestId] = useState<string | null>(null);
  const [createdDraftSlug, setCreatedDraftSlug] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [testMode, setTestMode] = useState<"digital" | "cbt">("digital");
  const [allowedBatches, setAllowedBatches] = useState<string[]>([]);
  const [batchOptions, setBatchOptions] = useState<{ id: string; code: string; name: string }[]>([]);
  const [solutionPdfPath, setSolutionPdfPath] = useState<string | null>(null);
  const [solutionPdfUploading, setSolutionPdfUploading] = useState(false);
  // Scheduling — controls when test opens, closes, and results auto-release
  const [testDate, setTestDate] = useState<string>(""); // YYYY-MM-DD
  const [startTime, setStartTime] = useState<string>(""); // HH:mm
  const [endTime, setEndTime] = useState<string>(""); // HH:mm
  const [autoRelease, setAutoRelease] = useState<boolean>(true);
  const [openWindowTime, setOpenWindowTime] = useState<string>(""); // HH:mm — entry-window close time on same date as test
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
      const [tqsRes, ansRes] = await Promise.all([
        supabase
          .from("test_questions")
          .select("id, test_id, position, subject, topic, sub_topic, question_text, question_image_url, question_type, options, option_images, match_left, marks_correct, marks_wrong, marks_unanswered, partial_marking, answer_format, tolerance, answer_range_min, answer_range_max, difficulty, solution_image_url, import_batch_id, source_filename, stem_image_url, created_at")
          .eq("test_id", test.id)
          .order("position"),
        supabase.rpc("admin_get_test_questions_full", { _test_id: test.id }),
      ]);
      const ansMap = new Map<string, { correct_answer: unknown; numerical_answer: number | null; explanation: string | null }>(
        ((ansRes.data ?? []) as Array<{ id: string; correct_answer: unknown; numerical_answer: number | null; explanation: string | null }>)
          .map((a) => [a.id, { correct_answer: a.correct_answer, numerical_answer: a.numerical_answer, explanation: a.explanation }]),
      );
      const tqs = (tqsRes.data ?? []).map((q: Record<string, unknown>) => ({
        ...q,
        ...(ansMap.get(q.id as string) ?? { correct_answer: null, numerical_answer: null, explanation: null }),
      }));
      if (ignore) return;
      setResolvedTestId(test.id);
      importedQuestionCount.current = tqs.length;
      setTitle(test.title ?? "");
      setDescription(test.description ?? "");
      {
        let instrUrl = ((test as any).instructions_image_url as string) ?? "";
        // Re-sign legacy public-bucket URLs (bucket is private now).
        if (instrUrl && /\/storage\/v1\/object\/public\/question-images\//.test(instrUrl)) {
          const path = instrUrl.split("/object/public/question-images/")[1];
          if (path) {
            const { data: signed } = await supabase.storage
              .from("question-images")
              .createSignedUrl(decodeURIComponent(path), 60 * 60 * 24 * 365);
            if (signed?.signedUrl) instrUrl = signed.signedUrl;
          }
        }
        setInstructionsImageUrl(instrUrl);
      }
      setTestType(test.test_type ?? "mock");
      setExamPattern(test.exam_pattern ?? "jee-main");
      const styleRaw = (test as { option_label_style?: string | null }).option_label_style;
      setOptionLabelStyle(styleRaw === "numeric" || styleRaw === "alpha" ? styleRaw : "auto");
      setDuration(test.duration_minutes ?? 180);
      setCorrectMarks(Number(test.correct_marks ?? 4));
      setWrongMarks(Number(test.wrong_marks ?? -1));
      setCourseId(test.course_id ?? "");
      setTestMode(((test as { test_mode?: string }).test_mode === "cbt" ? "cbt" : "digital"));
      setAllowedBatches(Array.isArray((test as { cbt_allowed_batch_ids?: string[] }).cbt_allowed_batch_ids)
        ? ((test as { cbt_allowed_batch_ids?: string[] }).cbt_allowed_batch_ids as string[])
        : []);
      setSolutionPdfPath((test as { solution_pdf_path?: string | null }).solution_pdf_path ?? null);
      // Load schedule (starts_at / ends_at) into date + time inputs (local TZ).
      const sAt = (test as any).starts_at ? new Date((test as any).starts_at) : null;
      const eAt = (test as any).ends_at ? new Date((test as any).ends_at) : null;
      const pad = (n: number) => String(n).padStart(2, "0");
      const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const timeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      if (sAt) {
        setTestDate(dateStr(sAt));
        setStartTime(timeStr(sAt));
      } else if (eAt) {
        setTestDate(dateStr(eAt));
      }
      if (eAt) setEndTime(timeStr(eAt));
      setAutoRelease((test as any).auto_release !== false);
      const owm = (test as any).open_window_minutes;
      if (owm != null && Number(owm) > 0 && sAt) {
        const closeMs = sAt.getTime() + Number(owm) * 60_000;
        const close = new Date(closeMs);
        setOpenWindowTime(`${pad(close.getHours())}:${pad(close.getMinutes())}`);
      } else {
        setOpenWindowTime("");
      }

      setQuestions(
        tqs.map((q: any) => {
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
            rangeEnabled: q.answer_range_min != null && q.answer_range_max != null,
            rangeMin: q.answer_range_min != null ? String(q.answer_range_min) : "",
            rangeMax: q.answer_range_max != null ? String(q.answer_range_max) : "",
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
      const { data: signed, error: signErr } = await supabase.storage
        .from("question-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 100);
      if (signErr || !signed?.signedUrl) throw signErr ?? new Error("Sign URL failed");
      updateQ(i, { imageUrl: signed.signedUrl });
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploadingIdx(null);
    }
  };

  const [replacingTitleImgIdx, setReplacingTitleImgIdx] = useState<number | null>(null);
  const replaceTitleImage = async (i: number, file: File) => {
    if (!user) return toast.error("Sign in required");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    if (!file.type.startsWith("image/")) return toast.error("File must be an image");
    setReplacingTitleImgIdx(i);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/title-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("question-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("question-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 100);
      if (signErr || !signed?.signedUrl) throw signErr ?? new Error("Sign URL failed");
      const url = signed.signedUrl;
      const current = questions[i];
      const hasInlineImg = /<img\b[^>]*>/i.test(current.text);
      if (hasInlineImg) {
        const nextText = current.text.replace(/<img\b([^>]*?)\bsrc=("|')[^"']*("|')([^>]*)>/i, (_m, pre, _q1, _q2, post) => {
          return `<img${pre}src="${url}"${post}>`;
        });
        updateQ(i, { text: nextText });
      } else {
        updateQ(i, { imageUrl: url });
      }
      toast.success("Title image replaced");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setReplacingTitleImgIdx(null);
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
      const { data: signed, error: signErr } = await supabase.storage
        .from("question-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 100);
      if (signErr || !signed?.signedUrl) throw signErr ?? new Error("Sign URL failed");
      const next = [...(questions[i].optionImages ?? ["", "", "", ""])];
      while (next.length <= oi) next.push("");
      next[oi] = signed.signedUrl;
      updateQ(i, { optionImages: next });
      toast.success("Option image uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploadingOpt(null);
    }
  };

  const uploadInstructionsImage = async (file: File) => {
    if (!user) return toast.error("Sign in required");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    if (!file.type.startsWith("image/")) return toast.error("File must be an image");
    setUploadingInstructions(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/test-instructions/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("question-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("question-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 100);
      if (signErr || !signed?.signedUrl) throw signErr ?? new Error("Sign URL failed");
      setInstructionsImageUrl(signed.signedUrl);
      toast.success("Instructions image uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploadingInstructions(false);
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

  const addManyFromBank = (bankQs: BankQuestion[]) => {
    const toAdd = bankQs.filter((q) => !addedBankIds.has(q.id));
    if (toAdd.length === 0) {
      toast.info("All selected questions are already in this test");
      return;
    }
    setQuestions((prev) => [
      ...prev,
      ...toAdd.map((q) => fromBank(q, { correct: correctMarks, wrong: wrongMarks })),
    ]);
    toast.success(`Added ${toAdd.length} question${toAdd.length === 1 ? "" : "s"}`);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    if (e.over?.id !== "test-drop") return;
    const bankQ = e.active.data.current?.question as BankQuestion | undefined;
    if (!bankQ) return;
    addFromBank(bankQ);
  };

  // Build a schedule payload — returns null fields if not provided.
  const buildSchedulePayload = () => {
    const toISO = (d: string, t: string) => {
      if (!d || !t) return null;
      const dt = new Date(`${d}T${t}:00`);
      return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
    };
    // Open window: derived from openWindowTime (HH:mm on the same date as the test).
    // Must be strictly after start time. If invalid or <= start, persist NULL.
    let openWindowMinutes: number | null = null;
    if (openWindowTime && testDate && startTime) {
      const startMs = new Date(`${testDate}T${startTime}:00`).getTime();
      const winMs = new Date(`${testDate}T${openWindowTime}:00`).getTime();
      if (Number.isFinite(startMs) && Number.isFinite(winMs) && winMs > startMs) {
        openWindowMinutes = Math.round((winMs - startMs) / 60_000);
      }
    }
    return {
      starts_at: toISO(testDate, startTime),
      ends_at: toISO(testDate, endTime),
      auto_release: autoRelease,
      open_window_minutes: openWindowMinutes,
    };
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
        instructions_image_url: stableInstructionsUrl(instructionsImageUrl),
        test_type: testType,
        exam_pattern: examPattern,
        option_label_style: optionLabelStyle === "auto" ? null : optionLabelStyle,
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
        ...buildSchedulePayload(),
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

  const afterImport = async (targetTestId?: string | null) => {
    setDocxImportOpen(false);
    setCommonImportOpen(false);
    toast.success("Questions appended — opening test editor");

    // Always resolve a slug for the test that received the questions and
    // navigate there, so the imported questions are visible immediately.
    const tid = targetTestId ?? resolvedTestId;
    if (tid) {
      const { data: t } = await supabase
        .from("tests")
        .select("slug")
        .eq("id", tid)
        .maybeSingle();
      const slug = t?.slug ?? createdDraftSlug;
      const resolvedStyle = optionLabelStyle === "auto"
        ? (examPattern.toLowerCase().includes("neet") ? "numeric" : "alpha")
        : optionLabelStyle;
      setOptionLabelStyle(resolvedStyle);
      if (slug && (!isEditMode || tid !== resolvedTestId)) {
        navigate(`/admin/tests/${slug}/edit`, { replace: true });
        return;
      }
    }

    // Same test we're already editing — just trigger the reload effect.
    setResolvedTestId(tid ?? resolvedTestId);
    setReloadKey((k) => k + 1);
  };

  const publishImportedDraft = async () => {
    if (!resolvedTestId) return toast.error("Create or import into a test first");
    setSubmitting(true);
    try {
      // Persist per-question overrides (marks etc.) that the user edited in the UI.
      const perQuestionUpdates = questions
        .filter((q) => !!q.id)
        .map((q) =>
          supabase
            .from("test_questions")
            .update({
              marks_correct: Number(q.marksCorrect),
              marks_wrong: Number(q.marksWrong),
            })
            .eq("id", q.id as string)
            .eq("test_id", resolvedTestId),
        );
      const results = await Promise.all(perQuestionUpdates);
      const firstErr = results.find((r) => r.error)?.error;
      if (firstErr) throw firstErr;

      await syncTestStats(resolvedTestId);
      const { error } = await supabase
        .from("tests")
        .update({
          title,
          description,
          instructions_image_url: stableInstructionsUrl(instructionsImageUrl),
          test_type: testType,
          exam_pattern: examPattern,
          option_label_style: optionLabelStyle === "auto" ? null : optionLabelStyle,
          duration_minutes: duration,
          correct_marks: correctMarks,
          wrong_marks: wrongMarks,
          course_id: courseId || null,
          test_mode: testMode,
          cbt_enabled: testMode === "cbt",
          cbt_allowed_batch_ids: testMode === "cbt" ? allowedBatches : null,
          ...buildSchedulePayload(),
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
      if (q.type === "numerical" || q.type === "integer") {
        if (q.rangeEnabled) {
          const a = Number(q.rangeMin);
          const b = Number(q.rangeMax);
          if (q.rangeMin.trim() === "" || q.rangeMax.trim() === "" || Number.isNaN(a) || Number.isNaN(b)) return false;
          return true;
        }
        const s = q.numericalAnswer.trim();
        if (s === "" || s === "-" || Number.isNaN(Number(s))) return false;
        // Integer-type questions also allow decimal answers (per Bansal exam pattern).
        return true;
      }
      return false;
    };
    if (isEditMode && resolvedTestId && questions.some((q) => q.imported)) {
      return publishImportedDraft();
    }
    // If the editor is empty but the DB has imported rows, never wipe them — publish as-is.
    if (isEditMode && resolvedTestId && questions.length === 0 && importedQuestionCount.current > 0) {
      return publishImportedDraft();
    }

    const validQ = questions.filter(isComplete);
    if (validQ.length === 0) return toast.error("Add at least one complete question");
    if (openWindowTime && startTime && openWindowTime <= startTime) {
      return toast.error("Open window time must be later than the start time");
    }


    setSubmitting(true);

    const subjects = Array.from(new Set(validQ.map((q) => q.subject)));

    const basePayload = {
      title,
      description,
      instructions_image_url: stableInstructionsUrl(instructionsImageUrl),
      test_type: testType,
      exam_pattern: examPattern,
      option_label_style: optionLabelStyle === "auto" ? null : optionLabelStyle,
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
      ...buildSchedulePayload(),
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
        if (q.rangeEnabled) {
          const lo = Math.min(Number(q.rangeMin), Number(q.rangeMax));
          const hi = Math.max(Number(q.rangeMin), Number(q.rangeMax));
          base.answer_range_min = lo;
          base.answer_range_max = hi;
          // Store midpoint for legacy single-value reads; range governs scoring.
          const mid = (lo + hi) / 2;
          base.correct_answer = { value: mid, range: { min: lo, max: hi } };
          base.numerical_answer = mid;
          base.tolerance = 0;
        } else {
          base.correct_answer = { value: Number(q.numericalAnswer) };
          base.numerical_answer = Number(q.numericalAnswer);
          base.tolerance = q.type === "integer" ? 0 : Number(q.tolerance || 0);
          base.answer_range_min = null;
          base.answer_range_max = null;
        }
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

        {resolvedTestId && (
          <div>
            <label className={labelCls}>Solution PDF <span className="text-muted-foreground font-normal">(visible to students only after results are released)</span></label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept="application/pdf"
                disabled={solutionPdfUploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 20 * 1024 * 1024) { toast.error("PDF must be ≤ 20 MB"); return; }
                  setSolutionPdfUploading(true);
                  const path = `${resolvedTestId}/solution-${Date.now()}.pdf`;
                  const { error: upErr } = await supabase.storage.from("test-solutions").upload(path, file, { contentType: "application/pdf", upsert: true });
                  if (upErr) { setSolutionPdfUploading(false); toast.error(upErr.message); return; }
                  const { error: updErr } = await (supabase as any)
                    .from("tests")
                    .update({ solution_pdf_path: path, solution_pdf_url: path, solution_pdf_uploaded_at: new Date().toISOString() })
                    .eq("id", resolvedTestId);
                  setSolutionPdfUploading(false);
                  if (updErr) { toast.error(updErr.message); return; }
                  setSolutionPdfPath(path);
                  toast.success("Solution PDF uploaded");
                  (e.target as HTMLInputElement).value = "";
                }}
                className="text-xs"
              />
              {solutionPdfUploading && <span className="text-xs text-muted-foreground">Uploading…</span>}
              {solutionPdfPath && (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      const { data, error } = await supabase.storage.from("test-solutions").createSignedUrl(solutionPdfPath, 60 * 10);
                      if (error || !data?.signedUrl) { toast.error(error?.message ?? "Could not open"); return; }
                      window.open(data.signedUrl, "_blank");
                    }}
                    className="rounded-md bg-secondary px-2 py-1 text-xs font-bold text-secondary-foreground hover:opacity-90"
                  >
                    Preview current PDF
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm("Remove the uploaded solution PDF?")) return;
                      await supabase.storage.from("test-solutions").remove([solutionPdfPath]);
                      await (supabase as any).from("tests").update({ solution_pdf_path: null, solution_pdf_url: null, solution_pdf_uploaded_at: null }).eq("id", resolvedTestId);
                      setSolutionPdfPath(null);
                      toast.success("Solution PDF removed");
                    }}
                    className="rounded-md border border-destructive/40 px-2 py-1 text-xs font-bold text-destructive hover:bg-destructive/10"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Max 20 MB. Students will see a download button on the result &amp; response sheet pages once you release results.</p>
          </div>
        )}

        <div>
          <label className={labelCls}>Instructions Image (optional)</label>
          <p className="text-xs text-muted-foreground mb-2">
            Shown to students on the pre-test instructions page and inside the in-test "View Instructions" popup. Recommended: a scanned/printed exam instructions sheet. Max 5MB.
          </p>
          {instructionsImageUrl ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <img
                src={instructionsImageUrl}
                alt="Test instructions"
                className="max-h-72 w-auto mx-auto rounded-md border border-border bg-white object-contain"
              />
              <div className="flex justify-end gap-2">
                <label className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-xs font-bold hover:bg-muted">
                  Replace
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadInstructionsImage(f); e.currentTarget.value = ""; }} />
                </label>
                <button type="button" onClick={() => setInstructionsImageUrl("")}
                  className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10">
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground hover:bg-muted/40">
              {uploadingInstructions ? "Uploading…" : "Click to upload instructions image (PNG/JPG)"}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingInstructions}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadInstructionsImage(f); e.currentTarget.value = ""; }} />
            </label>
          )}
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
          <label className={labelCls}>Option Label Style</label>
          <select
            value={optionLabelStyle}
            onChange={(e) => setOptionLabelStyle(e.target.value as "auto" | "numeric" | "alpha")}
            className={inputCls}
          >
            <option value="auto">Auto (NEET → 1,2,3,4 · others → A,B,C,D)</option>
            <option value="numeric">Numeric (1, 2, 3, 4)</option>
            <option value="alpha">Alphabetic (A, B, C, D)</option>
          </select>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Controls how MCQ options are labelled to students. When you bulk-import a .docx whose options are written as (1)(2)(3)(4) this is detected automatically.
          </p>
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

        {/* Schedule */}
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-foreground">Schedule & result release</h3>
              <p className="text-[11px] text-muted-foreground">
                Pick the test date and window. Results auto-release after the end time (admins can release earlier from the test detail page).
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-foreground">
              <input
                type="checkbox"
                checked={autoRelease}
                onChange={(e) => setAutoRelease(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Auto-release results after end time
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Test date</label>
              <input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Start time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Open window (entry closes at)</label>
              <input
                type="time"
                value={openWindowTime}
                onChange={(e) => setOpenWindowTime(e.target.value)}
                className={inputCls}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Students can start the test only up to this time on the test date. Leave blank for no limit.
              </p>
              {openWindowTime && startTime && openWindowTime <= startTime && (
                <p className="mt-1 text-[10px] font-semibold text-red-600">
                  Open window time must be later than the start time.
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>End time (results release)</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          {testDate && (startTime || endTime) && (
            <p className="text-[11px] text-muted-foreground">
              Scheduled: <span className="font-semibold text-foreground">{formatTestDate(`${testDate}T00:00:00`)}</span>
              {startTime && <> · opens <span className="font-semibold text-foreground">{startTime}</span></>}
              {startTime && openWindowTime && openWindowTime > startTime && (
                <> · entry closes <span className="font-semibold text-foreground">{openWindowTime}</span></>
              )}
              {endTime && <> · closes & results at <span className="font-semibold text-foreground">{endTime}</span></>}
            </p>
          )}

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
                  <QuestionBankPanel draggable compact onAdd={addFromBank} onAddMany={addManyFromBank} addedBankIds={addedBankIds} />
                </div>
              </SheetContent>
            </Sheet>
            <div className="inline-flex items-stretch rounded-lg border border-border bg-background overflow-hidden">
              <button
                onClick={() => openDocxImport("master")}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                title="Master method — uses the Bansal STEM template (SCQ/MCQ/Integer/Numerical/Match) with images and LaTeX"
              >
                <FileText className="h-3.5 w-3.5" /> Master import
              </button>
              <button
                type="button"
                onClick={() => setMasterInstructionsOpen(true)}
                className="inline-flex items-center justify-center border-l border-border px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="View Master import instructions and download template"
                aria-label="Master import instructions"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </div>
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

        {questions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap rounded-lg border border-border bg-muted/30 px-3 py-2">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIdx.size === questions.length && questions.length > 0}
                ref={(el) => { if (el) el.indeterminate = selectedIdx.size > 0 && selectedIdx.size < questions.length; }}
                onChange={(e) => setSelectedIdx(e.target.checked ? new Set(questions.map((_, i) => i)) : new Set())}
              />
              Select all
            </label>
            <span className="text-xs text-muted-foreground">{selectedIdx.size} selected</span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                disabled={selectedIdx.size === 0}
                onClick={async () => {
                  const sel = Array.from(selectedIdx);
                  const dbIds = sel.map((i) => questions[i]?.id).filter(Boolean) as string[];
                  if (dbIds.length && resolvedTestId) {
                    const { error } = await supabase.from("test_questions").delete().in("id", dbIds);
                    if (error) { toast.error(error.message); return; }
                    try { await syncTestStats(resolvedTestId); } catch {}
                  }
                  setQuestions(questions.filter((_, i) => !selectedIdx.has(i)));
                  setSelectedIdx(new Set());
                  toast.success(`Removed ${sel.length} from test`);
                }}
                className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 inline-flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove from test
              </button>
              <button
                type="button"
                disabled={selectedIdx.size === 0}
                onClick={async () => {
                  const sel = Array.from(selectedIdx);
                  const bankIds = sel.map((i) => questions[i]?.bank_id).filter(Boolean) as string[];
                  const dbIds = sel.map((i) => questions[i]?.id).filter(Boolean) as string[];
                  const ok = await confirm({
                    title: `Delete ${sel.length} question${sel.length === 1 ? "" : "s"} from test and Question Bank?`,
                    description: bankIds.length
                      ? `This permanently deletes ${bankIds.length} question(s) from the Question Bank. They will disappear from every other test that references them. This cannot be undone.`
                      : "None of the selected questions originated from the Question Bank — they will just be removed from this test.",
                    confirmLabel: "Delete permanently",
                  });
                  if (!ok) return;
                  if (dbIds.length && resolvedTestId) {
                    const { error } = await supabase.from("test_questions").delete().in("id", dbIds);
                    if (error) { toast.error(error.message); return; }
                  }
                  if (bankIds.length) {
                    const { error } = await supabase.from("question_bank").delete().in("id", bankIds);
                    if (error) { toast.error(error.message); return; }
                  }
                  if (resolvedTestId) { try { await syncTestStats(resolvedTestId); } catch {} }
                  setQuestions(questions.filter((_, i) => !selectedIdx.has(i)));
                  setSelectedIdx(new Set());
                  toast.success(`Removed ${sel.length} · Deleted ${bankIds.length} from bank`);
                }}
                className="rounded-md border border-destructive/40 bg-destructive/5 px-2.5 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-40 inline-flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete from test + bank
              </button>
            </div>

          </div>
        )}

        <DropZone empty={questions.length === 0}>
          {questions.map((q, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="checkbox"
                  checked={selectedIdx.has(i)}
                  onChange={(e) => {
                    const next = new Set(selectedIdx);
                    if (e.target.checked) next.add(i); else next.delete(i);
                    setSelectedIdx(next);
                  }}
                  aria-label={`Select question ${i + 1}`}
                />
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                  Q{i + 1}
                </span>
                {q.source === "bank" && (
                  <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    From Bank
                  </span>
                )}
                {q.imported && (
                  <span className="rounded-md bg-secondary/10 px-1.5 py-0.5 text-[10px] font-bold text-secondary">
                    Imported
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
                    step="1"
                    value={q.marksCorrect}
                    onChange={(e) => updateQ(i, { marksCorrect: Number(e.target.value) })}
                    className="w-12 rounded-md border border-border bg-background px-1 py-1 text-xs text-foreground outline-none tabular-nums"
                    aria-label="Marks for correct"
                  />
                  <span>/</span>
                  <input
                    type="number"
                    step="1"
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
              {q.imported ? (
                <div className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <MathRenderer content={q.text} />
                </div>
              ) : (
                <textarea
                  value={q.text}
                  onChange={(e) => updateQ(i, { text: e.target.value })}
                  placeholder="Question text (LaTeX supported, e.g. $x^2$)"
                  rows={2}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none resize-none"
                />
              )}

              {/* Replace inline title image (for imported questions with embedded <img>) */}
              {/<img\b[^>]*>/i.test(q.text) && (
                <div>
                  <label className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer">
                    {replacingTitleImgIdx === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    {replacingTitleImgIdx === i ? "Uploading…" : "Replace title image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={replacingTitleImgIdx === i}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) replaceTitleImage(i, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              )}

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
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] font-semibold text-foreground">
                      Correct {q.type === "integer" ? "Integer" : "Numerical"} Answer
                    </label>
                    <button
                      type="button"
                      onClick={() => updateQ(i, { rangeEnabled: !q.rangeEnabled })}
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                        q.rangeEnabled
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                      title="Accept any answer within a numeric range (e.g. 2 to 9)"
                    >
                      {q.rangeEnabled ? "Range enabled" : "Enable Range"}
                    </button>
                  </div>

                  {q.rangeEnabled ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground">From</label>
                        <input
                          value={q.rangeMin}
                          onChange={(e) => updateQ(i, { rangeMin: e.target.value.replace(/[^0-9.\-]/g, "") })}
                          placeholder="e.g. 2"
                          inputMode="decimal"
                          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground">To</label>
                        <input
                          value={q.rangeMax}
                          onChange={(e) => updateQ(i, { rangeMax: e.target.value.replace(/[^0-9.\-]/g, "") })}
                          placeholder="e.g. 9"
                          inputMode="decimal"
                          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none tabular-nums"
                        />
                      </div>
                      <p className="col-span-2 text-[10px] text-muted-foreground">
                        Any student answer in the range [{q.rangeMin || "min"} – {q.rangeMax || "max"}] (inclusive) is marked correct.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <input
                          value={q.numericalAnswer}
                          onChange={(e) => {
                            const raw = e.target.value;
                            let cleaned = raw.replace(/[^0-9.\-]/g, "");
                            const neg = cleaned.startsWith("-");
                            cleaned = cleaned.replace(/-/g, "");
                            const firstDot = cleaned.indexOf(".");
                            if (firstDot !== -1) {
                              cleaned =
                                cleaned.slice(0, firstDot + 1) +
                                cleaned.slice(firstDot + 1).replace(/\./g, "");
                            }
                            cleaned = (neg ? "-" : "") + cleaned;
                            updateQ(i, { numericalAnswer: cleaned });
                          }}
                          placeholder="e.g. -3.14"
                          inputMode="decimal"
                          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none tabular-nums"
                        />
                      </div>
                      {q.type === "numerical" && (
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground">Tolerance (±)</label>
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
              )}

            </div>
          ))}
        </DropZone>
      </section>
    </div>
  );

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {ConfirmDialog}
      <div className="flex">
        {/* Left pane (form) */}
        <div className="flex-1 lg:w-1/2 lg:flex-none px-4 md:px-8 py-6 pb-28">
          <div className="max-w-3xl mx-auto">{LeftPane}</div>
        </div>

        {/* Right pane (Question Bank) — desktop only, sticky with its own scroll */}
        <aside className="hidden lg:flex lg:w-1/2 border-l border-border bg-muted/30 flex-col sticky top-[57px] self-start h-[calc(100vh-57px)]">
          <QuestionBankPanel draggable compact onAdd={addFromBank} onAddMany={addManyFromBank} addedBankIds={addedBankIds} />
        </aside>
      </div>

      {/* Floating action bar */}
      <div className={`fixed bottom-4 z-50 ${isAdminContext ? "lg:left-[252px]" : ""} left-4 right-4 lg:right-auto`}>
        <div className="lg:w-[calc(50vw-146px)] max-w-3xl mx-auto flex gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-lg px-4 md:px-6 py-3">
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
      <DocxBulkImportDialog
        open={docxImportOpen}
        onClose={() => setDocxImportOpen(false)}
        onImported={afterImport}
        testId={importTargetTestId ?? resolvedTestId ?? undefined}
        examPattern={examPattern}
        optionLabelStyle={optionLabelStyle}
      />
      <DocxCommonImportDialog
        open={commonImportOpen}
        onClose={() => setCommonImportOpen(false)}
        onImported={afterImport}
        testId={importTargetTestId ?? resolvedTestId ?? undefined}
        examPattern={examPattern}
        optionLabelStyle={optionLabelStyle}
      />
      <MasterImportInstructions open={masterInstructionsOpen} onClose={() => setMasterInstructionsOpen(false)} />
    </DndContext>
  );
};

export default CreateTestPage;
