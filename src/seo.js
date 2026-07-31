/**
 * Calm Capital SEO helpers — shared by the SPA and build-time generate-seo script.
 * Pass siteUrl explicitly from Node; the browser uses VITE_SITE_URL.
 */

const DEFAULT_SITE_NAME = "Calm Capital";
const DEFAULT_OG_PATH = "/og-image.png";

const HOME_TITLE = "Calm Capital — Live GMP & Institutional-Grade IPO Analysis";
const HOME_DESCRIPTION =
  "Track live IPO GMP, subscription status, allotment chances, listing performance, DRHP/RHP, financials, calculators, and comprehensive IPO analysis—all in one place with Calm Capital.";

/** Tab id → public path (no trailing slash except root). */
export const TAB_PATHS = {
  overview: "/",
  open: "/open",
  upcoming: "/upcoming",
  closed: "/closed",
  listed: "/listed",
  gmp: "/gmp",
  subscriptions: "/subscriptions",
  allotment: "/allotment",
  financials: "/financials",
  docs: "/docs",
  calculator: "/calculator",
  watchlist: "/watchlist",
  demat: "/demat",
};

/** Path → tab id (includes aliases). */
export const PATH_TO_TAB = {
  "/": "overview",
  "/overview": "overview",
  "/open": "open",
  "/upcoming": "upcoming",
  "/closed": "closed",
  "/listed": "listed",
  "/gmp": "gmp",
  "/live-gmp": "gmp",
  "/subscriptions": "subscriptions",
  "/allotment": "allotment",
  "/financials": "financials",
  "/docs": "docs",
  "/calculator": "calculator",
  "/watchlist": "watchlist",
  "/demat": "demat",
};

export const SECTION_META = {
  overview: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    path: "/",
  },
  open: {
    title: "Open IPOs | Live GMP & Subscription | Calm Capital",
    description:
      "Track open IPOs with live GMP, subscription status, allotment chances and key dates on Calm Capital.",
    path: "/open",
  },
  upcoming: {
    title: "Upcoming IPOs | Calendar & GMP | Calm Capital",
    description:
      "See upcoming IPOs, expected open dates, GMP trends and issue details on Calm Capital.",
    path: "/upcoming",
  },
  closed: {
    title: "Closed IPOs | Allotment & Listing | Calm Capital",
    description:
      "Review recently closed IPOs, allotment timelines, refund dates and listing status on Calm Capital.",
    path: "/closed",
  },
  listed: {
    title: "Listed IPOs | Performance & GMP | Calm Capital",
    description:
      "Track listed IPO performance, listing gains, current price and historical GMP on Calm Capital.",
    path: "/listed",
  },
  gmp: {
    title: "Live IPO GMP Today | Calm Capital",
    description:
      "Check live IPO GMP today for open and upcoming issues, estimated listing price and trends on Calm Capital.",
    path: "/gmp",
  },
  subscriptions: {
    title: "IPO Subscription Status Live | Calm Capital",
    description:
      "Live IPO subscription status by category, allotment odds and day-wise updates on Calm Capital.",
    path: "/subscriptions",
  },
  allotment: {
    title: "IPO Allotment Status | Registrar Links | Calm Capital",
    description:
      "Check IPO allotment status via official registrar portals, upcoming allotment dates and listing timelines on Calm Capital.",
    path: "/allotment",
  },
  financials: {
    title: "IPO Financials | Revenue, PAT & Ratios | Calm Capital",
    description:
      "Compare IPO financials including revenue, PAT, EBITDA, PE, ROE and more on Calm Capital.",
    path: "/financials",
  },
  docs: {
    title: "IPO DRHP & RHP Documents | Calm Capital",
    description:
      "Access IPO DRHP and RHP filings and key offering documents in one place on Calm Capital.",
    path: "/docs",
  },
  calculator: {
    title: "IPO Lot Size & Investment Calculator | Calm Capital",
    description:
      "Calculate IPO investment amount by lot size and category on Calm Capital.",
    path: "/calculator",
  },
  watchlist: {
    title: "IPO Watchlist | Calm Capital",
    description: "Your saved IPOs for quick GMP, subscription and allotment tracking on Calm Capital.",
    path: "/watchlist",
  },
  demat: {
    title: "Best Demat Accounts for IPO | Calm Capital",
    description: "Compare demat account options for applying to IPOs on Calm Capital.",
    path: "/demat",
  },
};

