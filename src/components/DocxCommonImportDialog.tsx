import { useEffect, useRef, useState } from "react";
import {
  Upload,
  X,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  parseCommonDocxQuestions,
} from "@/lib/docxImport/parseCommonDocx";
import type { ParsedDocxQuestion, DocxImage, ParsedQuestionType } from "@/lib/docxImport/parseDocx";
import {
  uploadParsedImages,
  replaceMarkersWithUrls,
  firstImageForSlot,
} from "@/lib/docxImport/uploadImages";
import { SUBJECTS } from "@/lib/constants";
import MathRenderer from "@/components/MathRenderer";
import { syncTestStats } from "@/lib/tests/syncTestStats";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Receives the test id that was imported into (null for bank imports). */
  onImported: (targetTestId?: string | null) => void;
  testId?: string;
  defaultSubject?: string;
  /** "test" (default) imports into test_questions; "bank" imports into question_bank. */
  target?: "test" | "bank";
};

type Step = "upload" | "preview" | "uploading" | "saving" | "done";
type TestRow = { id: string; title: string; slug: string };

// Default marking scheme requested by the user for Common-method.
const DEFAULT_MARKS: Record<ParsedQuestionType, { c: number; w: number; u: number; partial: boolean }> = {
  "mcq-single": { c: 4, w: -1, u: 0, partial: false },
  "mcq-multi": { c: 4, w: -2, u: 0, partial: true },
  integer: { c: 4, w: 0, u: 0, partial: false },
  numerical: { c: 4, w: 0, u: 0, partial: false },
  "match-following": { c: 4, w: -1, u: 0, partial: false },
};

const typeLabel = (t: ParsedQuestionType) =>
  t === "mcq-single"
    ? "Single correct"
    : t === "mcq-multi"
      ? "Multiple correct"
      : t === "integer"
        ? "Integer"
        : t === "numerical"
          ? "Numerical"
          : "Match";

