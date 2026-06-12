import { useMemo } from "react";
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

/**
 * Render a string that may contain $...$ inline or $$...$$ display math.
 * Math segments go through KaTeX; everything else is treated as plain text
 * (with HTML escaped). No markdown layer — that was eating short LaTeX
 * fragments like $\left(\dfrac{...}{...}\right)$ and leaving the source visible.
 */
const renderContent = (raw: string): string => {
  if (!raw) return "";
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
  return out;
};

const MathRenderer = ({ content, className, inline = false }: Props) => {
  const html = useMemo(() => renderContent(content ?? ""), [content]);
  if (!content) return null;
  const Tag: keyof JSX.IntrinsicElements = inline ? "span" : "div";
  return (
    <Tag
      className={cn("math-content", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MathRenderer;
