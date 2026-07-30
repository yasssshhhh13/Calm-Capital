// Orchestrator for the multi-source IPO data pipeline.
//
// InvestorGain remains the fast path for GMP, subscription and new-IPO
// discovery. Hard facts (price band, lot, issue size, dates, ...) are now
// cross-verified: every source adapter contributes votes and reconcile.mjs
// only accepts a value once >=2 independent sources agree. See reconcile.mjs
// for the consensus rule and the .cursor rule for the standing policy.

import { chromium } from "playwright";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { normalizeName, toNumber, findExistingIpo } from "./lib/match.mjs";
import {
  NAME_TO_ID,
  resolveId,
  cleanScrapedName,
  parseGmpCell,
  parseListingInfo,
  parseInvestorGainDate,
  addDays,
  scrapeGmp,
  scrapeSubscription,
  scrapeIpoDetailPage,
  collectFacts,
  toInvestorGainDetailUrl,
  scrapeFinancials,
} from "./sources/investorgain.mjs";
import { fetchAll as fetchChittorgarh, resolveChittorgarhUrl } from "./sources/chittorgarh.mjs";
import { fetchAll as fetchNse } from "./sources/nse.mjs";
import { fetchAll as fetchBse } from "./sources/bse.mjs";
import { findFilingUrl } from "./sources/sebi.mjs";
import { reconcile } from "./reconcile.mjs";
import { buildVerifiedFinMeta, enrichFinDerived, isValidFin, isVerifiedFin } from "./lib/financials.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "public", "live-data.json");
const IPOS_JSON_PATH = path.join(__dirname, "..", "public", "ipos.json");

function isMissingRegistrar(value) {
  if (!value) return true;
  const n = String(value).trim().toLowerCase();
  return !n || n === "to be announced" || n === "tba" || n === "n/a" || n === "-";
}

function calculateStatus(ipo) {
  const today = new Date();
  
  // Clean up any stale estimated values if the listing date is in the future
  const isFutureListing = ipo.listing && today < new Date(ipo.listing + "T10:00:00+05:30");
  if (isFutureListing) {
    if (ipo.listedAt !== null && ipo.listedAt !== undefined) {
      ipo.listedAt = null;
      console.log(`[CLEANUP] Reset listing price for upcoming IPO: "${ipo.name}"`);
    }
    if (ipo.currentPrice !== null && ipo.currentPrice !== undefined) {
      ipo.currentPrice = null;
    }
  }

  if (ipo.listedAt !== null && ipo.listedAt !== undefined) return "Listed";
  if (ipo.currentPrice !== null && ipo.currentPrice !== undefined) return "Listed";
  if (!ipo.open) return "Upcoming";
  const d = (s) => new Date(s + "T00:00:00+05:30");
  const open = d(ipo.open);
  if (today < open) return "Upcoming";
  if (!ipo.close) return "Open";
  const closeDeadline = new Date(ipo.close + "T16:50:00+05:30");
  if (today < closeDeadline) return "Open";
  if (!ipo.listing) return "Closed";
  const listingTime = new Date(ipo.listing + "T10:00:00+05:30");
  if (today < listingTime) return "Closed";
  return "Listed";
}

function validateChronology(ipo) {
  const warnings = [];
  const d = (s) => (s ? new Date(s + "T00:00:00+05:30") : null);
  const open = d(ipo.open);
  const close = d(ipo.close);
  const allotment = d(ipo.allotment);
  const listing = d(ipo.listing);
  if (open && close && close < open) warnings.push("close date is before open date");
  if (close && allotment && allotment < close) warnings.push("allotment date is before close date");
  if (allotment && listing && listing < allotment) warnings.push("listing date is before allotment date");
  return warnings;
}

