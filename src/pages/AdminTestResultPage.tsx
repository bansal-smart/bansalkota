import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Loader2, Lock, Unlock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

type TestRow = {
  id: string;
  title: string;
  slug: string;
  exam_pattern: string;
  subjects: string[] | null;
  total_marks: number;
  starts_at: string | null;
  ends_at: string | null;
  results_released_at: string | null;
  auto_release: boolean;
};

type ResultRow = {
  user_id: string;
  roll_number: string | null;
  full_name: string | null;
  batch_id: string | null;
  batch_name: string | null;
  batch_code: string | null;
  subjects: Record<string, number>;
  total_score: number | null;
  percentage: number | null;
  rank_label: string;
  rank_num: number | null;
  status: "present" | "absent";
};

const safeFmt = (d: string | null | undefined, fmt = "dd/MM/yyyy") => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "—";
    return format(dt, fmt);
  } catch {
    return "—";
  }
};

const num = (n: any) => (n === null || n === undefined ? 0 : Number(n));

const AdminTestResultPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [test, setTest] = useState<TestRow | null>(null);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    const { data: t, error: tErr } = await supabase
      .from("tests")
      .select("id, title, slug, exam_pattern, subjects, total_marks, starts_at, ends_at, results_released_at, auto_release")
      .eq("slug", slug)
      .maybeSingle();
    if (tErr || !t) {
      setError(tErr?.message ?? "Test not found");
      setLoading(false);
      return;
    }
    setTest(t as TestRow);
    const { data: r, error: rErr } = await supabase.rpc("admin_test_result_sheet", { _test_id: t.id });
    if (rErr) {
      setError(rErr.message);
    } else {
      setRows((r ?? []) as ResultRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [slug]);

  // Subjects = union of subjects in test + any seen in rows (fallback)
  const subjects = useMemo(() => {
    const set = new Set<string>(Array.isArray(test?.subjects) ? (test!.subjects as string[]) : []);
    for (const r of rows) {
      Object.keys(r.subjects ?? {}).forEach((s) => set.add(s));
    }
    // Sort with canonical order Physics, Chemistry, Maths, Biology, rest
    const order = ["Physics", "Chemistry", "Mathematics", "Maths", "Biology"];
    return Array.from(set).sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      return a.localeCompare(b);
    });
  }, [test, rows]);

  const presentRows = rows.filter((r) => r.status === "present");

  // Per-subject MAX / MIN / AVG (across present students only)
  const stats = useMemo(() => {
    const m: Record<string, { max: number; min: number; avg: number }> = {};
    const tot = { max: 0, min: 0, avg: 0 };
    if (presentRows.length === 0) {
      subjects.forEach((s) => (m[s] = { max: 0, min: 0, avg: 0 }));
      return { perSubject: m, total: tot };
    }
    for (const s of subjects) {
      const vals = presentRows.map((r) => num(r.subjects?.[s]));
      m[s] = {
        max: Math.max(...vals),
        min: Math.min(...vals),
        avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      };
    }
    const totals = presentRows.map((r) => num(r.total_score));
    tot.max = Math.max(...totals);
    tot.min = Math.min(...totals);
    tot.avg = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
    return { perSubject: m, total: tot };
  }, [subjects, presentRows]);

  const released = useMemo(() => {
    if (!test) return false;
    if (!test.ends_at) return true; // no schedule → always shown
    if (test.results_released_at && new Date(test.results_released_at) <= new Date()) return true;
    if (test.auto_release && new Date(test.ends_at) <= new Date()) return true;
    return false;
  }, [test]);

  const releaseNow = async () => {
    if (!test) return;
    setReleasing(true);
    const { error } = await supabase
      .from("tests")
      .update({ results_released_at: new Date().toISOString() })
      .eq("id", test.id);
    setReleasing(false);
    if (error) return toast.error(error.message);
    toast.success("Results released — students can now view ranks");
    load();
  };

  const examLabel = (test?.exam_pattern ?? "").replace(/-/g, " ").toUpperCase();
  const dateLabel = safeFmt(test?.starts_at ?? test?.ends_at, "dd/MM/yyyy");

  const buildSheetRows = () => {
    // Returns header + body for export
    const header = ["ROLL NO", "NAME", "BATCH", ...subjects.map((s) => s.toUpperCase().slice(0, 5)), "TOTAL", "%AGE", "RANK"];
    const body = rows.map((r) => {
      const subjMarks = subjects.map((s) =>
        r.status === "present" ? num(r.subjects?.[s]) : "",
      );
      return [
        r.roll_number ?? "",
        r.full_name ?? "",
        r.batch_code || r.batch_name || "",
        ...subjMarks,
        r.status === "present" ? num(r.total_score) : "",
        r.status === "present" ? `${num(r.percentage).toFixed(2)}` : "0.00",
        r.rank_label,
      ];
    });
    const footer = [
      ["MAX", "", "", ...subjects.map((s) => stats.perSubject[s]?.max ?? 0), stats.total.max, "", ""],
      ["MIN", "", "", ...subjects.map((s) => stats.perSubject[s]?.min ?? 0), stats.total.min, "", ""],
      ["AVG", "", "", ...subjects.map((s) => stats.perSubject[s]?.avg ?? 0), stats.total.avg, "", ""],
    ];
    return { header, body, footer };
  };

  const downloadXLSX = () => {
    if (!test) return;
    const { header, body, footer } = buildSheetRows();
    const wsData: any[][] = [
      [test.title, "", "", "", "", "", "", "", `DATE : ${dateLabel}`],
      [examLabel, "", "", "", "", "", "", "", `M.M. ${test.total_marks}`],
      [],
      header,
      ...body,
      [],
      ...footer,
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Result");
    XLSX.writeFile(wb, `RESULT_${test.title.replace(/\s+/g, "_")}_${dateLabel.replace(/\//g, "-")}.xlsx`);
  };

  const downloadPDF = () => {
    if (!test) return;
    const { header, body, footer } = buildSheetRows();
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(test.title, 40, 40);
    doc.text(`DATE : ${dateLabel}`, doc.internal.pageSize.getWidth() - 40, 40, { align: "right" });
    doc.setFontSize(11);
    doc.text(examLabel, 40, 58);
    doc.text(`M.M. ${test.total_marks}`, doc.internal.pageSize.getWidth() - 40, 58, { align: "right" });

    autoTable(doc, {
      startY: 80,
      head: [header],
      body,
      foot: footer,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3, halign: "center" },
      headStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: "bold" },
      footStyles: { fillColor: [248, 250, 252], textColor: 20, fontStyle: "bold" },
      columnStyles: {
        0: { halign: "center", cellWidth: 50 },
        1: { halign: "left", cellWidth: 160 },
        2: { halign: "center", cellWidth: 50 },
      },
    });

    doc.save(`RESULT_${test.title.replace(/\s+/g, "_")}_${dateLabel.replace(/\//g, "-")}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="p-6">
        <Link to="/admin/tests" className="text-xs font-semibold text-primary">← Back to tests</Link>
        <p className="mt-4 text-sm text-destructive">{error ?? "Test not found"}</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            to={`/admin/tests/${test.slug}`}
            className="rounded-lg border border-border p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">{test.title} · Result Sheet</h1>
            <p className="text-xs text-muted-foreground">
              {examLabel} · DATE {dateLabel} · M.M. {test.total_marks}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              released
                ? "bg-secondary/20 text-secondary"
                : "bg-amber-500/20 text-amber-700"
            }`}
          >
            {released ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {released ? "Released" : "Locked"}
          </span>
          {!released && (
            <button
              onClick={releaseNow}
              disabled={releasing}
              className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-50 inline-flex items-center gap-1"
            >
              {releasing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlock className="h-3.5 w-3.5" />}
              Release now
            </button>
          )}
          <button
            onClick={downloadXLSX}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 inline-flex items-center gap-1"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </button>
          <button
            onClick={downloadPDF}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted inline-flex items-center gap-1"
          >
            <FileText className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </div>

      {!released && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700">
          Results are still locked for students. The release time is{" "}
          <span className="font-bold">{safeFmt(test.ends_at, "dd MMM yyyy HH:mm")}</span>. Admins can still preview & download.
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No students mapped to this test yet. Assign batches (for CBT) or link a course with enrolled students.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/60 text-foreground">
                <th className="border border-border px-2 py-2 text-left">ROLL NO</th>
                <th className="border border-border px-2 py-2 text-left">NAME</th>
                <th className="border border-border px-2 py-2 text-left">BATCH</th>
                {subjects.map((s) => (
                  <th key={s} className="border border-border px-2 py-2 text-center">
                    {s.toUpperCase().slice(0, 5)}
                  </th>
                ))}
                <th className="border border-border px-2 py-2 text-center">TOTAL</th>
                <th className="border border-border px-2 py-2 text-center">%AGE</th>
                <th className="border border-border px-2 py-2 text-center">RANK</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.user_id}
                  className={r.status === "absent" ? "text-muted-foreground" : "text-foreground"}
                >
                  <td className="border border-border px-2 py-1.5">{r.roll_number ?? "—"}</td>
                  <td className="border border-border px-2 py-1.5 font-medium">{r.full_name ?? "—"}</td>
                  <td className="border border-border px-2 py-1.5">{r.batch_code || r.batch_name || "—"}</td>
                  {subjects.map((s) => (
                    <td key={s} className="border border-border px-2 py-1.5 text-center">
                      {r.status === "present" ? num(r.subjects?.[s]) : ""}
                    </td>
                  ))}
                  <td className="border border-border px-2 py-1.5 text-center font-semibold">
                    {r.status === "present" ? num(r.total_score) : ""}
                  </td>
                  <td className="border border-border px-2 py-1.5 text-center">
                    {r.status === "present" ? num(r.percentage).toFixed(2) : "0.00"}
                  </td>
                  <td className="border border-border px-2 py-1.5 text-center font-bold">
                    {r.rank_label}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/40 font-bold text-foreground">
              {(["max", "min", "avg"] as const).map((k) => (
                <tr key={k}>
                  <td className="border border-border px-2 py-1.5 uppercase">{k}</td>
                  <td className="border border-border px-2 py-1.5"></td>
                  <td className="border border-border px-2 py-1.5"></td>
                  {subjects.map((s) => (
                    <td key={s} className="border border-border px-2 py-1.5 text-center">
                      {stats.perSubject[s]?.[k] ?? 0}
                    </td>
                  ))}
                  <td className="border border-border px-2 py-1.5 text-center">{stats.total[k]}</td>
                  <td className="border border-border px-2 py-1.5"></td>
                  <td className="border border-border px-2 py-1.5"></td>
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminTestResultPage;
