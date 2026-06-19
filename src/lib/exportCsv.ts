// Lightweight CSV export helper. Use for admin "Export" buttons that don't
// need the full BulkCsvDialog (read-only datasets like enquiries).
const csvSafe = (v: any) => {
  const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export type ExportColumn<T> = { key: string; label: string; value?: (row: T) => any };

export function exportCsv<T extends Record<string, any>>(
  fileBase: string,
  rows: T[],
  columns: ExportColumn<T>[],
) {
  const header = columns.map((c) => csvSafe(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => csvSafe(c.value ? c.value(r) : r[c.key])).join(","))
    .join("\n");
  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const ts = new Date().toISOString().slice(0, 10);
  a.download = `${fileBase}-${ts}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
