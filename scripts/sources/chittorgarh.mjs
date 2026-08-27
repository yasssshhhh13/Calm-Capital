// Chittorgarh source adapter.
//
// Chittorgarh is an independent IPO aggregator (NOT downstream of InvestorGain),
// which makes it a strong second opinion for hard facts: price band, lot size,
// issue size, fresh issue / OFS, face value, the timeline dates, and prospectus
// financials. It contributes votes to the consensus reconciler.

import { isSameCompanyName } from "../lib/match.mjs";
import { isVerifiedFin } from "../lib/financials.mjs";

// Report pages that list current + recent IPOs with links to each detail page.
const LIST_URLS = [
  { url: "https://www.chittorgarh.com/report/mainboard-ipo-list-in-india-bse-nse/84/", type: "Mainboard" },
  { url: "https://www.chittorgarh.com/report/sme-ipo-list-in-india-bse-nse-sme/85/", type: "SME" },
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Cap detail-page visits per run so the CI job stays bounded. We only deep-scrape
// IPOs that match one we already track.
// Deep-scrape enough tracked IPOs to cover active pipeline financials each run.
const MAX_DETAIL_VISITS = 80;

async function collectListLinks(page) {
  const links = [];
  for (const { url } of LIST_URLS) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1500);
      const rows = await page.$$eval("table tbody tr", (trs) =>
        trs
          .map((tr) => {
            const a = tr.querySelector("td a[href*='/ipo/']");
            if (!a) return null;
            return { name: a.innerText.trim(), href: a.getAttribute("href") };
          })
          .filter((r) => r && r.name)
      ).catch(() => []);
      for (const r of rows) links.push(r);
    } catch (err) {
      console.warn(`[Chittorgarh] list page failed (${url}):`, err.message);
    }
  }
  return links;
}

function toAbsolute(href) {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  return `https://www.chittorgarh.com${href.startsWith("/") ? href : `/${href}`}`;
}

export async function resolveChittorgarhUrl(page, companyName) {
  const query = companyName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, "+");
  const searchUrl = `https://www.chittorgarh.com/search.asp?q=${query}`;
  try {
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);
    return await page.evaluate((compName) => {
      const anchors = Array.from(document.querySelectorAll("a"));
      const ipoLinks = anchors.map(a => ({
        text: a.innerText.trim(),
        href: a.getAttribute("href")
      })).filter(x => x.href && (x.href.includes("/ipo/") || x.href.includes("/report/")));
      
      const nameNorm = compName.toLowerCase().replace(/[^a-z0-9]+/g, "");
      
      // Try to find matching link
      for (const l of ipoLinks) {
        if (!l.href.includes("/ipo/")) continue;
        const textNorm = l.text.toLowerCase().replace(/[^a-z0-9]+/g, "");
        if (textNorm.includes(nameNorm) || nameNorm.includes(textNorm)) {
          return l.href.startsWith("http") ? l.href : "https://www.chittorgarh.com" + l.href;
        }
      }
      for (const l of ipoLinks) {
        if (!l.href.includes("/ipo/")) continue;
        const pathNorm = l.href.toLowerCase().replace(/[^a-z0-9]+/g, "");
        if (pathNorm.includes(nameNorm)) {
          return l.href.startsWith("http") ? l.href : "https://www.chittorgarh.com" + l.href;
        }
      }
      return null;
    }, companyName);
  } catch (err) {
    console.warn(`[Chittorgarh Search Warn] Failed to search for ${companyName}:`, err.message);
  }
  return null;
}

