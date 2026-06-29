// Arke unified .docx question importer
// =====================================
// Supports a SINGLE Word format that accepts every question type the
// platform uses, with LaTeX in stem + options, embedded images per slot,
// and Match-the-Following 2-column tables.
//
// Two equivalent input styles, auto-detected:
//
// 1) STYLED (preferred — uses Word paragraph styles):
//     Q-Topic   →  "Topic: Kinematics"
//     Q-Number  →  "1."
//     Q-Stem    →  question body (one or more paragraphs)
//     Q-Option  →  one paragraph per option, prefixed with "(1)" or "(A)"
//     Q-Answer  →  "Answer: (3)"  or  "Answer: (1),(2),(4)"  or  "Answer: 9"
//                  or  "Answer: A-Q, B-S, C-P, D-R"
//     Q-Solution→  explanation (one or more paragraphs)
//
// 2) PATTERN (works on plain Word docs that just follow the convention):
//     "Topic: ..." line,
//     "1." question header,
//     stem text,
//     "(1) ... (2) ... (3) ... (4) ..." options (each on its own line),
//     "Answer: ..." line,
//     italic / regular paragraph that follows = solution.
//
// A 2-column table that contains the header row Column A / Column B (case
// insensitive) inside the stem area marks the question as
// **match-following**. The left-column rows go to `matchLeft`, the right
// column rows become the question's `options`. The answer line
// `A-Q, B-S, C-P, D-R` becomes `correctMap`.
//
// Images embedded inline are attached to the slot they appear in:
//   - before any option         → stem
//   - inside (1)/(A) paragraph  → optionA, optionB, ...
//   - inside a Q-Solution line  → solution
//
// LaTeX is kept verbatim (`$…$`, `$$…$$`); MathRenderer renders it.
//
// The returned ParsedDocxQuestion list is what `uploadImages.ts` and the
// DocxBulkImportDialog consume.

import mammoth from "mammoth";
import JSZip from "jszip";

// ---------------------------------------------------------------------------
// OMML → LaTeX preprocessor
// ---------------------------------------------------------------------------
// Word's native equation editor stores formulas as OMML (<m:oMath>). mammoth
// drops these entirely. In the JEE master files the OMML <m:t> text nodes
// already hold raw LaTeX source (`\frac`, `\sqrt`, `\left(`, `_0`, …), so we
// concatenate every <m:t> inside each <m:oMath> / <m:oMathPara>, wrap with
// `$…$` (inline) or `$$…$$` (display), and rewrite the docx XML in place
// before handing it to mammoth. MathRenderer (KaTeX) renders it downstream.

const decodeXmlEntities = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&amp;/g, "&");

const ommlInnerToLatex = (innerXml: string): string => {
  const parts: string[] = [];
  const re = /<m:t\b[^>]*>([\s\S]*?)<\/m:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(innerXml)) !== null) {
    parts.push(decodeXmlEntities(m[1]));
  }
  return parts.join("").trim();
};

const escapeXmlText = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const rewriteOmmlInXml = (xml: string): string => {
  // Display equations first (oMathPara wraps oMath).
  xml = xml.replace(
    /<m:oMathPara\b[^>]*>([\s\S]*?)<\/m:oMathPara>/g,
    (_full, inner) => {
      const latex = ommlInnerToLatex(inner);
      if (!latex) return "";
      return `<w:r><w:t xml:space="preserve"> $$${escapeXmlText(latex)}$$ </w:t></w:r>`;
    },
  );
  // Remaining inline equations.
  xml = xml.replace(
    /<m:oMath\b[^>]*>([\s\S]*?)<\/m:oMath>/g,
    (_full, inner) => {
      const latex = ommlInnerToLatex(inner);
      if (!latex) return "";
      return `<w:r><w:t xml:space="preserve"> $${escapeXmlText(latex)}$ </w:t></w:r>`;
    },
  );
  return xml;
};

const preprocessDocxBuffer = async (buffer: ArrayBuffer): Promise<ArrayBuffer> => {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const docFile = zip.file("word/document.xml");
    if (!docFile) return buffer;
    const xml = await docFile.async("string");
    if (!/<m:oMath\b/.test(xml)) return buffer;
    const rewritten = rewriteOmmlInXml(xml);
    zip.file("word/document.xml", rewritten);
    return await zip.generateAsync({ type: "arraybuffer" });
  } catch {
    return buffer;
  }
};

export type DocxImageSlot =
  | "stem"
  | "optionA"
  | "optionB"
  | "optionC"
  | "optionD"
  | "matchA"
  | "matchB"
  | "matchC"
  | "matchD"
  | "matchP"
  | "matchQ"
  | "matchR"
  | "matchS"
  | "solution";

export type DocxImage = {
  id: string;
  contentType: string;
  bytes: Uint8Array;
  slot: DocxImageSlot;
  publicUrl?: string;
};

export type ParsedQuestionType =
  | "mcq-single"
  | "mcq-multi"
  | "integer"
  | "numerical"
  | "match-following";

