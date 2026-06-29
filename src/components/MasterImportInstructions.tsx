import { X, Download, FileText, ImageIcon, Calculator, ListChecks, BookOpen, AlertTriangle } from "lucide-react";

type Props = { open: boolean; onClose: () => void };

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-foreground">{children}</code>
);

const Row = ({ tag, syntax, example }: { tag: string; syntax: string; example: string }) => (
  <tr className="border-b border-border last:border-0">
    <td className="px-3 py-2 align-top">
      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">{tag}</span>
    </td>
    <td className="px-3 py-2 text-xs text-foreground"><Code>{syntax}</Code></td>
    <td className="px-3 py-2 text-xs text-muted-foreground"><Code>{example}</Code></td>
  </tr>
);

const MasterImportInstructions = ({ open, onClose }: Props) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl bg-card border border-border shadow-2xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2"><BookOpen className="h-4 w-4 text-primary" /></div>
            <div>
              <h2 className="text-base font-bold text-foreground">Master import — Word format guide</h2>
              <p className="text-xs text-muted-foreground">One canonical .docx template for every question type.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/templates/master-question-template.docx"
              download
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" /> Download template
            </a>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-6 text-sm text-foreground">
          {/* Why */}
          <section className="space-y-1.5">
            <h3 className="font-bold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> What this is</h3>
            <p className="text-xs text-muted-foreground">
              A single Word format that covers <b>SCQ</b>, <b>MCQ</b>, <b>Integer</b> (value or range), <b>Numerical/Decimal</b> (value or range),
              and <b>Match the Following</b> — with images and LaTeX in stems, options, and solutions. Download the template, replace the
              example questions with your own, and re-upload. Don't change the layout.
            </p>
          </section>

          {/* Block layout */}
          <section className="space-y-2">
            <h3 className="font-bold">Block layout (one per question)</h3>
            <pre className="rounded-lg border border-border bg-muted/40 p-3 text-[11px] leading-5 text-foreground overflow-x-auto">
{`Topic: Kinematics            (optional — carries to next questions)
Type:  SCQ                   (SCQ | MCQ | Integer | Numerical | Match)

1. Question stem text. Equations: $x^2$ inline or $$\\frac{a}{b}$$ display.
   [Insert image — paste directly into Word]

(A) Option A text or image
(B) Option B text or image
(C) Option C text or image
(D) Option D text or image

Answer: B
Solution: Optional explanation (supports LaTeX and images).`}
            </pre>
            <p className="text-[11px] text-muted-foreground">Separate each question with a blank line. Re-number from <Code>1.</Code> if you like — the importer uses your numbers verbatim.</p>
          </section>

          {/* Answer table */}
          <section className="space-y-2">
            <h3 className="font-bold flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> Answer-line by question type</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-[11px] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Syntax</th>
                    <th className="px-3 py-2 text-left">Example</th>
                  </tr>
                </thead>
                <tbody>
                  <Row tag="SCQ" syntax="Answer: <letter>" example="Answer: B" />
                  <Row tag="MCQ" syntax="Answer: <letter, letter, …>" example="Answer: A, C" />
                  <Row tag="Integer" syntax="Answer: <int> or <int>-<int>" example="Answer: 5-9" />
                  <Row tag="Numerical" syntax="Answer: <decimal> or <dec>-<dec>" example="Answer: 3.10-3.18" />
                  <Row tag="Match" syntax="Answer: A-Q, B-S, C-P, D-R" example="Answer: A-P, B-Q, C-R, D-S" />
                </tbody>
              </table>
            </div>
          </section>

          {/* Match table */}
          <section className="space-y-1.5">
            <h3 className="font-bold flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" /> Match-the-Following</h3>
            <p className="text-xs text-muted-foreground">
              Add a 2-column Word table inside the question. The first row must be the header <Code>Column A</Code> | <Code>Column B</Code>.
              Each row in Column A starts with <Code>A.</Code>, <Code>B.</Code>, … and Column B starts with <Code>P.</Code>, <Code>Q.</Code>, …
              Cells can hold text, equations, and images.
            </p>
          </section>

          {/* Images & LaTeX */}
          <section className="space-y-1.5">
            <h3 className="font-bold flex items-center gap-2"><ImageIcon className="h-4 w-4 text-primary" /> Images & equations</h3>
            <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
              <li>Paste images directly into the paragraph for the slot they belong to (stem / option / Column A or B row / solution).</li>
              <li>PNG or JPG, ≤ 5 MB each. Multiple images per slot are allowed.</li>
              <li>LaTeX: <Code>$x^2$</Code> inline, <Code>{`$$\\frac{a}{b}$$`}</Code> display. Word's native equation editor is also preserved.</li>
            </ul>
          </section>

          {/* Exam-paper format (auto-detected) */}
          <section className="space-y-2">
            <h3 className="font-bold flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> JEE exam-paper format (also auto-detected)</h3>
            <p className="text-xs text-muted-foreground">
              Master import also reads real JEE Advanced / JEE Main papers as-is. Use section bracket
              headers and standard JEE markers — no template required.
            </p>
            <pre className="rounded-lg border border-border bg-muted/40 p-3 text-[11px] leading-5 text-foreground overflow-x-auto">
{`[SINGLE CORRECT CHOICE TYPE]      ← section header (also: MULTIPLE CORRECT, INTEGER, NUMERICAL, MATCH THE COLUMN, MATCHING LIST, PARAGRAPH, TRUE AND FALSE)

Q.1 Question stem with LaTeX $x^2$, $$\\int_0^1 x\\,dx$$ and inline images.
(A) Option A
(B) Option B
(C) Option C
(D) Option D
Ans. (C)
Sol. Explanation paragraphs, equations and images continue here
     until the next Q. or section.`}
            </pre>
            <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
              <li>Answer formats supported: <Code>Ans. (A)</Code>, <Code>Ans. (A, C)</Code>, <Code>Ans. 18</Code>, <Code>Ans. [25000]</Code>, <Code>Ans. (04.25)</Code>, <Code>Ans. (A) q (B) p, r (C) p, s (D) q, s</Code>.</li>
              <li><b>True and False</b> sections auto-generate the True / False options — answer <Code>(A)</Code> = True, <Code>(B)</Code> = False.</li>
              <li><b>Paragraph</b> sections: the passage text between the section header and the first <Code>Q.N</Code> is automatically prepended to every question in that block.</li>
              <li><b>Match the Column / Matching List</b>: the importer reads any 2-column table that appears inside the section.</li>
              <li><b>Sol.</b>, <b>Sol:</b> or <b>Solution:</b> all work; everything until the next <Code>Q.N</Code> or section header is captured as the solution.</li>
            </ul>
          </section>

          {/* Pitfalls */}
          <section className="space-y-1.5">
            <h3 className="font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Common pitfalls</h3>
            <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
              <li>Missing <Code>Answer:</Code> / <Code>Ans.</Code> line → the question is dropped.</li>
              <li>Using <Code>A.</Code> instead of <Code>(A)</Code> for MCQ options.</li>
              <li>Questions not separated by a blank line — options of question 2 may leak into question 1's stem.</li>
              <li>Match table without the header row <Code>Column A | Column B</Code> AND outside a matching section.</li>
              <li>Numbering restarts mid-document — that's fine; the importer reads them as-is.</li>
            </ul>
          </section>
        </div>

        <div className="flex items-center justify-between gap-2 p-3 border-t border-border bg-muted/30">
          <a
            href="/templates/master-question-template.docx"
            download
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" /> Download template (.docx)
          </a>
          <button onClick={onClose} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default MasterImportInstructions;
