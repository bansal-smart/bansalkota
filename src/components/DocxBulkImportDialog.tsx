import { useEffect, useRef, useState } from "react";
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileWarning,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  parseDocxQuestions,
  type ParsedDocxQuestion,
  type DocxImage,
} from "@/lib/docxImport/parseDocx";
import {
  uploadParsedImages,
  replaceMarkersWithUrls,
  firstImageForSlot,
} from "@/lib/docxImport/uploadImages";
import { SUBJECTS } from "@/lib/constants";
import MathRenderer from "@/components/MathRenderer";
import { syncTestStats } from "@/lib/tests/syncTestStats";
import MasterImportInstructions from "@/components/MasterImportInstructions";

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: (targetTestId?: string | null) => void;
  /** When provided, the test picker is hidden and questions are appended to this test. */
  testId?: string;
  /** Force a subject for all rows when importing from the bank entry-point. */
  defaultSubject?: string;
  /** Parent test option-label setting. Auto means exam pattern / detected style decides. */
  optionLabelStyle?: "auto" | "numeric" | "alpha";
  examPattern?: string;
};

type Step = "upload" | "preview" | "uploading" | "saving" | "done";

type TestRow = { id: string; title: string; slug: string };

const slotForOption = (i: number): DocxImage["slot"] =>
  (["optionA", "optionB", "optionC", "optionD"] as const)[i] ?? "stem";