export type ParsedMatchItem = { key: string; text: string };

export type ParsedDocxQuestion = {
  number: number;
  type: ParsedQuestionType;

  // Stem
  stemHtml: string;
  stemText: string;

  // MCQ / match Column B
  options: { id: number; text: string }[];

  // Match-the-Following Column A
  matchLeft?: ParsedMatchItem[];
  /** Mapping like {"A":"Q","B":"S",...} */
  correctMap?: Record<string, string>;

  // Solution / explanation
  solutionHtml?: string;
  solutionText?: string;

  // Metadata
  topic?: string;
  subject?: string;

  // Images for all slots
  images: DocxImage[];

  // Generic correct answer:
  //   mcq-single        → number (0-based index)
  //   mcq-multi         → number[] (0-based indices)
  //   integer/numerical → { value: number } | { min: number; max: number }
  //   match-following   → undefined (use correctMap)
  correctAnswer:
    | number
    | number[]
    | { value: number }
    | { min: number; max: number }
    | null;
  correctRaw: string | null;
};

export type ParseResult = {
  questions: ParsedDocxQuestion[];
  warnings: string[];
  totalImages: number;
  /** Detected option label style from option markers in the source docx. */
  detectedOptionStyle: "numeric" | "alpha" | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const stripTags = (html: string) => {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || "").replace(/\u00a0/g, " ").trim();
};

const dataUrlToBytes = (
  url: string,
): { bytes: Uint8Array; contentType: string } | null => {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(url);
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, contentType: m[1] };
};

const extractImages = (
  html: string,
  slot: DocxImageSlot,
  collected: DocxImage[],
  idPrefix: string,
): string => {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const imgs = Array.from(tmp.querySelectorAll("img"));
  imgs.forEach((img, i) => {
    const src = img.getAttribute("src") || "";
    const parsed = dataUrlToBytes(src);
    if (!parsed) {
      img.remove();
      return;
    }
    const id = `${idPrefix}-${slot}-${i}-${collected.length}`;
    collected.push({ id, slot, bytes: parsed.bytes, contentType: parsed.contentType });
    const marker = document.createElement("span");
    marker.setAttribute("data-img", id);
    img.replaceWith(marker);
  });
  return tmp.innerHTML;
};

// Strip a leading "(1)" / "(A)" / "1." / "A." marker, returning the inner HTML.
const STRIP_OPTION_PREFIX =
  /^\s*(?:<(?:strong|b|em|i|u|span)[^>]*>\s*)*\(?\s*([A-Da-d1-4])\s*\)?[.)]?\s*(?:<\/(?:strong|b|em|i|u|span)>\s*)*/;

const stripOptionPrefix = (html: string): { key: string; html: string } | null => {
  const txt = stripTags(html);
  const m = txt.match(/^\s*\(?\s*([A-Da-d1-4])\s*\)?[.)]?\s+/);
  if (!m) return null;
  const key = m[1].toUpperCase();
  // Try to chop the HTML by matching the prefix in the underlying text.
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_TEXT);
  let toRemove = m[0].length;
  while (toRemove > 0) {
    const node = walker.nextNode() as Text | null;
    if (!node) break;
    const len = node.data.length;
    if (len <= toRemove) {
      toRemove -= len;
      node.data = "";
    } else {
      node.data = node.data.slice(toRemove);
      toRemove = 0;
    }
  }
  return { key, html: tmp.innerHTML };
};

// Extract `Topic: ...` from text. Returns the topic, or null.
const extractTopic = (text: string): string | null => {
  const m = text.match(/^\s*topic\s*[:\-–]\s*(.+?)\s*$/i);
  return m ? m[1].trim() : null;
};

// Extract an explicit `Type: SCQ|MCQ|Integer|Numerical|Decimal|Match` tag.
// Returns the normalized ParsedQuestionType, or null when absent / unknown.
const extractTypeTag = (text: string): ParsedQuestionType | null => {
  const m = text.match(/^\s*(?:q-?)?type\s*[:\-–]\s*([a-zA-Z\- ]+?)\s*$/i);
  if (!m) return null;
  const raw = m[1].trim().toLowerCase().replace(/\s+/g, "-");
  if (raw === "scq" || raw === "single" || raw === "single-correct" || raw === "mcq-single")
    return "mcq-single";
  if (raw === "mcq" || raw === "mcq-multi" || raw === "multi" || raw === "multiple" || raw === "multiple-correct")
    return "mcq-multi";
  if (raw === "integer" || raw === "int") return "integer";
  if (raw === "numerical" || raw === "decimal" || raw === "numeric" || raw === "float")
    return "numerical";
  if (raw === "match" || raw === "match-following" || raw === "match-the-following" || raw === "matching")
    return "match-following";
  return null;
};

