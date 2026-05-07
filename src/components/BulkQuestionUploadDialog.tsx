import { useState, useRef } from "react";
import { Upload, Download, X, FileText, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Check, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

type Props = {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
};

const TEMPLATE_HEADERS = [
  "subject",
  "topic",
  "difficulty",
  "question_text",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "correct_answer",
  "explanation",
  "marks_correct",
  "marks_wrong",
  "tags",
];

const SAMPLE_ROWS: string[][] = [
  [
    "Physics",
    "Kinematics",
    "easy",
    "What is the SI unit of acceleration?",
    "m/s",
    "m/s^2",
    "m^2/s",
    "kg.m/s",
    "2",
    "Acceleration = change in velocity per unit time, so units are m/s².",
    "4",
    "-1",
    "units;basics",
  ],
  [
    "Mathematics",
    "Algebra",
    "medium",
    "Solve for x: $2x + 6 = 14$",
    "2",
    "4",
    "6",
    "8",
    "2",
    "2x = 8 so x = 4.",
    "4",
    "-1",
    "linear-equations",
  ],
  [
    "Chemistry",
    "Periodic Table",
    "hard",
    "Which of the following are noble gases? (Select all that apply)",
    "Helium",
    "Nitrogen",
    "Argon",
    "Oxygen",
    "1,3",
    "Helium and Argon belong to group 18 (noble gases).",
    "4",
    "-1",
    "noble-gases;multi-select",
  ],
];

// --- CSV helpers (RFC 4180-ish) ---
const csvEscape = (v: string | number | null | undefined) => {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const buildTemplate = () => {
  const rows = [TEMPLATE_HEADERS, ...SAMPLE_ROWS];
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
};

const downloadCSV = (filename: string, content: string) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  const src = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else cur += ch;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
};

type ParsedQuestion = {
  subject: string;
  topic: string | null;
  difficulty: string;
  question_text: string;
  options: { id: number; text: string }[];
  correct_answer: number | number[];
  explanation: string | null;
  marks_correct: number;
  marks_wrong: number;
  tags: string[];
  is_public: boolean;
  created_by: string | null;
};

type RowError = { row: number; message: string; raw: string[] };

const VALID_SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology"];
const VALID_DIFFICULTIES = ["easy", "medium", "hard"];

const parseRow = (headers: string[], row: string[], userId: string | null): ParsedQuestion => {
  const get = (k: string) => {
    const idx = headers.indexOf(k);
    return idx >= 0 ? (row[idx] ?? "").trim() : "";
  };

  const subject = get("subject");
  if (!VALID_SUBJECTS.includes(subject)) {
    throw new Error(`Invalid subject "${subject}" (allowed: ${VALID_SUBJECTS.join(", ")})`);
  }

  const difficulty = (get("difficulty") || "medium").toLowerCase();
  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    throw new Error(`Invalid difficulty "${difficulty}" (allowed: easy, medium, hard)`);
  }

  const question_text = get("question_text");
  if (!question_text) throw new Error("question_text is required");

  const opts = [get("option_a"), get("option_b"), get("option_c"), get("option_d")];
  const options = opts
    .map((text, i) => ({ id: i + 1, text }))
    .filter((o) => o.text.length > 0);
  if (options.length < 2) throw new Error("At least 2 options are required");

  const rawCorrect = get("correct_answer");
  if (!rawCorrect) throw new Error("correct_answer is required");
  const correctIdxs = rawCorrect.split(/[,;|]/).map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
  if (!correctIdxs.length) throw new Error(`Invalid correct_answer "${rawCorrect}" (use 1-4, comma-separated for multi)`);
  for (const c of correctIdxs) {
    if (c < 1 || c > options.length) throw new Error(`correct_answer ${c} out of range (1-${options.length})`);
  }
  const correct_answer: number | number[] = correctIdxs.length === 1 ? correctIdxs[0] : correctIdxs;

  const marksC = parseFloat(get("marks_correct"));
  const marksW = parseFloat(get("marks_wrong"));
  const tagsRaw = get("tags");
  const tags = tagsRaw ? tagsRaw.split(/[;|]/).map((t) => t.trim()).filter(Boolean) : [];

  return {
    subject,
    topic: get("topic") || null,
    difficulty,
    question_text,
    options,
    correct_answer,
    explanation: get("explanation") || null,
    marks_correct: isNaN(marksC) ? 4 : marksC,
    marks_wrong: isNaN(marksW) ? -1 : marksW,
    tags,
    is_public: true,
    created_by: userId,
  };
};

type Step = "upload" | "preview" | "importing" | "done";

