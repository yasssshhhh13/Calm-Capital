/**
 * Post-build + CI SEO generator:
 * - public/sitemap.xml
 * - public/robots.txt
 * - dist/ipo/<id>/index.html shells (and section paths) with meta + JSON-LD + crawlable HTML
 *
 * Usage:
 *   node scripts/generate-seo.mjs              # sitemap/robots only (CI)
 *   node scripts/generate-seo.mjs --dist        # also write prerender shells into dist/
 */
import { readFile, writeFile, mkdir, access } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  getSiteUrl,
  absoluteUrl,
  buildIpoMeta,
  buildSectionMeta,
  buildIpoJsonLd,
  buildSectionJsonLd,
  buildHomeJsonLd,
  buildIpoCrawlSummaryHtml,
  escapeHtml,
  SECTION_META,
  ipoPath,
} from "../src/seo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const IPOS_PATH = path.join(ROOT, "public", "ipos.json");
const PUBLIC_DIR = path.join(ROOT, "public");
const DIST_DIR = path.join(ROOT, "dist");

const SITE_URL = getSiteUrl(process.env.VITE_SITE_URL);

const SECTION_PATHS = [
  "/",
  "/open",
  "/upcoming",
  "/closed",
  "/listed",
  "/gmp",
  "/subscriptions",
  "/allotment",
  "/financials",
  "/calculator",
  "/compare",
  "/privacy",
  "/terms",
  "/disclaimer",
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function injectHead(html, { title, description, canonical, ogImage, jsonLd }) {
  let out = html;
  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  const replaceOrInsertMeta = (attr, key, content) => {
    const re = new RegExp(`<meta\\s+[^>]*${attr}=["']${key}["'][^>]*>`, "i");
    const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`;
    if (re.test(out)) out = out.replace(re, tag);
    else out = out.replace(/<\/head>/i, `    ${tag}\n  </head>`);
  };

  replaceOrInsertMeta("name", "description", description);
  replaceOrInsertMeta("property", "og:title", title);
  replaceOrInsertMeta("property", "og:description", description);
  replaceOrInsertMeta("property", "og:url", canonical);
  replaceOrInsertMeta("property", "og:image", ogImage);
  replaceOrInsertMeta("property", "og:type", "website");
  replaceOrInsertMeta("property", "og:site_name", "Calm Capital");
  replaceOrInsertMeta("name", "twitter:title", title);
  replaceOrInsertMeta("name", "twitter:description", description);
  replaceOrInsertMeta("name", "twitter:image", ogImage);
  replaceOrInsertMeta("name", "twitter:card", "summary_large_image");

  const canonicalTag = `<link rel="canonical" href="${escapeHtml(canonical)}" />`;
  if (/<link\s+[^>]*rel=["']canonical["'][^>]*>/i.test(out)) {
    out = out.replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>/i, canonicalTag);
  } else {
    out = out.replace(/<\/head>/i, `    ${canonicalTag}\n  </head>`);
  }

  const ld = `<script type="application/ld+json" id="calm-seo-jsonld">${JSON.stringify(jsonLd)}</script>`;
  if (/id=["']calm-seo-jsonld["']/.test(out)) {
    out = out.replace(/<script[^>]*id=["']calm-seo-jsonld["'][^>]*>[\s\S]*?<\/script>/i, ld);
  } else {
    out = out.replace(/<\/head>/i, `    ${ld}\n  </head>`);
  }

  return out;
}

function injectBodyContent(html, summaryHtml) {
  // Place crawlable summary before #root so bots see it; SPA hides it after hydrate.
  if (html.includes('id="seo-content"')) {
    return html.replace(/<main id="seo-content"[\s\S]*?<\/main>/i, summaryHtml);
  }
  return html.replace(/<div id="root"><\/div>/i, `${summaryHtml}\n    <div id="root"></div>`);
}

async function writeSitemap(ipos, lastmod) {
  const urls = [];
  for (const p of SECTION_PATHS) {
    urls.push({ loc: absoluteUrl(p, SITE_URL), lastmod, priority: p === "/" ? "1.0" : "0.8" });
  }
  for (const ipo of ipos) {
    if (!ipo?.id) continue;
    urls.push({
      loc: absoluteUrl(ipoPath(ipo.id), SITE_URL),
      lastmod,
      priority: "0.9",
    });
  }

  const body = urls
    .map(
      (u) => `  <url>
    <loc>${escapeHtml(u.loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
  await writeFile(path.join(PUBLIC_DIR, "sitemap.xml"), xml, "utf-8");
  if (await exists(DIST_DIR)) {
    await writeFile(path.join(DIST_DIR, "sitemap.xml"), xml, "utf-8");
  }
  console.log(`[SEO] Wrote sitemap.xml (${urls.length} URLs) → ${SITE_URL}`);
}

async function writeRobots() {
  const txt = `User-agent: *
Allow: /

Disallow: /api/
Disallow: /*.map$

Sitemap: ${SITE_URL}/sitemap.xml
`;
  await writeFile(path.join(PUBLIC_DIR, "robots.txt"), txt, "utf-8");
  if (await exists(DIST_DIR)) {
    await writeFile(path.join(DIST_DIR, "robots.txt"), txt, "utf-8");
  }
  console.log(`[SEO] Wrote robots.txt`);
}

function sectionSummaryHtml(tabId) {
  const meta = buildSectionMeta(tabId, SITE_URL);
  return `
<main id="seo-content" style="display:none" aria-hidden="true">
  <h1>${escapeHtml(meta.title)}</h1>
  <p>${escapeHtml(meta.description)}</p>
  <p>
    <a href="/">Home</a> ·
    <a href="/open">Open IPOs</a> ·
    <a href="/upcoming">Upcoming</a> ·
    <a href="/listed">Listed</a> ·
    <a href="/gmp">Live GMP</a> ·
    <a href="/subscriptions">Subscription</a> ·
    <a href="/allotment">Allotment</a>
  </p>
</main>`.trim();
}

async function writePrerenderShells(ipos, indexHtml) {
  // Homepage shell with home JSON-LD
  {
    const meta = buildSectionMeta("overview", SITE_URL);
    let page = injectHead(indexHtml, {
      ...meta,
      jsonLd: buildHomeJsonLd(SITE_URL),
    });
    page = injectBodyContent(page, sectionSummaryHtml("overview"));
    await writeFile(path.join(DIST_DIR, "index.html"), page, "utf-8");
  }

  // Section shells
  for (const [tabId, section] of Object.entries(SECTION_META)) {
    if (tabId === "overview") continue;
    const meta = buildSectionMeta(tabId, SITE_URL);
    let page = injectHead(indexHtml, {
      ...meta,
      jsonLd: buildSectionJsonLd(tabId, SITE_URL),
    });
    page = injectBodyContent(page, sectionSummaryHtml(tabId));
    const dir = path.join(DIST_DIR, section.path.replace(/^\//, ""));
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "index.html"), page, "utf-8");
  }

  // Alias /live-gmp → same as gmp
  {
    const meta = buildSectionMeta("gmp", SITE_URL);
    meta.path = "/live-gmp";
    meta.canonical = absoluteUrl("/live-gmp", SITE_URL);
    let page = injectHead(indexHtml, {
      ...meta,
      jsonLd: buildSectionJsonLd("gmp", SITE_URL),
    });
    page = injectBodyContent(page, sectionSummaryHtml("gmp"));
    const dir = path.join(DIST_DIR, "live-gmp");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "index.html"), page, "utf-8");
  }

  // IPO shells
  let count = 0;
  for (const ipo of ipos) {
    if (!ipo?.id) continue;
    const meta = buildIpoMeta(ipo, SITE_URL);
    let page = injectHead(indexHtml, {
      ...meta,
      jsonLd: buildIpoJsonLd(ipo, SITE_URL),
    });
    page = injectBodyContent(page, buildIpoCrawlSummaryHtml(ipo));
    const dir = path.join(DIST_DIR, "ipo", ipo.id);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "index.html"), page, "utf-8");
    count += 1;
  }
  console.log(`[SEO] Prerendered ${count} IPO shells + section pages into dist/`);
}

async function main() {
  const withDist = process.argv.includes("--dist");
  const raw = await readFile(IPOS_PATH, "utf-8");
  const ipos = JSON.parse(raw);
  const lastmod = new Date().toISOString().slice(0, 10);

  await writeSitemap(ipos, lastmod);
  await writeRobots();

  if (withDist) {
    if (!(await exists(DIST_DIR))) {
      console.error("[SEO] dist/ not found — run vite build first");
      process.exit(1);
    }
    const indexHtml = await readFile(path.join(DIST_DIR, "index.html"), "utf-8");
    await writePrerenderShells(ipos, indexHtml);
  }

  console.log(`[SEO] Done (site=${SITE_URL})`);
}

main().catch((err) => {
  console.error("[SEO] Failed:", err);
  process.exit(1);
});