const DocxCommonImportDialog = ({
  open,
  onClose,
  onImported,
  testId,
  defaultSubject,
  target = "test",
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [imported, setImported] = useState({ ok: 0, failed: 0 });

  // Subject-by-range tagging: e.g. [{from:1,to:30,subject:"Physics"}, ...]
  type SubjectRange = { from: number; to: number; subject: string };
  const [subjectRanges, setSubjectRanges] = useState<SubjectRange[]>([]);

  const [selectedTestId, setSelectedTestId] = useState<string | null>(testId ?? null);
  const [tests, setTests] = useState<TestRow[]>([]);

  const subjectForNumber = (n: number): string => {
    const hit = subjectRanges.find((r) => n >= r.from && n <= r.to);
    return hit?.subject || subject;
  };

  useEffect(() => {
    if (!open) return;
    if (target === "bank") return;
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
  }, [open, testId, target]);

  if (!open) return null;

  const reset = () => {
    setStep("upload");
    setFileName("");
    setQuestions([]);
    setWarnings([]);
    setImgProgress({ done: 0, total: 0 });
    setErrorMsg(null);
    setImported({ ok: 0, failed: 0 });
    setSubjectRanges([]);
    if (!testId) setSelectedTestId(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    if (step === "uploading" || step === "saving") return;
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    if (!/\.docx$/i.test(file.name)) {
      toast.error("Please upload a .docx file.");
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
      const result = await parseCommonDocxQuestions(file);
      if (result.questions.length === 0) {
        setErrorMsg(
          "No questions detected. Common-method expects a 3-column table: [number] [question + options together] [answer letter or integer].",
        );
        setStep("upload");
        return;
      }
      setQuestions(result.questions);
      setWarnings(result.warnings);
      setStep("preview");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to read the document.");
      setStep("upload");
    } finally {
      setParsing(false);
    }
  };

  const updateQ = (idx: number, patch: Partial<ParsedDocxQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const removeQ = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const changeType = (idx: number, newType: ParsedQuestionType) => {
    const q = questions[idx];
    let correctAnswer: any = q.correctAnswer;
    let options = q.options;
    if (newType === "mcq-single") {
      const v = Array.isArray(q.correctAnswer)
        ? (q.correctAnswer as number[])[0] ?? null
        : typeof q.correctAnswer === "number"
          ? q.correctAnswer
          : null;
      correctAnswer = v;
      options = options.length ? options : [0, 1, 2, 3].map((id) => ({ id, text: "" }));
    } else if (newType === "mcq-multi") {
      correctAnswer = Array.isArray(q.correctAnswer)
        ? q.correctAnswer
        : typeof q.correctAnswer === "number"
          ? [q.correctAnswer]
          : [];
      options = options.length ? options : [0, 1, 2, 3].map((id) => ({ id, text: "" }));
    } else if (newType === "integer" || newType === "numerical") {
      const v =
        q.correctAnswer && typeof q.correctAnswer === "object" && "value" in q.correctAnswer
          ? q.correctAnswer
          : { value: 0 };
      correctAnswer = v;
      options = [];
    }
    updateQ(idx, { type: newType, correctAnswer, options });
  };

  const setSingleAnswer = (idx: number, letter: string) => {
    const v = letter.charCodeAt(0) - 65;
    updateQ(idx, { correctAnswer: v, correctRaw: letter });
  };

  const toggleMultiAnswer = (idx: number, letter: string) => {
    const v = letter.charCodeAt(0) - 65;
    const q = questions[idx];
    const cur = Array.isArray(q.correctAnswer) ? [...(q.correctAnswer as number[])] : [];
    const i = cur.indexOf(v);
    if (i >= 0) cur.splice(i, 1);
    else cur.push(v);
    cur.sort();
    updateQ(idx, { correctAnswer: cur, correctRaw: cur.map((n) => String.fromCharCode(65 + n)).join(",") });
  };

  const setNumericAnswer = (idx: number, raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      updateQ(idx, { correctAnswer: { value: 0 }, correctRaw: raw });
      return;
    }
    updateQ(idx, { correctAnswer: { value: n }, correctRaw: raw });
  };

  const validate = (): string | null => {
    for (const q of questions) {
      if (!q.stemHtml && !q.stemText) return `Q${q.number} has no question content`;
      if (q.type === "mcq-single" && typeof q.correctAnswer !== "number")
        return `Q${q.number} needs a correct option (A-D)`;
      if (q.type === "mcq-multi" && (!Array.isArray(q.correctAnswer) || (q.correctAnswer as number[]).length === 0))
        return `Q${q.number} needs at least one correct option`;
      if ((q.type === "integer" || q.type === "numerical") && (!q.correctAnswer || typeof q.correctAnswer !== "object"))
        return `Q${q.number} needs a numeric answer`;
    }
    return null;
  };

  const buildRow = (q: ParsedDocxQuestion, batchId: string) => {
    const stemHtml = replaceMarkersWithUrls(q.stemHtml, q.images);
    const stemImg = firstImageForSlot(q.images, "stem");
    const stemHasInlineImg = /<img\b/i.test(stemHtml);
    const optionImages = (q.type === "integer" || q.type === "numerical")
      ? []
      : ["", "", "", ""];

    return {
      subject: q.subject || subject,
      topic: q.topic || null,
      question_text: stemHtml || q.stemText,
      question_image_url: stemHasInlineImg ? null : stemImg,
      question_type: q.type,
      options: q.options,
      option_images: optionImages,
      match_left: null,
      correct_answer: q.correctAnswer,
      numerical_answer:
        q.type === "numerical" || q.type === "integer"
          ? (q.correctAnswer as { value: number })?.value ?? null
          : null,
      explanation: null,
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
    if (target === "test" && !testId && !selectedTestId) {
      toast.error("Pick a test to import questions into.");
      return;
    }
    const targetTestId = target === "test" ? (testId ?? selectedTestId!) : null;

    setStep("uploading");
    const { data: batch, error: batchErr } = await supabase
      .from("question_import_batches")
      .insert({
        uploaded_by: user.id,
        target_type: target,
        target_id: targetTestId,
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

    setImgProgress({ done: 0, total: questions.reduce((s, q) => s + q.images.length, 0) });
    const { failed } = await uploadParsedImages(batchId, questions, (done, total) =>
      setImgProgress({ done, total }),
    );
    if (failed > 0) {
      toast.warning(`${failed} image(s) failed to upload — saving without them.`);
    }

    setStep("saving");

    let okCount = 0;
    let failCount = 0;

    try {
      if (target === "test" && targetTestId) {
        // Mark the test as common-method
        await supabase.from("tests").update({ import_method: "common" } as any).eq("id", targetTestId);

        // Compute starting position for ordering
        const { data: existing } = await supabase
          .from("test_questions")
          .select("position")
          .eq("test_id", targetTestId)
          .order("position", { ascending: false })
          .limit(1);
        const startPos = (existing?.[0]?.position ?? -1) + 1;

        const rows = questions.map((q, i) => {
          const base = buildRow(q, batchId);
          const marks = DEFAULT_MARKS[q.type];
          return {
            test_id: targetTestId,
            position: startPos + i,
            marks_correct: marks.c,
            marks_wrong: marks.w,
            marks_unanswered: marks.u,
            partial_marking: marks.partial,
            ...base,
          };
        });

        const { error: insErr } = await supabase.from("test_questions").insert(rows as any);
        if (insErr) throw insErr;

        // Verify rows actually landed
        const { count, error: cntErr } = await supabase
          .from("test_questions")
          .select("id", { count: "exact", head: true })
          .eq("test_id", targetTestId)
          .eq("import_batch_id", batchId);
        if (cntErr) throw cntErr;
        if ((count ?? 0) < rows.length) {
          throw new Error(`Only ${count ?? 0}/${rows.length} questions were saved (RLS or permission issue).`);
        }

        okCount = rows.length;
        await syncTestStats(targetTestId);
      } else {
        // target === "bank"
        const rows = questions.map((q) => {
          const base = buildRow(q, batchId);
          const marks = DEFAULT_MARKS[q.type];
          return {
            created_by: user.id,
            difficulty: "medium",
            is_public: true,
            tags: [],
            marks_correct: marks.c,
            marks_wrong: marks.w,
            partial_marking: marks.partial,
            ...base,
          };
        });

        const { error: insErr } = await supabase.from("question_bank").insert(rows as any);
        if (insErr) throw insErr;

        const { count, error: cntErr } = await supabase
          .from("question_bank")
          .select("id", { count: "exact", head: true })
          .eq("import_batch_id", batchId);
        if (cntErr) throw cntErr;
        if ((count ?? 0) < rows.length) {
          throw new Error(`Only ${count ?? 0}/${rows.length} questions were saved (RLS or permission issue).`);
        }

        okCount = rows.length;
      }
    } catch (err: any) {
      failCount = questions.length;
      await supabase
        .from("question_import_batches")
        .update({
          status: "failed",
          question_count: 0,
          error_log: { errors: [err?.message ?? String(err)] },
        })
        .eq("id", batchId);
      toast.error(`Failed to import: ${err?.message ?? "unknown error"}`);
      setImported({ ok: 0, failed: failCount });
      setStep("preview");
      return;
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
      toast.success(`Imported ${okCount} question${okCount === 1 ? "" : "s"} (Common method)`);
      onImported(targetTestId);
    }
  };

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
      return `<img src="${url}" alt="" class="inline-block max-h-40 rounded my-1" />`;
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-5xl rounded-2xl bg-card border border-border shadow-2xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Common method — cropped .docx import
              </h2>
              <p className="text-xs text-muted-foreground">
                {step === "upload" && "3-column table: [number] [printed question + options] [answer]"}
                {step === "preview" && `Preview · ${fileName} · ${questions.length} questions`}
                {step === "uploading" && `Uploading images… ${imgProgress.done}/${imgProgress.total}`}
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
                  Drop the cropped .docx here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Each question = one table row with the printed block in the middle cell.
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
                    <Loader2 className="h-3 w-3 animate-spin" /> Parsing…
                  </div>
                )}
              </div>
              {errorMsg && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Expected format</p>
                <p>• Word table with 3 columns per row.</p>
                <p>• Column 1: question number (1, 2, 3…). Column 2: printed question text + (A)(B)(C)(D) options together. Column 3: correct answer.</p>
                <p>• Answer detection: <code>A</code>/<code>B</code>/<code>C</code>/<code>D</code> → single-correct · <code>AB</code>/<code>A,C</code> → multi-correct · pure number → integer.</p>
                <p>• Embedded figures (diagrams) inside Column 2 are uploaded automatically.</p>
                <p>• You can override the type and answer per question in the preview.</p>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              {/* Test + subject */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {target === "test" && !testId && (
                  <div>
                    <label className="text-xs font-bold text-foreground">Target test</label>
                    <select
                      value={selectedTestId ?? ""}
                      onChange={(e) => setSelectedTestId(e.target.value || null)}
                      className="mt-1 w-full rounded-md border border-border bg-background p-2 text-xs"
                    >
                      <option value="">— pick a test —</option>
                      {tests.map((t) => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-foreground">Default subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background p-2 text-xs"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {warnings.length > 0 && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 space-y-1">
                  <p className="font-bold">Parser warnings ({warnings.length})</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {warnings.slice(0, 6).map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-bold">Q{q.number}</span>
                        <select
                          value={q.type}
                          onChange={(e) => changeType(idx, e.target.value as ParsedQuestionType)}
                          className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold"
                        >
                          <option value="mcq-single">Single correct</option>
                          <option value="mcq-multi">Multiple correct</option>
                          <option value="integer">Integer</option>
                          <option value="numerical">Numerical</option>
                        </select>
                        <span className="text-[10px] text-muted-foreground">
                          marks {DEFAULT_MARKS[q.type].c}/{DEFAULT_MARKS[q.type].w}
                        </span>
                      </div>
                      <button
                        onClick={() => removeQ(idx)}
                        className="text-destructive hover:bg-destructive/10 rounded p-1"
                        title="Remove this question"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div
                      className="prose prose-sm max-w-none text-[13px] leading-relaxed rounded-md bg-muted/30 p-3 border border-border"
                      dangerouslySetInnerHTML={{ __html: previewHtml(q.stemHtml, q.images) }}
                    />

                    {/* Answer picker */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-foreground">Answer:</span>
                      {q.type === "mcq-single" &&
                        ["A", "B", "C", "D"].map((L) => {
                          const v = L.charCodeAt(0) - 65;
                          const active = q.correctAnswer === v;
                          return (
                            <button
                              key={L}
                              onClick={() => setSingleAnswer(idx, L)}
                              className={`h-7 w-7 rounded-md text-xs font-bold border ${
                                active
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-foreground border-border hover:bg-muted"
                              }`}
                            >
                              {L}
                            </button>
                          );
                        })}
                      {q.type === "mcq-multi" &&
                        ["A", "B", "C", "D"].map((L) => {
                          const v = L.charCodeAt(0) - 65;
                          const sel = Array.isArray(q.correctAnswer) && (q.correctAnswer as number[]).includes(v);
                          return (
                            <button
                              key={L}
                              onClick={() => toggleMultiAnswer(idx, L)}
                              className={`h-7 w-7 rounded-md text-xs font-bold border ${
                                sel
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-foreground border-border hover:bg-muted"
                              }`}
                            >
                              {L}
                            </button>
                          );
                        })}
                      {(q.type === "integer" || q.type === "numerical") && (
                        <input
                          type="number"
                          step={q.type === "integer" ? 1 : "any"}
                          defaultValue={
                            q.correctAnswer && typeof q.correctAnswer === "object" && "value" in q.correctAnswer
                              ? (q.correctAnswer as any).value
                              : ""
                          }
                          onChange={(e) => setNumericAnswer(idx, e.target.value)}
                          className="w-32 rounded-md border border-border bg-background px-2 py-1 text-xs"
                          placeholder="Enter value"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(step === "uploading" || step === "saving") && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              {step === "uploading"
                ? `Uploading images… ${imgProgress.done}/${imgProgress.total}`
                : "Saving questions…"}
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <CheckCircle2 className="h-10 w-10 text-secondary" />
              <p className="text-base font-bold text-foreground">
                {imported.ok} question{imported.ok === 1 ? "" : "s"} imported
              </p>
              {imported.failed > 0 && (
                <p className="text-xs text-destructive">{imported.failed} failed</p>
              )}
              <button
                onClick={handleClose}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {step === "preview" && (
          <div className="border-t border-border p-3 flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Tip: type detection follows the answer cell. Override per question above.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { reset(); }}
                className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Start over
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
              >
                Import {questions.length} question{questions.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocxCommonImportDialog;
