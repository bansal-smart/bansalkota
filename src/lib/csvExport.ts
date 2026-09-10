// Shared helpers for admin CSV exports that get opened in Excel. Excel
// auto-detects and reformats any cell that "looks like" a number or date
// using its own locale rules — long digit strings (phone numbers) get
// mangled into scientific notation, and date-like text gets reparsed into
// Excel's own date serial number (often displaying as "########" when the
// column is too narrow). The underlying exported data is correct; only the
// CSV cell needs to be shielded from that auto-detection.

function csvQuote(raw: string): string {
  return `"${raw.replace(/"/g, '""')}"`;
}

export function csvField(raw: string | number | null | undefined): string {
  return csvQuote(raw == null ? "" : String(raw));
}

// Forces Excel to treat this cell as literal text via the ="..." text-
// formula trick, which reliably prevents scientific notation on long
// digit strings and prevents Excel re-parsing an already human-formatted
// date string back into a date serial number. More consistently respected
// across Excel versions than a leading apostrophe.
export function excelTextField(raw: string | null | undefined): string {
  const value = raw ?? "";
  if (!value) return csvQuote("");
  return csvQuote(`="${value.replace(/"/g, '""')}"`);
}

// "YYYY-MM-DD" (Postgres date column) -> "DD-MM-YYYY". Pure string
// manipulation, no Date object involved, so there's no timezone shift risk
// on a date-only value.
export function formatDateDDMMYYYY(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const [yyyy, mm, dd] = dateStr.split("-");
  if (!yyyy || !mm || !dd) return dateStr;
  return `${dd}-${mm}-${yyyy}`;
}

// ISO timestamp -> readable IST date-time, e.g. "10-09-2026 06:10 PM".
export function formatDateTimeIST(isoStr: string | null | undefined): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")} ${get("dayPeriod").toUpperCase()}`;
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.map(csvField).join(",")]
    .concat(rows.map((row) => row.join(",")))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
