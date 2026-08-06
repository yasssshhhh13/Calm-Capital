import { chromium } from "playwright";
import { writeFile, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IPOS_JSON_PATH = path.join(__dirname, "..", "public", "ipos.json");

// Helper to convert numbers
function toNumber(text) {
  if (!text) return null;
  const m = text.replace(/,/g, "").match(/-?[\d,]+\.?\d*/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

// Normalize names for consistent ID generation and matching
function normalizeName(raw) {
  return raw
    .toLowerCase()
    .replace(/\b(bse sme|nse emerge|nse sme|bse|nse|ipo|ltd|limited|pvt|private|co|company|corporation|corp)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function companyTokens(name) {
  return normalizeName(name)
    .replace(/\b(and|the|of|india)\b/g, " ")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function isSameCompanyName(a, b) {
  const ta = companyTokens(a);
  const tb = companyTokens(b);
  if (!ta.length || !tb.length) return false;
  if (ta[0] !== tb[0]) return false;
  if (!ta[1] || !tb[1]) return true;
  return ta[1] === tb[1];
}

/** Prefer exact id match, then fuzzy name match to avoid DRHP stub duplicates. */
function findExistingIpo(ipos, companyName, generatedId) {
  const byId = ipos.find((i) => i.id === generatedId);
  if (byId) return byId;
  return ipos.find((i) => isSameCompanyName(i.company || i.name, companyName)) || null;
}

// Clean raw scraped names
function cleanScrapedName(raw) {
  if (!raw) return "";
  let cleaned = raw.split("\n")[0].trim();
  cleaned = cleaned.replace(/\s*(BSE SME|NSE SME|BSE|NSE|IPO)?[UOCL]?\s*L?@\s*-?[\d,.]+\s*\(?[-\d,.%]*\)?/i, "");
  cleaned = cleaned.replace(/\s*(BSE SME|NSE SME|BSE|NSE|IPO)[UOCL]?\s*$/, "");
  cleaned = cleaned.replace(/\s+[UOCL]$/i, "");
  return cleaned.trim();
}

// Deduce sector/industry from name
function deduceSector(companyName) {
  const nameLower = companyName.toLowerCase();
  if (nameLower.includes("textile") || nameLower.includes("fabrics") || nameLower.includes("cotton") || nameLower.includes("yarn")) return "Textiles";
  if (nameLower.includes("tech") || nameLower.includes("software") || nameLower.includes("digital") || nameLower.includes("cyber") || nameLower.includes("virtual")) return "IT Services & Technology";
  if (nameLower.includes("steel") || nameLower.includes("metal") || nameLower.includes("forge") || nameLower.includes("alloy")) return "Metal & Forging";
  if (nameLower.includes("logistics") || nameLower.includes("transport") || nameLower.includes("carrier")) return "Logistics";
  if (nameLower.includes("chemical") || nameLower.includes("refinery") || nameLower.includes("catalyst")) return "Specialty Chemicals";
  if (nameLower.includes("energy") || nameLower.includes("power") || nameLower.includes("solar")) return "Energy & Power";
  if (nameLower.includes("packaging") || nameLower.includes("polyplast") || nameLower.includes("plast")) return "Packaging & Plastics";
  if (nameLower.includes("retail") || nameLower.includes("supermarket") || nameLower.includes("mart")) return "Retail";
  if (nameLower.includes("finance") || nameLower.includes("capital") || nameLower.includes("mutual") || nameLower.includes("fund") || nameLower.includes("wealth")) return "Financial Services";
  if (nameLower.includes("pharma") || nameLower.includes("healthcare") || nameLower.includes("med") || nameLower.includes("biotech")) return "Healthcare & Pharma";
  if (nameLower.includes("infra") || nameLower.includes("construction") || nameLower.includes("builder") || nameLower.includes("engineer")) return "Infrastructure & Construction";
  return "General";
}

// Clean SEBI titles to extract company name
function extractCompanyName(title) {
  if (!title) return "";
  let cleaned = title.replace(/\s*[-–—]\s*(DRHP|Addendum|Corrigendum|Draft|Prospectus|Letter of Offer).*/i, "");
  cleaned = cleaned.replace(/\s+(DRHP|Addendum|Corrigendum|Draft|Prospectus|Letter of Offer).*/i, "");
  return cleaned.trim();
}

function formatCompanyName(name) {
  if (!name) return "";
  if (name === name.toUpperCase()) {
    return name
      .toLowerCase()
      .split(" ")
      .map(word => {
        if (word === "ltd" || word === "ltd.") return "Ltd.";
        if (word === "limited") return "Limited";
        if (word === "pvt" || word === "pvt.") return "Pvt.";
        if (word === "india") return "India";
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }
  return name;
}

function normalizeSebiUrl(href) {
  if (!href) return null;
  try {
    return new URL(href, "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=10").href;
  } catch (e) {
    return href;
  }
}

// Parse SEBI dates (e.g., "Jul 16, 2026")
function parseSebiDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.replace(/,/g, "").split(/\s+/);
  if (parts.length < 3) return null;
  const monthStr = parts[0].toLowerCase();
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  const months = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
  const month = months[monthStr.slice(0, 3)];
  if (!month || isNaN(day) || isNaN(year)) return null;
  
  const pad = (n) => String(n).padStart(2, "0");
  return `${year}-${month}-${pad(day)}`;
}

// Secondary verification methods
async function verifyOnInvestorGainList(page, companyName) {
  try {
    const url = "https://www.investorgain.com/report/live-ipo-gmp/331/all/";
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    const content = await page.textContent("body");
    const normCompany = normalizeName(companyName);
    return normalizeName(content).includes(normCompany);
  } catch (err) {
    console.warn(`[InvestorGain Verification Warn] Failed to check InvestorGain: ${err.message}`);
    return false;
  }
}

async function verifyOnIPOCentral(page, companyName) {
  try {
    const searchKeyword = companyName.replace(/Limited|Ltd\./gi, "").trim();
    const url = `https://ipocentral.in/?s=${encodeURIComponent(searchKeyword)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    
    return await page.evaluate((keyword) => {
      const titles = Array.from(document.querySelectorAll("article, h2.entry-title, h2.post-title, h1.entry-title"));
      const lowerKeyword = keyword.toLowerCase();
      for (const t of titles) {
        if (t.innerText.toLowerCase().includes(lowerKeyword)) {
          return true;
        }
      }
      return false;
    }, searchKeyword);
  } catch (err) {
    console.warn(`[IPO Central Verification Warn] Failed to check IPO Central: ${err.message}`);
    return false;
  }
}

async function verifyOnIPOWiz(page, companyName) {
  try {
    const searchKeyword = companyName.replace(/Limited|Ltd\./gi, "").trim();
    const url = `https://ipowiz.in/?s=${encodeURIComponent(searchKeyword)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    
    return await page.evaluate((keyword) => {
      const titles = Array.from(document.querySelectorAll("article, h2.entry-title, h2.post-title, h1.entry-title, .post-title"));
      const lowerKeyword = keyword.toLowerCase();
      for (const t of titles) {
        if (t.innerText.toLowerCase().includes(lowerKeyword)) {
          return true;
        }
      }
      return false;
    }, searchKeyword);
  } catch (err) {
    console.warn(`[IPOWiz Verification Warn] Failed to check IPOWiz: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log("Loading existing IPO database...");
  let ipos = [];
  try {
    const content = await readFile(IPOS_JSON_PATH, "utf-8");
    ipos = JSON.parse(content);
    console.log(`Loaded ${ipos.length} IPOs from database.`);
  } catch (e) {
    console.error("Failed to load ipos.json. Starting with empty database.");
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
  });

  let databaseUpdated = false;
  const auditLogs = [];

  try {
    console.log("Fetching SEBI Public Issues...");
    const url = "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=10";
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    const filings = await page.evaluate(() => {
      const results = [];
      const rows = document.querySelectorAll("#sample_1 tbody tr");
      rows.forEach(row => {
        const tds = Array.from(row.querySelectorAll("td"));
        if (tds.length >= 2) {
          const date = tds[0].innerText.trim();
          const titleLink = tds[1].querySelector("a");
          const title = titleLink ? titleLink.innerText.trim() : tds[1].innerText.trim();
          const href = titleLink ? titleLink.getAttribute("href") : null;
          results.push({ date, title, href });
        }
      });
      return results;
    });

    console.log(`Found ${filings.length} filings on SEBI Public Issues page.`);

    // Loop through filings
    for (const filing of filings) {
      if (!filing.title.toLowerCase().includes("drhp") && !filing.title.toLowerCase().includes("draft")) {
        // Skip non-DRHPs
        continue;
      }

      const rawDrhpUrl = normalizeSebiUrl(filing.href);
      const rawCompanyName = extractCompanyName(filing.title);
      const companyName = formatCompanyName(rawCompanyName);
      const id = normalizeName(companyName).replace(/\s+/g, "-");

      if (!id) continue;

      // Check if IPO exists (exact id OR fuzzy company match)
      const existingIpo = findExistingIpo(ipos, companyName, id);

      if (!existingIpo) {
        console.log(`\n[NEW DISCOVERY] Found new filing: "${companyName}". Checking secondary sources for logging...`);
        
        const isVerifiedIG = await verifyOnInvestorGainList(page, companyName);
        const isVerifiedIC = await verifyOnIPOCentral(page, companyName);
        const isVerifiedIW = await verifyOnIPOWiz(page, companyName);
        
        const verifiedSources = [];
        if (isVerifiedIG) verifiedSources.push("InvestorGain");
        if (isVerifiedIC) verifiedSources.push("IPO Central");
        if (isVerifiedIW) verifiedSources.push("IPOWiz");

        console.log(`[DISCOVERY] Adding "${companyName}" directly to database.`);
        
        const sector = deduceSector(companyName);
        const type = filing.title.toLowerCase().includes("sme") ? "SME" : "Mainboard";

        const newIpo = {
          id,
          name: companyName,
          company: companyName.endsWith("Limited") || companyName.endsWith("Ltd.") ? companyName : `${companyName} Limited`,
          type,
          status: "Upcoming",
          discoveredAt: new Date().toISOString(),
          open: null,
          close: null,
          listing: null,
          allotment: null,
          refund: null,
          demat: null,
          priceMin: null,
          priceMax: null,
          faceValue: 10,
          lot: null,
          issueSize: null,
          freshIssue: null,
          ofs: 0,
          gmp: 0,
          trend: "stable",
          estListing: null,
          listedAt: null,
          currentPrice: null,
          gmpHistory: [],
          drhp: rawDrhpUrl,
          rhp: null,
          leadManager: "To Be Announced",
          registrar: "To Be Announced",
          exchange: type === "SME" ? "BSE SME / NSE Emerge" : "BSE, NSE",
          about: `${companyName} is a newly announced ${type} IPO in the ${sector} sector. The company has filed its DRHP with SEBI and is preparing for its public issue.`,
          sector,
          strengths: [
            `Established presence in the ${sector} industry`,
            "Experienced promoter group and leadership team"
          ],
          risks: [
            "Subject to regulatory approvals and market conditions",
            "Industry competitive pressures and operating scale constraints"
          ],
          auditTrail: [
            {
              timestamp: new Date().toISOString(),
              action: "created",
              details: `Discovered from SEBI DRHP filing. Secondary source check results: ${verifiedSources.length > 0 ? verifiedSources.join(", ") : "None found yet"}`
            }
          ]
        };

        ipos.push(newIpo);
        databaseUpdated = true;
        auditLogs.push(`[CREATED] Added new IPO: "${companyName}" (ID: ${id})`);
      } else {
        // IPO exists. Let's compare and update missing/changed fields
        const changes = {};

        // 1. Maintain Audit Trail if missing
        if (!existingIpo.auditTrail) {
          existingIpo.auditTrail = [
            {
              timestamp: new Date().toISOString(),
              action: "created",
              details: "Imported during database migration"
            }
          ];
        }

        // 2. Check for field updates
        if (rawDrhpUrl && existingIpo.drhp !== rawDrhpUrl) {
          changes.drhp = { old: existingIpo.drhp, new: rawDrhpUrl };
          existingIpo.drhp = rawDrhpUrl;
        }

        // If changes detected, log and record in audit trail
        if (Object.keys(changes).length > 0) {
          existingIpo.auditTrail.push({
            timestamp: new Date().toISOString(),
            action: "updated",
            changes
          });
          databaseUpdated = true;
          auditLogs.push(`[UPDATED] Updated IPO: "${existingIpo.name}" changes: ${JSON.stringify(changes)}`);
        }
      }
    }

    if (databaseUpdated) {
      console.log(`\nWriting updated database to ipos.json (${ipos.length} items)...`);
      await writeFile(IPOS_JSON_PATH, JSON.stringify(ipos, null, 2), "utf-8");
      console.log("Database write complete.");
      console.log("\n--- Audit Log Summary ---");
      auditLogs.forEach(log => console.log(log));
    } else {
      console.log("\nNo changes or new IPOs discovered.");
    }
  } catch (err) {
    console.error("Discovery service error:", err);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