export function getSiteUrl(override) {
  if (override) return String(override).replace(/\/$/, "");
  let fromEnv = "";
  try {
    if (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) {
      fromEnv = import.meta.env.VITE_SITE_URL;
    }
  } catch {
    /* ignore */
  }
  if (!fromEnv && typeof process !== "undefined" && process.env?.VITE_SITE_URL) {
    fromEnv = process.env.VITE_SITE_URL;
  }
  return String(fromEnv || "https://calmcapital.space").replace(/\/$/, "");
}

export function absoluteUrl(path, siteUrl) {
  const base = getSiteUrl(siteUrl);
  if (!path || path === "/") return `${base}/`;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export function ipoPath(id) {
  return `/ipo/${id}`;
}

export function displayIpoName(ipo) {
  if (!ipo) return "IPO";
  const raw = ipo.name || ipo.company || "IPO";
  return String(raw)
    .replace(/\s+Limited\.?$/i, "")
    .replace(/\s+Ltd\.?$/i, "")
    .trim();
}

export function buildIpoTitle(ipo) {
  const name = displayIpoName(ipo);
  return `${name} IPO GMP Today | Subscription | Allotment | Calm Capital`;
}

export function buildIpoDescription(ipo) {
  const name = displayIpoName(ipo);
  return `Check ${name} IPO GMP, subscription status, allotment chances, financials, review, DRHP, RHP, listing dates and more on Calm Capital.`;
}

export function buildSectionMeta(tabId, siteUrl) {
  const section = SECTION_META[tabId] || SECTION_META.overview;
  const path = section.path;
  return {
    title: section.title,
    description: section.description,
    path,
    canonical: absoluteUrl(path, siteUrl),
    ogImage: absoluteUrl(DEFAULT_OG_PATH, siteUrl),
    siteName: DEFAULT_SITE_NAME,
  };
}

export function buildIpoMeta(ipo, siteUrl) {
  const path = ipoPath(ipo.id);
  return {
    title: buildIpoTitle(ipo),
    description: buildIpoDescription(ipo),
    path,
    canonical: absoluteUrl(path, siteUrl),
    ogImage: absoluteUrl(DEFAULT_OG_PATH, siteUrl),
    siteName: DEFAULT_SITE_NAME,
  };
}

/** Parse location into { tabId, ipoId }. */
export function parseLocation(pathname = "/", search = "") {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  const ipoMatch = path.match(/^\/ipo\/([^/]+)\/?$/);
  if (ipoMatch) {
    return { tabId: null, ipoId: decodeURIComponent(ipoMatch[1]), path: `/ipo/${ipoMatch[1]}` };
  }

  // Legacy ?ipo=
  const legacyIpo = params.get("ipo");
  if (legacyIpo) {
    return { tabId: PATH_TO_TAB[path] || "overview", ipoId: legacyIpo, path, legacy: true };
  }

  const tabId = PATH_TO_TAB[path] || PATH_TO_TAB[pathname] || "overview";
  return { tabId, ipoId: null, path: TAB_PATHS[tabId] || "/" };
}

export function buildIpoFaqs(ipo) {
  const name = displayIpoName(ipo);
  const faqs = [];

  if (ipo.open || ipo.close) {
    faqs.push({
      question: `When does the ${name} IPO open and close?`,
      answer: `${name} IPO ${ipo.open ? `opens on ${ipo.open}` : "open date is to be announced"}${
        ipo.close ? ` and closes on ${ipo.close}` : ""
      }. Dates are as per the current offer schedule on Calm Capital.`,
    });
  }

  faqs.push({
    question: `What is the latest GMP of ${name} IPO?`,
    answer:
      ipo.gmp != null && ipo.gmp !== ""
        ? `The latest grey market premium (GMP) for ${name} IPO is ₹${ipo.gmp}${
            ipo.estListing != null ? ` with an estimated listing around ₹${ipo.estListing}` : ""
          }. GMP is indicative and can change frequently.`
        : `Live GMP for ${name} IPO is tracked on Calm Capital as soon as grey market data is available.`,
  });

  if (ipo.allotment || ipo.listing) {
    faqs.push({
      question: `When is ${name} IPO allotment and listing?`,
      answer: `${name} IPO allotment is ${ipo.allotment || "to be announced"}${
        ipo.listing ? ` and listing is scheduled for ${ipo.listing}` : ""
      }. Check the Allotment tab on Calm Capital for registrar links.`,
    });
  }

  if (ipo.registrar && !/to be announced/i.test(ipo.registrar)) {
    faqs.push({
      question: `Who is the registrar for ${name} IPO?`,
      answer: `The registrar for ${name} IPO is ${ipo.registrar}. You can check allotment status on the registrar portal linked from Calm Capital.`,
    });
  }

  if (ipo.lot || ipo.priceMax) {
    faqs.push({
      question: `What is the lot size and price band for ${name} IPO?`,
      answer: `${name} IPO ${
        ipo.priceMin != null && ipo.priceMax != null
          ? (ipo.priceMin === ipo.priceMax ? `price is ₹${ipo.priceMax}` : `price band is ₹${ipo.priceMin}–₹${ipo.priceMax}`)
          : ipo.priceMax != null
            ? `price is ₹${ipo.priceMax}`
            : "price band is to be announced"
      }${ipo.lot ? ` with a lot size of ${ipo.lot} shares` : ""}.`,
    });
  }

  faqs.push({
    question: `Where can I track ${name} IPO subscription and financials?`,
    answer: `Calm Capital shows live subscription (when available), allotment odds, financials, DRHP/RHP links and key dates for ${name} IPO in one interface.`,
  });

  return faqs.slice(0, 6);
}

export function buildOrganizationSchema(siteUrl) {
  const base = getSiteUrl(siteUrl);
  return {
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: DEFAULT_SITE_NAME,
    url: `${base}/`,
    logo: absoluteUrl("/logo.png", siteUrl),
    description: HOME_DESCRIPTION,
  };
}

export function buildWebsiteSchema(siteUrl) {
  const base = getSiteUrl(siteUrl);
  return {
    "@type": "WebSite",
    "@id": `${base}/#website`,
    name: DEFAULT_SITE_NAME,
    url: `${base}/`,
    description: HOME_DESCRIPTION,
    publisher: { "@id": `${base}/#organization` },
  };
}

export function buildFinancialServiceSchema(siteUrl) {
  const base = getSiteUrl(siteUrl);
  return {
    "@type": "FinancialService",
    "@id": `${base}/#service`,
    name: DEFAULT_SITE_NAME,
    url: `${base}/`,
    description: "Institutional-grade IPO analysis, live GMP, subscription tracking and allotment tools for Indian IPOs.",
    provider: { "@id": `${base}/#organization` },
    areaServed: "IN",
  };
}

export function buildWebPageSchema({ title, description, canonical, siteUrl }) {
  const base = getSiteUrl(siteUrl);
  return {
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: title,
    description,
    isPartOf: { "@id": `${base}/#website` },
    about: { "@id": `${base}/#service` },
  };
}

export function buildBreadcrumbSchema(items, siteUrl) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path, siteUrl),
    })),
  };
}

