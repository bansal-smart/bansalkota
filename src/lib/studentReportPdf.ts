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

  // Section: Attendance + Engagement (side by side)
  y = sectionHeader(doc, "Live class attendance & engagement", margin, y, W);
  const halfW = (W - margin * 2 - 12) / 2;
  // Attendance card
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, halfW, 100, 6, 6, "FD");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Live classes", margin + 12, y + 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(28);
  doc.setTextColor(...ORANGE);
  doc.text(`${data.attendance.percent}%`, margin + 12, y + 60);
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(
    `${data.attendance.attended} attended of ${data.attendance.registered} registered`,
    margin + 12,
    y + 82,
  );

  // Engagement card
  const ex = margin + halfW + 12;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(ex, y, halfW, 100, 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.setFontSize(11);
  doc.text("Engagement", ex + 12, y + 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  const eLines = [
    `Doubts asked: ${data.engagement.doubtsAsked}`,
    `Doubts resolved: ${data.engagement.doubtsAnswered}`,
    `Active study days: ${data.engagement.activeDays}`,
    `Total study time: ${Math.round(data.engagement.minutesStudied / 60)} hrs ${data.engagement.minutesStudied % 60} min`,
  ];
  eLines.forEach((line, i) => doc.text(line, ex + 12, y + 42 + i * 14));
  y += 116;

  // Section: Course progress
  y = sectionHeader(doc, "Course progress", margin, y, W);
  if (data.courses.length === 0) {
    drawEmpty(doc, "Not enrolled in any active course.", margin, y, W);
    y += 30;
  } else {
    autoTable(doc, {
      startY: y,
      head: [["Course", "Progress"]],
      body: data.courses.map((c) => [c.name, `${c.progress}%`]),
      margin: { left: margin, right: margin },
      headStyles: { fillColor: NAVY, textColor: 255 },
      styles: { fontSize: 10, cellPadding: 6 },
      didDrawCell: (d) => {
        if (d.section === "body" && d.column.index === 1) {
          const pct = data.courses[d.row.index]?.progress ?? 0;
          const x = d.cell.x + 6;
          const yy = d.cell.y + d.cell.height / 2 - 4;
          const barW = d.cell.width - 50;
          doc.setFillColor(...LIGHT);
          doc.rect(x, yy, barW, 8, "F");
          doc.setFillColor(...ORANGE);
          doc.rect(x, yy, (barW * pct) / 100, 8, "F");
          doc.setTextColor(...NAVY);
          doc.setFontSize(9);
          doc.text(`${pct}%`, x + barW + 6, yy + 7);
        }
      },
      columnStyles: { 1: { cellWidth: 240 } },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
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
  if (d.attendance.registered > 0) {
    parts.push(
      `Live class attendance was ${d.attendance.percent}% (${d.attendance.attended} of ${d.attendance.registered}).`,
    );
  }
  if (d.engagement.activeDays > 0) {
    parts.push(`Studied on ${d.engagement.activeDays} day${d.engagement.activeDays === 1 ? "" : "s"} this month.`);
  }
  if (d.engagement.doubtsAsked > 0) {
    parts.push(
      `Raised ${d.engagement.doubtsAsked} doubt${d.engagement.doubtsAsked === 1 ? "" : "s"}, of which ${d.engagement.doubtsAnswered} have been resolved.`,
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
