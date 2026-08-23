// Generates public/sitemap.xml from static routes + published DB content
// (courses, centres, test series, blog posts, leadership profiles).
// Run automatically as part of `npm run build`; can also be run standalone
// via `npm run generate:sitemap`.
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Minimal .env loader — avoids adding a dotenv dependency just for this script.
function loadEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

const SITE_URL = "https://www.bansal.ac.in";

function readEnv(value) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

const SUPABASE_URL = readEnv(process.env.VITE_SUPABASE_URL);
const SUPABASE_KEY =
  readEnv(process.env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  readEnv(process.env.VITE_SUPABASE_ANON_KEY);

const STATIC_ROUTES = [
  { path: "/", priority: 1.0, changefreq: "daily" },
  { path: "/courses", priority: 0.9, changefreq: "daily" },
  { path: "/courses?exam=IIT-JEE", priority: 0.9, changefreq: "daily" },
  { path: "/courses?exam=NEET", priority: 0.9, changefreq: "daily" },
  { path: "/tests", priority: 0.7, changefreq: "weekly" },
  { path: "/test-series", priority: 0.9, changefreq: "daily" },
  { path: "/live-classes", priority: 0.6, changefreq: "weekly" },
  { path: "/pricing", priority: 0.6, changefreq: "monthly" },
  { path: "/admissions", priority: 0.7, changefreq: "weekly" },
  { path: "/association", priority: 0.4, changefreq: "monthly" },
  { path: "/about", priority: 0.8, changefreq: "monthly" },
  { path: "/career", priority: 0.4, changefreq: "monthly" },
  { path: "/contact", priority: 0.6, changefreq: "monthly" },
  { path: "/boost", priority: 0.9, changefreq: "daily" },
  { path: "/centres", priority: 0.8, changefreq: "weekly" },
  { path: "/achievements", priority: 0.7, changefreq: "weekly" },
  { path: "/gallery/images", priority: 0.3, changefreq: "monthly" },
  { path: "/gallery/videos", priority: 0.3, changefreq: "monthly" },
  { path: "/gallery/achievements", priority: 0.3, changefreq: "monthly" },
  { path: "/alumni", priority: 0.4, changefreq: "monthly" },
  { path: "/e-store", priority: 0.5, changefreq: "weekly" },
  { path: "/blog", priority: 0.6, changefreq: "daily" },
  { path: "/privacy", priority: 0.2, changefreq: "yearly" },
  { path: "/terms", priority: 0.2, changefreq: "yearly" },
  { path: "/refund-policy", priority: 0.2, changefreq: "yearly" },
  { path: "/disclaimer", priority: 0.2, changefreq: "yearly" },
];

function urlEntry(path, lastmod, priority = 0.5, changefreq = "weekly") {
  const loc = `${SITE_URL}${path}`;
  return [
    "  <url>",
    `    <loc>${loc.replace(/&/g, "&amp;")}</loc>`,
    lastmod ? `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : null,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority.toFixed(1)}</priority>`,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

async function main() {
  const entries = STATIC_ROUTES.map((r) => urlEntry(r.path, null, r.priority, r.changefreq));

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn(
      "[sitemap] VITE_SUPABASE_URL and a Supabase key (VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY) not set — writing static-only sitemap.",
    );
  } else {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const [{ data: courses }, { data: centres }, { data: series }, { data: posts }, { data: leaders }] =
      await Promise.all([
        supabase.from("courses").select("slug, updated_at").eq("is_published", true),
        supabase.from("centres").select("slug, updated_at").eq("is_suspended", false),
        supabase.from("test_series").select("slug, updated_at").eq("is_published", true),
        supabase.from("blog_posts").select("slug, updated_at").eq("status", "published"),
        supabase.from("leadership_profiles").select("slug, updated_at").eq("is_active", true),
      ]);

    (courses ?? []).forEach((c) => entries.push(urlEntry(`/courses/${c.slug}`, c.updated_at, 0.7, "weekly")));
    (centres ?? []).forEach((c) => entries.push(urlEntry(`/centres/${c.slug}`, c.updated_at, 0.7, "weekly")));
    (series ?? []).forEach((s) => entries.push(urlEntry(`/test-series/${s.slug}`, s.updated_at, 0.7, "weekly")));
    (posts ?? []).forEach((p) => entries.push(urlEntry(`/blog/${p.slug}`, p.updated_at, 0.5, "monthly")));
    (leaders ?? []).forEach((l) => entries.push(urlEntry(`/about/${l.slug}`, l.updated_at, 0.5, "monthly")));

    console.log(
      `[sitemap] ${courses?.length ?? 0} courses, ${centres?.length ?? 0} centres, ${series?.length ?? 0} test series, ${posts?.length ?? 0} blog posts, ${leaders?.length ?? 0} leadership profiles.`,
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
  const outPath = resolve(root, "public", "sitemap.xml");
  writeFileSync(outPath, xml, "utf8");
  console.log(`[sitemap] Wrote ${entries.length} URLs to ${outPath}`);
}

main().catch((err) => {
  console.error("[sitemap] Failed:", err);
  process.exit(1);
});
