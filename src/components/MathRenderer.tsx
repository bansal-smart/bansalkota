import { useEffect, useMemo, useRef } from "react";
import katex from "katex";
import "katex/contrib/mhchem";
import { cn } from "@/lib/utils";

type Props = {
  content: string;
  className?: string;
  inline?: boolean;
};

/** Escape plain-text segments so stray < > & don't break the DOM. */
const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");

const renderMath = (src: string, displayMode: boolean) => {
  try {
    return katex.renderToString(src, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: true,
      output: "html",
    });
  } catch {
    return escapeHtml(`${displayMode ? "$$" : "$"}${src}${displayMode ? "$$" : "$"}`);
  }
};

const escapeAttr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const extractSafeImages = (raw: string) => {
  const images: Record<string, string> = {};
  const text = raw
    .replace(/<img\b[^>]*>/gi, (tag) => {
      const src = tag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2] ?? "";
      if (!/^https?:\/\//i.test(src) && !/^data:image\//i.test(src) && !/^blob:/i.test(src)) return "";
      const alt = tag.match(/\balt\s*=\s*(["'])(.*?)\1/i)?.[2] ?? "Question image";
      const key = `__MATH_RENDERER_IMG_${Object.keys(images).length}__`;
      images[key] = `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" class="my-2 inline-block max-w-full rounded-md border border-border align-middle" />`;
      return key;
    })
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
    .replace(/<\/?p[^>]*>/gi, "\n");

  return { text, images };
};

/**
 * Render a string that may contain $...$ inline or $$...$$ display math.
 * Math segments go through KaTeX; everything else is treated as plain text
 * (with HTML escaped). No markdown layer — that was eating short LaTeX
 * fragments like $\left(\dfrac{...}{...}\right)$ and leaving the source visible.
 */
const renderContent = (raw: string): string => {
  if (!raw) return "";
  const extracted = extractSafeImages(raw);
  raw = extracted.text;
  let out = "";
  let i = 0;
  const n = raw.length;
  while (i < n) {
    // Display math $$...$$
    if (raw[i] === "$" && raw[i + 1] === "$") {
      const end = raw.indexOf("$$", i + 2);
      if (end !== -1) {
        out += renderMath(raw.slice(i + 2, end), true);
        i = end + 2;
        continue;
      }
    }
    // Inline math $...$ (skip escaped \$)
    if (raw[i] === "$" && raw[i - 1] !== "\\") {
      // find matching $ that isn't escaped
      let j = i + 1;
      while (j < n) {
        if (raw[j] === "$" && raw[j - 1] !== "\\") break;
        j++;
      }
      if (j < n && j > i + 1) {
        out += renderMath(raw.slice(i + 1, j), false);
        i = j + 1;
        continue;
      }
    }
    // Plain char — accumulate up to next $ for efficiency
    let k = i;
    while (k < n && raw[k] !== "$") k++;
    out += escapeHtml(raw.slice(i, k));
    i = k;
  }
  Object.entries(extracted.images).forEach(([key, img]) => {
    out = out.split(key).join(img);
  });
  return out;
};

const MAX_IMG_RETRIES = 3;
const FAILED_ALT = "Image failed to load — tap to retry";
const FAILED_STYLE_PROPS = ["min-height", "min-width", "cursor", "border", "background", "font-size", "color"];

/** Re-request an <img> with a cache-busting param so a transient 4xx/5xx/CDN miss is not sticky. */
const reloadImg = (img: HTMLImageElement, attempt: number) => {
  const base = img.dataset.origSrc ?? img.getAttribute("src") ?? "";
  if (!img.dataset.origSrc) img.dataset.origSrc = base;
  if (img.dataset.origAlt === undefined) img.dataset.origAlt = img.alt === FAILED_ALT ? "" : img.alt;
  img.dataset.retries = String(attempt);
  img.removeAttribute("data-failed");
  img.alt = img.dataset.origAlt;
  for (const prop of FAILED_STYLE_PROPS) img.style.removeProperty(prop);
  img.src = `${base}${base.includes("?") ? "&" : "?"}_r=${attempt}`;
};

const MathRenderer = ({ content, className, inline = false }: Props) => {
  const html = useMemo(() => renderContent(content ?? ""), [content]);
  const timers = useRef<number[]>([]);
  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); }, []);
  if (!content) return null;
  const Tag: keyof JSX.IntrinsicElements = inline ? "span" : "div";

  // <img> `error` does not bubble, but it is capturable. The HTML is injected as a
  // string, so delegate: retry with backoff, then leave a tap-to-retry placeholder
  // instead of a silently blank question.
  const onErrorCapture = (e: React.SyntheticEvent<HTMLElement>) => {
    const img = e.target as HTMLElement;
    if (!(img instanceof HTMLImageElement)) return;
    const tries = Number(img.dataset.retries ?? "0");
    if (tries >= MAX_IMG_RETRIES) {
      if (img.dataset.origAlt === undefined) img.dataset.origAlt = img.alt;
      img.dataset.failed = "1";
      img.alt = FAILED_ALT;
      img.style.minHeight = "56px";
      img.style.minWidth = "180px";
      img.style.cursor = "pointer";
      img.style.border = "1px dashed #fca5a5";
      img.style.background = "#fef2f2";
      img.style.fontSize = "12px";
      img.style.color = "#b91c1c";
      return;
    }
    const delay = Math.min(2500, 400 * 2 ** tries) + Math.random() * 300;
    const id = window.setTimeout(() => {
      if (img.isConnected) reloadImg(img, tries + 1);
    }, delay);
    timers.current.push(id);
  };

  const onClick = (e: React.MouseEvent<HTMLElement>) => {
    const img = e.target as HTMLElement;
    if (img instanceof HTMLImageElement && img.dataset.failed) {
      // The placeholder may sit inside an option <button>: don't also select the option.
      e.stopPropagation();
      e.preventDefault();
      reloadImg(img, 1);
    }
  };

  return (
    <Tag
      className={cn("math-content", className)}
      onErrorCapture={onErrorCapture}
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MathRenderer;
