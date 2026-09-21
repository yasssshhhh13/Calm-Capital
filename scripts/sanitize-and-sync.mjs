// Automated Data Sanitization & Synchronization Service
//
// Ensures data integrity across public/ipos.json and public/live-data.json:
// 1. Live IST Status calculation (Upcoming, Open, Closed, Listed)
// 2. Protection against premature listing prices on unlisted IPOs
// 3. Removal of false 0 GMPs for unpriced or draft IPOs
// 4. Guaranteed chronology and mathematical consistency (priceMax + gmp = estListing)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IPOS_PATH = path.join(ROOT, "public", "ipos.json");
const LIVE_DATA_PATH = path.join(ROOT, "public", "live-data.json");

export function sanitizeAndSync() {
  console.log("\n========================================================");
  console.log("  CALM CAPITAL — AUTOMATED DATA SANITIZATION & SYNC      ");
  console.log("========================================================\n");

  if (!fs.existsSync(IPOS_PATH) || !fs.existsSync(LIVE_DATA_PATH)) {
    console.error("Required data files not found.");
    return false;
  }

  const ipos = JSON.parse(fs.readFileSync(IPOS_PATH, "utf8"));
  const liveData = JSON.parse(fs.readFileSync(LIVE_DATA_PATH, "utf8"));
  const today = new Date();

  let statusChanges = 0;
  let listingPriceCleanups = 0;
  let gmpCleanups = 0;
  let estListingFixes = 0;

  function computeLiveStatus(ipo) {
    const isFutureOrOpen = (ipo.listing && today < new Date(ipo.listing + "T10:00:00+05:30")) ||
      (ipo.close && today < new Date(ipo.close + "T16:50:00+05:30")) ||
      (ipo.open && today < new Date(ipo.open + "T00:00:00+05:30"));

    if (isFutureOrOpen) {
      if (ipo.listedAt != null) { ipo.listedAt = null; listingPriceCleanups++; }
      if (ipo.currentPrice != null) { ipo.currentPrice = null; }
    }

    if (ipo.listedAt != null || ipo.currentPrice != null) return "Listed";
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

  const cleanNameStr = (s) => {
    if (!s) return "";
    return s
      .replace(/\s*(?:BSE\s+SME|NSE\s+SME|NSE\s+Emerge|BSE|NSE|SME|IPO)?\s*C?ALLOTT?ED\b/gi, "")
      .replace(/\s+(?:BSE|NSE)\s+SME/i, "")
      .replace(/\s+NSE\s+Emerge/i, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  for (const ipo of ipos) {
    // 0. Name Hygiene: Strip corrupt ALLOTTED/CALLOTTED/SMECALLOTTED suffixes
    if (ipo.name) ipo.name = cleanNameStr(ipo.name);
    if (ipo.company) ipo.company = cleanNameStr(ipo.company);
    if (ipo.about && /allott?ed/i.test(ipo.about)) {
      ipo.about = ipo.about.replace(/\s*(?:BSE\s+SME|NSE\s+SME|NSE\s+Emerge|BSE|NSE|SME|IPO)?\s*C?ALLOTT?ED\b/gi, "");
    }

    // 1. Status Sync
    const expectedStatus = computeLiveStatus(ipo);
    if (ipo.status !== expectedStatus) {
      console.log(`[STATUS SYNC] "${ipo.name}" (${ipo.id}): ${ipo.status} -> ${expectedStatus}`);
      ipo.status = expectedStatus;
      statusChanges++;
    }

    // 2. Listing Price Protection
    if (ipo.status !== "Listed") {
      if (ipo.listedAt != null || ipo.currentPrice != null) {
        ipo.listedAt = null;
        ipo.currentPrice = null;
        listingPriceCleanups++;
      }
    }

    // 3. GMP Hygiene: Draft or unpriced IPOs must not have 0 GMP
    if ((ipo.priceMax == null || ipo.open == null) && ipo.gmp === 0) {
      ipo.gmp = null;
      ipo.estListing = null;
      ipo.trend = "stable";
      gmpCleanups++;
    }

    // 4. Mathematical Consistency: estListing = priceMax + gmp
    if (ipo.priceMax != null && typeof ipo.gmp === "number") {
      const expectedEst = ipo.priceMax + ipo.gmp;
      if (ipo.estListing !== expectedEst) {
        ipo.estListing = expectedEst;
        estListingFixes++;
      }
    } else if (ipo.priceMax == null || ipo.gmp == null) {
      if (ipo.status !== "Listed" && ipo.estListing != null) {
        ipo.estListing = null;
        estListingFixes++;
      }
    }
  }

  // 5. Clean Live Overlay Store (live-data.json)
  let liveCleanups = 0;
  if (liveData && liveData.ipos) {
    for (const [id, patch] of Object.entries(liveData.ipos)) {
      const baseIpo = ipos.find((i) => i.id === id);
      if (!baseIpo) continue;

      if (baseIpo.status !== "Listed") {
        if (patch.listedAt != null || patch.currentPrice != null) {
          delete patch.listedAt;
          delete patch.currentPrice;
          liveCleanups++;
        }
      }

      if ((baseIpo.priceMax == null || baseIpo.open == null) && patch.gmp === 0) {
        delete patch.gmp;
        delete patch.estListing;
        liveCleanups++;
      }

      // If base IPO has null GMP and patch has 0 GMP without estListing or with same priceMax, clear false 0
      if (baseIpo.gmp == null && patch.gmp === 0) {
        delete patch.gmp;
        delete patch.estListing;
        liveCleanups++;
      }
    }
  }

  // Write changes back to disk
  fs.writeFileSync(IPOS_PATH, JSON.stringify(ipos, null, 2) + "\n", "utf8");
  fs.writeFileSync(LIVE_DATA_PATH, JSON.stringify(liveData, null, 2) + "\n", "utf8");

  console.log(`[SUMMARY]`);
  console.log(`  - Status synchronizations: ${statusChanges}`);
  console.log(`  - Listing price protections: ${listingPriceCleanups}`);
  console.log(`  - False 0 GMP cleanups: ${gmpCleanups}`);
  console.log(`  - EstListing recalculations: ${estListingFixes}`);
  console.log(`  - Live overlay cleanups: ${liveCleanups}`);
  console.log("  Automated sanitization completed successfully.\n");
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  sanitizeAndSync();
}