const BulkQuestionUploadDialog = ({ open, onClose, onUploaded }: Props) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedQuestion[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [insertedCount, setInsertedCount] = useState(0);
  const [insertErrors, setInsertErrors] = useState<RowError[]>([]);

  if (!open) return null;

  const reset = () => {
    setStep("upload");
    setParsed([]);
    setErrors([]);
    setFileName("");
    setProgress({ done: 0, total: 0 });
    setInsertedCount(0);
    setInsertErrors([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    if (step === "importing") return;
    reset();
    onClose();
  };

  const handleDownloadTemplate = () => {
    downloadCSV("question-bank-template.csv", buildTemplate());
  };

  const handleDownloadErrors = (rows: RowError[]) => {
    const headers = ["row_number", "error_message", ...TEMPLATE_HEADERS];
    const lines = [headers.map(csvEscape).join(",")];
    for (const e of rows) {
      const cells = [String(e.row), e.message, ...TEMPLATE_HEADERS.map((_, i) => e.raw[i] ?? "")];
      lines.push(cells.map(csvEscape).join(","));
    }
    downloadCSV("import-errors.csv", lines.join("\n"));
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    setErrors([]);
    setParsed([]);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length < 2) {
        toast.error("CSV is empty or has only headers");
        return;
      }
      const headers = rows[0].map((h) => h.trim().toLowerCase());
      const missing = ["subject", "question_text", "correct_answer"].filter((h) => !headers.includes(h));
      if (missing.length) {
        toast.error(`Missing required columns: ${missing.join(", ")}`);
        return;
      }

      // Reorder raw row to TEMPLATE_HEADERS order for nice error CSV
      const headerIndex = (h: string) => headers.indexOf(h);
      const reorderRaw = (r: string[]) =>
        TEMPLATE_HEADERS.map((h) => {
          const idx = headerIndex(h);
          return idx >= 0 ? (r[idx] ?? "") : "";
        });

      const ok: ParsedQuestion[] = [];
      const bad: RowError[] = [];
      for (let i = 1; i < rows.length; i++) {
        try {
          ok.push(parseRow(headers, rows[i], user?.id ?? null));
        } catch (e: any) {
          bad.push({ row: i + 1, message: e.message, raw: reorderRaw(rows[i]) });
        }
      }
      setParsed(ok);
      setErrors(bad);
      setStep("preview");
    } catch (e: any) {
      toast.error(e.message || "Failed to read CSV");
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsed.length) return;
    setStep("importing");
    setProgress({ done: 0, total: parsed.length });
    const BATCH = 50;
    let inserted = 0;
    const insErrors: RowError[] = [];

    for (let i = 0; i < parsed.length; i += BATCH) {
      const chunk = parsed.slice(i, i + BATCH);
      const { error } = await supabase.from("question_bank").insert(chunk as any);
      if (error) {
        // Mark this batch as failed; we don't know which row exactly without per-row insert
        for (let j = 0; j < chunk.length; j++) {
          insErrors.push({
            row: i + j + 2,
            message: `Insert failed: ${error.message}`,
            raw: [],
          });
        }
      } else {
        inserted += chunk.length;
      }
      setProgress({ done: Math.min(i + chunk.length, parsed.length), total: parsed.length });
      // Yield to UI
      await new Promise((r) => setTimeout(r, 0));
    }

    setInsertedCount(inserted);
    setInsertErrors(insErrors);
    setStep("done");
    if (inserted > 0) {
      toast.success(`Imported ${inserted} question${inserted === 1 ? "" : "s"}`);
      onUploaded();
    }
    if (insErrors.length) toast.warning(`${insErrors.length} row${insErrors.length === 1 ? "" : "s"} failed to insert`);
  };

  const renderCorrect = (q: ParsedQuestion) => {
    const arr = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer];
    return arr.map((n) => String.fromCharCode(64 + n)).join(", ");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleClose}>
      <div
        className="w-full max-w-4xl rounded-2xl bg-card border border-border shadow-2xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2"><Upload className="h-4 w-4 text-primary" /></div>
            <div>
              <h2 className="text-base font-bold text-foreground">Bulk upload questions</h2>
              <p className="text-xs text-muted-foreground">
                {step === "upload" && "Import multiple questions from a CSV file"}
                {step === "preview" && `Preview · ${fileName}`}
                {step === "importing" && "Importing… please don't close this window"}
                {step === "done" && "Import complete"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={step === "importing"}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span className={step === "upload" ? "text-primary" : ""}>1 · Upload</span>
          <span>›</span>
          <span className={step === "preview" ? "text-primary" : ""}>2 · Preview</span>
          <span>›</span>
          <span className={step === "importing" ? "text-primary" : ""}>3 · Import</span>
          <span>›</span>
          <span className={step === "done" ? "text-primary" : ""}>4 · Done</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {step === "upload" && (
            <>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <h3 className="text-sm font-semibold text-foreground mb-2">Step 1 · Download the template</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Get a CSV template with the correct headers and sample rows (including LaTeX and multi-select examples).
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
                >
                  <Download className="h-3.5 w-3.5" /> Download CSV template
                </button>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <h3 className="text-sm font-semibold text-foreground mb-2">Step 2 · Upload your filled CSV</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Required columns: <code className="px-1 rounded bg-background">subject</code>,{" "}
                  <code className="px-1 rounded bg-background">question_text</code>,{" "}
                  <code className="px-1 rounded bg-background">correct_answer</code>. Multi-correct answers: comma-separate (e.g. <code className="px-1 rounded bg-background">1,3</code>). Tags use <code className="px-1 rounded bg-background">;</code> separator.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                <button
                  disabled={parsing}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                  {parsing ? "Parsing…" : "Choose CSV file"}
                </button>
              </div>
            </>
          )}

          {step === "preview" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Valid rows</div>
                  <div className="text-xl font-bold text-emerald-700">{parsed.length}</div>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">Invalid rows</div>
                    <div className="text-xl font-bold text-rose-700">{errors.length}</div>
                  </div>
                  {errors.length > 0 && (
                    <button
                      onClick={() => handleDownloadErrors(errors)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      <Download className="h-3.5 w-3.5" /> Errors CSV
                    </button>
                  )}
                </div>
              </div>

              {errors.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 mb-2">
                    <AlertCircle className="h-4 w-4" /> First {Math.min(errors.length, 5)} validation issues
                  </div>
                  <ul className="space-y-1 text-xs text-rose-700">
                    {errors.slice(0, 5).map((e, i) => (
                      <li key={i}>Row {e.row}: {e.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {parsed.length > 0 && (
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="px-3 py-2 bg-muted/40 text-xs font-semibold text-foreground border-b border-border">
                    Preview ({parsed.length} valid rows — showing first 50)
                  </div>
                  <div className="overflow-x-auto max-h-[40vh]">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-2 py-2 text-left">#</th>
                          <th className="px-2 py-2 text-left">Subject</th>
                          <th className="px-2 py-2 text-left">Topic</th>
                          <th className="px-2 py-2 text-left">Diff.</th>
                          <th className="px-2 py-2 text-left">Question</th>
                          <th className="px-2 py-2 text-left">Options</th>
                          <th className="px-2 py-2 text-left">Correct</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.slice(0, 50).map((q, i) => (
                          <tr key={i} className="border-t border-border align-top">
                            <td className="px-2 py-2 text-muted-foreground">{i + 1}</td>
                            <td className="px-2 py-2 font-semibold">{q.subject}</td>
                            <td className="px-2 py-2 text-muted-foreground">{q.topic ?? "—"}</td>
                            <td className="px-2 py-2 capitalize">{q.difficulty}</td>
                            <td className="px-2 py-2 max-w-[260px] truncate" title={q.question_text}>{q.question_text}</td>
                            <td className="px-2 py-2 text-muted-foreground">{q.options.length}</td>
                            <td className="px-2 py-2 font-semibold text-emerald-700">{renderCorrect(q)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {step === "importing" && (
            <div className="space-y-4 py-6">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Importing {progress.done} / {progress.total} questions…
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
                />
              </div>
              <div className="text-center text-xs text-muted-foreground">
                {progress.total ? Math.round((progress.done / progress.total) * 100) : 0}% complete
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-3">
              {insertedCount > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Successfully imported {insertedCount} question{insertedCount === 1 ? "" : "s"}.
                </div>
              )}
              {(errors.length > 0 || insertErrors.length > 0) && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-rose-700">
                      <AlertCircle className="h-4 w-4" />
                      {errors.length + insertErrors.length} row{errors.length + insertErrors.length === 1 ? "" : "s"} skipped or failed
                    </div>
                    <button
                      onClick={() => handleDownloadErrors([...errors, ...insertErrors])}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      <Download className="h-3.5 w-3.5" /> Download errors CSV
                    </button>
                  </div>
                  <ul className="space-y-1 max-h-40 overflow-y-auto text-xs text-rose-700">
                    {[...errors, ...insertErrors].slice(0, 20).map((e, i) => (
                      <li key={i}>Row {e.row}: {e.message}</li>
                    ))}
                    {(errors.length + insertErrors.length) > 20 && (
                      <li className="italic">…and {errors.length + insertErrors.length - 20} more (download CSV for full list)</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 p-4 border-t border-border">
          {step === "preview" ? (
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Choose different file
            </button>
          ) : <div />}

          <div className="flex gap-2">
            {step === "preview" && (
              <button
                onClick={handleConfirmImport}
                disabled={parsed.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" /> Confirm import ({parsed.length})
              </button>
            )}
            {step === "done" && (
              <button
                onClick={reset}
                className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Import another file
              </button>
            )}
            <button
              onClick={handleClose}
              disabled={step === "importing"}
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40"
            >
              {step === "done" ? "Close" : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkQuestionUploadDialog;
