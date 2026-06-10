import { useState, useRef } from "react";
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2, FileWarning } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { parseDocxQuestions, type ParsedDocxQuestion } from "@/lib/docxImport/parseDocx";
import {
  uploadParsedImages,
  replaceMarkersWithUrls,
  firstImageForSlot,
} from "@/lib/docxImport/uploadImages";
import { SUBJECTS } from "@/lib/constants";

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  /** Target test id; if provided, questions are appended to that test. */
  testId?: string;
  /** When importing into the question bank, force this subject for all rows. */
  defaultSubject?: string;
};

type Step = "upload" | "preview" | "uploading" | "saving" | "done";

const DocxBulkImportDialog = ({ open, onClose, onImported, testId, defaultSubject }: Props) => {
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

  const targetMode: "test" | "bank" = testId ? "test" : "bank";

  if (!open) return null;

  const reset = () => {
    setStep("upload");
    setFileName("");
    setQuestions([]);
    setWarnings([]);
    setImgProgress({ done: 0, total: 0 });
    setErrorMsg(null);
    setImported({ ok: 0, failed: 0 });
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
        setErrorMsg("No questions detected in this file. Make sure options use the (A) (B) (C) (D) format and that an answer-key table is present.");
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

  const validate = (): string | null => {
    for (const q of questions) {
      if (!q.stemHtml && !q.stemText) return `Q${q.number} has no question text`;
      if (q.type === "mcq-single") {
        if (q.options.length < 2) return `Q${q.number} needs at least 2 options`;
        if (q.correctAnswer == null) return `Q${q.number} has no correct answer`;
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

    // 1. Create batch row
    setStep("uploading");
    const { data: batch, error: batchErr } = await supabase
      .from("question_import_batches")
      .insert({
        uploaded_by: user.id,
        target_type: targetMode,
        target_id: testId ?? null,
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
    setImgProgress({ done: 0, total: questions.reduce((s, q) => s + q.images.length, 0) });
    const { failed } = await uploadParsedImages(batchId, questions, (done, total) =>
      setImgProgress({ done, total }),
    );
    if (failed > 0) {
      toast.warning(`${failed} image${failed === 1 ? "" : "s"} failed to upload — questions will be saved without them.`);
    }

    // 3. Build rows + insert
    setStep("saving");
    let okCount = 0;
    let failCount = 0;

    if (targetMode === "test" && testId) {
      // Find existing max position to append
      const { data: existing } = await supabase
        .from("test_questions")
        .select("position")
        .eq("test_id", testId)
        .order("position", { ascending: false })
        .limit(1);
      const startPos = (existing?.[0]?.position ?? -1) + 1;

      const rows = questions.map((q, i) => {
        const stemHtml = replaceMarkersWithUrls(q.stemHtml, q.images);
        const optionTextWithImages = q.options.map((opt) => {
          const slotKey = (["optionA", "optionB", "optionC", "optionD"] as const)[opt.id];
          const img = firstImageForSlot(q.images, slotKey);
          return img ? `${opt.text}<br/><img src="${img}" alt="" class="max-h-32 inline-block" />` : opt.text;
        });
        const stemImg = firstImageForSlot(q.images, "stem");
        const optionImages: string[] = (["optionA", "optionB", "optionC", "optionD"] as const).map(
          (slot) => firstImageForSlot(q.images, slot) ?? "",
        );

        return {
          test_id: testId,
          position: startPos + i,
          subject: q.subject || subject,
          topic: topic || null,
          question_text: stemHtml || q.stemText,
          question_image_url: stemImg,
          question_type: q.type,
          options: optionTextWithImages.map((t, id) => ({ id, text: t })),
          option_images: optionImages,
          correct_answer: q.correctAnswer as any,
          numerical_answer:
            q.type === "numerical" || q.type === "integer"
              ? (q.correctAnswer as { value: number })?.value ?? null
              : null,
          import_batch_id: batchId,
          source_filename: fileName,
        };
      });

      const { error } = await supabase.from("test_questions").insert(rows as any);
      if (error) {
        failCount = rows.length;
        toast.error(`Failed to save test questions: ${error.message}`);
      } else {
        okCount = rows.length;
      }
    } else {
      // Question bank insert
      const rows = questions.map((q) => {
        const stemHtml = replaceMarkersWithUrls(q.stemHtml, q.images);
        const stemImg = firstImageForSlot(q.images, "stem");
        const optionImages: string[] = (["optionA", "optionB", "optionC", "optionD"] as const).map(
          (slot) => firstImageForSlot(q.images, slot) ?? "",
        );
        const optionTextWithImages = q.options.map((opt) => {
          const slotKey = (["optionA", "optionB", "optionC", "optionD"] as const)[opt.id];
          const img = firstImageForSlot(q.images, slotKey);
          return img ? `${opt.text}<br/><img src="${img}" alt="" class="max-h-32 inline-block" />` : opt.text;
        });

        return {
          created_by: user.id,
          subject: q.subject || subject,
          topic: topic || null,
          difficulty: "medium",
          question_text: stemHtml || q.stemText,
          question_image_url: stemImg,
          options: optionTextWithImages.map((t, id) => ({ id, text: t })),
          correct_answer: q.correctAnswer as any,
          question_type: q.type,
          numerical_answer:
            q.type === "numerical" || q.type === "integer"
              ? (q.correctAnswer as { value: number })?.value ?? null
              : null,
          option_images: optionImages,
          import_batch_id: batchId,
          source_filename: fileName,
          is_public: true,
          marks_correct: 4,
          marks_wrong: q.type === "mcq-single" ? -1 : 0,
          tags: [],
        };
      });

      const { error } = await supabase.from("question_bank").insert(rows as any);
      if (error) {
        failCount = rows.length;
        toast.error(`Failed to save to question bank: ${error.message}`);
      } else {
        okCount = rows.length;
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
      onImported();
    }
  };

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
              <h2 className="text-base font-bold text-foreground">Bulk import from Word (.docx)</h2>
              <p className="text-xs text-muted-foreground">
                {step === "upload" && "Upload a .docx with numbered questions, (A)-(D) options, and an answer-key table"}
                {step === "preview" && `Preview · ${fileName}`}
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
                <p className="text-sm font-semibold text-foreground">Drop .docx here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max 25 MB. Questions are auto-numbered in document order; the answer-key table is auto-detected.
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
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Supported format</p>
                <p>• Questions written sequentially; options inline as <code>(A) ... (B) ... (C) ... (D) ...</code></p>
                <p>• Diagrams and images embedded inline (will be extracted to storage)</p>
                <p>• Answer key in a table at the end: rows of <code>[question#, ..., A|B|C|D or number]</code></p>
                <p>• Letter answers → MCQ; numeric answers → integer/numerical</p>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-3">
              {targetMode === "bank" && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-foreground">Subject (applied to all)</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-foreground">Topic (optional)</label>
                    <input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. Kinematics"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none"
                    />
                  </div>
                </div>
              )}

              {warnings.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
                  <div className="flex items-center gap-1 font-semibold">
                    <FileWarning className="h-3.5 w-3.5" /> Parser warnings
                  </div>
                  {warnings.slice(0, 6).map((w, i) => (
                    <p key={i}>• {w}</p>
                  ))}
                  {warnings.length > 6 && <p>… and {warnings.length - 6} more</p>}
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Parsed <span className="font-bold text-foreground">{questions.length}</span> questions with{" "}
                <span className="font-bold text-foreground">
                  {questions.reduce((s, q) => s + q.images.length, 0)}
                </span>{" "}
                image{questions.reduce((s, q) => s + q.images.length, 0) === 1 ? "" : "s"}
              </div>

              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                        Q{q.number}
                      </span>
                      <select
                        value={q.type}
                        onChange={(e) => updateQ(idx, { type: e.target.value as any })}
                        className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] outline-none"
                      >
                        <option value="mcq-single">MCQ (single)</option>
                        <option value="integer">Integer</option>
                        <option value="numerical">Numerical</option>
                      </select>
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
                    <div
                      className="text-xs text-foreground prose prose-sm max-w-none [&_img]:inline-block [&_img]:max-h-32 [&_img]:rounded"
                      dangerouslySetInnerHTML={{
                        __html: q.stemHtml.replace(
                          /<span data-img="([^"]+)"><\/span>/g,
                          (_m, id) => {
                            const img = q.images.find((i) => i.id === id);
                            if (!img) return "";
                            const ab = img.bytes.buffer.slice(
                              img.bytes.byteOffset,
                              img.bytes.byteOffset + img.bytes.byteLength,
                            ) as ArrayBuffer;
                            const blob = new Blob([ab], { type: img.contentType });
                            const url = URL.createObjectURL(blob);
                            return `<img src="${url}" alt="" class="inline-block max-h-32 rounded" />`;
                          },
                        ),
                      }}
                    />
                    {q.options.length > 0 && (
                      <ul className="text-[11px] text-muted-foreground space-y-0.5 pl-3">
                        {q.options.map((opt) => (
                          <li key={opt.id}>
                            <span className="font-semibold text-foreground">
                              ({String.fromCharCode(65 + opt.id)})
                            </span>{" "}
                            {opt.text || <em>(empty)</em>}
                          </li>
                        ))}
                      </ul>
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
                      width: `${Math.round((imgProgress.done / Math.max(1, imgProgress.total)) * 100)}%`,
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
                <p className="text-xs text-destructive mt-1">{imported.failed} failed</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {targetMode === "test"
                  ? "Reload the test editor to see the new questions."
                  : "Open the question bank to see the new entries."}
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
                Import {questions.length} question{questions.length === 1 ? "" : "s"}
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
    </div>
  );
};

export default DocxBulkImportDialog;
