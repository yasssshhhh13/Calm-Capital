/**
 * Shared helpers for IPO prospectus financials (fin / finMeta).
 * Chittorgarh + SEBI filing URL is treated as sufficient for Verified display
 * (see reconcile.mjs — field-level 2-source consensus is impractical for fin tables).
 */

export const GENERIC_DRHP = "https://www.sebi.gov.in/filings/public-issues.html";

export function isValidFin(fin) {
  if (!fin || typeof fin !== "object") return false;
  const { revenue, pat } = fin;
  if (revenue == null || pat == null) return false;
  if (typeof revenue !== "number" || typeof pat !== "number") return false;
  if (!Number.isFinite(revenue) || !Number.isFinite(pat)) return false;
  if (pat > revenue) return false;
  return true;
}

export function isVerifiedFin(ipo) {
  return isValidFin(ipo?.fin) && ipo?.finMeta?.status === "Verified";
}

/** Pick the best regulatory / trace URL for finMeta.sourceUrl. */
export function resolveFinSource(ipo) {
  const rhp = ipo.rhp || "";
  const drhp = ipo.drhp || "";
  const ig = ipo.investorgainUrl || "";

  if (rhp && !rhp.startsWith("http://www.") && rhp.includes(".")) {
    return { sourceDoc: "RHP", sourceUrl: rhp };
  }
  if (drhp && drhp !== GENERIC_DRHP && (drhp.includes("sebi.gov.in") || drhp.includes("nseindia.com") || drhp.includes("bseindia.com"))) {
    return { sourceDoc: drhp.includes("prospectus") || drhp.includes("rhp") ? "RHP" : "DRHP", sourceUrl: drhp };
  }
  if (ig) return { sourceDoc: "DRHP", sourceUrl: ig };
  if (drhp && drhp !== GENERIC_DRHP) return { sourceDoc: "DRHP", sourceUrl: drhp };
  return { sourceDoc: "Prospectus", sourceUrl: ig || drhp || "" };
}

/** Build a Verified finMeta block for UI display. */
export function buildVerifiedFinMeta(ipo, { method = "Chittorgarh + DRHP/RHP cross-check", chittorgarhUrl = null, fy = null } = {}) {
  const now = new Date().toISOString();
  const { sourceDoc, sourceUrl } = resolveFinSource(ipo);
  const meta = {
    sourceDoc,
    sourceUrl,
    fy: fy || ipo.finMeta?.fy || "FY2026",
    pageNum: "Financials",
    verifiedAt: now,
    method,
    status: "Verified",
  };
  if (chittorgarhUrl) meta.chittorgarhUrl = chittorgarhUrl;
  return meta;
}

/** Compute P/E and enrich fin when EPS is known. */
export function enrichFinDerived(ipo, fin) {
  if (!fin || !ipo?.priceMax) return fin;
  const out = { ...fin };
  if (out.eps && out.eps > 0 && (out.pe == null || out.pe === undefined)) {
    out.pe = Math.round((ipo.priceMax / out.eps) * 100) / 100;
  }
  return out;
}

/** Parse a financial table row set (Chittorgarh / InvestorGain detail pages). */
export function parseFinancialTableRows(rows) {
  const fin = {};
  let latestCol = 1; // first data column = most recent period

  for (const row of rows) {
    if (!row || row.length < 2) continue;
    const label = String(row[0]).toLowerCase().trim();
    const val = parseFinNum(row[latestCol] ?? row[1]);
    if (val == null) continue;

    if (fin.revenue == null && (label.includes("total income") || label.includes("revenue"))) fin.revenue = val;
    if (fin.pat == null && (label.includes("profit after tax") || label === "pat" || label.includes("net profit"))) fin.pat = val;
    if (fin.ebitda == null && label.includes("ebitda")) fin.ebitda = val;
    if (fin.netWorth == null && label.includes("net worth")) fin.netWorth = val;
    if (fin.debt == null && label.includes("total borrowing")) fin.debt = val;
  }
  return Object.keys(fin).length ? fin : null;
}

function parseFinNum(cell) {
  if (cell == null) return null;
  const m = String(cell).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

export function parseKpiFromPage(text) {
  const fin = {};
  const roeM = text.match(/ROE[^0-9]*([\d.]+)\s*%/i);
  if (roeM) fin.roe = parseFloat(roeM[1]);
  const epsM = text.match(/EPS\s*\(₹\)[^0-9]*([\d.]+)/i);
  if (epsM) fin.eps = parseFloat(epsM[1]);
  return fin;
}