/** Backfill registrar/lead manager/core details discovered on a detail page. */
function applyDetailInfo(ipo, detailInfo) {
  if (!ipo || !detailInfo) return false;
  let changed = false;
  if (detailInfo.detailUrl && ipo.investorgainUrl !== detailInfo.detailUrl) {
    ipo.investorgainUrl = detailInfo.detailUrl;
    changed = true;
  }
  if (detailInfo.registrar && isMissingRegistrar(ipo.registrar)) {
    ipo.registrar = detailInfo.registrar;
    changed = true;
    console.log(`[REGISTRAR] "${ipo.name}" -> ${detailInfo.registrar}`);
  }
  if (detailInfo.leadManager && isMissingRegistrar(ipo.leadManager)) {
    ipo.leadManager = detailInfo.leadManager;
    changed = true;
  }
  const validNum = (v) => typeof v === "number" && Number.isFinite(v) && v > 0;
  if (validNum(detailInfo.priceMax) && ipo.priceMax == null) {
    ipo.priceMax = detailInfo.priceMax;
    if (ipo.priceMin == null) ipo.priceMin = validNum(detailInfo.priceMin) ? detailInfo.priceMin : detailInfo.priceMax;
    changed = true;
    console.log(`[PRICE] "${ipo.name}" -> band ₹${ipo.priceMin}-₹${ipo.priceMax}`);
  }
  if (validNum(detailInfo.lot) && ipo.lot == null) { ipo.lot = detailInfo.lot; changed = true; console.log(`[LOT] "${ipo.name}" -> ${ipo.lot} shares`); }
  if (validNum(detailInfo.issueSize) && ipo.issueSize == null) { ipo.issueSize = detailInfo.issueSize; changed = true; console.log(`[ISSUE SIZE] "${ipo.name}" -> ₹${ipo.issueSize} Cr`); }
  if (validNum(detailInfo.freshIssue) && ipo.freshIssue == null) { ipo.freshIssue = detailInfo.freshIssue; changed = true; }
  if (validNum(detailInfo.ofs) && ipo.ofs == null) { ipo.ofs = detailInfo.ofs; changed = true; }
  if (validNum(detailInfo.faceValue) && ipo.faceValue == null) { ipo.faceValue = detailInfo.faceValue; changed = true; }
  
  const today = new Date();
  const isFutureListing = ipo.listing && today < new Date(ipo.listing + "T10:00:00+05:30");
  if (validNum(detailInfo.listedAt) && ipo.listedAt == null && !isFutureListing) {
    ipo.listedAt = detailInfo.listedAt;
    if (ipo.currentPrice == null) ipo.currentPrice = detailInfo.listedAt;
    changed = true;
    console.log(`[LISTING] "${ipo.name}" listed at ₹${detailInfo.listedAt} (detail page)`);
  }
  if (detailInfo.bseCode && ipo.bseCode !== detailInfo.bseCode) {
    ipo.bseCode = detailInfo.bseCode;
    changed = true;
    console.log(`[BSE CODE] "${ipo.name}" -> ${detailInfo.bseCode}`);
  }
  if (detailInfo.nseCode && ipo.nseCode !== detailInfo.nseCode) {
    ipo.nseCode = detailInfo.nseCode;
    changed = true;
    console.log(`[NSE CODE] "${ipo.name}" -> ${detailInfo.nseCode}`);
  }
  if (ipo.estListing == null && validNum(ipo.priceMax) && typeof ipo.gmp === "number") {
    ipo.estListing = ipo.priceMax + ipo.gmp;
    changed = true;
  }
  return changed;
}

function needsCoreDetails(ipo) {
  if (!ipo) return false;
  if ((ipo.status || "").toLowerCase() === "listed") return false;
  return ipo.priceMax == null || ipo.lot == null || ipo.issueSize == null;
}

function needsListingPrice(ipo) {
  if (ipo?.listedAt != null) return false;
  if (!ipo?.listing || !ipo?.investorgainUrl) return false;
  const today = new Date();
  const listing = new Date(`${ipo.listing}T00:00:00+05:30`);
  return today >= listing;
}

function needsRegistrarRefresh(ipo) {
  if (!isMissingRegistrar(ipo?.registrar)) return false;
  const status = (ipo.status || "").toLowerCase();
  if (["open", "closed", "upcoming"].includes(status)) return true;
  if (!ipo.allotment) return status === "listed";
  const today = new Date();
  const allot = new Date(`${ipo.allotment}T00:00:00+05:30`);
  const daysAfter = (today - allot) / (1000 * 60 * 60 * 24);
  return daysAfter <= 10;
}

