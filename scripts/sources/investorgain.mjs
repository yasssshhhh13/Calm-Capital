// InvestorGain source adapter.
//
// Role in the multi-source pipeline: GMP, subscription multiples, listing price
// and new-IPO discovery (InvestorGain surfaces new issues fastest). It ALSO
// contributes hard facts (price band, lot, issue size, dates) as ONE voting
// source for the consensus reconciler in reconcile.mjs - it is no longer the
// sole source of truth for those facts.

import { NUM_RE, toNumber, normalizeName, isSameCompanyName, findExistingIpo } from "../lib/match.mjs";
import { isVerifiedFin } from "../lib/financials.mjs";

export const GMP_URL = "https://www.investorgain.com/report/live-ipo-gmp/331/all/";
export const SUB_URL = "https://www.investorgain.com/report/ipo-subscription-live/333/all/";

const TABLE_SELECTOR_CANDIDATES = [
  "table.gmp_tbl",
  "table#mainTable",
  "table.table_bordered",
  "table.dataTable",
  "table",
];

// Maps investorgain's display name (normalized) to this app's internal id.
export const NAME_TO_ID = {
  "knack packaging": "knack-packaging",
  "ic electricals": "ic-electricals",
  "kusumgar": "kusumgar",
  "kusumgar corporates": "kusumgar",
  "devson catalyst": "devson-catalyst",
  "happy steels": "happy-steel",
  "happy steel": "happy-steel",
  "sbi funds management": "sbi-funds-management",
  "sbi funds": "sbi-funds-management",
  "kratikal tech": "kratikal-tech",
  "teja engineering": "teja-engineering",
  "teja engineering industries": "teja-engineering",
  "vinit mobile": "vinit-mobile",
  "sampark india logistics": "sampark-india-logistics",
  "sampark logistics": "sampark-india-logistics",
  "atharva polyplast": "atharva-polyplast",
  "atharva poly plast": "atharva-polyplast",
  "seemax resources": "seemax-resources",
  "aastha spintex": "aastha-spintex",
  "adon agro": "adon-agro",
  "adon agro commodities": "adon-agro",
  "csm technologies": "csm-technologies",
  "caliber mining": "caliber-mining",
  "caliber mining logistics": "caliber-mining",
  "cube highways": "cube-highways",
  "cube highways trust": "cube-highways",
  "cube highways trust invit": "cube-highways",
  "sotefin bharat": "sotefin-bharat",
  "advit jewels": "advit-jewels",
  "laser power infra": "laser-power-infra",
  "laser power": "laser-power-infra",
  "alpine texworld": "alpine-texworld",
  "gulf lloyds": "gulf-lloyds",
  "millworks technologies": "millworks-technologies",
  "crazy snacks": "crazy-snacks",
};

export function resolveId(rawName) {
  const norm = normalizeName(rawName);
  if (NAME_TO_ID[norm]) return NAME_TO_ID[norm];
  for (const [key, id] of Object.entries(NAME_TO_ID)) {
    if (norm.includes(key) || key.includes(norm)) return id;
  }
  return null;
}

// Extends extractTable to return { cells, href }
export async function extractTable(page, label) {
  for (const sel of TABLE_SELECTOR_CANDIDATES) {
    const rows = await page
      .$$eval(sel + " tbody tr", (trs) =>
        trs
          .map((tr) => {
            const tds = Array.from(tr.querySelectorAll("td"));
            if (tds.length < 3) return null;
            const cells = tds.map((td) => td.innerText.trim());
            const linkEl = tds[0].querySelector("a");
            const href = linkEl ? linkEl.getAttribute("href") : null;
            return { cells, href };
          })
          .filter(Boolean)
      )
      .catch(() => []);
    if (rows.length > 3) {
      console.log(`[${label}] matched selector "${sel}" - ${rows.length} rows`);
      return rows;
    }
  }
  console.warn(`[${label}] WARNING: no table matched.`);
  return [];
}