// Extract `Answer: ...` / `Ans. (A)` / `Ans 18` payload. Separator is optional
// (the JEE master papers use just a space after `Ans.`). Returns raw value or null.
const extractAnswerLine = (text: string): string | null => {
  const m = text.match(/^\s*(?:answer|ans|correct)\s*\.?\s*[:\-–]?\s*(.+?)\s*$/i);
  if (!m) return null;
  // Require the keyword to be followed by SOMETHING (not just a heading line).
  const val = m[1].trim();
  if (!val) return null;
  // Avoid matching things like "Answer the following:" with no actual answer body.
  if (/^the\b/i.test(val)) return null;
  return val;
};

// Determine question type + parsed answer from a raw answer string.
const parseAnswer = (raw: string): {
  type: ParsedQuestionType;
  correctAnswer: number | number[] | { value: number } | { min: number; max: number } | null;
  correctMap?: Record<string, string>;
} => {
  let trimmed = raw.trim();
  // Strip a single wrapping (...) or [...] around the entire value.
  const wrap = trimmed.match(/^[\(\[]\s*(.+?)\s*[\)\]]$/);
  if (wrap) trimmed = wrap[1].trim();

  // Match-the-column (JEE): "(A) q (B) p, r (C) p, s (D) q, s"
  //   → groups keyed by A/B/C/D, each value is the list of lowercase row keys.
  const mcGroups = Array.from(
    raw.matchAll(/\(\s*([A-Da-d])\s*\)\s*([^()]+?)(?=\s*\(\s*[A-Da-d]\s*\)|\s*$)/g),
  );
  if (mcGroups.length >= 2) {
    const map: Record<string, string> = {};
    for (const g of mcGroups) {
      const key = g[1].toUpperCase();
      const val = g[2]
        .toUpperCase()
        .split(/[,;\s]+/)
        .map((s) => s.replace(/[^A-Z0-9]/g, ""))
        .filter(Boolean)
        .join(",");
      if (val) map[key] = val;
    }
    if (Object.keys(map).length >= 2) {
      return { type: "match-following", correctAnswer: null, correctMap: map };
    }
  }

  // Match-the-following: A-Q,B-S,C-P,D-R  (also A→Q, A:Q allowed)
  const mfPairs = trimmed.match(/[A-Da-d]\s*[-→:>]\s*[P-Sp-s1-4]/g);
  if (mfPairs && mfPairs.length >= 2) {
    const map: Record<string, string> = {};
    for (const pair of mfPairs) {
      const m = pair.match(/([A-Da-d])\s*[-→:>]\s*([P-Sp-s1-4])/);
      if (m) map[m[1].toUpperCase()] = m[2].toUpperCase();
    }
    return { type: "match-following", correctAnswer: null, correctMap: map };
  }
  // Numeric range: "5 - 9", "5-9", "5 to 9", "5.5 – 6.5"
  const range = trimmed.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:\.\d+)?)\s*$/i,
  );
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    if (!Number.isNaN(min) && !Number.isNaN(max) && min <= max) {
      const isIntPair = Number.isInteger(min) && Number.isInteger(max);
      return {
        type: isIntPair ? "integer" : "numerical",
        correctAnswer: { min, max },
      };
    }
  }
  const cleaned = trimmed.replace(/[()\[\]\s]/g, "");
  // MCQ multi: "1,2,4"  or  "(1),(2),(4)"  or  "A,B,D"  or  "A,C"
  if (/[,;|]/.test(cleaned) || /^[A-D]{2,4}$/i.test(cleaned)) {
    const tokens = cleaned.split(/[,;|]/).filter(Boolean);
    const idxs: number[] = [];
    if (tokens.length >= 2) {
      for (const t of tokens) {
        if (/^[1-4]$/.test(t)) idxs.push(parseInt(t, 10) - 1);
        else if (/^[A-Da-d]$/.test(t)) idxs.push(t.toUpperCase().charCodeAt(0) - 65);
      }
    } else if (/^[A-D]{2,4}$/i.test(cleaned)) {
      for (const ch of cleaned) idxs.push(ch.toUpperCase().charCodeAt(0) - 65);
    }
    if (idxs.length >= 2) {
      return { type: "mcq-multi", correctAnswer: idxs.sort((a, b) => a - b) };
    }
  }
  // MCQ single
  const single = cleaned.match(/^([1-4]|[A-Da-d])$/);
  if (single) {
    const ch = single[1];
    const idx = /^[1-4]$/.test(ch) ? parseInt(ch, 10) - 1 : ch.toUpperCase().charCodeAt(0) - 65;
    return { type: "mcq-single", correctAnswer: idx };
  }
  // Integer / numerical single value (also handles "04.25", "25000")
  const num = cleaned.match(/^-?\d+(?:\.\d+)?$/);
  if (num) {
    const v = Number(num[0]);
    return { type: Number.isInteger(v) ? "integer" : "numerical", correctAnswer: { value: v } };
  }
  return { type: "mcq-single", correctAnswer: null };
};

