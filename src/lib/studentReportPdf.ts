import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { StudentReportData } from "@/lib/studentReport";

const ORANGE: [number, number, number] = [249, 115, 22];
const NAVY: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];
const LIGHT: [number, number, number] = [241, 245, 249];
// Lighter, muted palette for per-test bars (avoids the bright brand orange).
const CHART_PALETTE: [number, number, number][] = [
  [148, 190, 224], // soft blue
  [168, 213, 186], // soft green
  [223, 190, 145], // soft amber
  [200, 168, 216], // soft purple
  [224, 168, 168], // soft red
  [163, 214, 214], // soft teal
];

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
  doc.text("Academic Performance Report", margin, 50);
  doc.setFontSize(10);
  doc.text(`${data.tests.attempts} test${data.tests.attempts === 1 ? "" : "s"} recorded`, W - margin, 50, { align: "right" });

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
  doc.text(
    `Report generated ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · Overall performance across all tests`,
    margin + 14,
    y + 60,
  );
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

  // Section: Test performance by subject — one grouped bar chart with
  // subjects on the X-axis and one distinctly-coloured bar per test within
  // each subject group (a test's subjects are attempted together, so "Test 1"
  // lines up across every subject it covered).
  y = sectionHeader(doc, "Test performance by subject", margin, y, W);
  const attemptedChron = [...data.tests.list].filter((t) => !t.isAbsent && t.subjects.length).reverse();
  if (attemptedChron.length === 0) {
    drawEmpty(doc, "No tests attempted yet.", margin, y, W);
    y += 30;
  } else {
    const CHART_ORDER = ["Physics", "Chemistry", "Mathematics", "Maths", "Biology"];
    const chartSubjects = Array.from(new Set(attemptedChron.flatMap((t) => t.subjects.map((s) => s.subject))))
      .sort((a, b) => {
        const ia = CHART_ORDER.indexOf(a);
        const ib = CHART_ORDER.indexOf(b);
        if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        return a.localeCompare(b);
      });
    const series = attemptedChron.map((t, i) => ({
      name: t.submittedAt
        ? new Date(t.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
        : `Test ${i + 1}`,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
      values: chartSubjects.map((subj) => {
        const s = t.subjects.find((x) => x.subject === subj);
        return s && s.maxScore > 0 ? Math.round((s.score / s.maxScore) * 100) : 0;
      }),
    }));
    const chartH = 110;
    const legendH = Math.ceil(series.length / 8) * 14 + 10;
    const chartW = W - margin * 2;
    drawGroupedBarChart(doc, chartSubjects, series, margin, y, chartW, chartH, legendH);
    y += chartH + legendH + 16;
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
    drawEmpty(doc, "No tests attempted yet.", margin, y, W);
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
            { content: "Rank", rowSpan: 2 },
            { content: "Percentile", rowSpan: 2 },
          ],
          subjectCols.flatMap(() => ["MM", "MO"]),
        ]
      : [["Test Date", "Test", "Total", "%", "Rank", "Percentile"]];

    const absentRowIndices = new Set<number>();
    const body = chronological.map((t, i) => {
      if (t.isAbsent) absentRowIndices.add(i);
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
        t.isAbsent ? "Absent" : num(t.score),
        t.isAbsent ? "—" : t.totalMarks > 0 ? `${Math.round((t.score / t.totalMarks) * 100)}%` : "—",
        t.rank != null ? `${t.rank}${t.rankOf ? `/${t.rankOf}` : ""}` : "—",
        t.percentile != null ? t.percentile.toFixed(2) : "—",
      ];
    });

    // Totals row — sum of MM/MO per subject and grand total, mirroring the
    // "Total :" line on the physical report. Absent tests contribute 0.
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
        } else if (absentRowIndices.has(d.row.index)) {
          d.cell.styles.textColor = [200, 60, 60];
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

function drawGroupedBarChart(
  doc: jsPDF,
  labels: string[],
  series: { name: string; values: number[]; color: [number, number, number] }[],
  x: number,
  y: number,
  w: number,
  h: number,
  legendH: number,
) {
  const padL = 30, padB = 24, padT = 8, padR = 4;
  const plotX = x + padL;
  const plotY = y + padT;
  const plotW = w - padL - padR;
  const plotH = h - padB - padT;
  const baseY = plotY + plotH;

  // Y grid (0,50,100)
  doc.setDrawColor(226, 232, 240);
  doc.setTextColor(...MUTED);
  doc.setFontSize(8);
  [0, 50, 100].forEach((v) => {
    const yy = baseY - (v / 100) * plotH;
    doc.line(plotX, yy, plotX + plotW, yy);
    doc.text(`${v}%`, x + padL - 4, yy + 3, { align: "right" });
  });

  const groupW = plotW / labels.length;
  const barW = Math.max(2, Math.min(16, (groupW - 8) / series.length));
  labels.forEach((label, gi) => {
    const gx = plotX + groupW * gi + (groupW - barW * series.length) / 2;
    series.forEach((s, si) => {
      const v = s.values[gi] ?? 0;
      const bh = (v / 100) * plotH;
      doc.setFillColor(...s.color);
      doc.rect(gx + si * barW, baseY - bh, barW - 1, bh, "F");
      if (v > 0) {
        doc.setFontSize(6);
        doc.setTextColor(...NAVY);
        doc.text(`${v}`, gx + si * barW + (barW - 1) / 2, baseY - bh - 2, { align: "center" });
      }
    });
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const lab = label.length > 10 ? label.slice(0, 9) + "…" : label;
    doc.text(lab, plotX + groupW * gi + groupW / 2, baseY + 12, { align: "center" });
  });

  // Legend — wraps onto additional rows once it would overflow the chart width.
  let lx = x;
  let ly = y + h + 10;
  const legendTop = ly;
  series.forEach((s) => {
    const textW = doc.getTextWidth(s.name);
    if (lx + 9 + textW > x + w && lx > x) {
      lx = x;
      ly += 12;
    }
    doc.setFillColor(...s.color);
    doc.rect(lx, ly - 5, 6, 6, "F");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(s.name, lx + 9, ly);
    lx += 9 + textW + 12;
  });
  return legendTop + legendH;
}

function buildParentNote(d: StudentReportData): string {
  const parts: string[] = [];
  const first = d.student.name.split(" ")[0] || "Your child";
  if (d.tests.attempts > 0) {
    parts.push(
      `${first} has attempted ${d.tests.attempts} test${d.tests.attempts === 1 ? "" : "s"} so far, with an average score of ${d.tests.avgScorePct}% and accuracy of ${d.tests.avgAccuracyPct}%.`,
    );
  } else {
    parts.push(`${first} has not attempted any tests yet — encourage practice tests to build momentum.`);
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
  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`Bansal_Classes_Report_${safeName}_${dateSlug}.pdf`);
}