async function scrapeDetail(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(1000);
    return await page.evaluate(() => {
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
        // Chittorgarh sometimes shows "aggregating up to X Cr" after a share count.
        const m2 = str.match(/agg[^0-9]*([\d.]+)\s*cr/i);
        if (m2) return parseFloat(m2[1]);
        return null;
      };
      const parseDate = (s) => {
        if (!s) return null;
        // e.g. "Mon, Jul 21, 2026" or "Jul 21, 2026" or "21 Jul 2026"
        const cleaned = String(s).replace(/^[A-Za-z]{3},\s*/, "").trim();
        const d = new Date(cleaned);
        if (!isNaN(d.getTime())) {
          const pad = (n) => String(n).padStart(2, "0");
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        }
        return null;
      };

      const fields = {
        priceMin: null, priceMax: null, lot: null, issueSize: null,
        freshIssue: null, ofs: null, faceValue: null,
        open: null, close: null, allotment: null, listing: null,
      };

      const rows = Array.from(document.querySelectorAll("tr"));
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll("th, td")).map((c) => c.innerText.trim());
        if (cells.length < 2) continue;
        const label = cells[0].toLowerCase().replace(/:$/, "");
        const value = cells.slice(1).join(" ").trim();
        if (!value) continue;

        if (fields.priceMax == null && (label.includes("price band") || label === "issue price" || label.includes("ipo price"))) {
          const nums = value.replace(/,/g, "").match(/\d+(?:\.\d+)?/g);
          if (nums && nums.length >= 2) { fields.priceMin = parseFloat(nums[0]); fields.priceMax = parseFloat(nums[1]); }
          else if (nums && nums.length === 1) { fields.priceMin = parseFloat(nums[0]); fields.priceMax = parseFloat(nums[0]); }
        }
        if (fields.lot == null && label.includes("lot size")) fields.lot = firstNum(value);
        if (fields.faceValue == null && label.includes("face value")) fields.faceValue = firstNum(value);
        if (fields.issueSize == null && label.includes("total issue size")) fields.issueSize = toCr(value);
        if (fields.issueSize == null && label === "issue size") fields.issueSize = toCr(value);
        if (fields.freshIssue == null && label.includes("fresh issue")) fields.freshIssue = toCr(value);
        if (fields.ofs == null && label.includes("offer for sale")) fields.ofs = toCr(value);

        if (fields.open == null && (label === "ipo date" || label.includes("ipo open") || label.includes("open date"))) {
          // "23 to 25 Jan, 2017" style range or a single date
          const rangeM = value.match(/([A-Za-z0-9 ,]+?)\s+to\s+([A-Za-z0-9 ,]+)/);
          if (rangeM) { fields.open = parseDate(rangeM[1]); fields.close = parseDate(rangeM[2]); }
          else fields.open = parseDate(value);
        }
        if (fields.close == null && (label.includes("ipo close") || label.includes("close date"))) fields.close = parseDate(value);
        if (fields.allotment == null && label.includes("allotment")) fields.allotment = parseDate(value);
        if (fields.listing == null && (label === "listing date" || label.includes("listed on") || label.includes("listing at date"))) fields.listing = parseDate(value);
      }

      // Prospectus financials — first data column = most recent period.
      const fin = {};
      let fy = null;
      for (const row of rows) {
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
                fy = `FY20${year}`;
              } else {
                const monthMatch = dateStr.match(/([a-zA-Z]{3,})/);
                const month = monthMatch ? monthMatch[1] : "";
                fy = `FY20${year} (${month})`;
              }
            }
          }
        }
        
        const val = firstNum(cells[1]);
        if (val == null) continue;
        if (fin.revenue == null && (label.includes("revenue") || label.includes("total income"))) fin.revenue = val;
        if (fin.pat == null && (label.includes("profit after tax") || label === "pat" || label.includes("net profit"))) fin.pat = val;
        if (fin.ebitda == null && label.includes("ebitda")) fin.ebitda = val;
        if (fin.netWorth == null && label.includes("net worth")) fin.netWorth = val;
        if (fin.debt == null && label.includes("total borrowing")) fin.debt = val;
        if (fin.roce == null && (label.includes("roce") || label.includes("return on capital employed"))) fin.roce = val;
      }

      // Scrape company website
      let website = null;
      const cards = Array.from(document.querySelectorAll('.card'));
      for (const card of cards) {
        const text = card.innerText || '';
        if (text.includes('Contact Details') && !text.includes('Registrar') && text.includes('Visit Website')) {
          const links = Array.from(card.querySelectorAll('a'));
          const webLink = links.find(a => a.innerText.trim() === 'Visit Website');
          if (webLink) {
            website = webLink.getAttribute('href');
            break;
          }
        }
      }

      // Scrape investor allocation/reservation table
      // Look for table with header "Investor Category" and "% of Net Issue"
      let allocation = null;
      for (const table of rows.length ? [] : []) { /* already have rows variable */ }
      // Re-scan all tables for the allocation one
      const allTables = Array.from(document.querySelectorAll('table'));
      for (const tbl of allTables) {
        const ths = Array.from(tbl.querySelectorAll('th')).map(th => th.innerText.trim().toLowerCase());
        const hasCategory = ths.some(h => h.includes('investor category') || h.includes('category'));
        const hasPctNet = ths.some(h => h.includes('% of net issue') || h.includes('net issue'));
        if (!hasCategory || !hasPctNet) continue;

        const pctColIdx = ths.findIndex(h => h.includes('% of net issue') || h.includes('net issue'));
        const catColIdx = ths.findIndex(h => h.includes('investor category') || h.includes('category'));
        if (pctColIdx === -1 || catColIdx === -1) continue;

        allocation = {};
        const tblRows = Array.from(tbl.querySelectorAll('tr'));
        for (const tr of tblRows) {
          const tds = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
          if (tds.length <= Math.max(pctColIdx, catColIdx)) continue;
          const cat = tds[catColIdx] || '';
          const pctStr = tds[pctColIdx] || '';
          if (!pctStr || !cat) continue;

          // Parse percentage
          const pctMatch = pctStr.match(/([\d.]+)\s*%/);
          if (!pctMatch) continue;
          const pct = parseFloat(pctMatch[1]);
          if (!Number.isFinite(pct) || pct <= 0) continue;

          // Normalise category name to a key
          const catLower = cat.toLowerCase();
          let key = null;
          if (catLower.startsWith('qib') || catLower === 'qualified institutional') key = 'qib';
          else if (catLower.startsWith('nii') || catLower.startsWith('hni') || catLower.startsWith('non-institutional') || catLower.startsWith('non institutional')) key = 'nii';
          else if (catLower.startsWith('retail')) key = 'retail';
          else if (catLower.startsWith('employee')) key = 'employee';
          else if (catLower.startsWith('shareholder')) key = 'shareholder';
          else if (catLower.startsWith('policyholder')) key = 'policyholder';
          // Skip anchor / sub-items (they start with '−' or '-')
          if (!key || cat.startsWith('−') || cat.startsWith('-') || cat.startsWith('\u2212')) continue;
        }
        if (allocation && Object.keys(allocation).length > 0) break;
        else allocation = null;
      }

      // Scrape live subscription table (QIB / NII / Retail / Total multiples)
      let sub = null;
      for (const tbl of allTables) {
        const ths = Array.from(tbl.querySelectorAll('th, td')).map(th => th.innerText.trim().toLowerCase());
        const hasCategory = ths.some(h => h.includes('category'));
        const hasSub = ths.some(h => h.includes('subscription'));
        if (!hasCategory || !hasSub) continue;

        const catColIdx = ths.findIndex(h => h.includes('category'));
        const subColIdx = ths.findIndex(h => h.includes('subscription'));
        if (catColIdx === -1 || subColIdx === -1 || catColIdx === subColIdx) continue;

        sub = {};
        const tblRows = Array.from(tbl.querySelectorAll('tr'));
        for (const tr of tblRows) {
          const tds = Array.from(tr.querySelectorAll('th, td')).map(td => td.innerText.trim());
          if (tds.length <= Math.max(subColIdx, catColIdx)) continue;
          const cat = tds[catColIdx] || '';
          const subStr = tds[subColIdx] || '';
          if (!subStr || !cat) continue;

          const numMatch = subStr.replace(/,/g, '').match(/-?[\d.]+/);
          if (!numMatch) continue;
          const val = parseFloat(numMatch[0]);
          if (!Number.isFinite(val) || val < 0) continue;

          const catLower = cat.toLowerCase();
          if (catLower.includes('qib')) sub.qib = val;
          else if (catLower.startsWith('bnii') || catLower.includes('> ₹10l') || catLower.includes('> 10l')) sub.bnii = val;
          else if (catLower.startsWith('snii') || catLower.includes('< ₹10l') || catLower.includes('< 10l')) sub.snii = val;
          else if (catLower.startsWith('nii') || catLower.startsWith('hni') || catLower.includes('non-institutional')) sub.nii = val;
          else if (catLower.startsWith('retail')) sub.retail = val;
          else if (catLower.startsWith('employee')) sub.employee = val;
          else if (catLower.startsWith('shareholder')) sub.shareholder = val;
          else if (catLower === 'total') sub.total = val;
        }
        if (Object.keys(sub).length > 0) break;
        else sub = null;
      }

      return { fields, fin: Object.keys(fin).length ? fin : null, website, allocation, sub, fy };
    });
  } catch (err) {
    console.warn(`[Chittorgarh] detail failed (${url}):`, err.message);
    return null;
  }
}

