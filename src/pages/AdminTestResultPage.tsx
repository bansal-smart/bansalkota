import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileSpreadsheet, Loader2, Lock, Unlock, X, User2, UserX, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import bansalLogo from "@/assets/bansal-logo.png";

type TestRow = {
  id: string;
  title: string;
  slug: string;
  exam_pattern: string;
  subjects: string[] | null;
  total_marks: number;
  duration_minutes: number;
  starts_at: string | null;
  ends_at: string | null;
  results_released_at: string | null;
  auto_release: boolean;
  cbt_allowed_batch_ids: string[] | null;
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

const loadLogoDataUrl = async (): Promise<string | null> => {
  try {
    const res = await fetch(bansalLogo);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const AdminTestResultPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [test, setTest] = useState<TestRow | null>(null);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [batchNames, setBatchNames] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStudent, setActiveStudent] = useState<ResultRow | null>(null);
  const [studentDetail, setStudentDetail] = useState<{
    attempt: any | null;
    questions: any[];
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [exclusions, setExclusions] = useState<Record<string, { reason: string | null; full_name: string | null; roll_number: string | null }>>({});
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    const { data: t, error: tErr } = await supabase
      .from("tests")
      .select("id, title, slug, exam_pattern, subjects, total_marks, duration_minutes, starts_at, ends_at, results_released_at, auto_release, cbt_allowed_batch_ids")
      .eq("slug", slug)
      .maybeSingle();
    if (tErr || !t) {
      setError(tErr?.message ?? "Test not found");
      setLoading(false);
      return;
    }
    setTest(t as TestRow);
    const { data: r, error: rErr } = await (supabase.rpc as any)("admin_test_result_sheet", { _test_id: (t as any).id });
    if (rErr) {
      setError(rErr.message);
    } else {
      setRows((r ?? []) as ResultRow[]);
    }
    // Fetch current exclusions for this test
    const { data: ex } = await supabase
      .from("test_result_exclusions" as any)
      .select("user_id, reason")
      .eq("test_id", (t as any).id);
    const exList = (ex ?? []) as any[];
    if (exList.length) {
      const ids = exList.map((e) => e.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, roll_number")
        .in("user_id", ids);
      const pm: Record<string, any> = {};
      (profs ?? []).forEach((p: any) => (pm[p.user_id] = p));
      const map: Record<string, any> = {};
      exList.forEach((e) => {
        map[e.user_id] = {
          reason: e.reason,
          full_name: pm[e.user_id]?.full_name ?? null,
          roll_number: pm[e.user_id]?.roll_number ?? null,
        };
      });
      setExclusions(map);
    } else {
      setExclusions({});
    }
    // Fetch batch names for header (from allowed batches if present)
    const bIds = (t as any).cbt_allowed_batch_ids ?? [];
    if (Array.isArray(bIds) && bIds.length) {
      const { data: bs } = await supabase.from("course_batches").select("name, code").in("id", bIds);
      setBatchNames(((bs ?? []) as any[]).map((b) => b.code || b.name).filter(Boolean).join(", "));
    } else {
      setBatchNames("");
    }
    setLoading(false);
  };

  const toggleExclusion = async (userId: string, exclude: boolean, name?: string | null) => {
    if (!test) return;
    if (exclude) {
      const reason = window.prompt(`Exclude ${name ?? "this student"} from this test's result?\n\nOptional reason:`, "");
      if (reason === null) return;
      setTogglingId(userId);
      const { error } = await (supabase.rpc as any)("admin_toggle_result_exclusion", {
        _test_id: test.id, _user_id: userId, _exclude: true, _reason: reason || null,
      });
      setTogglingId(null);
      if (error) return toast.error(error.message);
      toast.success("Student excluded from result — ranks recomputed");
    } else {
      setTogglingId(userId);
      const { error } = await (supabase.rpc as any)("admin_toggle_result_exclusion", {
        _test_id: test.id, _user_id: userId, _exclude: false, _reason: null,
      });
      setTogglingId(null);
      if (error) return toast.error(error.message);
      toast.success("Student included back in result");
    }
    load();
  };

  useEffect(() => {
    load();
  }, [slug]);

  const subjects = useMemo(() => {
    const set = new Set<string>(Array.isArray(test?.subjects) ? (test!.subjects as string[]) : []);
    for (const r of rows) {
      Object.keys(r.subjects ?? {}).forEach((s) => set.add(s));
    }
    const order = ["Physics", "Chemistry", "Mathematics", "Maths", "Biology"];
    return Array.from(set).sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      return a.localeCompare(b);
    });
  }, [test, rows]);

  const presentRows = rows.filter((r) => r.status === "present");
  const totalStudents = rows.length;
  const attemptedStudents = presentRows.length;

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
    if (!test.ends_at) return true;
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

  const backRelease = async () => {
    if (!test) return;
    if (!confirm("Back-release results? Students will no longer see ranks/scores until you release again.")) return;
    setReleasing(true);
    const { error } = await supabase
      .from("tests")
      .update({ results_released_at: null, auto_release: false })
      .eq("id", test.id);
    setReleasing(false);
    if (error) return toast.error(error.message);
    toast.success("Results back-released — now locked from students");
    load();
  };

  const examLabel = (test?.exam_pattern ?? "").replace(/-/g, " ").toUpperCase();
  const dateLabel = safeFmt(test?.starts_at ?? test?.ends_at, "dd/MM/yyyy");
  const timeLabel = test?.starts_at
    ? `${safeFmt(test.starts_at, "HH:mm")}${test.ends_at ? "–" + safeFmt(test.ends_at, "HH:mm") : ""}`
    : "—";

  const buildSheetRows = () => {
    const header = ["RANK", "ROLL NO", "NAME", "BATCH", ...subjects.map((s) => s.toUpperCase()), "TOTAL", "%AGE"];
    const body = rows.map((r) => {
      const subjMarks = subjects.map((s) =>
        r.status === "present" ? num(r.subjects?.[s]) : "",
      );
      return [
        r.rank_label,
        r.roll_number ?? "",
        r.full_name ?? "",
        r.batch_code || r.batch_name || "",
        ...subjMarks,
        r.status === "present" ? num(r.total_score) : "",
        r.status === "present" ? `${num(r.percentage).toFixed(2)}` : "",
      ];
    });
    const footer = [
      ["MAX", "", "", "", ...subjects.map((s) => stats.perSubject[s]?.max ?? 0), stats.total.max, ""],
      ["MIN", "", "", "", ...subjects.map((s) => stats.perSubject[s]?.min ?? 0), stats.total.min, ""],
      ["AVG", "", "", "", ...subjects.map((s) => stats.perSubject[s]?.avg ?? 0), stats.total.avg, ""],
    ];
    return { header, body, footer };
  };

  const downloadXLSX = () => {
    if (!test) return;
    const { header, body, footer } = buildSheetRows();
    const wsData: any[][] = [
      ["BANSAL CLASSES PVT. LTD."],
      [test.title],
      [`DATE: ${dateLabel}   TIME: ${timeLabel}   PATTERN: ${examLabel}   M.M.: ${test.total_marks}`],
      [`BATCHES: ${batchNames || "—"}   TOTAL STUDENTS: ${totalStudents}   ATTEMPTED: ${attemptedStudents}`],
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

  const downloadMasterPDF = async () => {
    if (!test) return;
    if (!released) {
      toast.error("Results are still locked. Release them first or wait until the scheduled time.");
      return;
    }
    const { header, body, footer } = buildSheetRows();
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const drawHeader = () => {
      // Top header band
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      doc.text("BANSAL CLASSES PVT. LTD.", pageW / 2, 30, { align: "center" });
      doc.setFontSize(11);
      doc.setTextColor(249, 115, 22);
      doc.text(test.title, pageW / 2, 46, { align: "center" });
      doc.setTextColor(60, 60, 60);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`DATE: ${dateLabel}   TIME: ${timeLabel}   PATTERN: ${examLabel}   M.M.: ${test.total_marks}`, pageW / 2, 60, { align: "center" });
      doc.text(`BATCHES: ${batchNames || "—"}    TOTAL: ${totalStudents}    ATTEMPTED: ${attemptedStudents}`, pageW / 2, 73, { align: "center" });
    };

    autoTable(doc, {
      startY: 88,
      margin: { top: 88, left: 24, right: 24, bottom: 30 },
      head: [header],
      body,
      foot: footer,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3, halign: "center", textColor: 20 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [248, 250, 252], textColor: 20, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [253, 250, 245] },
      columnStyles: {
        0: { halign: "center", cellWidth: 40, fontStyle: "bold" },
        1: { halign: "center", cellWidth: 60 },
        2: { halign: "left", cellWidth: 150 },
        3: { halign: "center", cellWidth: 55 },
      },
      didDrawPage: () => {
        drawHeader();
        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        const current = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(
          `Generated ${format(new Date(), "dd MMM yyyy HH:mm")} · Page ${current}/${pageCount}`,
          pageW / 2,
          pageH - 14,
          { align: "center" },
        );
      },
    });

    doc.save(`MASTER_RESULT_${test.title.replace(/\s+/g, "_")}_${dateLabel.replace(/\//g, "-")}.pdf`);
  };

  // ===== Individual student =====
  const openStudent = async (r: ResultRow) => {
    if (!test) return;
    setActiveStudent(r);
    setStudentDetail(null);
    if (r.status === "absent") return;
    setLoadingDetail(true);
    try {
      const [{ data: att }, { data: qs }] = await Promise.all([
        supabase
          .from("test_attempts")
          .select("id, score, percentile, correct_answers, total_questions, time_spent_seconds, status, submitted_at, answers, metadata")
          .eq("test_id", test.id)
          .eq("user_id", r.user_id)
          .in("status", ["submitted", "auto_submitted"])
          .order("score", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("test_questions")
          .select("id, position, subject, question_text, question_type, marks_correct, marks_wrong")
          .eq("test_id", test.id)
          .order("position"),
      ]);
      setStudentDetail({ attempt: att ?? null, questions: (qs ?? []) as any[] });
    } finally {
      setLoadingDetail(false);
    }
  };

  // ---- helpers for charts inside jsPDF ----
  const drawBarChart = (
    doc: jsPDF,
    x: number, y: number, w: number, h: number,
    labels: string[], series: { name: string; values: number[]; color: [number, number, number] }[],
    title: string,
  ) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(title, x, y - 6);

    const padL = 32, padB = 22, padT = 8, padR = 8;
    const plotX = x + padL, plotY = y + padT;
    const plotW = w - padL - padR, plotH = h - padT - padB;
    const allVals = series.flatMap((s) => s.values);
    const maxV = Math.max(1, ...allVals);
    // grid + axes
    doc.setDrawColor(220); doc.setLineWidth(0.4);
    for (let i = 0; i <= 4; i++) {
      const gy = plotY + (plotH * i) / 4;
      doc.line(plotX, gy, plotX + plotW, gy);
      doc.setFontSize(7); doc.setTextColor(120);
      doc.text(String(Math.round((maxV * (4 - i)) / 4)), x + padL - 4, gy + 2, { align: "right" });
    }
    doc.setDrawColor(80); doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);

    const groupW = plotW / labels.length;
    const barW = Math.min(18, (groupW - 6) / series.length);
    labels.forEach((lab, i) => {
      const gx = plotX + groupW * i + (groupW - barW * series.length) / 2;
      series.forEach((s, si) => {
        const v = s.values[i] ?? 0;
        const bh = (v / maxV) * plotH;
        doc.setFillColor(...s.color);
        doc.rect(gx + si * barW, plotY + plotH - bh, barW - 1, bh, "F");
      });
      doc.setFontSize(7); doc.setTextColor(60);
      doc.text(lab, plotX + groupW * i + groupW / 2, plotY + plotH + 10, { align: "center" });
    });
    // legend
    let lx = plotX;
    const ly = y + h + 6;
    series.forEach((s) => {
      doc.setFillColor(...s.color);
      doc.rect(lx, ly - 5, 6, 6, "F");
      doc.setFontSize(8); doc.setTextColor(60);
      doc.text(s.name, lx + 9, ly);
      lx += 9 + doc.getTextWidth(s.name) + 14;
    });
    return ly + 6;
  };

  const drawHistogram = (
    doc: jsPDF, x: number, y: number, w: number, h: number,
    bins: { label: string; count: number; highlight: boolean }[], title: string,
  ) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(title, x, y - 6);
    const padL = 28, padB = 22, padT = 8, padR = 8;
    const plotX = x + padL, plotY = y + padT;
    const plotW = w - padL - padR, plotH = h - padT - padB;
    const maxC = Math.max(1, ...bins.map((b) => b.count));
    doc.setDrawColor(220); doc.setLineWidth(0.4);
    for (let i = 0; i <= 4; i++) {
      const gy = plotY + (plotH * i) / 4;
      doc.line(plotX, gy, plotX + plotW, gy);
      doc.setFontSize(7); doc.setTextColor(120);
      doc.text(String(Math.round((maxC * (4 - i)) / 4)), x + padL - 4, gy + 2, { align: "right" });
    }
    const bw = plotW / bins.length;
    bins.forEach((b, i) => {
      const bh = (b.count / maxC) * plotH;
      if (b.highlight) doc.setFillColor(249, 115, 22);
      else doc.setFillColor(30, 41, 59);
      doc.rect(plotX + i * bw + 2, plotY + plotH - bh, bw - 4, bh, "F");
      doc.setFontSize(7); doc.setTextColor(60);
      doc.text(b.label, plotX + i * bw + bw / 2, plotY + plotH + 10, { align: "center" });
    });
    // legend
    const ly = y + h + 6;
    doc.setFillColor(249, 115, 22); doc.rect(plotX, ly - 5, 6, 6, "F");
    doc.setFontSize(8); doc.setTextColor(60);
    doc.text("Your band", plotX + 9, ly);
    doc.setFillColor(30, 41, 59); doc.rect(plotX + 70, ly - 5, 6, 6, "F");
    doc.text("Other students (anonymous)", plotX + 79, ly);
    return ly + 6;
  };

  const downloadStudentPDF = async (r: ResultRow) => {
    if (!test) return;
    const tId = toast.loading("Building report…");
    try {
      // 1) Fetch this student's attempt with answers
      const { data: att } = await supabase
        .from("test_attempts")
        .select("id, score, percentile, correct_answers, total_questions, time_spent_seconds, status, submitted_at, answers")
        .eq("test_id", test.id)
        .eq("user_id", r.user_id)
        .in("status", ["submitted", "auto_submitted"])
        .order("score", { ascending: false })
        .limit(1)
        .maybeSingle();

      // 2) Fetch questions
      const { data: qs } = await supabase
        .from("test_questions")
        .select("id, position, subject, question_text, question_type, options, correct_answer, marks_correct, marks_wrong")
        .eq("test_id", test.id)
        .order("position");

      // 3) Fetch all submitted attempts for anonymous comparison
      const { data: allAtt } = await supabase
        .from("test_attempts")
        .select("user_id, score, metadata")
        .eq("test_id", test.id)
        .in("status", ["submitted", "auto_submitted"]);

      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const logo = await loadLogoDataUrl();

      const drawWatermark = () => {
        if (!logo) return;
        try {
          const anyDoc: any = doc;
          anyDoc.setGState(new (jsPDF as any).GState({ opacity: 0.05 }));
          doc.addImage(logo, "PNG", (pageW - 320) / 2, (pageH - 320) / 2, 320, 320, undefined, "FAST");
          anyDoc.setGState(new (jsPDF as any).GState({ opacity: 1 }));
        } catch { /* noop */ }
      };
      const drawHeader = () => {
        drawWatermark();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14); doc.setTextColor(30, 41, 59);
        doc.text("BANSAL CLASSES PVT. LTD.", pageW / 2, 32, { align: "center" });
        doc.setFontSize(11); doc.setTextColor(249, 115, 22);
        doc.text(`${test.title} — Student Report`, pageW / 2, 50, { align: "center" });
      };
      const drawFooter = () => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        const current = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(8); doc.setTextColor(120);
        doc.text(
          `Generated ${format(new Date(), "dd MMM yyyy HH:mm")} · Page ${current}/${pageCount}`,
          pageW / 2, pageH - 14, { align: "center" },
        );
      };

      drawHeader();

      // Meta block
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10); doc.setTextColor(40);
      const meta = [
        ["Student", r.full_name ?? "—"],
        ["Roll No", r.roll_number ?? "—"],
        ["Batch", r.batch_code || r.batch_name || "—"],
        ["Date", dateLabel],
        ["Pattern", examLabel],
        ["Max Marks", String(test.total_marks)],
        ["Status", r.status === "present" ? "Present" : "Absent"],
      ];
      autoTable(doc, {
        startY: 68,
        body: meta,
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 110 } },
        didDrawPage: () => { drawHeader(); drawFooter(); },
      });

      // Subject-wise score table
      const subjBody = subjects.map((s) => [s, r.status === "present" ? num(r.subjects?.[s]) : "—"]);
      subjBody.push(["TOTAL", r.status === "present" ? num(r.total_score) : "—" as any]);
      subjBody.push(["PERCENTAGE", r.status === "present" ? `${num(r.percentage).toFixed(2)}%` : "—"]);
      subjBody.push(["RANK", r.rank_label]);
      autoTable(doc, {
        startY: ((doc as any).lastAutoTable?.finalY ?? 200) + 10,
        head: [["Subject / Metric", "Marks"]],
        body: subjBody,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 5 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        didDrawPage: () => { drawHeader(); drawFooter(); },
      });

      // ===== Subject-wise chart: You vs Class Average =====
      if (r.status === "present" && subjects.length && (allAtt?.length ?? 0) > 0) {
        // Class avg per subject
        const subjAvg: Record<string, { sum: number; n: number }> = {};
        subjects.forEach((s) => (subjAvg[s] = { sum: 0, n: 0 }));
        (allAtt ?? []).forEach((a: any) => {
          const sm = a?.metadata?.subjects ?? {};
          subjects.forEach((s) => {
            const v = Number(sm?.[s]?.score ?? sm?.[s] ?? NaN);
            if (Number.isFinite(v)) { subjAvg[s].sum += v; subjAvg[s].n += 1; }
          });
        });
        const youVals = subjects.map((s) => num(r.subjects?.[s]));
        const avgVals = subjects.map((s) => (subjAvg[s].n ? subjAvg[s].sum / subjAvg[s].n : 0));
        const topVals = subjects.map((s) => {
          let mx = 0;
          (allAtt ?? []).forEach((a: any) => {
            const sm = a?.metadata?.subjects ?? {};
            const v = Number(sm?.[s]?.score ?? sm?.[s] ?? NaN);
            if (Number.isFinite(v) && v > mx) mx = v;
          });
          return mx;
        });

        let y = ((doc as any).lastAutoTable?.finalY ?? 300) + 26;
        if (y + 170 > pageH - 40) { doc.addPage(); drawHeader(); drawFooter(); y = 90; }
        drawBarChart(doc, 40, y, pageW - 80, 150, subjects, [
          { name: "You", values: youVals, color: [249, 115, 22] },
          { name: "Class Avg", values: avgVals.map((v) => +v.toFixed(2)), color: [30, 41, 59] },
          { name: "Topper", values: topVals, color: [16, 185, 129] },
        ], "Subject-wise: You vs Class (anonymous)");
      }

      // ===== Score distribution histogram =====
      if (r.status === "present" && (allAtt?.length ?? 0) > 1 && test.total_marks > 0) {
        const scores = (allAtt ?? []).map((a: any) => Number(a.score ?? 0));
        const max = test.total_marks;
        const min = Math.min(0, ...scores);
        const binCount = 10;
        const step = Math.max(1, Math.ceil((max - min) / binCount));
        const bins = Array.from({ length: binCount }, (_, i) => ({
          lo: min + i * step,
          hi: min + (i + 1) * step,
          count: 0,
          highlight: false,
        }));
        scores.forEach((s) => {
          const idx = Math.min(binCount - 1, Math.max(0, Math.floor((s - min) / step)));
          bins[idx].count += 1;
        });
        const youScore = num(r.total_score);
        const yIdx = Math.min(binCount - 1, Math.max(0, Math.floor((youScore - min) / step)));
        bins[yIdx].highlight = true;
        const histBins = bins.map((b) => ({
          label: `${b.lo}-${b.hi}`,
          count: b.count,
          highlight: b.highlight,
        }));
        let y = ((doc as any).lastAutoTable?.finalY ?? 0);
        y = Math.max(y, 90) + 200;
        if (y + 170 > pageH - 40) { doc.addPage(); drawHeader(); drawFooter(); y = 90; }
        drawHistogram(doc, 40, y, pageW - 80, 150, histBins, "Score Distribution (all students, anonymous)");

        // summary line
        const total = scores.length;
        const avg = scores.reduce((a, b) => a + b, 0) / total;
        const sorted = [...scores].sort((a, b) => a - b);
        const median = sorted[Math.floor(total / 2)];
        const top = sorted[sorted.length - 1];
        const percAtOrBelow = sorted.filter((s) => s <= youScore).length;
        const percentile = ((percAtOrBelow / total) * 100).toFixed(1);
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(40);
        const sumY = y + 170;
        doc.text(
          `Your score: ${youScore}   ·   Class Avg: ${avg.toFixed(1)}   ·   Median: ${median}   ·   Topper: ${top}   ·   You beat: ${percentile}% of students`,
          pageW / 2, sumY, { align: "center" },
        );
      }

      // ===== Question-wise answer review =====
      if (att && qs && qs.length) {
        doc.addPage();
        drawHeader();
        drawFooter();
        const answers = (att.answers ?? {}) as Record<string, { selected: any }>;
        const fmtAns = (val: any, opts: any): string => {
          if (val === null || val === undefined || val === "") return "—";
          if (Array.isArray(val)) return val.map((v) => fmtAns(v, opts)).join(", ");
          if (typeof val === "object") return JSON.stringify(val);
          if (Array.isArray(opts) && typeof val === "number" && opts[val] != null) {
            const o = opts[val];
            const txt = typeof o === "string" ? o : (o?.text ?? JSON.stringify(o));
            return `${String.fromCharCode(65 + val)}. ${String(txt).slice(0, 60)}`;
          }
          return String(val);
        };
        const rows = (qs as any[]).map((q) => {
          const ans = answers[q.id]?.selected;
          const correct = q.correct_answer;
          const yourTxt = fmtAns(ans, q.options);
          const corrTxt = fmtAns(correct, q.options);
          let result = "Not Attempted";
          if (ans !== null && ans !== undefined && ans !== "") {
            const isCorrect = JSON.stringify(ans) === JSON.stringify(correct) ||
              (Array.isArray(correct) && correct.includes(ans));
            result = isCorrect ? "Correct" : "Wrong";
          }
          return [
            String(q.position),
            String(q.subject ?? "—"),
            yourTxt,
            corrTxt,
            result,
          ];
        });
        autoTable(doc, {
          startY: 70,
          head: [["Q#", "Subject", "Your Answer", "Correct Answer", "Result"]],
          body: rows,
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
          headStyles: { fillColor: [30, 41, 59], textColor: 255 },
          columnStyles: {
            0: { cellWidth: 28, halign: "center" },
            1: { cellWidth: 60 },
            2: { cellWidth: 170 },
            3: { cellWidth: 170 },
            4: { cellWidth: 60, halign: "center", fontStyle: "bold" },
          },
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 4) {
              const v = String(data.cell.raw);
              if (v === "Correct") data.cell.styles.textColor = [16, 185, 129];
              else if (v === "Wrong") data.cell.styles.textColor = [220, 38, 38];
              else data.cell.styles.textColor = [120, 120, 120];
            }
          },
          didDrawPage: () => { drawHeader(); drawFooter(); },
        });
      }

      doc.save(`${(r.roll_number || r.full_name || "student").replace(/\s+/g, "_")}_${test.title.replace(/\s+/g, "_")}.pdf`);
      toast.success("Report ready", { id: tId });
    } catch (e: any) {
      toast.error("Failed to build report", { id: tId, description: e?.message });
    }
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
          <Link to={`/admin/tests/${test.slug}`} className="rounded-lg border border-border p-2 hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">{test.title} · Result Sheet</h1>
            <p className="text-xs text-muted-foreground">
              {examLabel} · {dateLabel} {timeLabel !== "—" && `· ${timeLabel}`} · M.M. {test.total_marks}
              {batchNames && ` · ${batchNames}`} · {attemptedStudents}/{totalStudents} attempted
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${released ? "bg-secondary/20 text-secondary" : "bg-amber-500/20 text-amber-700"}`}>
            {released ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {released ? "Released" : "Locked"}
          </span>
          {!released && (
            <button onClick={releaseNow} disabled={releasing} className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-50 inline-flex items-center gap-1">
              {releasing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlock className="h-3.5 w-3.5" />}
              Release now
            </button>
          )}
          {released && (
            <button onClick={backRelease} disabled={releasing} className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-500/10 disabled:opacity-50 inline-flex items-center gap-1">
              {releasing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
              Back release
            </button>
          )}
          <button onClick={downloadXLSX} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted inline-flex items-center gap-1">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </button>
          <button
            onClick={downloadMasterPDF}
            disabled={!released}
            title={released ? "Download branded master result PDF" : "Available after results are released"}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" /> Master Result PDF
          </button>
        </div>
      </div>

      {!released && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700">
          Results are locked for students until <span className="font-bold">{safeFmt(test.ends_at, "dd MMM yyyy HH:mm")}</span>. The master PDF unlocks at the same time (or when you click "Release now").
        </div>
      )}

      {Object.keys(exclusions).length > 0 && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-red-700 inline-flex items-center gap-1">
              <UserX className="h-3.5 w-3.5" /> Excluded from result ({Object.keys(exclusions).length})
            </p>
            <p className="text-[10px] text-red-700/70">These students do not count toward rank, topper or average.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(exclusions).map(([uid, e]) => (
              <div key={uid} className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-white px-2.5 py-1 text-[11px]">
                <span className="font-semibold text-foreground">{e.full_name ?? "Student"}</span>
                {e.roll_number && <span className="text-muted-foreground">· {e.roll_number}</span>}
                {e.reason && <span className="text-muted-foreground italic">· {e.reason}</span>}
                <button
                  onClick={() => toggleExclusion(uid, false)}
                  disabled={togglingId === uid}
                  className="ml-1 inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-bold text-secondary hover:bg-secondary/25 disabled:opacity-50"
                >
                  {togglingId === uid ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
                  Include back
                </button>
              </div>
            ))}
          </div>
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
                <th className="border border-border px-2 py-2 text-center">RANK</th>
                <th className="border border-border px-2 py-2 text-left">ROLL NO</th>
                <th className="border border-border px-2 py-2 text-left">NAME</th>
                <th className="border border-border px-2 py-2 text-left">BATCH</th>
                {subjects.map((s) => (
                  <th key={s} className="border border-border px-2 py-2 text-center">{s.toUpperCase().slice(0, 5)}</th>
                ))}
                <th className="border border-border px-2 py-2 text-center">TOTAL</th>
                <th className="border border-border px-2 py-2 text-center">%AGE</th>
                <th className="border border-border px-2 py-2 text-center">VIEW</th>
                <th className="border border-border px-2 py-2 text-center">EXCLUDE</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.user_id}
                  className={`${r.status === "absent" ? "text-muted-foreground" : "text-foreground hover:bg-muted/30"} cursor-pointer`}
                  onClick={() => openStudent(r)}
                >
                  <td className="border border-border px-2 py-1.5 text-center font-bold">{r.rank_label}</td>
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
                    {r.status === "present" ? num(r.percentage).toFixed(2) : ""}
                  </td>
                  <td className="border border-border px-2 py-1.5 text-center">
                    <User2 className="h-3.5 w-3.5 inline text-primary" />
                  </td>
                  <td className="border border-border px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => toggleExclusion(r.user_id, true, r.full_name)}
                      disabled={togglingId === r.user_id}
                      className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/5 px-2 py-0.5 text-[10px] font-bold text-red-700 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {togglingId === r.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3 w-3" />}
                      Exclude
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/40 font-bold text-foreground">
              {(["max", "min", "avg"] as const).map((k) => (
                <tr key={k}>
                  <td className="border border-border px-2 py-1.5"></td>
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
                  <td className="border border-border px-2 py-1.5"></td>
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
      )}

      {/* Student detail drawer */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setActiveStudent(null)}>
          <div className="w-full sm:max-w-2xl max-h-[92vh] overflow-auto rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
              <div>
                <h3 className="text-base font-bold text-foreground">{activeStudent.full_name ?? "Student"}</h3>
                <p className="text-xs text-muted-foreground">
                  Roll {activeStudent.roll_number ?? "—"} · {activeStudent.batch_code || activeStudent.batch_name || "—"} · Rank {activeStudent.rank_label}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadStudentPDF(activeStudent)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 inline-flex items-center gap-1">
                  <Download className="h-3.5 w-3.5" /> PDF
                </button>
                <button onClick={() => setActiveStudent(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {activeStudent.status === "absent" ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-center text-sm text-amber-700">
                  This student was absent for the test.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {subjects.map((s) => (
                      <div key={s} className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-[10px] uppercase text-muted-foreground">{s}</p>
                        <p className="text-lg font-bold text-foreground">{num(activeStudent.subjects?.[s])}</p>
                      </div>
                    ))}
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <p className="text-[10px] uppercase text-primary">Total</p>
                      <p className="text-lg font-bold text-primary">{num(activeStudent.total_score)} / {test.total_marks}</p>
                    </div>
                    <div className="rounded-lg border border-secondary/30 bg-secondary/5 p-3">
                      <p className="text-[10px] uppercase text-secondary">Percentage</p>
                      <p className="text-lg font-bold text-secondary">{num(activeStudent.percentage).toFixed(2)}%</p>
                    </div>
                  </div>

                  {loadingDetail && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}

                  {studentDetail?.attempt && (
                    <div className="rounded-lg border border-border bg-card p-3 text-xs space-y-1">
                      <p><span className="font-bold">Correct:</span> {studentDetail.attempt.correct_answers ?? 0}/{studentDetail.attempt.total_questions ?? 0}</p>
                      <p><span className="font-bold">Time spent:</span> {studentDetail.attempt.time_spent_seconds ? `${Math.round(studentDetail.attempt.time_spent_seconds / 60)} min` : "—"}</p>
                      <p><span className="font-bold">Submitted:</span> {safeFmt(studentDetail.attempt.submitted_at, "dd MMM yyyy HH:mm")}</p>
                      <p><span className="font-bold">Status:</span> {studentDetail.attempt.status}</p>
                    </div>
                  )}

                  {studentDetail?.questions && studentDetail.questions.length > 0 && studentDetail.attempt && (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/60">
                          <tr>
                            <th className="px-2 py-1.5 text-left">Q#</th>
                            <th className="px-2 py-1.5 text-left">Subject</th>
                            <th className="px-2 py-1.5 text-center">Status</th>
                            <th className="px-2 py-1.5 text-center">Marks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentDetail.questions.map((q: any) => {
                            const perQ: any[] = (studentDetail.attempt?.metadata?.questions as any[]) ?? [];
                            const rec = perQ.find((x) => x?.question_id === q.id);
                            const attempted = rec ? !!rec.attempted : false;
                            const isCorrect = rec ? !!rec.is_correct : false;
                            const label = !attempted ? "Not attempted" : isCorrect ? "Correct" : "Wrong";
                            const cls = !attempted
                              ? "text-gray-500"
                              : isCorrect
                                ? "text-green-700"
                                : "text-red-600";
                            const m = rec ? Number(rec.marks ?? 0) : 0;
                            const marksCls = m > 0 ? "text-green-700" : m < 0 ? "text-red-600" : "text-gray-500";
                            return (
                              <tr key={q.id} className="border-t border-border">
                                <td className="px-2 py-1.5">{q.position}</td>
                                <td className="px-2 py-1.5">{q.subject ?? "—"}</td>
                                <td className={`px-2 py-1.5 text-center font-semibold ${cls}`}>{label}</td>
                                <td className={`px-2 py-1.5 text-center font-semibold ${marksCls}`}>{m > 0 ? `+${m}` : m}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTestResultPage;
