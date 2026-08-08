/**
 * Dark Mode Color Migration Script
 * Replaces all hardcoded dark-mode color values in App.jsx with the new premium navy palette.
 * Also updates the key structural inline style values.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "App.jsx");
let code = fs.readFileSync(appPath, "utf-8");

// ─── MAPPING: old value → new value ─────────────────────────────────────────
// Order matters: longest/most-specific first to avoid partial replacements
const REPLACEMENTS = [
  // Backgrounds: old near-black → new navy
  [/#0a0d16/g,          "#0A1020"],
  [/#161c28/g,          "#121D2D"],
  [/#111827/g,          "#172437"],
  [/#121625/g,          "#121D2D"],
  [/#111520/g,          "#121D2D"],
  [/#111B2B/g,          "#121D2D"],  // from previous pass
  [/#0e1320/g,          "#1A293D"],
  [/#101A29/g,          "#1A293D"],
  [/rgba\(10,13,22,0\.8\)/g,    "rgba(13,21,36,0.92)"],
  [/rgba\(10,13,22,0\.88\)/g,   "rgba(13,21,36,0.92)"],
  [/rgba\(10,16,28,0\.88\)/g,   "rgba(13,21,36,0.92)"],
  [/#080E19/g,          "#0A1020"],
  [/#0A1020/g,          "#0A1020"],   // keep (sidebar)
  // Borders: near-invisible → visible slate
  [/rgba\(255,255,255,0\.06\)/g,  "rgba(45,64,86,0.9)"],
  [/rgba\(255,255,255,0\.08\)/g,  "rgba(52,74,97,0.9)"],
  [/"rgba\(38,54,74,0\.8\)"/g,   '"rgba(45,64,86,0.9)"'],
  [/"rgba\(38,54,74,0\.9\)"/g,   '"rgba(45,64,86,0.9)"'],
  [/"rgba\(52,70,92,0\.9\)"/g,   '"rgba(52,74,97,0.9)"'],
  // Text: low-contrast slate greys → better
  [/#94a3b8/g,          "#8EA1B7"],
  [/#8293A8/g,          "#8EA1B7"],
  // Inline header bg
  [/rgba\(10,16,28,0\.88\)/g, "rgba(13,21,36,0.92)"],
];

let changes = 0;
for (const [from, to] of REPLACEMENTS) {
  const before = code;
  code = code.replace(from, typeof to === "string" ? () => { changes++; return to; } : to);
  // Count changes
  if (code === before) {} // no change for this rule
}

fs.writeFileSync(appPath, code, "utf-8");
console.log(`✅ App.jsx dark mode color migration complete. Applied ${REPLACEMENTS.length} replacement rules.`);
console.log(`   File length: ${code.length} chars`);