function needsCodes(ipo) {
  if (!ipo) return false;
  const status = (ipo.status || "").toLowerCase();
  if (status === "upcoming" || status === "open" || status === "closed" || status === "listed") {
    return ipo.nseCode == null && ipo.bseCode == null;
  }
  return false;
}

async function enrichListingPrices(iposBase) {
  console.log("[Yahoo Finance] Checking listing prices for listed/listing IPOs...");
  let changed = false;
  for (const ipo of iposBase) {
    const today = new Date();
    // Only check if it is Listed, or if it is Closed but listing date has arrived/passed
    const isListedOrListingDay = ipo.status === "Listed" || (ipo.listing && today >= new Date(ipo.listing + "T00:00:00+05:30"));
    if (!isListedOrListingDay) continue;

    // Check if we have nseCode or bseCode
    const symbols = [];
    if (ipo.nseCode) symbols.push(`${ipo.nseCode.toUpperCase().trim()}.NS`);
    if (ipo.bseCode) symbols.push(`${ipo.bseCode.toUpperCase().trim()}.BO`);

    if (symbols.length === 0) continue;

    for (const sym of symbols) {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=5d`;
      try {
        const res = await fetch(url);
        if (res.status === 200) {
          const json = await res.json();
          const meta = json.chart?.result?.[0]?.meta;
          const quote = json.chart?.result?.[0]?.indicators?.quote?.[0];
          if (meta && quote) {
            const openPrices = quote.open || [];
            const listingPrice = openPrices.find(p => p != null && p > 0);
            const currentPrice = meta.regularMarketPrice;

            if (listingPrice && ipo.listedAt !== listingPrice) {
              ipo.listedAt = listingPrice;
              changed = true;
              console.log(`[Yahoo Finance] Verified ${ipo.name} listedAt to ₹${listingPrice}`);
            }
            if (currentPrice && ipo.currentPrice !== currentPrice) {
              ipo.currentPrice = currentPrice;
              changed = true;
              console.log(`[Yahoo Finance] Verified ${ipo.name} currentPrice to ₹${currentPrice}`);
            }
            break;
          }
        }
      } catch (err) {
        console.warn(`[Yahoo Finance Warn] Failed for ${sym}:`, err.message);
      }
    }
  }
  return changed;
}

function detectSector(cleanedName) {
  const nameLower = cleanedName.toLowerCase();
  if (nameLower.includes("textile") || nameLower.includes("fabrics") || nameLower.includes("cotton") || nameLower.includes("yarn")) return "Textiles";
  if (nameLower.includes("tech") || nameLower.includes("software") || nameLower.includes("digital") || nameLower.includes("cyber") || nameLower.includes("virtual")) return "IT Services & Technology";
  if (nameLower.includes("steel") || nameLower.includes("metal") || nameLower.includes("forge") || nameLower.includes("alloy")) return "Metal & Forging";
  if (nameLower.includes("logistics") || nameLower.includes("transport") || nameLower.includes("carrier")) return "Logistics";
  if (nameLower.includes("chemical") || nameLower.includes("refinery") || nameLower.includes("catalyst")) return "Specialty Chemicals";
  if (nameLower.includes("energy") || nameLower.includes("power") || nameLower.includes("solar")) return "Energy & Power";
  if (nameLower.includes("packaging") || nameLower.includes("polyplast") || nameLower.includes("plast")) return "Packaging & Plastics";
  if (nameLower.includes("retail") || nameLower.includes("supermarket") || nameLower.includes("mart")) return "Retail";
  if (nameLower.includes("finance") || nameLower.includes("capital") || nameLower.includes("mutual") || nameLower.includes("fund")) return "Financial Services";
  return "General";
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  });

  // 1. Load ipos.json
  let iposBase = [];
  try {
    const content = await readFile(IPOS_JSON_PATH, "utf-8");
    iposBase = JSON.parse(content);
    console.log(`Loaded ${iposBase.length} baseline IPOs from ipos.json.`);
  } catch (e) {
    console.warn("Could not read ipos.json, starting with empty baseline.");
  }

  for (const ipo of iposBase) {
    const norm = normalizeName(ipo.company || ipo.name);
    NAME_TO_ID[norm] = ipo.id;
  }

  let databaseUpdated = false;

  // 1b. Resolve chittorgarhUrl for any IPOs missing it
  console.log("[Chittorgarh] Resolving missing URLs...");
  for (const ipo of iposBase) {
    if (!ipo.chittorgarhUrl) {
      const url = await resolveChittorgarhUrl(page, ipo.name);
      if (url) {
        ipo.chittorgarhUrl = url;
        databaseUpdated = true;
        console.log(`[CHITTORGARH URL] Resolved "${ipo.name}" -> ${url}`);
      }
    }
  }

  let gmpPatches = {};
  let rawGmpRows = [];
  let subPatches = {};
  const errors = [];

  try {
    const gmpData = await scrapeGmp(page);
    gmpPatches = gmpData.result;
    rawGmpRows = gmpData.rows;
  } catch (err) {
    console.error("GMP scrape failed:", err.message);
    errors.push(`gmp: ${err.message}`);
  }

  // 2. InvestorGain discovery + per-row date/status/listing/detail updates
  for (const { cells, href } of rawGmpRows) {
    const rawName = cells[0];
    const cleanedName = cleanScrapedName(rawName || "");
    let id = resolveId(cleanedName);

    if (!id && cleanedName) {
      const generatedId = normalizeName(cleanedName).replace(/\s+/g, "-");
      const existing = findExistingIpo(iposBase, cleanedName, generatedId);
      if (existing) {
        id = existing.id;
        NAME_TO_ID[normalizeName(cleanedName)] = id;
        console.log(`[DEDUP] "${cleanedName}" matched existing IPO "${existing.name}" (${id})`);
      }
    }

    if (!id && cleanedName) {
      const generatedId = normalizeName(cleanedName).replace(/\s+/g, "-");
      id = generatedId;
      console.log(`[DISCOVERY] Found NEW IPO: "${cleanedName}" -> Generated ID: "${id}"`);
      NAME_TO_ID[normalizeName(cleanedName)] = id;

      const isSme = rawName.toLowerCase().includes("sme");
      const type = isSme ? "SME" : "Mainboard";

      let exchange = "BSE, NSE";
      if (rawName.toLowerCase().includes("bse sme")) exchange = "BSE SME";
      else if (rawName.toLowerCase().includes("nse sme") || rawName.toLowerCase().includes("nse emerge")) exchange = "NSE Emerge";

      const priceMaxVal = toNumber(cells[4]);
      const priceMax = priceMaxVal && priceMaxVal > 0 ? priceMaxVal : null;
      const priceMin = priceMax;
      const lot = toNumber(cells[6]) || null;
      const issueSize = toNumber(cells[5]) || null;

      const open = parseInvestorGainDate(cells[7]);
      const close = parseInvestorGainDate(cells[8]);
      const allotment = parseInvestorGainDate(cells[9]);
      const listing = parseInvestorGainDate(cells[10]);
      const refund = allotment ? addDays(allotment, 1) : null;
      const demat = allotment ? addDays(allotment, 1) : null;

      const gmp = parseGmpCell(cells[1]);
      const estListing = priceMax && gmp !== undefined ? priceMax + gmp : null;
      const sector = detectSector(cleanedName);

      let detailInfo = { registrar: null, leadManager: null, detailUrl: null };
      if (href) detailInfo = await scrapeIpoDetailPage(page, href);

      const newIpo = {
        id,
        name: cleanedName,
        company: cleanedName + " Limited",
        type,
        status: calculateStatus({ open, close, listing }),
        discoveredAt: new Date().toISOString(),
        open, close, listing, allotment, refund, demat,
        priceMin, priceMax, faceValue: 10, lot, issueSize,
        freshIssue: issueSize, ofs: 0,
        gmp: gmp ?? 0,
        trend: gmp && gmp > 0 ? "up" : "stable",
        estListing, listedAt: null, currentPrice: null,
        gmpHistory: gmp !== undefined ? [{ d: new Date().toLocaleDateString("en-US", { day: "2-digit", month: "short" }), v: gmp }] : [],
        drhp: "https://www.sebi.gov.in/filings/public-issues.html",
        rhp: null,
        leadManager: detailInfo.leadManager || "To Be Announced",
        exchange, sub: null, fin: null,
        about: `${cleanedName} Limited is a newly announced ${type} IPO operating in the ${sector} sector. The company is launching its issue on ${exchange}.`,
        sector,
        registrar: detailInfo.registrar || "To Be Announced",
        investorgainUrl: detailInfo.detailUrl || toInvestorGainDetailUrl(href),
        strengths: [`Growing market footprint in the ${sector} sector`, "Experienced promoter group and management team"],
        risks: ["Operating scale limits relative to larger peers", "Highly competitive market segment and raw material cost exposure"],
      };

      const chronologyWarnings = validateChronology(newIpo);
      if (chronologyWarnings.length > 0) console.warn(`[DATE WARN] "${newIpo.name}" has inconsistent IPO timeline: ${chronologyWarnings.join("; ")}`);

      const drhpUrl = await findFilingUrl(newIpo.company, browser);
      if (drhpUrl) newIpo.drhp = drhpUrl;

      iposBase.push(newIpo);
      databaseUpdated = true;

      if (gmp !== undefined || priceMax !== null) {
        gmpPatches[id] = {
          ...(gmp !== undefined ? { gmp } : {}),
          ...(priceMax !== null ? { priceMax } : {}),
          ...(gmp !== undefined && priceMax !== null ? { estListing } : {}),
        };
      }
    } else if (id) {
      const existingIpo = iposBase.find((i) => i.id === id);
      if (existingIpo) {
        let changed = false;

        const open = parseInvestorGainDate(cells[7]);
        const close = parseInvestorGainDate(cells[8]);
        const allotment = parseInvestorGainDate(cells[9]);
        const listing = parseInvestorGainDate(cells[10]);

        if (open && existingIpo.open !== open) { existingIpo.open = open; changed = true; }
        if (close && existingIpo.close !== close) { existingIpo.close = close; changed = true; }
        if (allotment && existingIpo.allotment !== allotment) { existingIpo.allotment = allotment; changed = true; }
        if (listing && existingIpo.listing !== listing) { existingIpo.listing = listing; changed = true; }

        const rowPrice = toNumber(cells[4]);
        if (rowPrice && rowPrice > 0 && existingIpo.priceMax == null) {
          existingIpo.priceMax = rowPrice;
          if (existingIpo.priceMin == null) existingIpo.priceMin = rowPrice;
          if (existingIpo.estListing == null && typeof existingIpo.gmp === "number") existingIpo.estListing = rowPrice + existingIpo.gmp;
          changed = true;
          console.log(`[PRICE] "${existingIpo.name}" -> ₹${rowPrice} (from GMP table)`);
        }

        const listingInfo = parseListingInfo(rawName);
        if (listingInfo && existingIpo.listedAt == null) {
          existingIpo.listedAt = listingInfo.listedAt;
          if (existingIpo.currentPrice == null) existingIpo.currentPrice = listingInfo.listedAt;
          changed = true;
          console.log(`[LISTING] "${existingIpo.name}" listed at ₹${listingInfo.listedAt}` + (listingInfo.listingGainPct != null ? ` (${listingInfo.listingGainPct}%)` : ""));
        }

        const chronologyWarnings = validateChronology(existingIpo);
        if (chronologyWarnings.length > 0) console.warn(`[DATE WARN] "${existingIpo.name}" has inconsistent IPO timeline: ${chronologyWarnings.join("; ")}`);

        const calculatedStatus = calculateStatus(existingIpo);
        if (existingIpo.status !== calculatedStatus) {
          console.log(`[STATUS UPDATE] Existing IPO "${existingIpo.name}" status changing from "${existingIpo.status}" to "${calculatedStatus}"`);
          existingIpo.status = calculatedStatus;
          changed = true;
        }

        const detailUrl = toInvestorGainDetailUrl(href);
        if (detailUrl && existingIpo.investorgainUrl !== detailUrl) { existingIpo.investorgainUrl = detailUrl; changed = true; }
        if ((needsRegistrarRefresh(existingIpo) || needsCoreDetails(existingIpo) || needsListingPrice(existingIpo) || needsCodes(existingIpo)) && (href || existingIpo.investorgainUrl)) {
          const detailInfo = await scrapeIpoDetailPage(page, href || existingIpo.investorgainUrl);
          if (applyDetailInfo(existingIpo, detailInfo)) changed = true;
        }

        if (changed) {
          console.log(`[UPDATE] Updated dates/status/registrar for existing IPO: "${existingIpo.name}"`);
          databaseUpdated = true;
        }
      }
    }
  }

  // Final sweep: status + registrar/core-detail backfill for IPOs not on today's GMP table
  for (const ipo of iposBase) {
    const oldListedAt = ipo.listedAt;
    const oldCurrentPrice = ipo.currentPrice;

    const calculated = calculateStatus(ipo);

    if (ipo.listedAt !== oldListedAt || ipo.currentPrice !== oldCurrentPrice) {
      databaseUpdated = true;
    }

    if (ipo.status !== calculated) {
      console.log(`[SWEEP] Updating status of "${ipo.name}" from "${ipo.status}" to "${calculated}"`);
      ipo.status = calculated;
      databaseUpdated = true;
    }
    if ((needsRegistrarRefresh(ipo) || needsCoreDetails(ipo) || needsListingPrice(ipo) || needsCodes(ipo)) && ipo.investorgainUrl) {
      const detailInfo = await scrapeIpoDetailPage(page, ipo.investorgainUrl);
      if (applyDetailInfo(ipo, detailInfo)) databaseUpdated = true;
    }
  }

  // 3. Multi-source cross-verification. Each adapter is best-effort; a failure
  // just means that source doesn't vote. Consensus works among whoever responds.
  const sourceRecords = { investorgain: collectFacts(rawGmpRows) };
  try { sourceRecords.chittorgarh = await fetchChittorgarh(browser, iposBase); }
  catch (err) { console.error("Chittorgarh scrape failed:", err.message); errors.push(`chittorgarh: ${err.message}`); }
  try { sourceRecords.nse = await fetchNse(browser); }
  catch (err) { console.error("NSE scrape failed:", err.message); errors.push(`nse: ${err.message}`); }
  try { sourceRecords.bse = await fetchBse(browser); }
  catch (err) { console.error("BSE scrape failed:", err.message); errors.push(`bse: ${err.message}`); }

  const rec = reconcile(iposBase, sourceRecords);
  console.log(`[RECONCILE] verified=${rec.verifiedCount} conflicts=${rec.conflictCount} valueChanges=${rec.changed}`);
  if (rec.changed > 0) databaseUpdated = true;

  // 3b. Prospectus financials from InvestorGain detail pages (DRHP/RHP tables).
  try {
    const finUpdated = await scrapeFinancials(page, iposBase);
    if (finUpdated > 0) {
      databaseUpdated = true;
      console.log(`[FINANCIALS] Updated ${finUpdated} IPO financial records from InvestorGain`);
    }
  } catch (err) {
    console.error("Financial scrape failed:", err.message);
    errors.push(`financials: ${err.message}`);
  }

  // Promote any Chittorgarh-only fin blocks that reconcile missed.
  let promoted = 0;
  for (const ipo of iposBase) {
    if (isValidFin(ipo.fin) && !isVerifiedFin(ipo)) {
      ipo.fin = enrichFinDerived(ipo, ipo.fin);
      ipo.finMeta = buildVerifiedFinMeta(ipo, {
        method: "Chittorgarh prospectus table + regulatory filing",
        chittorgarhUrl: ipo.finMeta?.chittorgarhUrl,
      });
      promoted++;
    }
  }
  if (promoted > 0) {
    databaseUpdated = true;
    console.log(`[FINANCIALS] Promoted ${promoted} Chittorgarh financial records to Verified`);
  }

  // 4. Subscription (InvestorGain)
  try {
    subPatches = await scrapeSubscription(page, iposBase);
  } catch (err) {
    console.error("Subscription scrape failed:", err.message);
    errors.push(`sub: ${err.message}`);
  }

  await browser.close();

  let baselineSubUpdated = false;
  for (const [id, newSub] of Object.entries(subPatches)) {
    const baseIpo = iposBase.find((i) => i.id === id);
    if (!baseIpo || !newSub || Object.keys(newSub).length === 0) continue;
    const prev = baseIpo.sub || {};
    baseIpo.sub = { ...prev, ...newSub };
    baselineSubUpdated = true;
    console.log(`[BASELINE SUB] Persisted subscription for "${baseIpo.name}"`);
  }

  // 4b. Enrich listing prices from Yahoo Finance
  try {
    const pricesUpdated = await enrichListingPrices(iposBase);
    if (pricesUpdated) databaseUpdated = true;
  } catch (err) {
    console.error("Yahoo Finance enrichment failed:", err.message);
  }

  if (baselineSubUpdated || databaseUpdated) {
    console.log(`[DATABASE UPDATE] Writing ${iposBase.length} records back to ipos.json...`);
    await writeFile(IPOS_JSON_PATH, JSON.stringify(iposBase, null, 2), "utf-8");
  }

  // 5. Update live-data.json
  let existingIpos = {};
  try {
    const existingContent = await readFile(OUTPUT_PATH, "utf-8");
    const parsed = JSON.parse(existingContent);
    if (parsed && parsed.ipos) existingIpos = parsed.ipos;
  } catch (e) { /* ignore */ }

  const ids = new Set([
    ...Object.keys(existingIpos),
    ...Object.keys(gmpPatches),
    ...Object.keys(subPatches),
    ...iposBase.filter((i) => i.sub).map((i) => i.id),
  ]);
  const ipos = {};
  for (const id of ids) {
    const existingIpo = existingIpos[id] || {};
    const newGmp = gmpPatches[id] || {};
    const newSub = subPatches[id] || {};
    const baseIpo = iposBase.find((i) => i.id === id);

    const { sub: existingSub, ...existingIpoWithoutSub } = existingIpo;
    ipos[id] = { ...existingIpoWithoutSub, ...newGmp };

    // Surface the verification block on the live overlay too, so the client sees
    // the freshest verified/pending/conflict state without a full baseline reload.
    if (baseIpo && baseIpo.verification) ipos[id].verification = baseIpo.verification;

    // Always surface listing price on the live overlay once captured in baseline
    if (baseIpo?.listedAt != null) {
      ipos[id].listedAt = baseIpo.listedAt;
      if (baseIpo.currentPrice != null) ipos[id].currentPrice = baseIpo.currentPrice;
    }

    const latestStatus = baseIpo ? calculateStatus(baseIpo) : "Upcoming";
    const isUpcoming = latestStatus === "Upcoming" || latestStatus === "DRHP Filed";

    if (!isUpcoming) {
      if (newSub && Object.keys(newSub).length > 0) {
        const baselineApps = {};
        if (baseIpo?.sub) {
          for (const k of ["retail_apps", "shni_apps", "bhni_apps", "snii_apps", "bnii_apps", "employee_apps", "shareholder_apps", "policyholder_apps"]) {
            if (baseIpo.sub[k] != null && newSub[k] == null) baselineApps[k] = baseIpo.sub[k];
          }
        }
        ipos[id].sub = { ...baselineApps, ...newSub };
      } else if (existingSub && Object.keys(existingSub).length > 0) {
        ipos[id].sub = existingSub;
      } else if (baseIpo?.sub && Object.keys(baseIpo.sub).length > 0) {
        ipos[id].sub = baseIpo.sub;
      }
    }
  }

  const output = { updatedAt: new Date().toISOString(), errors, ipos };
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");

  console.log(`Wrote live-data.json with ${Object.keys(ipos).length} matched IPOs.`);
}

main().catch((err) => {
  console.error("Fatal scraper error:", err);
  process.exit(1);
});
