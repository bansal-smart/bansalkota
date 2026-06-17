import { useRef, useState } from "react";
import { Download, Upload, X, Loader2, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";

export type CsvField = {
  key: string;
  label: string;
  required?: boolean;
  /** Coerce raw string -> value for DB */
  parse?: (raw: string) => any;
  /** Example value used for the template */
  example?: string;
};

export type BulkCsvDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  fields: CsvField[];
  /** Existing rows used for "Export current data" */
  exportRows?: Record<string, any>[];
  /** Called for each parsed row in sequence. Throw or return error string to mark failure. */
  importRow: (row: Record<string, any>, index: number) => Promise<string | void>;
  /** Called once after a successful (or partial) import */
  onDone?: () => void;
  fileBase?: string;
};

const csvSafe = (v: any) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const download = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const BulkCsvDialog = ({
  open,
  onClose,
  title,
  description,
  fields,
  exportRows,
  importRow,
  onDone,
  fileBase = "data",
}: BulkCsvDialogProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [results, setResults] = useState<{ ok: number; errors: { row: number; error: string }[] } | null>(null);

  if (!open) return null;

  const downloadTemplate = () => {
    const header = fields.map((f) => f.label).join(",");
    const example = fields.map((f) => csvSafe(f.example ?? "")).join(",");
    download(`${fileBase}-template.csv`, `${header}\n${example}\n`);
  };

  const downloadExport = () => {
    if (!exportRows?.length) return toast.info("No rows to export");
    const header = fields.map((f) => f.label).join(",");
    const lines = exportRows.map((r) => fields.map((f) => csvSafe(r[f.key])).join(","));
    const stamp = new Date().toISOString().slice(0, 10);
    download(`${fileBase}-${stamp}.csv`, [header, ...lines].join("\n"));
  };

  const handleFile = (file: File) => {
    setBusy(true);
    setResults(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parsed) => {
        const labelToKey = new Map(fields.map((f) => [f.label.trim().toLowerCase(), f] as const));
        const rows = parsed.data;
        setProgress({ done: 0, total: rows.length });

        const errors: { row: number; error: string }[] = [];
        let ok = 0;

        for (let i = 0; i < rows.length; i++) {
          const raw = rows[i];
          const mapped: Record<string, any> = {};
          let rowErr: string | null = null;
          for (const [labelLower, field] of labelToKey) {
            const value = Object.entries(raw).find(([k]) => k.trim().toLowerCase() === labelLower)?.[1];
            const trimmed = (value ?? "").trim();
            if (field.required && !trimmed) {
              rowErr = `Missing required "${field.label}"`;
              break;
            }
            if (trimmed === "") {
              mapped[field.key] = null;
              continue;
            }
            try {
              mapped[field.key] = field.parse ? field.parse(trimmed) : trimmed;
            } catch (e: any) {
              rowErr = `Invalid "${field.label}": ${e.message}`;
              break;
            }
          }

          if (rowErr) {
            errors.push({ row: i + 2, error: rowErr });
          } else {
            try {
              const r = await importRow(mapped, i);
              if (typeof r === "string") errors.push({ row: i + 2, error: r });
              else ok++;
            } catch (e: any) {
              errors.push({ row: i + 2, error: e.message || String(e) });
            }
          }
          setProgress({ done: i + 1, total: rows.length });
        }

        setResults({ ok, errors });
        setBusy(false);
        if (ok > 0) {
          toast.success(`Imported ${ok} row${ok === 1 ? "" : "s"}${errors.length ? ` (${errors.length} failed)` : ""}`);
          onDone?.();
        } else if (errors.length) {
          toast.error(`Import failed: ${errors.length} row${errors.length === 1 ? "" : "s"} had errors`);
        }
      },
      error: (err) => {
        setBusy(false);
        toast.error(err.message);
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-card border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <h2 className="font-bold">{title}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {description && <p className="text-sm text-muted-foreground">{description}</p>}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-bold hover:bg-muted"
            >
              <Download className="h-4 w-4" /> Download template
            </button>
            <button
              onClick={downloadExport}
              disabled={!exportRows?.length}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-bold hover:bg-muted disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> Export current ({exportRows?.length ?? 0})
            </button>
          </div>

          <div className="rounded-xl border border-dashed border-border p-5 text-center">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy ? `Importing ${progress.done}/${progress.total}…` : "Choose CSV to import"}
            </button>
            <p className="mt-2 text-xs text-muted-foreground">
              First row must match the column labels exactly.
            </p>
          </div>

          <details className="rounded-lg bg-muted/40 p-3 text-xs">
            <summary className="cursor-pointer font-bold">Required columns ({fields.length})</summary>
            <ul className="mt-2 space-y-1">
              {fields.map((f) => (
                <li key={f.key} className="flex items-center justify-between gap-2">
                  <span><code className="rounded bg-background px-1">{f.label}</code> {f.required && <span className="text-destructive">*</span>}</span>
                  {f.example && <span className="text-muted-foreground">e.g. {f.example}</span>}
                </li>
              ))}
            </ul>
          </details>

          {results && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span><b>{results.ok}</b> imported successfully</span>
              </div>
              {results.errors.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-destructive mb-1">
                    <AlertCircle className="h-3.5 w-3.5" /> {results.errors.length} errors
                  </div>
                  <ul className="space-y-0.5 max-h-40 overflow-auto">
                    {results.errors.slice(0, 50).map((e, i) => (
                      <li key={i}><b>Row {e.row}:</b> {e.error}</li>
                    ))}
                    {results.errors.length > 50 && <li>…and {results.errors.length - 50} more</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkCsvDialog;
