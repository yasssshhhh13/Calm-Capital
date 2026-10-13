// NSE (official) source adapter.
//
// Pulls the exchange's own IPO feeds. NSE requires a real browser session
// (cookies from the homepage) before its /api endpoints return JSON, so we
// prime cookies with Playwright first. Covers mainboard + NSE Emerge (SME).
//
// NOTE: NSE frequently blocks datacenter / CI IPs. This adapter is best-effort:
// if it returns nothing, the consensus reconciler simply proceeds with the
// remaining sources.

import { toNumber } from "../lib/match.mjs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const API_URLS = [
  "https://www.nseindia.com/api/all-upcoming-issues?category=ipo",
  "https://www.nseindia.com/api/ipo-current-issue",
  "https://www.nseindia.com/api/public-past-issues",
];

function parseNseDate(s) {
  if (!s) return null;
  const str = String(s).trim();
  // ISO first
  let d = new Date(str);
  if (!isNaN(d.getTime()) && /\d{4}-\d{2}-\d{2}/.test(str)) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  // "21-Jul-2026"
  const m = str.match(/(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{4})/);
  if (m) {
    const months = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
    const mm = months[m[2].toLowerCase()];
    if (mm) return `${m[3]}-${mm}-${String(m[1]).padStart(2, "0")}`;
  }
  return null;
}

function parsePriceBand(s) {
  if (!s) return { priceMin: null, priceMax: null };
  const nums = String(s).replace(/,/g, "").match(/\d+(?:\.\d+)?/g);
  if (!nums) return { priceMin: null, priceMax: null };
  if (nums.length >= 2) return { priceMin: parseFloat(nums[0]), priceMax: parseFloat(nums[1]) };
  return { priceMin: parseFloat(nums[0]), priceMax: parseFloat(nums[0]) };
}

async function fetchJson(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    const text = await page.evaluate(() => document.body ? document.body.innerText : "");
    if (!text) return null;
    return JSON.parse(text);
  } catch (err) {
    console.warn(`[NSE] fetch failed (${url}):`, err.message);
    return null;
  }
}

function normalizeRecords(json) {
  // NSE responses come as an array, or { data: [...] }.
  const arr = Array.isArray(json) ? json : (json && Array.isArray(json.data) ? json.data : []);
  const out = [];
  for (const r of arr) {
    const name = r.companyName || r.company || r.name || r.issuerName;
    if (!name) continue;
    const band = parsePriceBand(r.issuePrice || r.priceBand || r.price);
    const issueSizeRaw = r.issueSize || r.totalIssueSize || r.issue_size;
    // NSE issueSize is often shares count or a "₹ X Cr" string - only trust the Cr form.
    let issueSize = null;
    if (typeof issueSizeRaw === "string" && /cr/i.test(issueSizeRaw)) {
      const cleaned = issueSizeRaw.replace(/,/g, "");
      const rupeeM = cleaned.match(/(?:₹|rs\.?|inr)?\s*([\d.]+)\s*(?:cr|crore)\b(?!\s*(?:eq(?:uity)?)?\s*shares)/i);
      if (rupeeM) issueSize = parseFloat(rupeeM[1]);
    }
    out.push({
      name,
      fields: {
        priceMin: band.priceMin,
        priceMax: band.priceMax,
        lot: toNumber(r.lotSize || r.lot || r.marketLot) ?? null,
        issueSize,
        open: parseNseDate(r.issueStartDate || r.startDate || r.openDate),
        close: parseNseDate(r.issueEndDate || r.endDate || r.closeDate),
        listing: parseNseDate(r.listingDate),
      },
      meta: { source: "nse", url: "https://www.nseindia.com/market-data/all-upcoming-issues-ofs", capturedAt: new Date().toISOString() },
    });
  }
  return out;
}

export async function fetchAll(browser) {
  const page = await browser.newPage({
    userAgent: UA,
    extraHTTPHeaders: {
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://www.nseindia.com/market-data/all-upcoming-issues-ofs",
    },
  });
  const byName = new Map();
  try {
    // Prime cookies from the homepage / IPO page before hitting the JSON API.
    await page.goto("https://www.nseindia.com/market-data/all-upcoming-issues-ofs", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    for (const url of API_URLS) {
      const json = await fetchJson(page, url);
      if (!json) continue;
      for (const rec of normalizeRecords(json)) {
        // Merge across endpoints; keep the first non-null value per field.
        const existing = byName.get(rec.name);
        if (!existing) { byName.set(rec.name, rec); continue; }
        for (const [k, v] of Object.entries(rec.fields)) {
          if (existing.fields[k] == null && v != null) existing.fields[k] = v;
        }
      }
    }
  } catch (err) {
    console.warn("[NSE] adapter failed:", err.message);
  } finally {
    await page.close().catch(() => {});
  }
  const out = [...byName.values()];
  console.log(`[NSE] collected ${out.length} records`);
  return out;
}