// Map a section heading to a question type. Supports both classic
// "SECTION I (Single Correct Choice)" labels and JEE exam-paper bracket
// headings like "[SINGLE CORRECT CHOICE TYPE]", "[MULTIPLE CORRECT CHOICE TYPE]",
// "[MATCHING LIST TYPE]", "MATCH THE COLUMN", "PARAGRAPH TYPE",
// "Integer answer Type", "Numerical answer Type", "[True and False TYPE]".
const sectionType = (text: string): ParsedQuestionType | null => {
  const t = text.toLowerCase();
  const isSection =
    /section\b/.test(t) ||
    /^\s*\[.*type.*\]/.test(t) ||
    /\btype\s*\]/.test(t) ||
    /^\s*paragraph\s+type/.test(t) ||
    /^\s*match\s+the\s+column/.test(t) ||
    /^\s*\[?\s*matching\s+(list|type)/.test(t) ||
    /\b(integer|numerical)\s+answer\s+type/.test(t) ||
    /\btrue\s+(and|or|\/)\s+false/.test(t);
  if (!isSection) return null;
  if (/true\s+(and|or|\/)\s+false/.test(t)) return "mcq-single"; // synthesized later
  if (/match.*column/.test(t)) return "match-following";
  if (/match.*following/.test(t)) return "match-following";
  if (/matching\s+(list|type)/.test(t)) return "match-following";
  if (/multiple\s+correct/.test(t)) return "mcq-multi";
  if (/single\s+correct/.test(t)) return "mcq-single";
  if (/reasoning|assertion|statement/.test(t)) return "mcq-single";
  if (/paragraph|comprehension/.test(t)) return "mcq-single";
  if (/numerical/.test(t)) return "numerical";
  if (/integer/.test(t)) return "integer";
  return null;
};

// True/False section detector — kept separate so we can synthesize options.
const isTrueFalseSection = (text: string): boolean =>
  /true\s+(and|or|\/)\s+false/i.test(text);


type Block =
  | { kind: "p"; html: string; text: string; style: string }
  | { kind: "table"; el: HTMLTableElement };

const flattenBlocks = (root: Element): Block[] => {
  const out: Block[] = [];
  for (const child of Array.from(root.children)) {
    const tag = child.tagName.toLowerCase();
    if (tag === "table") {
      out.push({ kind: "table", el: child as HTMLTableElement });
      continue;
    }
    if (tag === "p" || tag.startsWith("h") || tag === "div" || tag === "ul" || tag === "ol") {
      const html = child.innerHTML.trim();
      const text = (child.textContent || "").replace(/\u00a0/g, " ").trim();
      if (html.length === 0 && !html.includes("<img")) continue;
      // mammoth styleMap below writes "p.q-stem" etc; pick first matching className
      const cls = (child.getAttribute("class") || "")
        .split(/\s+/)
        .find((c) => c.startsWith("q-")) || "";
      out.push({ kind: "p", html, text, style: cls });
    }
  }
  return out;
};

// Detect a Match-the-following table and convert it to {left, right} arrays.
const parseMatchTable = (
  table: HTMLTableElement,
  collected: DocxImage[],
  idPrefix: string,
): { left: ParsedMatchItem[]; right: ParsedMatchItem[] } | null => {
  const rows = Array.from(table.querySelectorAll("tr"));
  if (rows.length < 2) return null;
  const header = rows[0];
  const headerCells = Array.from(header.children).map((c) =>
    (c.textContent || "").trim().toLowerCase(),
  );
  if (
    headerCells.length < 2 ||
    !headerCells[0].includes("column a") ||
    !headerCells[1].includes("column b")
  ) {
    return null;
  }
  const left: ParsedMatchItem[] = [];
  const right: ParsedMatchItem[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = Array.from(rows[r].children);
    if (cells.length < 2) continue;
    const lHtmlRaw = (cells[0] as HTMLElement).innerHTML.trim();
    const rHtmlRaw = (cells[1] as HTMLElement).innerHTML.trim();
    if (!lHtmlRaw && !rHtmlRaw) continue;

    const lParsed = stripOptionPrefix(lHtmlRaw);
    const rParsed = stripOptionPrefix(rHtmlRaw);
    const lKey = lParsed?.key ?? String.fromCharCode(65 + left.length); // A,B,C…
    const rKey = rParsed?.key ?? String.fromCharCode(80 + right.length); // P,Q,R…
    const lHtml = extractImages(
      lParsed?.html ?? lHtmlRaw,
      ("match" + lKey) as DocxImageSlot,
      collected,
      idPrefix,
    );
    const rHtml = extractImages(
      rParsed?.html ?? rHtmlRaw,
      ("match" + rKey) as DocxImageSlot,
      collected,
      idPrefix,
    );
    left.push({ key: lKey, text: lHtml });
    right.push({ key: rKey, text: rHtml });
  }
  return left.length > 0 ? { left, right } : null;
};

// ---------------------------------------------------------------------------
// Question builder: walks blocks and emits one ParsedDocxQuestion at a time.
// ---------------------------------------------------------------------------