export function buildFaqSchema(faqs) {
  if (!faqs?.length) return null;
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

export function buildFinancialProductSchema(ipo, siteUrl) {
  const meta = buildIpoMeta(ipo, siteUrl);
  const product = {
    "@type": "FinancialProduct",
    "@id": `${meta.canonical}#product`,
    name: `${displayIpoName(ipo)} IPO`,
    description: meta.description,
    url: meta.canonical,
    category: ipo.type || "IPO",
    provider: { "@id": `${getSiteUrl(siteUrl)}/#organization` },
  };
  if (ipo.sector) product.additionalType = ipo.sector;
  return product;
}

export function buildHomeJsonLd(siteUrl) {
  const meta = buildSectionMeta("overview", siteUrl);
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationSchema(siteUrl),
      buildWebsiteSchema(siteUrl),
      buildFinancialServiceSchema(siteUrl),
      buildWebPageSchema({ ...meta, siteUrl }),
      buildBreadcrumbSchema([{ name: "Home", path: "/" }], siteUrl),
    ],
  };
}

export function buildSectionJsonLd(tabId, siteUrl) {
  const meta = buildSectionMeta(tabId, siteUrl);
  const crumbs = [{ name: "Home", path: "/" }];
  if (tabId !== "overview") {
    crumbs.push({ name: SECTION_META[tabId]?.title?.split("|")[0]?.trim() || tabId, path: meta.path });
  }
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationSchema(siteUrl),
      buildWebsiteSchema(siteUrl),
      buildFinancialServiceSchema(siteUrl),
      buildWebPageSchema({ ...meta, siteUrl }),
      buildBreadcrumbSchema(crumbs, siteUrl),
    ],
  };
}

