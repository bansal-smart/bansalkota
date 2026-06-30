import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ScorecardInput = {
  student: {
    full_name?: string | null;
    roll_number?: string | null;
    batch?: string | null;
    centre?: string | null;
    phone?: string | null;
  };
  test: {
    title: string;
    exam_pattern?: string | null;
    total_marks?: number | null;
    submitted_at?: string | null;
  };
  attempt: {
    score: number;
    total_questions: number;
    correct: number;
    attempted: number;
    wrong: number;
    unattempted: number;
    time_spent_seconds: number;
    percentile?: number | null;
    rank?: number | null;
    total_attempts?: number | null;
  };
  subjects: Array<{
    subject: string;
    total: number;
    attempted: number;
    correct: number;
    score: number;
    maxScore: number;
  }>;
  questions: Array<{
    position: number;
    subject: string;
    status: "Correct" | "Wrong" | "Unattempted" | "Bonus";
    marks: number;
    max_marks: number;
  }>;
};

const NAVY: [number, number, number] = [28, 63, 142];
const ORANGE: [number, number, number] = [249, 115, 22];

export const generateScorecardPdf = (data: ScorecardInput): jsPDF => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;

  // Header
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Bansal Classes", margin, 32);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Test Scorecard", margin, 50);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 50, { align: "right" });

  let y = 90;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(data.test.title, margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const meta = [
    data.test.exam_pattern ? `Pattern: ${data.test.exam_pattern}` : null,
    data.test.submitted_at ? `Submitted: ${new Date(data.test.submitted_at).toLocaleString()}` : null,
    data.test.total_marks != null ? `Max marks: ${data.test.total_marks}` : null,
  ].filter(Boolean).join("   ·   ");
  doc.setTextColor(80, 80, 80);
  doc.text(meta, margin, y);
  y += 18;

  // Student box
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: NAVY, textColor: 255 },
    head: [["Student", "Roll No.", "Batch", "Centre"]],
    body: [[
      data.student.full_name ?? "—",
      data.student.roll_number ?? "—",
      data.student.batch ?? "—",
      data.student.centre ?? "—",
    ]],
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 14;

  // Summary
  const a = data.attempt;
  const mins = Math.floor(a.time_spent_seconds / 60);
  const secs = a.time_spent_seconds % 60;
  const pct = data.test.total_marks ? ((a.score / data.test.total_marks) * 100).toFixed(2) + "%" : "—";
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5, halign: "center" },
    headStyles: { fillColor: ORANGE, textColor: 255 },
    head: [["Score", "Max", "Percentage", "Rank", "Percentile", "Correct", "Wrong", "Unattempted", "Time"]],
    body: [[
      a.score.toFixed(2),
      String(data.test.total_marks ?? "—"),
      pct,
      a.rank != null ? `${a.rank}${a.total_attempts ? ` / ${a.total_attempts}` : ""}` : "—",
      a.percentile != null ? `${Number(a.percentile).toFixed(2)}%` : "—",
      String(a.correct),
      String(a.wrong),
      String(a.unattempted),
      `${mins}m ${secs}s`,
    ]],
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 14;

  // Subject-wise
  if (data.subjects.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text("Subject-wise Breakdown", margin, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: NAVY, textColor: 255 },
      head: [["Subject", "Questions", "Attempted", "Correct", "Score", "Max"]],
      body: data.subjects.map((s) => [
        s.subject,
        String(s.total),
        String(s.attempted),
        String(s.correct),
        s.score.toFixed(2),
        s.maxScore.toFixed(2),
      ]),
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 14;
  }

  // Per-question
  if (data.questions.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text("Question-wise Status", margin, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: NAVY, textColor: 255 },
      head: [["Q#", "Subject", "Status", "Marks", "Max"]],
      body: data.questions.map((q) => [
        String(q.position),
        q.subject,
        q.status,
        q.marks.toFixed(2),
        q.max_marks.toFixed(2),
      ]),
      margin: { left: margin, right: margin },
      didParseCell: (h) => {
        if (h.section === "body" && h.column.index === 2) {
          const s = String(h.cell.raw);
          if (s === "Correct") h.cell.styles.textColor = [16, 122, 87];
          else if (s === "Wrong") h.cell.styles.textColor = [200, 38, 38];
          else if (s === "Bonus") h.cell.styles.textColor = [180, 100, 20];
          else h.cell.styles.textColor = [120, 120, 120];
        }
      },
    });
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text("bansalkota.com", margin, h - 18);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, h - 18, { align: "right" });
  }

  return doc;
};