export function parseGmpCell(text) {
  if (!text) return undefined;
  const m = text.match(/₹\s*(--|-?[\d,]+)/);
  if (!m || m[1] === "--") return undefined;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

// Once an IPO lists, InvestorGain appends the listing price to the name cell
// as "...IPO L@574.00 (17.42%)" (L@ = "Listed at"; the % is listing gain vs
// issue price). Returns { listedAt, listingGainPct } or null.
export function parseListingInfo(rawName) {
  if (!rawName) return null;
  const m = rawName.match(/L@\s*(-?[\d,]+(?:\.\d+)?)\s*(?:\(\s*(-?[\d,]+(?:\.\d+)?)\s*%\s*\))?/i);
  if (!m) return null;
  const price = parseFloat(m[1].replace(/,/g, ""));
  if (!Number.isFinite(price) || price <= 0) return null;
  const gainPct = m[2] != null ? parseFloat(m[2].replace(/,/g, "")) : null;
  return { listedAt: price, listingGainPct: Number.isFinite(gainPct) ? gainPct : null };
}

export function cleanScrapedName(raw) {
  if (!raw) return "";
  let cleaned = raw.split("\n")[0].trim();
  cleaned = cleaned.replace(/\s*(BSE SME|NSE SME|BSE|NSE|IPO)?[UOCL]?\s*L?@\s*-?[\d,.]+\s*\(?[-\d,.%]*\)?/i, "");
  cleaned = cleaned.replace(/\s*(BSE SME|NSE SME|BSE|NSE|IPO)[UOCL]?\s*$/i, "");
  cleaned = cleaned.replace(/\s+[UOCL]$/i, "");
  return cleaned.trim();
}

export function parseInvestorGainDate(dateText) {
  if (!dateText || dateText === "-" || dateText.includes("--") || dateText.toLowerCase().includes("tbd") || dateText.toLowerCase().includes("tba")) return null;
  const dateLine = dateText.split("\n")[0].trim();
  const parts = dateLine.split("-");
  if (parts.length < 2) return null;
  const day = parseInt(parts[0], 10);
  const monthStr = parts[1].toLowerCase();
  const months = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
  const month = months[monthStr.slice(0, 3)];
  if (!month) return null;
  let year = new Date().getFullYear();
  if (parts.length >= 3) {
    const y = parseInt(parts[2], 10);
    if (y < 100) year = 2000 + y;
    else year = y;
  }
  const pad = (n) => String(n).padStart(2, "0");
  return `${year}-${month}-${pad(day)}`;
}

export function addDays(dateStr, days) {
  if (!dateStr) return null;
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    const pad = (n) => String(n).padStart(2, "0");
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  } catch {
    return null;
  }
}

function isMissingRegistrar(value) {
  if (!value) return true;
  const n = String(value).trim().toLowerCase();
  return !n || n === "to be announced" || n === "tba" || n === "n/a" || n === "-";
}

export function cleanDetailField(value) {
  if (!value) return null;
  let v = String(value)
    .replace(/\s+/g, " ")
    .replace(/\*\*/g, "")
    .split(/Website:|Phone:|Email:|Last Updated/i)[0]
    .trim();
  v = v.replace(/\s*(Lead Manager|Allotment Status|DRHP|RHP).*$/i, "").trim();
  if (!v || isMissingRegistrar(v)) return null;
  return v;
}

export function toAbsoluteInvestorGainUrl(href) {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  return `https://www.investorgain.com${href.startsWith("/") ? href : `/${href}`}`;
}

/** Convert GMP/subscription hrefs into the stable IPO detail page URL. */
export function toInvestorGainDetailUrl(href) {
  const abs = toAbsoluteInvestorGainUrl(href);
  if (!abs) return null;
  const m =
    abs.match(/\/(?:gmp|subscription)\/([^/]+)\/(\d+)\/?/i) ||
    abs.match(/\/ipo\/([^/]+)\/(\d+)\/?/i);
  if (m) return `https://www.investorgain.com/ipo/${m[1]}/${m[2]}/`;
  return abs;
}

