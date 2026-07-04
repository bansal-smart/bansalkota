import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { StudentReportData } from "@/lib/studentReport";

const ORANGE: [number, number, number] = [249, 115, 22];
const NAVY: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];
const LIGHT: [number, number, number] = [241, 245, 249];

export function buildStudentReportPdf(data: StudentReportData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 36;

  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 70, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(0, 70, W, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Bansal Classes", margin, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Monthly Academic Report", margin, 50);
  doc.setFontSize(10);
  doc.text(data.period, W - margin, 50, { align: "right" });

  let y = 100;
  // Student summary card
  doc.setFillColor(...LIGHT);
  doc.roundedRect(margin, y, W - margin * 2, 70, 6, 6, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.student.name, margin + 14, y + 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const infoLine = [
    data.student.classLevel ? `Class: ${data.student.classLevel}` : null,
    data.student.targetExam ? `Goal: ${data.student.targetExam}` : null,
    data.student.mentorName ? `Mentor: ${data.student.mentorName}` : null,
  ]
    .filter(Boolean)
    .join("   |   ");
  doc.text(infoLine || "Bansal Classes student", margin + 14, y + 44);
  doc.setTextColor(...NAVY);
  doc.setFontSize(9);
  doc.text(`Report period: ${data.period}`, margin + 14, y + 60);
  y += 86;

  // KPI tiles
  const tiles = [
    { label: "Tests taken", value: String(data.tests.attempts) },
    { label: "Avg score", value: `${data.tests.avgScorePct}%` },
    { label: "Accuracy", value: `${data.tests.avgAccuracyPct}%` },
    { label: "Best percentile", value: `${data.tests.bestPercentile.toFixed(1)}` },
  ];
  const tileW = (W - margin * 2 - 12 * 3) / 4;
  tiles.forEach((t, i) => {
    const x = margin + i * (tileW + 12);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, tileW, 60, 6, 6, "FD");
    doc.setTextColor(...MUTED);
    doc.setFontSize(9);
    doc.text(t.label, x + 10, y + 18);
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(t.value, x + 10, y + 44);
    doc.setFont("helvetica", "normal");
  });
  y += 80;

  // Section: Subject performance (bar chart)
  y = sectionHeader(doc, "Subject performance", margin, y, W);
  if (data.tests.bySubject.length === 0) {
    drawEmpty(doc, "No tests attempted in this period.", margin, y, W);
    y += 30;
  } else {
    const chartH = 110;
    const chartW = W - margin * 2;
    drawBarChart(doc, data.tests.bySubject, margin, y, chartW, chartH);
    y += chartH + 16;
  }

  // Section: Score trend
  y = sectionHeader(doc, "Score trend", margin, y, W);
  if (data.tests.trend.length === 0) {
    drawEmpty(doc, "No score data to chart.", margin, y, W);
    y += 30;
  } else {
    const chartH = 90;
    drawLineChart(doc, data.tests.trend, margin, y, W - margin * 2, chartH);
    y += chartH + 16;
  }

  // New page if needed
  if (y > 680) {
    doc.addPage();
    y = 50;
  }

  // Section: Test-wise performance, segregated by subject (Bansal's classic
  // "Students Performance Report" grid: per-subject Max-Marks/Marks-Obtained
  // columns, a totals row, and a cumulative-% footer).
  y = sectionHeader(doc, "Test-wise performance", margin, y, W);
  if (data.tests.list.length === 0) {
    drawEmpty(doc, "No tests attempted in this period.", margin, y, W);
    y += 30;
  } else {
    const SUBJECT_ORDER = ["Physics", "Chemistry", "Mathematics", "Maths", "Biology"];
    const subjectSet = new Set<string>();
    data.tests.list.forEach((t) => t.subjects.forEach((s) => subjectSet.add(s.subject)));
    const subjectCols = Array.from(subjectSet).sort((a, b) => {
      const ia = SUBJECT_ORDER.indexOf(a);
      const ib = SUBJECT_ORDER.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      return a.localeCompare(b);
    });

    const chronological = [...data.tests.list].reverse(); // list is newest-first; report reads oldest-first
    const num = (n: number) => n.toFixed(2);

    const head = subjectCols.length
      ? [
          [
            { content: "Test Date", rowSpan: 2 },
            { content: "Test", rowSpan: 2 },
            ...subjectCols.map((s) => ({ content: s, colSpan: 2 })),
            { content: "Total", rowSpan: 2 },
            { content: "%", rowSpan: 2 },
            { content: "Percentile", rowSpan: 2 },
          ],
          subjectCols.flatMap(() => ["MM", "MO"]),
        ]
      : [["Test Date", "Test", "Total", "%", "Percentile"]];

    const body = chronological.map((t) => {
      const dateStr = t.submittedAt
        ? new Date(t.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
        : "—";
      const subjMap = new Map(t.subjects.map((s) => [s.subject, s]));
      const subjCells = subjectCols.flatMap((s) => {
        const sub = subjMap.get(s);
        return sub ? [num(sub.maxScore), num(sub.score)] : ["—", "—"];
      });
      return [
        dateStr,
        t.testName,
        ...subjCells,
        num(t.score),
        t.totalMarks > 0 ? `${Math.round((t.score / t.totalMarks) * 100)}%` : "—",
        t.percentile != null ? t.percentile.toFixed(2) : "—",
      ];
    });

    // Totals row — sum of MM/MO per subject and grand total, mirroring the
    // "Total :" line on the physical report.
    const totalRow = [
      "Total",
      "",
      ...subjectCols.flatMap((s) => {
        const sumMax = chronological.reduce((acc, t) => acc + (t.subjects.find((x) => x.subject === s)?.maxScore ?? 0), 0);
        const sumScore = chronological.reduce((acc, t) => acc + (t.subjects.find((x) => x.subject === s)?.score ?? 0), 0);
        return [num(sumMax), num(sumScore)];
      }),
      num(chronological.reduce((acc, t) => acc + t.score, 0)),
      "",
      "",
    ];
    body.push(totalRow);

    autoTable(doc, {
      startY: y,
      head,
      body,
      margin: { left: margin, right: margin },
      headStyles: { fillColor: NAVY, textColor: 255, halign: "center", valign: "middle" },
      styles: { fontSize: 7.5, cellPadding: 4, overflow: "linebreak", halign: "center" },
      columnStyles: { 1: { halign: "left" } },
      didParseCell: (d) => {
        if (d.row.index === body.length - 1) {
          d.cell.styles.fontStyle = "bold";
          d.cell.styles.fillColor = LIGHT;
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    const totalMax = chronological.reduce((acc, t) => acc + t.totalMarks, 0);
    const totalScore = chronological.reduce((acc, t) => acc + t.score, 0);
    const cummPct = totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(2) : "0.00";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(`Over All :: ${num(totalScore)} / ${num(totalMax)}`, margin, y + 10);
    doc.text(`Cumm. %age : ${cummPct}`, W - margin, y + 10, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 24;
  }

  // Parent note
  if (y > 720) { doc.addPage(); y = 50; }
  y = sectionHeader(doc, "Note for parents", margin, y, W);
  const note = buildParentNote(data);
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  const wrapped = doc.splitTextToSize(note, W - margin * 2);
  doc.text(wrapped, margin, y);
  y += wrapped.length * 14 + 8;

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...LIGHT);
  doc.line(margin, pageH - 36, W - margin, pageH - 36);
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Bansal Classes • Personalised learning for every student", margin, pageH - 22);
  doc.text(
    `Generated ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`,
    W - margin,
    pageH - 22,
    { align: "right" },
  );

  return doc;
}

function sectionHeader(doc: jsPDF, title: string, x: number, y: number, W: number): number {
  doc.setFillColor(...ORANGE);
  doc.rect(x, y, 4, 14, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, x + 12, y + 11);
  doc.setFont("helvetica", "normal");
  return y + 24;
}

function drawEmpty(doc: jsPDF, text: string, x: number, y: number, W: number) {
  doc.setTextColor(...MUTED);
  doc.setFontSize(10);
  doc.text(text, x, y + 14);
}

function drawBarChart(
  doc: jsPDF,
  rows: { subject: string; avgPct: number }[],
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const padL = 30, padB = 24, padT = 8;
  const innerW = w - padL;
  const innerH = h - padB - padT;
  const baseY = y + padT + innerH;
  // Y grid (0,50,100)
  doc.setDrawColor(226, 232, 240);
  doc.setTextColor(...MUTED);
  doc.setFontSize(8);
  [0, 50, 100].forEach((v) => {
    const yy = baseY - (v / 100) * innerH;
    doc.line(x + padL, yy, x + w, yy);
    doc.text(`${v}%`, x + 4, yy + 3);
  });
  const n = rows.length;
  const slot = innerW / n;
  const barW = Math.min(40, slot * 0.6);
  rows.forEach((r, i) => {
    const cx = x + padL + slot * i + slot / 2;
    const bh = (r.avgPct / 100) * innerH;
    doc.setFillColor(...ORANGE);
    doc.rect(cx - barW / 2, baseY - bh, barW, bh, "F");
    doc.setTextColor(...NAVY);
    doc.setFontSize(8);
    doc.text(`${r.avgPct}%`, cx, baseY - bh - 3, { align: "center" });
    doc.setTextColor(...MUTED);
    const label = r.subject.length > 10 ? r.subject.slice(0, 9) + "…" : r.subject;
    doc.text(label, cx, baseY + 12, { align: "center" });
  });
}

function drawLineChart(
  doc: jsPDF,
  pts: { date: string; pct: number }[],
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const padL = 30, padB = 18, padT = 8;
  const innerW = w - padL;
  const innerH = h - padB - padT;
  const baseY = y + padT + innerH;
  doc.setDrawColor(226, 232, 240);
  doc.setTextColor(...MUTED);
  doc.setFontSize(8);
  [0, 50, 100].forEach((v) => {
    const yy = baseY - (v / 100) * innerH;
    doc.line(x + padL, yy, x + w, yy);
    doc.text(`${v}`, x + 4, yy + 3);
  });
  if (pts.length === 0) return;
  const stepX = pts.length > 1 ? innerW / (pts.length - 1) : 0;
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(1.4);
  let prev: { x: number; y: number } | null = null;
  pts.forEach((p, i) => {
    const cx = x + padL + i * stepX + (pts.length === 1 ? innerW / 2 : 0);
    const cy = baseY - (p.pct / 100) * innerH;
    if (prev) doc.line(prev.x, prev.y, cx, cy);
    prev = { x: cx, y: cy };
  });
  doc.setFillColor(...ORANGE);
  pts.forEach((p, i) => {
    const cx = x + padL + i * stepX + (pts.length === 1 ? innerW / 2 : 0);
    const cy = baseY - (p.pct / 100) * innerH;
    doc.circle(cx, cy, 2, "F");
  });
  // X labels (sparse)
  doc.setTextColor(...MUTED);
  doc.setFontSize(7);
  const every = Math.ceil(pts.length / 6);
  pts.forEach((p, i) => {
    if (i % every !== 0 && i !== pts.length - 1) return;
    const cx = x + padL + i * stepX + (pts.length === 1 ? innerW / 2 : 0);
    doc.text(p.date, cx, baseY + 12, { align: "center" });
  });
}

function buildParentNote(d: StudentReportData): string {
  const parts: string[] = [];
  const first = d.student.name.split(" ")[0] || "Your child";
  if (d.tests.attempts > 0) {
    parts.push(
      `${first} attempted ${d.tests.attempts} test${d.tests.attempts === 1 ? "" : "s"} this month with an average score of ${d.tests.avgScorePct}% and accuracy of ${d.tests.avgAccuracyPct}%.`,
    );
  } else {
    parts.push(`${first} did not attempt any tests this month — encourage practice tests to build momentum.`);
  }
  if (d.tests.bySubject.length > 1) {
    const sorted = [...d.tests.bySubject].sort((a, b) => b.avgPct - a.avgPct);
    const best = sorted[0];
    const weak = sorted[sorted.length - 1];
    parts.push(
      `Strongest in ${best.subject} (${best.avgPct}%); ${weak.subject} (${weak.avgPct}%) could use extra practice.`,
    );
  }
  return parts.join(" ");
}

export function downloadStudentReport(data: StudentReportData) {
  const doc = buildStudentReportPdf(data);
  const safeName = data.student.name.replace(/[^a-z0-9]+/gi, "_");
  const monthSlug = data.period.replace(/\s+/g, "_");
  doc.save(`Bansal_Classes_Report_${safeName}_${monthSlug}.pdf`);
}
