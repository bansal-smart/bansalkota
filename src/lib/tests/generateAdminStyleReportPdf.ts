// Student-facing scorecard PDF, built to visually match the admin's
// per-student report PDF (AdminTestResultPage.tsx `downloadStudentPDF`):
// same branded header/watermark/footer, same meta table, same subject
// score table layout, and the same question-wise review table styling.
//
// Two admin-only sections are intentionally NOT reproduced here — the
// per-subject "You vs Class Avg vs Topper" bar chart and the score
// distribution histogram both require raw scores from every other
// student's attempt, which students don't (and shouldn't) have RLS
// access to. Only the aggregate total-level average/topper already
// exposed to students via `get_test_rank` is used, as a single-group
// bar chart in the same visual style as the admin chart.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import bansalLogo from "@/assets/bansal-logo.webp";

export type AdminStyleReportInput = {
  student: {
    full_name?: string | null;
    roll_number?: string | null;
    batch?: string | null;
  };
  test: {
    title: string;
    exam_pattern?: string | null;
    total_marks?: number | null;
    date_label: string;
  };
  subjects: string[];
  subject_scores: Record<string, number>;
  total_score: number;
  percentage: number;
  rank_label: string;
  comparison?: { class_avg: number; topper: number } | null;
  questions?: Array<{
    position: number;
    subject: string;
    your_answer: string;
    correct_answer: string;
    result: "Correct" | "Wrong" | "Partial" | "Unattempted" | "Bonus";
    marks_str: string;
  }>;
};

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

export const generateAdminStyleReportPdf = async (input: AdminStyleReportInput): Promise<jsPDF> => {
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
    doc.text(`${input.test.title} — Student Report`, pageW / 2, 50, { align: "center" });
  };
  const drawFooter = () => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    const current = (doc as any).internal.getCurrentPageInfo().pageNumber;
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text(
      `Generated ${new Date().toLocaleString()} · Page ${current}/${pageCount}`,
      pageW / 2, pageH - 14, { align: "center" },
    );
  };

  drawHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10); doc.setTextColor(40);
  const meta = [
    ["Student", input.student.full_name ?? "—"],
    ["Roll No", input.student.roll_number ?? "—"],
    ["Batch", input.student.batch ?? "—"],
    ["Date", input.test.date_label],
    ["Pattern", (input.test.exam_pattern ?? "").replace(/-/g, " ").toUpperCase() || "—"],
    ["Max Marks", String(input.test.total_marks ?? "—")],
  ];
  autoTable(doc, {
    startY: 68,
    body: meta,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 110 } },
    didDrawPage: () => { drawHeader(); drawFooter(); },
  });

  const subjBody = input.subjects.map((s) => [s, Number(input.subject_scores[s] ?? 0)]);
  subjBody.push(["TOTAL", input.total_score]);
  subjBody.push(["PERCENTAGE", `${input.percentage.toFixed(2)}%`]);
  subjBody.push(["RANK", input.rank_label]);
  autoTable(doc, {
    startY: ((doc as any).lastAutoTable?.finalY ?? 200) + 10,
    head: [["Subject / Metric", "Marks"]],
    body: subjBody,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    didDrawPage: () => { drawHeader(); drawFooter(); },
  });

  if (input.comparison) {
    let y = ((doc as any).lastAutoTable?.finalY ?? 300) + 26;
    if (y + 170 > pageH - 40) { doc.addPage(); drawHeader(); drawFooter(); y = 90; }
    drawBarChart(doc, 40, y, pageW - 80, 150, ["Total"], [
      { name: "You", values: [input.total_score], color: [249, 115, 22] },
      { name: "Class Avg", values: [+input.comparison.class_avg.toFixed(2)], color: [30, 41, 59] },
      { name: "Topper", values: [input.comparison.topper], color: [16, 185, 129] },
    ], "You vs Class (anonymous)");
  }

  if (input.questions?.length) {
    doc.addPage();
    drawHeader();
    drawFooter();
    const rows = input.questions.map((q) => [
      String(q.position),
      q.subject,
      q.your_answer,
      q.correct_answer,
      q.result,
      q.marks_str,
    ]);
    autoTable(doc, {
      startY: 70,
      head: [["Q#", "Subject", "Your Answer", "Correct Answer", "Result", "Marks"]],
      body: rows,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 26, halign: "center" },
        1: { cellWidth: 56 },
        2: { cellWidth: 150 },
        3: { cellWidth: 150 },
        4: { cellWidth: 60, halign: "center", fontStyle: "bold" },
        5: { cellWidth: 40, halign: "center", fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          const v = String(data.cell.raw);
          if (v === "Correct") data.cell.styles.textColor = [16, 185, 129];
          else if (v === "Wrong") data.cell.styles.textColor = [220, 38, 38];
          else if (v === "Partial" || v === "Bonus") data.cell.styles.textColor = [217, 119, 6];
          else data.cell.styles.textColor = [120, 120, 120];
        }
        if (data.section === "body" && data.column.index === 5) {
          const raw = String(data.cell.raw);
          const n = Number(raw);
          if (n > 0) data.cell.styles.textColor = [16, 185, 129];
          else if (n < 0) data.cell.styles.textColor = [220, 38, 38];
          else data.cell.styles.textColor = [120, 120, 120];
        }
      },
      didDrawPage: () => { drawHeader(); drawFooter(); },
    });
  }

  return doc;
};