export async function scrapeIpoDetailPage(page, href) {
  const url = toInvestorGainDetailUrl(href) || toAbsoluteInvestorGainUrl(href);
  const empty = {
    registrar: null, leadManager: null, detailUrl: url,
    priceMin: null, priceMax: null, lot: null, issueSize: null, freshIssue: null, ofs: null, faceValue: null,
    listedAt: null, bseCode: null, nseCode: null,
  };
  if (!url) return { ...empty, detailUrl: null };
  try {
    console.log(`[DETAIL SCRAPE] Fetching details from: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(1200);

    const info = await page.evaluate(() => {
      const result = {
        registrar: null, leadManager: null,
        priceMin: null, priceMax: null, lot: null, issueSize: null, freshIssue: null, ofs: null, faceValue: null,
        listedAt: null, bseCode: null, nseCode: null,
      };
      const clean = (v) => {
        if (!v) return null;
        let s = String(v).replace(/\s+/g, " ").trim();
        s = s.split(/Website:|Phone:|Email:|Last Updated/i)[0].trim();
        s = s.replace(/\s*(Lead Manager|Allotment Status|DRHP|RHP).*$/i, "").trim();
        const low = s.toLowerCase();
        if (!s || low === "to be announced" || low === "tba" || low === "-" || low === "n/a") return null;
        return s;
      };
      const firstNum = (s) => {
        if (s == null) return null;
        const m = String(s).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
        return m ? parseFloat(m[0]) : null;
      };
      const toCr = (s) => {
        if (s == null) return null;
        const str = String(s).replace(/,/g, "");
        const m = str.match(/([\d.]+)\s*(?:cr|crore|crores)\b/i);
        if (m) return parseFloat(m[1]);
        return firstNum(str);
      };

      const rows = Array.from(document.querySelectorAll("tr"));
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll("th, td")).map((c) => c.innerText.trim());
        if (cells.length < 2) continue;
        const label = cells[0].toLowerCase().replace(/:$/, "").trim();
        const value = cells.slice(1).join(" ").trim();
        if (!value) continue;

        if ((label === "registrar" || label.includes("registrar")) && !result.registrar) result.registrar = clean(value);
        if ((label.includes("lead manager") || label.includes("book running")) && !result.leadManager) result.leadManager = clean(value);

        if (result.priceMax == null && (label.includes("price band") || label === "price" || label.includes("ipo price") || label.includes("issue price"))) {
          const nums = value.replace(/,/g, "").match(/\d+(?:\.\d+)?/g);
          if (nums && nums.length >= 2) { result.priceMin = parseFloat(nums[0]); result.priceMax = parseFloat(nums[1]); }
          else if (nums && nums.length === 1) { result.priceMin = parseFloat(nums[0]); result.priceMax = parseFloat(nums[0]); }
        }
        if (result.lot == null && (label.includes("lot size") || label.includes("market lot") || label === "lot")) result.lot = firstNum(value);
        if (result.issueSize == null && label.includes("issue size")) result.issueSize = toCr(value);
        if (result.freshIssue == null && label.includes("fresh issue")) result.freshIssue = toCr(value);
        if (result.ofs == null && (label.includes("offer for sale") || label === "ofs")) result.ofs = toCr(value);
        if (result.faceValue == null && label.includes("face value")) result.faceValue = firstNum(value);
        if (result.listedAt == null && (label.includes("listing price") || label.includes("listed at") || label.includes("list price"))) {
          result.listedAt = firstNum(value);
        }
        if (result.bseCode == null && (label.includes("bse code") || label === "bse script code" || label.includes("bse scrip code"))) {
          result.bseCode = clean(value);
        }
        if (result.nseCode == null && (label.includes("nse code") || label === "nse symbol" || label.includes("nse script code") || label.includes("nse scrip code"))) {
          result.nseCode = clean(value);
        }
      }

      const bodyText = document.body ? document.body.innerText : "";
      if (!result.registrar) { const m = bodyText.match(/Registrar(?:\s+to\s+the\s+[Ii]ssue)?\s*[:\n]\s*([^\n]+)/); if (m) result.registrar = clean(m[1]); }
      if (!result.leadManager) { const m = bodyText.match(/Lead Manager[s]?\s*[:\n]\s*([^\n]+)/); if (m) result.leadManager = clean(m[1]); }
      if (result.listedAt == null) {
        const m = bodyText.match(/Listing Price\s*[:\n]\s*₹?\s*([\d,]+(?:\.\d+)?)/i);
        if (m) result.listedAt = parseFloat(m[1].replace(/,/g, ""));
      }

      return result;
    });

    return {
      registrar: cleanDetailField(info.registrar),
      leadManager: cleanDetailField(info.leadManager),
      detailUrl: url,
      priceMin: info.priceMin, priceMax: info.priceMax, lot: info.lot,
      issueSize: info.issueSize, freshIssue: info.freshIssue, ofs: info.ofs, faceValue: info.faceValue,
      listedAt: info.listedAt,
      bseCode: info.bseCode ? String(info.bseCode).trim() : null,
      nseCode: info.nseCode ? String(info.nseCode).trim() : null,
    };
  } catch (err) {
    console.warn(`[DETAIL WARN] Failed to scrape detail page:`, err.message);
    return { ...empty };
  }
}

export async function scrapeGmp(page) {
  await page.goto(GMP_URL, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);
  const rows = await extractTable(page, "gmp");

  const result = {};
  for (const { cells } of rows) {
    const rawName = cells[0];
    const id = resolveId(cleanScrapedName(rawName || ""));
    if (!id) continue;

    const gmp = parseGmpCell(cells[1]);
    const priceRaw = toNumber(cells[4]);
    const price = priceRaw && priceRaw > 0 ? priceRaw : undefined;
    const listing = parseListingInfo(rawName);
    if (gmp === undefined && price === undefined && !listing) continue;

    result[id] = {
      ...(gmp !== undefined ? { gmp } : {}),
      ...(price !== undefined ? { priceMax: price } : {}),
      ...(gmp !== undefined && price !== undefined ? { estListing: price + gmp } : {}),
      ...(listing ? { listedAt: listing.listedAt, currentPrice: listing.listedAt } : {}),
    };
  }
  return { result, rows };
}

/**
 * Build InvestorGain fact records (one per matched IPO) for the reconciler.
 * These are votes in the consensus process, NOT authoritative on their own.
 */
export function collectFacts(rawGmpRows) {
  const facts = [];
  for (const { cells } of rawGmpRows) {
    const rawName = cells[0];
    const name = cleanScrapedName(rawName || "");
    if (!name) continue;
    const priceMax = toNumber(cells[4]);
    const fields = {
      priceMax: priceMax && priceMax > 0 ? priceMax : null,
      issueSize: toNumber(cells[5]) ?? null,
      lot: toNumber(cells[6]) ?? null,
      open: parseInvestorGainDate(cells[7]),
      close: parseInvestorGainDate(cells[8]),
      allotment: parseInvestorGainDate(cells[9]),
      listing: parseInvestorGainDate(cells[10]),
    };
    facts.push({ name, fields, meta: { source: "investorgain", url: GMP_URL, capturedAt: new Date().toISOString() } });
  }
  return facts;
}

export async function scrapeSubscription(page, iposBase) {
  await page.goto(SUB_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3000);

  try {
    const allClicked = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll("a, button, label, span, li, div"));
      const allBtn = candidates.find((el) => {
        const t = (el.textContent || "").trim().toLowerCase();
        return t === "all" || t.startsWith("all ");
      });
      if (allBtn) { allBtn.click(); return true; }
      return false;
    });
    if (allClicked) {
      console.log("[Subscription] Switched filter to All (Open+Closed+Listed)");
      await page.waitForTimeout(2500);
    }
  } catch (err) {
    console.warn("[Subscription] Could not switch to All filter:", err.message);
  }

  const rows = await extractTable(page, "sub");
  const result = {};

  for (const { cells, href } of rows) {
    const rawName = cleanScrapedName(cells[0] || "");
    let id = resolveId(rawName);
    if (!id && rawName) {
      const generatedId = normalizeName(rawName).replace(/\s+/g, "-");
      const existing = findExistingIpo(iposBase, rawName, generatedId);
      if (existing) id = existing.id;
    }
    if (!id) continue;

    const ipo = iposBase.find((i) => i.id === id);
    if (!ipo) continue;
    if (!ipo.open) continue;

    const today = new Date();
    const openDate = new Date(ipo.open + "T00:00:00+05:30");
    if (today < openDate) continue;
    if (!href) continue;

    const match = href.match(/\/gmp\/([^/]+)\/(\d+)\/?/) || href.match(/\/subscription\/([^/]+)\/(\d+)\/?/);
    if (!match) continue;

    const slug = match[1];
    const numericId = match[2];
    const subPageUrl = `https://www.investorgain.com/subscription/${slug}/${numericId}/`;

    console.log(`[Subscription] Fetching detailed subscription for ${id} from: ${subPageUrl}`);
    try {
      await page.goto(subPageUrl, { waitUntil: "load", timeout: 20000 });
      await page.waitForTimeout(1500);

      const parsed = await page.evaluate(() => {
        const out = { shares: {}, apps: {} };
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const el of scripts) {
          try {
            const data = JSON.parse(el.innerText);
            if (data && data["@type"] === "Dataset" && Array.isArray(data.variableMeasured)) {
              const findValue = (name) => {
                const prop = data.variableMeasured.find((p) => p.name === name);
                return prop ? parseFloat(prop.value) : undefined;
              };
              out.shares.overall = findValue("Total Subscription");
              out.shares.qib = findValue("QIB Subscription");
              out.shares.snii = findValue("sNII Subscription") || findValue("Small NII Subscription");
              out.shares.bnii = findValue("bNII Subscription") || findValue("Big NII Subscription");
              out.shares.hni = findValue("NII Subscription");
              out.shares.retail = findValue("RII Subscription");
              out.shares.employee = findValue("Employee Subscription") || findValue("EMP Subscription") || findValue("Employee Individual Subscription");
              out.shares.shareholder = findValue("Shareholder Subscription") || findValue("SHR Subscription") || findValue("Share Holder Subscription");
              out.shares.policyholder = findValue("Policyholder Subscription") || findValue("POL Subscription") || findValue("Policy Holder Subscription");
            }
          } catch { /* ignore */ }
        }

        const tables = Array.from(document.querySelectorAll("table"));
        for (const table of tables) {
          const headers = Array.from(table.querySelectorAll("th")).map((th) => th.innerText.trim().toLowerCase());
          if (!headers.length) continue;

          const catIdx = headers.findIndex((h) => h.includes("category") || h.includes("investor") || h === "quota");
          if (catIdx < 0) continue;

          // 1. Demand/Applications/Odds table
          const appsIdx = headers.findIndex((h) => h.includes("application") || h.includes("apps") || h.includes("allotment chance") || h.includes("odds"));
          if (appsIdx >= 0) {
            for (const tr of Array.from(table.querySelectorAll("tbody tr"))) {
              const tds = Array.from(tr.querySelectorAll("td"));
              if (!tds.length) continue;
              const cat = tds[catIdx]?.innerText.trim().toLowerCase() || "";
              const appsRaw = tds[appsIdx]?.innerText || "";
              const m = appsRaw.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
              if (!m) continue;
              const appsVal = parseFloat(m[1]);
              if (!Number.isFinite(appsVal) || appsVal <= 0) continue;

              if (cat.includes("retail") || cat.includes("rii")) out.apps.retail_apps = appsVal;
              else if (cat.includes("snii") || cat.includes("s-nii") || cat.includes("small nii") || cat.includes("shni") || cat.includes("s-hni")) out.apps.shni_apps = appsVal;
              else if (cat.includes("bnii") || cat.includes("b-nii") || cat.includes("big nii") || cat.includes("bhni") || cat.includes("b-hni")) out.apps.bhni_apps = appsVal;
              else if (cat.includes("employee") || cat === "emp") out.apps.employee_apps = appsVal;
              else if (cat.includes("shareholder") || cat === "shr") out.apps.shareholder_apps = appsVal;
              else if (cat.includes("policyholder") || cat === "pol") out.apps.policyholder_apps = appsVal;
            }
          }

          // 2. Share subscription multiplier table
          const subTimesIdx = headers.findIndex((h) => h.includes("subscription") || h.includes("times") || h === "sub" || h === "times subscribed");
          if (subTimesIdx >= 0) {
            for (const tr of Array.from(table.querySelectorAll("tbody tr"))) {
              const tds = Array.from(tr.querySelectorAll("td"));
              if (!tds.length) continue;
              const cat = tds[catIdx]?.innerText.trim().toLowerCase() || "";
              const subTimesRaw = tds[subTimesIdx]?.innerText || "";
              const m = subTimesRaw.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
              if (!m) continue;
              const subVal = parseFloat(m[1]);
              if (!Number.isFinite(subVal)) continue;

              if (cat.includes("retail") || cat.includes("rii")) {
                if (out.shares.retail === undefined) out.shares.retail = subVal;
              } else if (cat.includes("snii") || cat.includes("s-nii") || cat.includes("small nii")) {
                if (out.shares.snii === undefined) out.shares.snii = subVal;
              } else if (cat.includes("bnii") || cat.includes("b-nii") || cat.includes("big nii")) {
                if (out.shares.bnii === undefined) out.shares.bnii = subVal;
              } else if (cat.includes("qib")) {
                if (out.shares.qib === undefined) out.shares.qib = subVal;
              } else if (cat.includes("nii") || cat.includes("hni") || cat.includes("non-institutional") || cat.includes("non institutional")) {
                if (out.shares.hni === undefined) out.shares.hni = subVal;
              } else if (cat.includes("employee") || cat === "emp") {
                if (out.shares.employee === undefined) out.shares.employee = subVal;
              } else if (cat.includes("shareholder") || cat === "shr") {
                if (out.shares.shareholder === undefined) out.shares.shareholder = subVal;
              } else if (cat.includes("policyholder") || cat === "pol") {
                if (out.shares.policyholder === undefined) out.shares.policyholder = subVal;
              } else if (cat === "total" || cat.includes("overall")) {
                if (out.shares.overall === undefined) out.shares.overall = subVal;
              }
            }
          }
        }
        return out;
      });

      const s = parsed.shares || {};
      const a = parsed.apps || {};
      if ([s.qib, s.hni, s.retail, s.overall, s.snii, s.bnii, s.employee, s.shareholder, s.policyholder].every((v) => v === undefined)) continue;

      result[id] = {
        ...(s.overall !== undefined ? { overall: s.overall } : {}),
        ...(s.qib !== undefined ? { qib: s.qib } : {}),
        ...(s.snii !== undefined ? { snii: s.snii } : {}),
        ...(s.bnii !== undefined ? { bnii: s.bnii } : {}),
        ...(s.hni !== undefined ? { hni: s.hni } : {}),
        ...(s.retail !== undefined ? { retail: s.retail } : {}),
        ...(s.employee !== undefined ? { employee: s.employee } : {}),
        ...(s.shareholder !== undefined ? { shareholder: s.shareholder } : {}),
        ...(s.policyholder !== undefined ? { policyholder: s.policyholder } : {}),
        ...(a.retail_apps !== undefined ? { retail_apps: a.retail_apps } : {}),
        ...(a.shni_apps !== undefined ? { shni_apps: a.shni_apps } : {}),
        ...(a.bhni_apps !== undefined ? { bhni_apps: a.bhni_apps } : {}),
        ...(a.employee_apps !== undefined ? { employee_apps: a.employee_apps } : {}),
        ...(a.shareholder_apps !== undefined ? { shareholder_apps: a.shareholder_apps } : {}),
        ...(a.policyholder_apps !== undefined ? { policyholder_apps: a.policyholder_apps } : {}),
      };
      console.log(`[Subscription] Successfully scraped for ${id}:`, result[id]);
    } catch (err) {
      console.error(`[Subscription] Failed to scrape sub page for ${id}:`, err.message);
    }
  }
  return result;
}

