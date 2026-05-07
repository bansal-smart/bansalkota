import { useState, useRef } from "react";
import { Upload, Download, X, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
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
const csvEscape = (v: string) => {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const buildTemplate = () => {
  const rows = [TEMPLATE_HEADERS, ...SAMPLE_ROWS];
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
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

const BulkQuestionUploadDialog = ({ open, onClose, onUploaded }: Props) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ row: number; message: string }[]>([]);
  const [successCount, setSuccessCount] = useState(0);

  if (!open) return null;

  const handleDownloadTemplate = () => {
    const blob = new Blob([buildTemplate()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "question-bank-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setErrors([]);
    setSuccessCount(0);
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

      const parsed: ParsedQuestion[] = [];
      const rowErrors: { row: number; message: string }[] = [];
      for (let i = 1; i < rows.length; i++) {
        try {
          parsed.push(parseRow(headers, rows[i], user?.id ?? null));
        } catch (e: any) {
          rowErrors.push({ row: i + 1, message: e.message });
        }
      }

      if (!parsed.length) {
        setErrors(rowErrors);
        toast.error("No valid questions to import");
        return;
      }

      // Insert in batches
      const BATCH = 100;
      let inserted = 0;
      for (let i = 0; i < parsed.length; i += BATCH) {
        const chunk = parsed.slice(i, i + BATCH);
        const { error } = await supabase.from("question_bank").insert(chunk as any);
        if (error) {
          rowErrors.push({ row: i + 2, message: `Batch insert failed: ${error.message}` });
          break;
        }
        inserted += chunk.length;
      }

      setSuccessCount(inserted);
      setErrors(rowErrors);
      if (inserted > 0) {
        toast.success(`Imported ${inserted} question${inserted === 1 ? "" : "s"}`);
        onUploaded();
      }
      if (rowErrors.length) toast.warning(`${rowErrors.length} row${rowErrors.length === 1 ? "" : "s"} skipped`);
    } catch (e: any) {
      toast.error(e.message || "Failed to read CSV");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl bg-card border border-border shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2"><Upload className="h-4 w-4 text-primary" /></div>
            <div>
              <h2 className="text-base font-bold text-foreground">Bulk upload questions</h2>
              <p className="text-xs text-muted-foreground">Import multiple questions from a CSV file</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              {busy ? "Processing…" : "Choose CSV file"}
            </button>
          </div>

          {(successCount > 0 || errors.length > 0) && (
            <div className="space-y-2">
              {successCount > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Successfully imported {successCount} question{successCount === 1 ? "" : "s"}.
                </div>
              )}
              {errors.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 mb-2">
                    <AlertCircle className="h-4 w-4" /> {errors.length} row{errors.length === 1 ? "" : "s"} skipped
                  </div>
                  <ul className="space-y-1 max-h-40 overflow-y-auto text-xs text-rose-700">
                    {errors.map((e, i) => (
                      <li key={i}>Row {e.row}: {e.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkQuestionUploadDialog;