type Buffer = {
  number: number | null;
  stem: string[];
  options: { key: string; html: string }[];
  answer: string | null;
  solution: string[];
  topic: string | null;
  matchTable: HTMLTableElement | null;
  sectionType: ParsedQuestionType | null;
  /** Per-question Type: tag override, beats section + auto-detect. */
  forcedType: ParsedQuestionType | null;
  // raw blocks captured so we can extract images per slot later
  optionBlocks: { key: string; html: string }[];
  /** Shared paragraph/comprehension passage prepended to the stem. */
  passage: string | null;
  /** True when we should synthesize "True"/"False" options if none exist. */
  synthesizeTrueFalse: boolean;
};

const newBuffer = (
  carryTopic?: string | null,
  carrySection?: ParsedQuestionType | null,
  carryPassage?: string | null,
  carryTrueFalse?: boolean,
): Buffer => ({
  number: null,
  stem: [],
  options: [],
  answer: null,
  solution: [],
  topic: carryTopic ?? null,
  matchTable: null,
  sectionType: carrySection ?? null,
  forcedType: null,
  optionBlocks: [],
  passage: carryPassage ?? null,
  synthesizeTrueFalse: !!carryTrueFalse,
});


const KEY_TO_SLOT: Record<string, DocxImageSlot> = {
  A: "optionA",
  B: "optionB",
  C: "optionC",
  D: "optionD",
  "1": "optionA",
  "2": "optionB",
  "3": "optionC",
  "4": "optionD",
};

