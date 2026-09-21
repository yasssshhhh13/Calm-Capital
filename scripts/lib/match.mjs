// Shared helpers for parsing numbers and matching a scraped company name to an
// IPO record. Extracted so every source adapter (InvestorGain, Chittorgarh,
// NSE, BSE, SEBI) and the reconciler resolve company identity the same way.

export const NUM_RE = /-?[\d,]+\.?\d*/;

export function toNumber(text) {
  if (text === null || text === undefined) return undefined;
  const m = String(text).replace(/,/g, "").match(NUM_RE);
  if (!m) return undefined;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : undefined;
}

/** Parse a "₹1,234.56 Cr" style value into a plain crore number. */
export function toCrore(text) {
  if (text === null || text === undefined) return undefined;
  const str = String(text).replace(/,/g, "");
  const m = str.match(/([\d.]+)\s*(?:cr|crore|crores)\b/i);
  if (m) {
    const n = parseFloat(m[1]);
    return Number.isFinite(n) ? n : undefined;
  }
  return toNumber(str);
}

/** Lowercase, strip suffixes/exchange tags/punctuation into a comparable token string. */
export function normalizeName(raw) {
  if (!raw) return "";
  const cleaned = String(raw)
    .toLowerCase()
    .replace(/\b(bse sme|nse emerge|nse sme|bse|nse|ipo|ltd|limited|pvt|private|co|company|corporation|corp)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!cleaned) {
    return String(raw).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }
  return cleaned;
}

export function companyTokens(name) {
  return normalizeName(name)
    .replace(/\b(and|the|of|india)\b/g, " ")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/** True when two company names are very likely the same firm (first 1-2 tokens). */
export function isSameCompanyName(a, b) {
  const ta = companyTokens(a);
  const tb = companyTokens(b);
  if (!ta.length || !tb.length) return false;
  if (ta[0] !== tb[0]) return false;
  if (!ta[1] || !tb[1]) return true;
  return ta[1] === tb[1];
}

/** Resolve a scraped name to an existing IPO record: by id first, then fuzzy name. */
export function findExistingIpo(iposBase, cleanedName, generatedId) {
  if (generatedId) {
    const byId = iposBase.find((i) => i.id === generatedId);
    if (byId) return byId;
  }
  return iposBase.find((i) => isSameCompanyName(i.company || i.name, cleanedName)) || null;
}
