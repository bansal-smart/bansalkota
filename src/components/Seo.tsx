import { useEffect } from "react";

// Canonical host for this site. NOTE: src/lib/brand.ts's PRIMARY_DOMAIN is
// currently the non-www apex (https://bansal.ac.in), used for admin-facing
// copyable links (CBT kiosk, secret admin URL). This constant is intentionally
// separate — canonical/OG tags need the exact host Google should index
// (https://www.bansal.ac.in per the client's confirmed metadata plan). If the
// two ever diverge in practice, whichever host actually 301s to the other at
// the DNS/CDN level is the one both constants should agree on.
export const SITE_URL = "https://www.bansal.ac.in";

type JsonLd = Record<string, unknown>;

export type SeoProps = {
  /** Page title, WITHOUT the "| Bansal Classes" suffix — added automatically unless raw=true. */
  title: string;
  description: string;
  /** Path (starting with /) this page should canonicalize to. Defaults to the current location. */
  path?: string;
  /** Absolute image URL for social previews. Falls back to the site default in index.html if omitted. */
  image?: string;
  /** Set true to keep this page out of Google's index (private/app/utility pages). */
  noindex?: boolean;
  og?: "website" | "article" | "product" | "profile";
  /** One or more JSON-LD structured data objects to inject as <script type="application/ld+json">. */
  jsonLd?: JsonLd | JsonLd[];
  /** Skip appending " | Bansal Classes" to the title (use for pages that already build a full title). */
  raw?: boolean;
};

// Truncates at the nearest word boundary instead of cutting mid-word.
function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

function setMetaTag(attr: "name" | "property", key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  return el;
}

function removeMetaTag(attr: "name" | "property", key: string) {
  document.querySelector(`meta[${attr}="${key}"]`)?.remove();
}

/**
 * Per-page <head> manager for this SPA. There is no SSR/prerendering here, so
 * index.html's static tags are the only thing crawlers that don't execute JS
 * (social-preview bots) will ever see — but Googlebot does execute JS, and
 * this is what makes each route's title/description/canonical/OG actually
 * distinct in the index instead of every page sharing index.html's tags.
 */
export default function Seo({ title, description, path, image, noindex, og = "website", jsonLd, raw }: SeoProps) {
  useEffect(() => {
    // Avoid double-branding titles that already say "Bansal Classes"/"Bansal Sir"
    // (most hand-written ones do) — appending the suffix to those just wastes
    // the ~60-char budget Google actually displays.
    const alreadyBranded = /bansal/i.test(title);
    const untruncated = raw || alreadyBranded ? title : `${title} | Bansal Classes`;
    const fullTitle = truncate(untruncated, 60);
    const prevTitle = document.title;
    document.title = fullTitle;

    const trimmedDesc = truncate(description, 160);
    setMetaTag("name", "description", trimmedDesc);
    setMetaTag("property", "og:type", og);
    setMetaTag("property", "og:title", fullTitle);
    setMetaTag("property", "og:description", trimmedDesc);
    setMetaTag("name", "twitter:title", fullTitle);
    setMetaTag("name", "twitter:description", trimmedDesc);

    const url = `${SITE_URL}${path ?? window.location.pathname}`;
    setMetaTag("property", "og:url", url);

    if (image) {
      setMetaTag("property", "og:image", image);
      setMetaTag("name", "twitter:image", image);
    }

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    if (noindex) {
      setMetaTag("name", "robots", "noindex, nofollow");
    } else {
      removeMetaTag("name", "robots");
    }

    const ldEntries = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
    const scripts = ldEntries.map((entry) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(entry);
      document.head.appendChild(script);
      return script;
    });

    return () => {
      document.title = prevTitle;
      removeMetaTag("name", "robots");
      scripts.forEach((s) => s.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, image, noindex, og, JSON.stringify(jsonLd), raw]);

  return null;
}
