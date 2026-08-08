/**
 * Fix Live GMP Status priority sort logic in App.jsx
 * Replaces the broken dedup+sort block with the correct group-by-status approach.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "App.jsx");
let code = fs.readFileSync(appPath, "utf-8");

// The broken block we need to replace (exact text from current file)
const OLD_BLOCK = `                  // Step 2: deduplicate strictly by ipo.id / slug
                  const seenIds = new Set();
                  const deduped = [];
                  for (const item of eligibleGmpIpos) {
                    const id = item.id || item.slug;
                    if (id && !seenIds.has(id)) {
                      seenIds.add(id);
                      uniqueGmpIpos.push(item);
                    }
                  }

                  // Sort by Priority: OPEN (1) -> UPCOMING (2) -> CLOSED (3)
                  uniqueGmpIpos.sort((a, b) => {
                    const sa = STATUS_ORDER[getComputedStatus(a)] || 99;
                    const sb = STATUS_ORDER[getComputedStatus(b)] || 99;
                    if (sa !== sb) return sa - sb;
                    return (b.gmp || 0) - (a.gmp || 0);
                  });`;

const NEW_BLOCK = `                  // Step 2: deduplicate strictly by ipo.id / slug
                  const seenIds = new Set();
                  const deduped = [];
                  for (const item of eligibleGmpIpos) {
                    const id = item.id || item.slug;
                    if (id && !seenIds.has(id)) {
                      seenIds.add(id);
                      deduped.push(item);
                    }
                  }

                  // Step 3: group by status
                  const grouped = { Open: [], Closed: [], Upcoming: [] };
                  for (const ipo of deduped) {
                    const s = getComputedStatus(ipo);
                    if (grouped[s]) grouped[s].push(ipo);
                  }

                  // Step 4: within each group sort by GMP% descending (not raw GMP value)
                  const gmpPctOf = (ipo) => {
                    const p = ipo.priceMax || ipo.priceMin || 0;
                    return p ? (ipo.gmp / p) * 100 : 0;
                  };
                  grouped.Open.sort((a, b) => gmpPctOf(b) - gmpPctOf(a));
                  grouped.Closed.sort((a, b) => gmpPctOf(b) - gmpPctOf(a));
                  grouped.Upcoming.sort((a, b) => gmpPctOf(b) - gmpPctOf(a));

                  // Step 5: concatenate Open → Closed → Upcoming (NEVER Listed)
                  const uniqueGmpIpos = [
                    ...grouped.Open,
                    ...grouped.Closed,
                    ...grouped.Upcoming,
                  ];`;

if (!code.includes(OLD_BLOCK)) {
  console.error("❌ Could not find the target block to replace.");
  // Try to find partial match for debugging
  const lines = OLD_BLOCK.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !code.includes(trimmed)) {
      console.log("  Missing line:", JSON.stringify(trimmed));
    }
  }
  process.exit(1);
}

const newCode = code.replace(OLD_BLOCK, NEW_BLOCK);
fs.writeFileSync(appPath, newCode, "utf-8");
console.log("✅ Live GMP Status priority logic fixed.");
console.log(`   Old → ${code.length} chars, New → ${newCode.length} chars`);