/**
 * @param {import('playwright').Browser} browser
 * @param {Array} iposBase - only deep-scrape IPOs we already track, to bound runtime.
 * @returns {Promise<Array<{name, fields, fin, website, meta}>>}
 */
export async function fetchAll(browser, iposBase) {
  const page = await browser.newPage({ userAgent: UA });
  const out = [];
  try {
    const links = await collectListLinks(page);
    console.log(`[Chittorgarh] collected ${links.length} IPO links`);

    // Keep only links matching an IPO we track, de-duplicated by url.
    const seen = new Set();
    const relevant = [];
    for (const l of links) {
      const match = iposBase.find((i) => isSameCompanyName(i.company || i.name, l.name));
      if (!match) continue;
      const url = toAbsolute(l.href);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      relevant.push({ name: l.name, url, match });
    }

    // Also add any tracked IPOs that have a chittorgarhUrl and are not in relevant
    for (const ipo of iposBase) {
      if (ipo.chittorgarhUrl && !seen.has(ipo.chittorgarhUrl)) {
        seen.add(ipo.chittorgarhUrl);
        relevant.push({ name: ipo.name, url: ipo.chittorgarhUrl, match: ipo });
      }
    }

    const priority = (entry) => {
      const ipo = entry.match;
      if (!ipo.lot || !ipo.open || !ipo.close || !ipo.priceMax) return 0;
      const st = ipo.status || "";
      if (st === "Open" || st === "Closed") return 0;
      if (st === "Upcoming") return 1;
      if (isVerifiedFin(ipo)) return 3;
      return 2;
    };
    relevant.sort((a, b) => priority(a) - priority(b));
    const toScrape = relevant.slice(0, MAX_DETAIL_VISITS);
    console.log(`[Chittorgarh] deep-scraping ${toScrape.length} tracked IPOs`);

    for (const l of toScrape) {
      const detail = await scrapeDetail(page, l.url);
      if (!detail) continue;
      out.push({
        name: l.name,
        fields: detail.fields,
        fin: detail.fin,
        fy: detail.fy,
        website: detail.website,
        allocation: detail.allocation || null,
        sub: detail.sub || null,
        meta: { source: "chittorgarh", url: l.url, capturedAt: new Date().toISOString() },
      });
    }
  } catch (err) {
    console.warn("[Chittorgarh] adapter failed:", err.message);
  } finally {
    await page.close().catch(() => {});
  }
  return out;
}