const DocxBulkImportDialog = ({
  open,
  onClose,
  onImported,
  testId,
  defaultSubject,
  optionLabelStyle = "auto",
  examPattern,
}: Props) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [questions, setQuestions] = useState<ParsedDocxQuestion[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [imgProgress, setImgProgress] = useState({ done: 0, total: 0 });
  const [subject, setSubject] = useState<string>(defaultSubject ?? "Physics");
  const [topic, setTopic] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [imported, setImported] = useState({ ok: 0, failed: 0 });
  const [showInstructions, setShowInstructions] = useState(false);
  const [detectedOptionStyle, setDetectedOptionStyle] = useState<"numeric" | "alpha" | null>(null);
  const isNeetPattern = (examPattern ?? "").toLowerCase().includes("neet");
  const effectiveOptionStyle: "numeric" | "alpha" =
    optionLabelStyle === "numeric" || optionLabelStyle === "alpha"
      ? optionLabelStyle
      : isNeetPattern
        ? "numeric"
        : detectedOptionStyle ?? "alpha";

  // Test picker (only when launched without a fixed testId)
  const [alsoPushToTest, setAlsoPushToTest] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(testId ?? null);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [testSearch, setTestSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    if (testId) {
      setSelectedTestId(testId);
      return;
    }
    supabase
      .from("tests")
      .select("id, title, slug")
      .order("created_at", { ascending: false })
      .limit(150)
      .then(({ data }) => setTests((data ?? []) as TestRow[]));
  }, [open, testId]);

  if (!open) return null;

  const reset = () => {
    setStep("upload");
    setFileName("");
    setQuestions([]);
    setWarnings([]);
    setImgProgress({ done: 0, total: 0 });
    setErrorMsg(null);
    setImported({ ok: 0, failed: 0 });
    setAlsoPushToTest(false);
    setDetectedOptionStyle(null);
    if (!testId) setSelectedTestId(null);
    setTestSearch("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    if (step === "uploading" || step === "saving") return;
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    if (!/\.docx$/i.test(file.name)) {
      toast.error("Please upload a .docx file (the older .doc format is not supported).");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File too large (max 25 MB).");
      return;
    }
    setParsing(true);
    setFileName(file.name);
    setErrorMsg(null);
    try {
      const result = await parseDocxQuestions(file);
      if (result.questions.length === 0) {
        setErrorMsg(
          "No questions detected. Use the Arke template: numbered questions, (1)–(4) options, and an 'Answer: ...' line under each.",
        );
        setStep("upload");
        return;
      }
      setQuestions(result.questions);
      setWarnings(result.warnings);
      setDetectedOptionStyle(result.detectedOptionStyle);
      setStep("preview");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to read the document.");
      setStep("upload");
    } finally {
      setParsing(false);
    }
  };

  const validate = (): string | null => {
    for (const q of questions) {
      if (!q.stemHtml && !q.stemText) return `Q${q.number} has no question text`;
      if (q.type === "mcq-single" || q.type === "mcq-multi") {
        if (q.options.length < 2) return `Q${q.number} needs at least 2 options`;
        if (q.correctAnswer == null) return `Q${q.number} has no correct answer`;
      } else if (q.type === "match-following") {
        if (!q.matchLeft || q.matchLeft.length === 0)
          return `Q${q.number} match-following needs Column A items`;
        if (!q.options.length) return `Q${q.number} match-following needs Column B items`;
        if (!q.correctMap || Object.keys(q.correctMap).length === 0)
          return `Q${q.number} missing answer mapping (e.g. "Answer: A-Q, B-S, ...")`;
      } else if (q.correctAnswer == null) {
        return `Q${q.number} has no numerical answer`;
      }
    }
    return null;
  };

  const updateQ = (idx: number, patch: Partial<ParsedDocxQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const removeQ = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const buildBaseRow = (q: ParsedDocxQuestion, batchId: string) => {
    const stemHtml = replaceMarkersWithUrls(q.stemHtml, q.images);
    const stemImg = firstImageForSlot(q.images, "stem");
    const stemHasInlineImg = /<img\b/i.test(stemHtml);
    const optionImages: string[] =
      q.type === "match-following"
        ? // Column B image slots: matchP/Q/R/S
          (["matchP", "matchQ", "matchR", "matchS"] as const).map(
            (s) => firstImageForSlot(q.images, s) ?? "",
          )
        : (["optionA", "optionB", "optionC", "optionD"] as const).map(
            (s) => firstImageForSlot(q.images, s) ?? "",
          );

    const options = q.options.map((opt, id) => ({
      id,
      text: replaceMarkersWithUrls(opt.text, q.images),
    }));

    let matchLeft = q.matchLeft ?? null;
    if (matchLeft) {
      matchLeft = matchLeft.map((m) => ({
        ...m,
        text: replaceMarkersWithUrls(m.text, q.images),
      }));
    }

    const solutionHtml = q.solutionHtml
      ? replaceMarkersWithUrls(q.solutionHtml, q.images)
      : null;

    let correctAnswer: any = q.correctAnswer;
    if (q.type === "match-following") {
      correctAnswer = q.correctMap ?? {};
    }

    const numericAns = q.correctAnswer as
      | { value: number }
      | { min: number; max: number }
      | null;
    const isRange = !!numericAns && "min" in (numericAns as object);
    const isValue = !!numericAns && "value" in (numericAns as object);

    return {
      subject: q.subject || subject,
      topic: q.topic || topic || null,
      question_text: stemHtml || q.stemText,
      question_image_url: stemHasInlineImg ? null : stemImg,
      question_type: q.type,
      options,
      option_images: optionImages,
      match_left: matchLeft,
      correct_answer: correctAnswer,
      numerical_answer:
        (q.type === "numerical" || q.type === "integer") && isValue
          ? (numericAns as { value: number }).value
          : null,
      answer_range_min:
        (q.type === "numerical" || q.type === "integer") && isRange
          ? (numericAns as { min: number; max: number }).min
          : null,
      answer_range_max:
        (q.type === "numerical" || q.type === "integer") && isRange
          ? (numericAns as { min: number; max: number }).max
          : null,
      explanation: q.solutionText ?? solutionHtml ?? null,
      import_batch_id: batchId,
      source_filename: fileName,
    };
  };


  const handleConfirm = async () => {
    if (!user) {
      toast.error("Sign in required");
      return;
    }
    const v = validate();
    if (v) {
      toast.error(v);
      return;
    }
    const wantPushToTest = !!testId || (alsoPushToTest && !!selectedTestId);
    if (alsoPushToTest && !selectedTestId) {
      toast.error("Pick a test to push into, or uncheck the test option.");
      return;
    }

    // 1. Create batch row (the bank import is the canonical batch; if we also
    // push to a test we tag the batch as target_type='test'+target_id for the
    // undo flow).
    setStep("uploading");
    const targetType: "test" | "bank" = wantPushToTest ? "test" : "bank";
    const { data: batch, error: batchErr } = await supabase
      .from("question_import_batches")
      .insert({
        uploaded_by: user.id,
        target_type: targetType,
        target_id: wantPushToTest ? selectedTestId : null,
        filename: fileName,
        question_count: questions.length,
        image_count: questions.reduce((s, q) => s + q.images.length, 0),
        status: "in_progress",
      })
      .select("id")
      .single();

    if (batchErr || !batch) {
      toast.error(batchErr?.message ?? "Could not create import batch");
      setStep("preview");
      return;
    }
    const batchId = batch.id as string;

    // 2. Upload all images
    setImgProgress({
      done: 0,
      total: questions.reduce((s, q) => s + q.images.length, 0),
    });
    const { failed } = await uploadParsedImages(batchId, questions, (done, total) =>
      setImgProgress({ done, total }),
    );
    if (failed > 0) {
      toast.warning(
        `${failed} image${failed === 1 ? "" : "s"} failed to upload — questions will be saved without them.`,
      );
    }

    // 3. Insert
    setStep("saving");
    let okCount = 0;
    let failCount = 0;

    // 3a. Always write to question_bank
    const bankRows = questions.map((q) => {
      const base = buildBaseRow(q, batchId);
      return {
        created_by: user.id,
        difficulty: "medium",
        is_public: true,
        marks_correct: 4,
        marks_wrong:
          q.type === "mcq-single" || q.type === "mcq-multi"
            ? -1
            : q.type === "match-following"
              ? -1
              : 0,
        tags: [],
        partial_marking: q.type === "mcq-multi",
        ...base,
      };
    });

    const { error: bankErr } = await supabase
      .from("question_bank")
      .insert(bankRows as any);
    if (bankErr) {
      // Don't abort — pushing into the selected test is the primary goal when one is set.
      if (!wantPushToTest) {
        failCount = bankRows.length;
        toast.error(`Failed to save to question bank: ${bankErr.message}`);
      } else {
        toast.warning(`Question bank save failed (${bankErr.message}). Continuing to push into the test.`);
      }
    } else {
      okCount = bankRows.length;
    }

    // 3b. Optionally also insert into a test (independent of bank result)
    if (wantPushToTest && selectedTestId) {
      try {
        const { data: existing } = await supabase
          .from("test_questions")
          .select("position")
          .eq("test_id", selectedTestId)
          .order("position", { ascending: false })
          .limit(1);
        const startPos = (existing?.[0]?.position ?? -1) + 1;
        const testRows = questions.map((q, i) => {
          const base = buildBaseRow(q, batchId);
          const numericAns = q.correctAnswer as
            | { value: number }
            | { min: number; max: number }
            | null;
          const isRange = !!numericAns && "min" in (numericAns as object);
          return {
            test_id: selectedTestId,
            position: startPos + i,
            marks_correct: 4,
            marks_wrong:
              q.type === "mcq-single" || q.type === "mcq-multi" || q.type === "match-following"
                ? -1
                : 0,
            marks_unanswered: 0,
            partial_marking: q.type === "mcq-multi",
            answer_format:
              (q.type === "numerical" || q.type === "integer") && isRange
                ? "range"
                : null,
            ...base,
          };
        });

        const { error: testErr } = await supabase
          .from("test_questions")
          .insert(testRows as any);
        if (testErr) throw testErr;

        // Verify the rows actually landed (RLS may silently filter)
        const { count } = await supabase
          .from("test_questions")
          .select("id", { count: "exact", head: true })
          .eq("test_id", selectedTestId)
          .eq("import_batch_id", batchId);
        if ((count ?? 0) < testRows.length) {
          throw new Error(`Only ${count ?? 0}/${testRows.length} questions were saved (permission issue).`);
        }

        okCount = Math.max(okCount, testRows.length);
        toast.success(`Pushed ${testRows.length} question${testRows.length === 1 ? "" : "s"} into the test.`);
        // Persist the resolved option label style so NEET + Auto renders 1/2/3/4.
        await supabase
          .from("tests")
          .update({ option_label_style: effectiveOptionStyle } as any)
          .eq("id", selectedTestId);
        await syncTestStats(selectedTestId);
      } catch (err: any) {
        failCount = questions.length;
        await supabase
          .from("question_import_batches")
          .update({ error_log: { errors: [err?.message ?? String(err)] } })
          .eq("id", batchId);
        toast.error(`Failed to push questions to test: ${err?.message ?? "unknown error"}`);
      }
    }

    await supabase
      .from("question_import_batches")
      .update({
        status: failCount === 0 ? "completed" : okCount === 0 ? "failed" : "partial",
        question_count: okCount,
      })
      .eq("id", batchId);

    setImported({ ok: okCount, failed: failCount });
    setStep("done");
    if (okCount > 0) {
      toast.success(`Imported ${okCount} question${okCount === 1 ? "" : "s"}`);
      onImported(selectedTestId ?? null);
    }
  };

  // Build a blob-url HTML preview for parsed images
  const previewHtml = (html: string, images: DocxImage[]) =>
    html.replace(/<span data-img="([^"]+)"><\/span>/g, (_m, id) => {
      const img = images.find((i) => i.id === id);
      if (!img) return "";
      const ab = img.bytes.buffer.slice(
        img.bytes.byteOffset,
        img.bytes.byteOffset + img.bytes.byteLength,
      ) as ArrayBuffer;
      const blob = new Blob([ab], { type: img.contentType });
      const url = URL.createObjectURL(blob);
      return `<img src="${url}" alt="" class="inline-block max-h-32 rounded my-1" />`;
    });

  const filteredTests = tests.filter((t) =>
    !testSearch ? true : t.title.toLowerCase().includes(testSearch.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-5xl rounded-2xl bg-card border border-border shadow-2xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Master method — bulk import from Word (.docx)
              </h2>
              <p className="text-xs text-muted-foreground">
                {step === "upload" &&
                  "Arke format — parses numbered questions with (1)–(4) options, Answer line, MCQ/Integer/Numerical/Match"}
                {step === "preview" && `Preview · ${fileName}`}
                {step === "uploading" &&
                  `Uploading images… ${imgProgress.done}/${imgProgress.total}`}
                {step === "saving" && "Saving questions…"}
                {step === "done" && "Import complete"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={step === "uploading" || step === "saving"}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {step === "upload" && (
            <div className="space-y-4">
              <div
                className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-10 text-center cursor-pointer hover:border-primary/50 transition"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-semibold text-foreground">
                  Drop .docx here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max 25 MB. Images, LaTeX (<code>$x^2$</code>), and Word equations are all preserved.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                {parsing && (
                  <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Parsing…
                  </div>
                )}
              </div>
              {errorMsg && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-semibold text-foreground">Master Question Template — one block per question</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowInstructions(true)}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted"
                    >
                      View instructions
                    </button>
                    <a
                      href="/templates/master-question-template.docx"
                      download
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground hover:opacity-90"
                    >
                      Download template
                    </a>
                  </div>
                </div>
                <p>
                  Supports <b>SCQ</b>, <b>MCQ</b>, <b>Integer</b> (value or range), <b>Numerical/Decimal</b> (value or range),
                  and <b>Match the Following</b> — with images and LaTeX in stems, options, and solutions.
                  Click <b>View instructions</b> for the full guide, or download the template and replace the example questions.
                </p>
                {errorMsg && (
                  <p className="text-amber-700">
                    Not detecting questions? Open <b>View instructions</b> and compare your file to the template.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-foreground">
                      Subject (applied to questions without a topic)
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-foreground">
                      Fallback topic
                    </label>
                    <input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. Kinematics"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none"
                    />
                  </div>
                </div>

                {!testId && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <input
                        type="checkbox"
                        checked={alsoPushToTest}
                        onChange={(e) => setAlsoPushToTest(e.target.checked)}
                      />
                      Also push imported questions into a test
                    </label>
                    {alsoPushToTest && (
                      <div className="mt-2 space-y-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <input
                            value={testSearch}
                            onChange={(e) => setTestSearch(e.target.value)}
                            placeholder="Search tests…"
                            className="w-full rounded-lg border border-border bg-background pl-6 pr-2 py-1.5 text-xs outline-none"
                          />
                        </div>
                        <div className="max-h-32 overflow-auto rounded-lg border border-border bg-background">
                          {filteredTests.length === 0 ? (
                            <p className="p-2 text-xs text-muted-foreground">
                              No tests match.
                            </p>
                          ) : (
                            filteredTests.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => setSelectedTestId(t.id)}
                                className={`w-full text-left px-2 py-1.5 text-xs hover:bg-muted ${
                                  selectedTestId === t.id
                                    ? "bg-primary/10 text-primary font-semibold"
                                    : "text-foreground"
                                }`}
                              >
                                {t.title}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {warnings.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
                  <div className="flex items-center gap-1 font-semibold">
                    <FileWarning className="h-3.5 w-3.5" /> Parser warnings
                  </div>
                  {warnings.slice(0, 8).map((w, i) => (
                    <p key={i}>• {w}</p>
                  ))}
                  {warnings.length > 8 && (
                    <p>… and {warnings.length - 8} more</p>
                  )}
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Parsed{" "}
                <span className="font-bold text-foreground">{questions.length}</span>{" "}
                question{questions.length === 1 ? "" : "s"} with{" "}
                <span className="font-bold text-foreground">
                  {questions.reduce((s, q) => s + q.images.length, 0)}
                </span>{" "}
                image{questions.reduce((s, q) => s + q.images.length, 0) === 1 ? "" : "s"}
              </div>

              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border bg-card p-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                        Q{q.number}
                      </span>
                      <select
                        value={q.type}
                        onChange={(e) =>
                          updateQ(idx, { type: e.target.value as any })
                        }
                        className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] outline-none"
                      >
                        <option value="mcq-single">MCQ (single)</option>
                        <option value="mcq-multi">MCQ (multi-correct)</option>
                        <option value="integer">Integer</option>
                        <option value="numerical">Numerical</option>
                        <option value="match-following">Match the Following</option>
                      </select>
                      {q.topic && (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {q.topic}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        Answer:{" "}
                        <span className="font-semibold text-foreground">
                          {q.correctRaw ?? "—"}
                        </span>
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Images: {q.images.length}
                      </span>
                      <button
                        onClick={() => removeQ(idx)}
                        className="ml-auto rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <MathRenderer
                      className="text-xs text-foreground prose prose-sm max-w-none [&_img]:inline-block [&_img]:max-h-32 [&_img]:rounded"
                      content={previewHtml(q.stemHtml, q.images)}
                    />

                    {q.type === "match-following" && q.matchLeft && (
                      <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-muted/30 p-2">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground mb-1">
                            Column A
                          </p>
                          <ul className="space-y-1 text-[11px]">
                            {q.matchLeft.map((m) => (
                              <li key={m.key}>
                                <span className="font-semibold">({m.key})</span>{" "}
                                <MathRenderer
                                  inline
                                  className="[&_img]:max-h-16 [&_img]:inline-block"
                                  content={previewHtml(m.text, q.images)}
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground mb-1">
                            Column B
                          </p>
                          <ul className="space-y-1 text-[11px]">
                            {q.options.map((opt, i) => (
                              <li key={opt.id}>
                                <span className="font-semibold">
                                  ({String.fromCharCode(80 + i)})
                                </span>{" "}
                                <MathRenderer
                                  inline
                                  className="[&_img]:max-h-16 [&_img]:inline-block"
                                  content={previewHtml(opt.text, q.images)}
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                        {q.correctMap && (
                          <div className="col-span-2 text-[10px] text-muted-foreground">
                            Mapping:{" "}
                            <span className="font-semibold text-foreground">
                              {Object.entries(q.correctMap)
                                .map(([k, v]) => `${k}→${v}`)
                                .join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {q.type !== "match-following" && q.options.length > 0 && (
                      <ul className="text-[11px] text-muted-foreground space-y-0.5 pl-3">
                        {q.options.map((opt) => (
                          <li key={opt.id} className="flex items-start gap-1">
                            <span className="font-semibold text-foreground shrink-0">
                              ({String.fromCharCode(65 + opt.id)})
                            </span>
                            <MathRenderer
                              inline
                              className="flex-1 [&_img]:inline-block [&_img]:max-h-20 [&_img]:rounded"
                              content={previewHtml(opt.text, q.images)}
                            />
                          </li>
                        ))}
                      </ul>
                    )}

                    {q.solutionHtml && (
                      <details className="text-[11px] text-muted-foreground">
                        <summary className="cursor-pointer font-semibold">
                          Solution
                        </summary>
                        <MathRenderer
                          className="mt-1 rounded bg-muted/40 p-2 [&_img]:max-h-24 [&_img]:inline-block"
                          content={previewHtml(q.solutionHtml, q.images)}
                        />
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(step === "uploading" || step === "saving") && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
              <p className="text-sm font-semibold">
                {step === "uploading"
                  ? `Uploading images ${imgProgress.done}/${imgProgress.total}`
                  : "Saving questions…"}
              </p>
              {imgProgress.total > 0 && step === "uploading" && (
                <div className="mt-3 w-64 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${Math.round(
                        (imgProgress.done / Math.max(1, imgProgress.total)) * 100,
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
              <p className="text-base font-bold text-foreground">
                {imported.ok} question{imported.ok === 1 ? "" : "s"} imported
              </p>
              {imported.failed > 0 && (
                <p className="text-xs text-destructive mt-1">
                  {imported.failed} failed
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {testId || alsoPushToTest
                  ? "Questions saved to the bank and pushed into the chosen test."
                  : "Questions saved to the Question Bank."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-3 border-t border-border bg-muted/30">
          {step === "preview" && (
            <>
              <button
                onClick={reset}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Start over
              </button>
              <button
                onClick={handleConfirm}
                disabled={questions.length === 0}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                Import {questions.length} question
                {questions.length === 1 ? "" : "s"}
              </button>
            </>
          )}
          {step === "done" && (
            <button
              onClick={handleClose}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Close
            </button>
          )}
        </div>
      </div>
      <MasterImportInstructions open={showInstructions} onClose={() => setShowInstructions(false)} />
    </div>
  );
};

export default DocxBulkImportDialog;
