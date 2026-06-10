// Word (.docx) bulk question import parser
// Pragmatic parser for the format used by Bansal-style JEE/NEET question docs:
//   - Questions are paragraphs with inline options "(A) ... (B) ... (C) ... (D) ..."
//   - Answer-key tables appear separately listing { questionNumber → A|B|C|D or numeric }
//   - Images are embedded inline; first images before (A) belong to the stem,
//     images between option markers belong to that option.
import mammoth from "mammoth";

export type DocxImage = {
  /** Stable id within this parse */
  id: string;
  /** mime type, e.g. image/png */
  contentType: string;
  /** Raw bytes */
  bytes: Uint8Array;
  /** Slot it belongs to */
  slot: "stem" | "optionA" | "optionB" | "optionC" | "optionD" | "solution";
  /** Optional uploaded public URL after upload step */
  publicUrl?: string;
};

export type ParsedDocxQuestion = {
  number: number;                     // 1-based sequence in doc
  type: "mcq-single" | "numerical" | "integer";
  stemHtml: string;                   // HTML (img tags replaced with markers)
  stemText: string;                   // plain text (for preview)
  options: { id: number; text: string }[]; // empty for numerical
  images: DocxImage[];                // all images for this question
  correctAnswer: number | number[] | { value: number } | null;
  correctRaw: string | null;          // the cell value from the key
  subject?: string;                   // optional derived from filename
};

export type ParseResult = {
  questions: ParsedDocxQuestion[];
  warnings: string[];
  totalImages: number;
};

// ---------- HTML utility helpers ----------
const stripTags = (html: string) => {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || "").replace(/\u00a0/g, " ").trim();
};

const decodeEntities = (s: string) => {
  const tmp = document.createElement("textarea");
  tmp.innerHTML = s;
  return tmp.value;
};

// data:image/png;base64,XXXX -> {bytes, contentType}
const dataUrlToBytes = (url: string): { bytes: Uint8Array; contentType: string } | null => {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(url);
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, contentType: m[1] };
};

// ---------- Answer-key table detection ----------
type AnswerMap = Map<number, string>;

const collectAnswerKey = (doc: Document): AnswerMap => {
  const map: AnswerMap = new Map();
  const tables = Array.from(doc.querySelectorAll("table"));
  for (const t of tables) {
    const rows = Array.from(t.querySelectorAll("tr"));
    for (const r of rows) {
      const cells = Array.from(r.children)
        .map((c) => (c.textContent || "").trim())
        .filter((c) => c.length > 0);
      if (cells.length < 2) continue;
      // Look for pattern: [numStr, ..., answerStr]
      // The answer is the last cell, the number is the first cell.
      const first = cells[0];
      const last = cells[cells.length - 1];
      if (/^\d{1,3}$/.test(first)) {
        const n = parseInt(first, 10);
        // answer can be A/B/C/D (single letter), or numeric like 7, 2.5
        if (/^[A-D]$/i.test(last) || /^-?\d+(\.\d+)?$/.test(last)) {
          map.set(n, last.toUpperCase());
        }
      }
    }
    // Remove answer-key tables from the DOM so they don't pollute question parsing
    if (map.size > 0) t.remove();
  }
  return map;
};

// ---------- Question splitter ----------
// Inside a single block of HTML, split into stem + options A..D.
// Option markers: "(A)", "(B)", "(C)", "(D)" — sometimes with surrounding whitespace.
const OPT_REGEX = /\((A|B|C|D)\)/g;

type Split = {
  stemHtml: string;
  optionHtml: Record<"A" | "B" | "C" | "D", string>;
  hasOptions: boolean;
};

const splitBlock = (html: string): Split => {
  const matches: { letter: "A" | "B" | "C" | "D"; index: number; len: number }[] = [];
  OPT_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = OPT_REGEX.exec(html))) {
    matches.push({ letter: m[1] as any, index: m.index, len: m[0].length });
  }
  if (matches.length < 2) {
    return { stemHtml: html, optionHtml: { A: "", B: "", C: "", D: "" }, hasOptions: false };
  }
  const stemHtml = html.slice(0, matches[0].index);
  const optionHtml: Record<"A" | "B" | "C" | "D", string> = { A: "", B: "", C: "", D: "" };
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i].len;
    const end = i + 1 < matches.length ? matches[i + 1].index : html.length;
    optionHtml[matches[i].letter] = html.slice(start, end);
  }
  return { stemHtml, optionHtml, hasOptions: true };
};

// ---------- Question detection over the body ----------
// Strategy: gather paragraph-level HTML blocks and accumulate them until we see
// option markers (A)...(D), then emit a question. Paragraphs with no markers
// are treated as numerical-type questions IF the next answer-key entry is numeric.
const flattenBlocks = (root: Element): string[] => {
  // Get top-level paragraphs and headings; ignore tables (already stripped).
  const out: string[] = [];
  for (const child of Array.from(root.children)) {
    const tag = child.tagName.toLowerCase();
    if (tag === "table") continue;
    if (tag === "p" || tag.startsWith("h") || tag === "div" || tag === "ul" || tag === "ol") {
      const html = child.innerHTML.trim();
      if (html.length > 0) out.push(html);
    }
  }
  return out;
};

