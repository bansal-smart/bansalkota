// Common-method .docx parser
// ==========================
// Parses the "cropped" Word format where each question is a single 3-column
// table row: [number] [stem + (A)(B)(C)(D) printed together] [answer].
//
// Subsequent rows that only contain "(A)", "(B)", "(C)", "(D)" placeholders
// (empty answer + empty number) are skipped — they are visual answer-key
// scaffolding in the source document.
//
// The middle cell's whole HTML (text + inline images + LaTeX) becomes the
// stem. Options are fixed labels A/B/C/D with empty text — the test player
// renders just the letter chip when option text is empty, matching the
// "printed paper" UX the user requested.
//
// Type is auto-detected from the answer cell:
//   single letter  (A/B/C/D)           -> mcq-single
//   2-4 letters    (AB, ACD, A,C, A C) -> mcq-multi
//   pure number    (5, 12, -3.5)       -> integer
// An admin can override the detected type in the preview dialog.

import mammoth from "mammoth";
import type {
  DocxImage,
  ParsedDocxQuestion,
  ParsedQuestionType,
} from "./parseDocx";

export type CommonParseResult = {
  questions: ParsedDocxQuestion[];
  warnings: string[];
  totalImages: number;
};

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

const extractStemImages = (
  cellHtml: string,
  collected: DocxImage[],
  idPrefix: string,
): string => {
  const tmp = document.createElement("div");
  tmp.innerHTML = cellHtml;
  const imgs = Array.from(tmp.querySelectorAll("img"));
  imgs.forEach((img, i) => {
    const src = img.getAttribute("src") || "";
    const parsed = dataUrlToBytes(src);
    if (!parsed) {
      img.remove();
      return;
    }
    const id = `${idPrefix}-stem-${i}-${collected.length}`;
    collected.push({
      id,
      slot: "stem",
      bytes: parsed.bytes,
      contentType: parsed.contentType,
    });
    const marker = document.createElement("span");
    marker.setAttribute("data-img", id);
    img.replaceWith(marker);
  });
  return tmp.innerHTML;
};

const isPlaceholderRow = (col1: string, col2: string, col3: string): boolean => {
  if (col1.length > 0) return false;
  if (col3.length > 0) return false;
  return /^\(?[A-Da-d]\)?$/.test(col2.trim());
};

const detectType = (
  raw: string,
): {
  type: ParsedQuestionType;
  correctAnswer: number | number[] | { value: number } | null;
} => {
  const cleaned = raw.replace(/[\s().,;|]/g, "").toUpperCase();
  if (!cleaned) return { type: "mcq-single", correctAnswer: null };

  // All letters A-D?
  if (/^[A-D]+$/.test(cleaned)) {
    const idxs = Array.from(new Set(cleaned.split("").map((c) => c.charCodeAt(0) - 65)));
    if (idxs.length === 1) return { type: "mcq-single", correctAnswer: idxs[0] };
    return { type: "mcq-multi", correctAnswer: idxs.sort((a, b) => a - b) };
  }

  // Pure number?
  const num = raw.replace(/[\s,]/g, "").match(/^-?\d+(?:\.\d+)?$/);
  if (num) {
    const v = Number(num[0]);
    return {
      type: "integer",
      correctAnswer: { value: v },
    };
  }

  return { type: "mcq-single", correctAnswer: null };
};

const emptyOptions = (): { id: number; text: string }[] =>
  [0, 1, 2, 3].map((id) => ({ id, text: "" }));

export const parseCommonDocxQuestions = async (
  file: File,
): Promise<CommonParseResult> => {
  const warnings: string[] = [];
  const buffer = await file.arrayBuffer();

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
  const doc = parser.parseFromString(
    `<div id="root">${result.value}</div>`,
    "text/html",
  );
  const root = doc.getElementById("root")!;

  const rows = Array.from(root.querySelectorAll("table > tr, table > tbody > tr"));
  const out: ParsedDocxQuestion[] = [];

  for (const row of rows) {
    const cells = Array.from(row.children).filter(
      (c) => c.tagName === "TD" || c.tagName === "TH",
    ) as HTMLElement[];
    if (cells.length < 3) continue;

    const col1Text = (cells[0].textContent || "").replace(/\u00a0/g, " ").trim();
    const col2Html = cells[1].innerHTML.trim();
    const col2Text = (cells[1].textContent || "").replace(/\u00a0/g, " ").trim();
    const col3Text = (cells[2].textContent || "").replace(/\u00a0/g, " ").trim();

    if (isPlaceholderRow(col1Text, col2Text, col3Text)) continue;

    // Question rows look like: col1 = integer, col2 = stem (non-empty),
    // col3 = answer token (letter/digits). Be lenient on col3 — let the
    // admin fix missing answers in the preview.
    const numMatch = col1Text.match(/^\d{1,3}$/);
    if (!numMatch) continue;
    if (!col2Text && !col2Html.includes("<img")) continue;

    const number = parseInt(numMatch[0], 10);
    const idPrefix = `cq${number}`;
    const collected: DocxImage[] = [];
    const stemHtml = extractStemImages(col2Html, collected, idPrefix);
    const stemText = stripTags(stemHtml).replace(/\s+/g, " ").trim();

    const { type, correctAnswer } = detectType(col3Text);
    if (!col3Text) {
      warnings.push(`Q${number}: answer cell is empty — set it in the preview.`);
    }

    out.push({
      number,
      type,
      stemHtml,
      stemText,
      options: type === "integer" || type === "numerical" ? [] : emptyOptions(),
      images: collected,
      correctAnswer,
      correctRaw: col3Text || null,
    });
  }

  const totalImages = out.reduce((s, q) => s + q.images.length, 0);
  return { questions: out, warnings, totalImages };
};