export function buildIpoJsonLd(ipo, siteUrl) {
  const meta = buildIpoMeta(ipo, siteUrl);
  const status = ipo.status || "IPO";
  const statusPath = TAB_PATHS[String(status).toLowerCase()] || "/";
  const faqs = buildIpoFaqs(ipo);
  const graph = [
    buildOrganizationSchema(siteUrl),
    buildWebsiteSchema(siteUrl),
    buildFinancialServiceSchema(siteUrl),
    buildWebPageSchema({ ...meta, siteUrl }),
    buildBreadcrumbSchema(
      [
        { name: "Home", path: "/" },
        { name: status, path: statusPath },
        { name: displayIpoName(ipo), path: meta.path },
      ],
      siteUrl
    ),
    buildFinancialProductSchema(ipo, siteUrl),
  ];
  const faq = buildFaqSchema(faqs);
  if (faq) graph.push(faq);
  return { "@context": "https://schema.org", "@graph": graph };
}

function ensureMeta(selector, attr, key, content) {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function ensureLink(rel, href) {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function ensureJsonLd(id, data) {
  if (typeof document === "undefined") return;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/** Apply meta tags + JSON-LD in the browser. */
export function applySeo({ title, description, canonical, ogImage, jsonLd, siteName = DEFAULT_SITE_NAME }) {
  if (typeof document === "undefined") return;
  if (title) document.title = title;
  if (description) {
    ensureMeta('meta[name="description"]', "name", "description", description);
  }
  if (canonical) ensureLink("canonical", canonical);
  if (title) {
    ensureMeta('meta[property="og:title"]', "property", "og:title", title);
    ensureMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
  }
  if (description) {
    ensureMeta('meta[property="og:description"]', "property", "og:description", description);
    ensureMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
  }
  if (canonical) {
    ensureMeta('meta[property="og:url"]', "property", "og:url", canonical);
  }
  if (ogImage) {
    ensureMeta('meta[property="og:image"]', "property", "og:image", ogImage);
    ensureMeta('meta[name="twitter:image"]', "name", "twitter:image", ogImage);
  }
  ensureMeta('meta[property="og:site_name"]', "property", "og:site_name", siteName);
  ensureMeta('meta[property="og:type"]', "property", "og:type", "website");
  ensureMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
  if (jsonLd) ensureJsonLd("calm-seo-jsonld", jsonLd);
}

export function applyIpoSeo(ipo, siteUrl) {
  const meta = buildIpoMeta(ipo, siteUrl);
  applySeo({
    ...meta,
    jsonLd: buildIpoJsonLd(ipo, siteUrl),
  });
  return meta;
}

export function applyTabSeo(tabId, siteUrl) {
  const meta = buildSectionMeta(tabId || "overview", siteUrl);
  applySeo({
    ...meta,
    jsonLd: buildSectionJsonLd(tabId || "overview", siteUrl),
  });
  return meta;
}

export function similarIpos(ipo, allIpos, limit = 3) {
  if (!ipo || !allIpos?.length) return [];
  const sameSectorType = allIpos.filter(
    (i) => i.id !== ipo.id && i.type === ipo.type && i.sector && ipo.sector && i.sector === ipo.sector
  );
  const sameType = allIpos.filter((i) => i.id !== ipo.id && i.type === ipo.type);
  const pool = [...sameSectorType];
  for (const i of sameType) {
    if (!pool.find((p) => p.id === i.id)) pool.push(i);
  }
  return pool.slice(0, limit);
}

/** Escape text for HTML injection in prerender shells. */
export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildIpoCrawlSummaryHtml(ipo) {
  const name = escapeHtml(displayIpoName(ipo));
  const company = escapeHtml(ipo.company || name);
  const faqs = buildIpoFaqs(ipo);
  const strengths = (ipo.strengths || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  const risks = (ipo.risks || []).map((r) => `<li>${escapeHtml(r)}</li>`).join("");
  const faqHtml = faqs
    .map(
      (f) =>
        `<div><h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p></div>`
    )
    .join("");

  return `
<main id="seo-content" style="max-width:720px;margin:1.5rem auto;padding:0 1rem;font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a">
  <nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="${escapeHtml(
    TAB_PATHS[String(ipo.status || "").toLowerCase()] || "/"
  )}">${escapeHtml(ipo.status || "IPO")}</a> / <span>${name}</span></nav>
  <h1>${company} IPO GMP, Subscription &amp; Allotment</h1>
  <p>${escapeHtml(buildIpoDescription(ipo))}</p>
  <ul>
    <li>Status: ${escapeHtml(ipo.status || "—")}</li>
    <li>Type: ${escapeHtml(ipo.type || "—")}</li>
    <li>Sector: ${escapeHtml(ipo.sector || "—")}</li>
    <li>Open: ${escapeHtml(ipo.open || "TBA")}</li>
    <li>Close: ${escapeHtml(ipo.close || "TBA")}</li>
    <li>Allotment: ${escapeHtml(ipo.allotment || "TBA")}</li>
    <li>Listing: ${escapeHtml(ipo.listing || "TBA")}</li>
    <li>GMP: ${ipo.gmp != null ? `₹${escapeHtml(ipo.gmp)}` : "—"}</li>
    <li>Price band: ${
      ipo.priceMin != null && ipo.priceMax != null
        ? (ipo.priceMin === ipo.priceMax ? `₹${escapeHtml(ipo.priceMax)}` : `₹${escapeHtml(ipo.priceMin)}–₹${escapeHtml(ipo.priceMax)}`)
        : "—"
    }</li>
    <li>Lot size: ${escapeHtml(ipo.lot ?? "—")}</li>
    <li>Registrar: ${escapeHtml(ipo.registrar || "TBA")}</li>
  </ul>
  ${ipo.about ? `<p>${escapeHtml(ipo.about)}</p>` : ""}
  ${strengths ? `<h2>Strengths</h2><ul>${strengths}</ul>` : ""}
  ${risks ? `<h2>Risks</h2><ul>${risks}</ul>` : ""}
  <h2>FAQ</h2>
  ${faqHtml}
  <p>
    <a href="/gmp">Live GMP</a> ·
    <a href="/subscriptions">Subscription</a> ·
    <a href="/allotment">Allotment</a> ·
    <a href="/financials">Financials</a>
  </p>
</main>`.trim();
}

export { HOME_TITLE, HOME_DESCRIPTION, DEFAULT_SITE_NAME };