const extractImages = (
  html: string,
  slot: DocxImage["slot"],
  collected: DocxImage[],
  idPrefix: string,
): string => {
  // Replace each <img src="data:..."> with a stable marker; collect bytes.
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
    const id = `${idPrefix}-${slot}-${i}`;
    collected.push({ id, slot, bytes: parsed.bytes, contentType: parsed.contentType });
    const marker = document.createElement("span");
    marker.setAttribute("data-img", id);
    img.replaceWith(marker);
  });
  return tmp.innerHTML;
};

// ---------- Main entry ----------
export const parseDocxQuestions = async (file: File): Promise<ParseResult> => {
  const warnings: string[] = [];
  const buffer = await file.arrayBuffer();

  // Convert with mammoth → HTML, images embedded as data URIs
  const result = await mammoth.convertToHtml(
    { arrayBuffer: buffer },
    {
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

  // 1. Extract answer key (also removes those tables)
  const answers = collectAnswerKey(doc);

  // 2. Walk paragraphs in order, group into question blocks
  const blocks = flattenBlocks(root);
  const questions: ParsedDocxQuestion[] = [];
  let accumulator: string[] = [];

  const emitFromAccumulator = (n: number) => {
    if (accumulator.length === 0) return;
    const html = accumulator.join("<br/>");
    accumulator = [];

    const split = splitBlock(html);
    const collected: DocxImage[] = [];
    const idPrefix = `q${n}`;

    const stemHtml = extractImages(split.stemHtml, "stem", collected, idPrefix);
    const stemText = stripTags(stemHtml).replace(/\s+/g, " ").trim();

    let options: { id: number; text: string }[] = [];
    if (split.hasOptions) {
      const slotMap: Record<"A" | "B" | "C" | "D", DocxImage["slot"]> = {
        A: "optionA",
        B: "optionB",
        C: "optionC",
        D: "optionD",
      };
      (["A", "B", "C", "D"] as const).forEach((letter, idx) => {
        const cleaned = extractImages(split.optionHtml[letter], slotMap[letter], collected, idPrefix);
        const text = stripTags(cleaned);
        if (text.length > 0 || cleaned.includes("data-img")) {
          options.push({ id: idx, text });
        }
      });
    }

    // Determine type + correct answer from answer-key
    const keyRaw = answers.get(n) ?? null;
    let type: ParsedDocxQuestion["type"] = "mcq-single";
    let correct: ParsedDocxQuestion["correctAnswer"] = null;

    if (keyRaw && /^[A-D]$/.test(keyRaw)) {
      type = "mcq-single";
      correct = "ABCD".indexOf(keyRaw); // 0..3
    } else if (keyRaw && /^-?\d+(\.\d+)?$/.test(keyRaw)) {
      const num = Number(keyRaw);
      type = Number.isInteger(num) ? "integer" : "numerical";
      correct = { value: num };
      if (options.length === 0) {
        // no options — pure numerical
      } else {
        // had options but answer is numeric → trust numeric, drop options
        options = [];
      }
    } else {
      warnings.push(`Q${n}: no answer key found, defaulting to MCQ with no correct answer`);
    }

    questions.push({
      number: n,
      type,
      stemHtml,
      stemText,
      options,
      images: collected,
      correctAnswer: correct,
      correctRaw: keyRaw,
    });
  };

  let questionNo = 0;
  for (const block of blocks) {
    // Skip pure whitespace / page headers
    const text = stripTags(block);
    if (text.length === 0 && !block.includes("<img")) continue;

    accumulator.push(block);
    // Decide whether the accumulator forms a complete question:
    // - It contains "(D)" → MCQ block complete
    // - Or the next paragraph starts what looks like a new question (numeric stem)
    // - Or it's a standalone numerical (no options) and the next block doesn't extend it
    const joined = accumulator.join(" ");
    const hasD = /\(D\)/.test(joined);
    if (hasD) {
      questionNo += 1;
      emitFromAccumulator(questionNo);
    }
  }
  // Flush remainder as one (or several) numerical questions split by length heuristic:
  // For simplicity, treat any remaining accumulator as ONE more numerical question if non-empty.
  if (accumulator.length > 0) {
    questionNo += 1;
    emitFromAccumulator(questionNo);
  }

  // Pair up any remaining unmatched numerical answer-key entries: emit empty stubs
  // (lets the admin fix in preview rather than silently drop answers).
  const maxKey = answers.size > 0 ? Math.max(...Array.from(answers.keys())) : 0;
  while (questionNo < maxKey) {
    questionNo += 1;
    const keyRaw = answers.get(questionNo) ?? null;
    if (keyRaw == null) continue;
    let type: ParsedDocxQuestion["type"] = "mcq-single";
    let correct: ParsedDocxQuestion["correctAnswer"] = null;
    if (/^[A-D]$/.test(keyRaw)) {
      correct = "ABCD".indexOf(keyRaw);
    } else if (/^-?\d+(\.\d+)?$/.test(keyRaw)) {
      const num = Number(keyRaw);
      type = Number.isInteger(num) ? "integer" : "numerical";
      correct = { value: num };
    }
    questions.push({
      number: questionNo,
      type,
      stemHtml: "",
      stemText: "(question text missing — please fill in)",
      options: type === "mcq-single" ? [{ id: 0, text: "" }, { id: 1, text: "" }, { id: 2, text: "" }, { id: 3, text: "" }] : [],
      images: [],
      correctAnswer: correct,
      correctRaw: keyRaw,
    });
    warnings.push(`Q${questionNo}: only the answer key was found, question text missing.`);
  }

  const totalImages = questions.reduce((s, q) => s + q.images.length, 0);
  return { questions, warnings, totalImages };
};
