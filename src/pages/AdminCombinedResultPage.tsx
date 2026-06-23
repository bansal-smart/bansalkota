import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, FileSpreadsheet, Loader2, User2 } from "lucide-react";
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

const subjectOrder = ["Physics", "Chemistry", "Mathematics", "Maths", "Biology"];
const sortSubjects = (set: Set<string>) =>
  Array.from(set).sort((a, b) => {
    const ia = subjectOrder.indexOf(a);
    const ib = subjectOrder.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return a.localeCompare(b);
  });

type Merged = {
  key: string;
  user_id: string;
  roll_number: string | null;
  full_name: string | null;
  batch_label: string;
  p1?: ResultRow;
  p2?: ResultRow;
  grandTotal: number;
  maxMarks: number;
  pct: number;
  rankCombined: string;
  rankP1: string;
  rankP2: string;
};

const AdminCombinedResultPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const partnerSlug = params.get("with");

  const [test1, setTest1] = useState<TestRow | null>(null);
  const [test2, setTest2] = useState<TestRow | null>(null);
  const [rows1, setRows1] = useState<ResultRow[]>([]);
  const [rows2, setRows2] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!slug || !partnerSlug) {
      setError("Missing test or partner.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const cols = "id, title, slug, exam_pattern, subjects, total_marks, starts_at, ends_at";
    const [a, b] = await Promise.all([
      supabase.from("tests").select(cols).eq("slug", slug).maybeSingle(),
      supabase.from("tests").select(cols).eq("slug", partnerSlug).maybeSingle(),
    ]);
    if (a.error || !a.data) { setError(a.error?.message ?? "Test not found"); setLoading(false); return; }
    if (b.error || !b.data) { setError(b.error?.message ?? "Partner test not found"); setLoading(false); return; }

    setTest1(a.data as TestRow);
    setTest2(b.data as TestRow);

    const [r1, r2] = await Promise.all([
      (supabase.rpc as any)("admin_test_result_sheet", { _test_id: (a.data as any).id }),
      (supabase.rpc as any)("admin_test_result_sheet", { _test_id: (b.data as any).id }),
    ]);
    if (r1.error) setError(r1.error.message);
    if (r2.error) setError(r2.error.message);
    setRows1((r1.data ?? []) as ResultRow[]);
    setRows2((r2.data ?? []) as ResultRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [slug, partnerSlug]);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    [test1, test2].forEach((t) => Array.isArray(t?.subjects) && t!.subjects!.forEach((s) => set.add(s)));
    [...rows1, ...rows2].forEach((r) => Object.keys(r.subjects ?? {}).forEach((s) => set.add(s)));
    return sortSubjects(set);
  }, [test1, test2, rows1, rows2]);

  const merged = useMemo<Merged[]>(() => {
    if (!test1 || !test2) return [];
    // Match by roll_number when present, else fall back to user_id
    const keyOf = (r: ResultRow) => (r.roll_number && r.roll_number.trim() ? `R:${r.roll_number.trim()}` : `U:${r.user_id}`);
    const map = new Map<string, Merged>();

    const upsert = (r: ResultRow, which: 1 | 2) => {
      const k = keyOf(r);
      let m = map.get(k);
      if (!m) {
        m = {
          key: k,
          user_id: r.user_id,
          roll_number: r.roll_number,
          full_name: r.full_name,
          batch_label: r.batch_code || r.batch_name || "",
          grandTotal: 0, maxMarks: 0, pct: 0,
          rankCombined: "—", rankP1: "—", rankP2: "—",
        };
        map.set(k, m);
      }
      // Prefer the most complete identity info
      if (!m.full_name && r.full_name) m.full_name = r.full_name;
      if (!m.roll_number && r.roll_number) m.roll_number = r.roll_number;
      if (!m.batch_label && (r.batch_code || r.batch_name)) m.batch_label = r.batch_code || r.batch_name || "";
      if (which === 1) m.p1 = r; else m.p2 = r;
    };
    rows1.forEach((r) => upsert(r, 1));
    rows2.forEach((r) => upsert(r, 2));

    const list = Array.from(map.values());

    // Compute grand total + max marks (only papers attempted count)
    list.forEach((m) => {
      let total = 0;
      let maxM = 0;
      const p1Present = m.p1 && m.p1.status === "present";
      const p2Present = m.p2 && m.p2.status === "present";
      if (p1Present) { total += num(m.p1!.total_score); maxM += num(test1.total_marks); }
      if (p2Present) { total += num(m.p2!.total_score); maxM += num(test2.total_marks); }
      m.grandTotal = total;
      m.maxMarks = maxM;
      m.pct = maxM > 0 ? (total / maxM) * 100 : 0;
    });

    // Dense ranking helpers
    const denseRank = (vals: { k: string; score: number; eligible: boolean }[]) => {
      const sorted = [...vals].filter((v) => v.eligible).sort((a, b) => b.score - a.score);
      const ranks = new Map<string, string>();
      let prev: number | null = null;
      let r = 0;
      let i = 0;
      for (const v of sorted) {
        i += 1;
        if (prev === null || v.score !== prev) r = i;
        ranks.set(v.k, String(r));
        prev = v.score;
      }
      return ranks;
    };

    const p1Rank = denseRank(list.map((m) => ({ k: m.key, score: num(m.p1?.total_score), eligible: !!(m.p1 && m.p1.status === "present") })));
    const p2Rank = denseRank(list.map((m) => ({ k: m.key, score: num(m.p2?.total_score), eligible: !!(m.p2 && m.p2.status === "present") })));
    const combinedRank = denseRank(list.map((m) => ({ k: m.key, score: m.grandTotal, eligible: m.maxMarks > 0 })));

    list.forEach((m) => {
      m.rankP1 = p1Rank.get(m.key) ?? (m.p1 ? "ABS" : "—");
      m.rankP2 = p2Rank.get(m.key) ?? (m.p2 ? "ABS" : "—");
      m.rankCombined = combinedRank.get(m.key) ?? "ABS";
    });

    // Sort: combined-rank ascending; ABS at the bottom
    list.sort((a, b) => {
      const ra = a.rankCombined === "ABS" || a.rankCombined === "—" ? Number.MAX_SAFE_INTEGER : Number(a.rankCombined);
      const rb = b.rankCombined === "ABS" || b.rankCombined === "—" ? Number.MAX_SAFE_INTEGER : Number(b.rankCombined);
      if (ra !== rb) return ra - rb;
      return (a.full_name ?? "").localeCompare(b.full_name ?? "");
    });
    return list;
  }, [test1, test2, rows1, rows2]);

  // Stats per (subject,paper), per total, per grand
  const stats = useMemo(() => {
    const empty = { max: 0, min: 0, avg: 0 };
    const pSub: Record<string, { p1: typeof empty; p2: typeof empty; tot: typeof empty }> = {};
    subjects.forEach((s) => (pSub[s] = { p1: { ...empty }, p2: { ...empty }, tot: { ...empty } }));
    const aggregate = (vals: number[]) =>
      vals.length === 0 ? { ...empty } : {
        max: Math.max(...vals),
        min: Math.min(...vals),
        avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      };
    const p1Rows = merged.filter((m) => m.p1 && m.p1.status === "present");
    const p2Rows = merged.filter((m) => m.p2 && m.p2.status === "present");
    subjects.forEach((s) => {
      pSub[s].p1 = aggregate(p1Rows.map((m) => num(m.p1!.subjects?.[s])));
      pSub[s].p2 = aggregate(p2Rows.map((m) => num(m.p2!.subjects?.[s])));
      pSub[s].tot = aggregate(merged
        .filter((m) => (m.p1?.status === "present") || (m.p2?.status === "present"))
        .map((m) => num(m.p1?.status === "present" ? m.p1!.subjects?.[s] : 0) + num(m.p2?.status === "present" ? m.p2!.subjects?.[s] : 0)));
    });
    const total1 = aggregate(p1Rows.map((m) => num(m.p1!.total_score)));
    const total2 = aggregate(p2Rows.map((m) => num(m.p2!.total_score)));
    const grand = aggregate(merged.filter((m) => m.maxMarks > 0).map((m) => m.grandTotal));
    return { pSub, total1, total2, grand };
  }, [subjects, merged]);

  const t1Label = test1 ? `${safeFmt(test1.starts_at ?? test1.ends_at, "dd/MM/yy")} · ${test1.title}` : "";
  const t2Label = test2 ? `${safeFmt(test2.starts_at ?? test2.ends_at, "dd/MM/yy")} · ${test2.title}` : "";

  const cellNum = (m: Merged, which: 1 | 2, s: string) => {
    const r = which === 1 ? m.p1 : m.p2;
    if (!r) return "—";
    if (r.status === "absent") return "Absent";
    return String(num(r.subjects?.[s]));
  };
  const cellTot = (m: Merged, which: 1 | 2) => {
    const r = which === 1 ? m.p1 : m.p2;
    if (!r) return "—";
    if (r.status === "absent") return "Absent";
    return String(num(r.total_score));
  };

  // ===== Export helpers =====
  const buildSheetData = () => {
    const headerTop: any[] = ["RANK P1", "RANK P2", "RANK COMB", "ROLL NO", "NAME", "BATCH"];
    subjects.forEach((s) => {
      const u = s.toUpperCase().slice(0, 5);
      headerTop.push(`${u} 1`, `${u} 2`, `${u} TOT`);
    });
    headerTop.push("TOTAL 1", "TOTAL 2", "GRAND TOTAL", "%AGE");

    const body = merged.map((m) => {
      const row: any[] = [m.rankP1, m.rankP2, m.rankCombined, m.roll_number ?? "", m.full_name ?? "", m.batch_label];
      subjects.forEach((s) => {
        row.push(cellNum(m, 1, s), cellNum(m, 2, s),
          (m.p1?.status === "present" || m.p2?.status === "present")
            ? num(m.p1?.status === "present" ? m.p1!.subjects?.[s] : 0) + num(m.p2?.status === "present" ? m.p2!.subjects?.[s] : 0)
            : "—");
      });
      row.push(cellTot(m, 1), cellTot(m, 2), m.maxMarks > 0 ? m.grandTotal : "—", m.maxMarks > 0 ? m.pct.toFixed(2) : "—");
      return row;
    });

    const footerRow = (k: "max" | "min" | "avg") => {
      const r: any[] = [k.toUpperCase(), "", "", "", "", ""];
      subjects.forEach((s) => r.push(stats.pSub[s].p1[k], stats.pSub[s].p2[k], stats.pSub[s].tot[k]));
      r.push(stats.total1[k], stats.total2[k], stats.grand[k], "");
      return r;
    };
    return { header: headerTop, body, footer: [footerRow("max"), footerRow("min"), footerRow("avg")] };
  };

  const downloadXLSX = () => {
    if (!test1 || !test2) return;
    const { header, body, footer } = buildSheetData();
    const wsData: any[][] = [
      ["BANSAL CLASSES PVT. LTD. — COMBINED RESULT"],
      [`PAPER 1: ${test1.title}    PAPER 2: ${test2.title}`],
      [`M.M.: P1 ${test1.total_marks} + P2 ${test2.total_marks} = ${test1.total_marks + test2.total_marks}`],
      [],
      header,
      ...body,
      [],
      ...footer,
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Combined Result");
    const fname = `COMBINED_${test1.title.replace(/\s+/g, "_")}__${test2.title.replace(/\s+/g, "_")}.xlsx`;
    XLSX.writeFile(wb, fname);
  };

  const downloadMasterPDF = () => {
    if (!test1 || !test2) return;
    const { header, body, footer } = buildSheetData();
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const drawHeader = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      doc.text("BANSAL CLASSES PVT. LTD. — COMBINED RESULT", pageW / 2, 30, { align: "center" });
      doc.setFontSize(10);
      doc.setTextColor(249, 115, 22);
      doc.text(`P1: ${test1.title}   ·   P2: ${test2.title}`, pageW / 2, 48, { align: "center" });
      doc.setTextColor(60);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`M.M.: P1 ${test1.total_marks} + P2 ${test2.total_marks} = ${test1.total_marks + test2.total_marks}    ·    Students: ${merged.length}`, pageW / 2, 62, { align: "center" });
    };

    autoTable(doc, {
      startY: 78,
      margin: { top: 78, left: 20, right: 20, bottom: 28 },
      head: [header],
      body,
      foot: footer,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 2.5, halign: "center", textColor: 20 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold", fontSize: 7 },
      footStyles: { fillColor: [248, 250, 252], textColor: 20, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [253, 250, 245] },
      didDrawPage: () => {
        drawHeader();
        const pageCount = (doc as any).internal.getNumberOfPages();
        const current = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(`Generated ${format(new Date(), "dd MMM yyyy HH:mm")} · Page ${current}/${pageCount}`, pageW / 2, pageH - 14, { align: "center" });
      },
    });
    doc.save(`COMBINED_RESULT_${test1.title.replace(/\s+/g, "_")}__${test2.title.replace(/\s+/g, "_")}.pdf`);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (error || !test1 || !test2) {
    return (
      <div className="p-6">
        <Link to={`/admin/tests/${slug}/result`} className="text-xs font-semibold text-primary">← Back to result</Link>
        <p className="mt-4 text-sm text-destructive">{error ?? "Unable to load combined result"}</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to={`/admin/tests/${test1.slug}/result`} className="rounded-lg border border-border p-2 hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Combined Result</h1>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">P1:</span> {t1Label} &nbsp;·&nbsp; <span className="font-semibold">P2:</span> {t2Label}
              &nbsp;·&nbsp; M.M. {test1.total_marks} + {test2.total_marks} = {test1.total_marks + test2.total_marks}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={downloadXLSX} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted inline-flex items-center gap-1">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </button>
          <button onClick={downloadMasterPDF} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 inline-flex items-center gap-1">
            <Download className="h-3.5 w-3.5" /> Combined PDF
          </button>
        </div>
      </div>

      {merged.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No students found for either paper.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-muted/60 text-foreground">
                <th rowSpan={2} className="border border-border px-2 py-2 text-center">RANK P1</th>
                <th rowSpan={2} className="border border-border px-2 py-2 text-center">RANK P2</th>
                <th rowSpan={2} className="border border-border px-2 py-2 text-center bg-primary/10">RANK COMB.</th>
                <th rowSpan={2} className="border border-border px-2 py-2 text-left">ROLL NO</th>
                <th rowSpan={2} className="border border-border px-2 py-2 text-left">NAME</th>
                <th rowSpan={2} className="border border-border px-2 py-2 text-left">BATCH</th>
                {subjects.map((s) => (
                  <th key={s} colSpan={3} className="border border-border px-2 py-1.5 text-center bg-muted/80">{s.toUpperCase().slice(0, 5)}</th>
                ))}
                <th colSpan={3} className="border border-border px-2 py-1.5 text-center bg-primary/10">TOTAL</th>
                <th rowSpan={2} className="border border-border px-2 py-2 text-center bg-primary/10">%AGE</th>
                <th rowSpan={2} className="border border-border px-2 py-2 text-center">VIEW</th>
              </tr>
              <tr className="bg-muted/40 text-foreground">
                {subjects.map((s) => (
                  <Fragment key={s}>
                    <th className="border border-border px-1 py-1 text-center font-normal">P1</th>
                    <th className="border border-border px-1 py-1 text-center font-normal">P2</th>
                    <th className="border border-border px-1 py-1 text-center">TOT</th>
                  </Fragment>
                ))}
                <th className="border border-border px-1 py-1 text-center font-normal">P1</th>
                <th className="border border-border px-1 py-1 text-center font-normal">P2</th>
                <th className="border border-border px-1 py-1 text-center bg-primary/10">GRAND</th>
              </tr>
            </thead>
            <tbody>
              {merged.map((m) => {
                const absentClass = (s: string) => s === "Absent" ? "text-muted-foreground italic" : "";
                const subjTot = (s: string) => {
                  const has1 = m.p1?.status === "present";
                  const has2 = m.p2?.status === "present";
                  if (!has1 && !has2) return "—";
                  return num(has1 ? m.p1!.subjects?.[s] : 0) + num(has2 ? m.p2!.subjects?.[s] : 0);
                };
                return (
                  <tr key={m.key} className="text-foreground hover:bg-muted/30">
                    <td className="border border-border px-2 py-1.5 text-center font-semibold">{m.rankP1}</td>
                    <td className="border border-border px-2 py-1.5 text-center font-semibold">{m.rankP2}</td>
                    <td className="border border-border px-2 py-1.5 text-center font-bold bg-primary/5">{m.rankCombined}</td>
                    <td className="border border-border px-2 py-1.5">{m.roll_number ?? "—"}</td>
                    <td className="border border-border px-2 py-1.5 font-medium">{m.full_name ?? "—"}</td>
                    <td className="border border-border px-2 py-1.5">{m.batch_label || "—"}</td>
                    {subjects.map((s) => {
                      const v1 = cellNum(m, 1, s);
                      const v2 = cellNum(m, 2, s);
                      return (
                        <>
                          <td key={`${m.key}-${s}-1`} className={`border border-border px-2 py-1.5 text-center ${absentClass(v1)}`}>{v1}</td>
                          <td key={`${m.key}-${s}-2`} className={`border border-border px-2 py-1.5 text-center ${absentClass(v2)}`}>{v2}</td>
                          <td key={`${m.key}-${s}-t`} className="border border-border px-2 py-1.5 text-center font-semibold">{subjTot(s)}</td>
                        </>
                      );
                    })}
                    <td className={`border border-border px-2 py-1.5 text-center ${absentClass(cellTot(m, 1))}`}>{cellTot(m, 1)}</td>
                    <td className={`border border-border px-2 py-1.5 text-center ${absentClass(cellTot(m, 2))}`}>{cellTot(m, 2)}</td>
                    <td className="border border-border px-2 py-1.5 text-center font-bold bg-primary/5">{m.maxMarks > 0 ? m.grandTotal : "—"}</td>
                    <td className="border border-border px-2 py-1.5 text-center bg-primary/5">{m.maxMarks > 0 ? m.pct.toFixed(2) : "—"}</td>
                    <td className="border border-border px-2 py-1.5 text-center">
                      <div className="inline-flex items-center gap-1">
                        {m.p1 && m.p1.status === "present" && (
                          <Link to={`/admin/tests/${test1.slug}/result`} title={`P1 result`} className="text-primary"><User2 className="h-3.5 w-3.5" /></Link>
                        )}
                        {m.p2 && m.p2.status === "present" && (
                          <Link to={`/admin/tests/${test2.slug}/result`} title={`P2 result`} className="text-primary"><User2 className="h-3.5 w-3.5" /></Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/40 font-bold text-foreground">
              {(["max", "min", "avg"] as const).map((k) => (
                <tr key={k}>
                  <td className="border border-border px-2 py-1.5"></td>
                  <td className="border border-border px-2 py-1.5"></td>
                  <td className="border border-border px-2 py-1.5 uppercase">{k}</td>
                  <td className="border border-border px-2 py-1.5"></td>
                  <td className="border border-border px-2 py-1.5"></td>
                  <td className="border border-border px-2 py-1.5"></td>
                  {subjects.map((s) => (
                    <>
                      <td key={`${k}-${s}-1`} className="border border-border px-2 py-1.5 text-center">{stats.pSub[s].p1[k]}</td>
                      <td key={`${k}-${s}-2`} className="border border-border px-2 py-1.5 text-center">{stats.pSub[s].p2[k]}</td>
                      <td key={`${k}-${s}-t`} className="border border-border px-2 py-1.5 text-center">{stats.pSub[s].tot[k]}</td>
                    </>
                  ))}
                  <td className="border border-border px-2 py-1.5 text-center">{stats.total1[k]}</td>
                  <td className="border border-border px-2 py-1.5 text-center">{stats.total2[k]}</td>
                  <td className="border border-border px-2 py-1.5 text-center bg-primary/5">{stats.grand[k]}</td>
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

export default AdminCombinedResultPage;