const FIN_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const MAX_FIN_DETAIL = 40;

/** Scrape restated financial tables from InvestorGain IPO detail pages. */
export async function scrapeFinancials(page, iposBase) {
  const targets = iposBase.filter((ipo) => {
    if (isVerifiedFin(ipo)) return false;
    if (!ipo.investorgainUrl) return false;
    const st = ipo.status || "";
    return st === "Open" || st === "Closed" || st === "Upcoming" || st === "Listed";
  });

  const priority = (ipo) => {
    const st = ipo.status || "";
    if (st === "Open" || st === "Closed") return 0;
    if (st === "Upcoming") return 1;
    return 2;
  };
  targets.sort((a, b) => priority(a) - priority(b));

  let updated = 0;
  for (const ipo of targets.slice(0, MAX_FIN_DETAIL)) {
    try {
      await page.goto(ipo.investorgainUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1200);
      const parsed = await page.evaluate(() => {
        const firstNum = (s) => {
          if (s == null) return null;
          const m = String(s).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
          return m ? parseFloat(m[0]) : null;
        };
        const fin = {};
        let fy = null;
        const tables = Array.from(document.querySelectorAll("table"));
        for (const table of tables) {
          const header = table.innerText.toLowerCase();
          if (!header.includes("total income") && !header.includes("profit after tax")) continue;
          
          let tableFy = null;
          for (const row of Array.from(table.querySelectorAll("tr"))) {
            const cells = Array.from(row.querySelectorAll("th, td")).map((c) => c.innerText.trim());
            if (cells.length < 2) continue;
            const label = cells[0].toLowerCase();
            
            // Extract fiscal year from date headers
            if (label.includes("particulars") || label.includes("period ended") || label.includes("year/period ended") || label === "for") {
              const dateStr = cells[1];
              if (dateStr) {
                const yearMatch = dateStr.match(/(?:20)?(\d{2})$/) || dateStr.match(/20(\d{2})\b/);
                if (yearMatch) {
                  const year = parseInt(yearMatch[1]);
                  const isMarch = /mar/i.test(dateStr) || /\/03\//.test(dateStr);
                  if (isMarch) {
                    tableFy = `FY20${year}`;
                  } else {
                    const monthMatch = dateStr.match(/([a-zA-Z]{3,})/);
                    const month = monthMatch ? monthMatch[1] : "";
                    tableFy = `FY20${year} (${month})`;
                  }
                }
              }
            }
            
            const val = firstNum(cells[1]);
            if (val == null) continue;
            if (fin.revenue == null && (label.includes("total income") || label.includes("revenue"))) fin.revenue = val;
            if (fin.pat == null && (label.includes("profit after tax") || label === "pat")) fin.pat = val;
            if (fin.ebitda == null && label.includes("ebitda")) fin.ebitda = val;
            if (fin.netWorth == null && label.includes("net worth")) fin.netWorth = val;
            if (fin.debt == null && label.includes("total borrowing")) fin.debt = val;
            if (fin.roce == null && (label.includes("roce") || label.includes("return on capital employed"))) fin.roce = val;
          }
          if (tableFy) fy = tableFy;
          if (fin.revenue != null && fin.pat != null) break;
        }
        // KPI block: EPS / ROE / ROCE
        const body = document.body.innerText || "";
        const epsM = body.match(/EPS\s*\(₹\)\s*\|\s*([\d.]+)/i) || body.match(/EPS\s*\(₹\)[^\d]*([\d.]+)/i);
        if (epsM) fin.eps = parseFloat(epsM[1]);
        const roeM = body.match(/ROE\s*\|\s*([\d.]+)\s*%/i) || body.match(/ROE[^\d]*([\d.]+)\s*%/i);
        if (roeM) fin.roe = parseFloat(roeM[1]);
        const roceM = body.match(/ROCE\s*\|\s*([\d.]+)\s*%/i) || body.match(/ROCE[^\d]*([\d.]+)\s*%/i);
        if (roceM) fin.roce = parseFloat(roceM[1]);
        
        if (fy) fin.fy = fy;
        return Object.keys(fin).length ? fin : null;
      });

      if (!parsed || parsed.pat == null || parsed.revenue == null || parsed.pat > parsed.revenue) continue;

      const { fy, ...finData } = parsed;
      ipo.fin = finData;
      ipo.finMeta = {
        sourceDoc: ipo.rhp ? "RHP" : "DRHP",
        sourceUrl: ipo.rhp || ipo.drhp || ipo.investorgainUrl,
        fy: fy || ipo.finMeta?.fy || "FY2026",
        pageNum: "Financials",
        verifiedAt: new Date().toISOString(),
        method: "InvestorGain prospectus table + DRHP/RHP",
        status: "Verified",
      };
      if (ipo.priceMax && ipo.fin.eps && ipo.fin.eps > 0 && !ipo.fin.pe) {
        ipo.fin.pe = Math.round((ipo.priceMax / ipo.fin.eps) * 100) / 100;
      }
      updated++;
      console.log(`[Financials] Scraped ${ipo.id}: rev=${ipo.fin.revenue} pat=${ipo.fin.pat}`);
    } catch (err) {
      console.warn(`[Financials] Failed for ${ipo.id}:`, err.message);
    }
  }
  return updated;
}