const flushBuffer = (
  buf: Buffer,
  out: ParsedDocxQuestion[],
  warnings: string[],
  ordinal: number,
) => {
  if (
    buf.number == null &&
    buf.stem.length === 0 &&
    buf.options.length === 0 &&
    buf.answer == null
  ) {
    return;
  }

  const number = buf.number ?? ordinal;
  const idPrefix = `q${number}`;
  const collected: DocxImage[] = [];

  // 1) Stem (prefix shared paragraph passage if present)
  const stemParts: string[] = [];
  if (buf.passage) {
    stemParts.push(
      `<div class="passage" style="background:hsl(var(--muted));padding:8px;border-radius:6px;margin-bottom:8px;"><b>Passage:</b><br/>${buf.passage}</div>`,
    );
  }
  stemParts.push(buf.stem.join("<br/>"));
  const rawStemHtml = stemParts.join("");
  const stemHtml = extractImages(rawStemHtml, "stem", collected, idPrefix);
  const stemText = stripTags(stemHtml).replace(/\s+/g, " ").trim();

  // 1b) Synthesize True/False options for true-false sections.
  if (buf.synthesizeTrueFalse && buf.options.length === 0) {
    buf.options = [
      { key: "A", html: "True" },
      { key: "B", html: "False" },
    ];
  }

  // 2) Match table (if any) → matchLeft + options
  let matchLeft: ParsedMatchItem[] | undefined;
  let matchOptions: { id: number; text: string }[] | undefined;
  let isMatch = false;
  if (buf.matchTable) {
    const parsed = parseMatchTable(buf.matchTable, collected, idPrefix);
    if (parsed) {
      matchLeft = parsed.left;
      matchOptions = parsed.right.map((r, i) => ({ id: i, text: r.text }));
      isMatch = true;
    }
  }

  // 3) MCQ options (only if not a match question)
  let options: { id: number; text: string }[] = matchOptions ?? [];
  if (!isMatch && buf.options.length > 0) {
    options = buf.options.slice(0, 4).map((o, i) => {
      const slot = KEY_TO_SLOT[o.key] ?? "stem";
      const html = extractImages(o.html, slot, collected, idPrefix);
      return { id: i, text: stripTags(html) ? html : html /* keep html for image-only opts */ };
    });
  }

  // 4) Solution
  const rawSolHtml = buf.solution.join("<br/>");
  const solutionHtml = extractImages(rawSolHtml, "solution", collected, idPrefix);
  const solutionText = stripTags(solutionHtml);

  // 5) Answer → type
  let type: ParsedQuestionType = "mcq-single";
  let correctAnswer: ParsedDocxQuestion["correctAnswer"] = null;
  let correctMap: Record<string, string> | undefined;
  if (buf.answer) {
    const parsed = parseAnswer(buf.answer);
    type = parsed.type;
    correctAnswer = parsed.correctAnswer;
    correctMap = parsed.correctMap;
  } else if (isMatch) {
    type = "match-following";
  }
  if (isMatch) type = "match-following";

  // Section header wins (e.g. "SECTION I (Single Correct Choice)")
  if (buf.sectionType && !isMatch) {
    // Don't downgrade a correctly parsed multi-answer into single just because
    // section says single; only adopt section type if it doesn't drop info.
    if (buf.sectionType === "mcq-multi" && type === "mcq-single" && typeof correctAnswer === "number") {
      type = "mcq-multi";
      correctAnswer = [correctAnswer];
    } else if (buf.sectionType === "mcq-single" || buf.sectionType === "integer" || buf.sectionType === "numerical" || buf.sectionType === "mcq-multi") {
      type = buf.sectionType;
    }
  }

  // Per-question Type: tag wins over everything else.
  if (buf.forcedType) {
    if (buf.forcedType === "mcq-multi" && type === "mcq-single" && typeof correctAnswer === "number") {
      correctAnswer = [correctAnswer];
    } else if (buf.forcedType === "mcq-single" && Array.isArray(correctAnswer) && correctAnswer.length === 1) {
      correctAnswer = correctAnswer[0];
    }
    type = buf.forcedType;
  }

  // Sanity: integer/numerical question dropped its bogus options
  if ((type === "integer" || type === "numerical") && options.length > 0) {
    options = [];
  }


  // For MCQ types we need real options
  if ((type === "mcq-single" || type === "mcq-multi") && options.length < 2) {
    warnings.push(`Q${number}: fewer than 2 options detected.`);
  }
  if (
    (type === "mcq-single" || type === "mcq-multi") &&
    correctAnswer == null &&
    !correctMap
  ) {
    warnings.push(`Q${number}: no answer detected.`);
  }
  if (type === "match-following" && (!correctMap || Object.keys(correctMap).length === 0)) {
    warnings.push(`Q${number}: match question missing answer mapping (e.g. "Answer: A-Q, B-S").`);
  }

  // Build the option text without the prefix marker for MCQ
  const cleanOptionText = options.map((o) => {
    // Strip wrapping <p> wrapper since DB stores inline text
    return o.text.replace(/^\s*<p[^>]*>/i, "").replace(/<\/p>\s*$/i, "").trim();
  });

  out.push({
    number,
    type,
    stemHtml,
    stemText,
    options: cleanOptionText.map((t, id) => ({ id, text: t })),
    matchLeft,
    correctMap,
    solutionHtml: solutionHtml || undefined,
    solutionText: solutionText || undefined,
    topic: buf.topic ?? undefined,
    images: collected,
    correctAnswer,
    correctRaw: buf.answer,
  });
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const parseDocxQuestions = async (file: File): Promise<ParseResult> => {
  const warnings: string[] = [];
  const rawBuffer = await file.arrayBuffer();
  const buffer = await preprocessDocxBuffer(rawBuffer);

  const result = await mammoth.convertToHtml(
    { arrayBuffer: buffer },
    {
      // Preserve our custom paragraph styles so the parser can rely on them.
      styleMap: [
        "p[style-name='Q-Number'] => p.q-number",
        "p[style-name='Q-Stem']   => p.q-stem",
        "p[style-name='Q-Option'] => p.q-option",
        "p[style-name='Q-Answer'] => p.q-answer",
        "p[style-name='Q-Solution'] => p.q-solution",
        "p[style-name='Q-Topic']  => p.q-topic",
      ],
      convertImage: mammoth.images.imgElement((image) =>
        image.read("base64").then((data) => ({
          src: `data:${image.contentType};base64,${data}`,
        })),
      ),
    },
  );

  if (result.messages?.length) {
    for (const msg of result.messages.slice(0, 10)) {
      if (msg.type === "error") warnings.push(`Mammoth: ${msg.message}`);
    }
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="root">${result.value}</div>`, "text/html");
  const root = doc.getElementById("root")!;

  const blocks = flattenBlocks(root);
  const out: ParsedDocxQuestion[] = [];
  let buf = newBuffer();
  let ordinal = 0;
  let seenFirstNumber = false;
  let pendingTopic: string | null = null;
  let pendingType: ParsedQuestionType | null = null;
  let currentSection: ParsedQuestionType | null = null;
  let currentTrueFalse = false;
  let currentIsMatchSection = false;
  let currentIsReasoning = false;
  let currentStandardOptions: { key: string; html: string }[] = [];
  let currentPassage: string | null = null;
  let collectingPassage = false; // true between a Paragraph section header and its first Q.N

  const isInstructionBullet = (text: string) => {
    const t = text.trim();
    if (/^[•·\u2022\u00b7]/.test(t)) return true;
    if (/^(full|zero|negative|partial)\s+marks?\b/i.test(t)) return true;
    if (/^this\s+section\s+contains\b/i.test(t)) return true;
    if (/^based\s+on\s+each\s+paragraph\b/i.test(t)) return true;
    if (/^the\s+answer\s+to\s+each\s+question\s+is\b/i.test(t)) return true;
    if (/^if\s+the\s+numerical\s+value\b/i.test(t)) return true;
    if (/^one\s+or\s+more\s+entries\b/i.test(t)) return true;
    if (/^match\s+the\s+entries\b/i.test(t)) return true;
    return false;
  };

  // Accept "1.", "1)", "Q.1", "Q. 35", "Q1."
  const NUM_RE = /^\s*(?:q\s*\.?\s*)?(\d{1,3})\s*[.)]?\s*(.*)$/i;
  const startsNewQuestionAtAny = (text: string) =>
    /^\s*(?:q\s*\.?\s*)?\d{1,3}\s*[.)]\s*/i.test(text) ||
    /^\s*q\s*\.?\s*\d{1,3}\b/i.test(text);

  const isSectionHeader = (text: string) => {
    const t = text.trim();
    if (/^section\b/i.test(t)) return true;
    if (/^\[.*\]\s*$/.test(t) && /type|paragraph|matching|reasoning|true.*false|integer|numerical|single|multiple/i.test(t)) return true;
    if (/^match\s+the\s+column/i.test(t)) return true;
    if (/^paragraph\s+type/i.test(t)) return true;
    if (/\b(integer|numerical)\s+answer\s+type/i.test(t)) return true;
    if (/^\(?\s*(single|multiple)\s+correct\s+choice\s+type\s*\)?$/i.test(t)) return true;
    return false;
  };

  const tryTopic = (text: string) => extractTopic(text);
  const tryType = (text: string) => extractTypeTag(text);
  const tryAnswer = (text: string) => extractAnswerLine(text);
  const trySolution = (text: string) => {
    // "Solution:", "Sol.", "Sol:", "Sol —", "Sol"
    const m = text.match(/^\s*sol(?:ution)?\s*[.:\-–]?\s*(.*)$/i);
    if (!m) return null;
    // Don't accidentally swallow a "Sole" or "Solid" etc — require word boundary
    if (!/^\s*sol(?:ution)?\b/i.test(text)) return null;
    return m[1];
  };

  const isOptionLine = (text: string) =>
    /^\s*\(\s*[A-D1-4]\s*\)\s+\S/.test(text);

  const looksLikeNumberOnly = (text: string) =>
    /^\s*(?:q\s*\.?\s*)?\d{1,3}\s*[.)]?\s*$/i.test(text.trim()) && /\d/.test(text);

  let numericOptionHits = 0;
  let alphaOptionHits = 0;
  const tallyOptionKeys = () => {
    for (const o of buf.options) {
      if (/^[1-4]$/.test(o.key)) numericOptionHits += 1;
      else if (/^[A-Da-d]$/.test(o.key)) alphaOptionHits += 1;
    }
  };

  const flushAndReset = () => {
    // Reasoning sections: clone the section-level standard options into any
    // question that didn't ship its own options.
    if (currentIsReasoning && buf.options.length === 0 && currentStandardOptions.length > 0) {
      buf.options = currentStandardOptions.map((o) => ({ ...o }));
    }
    ordinal += 1;
    tallyOptionKeys();
    flushBuffer(buf, out, warnings, ordinal);
    buf = newBuffer(null, currentSection, currentPassage, currentTrueFalse);
    if (pendingTopic) {
      buf.topic = pendingTopic;
      pendingTopic = null;
    }
    if (pendingType) {
      buf.forcedType = pendingType;
      pendingType = null;
    }
  };

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];

    if (b.kind === "table") {
      // Match-the-following table. Accept either:
      //   - explicit "Column A | Column B" header, OR
      //   - any 2-column table seen INSIDE a matching/match-column section.
      if (!seenFirstNumber && !collectingPassage) continue;
      const headerCells = Array.from(b.el.querySelectorAll("tr")[0]?.children ?? []).map(
        (c) => (c.textContent || "").trim().toLowerCase(),
      );
      const hasExplicitHeader =
        headerCells.length >= 2 &&
        headerCells[0].includes("column a") &&
        headerCells[1].includes("column b");
      if (hasExplicitHeader || currentIsMatchSection) {
        buf.matchTable = b.el;
      }
      continue;
    }

    const { html, text, style } = b;
    if (!text && !/<img\b/i.test(html)) continue;

    // SECTION heading → set current section type (header wins over auto-detect)
    if (isSectionHeader(text)) {
      const st = sectionType(text);
      currentTrueFalse = isTrueFalseSection(text);
      // Matching List is SCQ where each option lists a mapping — NOT a match table.
      const isMatchingList = /matching\s+list/i.test(text);
      currentIsMatchSection = !isMatchingList && /(match\s+the\s+column|matching\s+type|match\s+the\s+following)/i.test(text);
      currentIsReasoning = /reasoning|assertion/i.test(text);
      // Reset standard options when entering a new section.
      currentStandardOptions = [];
      // Reset passage collection mode whenever a new section starts.
      collectingPassage = /paragraph|comprehension/i.test(text) && !currentIsReasoning;
      currentPassage = collectingPassage ? "" : null;
      if (st) {
        currentSection = st;
        if (!buf.answer && buf.number == null) {
          buf.sectionType = st;
          buf.synthesizeTrueFalse = currentTrueFalse;
        }
      }
      continue;
    }

    // Drop instruction-bullet boilerplate ("• This section contains FOUR…").
    if (isInstructionBullet(text) && !/^\s*\(\s*[A-D1-4]\s*\)/.test(text)) {
      continue;
    }

    // Topic
    if (style === "q-topic" || tryTopic(text)) {
      const t = tryTopic(text) ?? text.replace(/^q-?topic\s*[:\-–]?\s*/i, "");
      const topic = t.trim();
      if (!topic) continue;
      if (buf.number == null) {
        buf.topic = topic;
      } else {
        pendingTopic = topic;
      }
      continue;
    }

    // Type tag (Type: SCQ | MCQ | Integer | Numerical | Decimal | Match)
    const typeTag = tryType(text);
    if (typeTag) {
      if (buf.number == null) {
        buf.forcedType = typeTag;
      } else {
        pendingType = typeTag;
      }
      continue;
    }

    // Question number marker
    const isNumberLine = style === "q-number" || looksLikeNumberOnly(text) ||
      (startsNewQuestionAtAny(text) && !isOptionLine(text));
    if (isNumberLine) {
      // Once we hit the first Q.N inside a paragraph section, freeze the passage.
      if (collectingPassage) collectingPassage = false;

      if (seenFirstNumber) flushAndReset();
      seenFirstNumber = true;
      buf.sectionType = currentSection;
      buf.passage = currentPassage || null;
      buf.synthesizeTrueFalse = currentTrueFalse;
      if (pendingTopic) {
        buf.topic = pendingTopic;
        pendingTopic = null;
      }
      if (pendingType) {
        buf.forcedType = pendingType;
        pendingType = null;
      }
      const m = text.match(NUM_RE);
      if (m) {
        buf.number = parseInt(m[1], 10);
        const rest = (m[2] || "").trim();
        if (rest) {
          // Strip prefix from html using the underlying text positions.
          const tmp = document.createElement("div");
          tmp.innerHTML = html;
          const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_TEXT);
          let toRemove = text.length - rest.length;
          while (toRemove > 0) {
            const node = walker.nextNode() as Text | null;
            if (!node) break;
            const len = node.data.length;
            if (len <= toRemove) {
              toRemove -= len;
              node.data = "";
            } else {
              node.data = node.data.slice(toRemove);
              toRemove = 0;
            }
          }
          buf.stem.push(tmp.innerHTML);
        }
      }
      continue;
    }

    // Before the first question number:
    //   - Reasoning sections list the 4 standard STATEMENT-1/STATEMENT-2
    //     options ONCE before any Q.N; capture them as section-level standard
    //     options to be cloned into every reasoning question.
    //   - if we're inside a Paragraph section, accumulate as shared passage
    //   - otherwise skip decorative cover text
    if (!seenFirstNumber) {
      if (currentIsReasoning && isOptionLine(text)) {
        const stripped = stripOptionPrefix(html);
        if (stripped) currentStandardOptions.push({ key: stripped.key, html: stripped.html });
        continue;
      }
      if (collectingPassage) {
        currentPassage = (currentPassage ? currentPassage + "<br/>" : "") + html;
      }
      continue;
    }

    // Answer line
    if (style === "q-answer" || tryAnswer(text)) {
      const ans = tryAnswer(text) ?? text.replace(/^q-?answer\s*[:\-–]?\s*/i, "");
      buf.answer = ans.trim();
      continue;
    }

    // Solution paragraph — accepts "Solution:" or "Sol." / "Sol:" prefix
    const solBody = trySolution(text);
    if (style === "q-solution" || solBody != null) {
      if (solBody != null) {
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_TEXT);
        let toRemove = text.length - solBody.length;
        while (toRemove > 0) {
          const node = walker.nextNode() as Text | null;
          if (!node) break;
          const len = node.data.length;
          if (len <= toRemove) {
            toRemove -= len;
            node.data = "";
          } else {
            node.data = node.data.slice(toRemove);
            toRemove = 0;
          }
        }
        buf.solution.push(tmp.innerHTML.trim());
      } else {
        buf.solution.push(html);
      }
      continue;
    }

    // If we already have an answer, capture additional paragraphs as solution
    // continuation (the JEE format has Sol. followed by many equations/images
    // without re-stating "Sol." on each line).
    if (buf.answer) {
      if (buf.solution.length > 0 || /<img\b/i.test(html)) {
        buf.solution.push(html);
      }
      continue;
    }

    // Option line
    if (style === "q-option" || isOptionLine(text)) {
      const stripped = stripOptionPrefix(html);
      if (stripped) {
        buf.options.push({ key: stripped.key, html: stripped.html });
      } else {
        buf.options.push({ key: String.fromCharCode(65 + buf.options.length), html });
      }
      continue;
    }

    // Default: stem content (only before answer / between number and options)
    buf.stem.push(html);
  }

  // Flush final question
  if (seenFirstNumber) {
    ordinal += 1;
    tallyOptionKeys();
    flushBuffer(buf, out, warnings, ordinal);
  }

  const totalImages = out.reduce((s, q) => s + q.images.length, 0);
  let detectedOptionStyle: "numeric" | "alpha" | null = null;
  if (numericOptionHits + alphaOptionHits >= 2) {
    detectedOptionStyle = numericOptionHits > alphaOptionHits ? "numeric" : "alpha";
  }
  return { questions: out, warnings, totalImages, detectedOptionStyle };
};
