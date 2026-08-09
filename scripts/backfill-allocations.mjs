/**
 * backfill-allocations.mjs
 * 
 * Scrapes Chittorgarh for each active Mainboard IPO that is missing an
 * `allocation` field in ipos.json, and writes the correct QIB/NII/Retail
 * breakdown back to the file.
 * 
 * Run: node scripts/backfill-allocations.mjs
 */
import { chromium } from "playwright";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IPOS_JSON_PATH = path.resolve(__dirname, "../public/ipos.json");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normName(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isSameName(a, b) {
  const na = normName(a), nb = normName(b);
  if (na === nb) return true;
  const shorter = na.length < nb.length ? na : nb;
  const longer  = na.length < nb.length ? nb : na;
  if (shorter.length >= 5 && longer.includes(shorter)) return true;
  return false;
}

/**
 * Search for the Chittorgarh URL for a given IPO name.
 */
async function findChittorgarhUrl(page, companyName) {
  const slug = companyName.toLowerCase()
    .replace(/\s+limited$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const guessUrl = `https://www.chittorgarh.com/ipo/${slug}-ipo/`;
  
  // Try the list page first to get an exact link
  try {
    const query = normName(companyName).slice(0, 15);
    const searchUrl = `https://www.chittorgarh.com/report/ipo-in-india-list-main-board-sme/82/mainboard/`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    await sleep(2000);
    const found = await page.evaluate((name) => {
      const links = Array.from(document.querySelectorAll("a[href*='/ipo/']"));
      const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
      const nameNorm = norm(name);
      for (const a of links) {
        const t = norm(a.innerText || "");
        const h = a.getAttribute("href") || "";
        if (t.length > 3 && (nameNorm.includes(t) || t.includes(nameNorm.slice(0, 8)))) {
          return h.startsWith("http") ? h : "https://www.chittorgarh.com" + h;
        }
      }
      return null;
    }, companyName);
    if (found) return found;
  } catch (e) {
    console.warn(`  [search fail] ${e.message}`);
  }
  return null;
}

/**
 * Scrape the allocation table from a Chittorgarh IPO detail page.
 */
async function scrapeAllocation(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await sleep(2500);
    return await page.evaluate(() => {
      const allTables = Array.from(document.querySelectorAll("table"));
      for (const tbl of allTables) {
        const ths = Array.from(tbl.querySelectorAll("th")).map(th => th.innerText.trim().toLowerCase());
        const hasCategory = ths.some(h => h.includes("investor category") || h.includes("category"));
        const hasPctNet = ths.some(h => h.includes("% of net issue") || h.includes("net issue"));
        if (!hasCategory || !hasPctNet) continue;

        const pctColIdx = ths.findIndex(h => h.includes("% of net issue") || h.includes("net issue"));
        const catColIdx = ths.findIndex(h => h.includes("investor category") || h.includes("category"));
        if (pctColIdx === -1 || catColIdx === -1) continue;

        const allocation = {};
        const tblRows = Array.from(tbl.querySelectorAll("tr"));
        for (const tr of tblRows) {
          const tds = Array.from(tr.querySelectorAll("td")).map(td => td.innerText.trim());
          if (tds.length <= Math.max(pctColIdx, catColIdx)) continue;
          const cat = tds[catColIdx] || "";
          const pctStr = tds[pctColIdx] || "";
          if (!pctStr || !cat) continue;

          const pctMatch = pctStr.match(/([\d.]+)\s*%/);
          if (!pctMatch) continue;
          const pct = parseFloat(pctMatch[1]);
          if (!Number.isFinite(pct) || pct <= 0) continue;

          const catLower = cat.toLowerCase();
          let key = null;
          if (catLower.startsWith("qib") || catLower === "qualified institutional") key = "qib";
          else if (catLower.startsWith("nii") || catLower.startsWith("hni") || catLower.startsWith("non-institutional") || catLower.startsWith("non institutional")) key = "nii";
          else if (catLower.startsWith("retail")) key = "retail";
          else if (catLower.startsWith("employee")) key = "employee";
          else if (catLower.startsWith("shareholder")) key = "shareholder";
          else if (catLower.startsWith("policyholder")) key = "policyholder";
          // Skip sub-items (anchor, bNII, sNII, etc.)
          if (!key || cat.startsWith("−") || cat.startsWith("-") || cat.startsWith("\u2212")) continue;
          allocation[key] = pct;
        }
        if (Object.keys(allocation).length > 0) return allocation;
      }
      return null;
    });
  } catch (e) {
    console.warn(`  [scrape fail] ${url}: ${e.message}`);
    return null;
  }
}

async function main() {
  const iposBase = JSON.parse(await readFile(IPOS_JSON_PATH, "utf-8"));

  // Target: Mainboard IPOs missing allocation that are active or recent
  const targets = iposBase.filter(ipo => {
    if (ipo.allocation) return false;
    if (ipo.type !== "Mainboard") return false;
    const status = (ipo.status || "").toLowerCase();
    if (["open", "closed", "upcoming"].includes(status)) return true;
    // Listed mainboard within last 2 years
    if (status === "listed" && ipo.listing) {
      const age = (Date.now() - new Date(ipo.listing)) / (1000 * 60 * 60 * 24);
      return age < 730;
    }
    return false;
  });

  console.log(`[backfill] Targeting ${targets.length} Mainboard IPOs missing allocation`);
  if (targets.length === 0) { console.log("Nothing to do."); return; }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: UA });

  let updated = 0;
  for (const ipo of targets) {
    const name = ipo.company || ipo.name;
    console.log(`\n[${name}] (${ipo.status})`);

    let url = ipo.chittorgarhUrl;
    if (!url) {
      url = await findChittorgarhUrl(page, name);
    }
    if (!url) {
      console.log(`  -> No Chittorgarh URL found, skipping`);
      continue;
    }
    console.log(`  -> ${url}`);

    const allocation = await scrapeAllocation(page, url);
    if (!allocation) {
      console.log(`  -> Could not parse allocation table`);
      continue;
    }

    ipo.allocation = allocation;
    if (!ipo.chittorgarhUrl) ipo.chittorgarhUrl = url;
    
    const parts = Object.entries(allocation).map(([k, v]) => `${k.toUpperCase()}:${v}%`).join(", ");
    console.log(`  -> Set allocation: ${parts}`);
    updated++;

    await sleep(1500); // be polite to the server
  }

  await browser.close();

  if (updated > 0) {
    await writeFile(IPOS_JSON_PATH, JSON.stringify(iposBase, null, 2), "utf-8");
    console.log(`\n[backfill] Done! Updated ${updated} IPO allocations in ipos.json`);
  } else {
    console.log("\n[backfill] No allocations updated.");
  }
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
