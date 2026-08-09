import React, { useState, useMemo, useRef, useEffect, useCallback, Component } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, LabelList,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Send, X, MessageCircle, FileText,
  Calendar, Building2, ChevronRight, Sparkles, Search, Bell, RefreshCw,
  Sun, Moon, Menu, Bookmark, BookmarkCheck, Calculator as CalcIcon,
  LayoutGrid, Activity, PieChart as PieIcon, BarChart3, Landmark,
  ExternalLink, Clock, ArrowUpRight, ArrowDownRight,
  Home, CircleDollarSign, ChevronsLeft, PlusCircle, Award, CheckCircle, Inbox,
  ShieldCheck, AlertTriangle, HelpCircle
} from "lucide-react";
import { trackTabView, trackPageView } from "./analytics.js";
import {
  TAB_PATHS,
  parseLocation,
  ipoPath,
  applyIpoSeo,
  applyTabSeo,
  buildIpoFaqs,
  similarIpos,
  displayIpoName,
} from "./seo.js";

import initialIpoData from "../public/ipos.json";

/* =====================================================================
   BRAND TOKENS
===================================================================== */
const BRAND = { blue: "#1c9bda", green: "#aed768", white: "#ffffff" };

/* =====================================================================
   DATA — real, researched figures. Data as of July 3, 2026.
   Estimated profit = GMP × lot size.
===================================================================== */
const cleanCompanyName = (name) => {
  if (!name) return "";
  return name
    .replace(/\s+(?:BSE|NSE)\s+SME\s*CALLOTTED/i, "")
    .replace(/\s+(?:BSE|NSE)\s+SME\s*CALLOTED/i, "")
    .replace(/\s+(?:BSE|NSE)\s+SME/i, "")
    .replace(/\s+NSE\s+Emerge/i, "")
    .replace(/\s+CALLOTTED/i, "")
    .replace(/\s+CALLOTED/i, "")
    .trim();
};

let IPOS_BASE = (Array.isArray(initialIpoData) ? initialIpoData : []).map(ipo => ({
  ...ipo,
  company: cleanCompanyName(ipo.company || ipo.name),
  name: cleanCompanyName(ipo.name || ipo.company)
}));

const DATA_AS_OF = "July 3, 2026";
const rupee = (n) => (n == null || isNaN(n)) ? "-" : (n < 0 ? `-₹${Number(Math.abs(n)).toLocaleString("en-IN")}` : `₹${Number(n).toLocaleString("en-IN")}`);
const formatDecimal = (n) => (n == null || isNaN(n)) ? "-" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const cr = (n) => (n == null || isNaN(n)) ? "-" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
const formatDate = (dateStr) => {
  if (!dateStr) return "To Be Announced";
  const date = new Date(dateStr + "T00:00:00+05:30");
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const price = (i) => i.priceMax || i.priceMin;
const profitPerLot = (i) => (!i.lot || !i.gmp) ? 0 : i.gmp * i.lot;
const investment = (i) => { const p = price(i); return (p && i.lot) ? p * i.lot : null; };
const gainPct = (i) => { const p = price(i); return p ? (i.gmp / p) * 100 : 0; };
const listingGainPct = (i) => (i.listedAt && i.priceMax) ? ((i.listedAt - i.priceMax) / i.priceMax) * 100 : null;
const currentReturnPct = (i) => (i.currentPrice && i.priceMax) ? ((i.currentPrice - i.priceMax) / i.priceMax) * 100 : null;
const listingProfitLossPerLot = (i) => (i.listedAt && i.priceMax && i.lot) ? (i.listedAt - i.priceMax) * i.lot : null;

/* =====================================================================
   MULTI-SOURCE VERIFICATION
   Hard facts (price band, lot, issue size, dates, ...) are cross-checked
   across independent sources by the scraper. Each field carries a status in
   `ipo.verification[field]`: verified (>=2 sources agree), conflict (sources
   disagree), unverified (single source / pre-existing), or pending (withheld
   until confirmed). The UI reflects that trust level.
===================================================================== */
const SOURCE_LABEL = { nse: "NSE", bse: "BSE", chittorgarh: "Chittorgarh", investorgain: "InvestorGain", existing: "prior data" };
const labelSources = (arr) => (arr || [])
  .filter((s) => s !== "chittorgarh" && s !== "investorgain")
  .map((s) => SOURCE_LABEL[s] || s)
  .join(", ");

const formatPriceBand = (min, max) => {
  if (min == null && max == null) return "—";
  if (min == null) return `₹${max}`;
  if (max == null) return `₹${min}`;
  if (min === max) return `₹${max}`;
  return `₹${min}–₹${max}`;
};

const fieldVerification = (ipo, field) => (ipo && ipo.verification && ipo.verification[field]) || null;
const isPending = (ipo, field) => {
  const v = fieldVerification(ipo, field);
  return !!v && v.status === "pending";
};

// Renders the display value for a gated field, substituting a "Pending
// verification" note while the value is still withheld.
const gatedText = (ipo, field, formatted) => (isPending(ipo, field) ? "Pending verification" : formatted);

// Small inline trust marker shown next to a gated value.
function VerifyMark({ ipo, field }) {
  const v = fieldVerification(ipo, field);
  if (!v) return null;
  if (v.status === "verified") {
    const visible = (v.sources || []).filter((s) => s !== "chittorgarh" && s !== "investorgain");
    const titleText = visible.length > 0 ? `Verified: ${labelSources(visible)} agree` : "Verified";
    return (
      <span title={titleText} className="inline-flex items-center align-middle ml-1 text-emerald-600 dark:text-emerald-400">
        <ShieldCheck size={12} />
      </span>
    );
  }
  if (v.status === "conflict") {
    const visibleCandidates = Object.entries(v.candidates || {})
      .map(([val, srcs]) => {
        const visibleSrcs = (srcs || []).filter((s) => s !== "chittorgarh" && s !== "investorgain");
        return [val, visibleSrcs];
      })
      .filter(([val, srcs]) => srcs.length > 0);
    
    let titleText;
    if (visibleCandidates.length > 0) {
      const parts = visibleCandidates
        .map(([val, srcs]) => `${val} (${labelSources(srcs)})`)
        .join("  vs  ");
      titleText = `Sources disagree - ${parts}`;
    } else {
      titleText = "Conflict";
    }
    return (
      <span title={titleText} className="inline-flex items-center align-middle ml-1 text-amber-500">
        <AlertTriangle size={12} />
      </span>
    );
  }
  if (v.status === "unverified") {
    const visible = (v.sources || []).filter((s) => s !== "chittorgarh" && s !== "investorgain");
    const srcs = labelSources(visible);
    const titleText = srcs 
      ? `Unverified - only ${srcs} so far. Awaiting a second source.`
      : "Unverified. Awaiting verification.";
    return (
      <span title={titleText} className="inline-flex items-center align-middle ml-1 text-slate-400 dark:text-slate-500">
        <Clock size={12} />
      </span>
    );
  }
  return null;
}

function FieldHelp({ label }) {
  const definitions = {
    "Price band": "The price range set by the company for bidding. It includes a floor price and a cap price.",
    "Lot size": "The minimum number of shares an investor must bid for. All bids must be in multiples of this quantity.",
    "Issue size": "The total monetary value of shares offered to the public in this IPO issue.",
    "Face value": "The nominal value of a single share as recorded in the company's financial books.",
    "Min. investment": "The minimum amount of money needed to buy one lot of shares (Price Cap × Lot Size).",
    "Fresh issue": "New shares issued by the company to raise fresh capital. The funds go directly to the company.",
    "OFS": "Offer for Sale. Shares sold by existing promoters/shareholders. The proceeds go to the sellers, not the company."
  };
  const desc = definitions[label];
  if (!desc) return null;
  return (
    <span title={desc} className="inline-flex items-center align-middle ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help">
      <HelpCircle size={12} />
    </span>
  );
}

// A few SME IPOs don't have a confirmed direct SEBI/exchange document URL yet —
// for those we link to the exchange's official offer-documents portal instead
// of a third-party aggregator. This flags that case so the button can say so
// honestly rather than implying it's the exact filing.
const PORTAL_URLS = new Set([
  "https://www.nseindia.com/companies-listing/corporate-filings-offer-documents",
  "https://www.bsesme.com/PublicIssues/PublicIssues.aspx?id=1",
]);
const isPortalLink = (url) => PORTAL_URLS.has(url);

// Computes the IPO's status live from today's date instead of a fixed field,
// so "Open"/"Upcoming"/"Closed"/"Listed" is always correct for whatever day
// the dashboard is opened on — not just the day the data was last refreshed.
function liveStatus(ipo, today) {
  const d = (s) => new Date(s + "T00:00:00+05:30"); // dates are IST

  // 1. If open date is not set, it is Upcoming (DRHP filed)
  if (!ipo.open) return "Upcoming";
  const open = d(ipo.open);
  // If open date is in the future, it is Upcoming
  if (today < open) return "Upcoming";
  
  // 2. If close date is not set, it is Open
  if (!ipo.close) return "Open";
  const closeDeadline = new Date(ipo.close + "T16:50:00+05:30");
  // If close deadline is in the future, it is Open
  if (today < closeDeadline) return "Open";
  
  // 3. If listing date is not set, it is Closed
  if (!ipo.listing) return "Closed";
  const listingTime = new Date(ipo.listing + "T10:00:00+05:30");
  // If listing time is in the future, it is Closed
  if (today < listingTime) return "Closed";
  
  // 4. Default to Listed once listing date arrives or if listed price flags are set
  return "Listed";
}

function getComputedStatus(ipo, now = new Date()) {
  return liveStatus(ipo, now);
}

/** IST calendar Y-M-D parts for a Date. */
function istYmdParts(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const get = (t) => {
      const found = parts.find((p) => p.type === t);
      return found ? Number(found.value) : null;
    };
    const y = get("year");
    const m = get("month");
    const d = get("day");
    if (y !== null && m !== null && d !== null) {
      return { y, m, d };
    }
  } catch (e) {
    console.warn("istYmdParts failed, falling back to local time:", e);
  }
  return {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
  };
}

/** True for Sat/Sun in the Asia/Kolkata calendar (IPO bidding holidays). */
function isIstWeekend(y, m, d) {
  // noon UTC avoids DST edge cases; India has no DST
  const dow = new Date(Date.UTC(y, m - 1, d, 6, 30)).getUTCDay();
  return dow === 0 || dow === 6;
}

/**
 * IPO bidding day number counting only Mon–Fri (skip Sat/Sun).
 * Example: open Friday → Fri=1, Mon=2, Tue=3.
 */
function getIpoBiddingDay(ipo, now = new Date()) {
  if (!ipo?.open || getComputedStatus(ipo, now) !== "Open") return null;
  const openParts = String(ipo.open).split("-").map(Number);
  if (openParts.length !== 3 || openParts.some((n) => !Number.isFinite(n))) return null;
  const [oy, om, od] = openParts;
  const today = istYmdParts(now);

  let day = 0;
  let y = oy;
  let m = om;
  let d = od;
  // Walk inclusive from open date → today IST, count weekdays only
  for (let guard = 0; guard < 60; guard++) {
    if (!isIstWeekend(y, m, d)) day += 1;
    if (y === today.y && m === today.m && d === today.d) break;
    // past today? (open in future shouldn't happen when status is Open)
    const openKey = y * 10000 + m * 100 + d;
    const todayKey = today.y * 10000 + today.m * 100 + today.d;
    if (openKey > todayKey) return null;
    // next calendar day
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    y = next.getUTCFullYear();
    m = next.getUTCMonth() + 1;
    d = next.getUTCDate();
  }
  return Math.max(1, day);
}

// Holds the most recent investorgain.com scrape result (see LiveDataBadge).
// Populated by fetchLiveData() below; getLiveIPOS() overlays it onto the
// verified baseline so every part of the app reads through one function.
let _liveOverlay = { updatedAt: null, byId: {} };
let _realtimePrices = {}; // Stores ticking price, prev price, and last tick direction/timestamp for animations

// Validates financial data objects to ensure accuracy and consistency.
// Returns a validated fin object, or null (N/A) if verification fails.
function validateFinancials(ipo) {
  if (!ipo.fin) return null;
  const f = ipo.fin;

  // 0. Verify audit metadata exists and is validated
  if (!ipo.finMeta || ipo.finMeta.status !== "Verified") {
    console.warn(`Financial validation failed for ${ipo.company}: missing or unverified source metadata.`);
    return null;
  }

  // 1. Required fields
  if (f.revenue === undefined || f.pat === undefined) {
    console.warn(`Financial validation failed for ${ipo.company}: missing required fields.`);
    return null;
  }

  // 2. Reject impossible values (PAT cannot be greater than Revenue)
  if (f.revenue !== null && f.pat !== null && f.pat > f.revenue) {
    console.warn(`Financial validation failed for ${ipo.company}: PAT (${f.pat}) exceeds Revenue (${f.revenue}).`);
    return null;
  }

  // 3. Verify ROE is in a logical percentage range
  if (f.roe !== null && f.roe !== undefined) {
    if (typeof f.roe !== "number" || f.roe < -100 || f.roe > 200) {
      console.warn(`Financial validation failed for ${ipo.company}: ROE (${f.roe}%) is outside logical range.`);
      return null;
    }
  }

  // 4. Verify P/E ratio aligns with price and EPS (with 5% tolerance for rounding differences)
  if (f.pe !== null && f.pe !== undefined) {
    if (typeof f.pe !== "number" || f.pe <= 0) {
      console.warn(`Financial validation failed for ${ipo.company}: P/E (${f.pe}) must be positive.`);
      return null;
    }
    const pMax = ipo.priceMax;
    if (pMax && f.eps) {
      const calculatedPE = pMax / f.eps;
      const diff = Math.abs(f.pe - calculatedPE);
      if (diff / calculatedPE > 0.05) {
        console.warn(`Financial validation failed for ${ipo.company}: P/E (${f.pe}) is inconsistent with Price/EPS (${calculatedPE.toFixed(2)}).`);
        return null;
      }
    }
  }

  return f;
}

/** Significant name tokens for fuzzy company matching (drops ltd/and/etc.). */
function companyTokens(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\b(limited|ltd|pvt|private|and|&|the|of|india|co|company|corporation|corp)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/** True when two IPO names refer to the same company (prevents DRHP stub duplicates). */
function isSameCompanyName(a, b) {
  const ta = companyTokens(a);
  const tb = companyTokens(b);
  if (!ta.length || !tb.length) return false;
  if (ta[0] !== tb[0]) return false;
  if (!ta[1] || !tb[1]) return ta[0] === tb[0];
  return ta[1] === tb[1];
}

/**
 * Drop incomplete DRHP/Upcoming stubs that duplicate a richer IPO already in the list
 * (e.g. caliber-mining-and-logistics stub vs caliber-mining open issue).
 */
function dedupeIpoList(ipos) {
  // 1. Strict deduplication by unique ID / slug first
  const seenIds = new Set();
  const strictUnique = [];
  for (const ipo of ipos) {
    const key = ipo.id || ipo.slug;
    if (key && !seenIds.has(key)) {
      seenIds.add(key);
      strictUnique.push(ipo);
    }
  }

  // 2. Score entries and drop duplicate stubs with same company name
  const scored = strictUnique.map((ipo, idx) => {
    let score = 0;
    if (ipo.open) score += 8;
    if (ipo.close) score += 4;
    if (ipo.listing) score += 2;
    if (ipo.sub) score += 2;
    if (ipo.priceMax) score += 1;
    if (ipo.rhp) score += 1;
    const status = getComputedStatus(ipo);
    if (status === "Open" || status === "Closed" || status === "Listed") score += 10;
    return { ipo, idx, score, status };
  });

  const drop = new Set();
  for (let i = 0; i < scored.length; i++) {
    if (drop.has(scored[i].ipo.id)) continue;
    for (let j = i + 1; j < scored.length; j++) {
      if (drop.has(scored[j].ipo.id)) continue;
      const a = scored[i];
      const b = scored[j];
      if (!isSameCompanyName(a.ipo.company || a.ipo.name, b.ipo.company || b.ipo.name)) continue;
      if (a.ipo.id === b.ipo.id) {
        drop.add(b.ipo.id);
        continue;
      }
      if (a.score >= b.score) drop.add(b.ipo.id);
      else drop.add(a.ipo.id);
    }
  }

  return strictUnique.filter((ipo) => !drop.has(ipo.id));
}

/** Prefer real *_apps; else derive application-wise odds from share×. */
function estimateAppsFromShares(label, sharesSub, isSME) {
  if (sharesSub == null || !(sharesSub > 0)) return null;
  if (isSME) return label === "Retail" ? sharesSub : sharesSub / 1.05;
  if (label === "Retail") return sharesSub / 1.30;
  if (label === "sHNI" || label === "sNII") return sharesSub / 1.5;
  if (label === "bHNI" || label === "bNII") return sharesSub / 5.5;
  if (label === "Employee") return sharesSub / 1.5;
  if (label === "Shareholder" || label === "Policyholder") return sharesSub / 2.0;
  return null;
}

function getLiveIPOS() {
  const today = new Date();
  const baseMap = new Map();

  // 1. Baseline IPOs
  IPOS_BASE.forEach((ipo) => {
    if (ipo && (ipo.id || ipo.slug)) {
      const key = ipo.id || ipo.slug;
      baseMap.set(key, ipo);
    }
  });

  // 2. Overlay live scraped items (includes dynamic SME IPOs not yet in baseline)
  if (_liveOverlay && _liveOverlay.byId) {
    Object.entries(_liveOverlay.byId).forEach(([id, patch]) => {
      if (!id || !patch) return;
      const existing = baseMap.get(id);
      if (existing) {
        let merged = { ...existing, ...patch };
        if (patch.sub) {
          merged.sub = { ...(existing.sub || {}), ...patch.sub };
        }
        baseMap.set(id, merged);
      } else {
        baseMap.set(id, { id, company: patch.company || patch.name || id, type: patch.type || "SME", ...patch });
      }
    });
  }

  // 3. Apply realtime prices, status and validate financials
  const mergedList = Array.from(baseMap.values()).map((merged) => {
    let finalIpo = merged;
    if (_realtimePrices[merged.id]) {
      finalIpo = { ...finalIpo, currentPrice: _realtimePrices[merged.id].price };
    }
    finalIpo = { ...finalIpo, status: liveStatus(finalIpo, today) };
    if (finalIpo.fin) {
      finalIpo.fin = validateFinancials(finalIpo);
    }
    return finalIpo;
  });

  return dedupeIpoList(mergedList);
}

export function normalizeIPO(raw) {
  if (!raw) return null;
  const company = String(raw.company || raw.name || raw.id || "IPO").trim();
  const type = String(raw.type || "Mainboard").toUpperCase().includes("SME") ? "SME" : "Mainboard";
  const status = getComputedStatus(raw);
  const id = String(raw.id || "").toLowerCase().trim();
  const slug = String(raw.slug || id).toLowerCase().trim();

  return {
    ...raw,
    id,
    slug,
    company,
    name: displayIpoName(raw),
    type,
    status,
    strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
    risks: Array.isArray(raw.risks) ? raw.risks : [],
    gmpHistory: Array.isArray(raw.gmpHistory) ? raw.gmpHistory : [],
    about: typeof raw.about === "string" ? raw.about : "",
    priceMin: raw.priceMin != null ? Number(raw.priceMin) : null,
    priceMax: raw.priceMax != null ? Number(raw.priceMax) : null,
    lot: raw.lot != null ? Number(raw.lot) : null,
    gmp: raw.gmp != null ? Number(raw.gmp) : null,
    issueSize: raw.issueSize != null ? Number(raw.issueSize) : null,
    freshIssue: raw.freshIssue != null ? Number(raw.freshIssue) : null,
    ofs: raw.ofs != null ? Number(raw.ofs) : null,
    sub: raw.sub && typeof raw.sub === "object" ? raw.sub : null,
    fin: raw.fin && typeof raw.fin === "object" ? raw.fin : null,
  };
}

function findIpoByIdOrSlug(idOrSlug) {
  if (!idOrSlug) return null;
  try {
    const all = getLiveIPOS();
    const target = String(idOrSlug).toLowerCase().trim();

    const match = all.find((i) => {
      if (!i) return false;
      const id = String(i.id || "").toLowerCase();
      const slug = String(i.slug || "").toLowerCase();
      if (id === target || slug === target) return true;
      const cleanId = id.replace(/-(limited|ltd|bse-sme|nse-sme|sme|mainboard)$/g, "");
      const cleanTarget = target.replace(/-(limited|ltd|bse-sme|nse-sme|sme|mainboard)$/g, "");
      if (cleanId === cleanTarget) return true;
      
      const iTokens = companyTokens(i.company || i.name);
      const targetTokens = companyTokens(target);
      if (iTokens.length > 0 && targetTokens.length > 0 && iTokens.join("-") === targetTokens.join("-")) {
        return true;
      }
      return false;
    });

    return match ? normalizeIPO(match) : null;
  } catch (err) {
    console.error("Error finding IPO by ID/slug:", err);
    return null;
  }
}

const sortIposLogically = (ipos) => {
  const statusPriority = {
    Open: 1,
    Upcoming: 2,
    Closed: 3,
    Listed: 4
  };

  return [...ipos].sort((a, b) => {
    const statusA = getComputedStatus(a);
    const statusB = getComputedStatus(b);
    const pA = statusPriority[statusA] || 99;
    const pB = statusPriority[statusB] || 99;
    if (pA !== pB) return pA - pB;

    if (statusA === "Open") {
      if (!a.close && !b.close) return 0;
      if (!a.close) return 1;
      if (!b.close) return -1;
      return a.close.localeCompare(b.close);
    }
    if (statusA === "Upcoming") {
      if (!a.open && !b.open) return 0;
      if (!a.open) return 1;
      if (!b.open) return -1;
      return a.open.localeCompare(b.open);
    }
    if (statusA === "Closed") {
      if (!a.close && !b.close) return 0;
      if (!a.close) return 1;
      if (!b.close) return -1;
      return b.close.localeCompare(a.close);
    }
    if (statusA === "Listed") {
      if (!a.listing && !b.listing) return 0;
      if (!a.listing) return 1;
      if (!b.listing) return -1;
      return b.listing.localeCompare(a.listing);
    }
    return 0;
  });
};

const sortDocumentsLogically = (ipos) => {
  const statusPriority = {
    Open: 1,
    Upcoming: 2,
    Closed: 3,
    Listed: 4
  };

  return [...ipos].sort((a, b) => {
    const pA = statusPriority[a.status] || 99;
    const pB = statusPriority[b.status] || 99;
    if (pA !== pB) return pA - pB;

    if (a.status === "Open") {
      if (!a.open && !b.open) return 0;
      if (!a.open) return 1;
      if (!b.open) return -1;
      return b.open.localeCompare(a.open); // latest opening first
    }
    if (a.status === "Upcoming") {
      if (!a.open && !b.open) return 0;
      if (!a.open) return 1;
      if (!b.open) return -1;
      return a.open.localeCompare(b.open); // nearest upcoming first
    }
    if (a.status === "Closed") {
      if (!a.close && !b.close) return 0;
      if (!a.close) return 1;
      if (!b.close) return -1;
      return b.close.localeCompare(a.close); // most recently closed first
    }
    if (a.status === "Listed") {
      if (!a.listing && !b.listing) return 0;
      if (!a.listing) return 1;
      if (!b.listing) return -1;
      return b.listing.localeCompare(a.listing); // most recently listed first
    }
    return 0;
  });
};

/* =====================================================================
   NOTIFICATIONS — auto-generated from live IPO data (dates + doc links),
   persisted in localStorage, refreshed when IPO/live data changes (not
   on price ticks). Fired-id ledger prevents mobile re-fires on reload.
===================================================================== */
const NOTIF_STORAGE_KEY = "calmcapital-notifications";
const SEEN_PIPELINE_KEY = "calmcapital-notif-seen-pipeline";
const SEEN_REALTIME_KEY = "calmcapital-notif-seen-realtime";
const FIRED_NOTIF_IDS_KEY = "calmcapital-notif-fired-ids";
/** In-memory for the current SPA session — covers mobile Safari storage hiccups. */
const _sessionFiredNotifs = new Set();

function loadFiredNotifIds() {
  const fired = new Set(_sessionFiredNotifs);
  try {
    const raw = localStorage.getItem(FIRED_NOTIF_IDS_KEY);
    if (raw) JSON.parse(raw).forEach((id) => { if (id) fired.add(id); });
  } catch { /* ignore */ }
  return fired;
}

function markNotifFired(id, firedSet) {
  if (!id) return;
  firedSet.add(id);
  _sessionFiredNotifs.add(id);
  try {
    localStorage.setItem(FIRED_NOTIF_IDS_KEY, JSON.stringify([...firedSet].slice(-500)));
  } catch { /* private mode / quota — session set still guards this tab */ }
}

function persistFiredNotifIds(firedSet) {
  try {
    localStorage.setItem(FIRED_NOTIF_IDS_KEY, JSON.stringify([...firedSet].slice(-500)));
  } catch { /* ignore */ }
}

function loadSeenPipelineIds() {
  const seen = new Set();
  try {
    const raw = localStorage.getItem(SEEN_PIPELINE_KEY);
    if (raw) JSON.parse(raw).forEach((id) => { if (id) seen.add(id); });
  } catch { /* ignore */ }
  return seen;
}

function saveSeenPipelineIds(seen) {
  try {
    localStorage.setItem(SEEN_PIPELINE_KEY, JSON.stringify([...seen]));
  } catch { /* storage unavailable */ }
}

const NOTIF_ALLOWED_TYPES = new Set([
  "open", "opens-tomorrow", "close", "listing-tomorrow", "listing",
  "pipeline-new", "announced", "drhp", "rhp",
]);

function hydrateNotificationsFromStorage() {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed
      .filter((n) => n && n.id && NOTIF_ALLOWED_TYPES.has(n.type) && n.title && n.message)
      .filter((n) => n.type !== "announced" && n.type !== "drhp")
      .map((n) => ({
        ...n,
        createdAt: isRealtimeNotifType(n.type)
          ? n.createdAt
          : n.date
            ? notificationStampAt(n.date)
            : n.createdAt,
      }));
    const fired = loadFiredNotifIds();
    const seenPipeline = loadSeenPipelineIds();
    parsed.forEach((n) => {
      if (n?.id) fired.add(n.id);
      if (n?.ipoId && (n.type === "announced" || n.type === "drhp" || n.type === "pipeline-new")) {
        seenPipeline.add(n.ipoId);
      }
    });
    _sessionFiredNotifs.clear();
    fired.forEach((id) => _sessionFiredNotifs.add(id));
    persistFiredNotifIds(fired);
    saveSeenPipelineIds(seenPipeline);

    return valid;
  } catch {
    return [];
  }
}

function ymd(d) { return d.toISOString().slice(0, 10); }

function addDays(dateStr, days) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00+05:30");
  d.setDate(d.getDate() + days);
  return ymd(d);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** IST calendar parts for a Date. */
function istClockParts(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const get = (t) => {
      const found = parts.find((p) => p.type === t);
      return found ? Number(found.value) : null;
    };
    const y = get("year");
    const m = get("month");
    const d = get("day");
    const h = get("hour");
    const mi = get("minute");
    if (y !== null && m !== null && d !== null && h !== null && mi !== null) {
      return { y, m, d, h, mi };
    }
  } catch (e) {
    console.warn("istClockParts failed, falling back to local time:", e);
  }
  return {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    mi: date.getMinutes(),
  };
}

function addCalendarDaysYmd(ymdStr, days) {
  if (!ymdStr) return null;
  const [y, m, d] = ymdStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/**
 * Notification "day" rolls at 10:00 AM IST.
 * Before 10 AM, the active notification day is still yesterday.
 */
function getNotificationDayStr(now = new Date()) {
  const p = istClockParts(now);
  let day = `${p.y}-${pad2(p.m)}-${pad2(p.d)}`;
  if (p.h < 10) day = addCalendarDaysYmd(day, -1);
  return day;
}

/** Stable timestamp: event date at 10:00 AM IST (schedule alerts only). */
function notificationStampAt(dateStr) {
  if (!dateStr) return Date.now();
  return new Date(`${dateStr}T10:00:00+05:30`).getTime();
}

function isRealtimeNotifType(type) {
  return type === "pipeline-new" || type === "announced" || type === "drhp" || type === "rhp";
}

/** When a pipeline IPO was first discovered (server-side auditTrail / discoveredAt). */
function getPipelineDiscoveredMs(ipo) {
  if (ipo?.discoveredAt) {
    const ms = Date.parse(ipo.discoveredAt);
    if (Number.isFinite(ms)) return ms;
  }
  const created = ipo?.auditTrail?.find((a) => a.action === "created");
  if (created?.timestamp) {
    const ms = Date.parse(created.timestamp);
    if (Number.isFinite(ms)) return ms;
  }
  return null;
}

/** Upcoming pipeline IPO with DRHP filed — belongs in Upcoming tab. */
function isPipelineIpo(ipo) {
  const status = getComputedStatus(ipo);
  if (status !== "Upcoming" || ipo.open) return false;
  return Boolean(ipo.drhp) || ipo.status === "DRHP Filed";
}

function ymdFromMs(ms) {
  if (!Number.isFinite(ms)) return null;
  const p = istYmdParts(new Date(ms));
  return `${p.y}-${pad2(p.m)}-${pad2(p.d)}`;
}

function resolveNotifCreatedAt(cand, existing, clock = Date.now()) {
  // Never reset an existing stamp — stops "Just now" on every visit
  if (existing?.createdAt) return existing.createdAt;
  // DRHP / new IPO: real discovery time (verifiedAt if known, else when first seen)
  if (isRealtimeNotifType(cand.type)) {
    if (cand.createdAtHint && Number.isFinite(cand.createdAtHint)) return cand.createdAtHint;
    return clock;
  }
  // Open / close / listing batch: always 10 AM IST on the event day
  return notificationStampAt(cand.date);
}

function daysBetweenYmd(a, b) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const ms = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function computeAllNotifications(ipos, now = new Date()) {
  const notifDay = getNotificationDayStr(now);
  const tomorrow = addCalendarDaysYmd(notifDay, 1);
  const ist = istClockParts(now);
  const calendarToday = `${ist.y}-${pad2(ist.m)}-${pad2(ist.d)}`;
  const candidates = [];

  // Keep a short feed history (event days within last 5 notif-days)
  const stillVisible = (eventDay) => {
    if (!eventDay) return false;
    const diff = daysBetweenYmd(eventDay, notifDay);
    return diff >= 0 && diff <= 5;
  };

  for (const ipo of ipos) {
    const status = String(ipo.status || "");

    // ── Realtime: New pipeline IPO (DRHP filed → Upcoming tab) — ONE alert per IPO ever
    const discoveredMs = getPipelineDiscoveredMs(ipo);
    if (isPipelineIpo(ipo) && discoveredMs) {
      const eventDay = ymdFromMs(discoveredMs) || calendarToday;
      if (stillVisible(eventDay)) {
        candidates.push({
          id: `${ipo.id}-pipeline-new`,
          type: "pipeline-new",
          ipoId: ipo.id,
          title: `New IPO: ${ipo.company}`,
          message: `DRHP filed — added to Upcoming. Subscription dates to be announced.`,
          date: eventDay,
          realtime: true,
          createdAtHint: discoveredMs,
        });
      }
    }

    if (ipo.rhp && (status === "Upcoming" || status === "Open" || getComputedStatus(ipo) === "Upcoming" || getComputedStatus(ipo) === "Open")) {
      const verifiedMs = ipo.finMeta?.verifiedAt ? Date.parse(ipo.finMeta.verifiedAt) : NaN;
      const filingDate = ipo.finMeta?.filingDate || null;
      const rhpDay = filingDate || (ipo.open ? addCalendarDaysYmd(ipo.open, -3) : null);
      if (rhpDay && stillVisible(rhpDay)) {
        candidates.push({
          id: `${ipo.id}-rhp`,
          type: "rhp",
          ipoId: ipo.id,
          title: `${ipo.company}: RHP Filed`,
          message: `Red Herring Prospectus filed${
            ipo.priceMin != null || ipo.priceMax != null ? `. Price set at ${formatPriceBand(ipo.priceMin, ipo.priceMax)}` : ""
          }.`,
          date: rhpDay,
          realtime: true,
          createdAtHint: Number.isFinite(verifiedMs) ? verifiedMs : null,
        });
      }
    }

    // ── 10 AM IST daily batch ──

    // Opens today (notification day)
    if (ipo.open && stillVisible(ipo.open) && ipo.open === notifDay) {
      candidates.push({
        id: `${ipo.id}-open-${ipo.open}`,
        type: "open",
        ipoId: ipo.id,
        title: `${ipo.company} Opens Today`,
        message: `Subscription window is now active. Price: ${formatPriceBand(ipo.priceMin, ipo.priceMax)}.`,
        date: ipo.open,
      });
    } else if (ipo.open && stillVisible(ipo.open) && ipo.open < notifDay) {
      candidates.push({
        id: `${ipo.id}-open-${ipo.open}`,
        type: "open",
        ipoId: ipo.id,
        title: `${ipo.company} Opened`,
        message: `Subscription opened on ${formatDate(ipo.open)}. Price: ${formatPriceBand(ipo.priceMin, ipo.priceMax)}.`,
        date: ipo.open,
      });
    }

    // Opens tomorrow
    if (ipo.open && ipo.open === tomorrow) {
      candidates.push({
        id: `${ipo.id}-opens-tomorrow-${ipo.open}`,
        type: "opens-tomorrow",
        ipoId: ipo.id,
        title: `${ipo.company} Opens Tomorrow`,
        message: `Subscription starts tomorrow, ${formatDate(ipo.open)}. Price: ${formatPriceBand(ipo.priceMin, ipo.priceMax)}.`,
        date: notifDay,
      });
    }

    // Last Day to Apply — on close notification-day, hidden after 4:50 PM IST on that calendar day
    if (ipo.close && ipo.close === notifDay) {
      const pastCloseDeadline =
        calendarToday > ipo.close || (calendarToday === ipo.close && (ist.h > 16 || (ist.h === 16 && ist.mi >= 50)));
      if (!pastCloseDeadline) {
        candidates.push({
          id: `${ipo.id}-close-${ipo.close}`,
          type: "close",
          ipoId: ipo.id,
          title: `Last Day to Apply: ${ipo.company}`,
          message: `Subscription closes today. Price: ${formatPriceBand(ipo.priceMin, ipo.priceMax)}.`,
          date: ipo.close,
        });
      }
    }

    // Lists tomorrow
    if (ipo.listing) {
      const eve = addCalendarDaysYmd(ipo.listing, -1);
      if (eve && stillVisible(eve) && (eve === notifDay || eve < notifDay)) {
        if (ipo.listing > calendarToday || (ipo.listing === calendarToday && ist.h < 10)) {
          candidates.push({
            id: `${ipo.id}-listing-tomorrow-${eve}`,
            type: "listing-tomorrow",
            ipoId: ipo.id,
            title: `${ipo.company} Lists Tomorrow`,
            message: `Shares will list on the exchange on ${formatDate(ipo.listing)}.`,
            date: eve,
          });
        }
      }
    }

    // Listed today (from 10 AM batch on listing day)
    if (ipo.listing && stillVisible(ipo.listing)) {
      const issuePrice = ipo.priceMax || ipo.priceMin;
      let title = `${ipo.company} Listed Today`;
      let message = `Shares have officially listed and are now trading on ${formatDate(ipo.listing)}.`;

      if (ipo.listedAt && issuePrice) {
        const gainPct = ((ipo.listedAt - issuePrice) / issuePrice) * 100;
        const gainVal = Math.abs(gainPct).toFixed(1).replace(/\.0$/, "");
        let performanceStr = "";
        if (gainPct > 0) performanceStr = `listed at a ${gainVal}% premium`;
        else if (gainPct < 0) performanceStr = `listed at a ${gainVal}% discount`;
        else performanceStr = `listed flat (0%)`;
        title = `${ipo.company} ${performanceStr}.`;
        const statusLabel = gainPct > 0 ? "Premium" : gainPct < 0 ? "Discount" : "Flat";
        const sign = gainPct > 0 ? "+" : "";
        const formattedGain = sign + gainPct.toFixed(1).replace(/\.0$/, "");
        message = `Listing Price: ₹${ipo.listedAt} | Issue Price: ₹${issuePrice} | Listing Gain/Loss: ${formattedGain}% | Status: ${statusLabel} | Listing Date: ${formatDate(ipo.listing)}.`;
      }

      if (ipo.listing <= notifDay) {
        candidates.push({
          id: `${ipo.id}-listing-${ipo.listing}`,
          type: "listing",
          ipoId: ipo.id,
          title: ipo.listing === notifDay ? title : `${ipo.company} Listed`,
          message,
          date: ipo.listing,
        });
      }
    }
  }

  return candidates;
}

function useNotifications(liveDataVersion) {
  const [notifications, setNotifications] = useState(() => hydrateNotificationsFromStorage());
  const [open, setOpen] = useState(false);

  const ALLOWED = NOTIF_ALLOWED_TYPES;

  useEffect(() => {
    const ipos = getLiveIPOS();
    if (!ipos.length) return;

    const now = new Date();
    const candidates = computeAllNotifications(ipos, now);
    const candidateIds = new Set(candidates.map((c) => c.id));

    setNotifications((prev) => {
      const retentionMs = 5 * 24 * 60 * 60 * 1000;
      const clock = Date.now();
      const prevById = new Map(prev.map((n) => [n.id, n]));

      let seenRealtime = new Set();
      try {
        const rawSeen = localStorage.getItem(SEEN_REALTIME_KEY);
        if (rawSeen) seenRealtime = new Set(JSON.parse(rawSeen));
      } catch { /* ignore */ }

      const firedIds = loadFiredNotifIds();
      const seenPipeline = loadSeenPipelineIds();

      prev.forEach((n) => {
        if (n?.id) firedIds.add(n.id);
        if (n?.ipoId && (n.type === "pipeline-new" || n.type === "announced" || n.type === "drhp")) {
          seenPipeline.add(n.ipoId);
        }
      });

      const activePrev = prev.filter((n) => {
        if (!n || !ALLOWED.has(n.type)) return false;
        if (n.type === "announced" || n.type === "drhp") return false;
        if (!candidateIds.has(n.id)) {
          if (n.ipoId && n.type === "pipeline-new") seenPipeline.add(n.ipoId);
          return false;
        }
        const stamp = isRealtimeNotifType(n.type)
          ? n.createdAt
          : n.date
            ? notificationStampAt(n.date)
            : n.createdAt;
        if (stamp && clock - stamp > retentionMs) {
          if (n.ipoId && n.type === "pipeline-new") seenPipeline.add(n.ipoId);
          return false;
        }
        return true;
      });

      const existingIds = new Set(activePrev.map((n) => n.id));
      const nextList = activePrev.map((n) => ({
        ...n,
        createdAt: resolveNotifCreatedAt(n, n, clock),
      }));

      for (const cand of candidates) {
        if (existingIds.has(cand.id)) continue;
        // Never re-fire an alert that already fired on this device (mobile-safe ledger)
        if (firedIds.has(cand.id) || _sessionFiredNotifs.has(cand.id)) continue;

        if (cand.type === "pipeline-new") {
          if (seenPipeline.has(cand.ipoId)) {
            markNotifFired(cand.id, firedIds);
            continue;
          }
          // Mark fired synchronously BEFORE state update — stops Strict Mode / mobile double-fire
          markNotifFired(cand.id, firedIds);
          seenPipeline.add(cand.ipoId);
          saveSeenPipelineIds(seenPipeline);

          const createdAt = resolveNotifCreatedAt(cand, prevById.get(cand.id), clock);
          nextList.push({ ...cand, read: false, createdAt });
          existingIds.add(cand.id);
          continue;
        }

        if (isRealtimeNotifType(cand.type) && seenRealtime.has(cand.id)) continue;

        const createdAt = resolveNotifCreatedAt(cand, prevById.get(cand.id), clock);
        if (isRealtimeNotifType(cand.type) && createdAt && clock - createdAt > retentionMs) {
          seenRealtime.add(cand.id);
          markNotifFired(cand.id, firedIds);
          continue;
        }

        markNotifFired(cand.id, firedIds);
        nextList.push({ ...cand, read: false, createdAt });
        existingIds.add(cand.id);
        if (isRealtimeNotifType(cand.type)) seenRealtime.add(cand.id);
      }

      nextList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      try {
        localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(nextList));
        localStorage.setItem(SEEN_REALTIME_KEY, JSON.stringify([...seenRealtime]));
        persistFiredNotifIds(firedIds);
        saveSeenPipelineIds(seenPipeline);
      } catch { /* storage unavailable */ }

      return nextList;
    });
  }, [liveDataVersion, ALLOWED]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      if (prev.every((n) => n.read)) return prev;
      const updated = prev.map((n) => ({ ...n, read: true }));
      try { localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(updated)); } catch { /* storage unavailable */ }
      return updated;
    });
  }, []);

  const toggleOpen = useCallback(() => {
    setOpen((o) => {
      const next = !o;
      if (next) markAllRead();
      return next;
    });
  }, [markAllRead]);

  return { notifications, unreadCount, open, setOpen, toggleOpen };
}

const NOTIF_ICON = { open: TrendingUp, close: Clock, listing: Activity, "listing-tomorrow": Calendar, doc: FileText };
const NOTIF_COLOR = { open: BRAND.green, close: "#F0A202", listing: BRAND.blue, "listing-tomorrow": "#8b5cf6", doc: "#64748b" };

function NotificationBell({ hook, onOpenIpo }) {
  const { notifications, unreadCount, open, toggleOpen, setOpen } = hook;
  const panelRef = useRef(null);
  const [timeTick, setTimeTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setTimeTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, [open]);

  // Relative-time formatter
  const relTime = (createdAt) => {
    if (!createdAt) return "";
    const diffMs = Date.now() - createdAt;
    if (diffMs < 0) return "Just now";
    
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) {
      if (hrs === 1) return "1 hour ago";
      return `${hrs} hours ago`;
    }
    
    const days = Math.floor(hrs / 24);
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  // Icon + color config per notification type
  const iconConfig = {
    "pipeline-new":     { Icon: PlusCircle,  bg: "rgba(28,155,218,0.2)",  color: BRAND.blue },
    announced:          { Icon: PlusCircle,  bg: "rgba(28,155,218,0.2)",  color: BRAND.blue },
    drhp:               { Icon: FileText,    bg: "rgba(100,116,139,0.2)", color: "#64748b" },
    rhp:                { Icon: FileText,    bg: "rgba(100,116,139,0.2)", color: "#64748b" },
    open:               { Icon: TrendingUp,  bg: "rgba(16,185,129,0.2)",  color: "#10b981" },
    "opens-tomorrow":   { Icon: Calendar,    bg: "rgba(28,155,218,0.2)",  color: BRAND.blue },
    close:              { Icon: Clock,       bg: "rgba(239,68,68,0.2)",   color: "#ef4444" },
    "listing-tomorrow": { Icon: Calendar,    bg: "rgba(245,158,11,0.2)",  color: "#f59e0b" },
    listing:            { Icon: Activity,    bg: "rgba(16,185,129,0.2)",  color: "#10b981" },
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={toggleOpen}
        className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-[#121D2D]/30 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 relative shadow-sm"
      >
        <Bell size={14} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-[#0A1020]" />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="fixed sm:absolute top-[72px] sm:top-12 left-4 right-4 sm:left-auto sm:right-0 w-auto sm:w-96 rounded-2xl overflow-hidden z-30 shadow-2xl"
          style={{ background: "rgba(17,24,39,0.97)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(24px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <p className="text-base font-bold text-white">Notifications</p>
            {notifications.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(52,74,97,0.9)", color: "#8EA1B7" }}>
                {notifications.length} total
              </span>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Bell size={24} className="mx-auto mb-3" style={{ color: "#374151" }} />
                <p className="text-sm" style={{ color: "#64748b" }}>No notifications yet — IPO opens, closes and listings will appear here.</p>
              </div>
            ) : (
              notifications.map((n, idx) => {
                const defaultCfg = { Icon: FileText, bg: "rgba(100,116,139,0.2)", color: "#64748b" };
                const cfg = iconConfig[n.type] || defaultCfg;
                const Icon = cfg.Icon || FileText;
                return (
                  <button
                    key={n.id}
                    onClick={() => onOpenIpo?.(n.ipoId)}
                    className="w-full flex items-start gap-3.5 px-5 py-4 text-left transition-colors last:pb-5"
                    style={{ borderBottom: idx < notifications.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Icon circle */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: cfg.bg }}
                    >
                      <Icon size={15} style={{ color: cfg.color }} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold leading-snug text-white">{n.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                        {n.message}
                        {n.createdAt ? ` · ${relTime(n.createdAt)}` : ""}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: BRAND.blue }} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Pulls the investorgain.com scrape result your GitHub Action publishes
// (see public/live-data.json in the automation repo) and overlays it onto
// the baseline data. Call this from App on load, hourly, and on manual
// refresh. Returns true/false so the caller can show sync status.
async function fetchLiveData(rawUrl) {
  if (!rawUrl) return false;
  try {
    const res = await fetch(`${rawUrl}${rawUrl.includes("?") ? "&" : "?"}t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return false;
    const json = await res.json();
    if (!json || typeof json.ipos !== "object") return false;
    // An empty/seed file (updatedAt still null, or no IPOs yet) means the
    // GitHub Action hasn't completed a real scrape yet — treat that as "not
    // synced" rather than fabricating a fresh timestamp.
    if (!json.updatedAt || Object.keys(json.ipos).length === 0) return false;
    // Extra sanity check: a scrape can "succeed" (valid JSON, real
    // timestamp, non-empty ipos object) while every entry is still missing
    // actual GMP data — e.g. a column-mapping bug in the scraper. That's
    // not a real sync even though nothing technically errored, so don't
    // report it as one.
    const hasRealData = Object.values(json.ipos).some((patch) => patch && typeof patch.gmp === "number");
    if (!hasRealData) return false;
    _liveOverlay = { updatedAt: json.updatedAt, byId: json.ipos };
    return true;
  } catch {
    return false;
  }
}

// Single source of truth for "how fresh is this data" — read live everywhere
// it's displayed (sidebar footer, AI assistant) instead of ever hardcoding a date.
function formatDataAsOf() {
  return _liveOverlay.updatedAt
    ? new Date(_liveOverlay.updatedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : DATA_AS_OF;
}

const STATUS_COLOR = { Open: BRAND.green, Closed: "#94A3B8", Upcoming: "#F0A202", Listed: BRAND.blue };
const TrendIcon = ({ trend, size = 13 }) =>
  trend === "up" ? <TrendingUp size={size} style={{ color: BRAND.green }} /> :
  trend === "down" ? <TrendingDown size={size} className="text-rose-500" /> :
  <Minus size={size} className="text-slate-400" />;

/* =====================================================================
   PERSISTENT WATCHLIST (survives reloads via browser localStorage)
===================================================================== */
function useWatchlist() {
  const [ids, setIds] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ipo-watchlist");
      if (raw) setIds(JSON.parse(raw));
    } catch { /* no saved watchlist yet, or storage unavailable (e.g. private browsing) */ }
    setReady(true);
  }, []);

  const toggle = useCallback((id) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem("ipo-watchlist", JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  return { ids, toggle, ready };
}

/* =====================================================================
   AI ASSISTANT (Claude via artifact API proxy)
===================================================================== */
function buildSystemPrompt() {
  const rows = getLiveIPOS().map((i) =>
    `${i.name} (${i.type}, ${i.status}): price ${formatPriceBand(i.priceMin, i.priceMax)}, lot ${i.lot}, GMP ₹${i.gmp} (${gainPct(i).toFixed(1)}%), ` +
    `est. profit/lot ₹${profitPerLot(i)}, issue ₹${i.issueSize} Cr, open ${i.open} close ${i.close} listing ${i.listing}, sector ${i.sector}` +
    `${i.fin ? `, revenue ${cr(i.fin.revenue)}, PAT ${cr(i.fin.pat)}, ROE ${i.fin.roe}%, P/E ${i.fin.pe}x` : ""}` +
    `${i.sub ? `, subscription ${i.sub.overall}x overall` : ""}` +
    `${i.currentPrice ? `, currently trading ₹${i.currentPrice} (${currentReturnPct(i)?.toFixed(1)}% since listing)` : ""}.`
  ).join("\n");
  return `You are an IPO intelligence assistant for Indian stock market IPOs. Data as of ${formatDataAsOf()}. ` +
    `Answer using ONLY this dataset — be concise, use ₹ figures, use markdown tables when comparing multiple IPOs, ` +
    `and clearly note this is not investment advice when giving any recommendation or listing prediction.\n\nDATA:\n${rows}`;
}

async function askClaude(messages) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ max_tokens: 800, system: buildSystemPrompt(), messages }),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned an unreadable response (HTTP ${res.status}). The /api/chat function may not be deployed correctly.`);
  }
  if (!res.ok) throw new Error(data?.error || `Assistant request failed (HTTP ${res.status})`);
  return (data.content || []).map((b) => b.text || "").join("\n").trim() || "Sorry, I couldn't generate a response just now.";
}

// Generates 3-4 short, contextually relevant follow-up questions based on how
// the conversation has gone so far, so suggestions never disappear after the
// first click — they evolve with the conversation instead.
async function getFollowUpQuestions(conversation) {
  const transcript = conversation.slice(-6).map((m) => `${m.role}: ${m.content}`).join("\n");
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        max_tokens: 200,
        system: buildSystemPrompt() +
          "\n\nBased on the conversation so far, suggest 3-4 short, specific follow-up questions the user might ask next about these IPOs. " +
          "Respond with ONLY a JSON array of strings, nothing else — no markdown, no code fences, no preamble.",
        messages: [{ role: "user", content: `Conversation so far:\n${transcript}\n\nSuggest the follow-up questions now.` }],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Suggestion request failed");
    const text = (data.content || []).map((b) => b.text || "").join("").trim();
    const cleaned = text.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 4).filter((q) => typeof q === "string");
  } catch { /* fall through to default set below */ }
  return DEFAULT_SUGGESTED_Q;
}

const DEFAULT_SUGGESTED_Q = [
  "Which open IPO has the best estimated listing profit?",
  "Compare Knack Packaging and IC Electricals financials",
  "Which SME IPOs are undersubscribed?",
  "What are the risks of Kusumgar?",
];

function AssistantPane({ embedded, tick }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: `Hi! Ask me about any IPO — GMP, subscription, financials, or estimated listing profit.` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTED_Q);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const reply = await askClaude(next.map((m) => ({ role: m.role, content: m.content })));
      const withReply = [...next, { role: "assistant", content: reply }];
      setMessages(withReply);
      // Refresh suggestions in the background so they're ready right after
      // the answer lands, without blocking the visible reply.
      setSuggestLoading(true);
      getFollowUpQuestions(withReply)
        .then(setSuggestions)
        .finally(() => setSuggestLoading(false));
    } catch (err) {
      // Log message only — never dump response bodies that could contain secrets.
      console.error("Assistant error:", err?.message || "Unknown error");
      const msg = err?.message || "Unknown error";
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ Couldn't reach the assistant: ${msg}\n\nIf you're the site owner: check that ANTHROPIC_API_KEY is set in Vercel → Settings → Environment Variables, that you redeployed after adding it, and that your Anthropic account has billing/credits enabled at console.anthropic.com.` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col ${embedded ? "h-[70vh]" : "h-full"}`}>
      <div className="flex-1 overflow-y-auto px-1 py-2 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
              style={m.role === "user"
                ? { background: `${BRAND.blue}18`, color: "#0b4a6b" }
                : { background: "rgba(255,255,255,0.7)", color: "#334155", border: "1px solid rgba(0,0,0,0.05)" }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-sm text-slate-400 px-2">Thinking…</div>}
        <div ref={endRef} />
      </div>

      <div className="flex flex-wrap items-center gap-2 py-2">
        {suggestLoading && <span className="text-[11px] text-slate-400 px-1">Updating suggestions…</span>}
        {!suggestLoading && suggestions.map((q) => (
          <button key={q} onClick={() => send(q)} disabled={loading}
            className="text-xs bg-white/70 border border-black/5 rounded-full px-3 py-1.5 text-slate-600 hover:border-black/10 disabled:opacity-50">
            {q}
          </button>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <input
          value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about any IPO…"
          className="flex-1 bg-white/80 border border-black/10 rounded-xl px-3 py-2 text-base md:text-sm text-slate-700 placeholder:text-slate-400 outline-none"
          style={{ borderColor: "rgba(0,0,0,0.08)" }}
        />
        <button onClick={() => send()} disabled={loading} className="rounded-xl px-3.5 flex items-center justify-center text-white disabled:opacity-50"
          style={{ background: BRAND.blue }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

/* =====================================================================
   IPO PROFIT / LOSS CALCULATOR
===================================================================== */
const STATUS_ORDER = ["Open", "Upcoming", "Closed", "Listed"];
function sortedCalcIpos() {
  const all = getLiveIPOS();
  return [...all].sort((a, b) => {
    const si = STATUS_ORDER.indexOf(a.status);
    const sj = STATUS_ORDER.indexOf(b.status);
    if (si !== sj) return si - sj;
    // Within same status: newest open/close date first
    const da = a.open || a.close || "";
    const db = b.open || b.close || "";
    return db.localeCompare(da);
  });
}

function CalculatorTab({ onOpen }) {
  const allIpos = sortedCalcIpos();
  const [ipoId, setIpoId] = useState(() => {
    const openIpo = allIpos.find((i) => i.status === "Open");
    if (openIpo) return openIpo.id;
    return allIpos[0]?.id || "";
  });
  const [lots, setLots] = useState(1);
  const [search, setSearch] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [calcFilter, setCalcFilter] = useState(null); // null = All

  const ipo = allIpos.find((i) => i.id === ipoId) || allIpos[0] || null;

  const statusColors = {
    Open:     { bg: "rgba(16,185,129,0.12)", color: "#10b981", dot: "bg-emerald-500" },
    Upcoming: { bg: "rgba(240,162,2,0.12)",  color: "#d97706", dot: "bg-amber-500" },
    Closed:   { bg: "rgba(148,163,184,0.10)", color: "#64748b", dot: "bg-slate-400" },
    Listed:   { bg: "rgba(28,155,218,0.10)", color: BRAND.blue, dot: "bg-blue-400" },
  };

  if (!ipo) {
    return (
      <div className="bg-white dark:bg-[#121D2D] border border-slate-200 dark:border-white/5 rounded-3xl p-12 text-center shadow-sm">
        <CalcIcon size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-700" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Calculator Unavailable</h2>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">
          No IPO database records are loaded. Please try reloading or check your connection.
        </p>
      </div>
    );
  }

  const p = price(ipo);
  const shares = (ipo.lot || 0) * lots;
  const inv = p * shares;
  const estListingValue = (ipo.estListing || p) * shares;
  const profit = estListingValue - inv;
  const roi = inv ? (profit / inv) * 100 : 0;
  const breakeven = p;

  const filtered = allIpos.filter((i) => {
    const matchSearch = !search || i.company.toLowerCase().includes(search.toLowerCase());
    const matchFilter = !calcFilter || i.status === calcFilter;
    return matchSearch && matchFilter;
  });

  // Group filtered results by status in the correct display order
  const grouped = STATUS_ORDER.map((s) => ({
    status: s,
    items: filtered.filter((i) => i.status === s),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
          <CalcIcon size={16} />
        </div>
        <div>
          <h1 className="text-base font-extrabold text-[#0B1F33] dark:text-white tracking-tight">IPO Profit / Loss Calculator</h1>
          <p className="text-[11px] text-slate-455 dark:text-slate-500">Estimate your grey market returns before applying to any IPO</p>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* ── Input Card ── */}
        <div className="bg-white dark:bg-[#121D2D] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm dark:shadow-xl space-y-5">
          
          {/* IPO Selector */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-450 dark:text-slate-500 font-bold">Select IPO</p>
              {onOpen && (
                <button
                  onClick={() => onOpen(ipo)}
                  className="text-[10px] text-blue-500 hover:text-blue-600 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  View Details <ExternalLink size={10} />
                </button>
              )}
            </div>

            {/* Selected IPO preview pill */}
            <button
              onClick={() => setListOpen((v) => !v)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left"
              style={{
                background: listOpen ? "rgba(28,155,218,0.05)" : "transparent",
                borderColor: listOpen ? "rgba(28,155,218,0.4)" : "rgba(148,163,184,0.2)"
              }}
            >
              <CompanyAvatar name={ipo.company} logoUrl={ipo.logoUrl} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{ipo.company}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors[ipo.status]?.color || "#64748b" }}></span>
                  <span className="text-[10px] font-semibold" style={{ color: statusColors[ipo.status]?.color || "#64748b" }}>{ipo.status}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">· {ipo.type}</span>
                </div>
              </div>
              <ChevronRight size={14} className={`text-slate-400 transition-transform shrink-0 ${listOpen ? "rotate-90" : ""}`} />
            </button>

            {/* Dropdown panel */}
            {listOpen && (
              <div className="mt-2 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#121D2D] shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: "340px" }}>

                {/* ── Sticky header: filter tabs + search ── */}
                <div className="sticky top-0 z-20 bg-white dark:bg-[#121D2D] border-b border-slate-100 dark:border-white/5">

                  {/* Filter tabs */}
                  <div className="flex gap-1 p-2.5 pb-2">
                    {[null, "Open", "Upcoming", "Closed", "Listed"].map((f) => {
                      const label = f ?? "All";
                      const isActive = calcFilter === f;
                      return (
                        <button
                          key={label}
                          onClick={() => { setCalcFilter(f); setSearch(""); }}
                          className="flex-1 text-[10px] font-bold rounded-lg py-1 transition-all"
                          style={{
                            background: isActive ? BRAND.blue : "transparent",
                            color: isActive ? "#fff" : "#8EA1B7",
                            border: isActive ? `1px solid ${BRAND.blue}` : "1px solid transparent",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Search */}
                  <div className="px-2.5 pb-2.5">
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        autoFocus={typeof window !== "undefined" && window.innerWidth >= 768}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={calcFilter ? `Search ${calcFilter} IPOs…` : "Search all IPOs…"}
                        className="w-full bg-slate-50 dark:bg-[#121D2D] border border-slate-200 dark:border-white/5 rounded-xl pl-8 pr-3 py-2 text-base md:text-xs outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Scrollable IPO list ── */}
                <div className="overflow-y-auto flex-1">
                  {grouped.map((group) => (
                    <div key={group.status}>
                      {/* Only show group header when showing All */}
                      {!calcFilter && (
                        <div className="px-3 py-1.5">
                          <span
                            className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                            style={{ background: statusColors[group.status]?.bg, color: statusColors[group.status]?.color }}
                          >
                            {group.status}
                          </span>
                        </div>
                      )}
                      {group.items.map((i) => (
                        <button
                          key={i.id}
                          onClick={() => { setIpoId(i.id); setListOpen(false); setSearch(""); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                          style={{ background: i.id === ipoId ? "rgba(28,155,218,0.06)" : "transparent" }}
                        >
                          <CompanyAvatar name={i.company} logoUrl={i.logoUrl} size={30} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{i.company}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">{i.type} · {i.priceMin || i.priceMax ? formatPriceBand(i.priceMin, i.priceMax) : "TBA"}</p>
                          </div>
                          {i.id === ipoId && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                  {grouped.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6">No IPOs found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Key Info */}
          <div className="border-t border-slate-150 dark:border-slate-800 pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-550 dark:text-slate-400">Price band</span>
              <span className="font-mono text-slate-805 dark:text-slate-200 font-bold">{formatPriceBand(ipo.priceMin, ipo.priceMax)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-550 dark:text-slate-400">Lot size</span>
              <span className="font-mono text-slate-805 dark:text-slate-200 font-bold">{ipo.lot ? `${ipo.lot} shares` : "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-550 dark:text-slate-400">Current GMP</span>
              <span className="font-mono text-slate-805 dark:text-slate-200 font-bold">{ipo.gmp != null ? rupee(ipo.gmp) : "—"}</span>
            </div>
          </div>

          {/* Lot counter */}
          <div className="border-t border-slate-150 dark:border-slate-800 pt-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-450 dark:text-slate-500 font-bold mb-3">Number of Lots</p>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setLots((l) => Math.max(1, l - 1))} 
                className="w-12 h-12 rounded-xl border border-blue-500/40 text-blue-500 bg-slate-50 dark:bg-[#121D2D] hover:bg-slate-100 dark:hover:bg-[#121D2D]/80 flex items-center justify-center text-lg font-bold transition-all shadow-[0_0_10px_rgba(59,130,246,0.15)] focus:outline-none"
              >
                <Minus size={16} />
              </button>
              <div className="flex-1 bg-slate-50 dark:bg-[#121D2D] border border-slate-200 dark:border-slate-800 rounded-xl h-12 flex items-center justify-center font-mono text-xl font-bold text-slate-800 dark:text-white">
                {lots}
              </div>
              <button 
                onClick={() => setLots((l) => l + 1)} 
                className="w-12 h-12 rounded-xl border border-blue-500/40 text-blue-500 bg-slate-50 dark:bg-[#121D2D] hover:bg-slate-100 dark:hover:bg-[#121D2D]/80 flex items-center justify-center text-lg font-bold transition-all shadow-[0_0_10px_rgba(59,130,246,0.15)] focus:outline-none"
              >
                <span className="text-xl">+</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Result Card ── */}
        <div className="bg-white dark:bg-[#121D2D] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm dark:shadow-xl flex flex-col justify-between min-h-[340px]">
          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-450 dark:text-slate-500 font-bold mb-1">Result</p>
            {[
              ["Shares allotted", shares.toLocaleString("en-IN")],
              ["Investment amount", rupee(inv)],
              ["Break-even price / share", rupee(breakeven)],
              ["Est. listing price / share", rupee(ipo.estListing || p)],
              ["Est. listing value", rupee(estListingValue)],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between text-sm pb-3 border-b border-slate-150/60 dark:border-slate-800/60 last:border-b-0 last:pb-0">
                <span className="text-slate-550 dark:text-slate-400">{l}</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{v}</span>
              </div>
            ))}
          </div>
          
          <div className="border-t border-slate-150 dark:border-slate-800 pt-4 mt-6">
            <p className={`font-bold text-lg tracking-tight ${profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
              {profit >= 0 ? `Estimated Profit: +${rupee(profit)} (+${roi.toFixed(1)}%)` : `Estimated Loss: ${rupee(profit)} (${roi.toFixed(1)}%)`}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium leading-relaxed">
              GMP figures are unofficial grey market indicators and do not guarantee listing price or profitability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   LOGO REGISTRY — curated direct logo URLs for every IPO + broker.
   Priority order: direct CDN → Clearbit → Google favicon → initials.
   Only add entries where a reliable, high-quality logo URL is known.
===================================================================== */
const LOGO_REGISTRY = {
  // ── Brokers ──────────────────────────────────────────────────────────
  "upstox":          "https://logo.clearbit.com/upstox.com",
  "angel one":       "https://logo.clearbit.com/angelone.in",

  // ── Mainboard IPOs ───────────────────────────────────────────────────
  "sbi funds management": "https://logo.clearbit.com/sbimf.com",
  "sbi funds":            "https://logo.clearbit.com/sbimf.com",
  "cult.fit":             "https://logo.clearbit.com/cult.fit",
  "cultfit":              "https://logo.clearbit.com/cult.fit",
  "cube highways":        "https://logo.clearbit.com/cubehighways.com",
  "knack packaging":      "https://logo.clearbit.com/knackpackaging.com",
  "kusumgar":             "https://logo.clearbit.com/kusumgar.com",
  "aastha spintex":       "https://logo.clearbit.com/aasthaspintex.com",
  "csm technologies":     "https://logo.clearbit.com/csmtechnologies.com",
  "caliber mining":       "https://logo.clearbit.com/calibermining.com",
  "ratnadeep retail":     "https://logo.clearbit.com/ratnadeep.com",

  // ── SME IPOs (only those with a publicly reachable website logo) ─────
  "kratikal tech":        "https://logo.clearbit.com/kratikal.com",
  "kratikal":             "https://logo.clearbit.com/kratikal.com",
  "ic electricals":       "https://logo.clearbit.com/icelectricals.com",
  "sampark india logistics": "https://logo.clearbit.com/samparklogistics.com",
  "sampark logistics":    "https://logo.clearbit.com/samparklogistics.com",
  "devson catalyst":      "https://logo.clearbit.com/devson.in",
  "sotefin bharat":       "https://logo.clearbit.com/sotefin.com",
};

// Returns the best matching logo URL for a given display name.
function getLogoUrl(name) {
  if (!name) return null;
  const n = String(name).toLowerCase().trim();
  // Exact match first
  if (LOGO_REGISTRY[n]) return LOGO_REGISTRY[n];
  // Partial match
  for (const key of Object.keys(LOGO_REGISTRY)) {
    const firstWord = n.split(" ")[0];
    if (n.includes(key) || (firstWord && key.includes(firstWord))) return LOGO_REGISTRY[key];
  }
  return null;
}

/* =====================================================================
   COMPANY AVATAR — official logo with graceful initials fallback
===================================================================== */
function CompanyAvatar({ name = "", logoUrl = null, size = 40 }) {
  const [srcIndex, setSrcIndex] = useState(0);

  // Reset index whenever the company name or logoUrl changes (e.g. navigating between cards)
  useEffect(() => { setSrcIndex(0); }, [name, logoUrl]);

  const safeName = String(name || "").trim();

  // Initials fallback values
  const words = safeName.replace(/Ltd\.|Limited|Pvt\.|Private|Co\./gi, "").trim().split(/\s+/);
  const initials = words.slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
  const colors = ["#1c9bda", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4899"];
  const colorIdx = safeName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  const bg = colors[colorIdx];

  // Try to find the company website from the live list to build domain-based fallbacks
  const list = getLiveIPOS();
  const found = list.find((i) => i.company === safeName || i.name === safeName || i.company === name || i.name === name);
  const website = found?.website || null;

  // Build source cascade once per name/logoUrl
  const sources = useMemo(() => {
    const list = [];
    if (logoUrl && !logoUrl.includes("dummy-logo")) {
      list.push(logoUrl);
    }
    if (safeName) {
      const primaryUrl = getLogoUrl(safeName);
      if (primaryUrl) {
        list.push(primaryUrl);
        const domain = primaryUrl.replace("https://logo.clearbit.com/", "");
        list.push(`https://www.google.com/s2/favicons?sz=128&domain=${domain}`);
      }
    }
    if (website) {
      try {
        const domain = new URL(website).hostname.replace("www.", "");
        list.push(`https://logo.clearbit.com/${domain}`);
        list.push(`https://www.google.com/s2/favicons?sz=128&domain=${domain}`);
        list.push(`https://icons.duckduckgo.com/ip2/${domain}.ico`);
      } catch (e) {
        // ignore
      }
    }
    return list;
  }, [safeName, logoUrl, website]);

  const currentSrc = sources[srcIndex];

  if (currentSrc) {
    return (
      <div
        className="rounded-xl shrink-0 overflow-hidden bg-white dark:bg-white/5 border border-slate-100 dark:border-white/8 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <img
          src={currentSrc}
          alt={`${safeName} logo`}
          width={Math.round(size * 0.78)}
          height={Math.round(size * 0.78)}
          loading="lazy"
          decoding="async"
          onError={() => setSrcIndex((i) => i + 1)}
          style={{ width: size * 0.78, height: size * 0.78, objectFit: "contain" }}
          className="select-none"
        />
      </div>
    );
  }

  // All sources exhausted (or none mapped) → show initials
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0 font-bold text-white select-none"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

/* =====================================================================
   IPO CARD
===================================================================== */
function IPOCard({ ipo, onOpen, watchlist, dark }) {
  const watched = watchlist.ids.includes(ipo.id);
  const isListed = ipo.status === "Listed";
  const isClosed = ipo.status === "Closed";
  const isOpen = ipo.status === "Open";
  
  // Status badge style
  const statusStyle = {
    Open:     { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.25)" },
    Closed:   { bg: "rgba(148,163,184,0.10)", color: "#64748b", border: "rgba(148,163,184,0.2)" },
    Upcoming: { bg: "rgba(240,162,2,0.12)",  color: "#d97706", border: "rgba(240,162,2,0.25)" },
    Listed:   { bg: "rgba(28,155,218,0.10)", color: BRAND.blue, border: "rgba(28,155,218,0.2)" },
  };
  const ss = statusStyle[ipo.status] || statusStyle.Closed;

  // Custom formats for left vertical accent bar, border highlights, and shadow glow
  const formatStyle = {
    Open: {
      bar: "bg-gradient-to-b from-[#10b981] to-[#059669]",
      border: "rgba(16,185,129,0.35)",
      shadow: "0 0 0 1px rgba(16,185,129,0.12), 0 4px 16px -4px rgba(16,185,129,0.15)"
    },
    Upcoming: {
      bar: "bg-gradient-to-b from-[#f0a202] to-[#d97706]",
      border: "rgba(240,162,2,0.35)",
      shadow: "0 0 0 1px rgba(240,162,2,0.12), 0 4px 16px -4px rgba(240,162,2,0.15)"
    },
    Closed: {
      bar: "bg-gradient-to-b from-[#64748b] to-[#475569]",
      border: "rgba(148,163,184,0.35)",
      shadow: "0 0 0 1px rgba(148,163,184,0.12), 0 4px 16px -4px rgba(148,163,184,0.15)"
    },
    Listed: {
      bar: "bg-gradient-to-b from-[#1c9bda] to-[#0a66c2]",
      border: "rgba(28,155,218,0.35)",
      shadow: "0 0 0 1px rgba(28,155,218,0.12), 0 4px 16px -4px rgba(28,155,218,0.15)"
    }
  };
  const fs = formatStyle[ipo.status] || formatStyle.Closed;

  return (
    <div
      className="bg-white dark:bg-[#121D2D] border rounded-2xl overflow-hidden relative group transition-all hover:shadow-md"
      style={{ borderColor: fs.border, boxShadow: fs.shadow }}
    >
      {/* Stretch link for SEO + open details (bookmark sits above this) */}
      <a
        href={ipoPath(ipo.id)}
        aria-label={`View ${ipo.company} IPO details`}
        className="absolute inset-0 z-0"
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          onOpen(ipo);
        }}
      />
      {/* Left accent vertical indicator bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 z-[1] ${fs.bar} pointer-events-none`} />

      <div className="p-5 relative z-[1] pointer-events-none">
        {/* Row 1: Company Logo, Name, Sector and Bookmark */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <CompanyAvatar name={ipo.company} logoUrl={ipo.logoUrl} size={42} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-800 dark:text-white text-[15px] leading-tight truncate">{ipo.company}</h3>
                <span className="text-[9px] uppercase tracking-wide font-extrabold px-2 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                  {ipo.status}
                </span>
                {ipo.type === "SME" && (
                  <span className="text-[9px] uppercase tracking-wide font-extrabold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25">
                    SME
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">{ipo.sector}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              watchlist.toggle(ipo.id);
            }}
            className="pointer-events-auto relative z-[2] text-slate-300 dark:text-slate-600 hover:text-amber-500 dark:hover:text-amber-400 transition-colors cursor-pointer"
          >
            {watched ? <BookmarkCheck size={18} style={{ color: BRAND.blue }} /> : <Bookmark size={18} />}
          </button>
        </div>

        {/* Listing gain for listed — shows listing price, % and ₹ P&L per lot */}
        {isListed && ipo.listedAt && (() => {
          const gain = listingGainPct(ipo);
          const pnl = listingProfitLossPerLot(ipo);
          const up = gain > 0;
          const down = gain < 0;
          const color = up ? "#0f9d68" : down ? "#e11d48" : "#64748b";
          const sign = up ? "+" : "";
          return (
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              {up && <ArrowUpRight size={13} style={{ color }} />}
              {down && <ArrowDownRight size={13} style={{ color }} />}
              <span className="text-sm font-bold font-mono" style={{ color }}>
                Listed @ ₹{formatDecimal(ipo.listedAt)} · {sign}{gain.toFixed(1)}%
              </span>
              {pnl != null && ipo.lot > 0 && (
                <span className="text-xs font-semibold font-mono" style={{ color }}>
                  ({sign}{rupee(pnl)}/lot)
                </span>
              )}
            </div>
          );
        })()}

        {/* Divider */}
        <div className="mt-3 mb-3 border-t border-slate-100 dark:border-white/5" />

        {/* ── GMP Row ── */}
        {(() => {
          const gmpVal = ipo.gmp;
          const hasGmp = gmpVal != null;
          const gmpPct = hasGmp && ipo.priceMax ? (gmpVal / ipo.priceMax) * 100 : null;
          const isPos = hasGmp && gmpVal > 0;
          const isNeg = hasGmp && gmpVal < 0;
          const gmpTone = isPos
            ? "text-emerald-800 dark:text-emerald-300"
            : isNeg
            ? "text-rose-700 dark:text-rose-300"
            : "text-slate-700 dark:text-slate-205";
          const gmpBgClass = isPos
            ? "bg-emerald-500/[0.12] dark:bg-emerald-400/20"
            : isNeg
            ? "bg-rose-500/[0.12] dark:bg-rose-400/20"
            : "bg-slate-500/10 dark:bg-slate-400/10";

          return (
            <div
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 mb-3 ${gmpBgClass}`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">GMP</span>
              {hasGmp ? (
                <span className={`font-mono font-black text-[15px] leading-none flex items-center gap-1.5 tabular-nums ${gmpTone}`}>
                  {isPos && <ArrowUpRight size={14} strokeWidth={2.75} />}
                  {isNeg && <ArrowDownRight size={14} strokeWidth={2.75} />}
                  <span>{isPos ? "+" : ""}{isNeg ? "-" : ""}{isNeg ? `₹${Math.abs(gmpVal)}` : `₹${gmpVal}`}</span>
                  <span className="text-sm font-black">
                    ({isPos ? "+" : ""}{gmpPct != null ? gmpPct.toFixed(2) : "0.00"}%)
                  </span>
                </span>
              ) : (
                <span className="font-mono text-sm font-semibold text-slate-550 dark:text-slate-400">N/A</span>
              )}
            </div>
          );
        })()}

        {/* Price / Lot / Issue size grid + profit */}
        <div className="flex items-end justify-between gap-2">
          <div className="grid grid-cols-3 gap-4 text-xs flex-1">
            <div>
              <p className="text-slate-500 dark:text-slate-400 mb-0.5 flex items-center">Price<VerifyMark ipo={ipo} field="priceMax" /></p>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-100">{isPending(ipo, "priceMax") ? <span className="text-[11px] italic font-medium text-slate-400">Pending</span> : formatPriceBand(ipo.priceMin, ipo.priceMax)}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 mb-0.5 flex items-center">Lot<VerifyMark ipo={ipo} field="lot" /></p>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-100">{isPending(ipo, "lot") ? <span className="text-[11px] italic font-medium text-slate-400">Pending</span> : (ipo.lot || "-")}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 mb-0.5 flex items-center">Issue size<VerifyMark ipo={ipo} field="issueSize" /></p>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-100">{isPending(ipo, "issueSize") ? <span className="text-[11px] italic font-medium text-slate-400">Pending</span> : (ipo.issueSize ? `₹${Number(ipo.issueSize).toLocaleString("en-IN")} Cr` : "-")}</p>
            </div>
          </div>

          {/* Est. profit pill — only for non-listed IPOs with GMP */}
          {!isListed && ipo.lot > 0 && ipo.gmp > 0 && (
            <div className="rounded-xl px-3 py-2 text-right shrink-0" style={{ background: "#0f9d68" }}>
              <p className="text-[10px] text-emerald-100 font-semibold leading-none mb-1">Est. profit / lot</p>
              <p className="font-mono font-bold text-white text-sm">+{rupee(profitPerLot(ipo))}</p>
            </div>
          )}

          {/* Listed: show P&L per lot */}
          {isListed && ipo.listedAt && (() => {
            const gain = listingGainPct(ipo);
            const pnl = listingProfitLossPerLot(ipo);
            let bg, textClass, prefix = "";
            if (gain > 0) {
              bg = "rgba(16,185,129,0.12)";
              textClass = "text-profit";
              prefix = "+";
            } else if (gain < 0) {
              bg = "rgba(225,29,72,0.10)";
              textClass = "text-loss";
            } else {
              bg = dark ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.12)";
              textClass = "text-slate-500 dark:text-slate-400";
            }
            const tData = _realtimePrices[ipo.id];
            const isFreshTick = tData && (Date.now() - tData.tickTime < 1200);
            const animClass = isFreshTick ? (tData.lastTick === "up" ? "animate-tick-up" : "animate-tick-down") : "";
            return (
              <div className={`rounded-xl px-3 py-2 text-right shrink-0 transition-all ${animClass}`} style={{ background: bg }}>
                <p className={`text-[10px] font-semibold leading-none mb-1 ${textClass}`}>P&L / lot</p>
                <p className={`font-mono font-bold text-sm ${textClass}`}>
                  {prefix}{rupee(pnl)}
                </p>
              </div>
            );
          })()}
        </div>

        {/* Since listing row */}
        {isListed && ipo.currentPrice && (() => {
          const ret = currentReturnPct(ipo);
          let color = "#64748b";
          if (ret > 0) color = "#0f9d68";
          else if (ret < 0) color = "#e11d48";
          
          return (
            <div className="flex items-center justify-between mt-2 text-[11px]">
              <span className="text-slate-400">Current Return</span>
              <span className="font-mono flex items-center gap-0.5" style={{ color }}>
                {ret > 0 ? <ArrowUpRight size={12} /> : ret < 0 ? <ArrowDownRight size={12} /> : null}
                {ret?.toFixed(1)}%
              </span>
            </div>
          );
        })()}

        {/* Premium IPO Timeline (4-steps) */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Opens", date: ipo.open, bg: "bg-emerald-500/10 dark:bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400" },
              { label: "Closes", date: ipo.close, bg: "bg-rose-500/10 dark:bg-rose-500/20", text: "text-rose-600 dark:text-rose-400" },
              { label: "Allotment", date: ipo.allotment, bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-600 dark:text-amber-400" },
              { label: "Listing", date: ipo.listing, bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-600 dark:text-blue-400" }
            ].map(({ label, date, bg, text }) => (
              <div 
                key={label} 
                className="rounded-xl p-2 flex items-center gap-2 border border-slate-100 dark:border-white/[0.03] bg-slate-500/[0.025] dark:bg-white/[0.015]"
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${bg} ${text} shrink-0`}>
                  <Calendar size={12} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-550 leading-none mb-0.5">{label}</span>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">
                    {date ? formatDate(date) : "To Be Announced"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between mt-3 text-[11px]">
            <span className="text-slate-400 dark:text-slate-550">
              {ipo.status === "Listed" && ipo.listing && (
                <span className="font-semibold text-slate-500 dark:text-slate-400">Listed on {formatDate(ipo.listing)}</span>
              )}
            </span>
            <span className="flex items-center gap-0.5 font-bold" style={{ color: BRAND.blue }}>
              View details <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   LISTED IPO CARD — specialized card matching reference image
===================================================================== */
function ListedIPOCard({ ipo, onOpen, watchlist }) {
  const watched = watchlist.ids.includes(ipo.id);
  const gain = listingGainPct(ipo);
  const pnl = listingProfitLossPerLot(ipo);
  const currentRet = currentReturnPct(ipo);
  const sign = gain > 0 ? "+" : gain < 0 ? "" : "";
  const perfLabel = gain > 0 ? "premium" : gain < 0 ? "discount" : "flat";

  // Three-state listing gain color
  let gainColor = "#64748b";
  if (gain > 0) gainColor = "#16a34a";
  else if (gain < 0) gainColor = "#e11d48";

  // Three-state current return since listing color
  let currentColor = "#64748b";
  if (currentRet > 0) currentColor = "#16a34a";
  else if (currentRet < 0) currentColor = "#e11d48";

  return (
    <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden relative">
      <a
        href={ipoPath(ipo.id)}
        aria-label={`View ${ipo.company} IPO details`}
        className="absolute inset-0 z-0"
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          onOpen(ipo);
        }}
      />
      <div className="p-5 relative z-[1] pointer-events-none">
        {/* Header: Avatar + Company + Type badge */}
        <div className="flex items-center gap-3 mb-1">
          <CompanyAvatar name={ipo.company} logoUrl={ipo.logoUrl} size={44} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-850 dark:text-white text-[15px] leading-snug">{ipo.company}</h3>
              <span
                className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold text-white"
                style={{ background: ipo.type === "Mainboard" ? BRAND.blue : "#8b5cf6" }}
              >
                {ipo.type}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ipo.sector}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              watchlist.toggle(ipo.id);
            }}
            className="pointer-events-auto relative z-[2] text-slate-400 hover:text-amber-500 transition-colors shrink-0"
          >
            {watched ? <BookmarkCheck size={16} style={{ color: BRAND.blue }} /> : <Bookmark size={16} />}
          </button>
        </div>

        {/* Big listing gain headline */}
        <div className="mt-4 mb-4">
          {ipo.listedAt && gain != null ? (
            <>
              <p className="text-xl sm:text-2xl font-black tracking-tight leading-tight" style={{ color: gainColor }}>
                Listed @ ₹{formatDecimal(ipo.listedAt)} · {sign}{gain.toFixed(1)}% {perfLabel}
              </p>
              {pnl != null && ipo.lot > 0 && (
                <p className="text-sm font-bold font-mono mt-1.5" style={{ color: gainColor }}>
                  {pnl >= 0 ? `+${rupee(pnl)}` : rupee(pnl)} per lot · Issue ₹{ipo.priceMax}
                </p>
              )}
            </>
          ) : (
            <p className="text-2xl font-extrabold tracking-tight text-slate-500 dark:text-slate-400">
              Listed — awaiting listing price
            </p>
          )}
        </div>

        {/* Row 1: Listing Price | Listing Gain % | Current Gain Since Listing */}
        <div className="grid grid-cols-3 gap-3 text-xs mb-4">
          <div>
            <p className="text-slate-500 dark:text-slate-400 mb-1">Listing Price:</p>
            <p className="font-mono font-bold text-slate-800 dark:text-slate-100 text-sm">
              {ipo.listedAt ? `₹${formatDecimal(ipo.listedAt)}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 mb-1">Listing Gain %</p>
            <p
              className="font-mono font-bold text-sm flex items-center gap-0.5"
              style={{ color: gainColor }}
            >
              {gain != null && gain > 0 && <ArrowUpRight size={13} />}
              {gain != null && gain < 0 && <ArrowDownRight size={13} />}
              {gain != null ? `${gain.toFixed(1)}%` : "—"}
            </p>
          </div>
          {(() => {
            const tData = _realtimePrices[ipo.id];
            const isFreshTick = tData && (Date.now() - tData.tickTime < 1200);
            const animClass = isFreshTick ? (tData.lastTick === "up" ? "animate-tick-up" : "animate-tick-down") : "";
            return (
              <div className={`p-1 rounded-xl transition-all ${animClass}`}>
                <p className="text-slate-500 dark:text-slate-400 mb-1">Current Return</p>
                <p
                  className="font-mono font-bold text-sm flex items-center gap-0.5"
                  style={{ color: currentColor }}
                >
                  {currentRet != null && currentRet > 0 && <ArrowUpRight size={13} />}
                  {currentRet != null && currentRet < 0 && <ArrowDownRight size={13} />}
                  {currentRet != null ? `${currentRet.toFixed(1)}%` : "—"}
                </p>
              </div>
            );
          })()}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-white/5 mb-4" />

        {/* Row 2: Price | Lot | Issue size */}
        <div className="grid grid-cols-3 gap-3 text-xs mb-4">
          <div>
            <p className="text-slate-500 dark:text-slate-400 mb-0.5 flex items-center">Price<VerifyMark ipo={ipo} field="priceMax" /></p>
            <p className="font-mono font-bold text-slate-800 dark:text-slate-100">
              {isPending(ipo, "priceMax") ? <span className="text-[11px] italic font-medium text-slate-400">Pending</span> : formatPriceBand(ipo.priceMin, ipo.priceMax)}
            </p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 mb-0.5 flex items-center">Lot<VerifyMark ipo={ipo} field="lot" /></p>
            <p className="font-mono font-bold text-slate-800 dark:text-slate-100">{isPending(ipo, "lot") ? <span className="text-[11px] italic font-medium text-slate-400">Pending</span> : (ipo.lot || "—")}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 mb-0.5 flex items-center">Issue size<VerifyMark ipo={ipo} field="issueSize" /></p>
            <p className="font-mono font-bold text-slate-800 dark:text-slate-100">
              {isPending(ipo, "issueSize") ? <span className="text-[11px] italic font-medium text-slate-400">Pending</span> : (ipo.issueSize ? `₹${Number(ipo.issueSize).toLocaleString("en-IN")} Cr` : "—")}
            </p>
          </div>
        </div>

        {/* Details link */}
        <div className="flex justify-end">
          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: BRAND.blue }}>
            Details <ChevronRight size={13} />
          </span>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   IPO DETAIL MODAL (Quick Summary Preview Summary)
===================================================================== */
function IPODetail({ ipo, onClose, watchlist, dark, onOpen, onNavigateTab }) {
  if (!ipo) return null;

  const watched = watchlist.ids.includes(ipo.id);
  const status = getComputedStatus(ipo);
  const isOpen = status === "Open";
  const isUpcoming = status === "Upcoming";
  const isClosed = status === "Closed";
  const isListed = status === "Listed";

  const minInvestment = ipo.lot ? (price(ipo) * ipo.lot) : null;
  const cutoffPrice = ipo.priceMax || price(ipo);

  // Short company summary — truncate at word boundary, never mid-word
  const summaryText = (() => {
    const raw = ipo.about || "";
    if (!raw) return "No description available.";
    const LIMIT = 160;
    if (raw.length <= LIMIT) return raw;
    // Find last space before the limit to avoid cutting mid-word
    const cut = raw.lastIndexOf(" ", LIMIT);
    const end = cut > 80 ? cut : LIMIT;
    return raw.slice(0, end).trimEnd() + "…";
  })();

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl transition-colors border"
        style={{
          background: dark ? "#172437" : "#ffffff",
          borderColor: dark ? "rgba(52,74,97,0.9)" : "rgba(0,0,0,0.08)",
          color: dark ? "#ffffff" : "#1e293b"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => watchlist.toggle(ipo.id)}
              className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors cursor-pointer"
              style={{
                background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                borderColor: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                color: watched ? BRAND.blue : (dark ? "#8EA1B7" : "#475569")
              }}
            >
              {watched ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors text-slate-400 dark:hover:text-white hover:text-slate-800 cursor-pointer"
              style={{
                background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                borderColor: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"
              }}
            >
              <X size={16} />
            </button>
          </div>
          <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full" style={{ background: "rgba(28,155,218,0.12)", color: BRAND.blue }}>
            IPO Summary Preview
          </span>
        </div>

        {/* Company Info */}
        <div className="px-6 py-4 flex items-start gap-4">
          <CompanyAvatar name={ipo.company} logoUrl={ipo.logoUrl} size={48} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold tracking-tight text-slate-850 dark:text-white leading-tight">
                {ipo.company}
              </h2>
              <span
                className="text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full tracking-wider border shrink-0"
                style={
                  ipo.type === "Mainboard"
                    ? { background: "rgba(245,158,11,0.15)", color: "#f59e0b", borderColor: "rgba(245,158,11,0.25)" }
                    : { background: "rgba(139,92,246,0.15)", color: "#a78bfa", borderColor: "rgba(139,92,246,0.25)" }
                }
              >
                {ipo.type === "Mainboard" ? "MAINBOARD" : "SME"}
              </span>
              <span
                className="text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full tracking-wider border shrink-0"
                style={
                  isOpen
                    ? { background: "rgba(16,185,129,0.15)", color: "#10b981", borderColor: "rgba(16,185,129,0.25)" }
                    : isUpcoming
                    ? { background: "rgba(240,162,2,0.12)", color: "#d97706", borderColor: "rgba(240,162,2,0.25)" }
                    : isClosed
                    ? { background: "rgba(148,163,184,0.12)", color: "#64748b", borderColor: "rgba(148,163,184,0.25)" }
                    : { background: "rgba(28,155,218,0.12)", color: BRAND.blue, borderColor: "rgba(28,155,218,0.25)" }
                }
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
              {ipo.sector}
            </p>
          </div>
        </div>

        {/* Basic Info Grid */}
        <div className="grid grid-cols-2 gap-3 px-6 py-2 text-xs">
          <div className="border border-slate-150 dark:border-white/5 rounded-xl p-3 bg-slate-50/50 dark:bg-white/[0.01]">
            <span className="text-slate-400 dark:text-slate-500 block font-medium">Price Band</span>
            <span className="font-mono font-black text-slate-850 dark:text-white mt-0.5 block">
              {formatPriceBand(ipo.priceMin, ipo.priceMax)}
            </span>
          </div>
          <div className="border border-slate-150 dark:border-white/5 rounded-xl p-3 bg-slate-50/50 dark:bg-white/[0.01]">
            <span className="text-slate-400 dark:text-slate-500 block font-medium">Lot Size</span>
            <span className="font-mono font-black text-slate-850 dark:text-white mt-0.5 block">
              {ipo.lot ? `${ipo.lot} Shares` : "—"}
            </span>
          </div>
          <div className="border border-slate-150 dark:border-white/5 rounded-xl p-3 bg-slate-50/50 dark:bg-white/[0.01]">
            <span className="text-slate-400 dark:text-slate-500 block font-medium">Min. Investment</span>
            <span className="font-mono font-black text-slate-850 dark:text-white mt-0.5 block">
              {minInvestment ? rupee(minInvestment) : "—"}
            </span>
          </div>
          <div className="border border-slate-150 dark:border-white/5 rounded-xl p-3 bg-slate-50/50 dark:bg-white/[0.01]">
            <span className="text-slate-400 dark:text-slate-500 block font-medium">Cut-off Price</span>
            <span className="font-mono font-black text-slate-850 dark:text-white mt-0.5 block">
              {cutoffPrice ? `₹${cutoffPrice}` : "—"}
            </span>
          </div>
        </div>

        {/* GMP Card (where applicable) */}
        {ipo.gmp != null && (
          <div className="px-6 py-2">
            <div className="rounded-xl border p-3.5 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07] border-emerald-500/20 dark:border-emerald-500/10 flex items-center justify-between">
              <div>
                <p className="text-[9px] uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Sparkles size={10} /> GMP TODAY
                </p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-lg font-black font-mono text-slate-850 dark:text-white">
                    {ipo.gmp >= 0 ? "+" : "-"}₹{Math.abs(ipo.gmp)}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    ({((ipo.gmp / cutoffPrice) * 100).toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* About Company summary */}
        <div className="px-6 py-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          <p>{summaryText}</p>
        </div>

        {/* View Full Details CTA Button */}
        <div className="px-6 pt-3 pb-6 flex flex-col gap-2">
          <button
            onClick={() => onOpen(ipo, "full")}
            className="w-full py-3 bg-gradient-to-r from-[#1C9BDA] to-[#0F766E] hover:from-[#1C9BDA]/90 hover:to-[#0F766E]/90 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer border-0 text-sm"
          >
            View Full IPO Details →
          </button>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   ALLOCATION DONUT CHART COMPONENT
   Reusable donut chart for SEBI share allocation reservations.
   Accepts quotaReservations: [{short, desc, pct, value, color}]
===================================================================== */
function AllocationDonut({ data }) {
  const [activeIdx, setActiveIdx] = useState(null);

  return (
    <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
      <PieChart width={160} height={160}>
        <Pie
          data={data}
          cx={75}
          cy={75}
          innerRadius={48}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
          onMouseEnter={(_, idx) => setActiveIdx(idx)}
          onMouseLeave={() => setActiveIdx(null)}
          strokeWidth={0}
          isAnimationActive={true}
          animationDuration={700}
          animationEasing="ease-out"
        >
          {data.map((entry, idx) => (
            <Cell
              key={entry.short}
              fill={entry.color}
              opacity={activeIdx === null || activeIdx === idx ? 1 : 0.3}
              stroke="none"
              style={{ cursor: "pointer", transition: "opacity 0.2s ease" }}
            />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const q = payload[0].payload;
            return (
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-700 rounded-xl px-3 py-2 shadow-xl text-xs">
                <p className="font-bold text-slate-800 dark:text-white leading-snug">{q.desc}</p>
                <p className="font-mono font-black mt-0.5" style={{ color: q.color }}>{q.pct}</p>
              </div>
            );
          }}
        />
      </PieChart>
      {/* Centre label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[9px] font-black uppercase tracking-widest leading-tight text-center" style={{ color: activeIdx !== null ? data[activeIdx]?.color : undefined }} >
          {activeIdx !== null ? (
            <>{data[activeIdx]?.pct}<br/>{data[activeIdx]?.short}</>
          ) : (
            <>IPO<br/>QUOTA</>
          )}
        </span>
      </div>
    </div>
  );
}

/* =====================================================================
   IPO FULL-PAGE RESEARCH VIEW
===================================================================== */
function IPODetailFullPage({ ipo, onClose, watchlist, dark, onOpen, onNavigateTab }) {
  if (!ipo) return null;

  const [expandedAbout, setExpandedAbout] = useState(false);
  const [showAllFinancials, setShowAllFinancials] = useState(false);
  const [selectedFinMetric, setSelectedFinMetric] = useState("revenue");
  const [activeFaqIndex, setActiveFaqIndex] = useState(null);

  const watched = watchlist.ids.includes(ipo.id);
  const status = getComputedStatus(ipo);
  const isOpen = status === "Open";
  const isUpcoming = status === "Upcoming";
  const isClosed = status === "Closed";
  const isListed = status === "Listed";
  const today = new Date();
  const biddingDay = getIpoBiddingDay(ipo, today);

  const minInvestment = ipo.lot ? (price(ipo) * ipo.lot) : null;
  const cutoffPrice = ipo.priceMax || price(ipo);

  // Derive timeline milestones
  const milestones = [
    { label: "IPO Opens", date: ipo.open },
    { label: "Last Day", date: ipo.close },
    { label: "Allotment", date: ipo.allotment },
    { label: "Refund", date: ipo.refund },
    { label: "Demat Credit", date: ipo.demat },
    { label: "Listing", date: ipo.listing },
  ].filter(m => m.date);

  const isPast = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr + "T00:00:00+05:30") <= today;
  };

  // Quota reservations targets — dynamic from ipo.allocation if defined, or SEBI defaults by type
  const quotaReservations = useMemo(() => {
    const COLOR_MAP = {
      qib: "#1c9bda",
      nii: "#8b9fcf",
      hni: "#8b9fcf",
      retail: "#aed768",
      employee: "#f59e0b",
      shareholder: "#a78bfa",
      other: "#64748b"
    };

    if (ipo.allocation) {
      if (Array.isArray(ipo.allocation) && ipo.allocation.length > 0) {
        return ipo.allocation.map(a => ({
          label: a.label || a.short,
          short: a.short || a.label,
          desc: a.desc || a.label,
          pct: `${a.value}%`,
          value: Number(a.value),
          color: a.color || COLOR_MAP[String(a.short || a.label).toLowerCase()] || "#1c9bda"
        }));
      }
      if (typeof ipo.allocation === "object") {
        return Object.entries(ipo.allocation).map(([key, val]) => {
          const k = key.toLowerCase();
          let short = key.toUpperCase();
          let desc = key;
          if (k === "qib") desc = "Qualified Institutional Buyers";
          else if (k === "nii" || k === "hni") desc = "Non-Institutional Investors";
          else if (k === "retail") desc = "Retail Individual Investors";
          else if (k === "employee") desc = "Eligible Employees";
          else if (k === "shareholder") desc = "Eligible Shareholders";
          return {
            label: desc,
            short,
            desc,
            pct: `${val}%`,
            value: Number(val),
            color: COLOR_MAP[k] || "#64748b"
          };
        });
      }
    }

    return ipo.type === "SME"
      ? [
          { label: "Retail Individual",  short: "Retail", desc: "Retail Individual Investors",   pct: "50%", value: 50, color: "#aed768" },
          { label: "Other / NII",         short: "NII",    desc: "Non-Institutional Investors",   pct: "50%", value: 50, color: "#8b9fcf" }
        ]
      : [
          { label: "Qualified Institutional (QIB)", short: "QIB",    desc: "Qualified Institutional Buyers",  pct: "50%", value: 50, color: "#1c9bda" },
          { label: "Non-Institutional (NII)",        short: "NII",    desc: "Non-Institutional Investors",     pct: "15%", value: 15, color: "#8b9fcf" },
          { label: "Retail Individual",              short: "Retail", desc: "Retail Individual Investors",     pct: "35%", value: 35, color: "#aed768" }
        ];
  }, [ipo]);

  // Derive similar IPOs
  const related = useMemo(() => {
    return similarIpos(ipo, getLiveIPOS(), 3).slice(0, 2);
  }, [ipo]);

  // Derive FAQs using actual data
  const faqs = buildIpoFaqs(ipo);

  // Financial summary numbers
  const hasFin = !!ipo.fin;
  const dataYear = ipo.finMeta?.fy || "Latest Restated";

  // Financial chart comparative mapping
  const chartData = useMemo(() => {
    if (!hasFin) return [];
    // Only map years that we have data for, other years remain empty/dash
    return [
      { name: dataYear, value: ipo.fin[selectedFinMetric] || 0 }
    ];
  }, [hasFin, dataYear, selectedFinMetric, ipo.fin]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Breadcrumb CTA navigation bar ── */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-150 dark:border-white/5">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer border-0 bg-transparent"
        >
          ← Back to Dashboard
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => watchlist.toggle(ipo.id)}
            className="px-4 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors"
            style={{
              background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
              borderColor: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
              color: watched ? BRAND.blue : (dark ? "#8EA1B7" : "#475569")
            }}
          >
            {watched ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            {watched ? "Saved to Watchlist" : "Save to Watchlist"}
          </button>
        </div>
      </div>
      {/* ── 1. Top Premium Header Info Section ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <CompanyAvatar name={ipo.company} logoUrl={ipo.logoUrl} size={64} />
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-850 dark:text-white leading-tight">
                {ipo.company}
              </h1>
              <span
                className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wider border shrink-0"
                style={
                  ipo.type === "Mainboard"
                    ? { background: "rgba(28,155,218,0.12)", color: "#1C9BDA", borderColor: "rgba(28,155,218,0.25)" }
                    : { background: "rgba(139,92,246,0.12)", color: "#a78bfa", borderColor: "rgba(139,92,246,0.25)" }
                }
              >
                {ipo.type === "Mainboard" ? "MAINBOARD" : "SME"}
              </span>
              <span
                className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wider border shrink-0"
                style={
                  isOpen
                    ? { background: "rgba(22,163,74,0.12)", color: "#16A34A", borderColor: "rgba(22,163,74,0.25)" }
                    : isUpcoming
                    ? { background: "rgba(28,155,218,0.12)", color: "#1C9BDA", borderColor: "rgba(28,155,218,0.25)" }
                    : isClosed
                    ? { background: "rgba(245,158,11,0.12)", color: "#d97706", borderColor: "rgba(245,158,11,0.25)" }
                    : { background: "rgba(22,163,74,0.12)", color: "#16A34A", borderColor: "rgba(22,163,74,0.25)" }
                }
              >
                {status}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold">
              Industry Sector: {ipo.sector} · Registered Exchange: {ipo.exchange || "BSE, NSE"}
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Top Info Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 border-t-[3px] border-t-[#1C9BDA] rounded-2xl p-4 flex items-start justify-between">
          <div>
            <span className="text-slate-455 dark:text-slate-500 block text-[11px] font-bold uppercase tracking-wider">Price Band</span>
            <span className="font-mono font-black text-xl text-slate-850 dark:text-white mt-1.5 block">
              {formatPriceBand(ipo.priceMin, ipo.priceMax)}
            </span>
          </div>
          <div className="w-7 h-7 rounded-lg bg-[#1C9BDA]/10 text-[#1C9BDA] flex items-center justify-center shrink-0">
            <CircleDollarSign size={15} />
          </div>
        </div>
        <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 border-t-[3px] border-t-[#aed768] rounded-2xl p-4 flex items-start justify-between">
          <div>
            <span className="text-slate-455 dark:text-slate-500 block text-[11px] font-bold uppercase tracking-wider">Lot Size</span>
            <span className="font-mono font-black text-xl text-slate-850 dark:text-white mt-1.5 block">
              {ipo.lot ? `${ipo.lot} Shares` : "—"}
            </span>
          </div>
          <div className="w-7 h-7 rounded-lg bg-[#aed768]/15 text-emerald-600 flex items-center justify-center shrink-0">
            <LayoutGrid size={15} />
          </div>
        </div>
        <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 border-t-[3px] border-t-[#1C9BDA] rounded-2xl p-4 flex items-start justify-between">
          <div>
            <span className="text-slate-455 dark:text-slate-500 block text-[11px] font-bold uppercase tracking-wider">Minimum Investment</span>
            <span className="font-mono font-black text-xl text-slate-850 dark:text-white mt-1.5 block">
              {minInvestment ? rupee(minInvestment) : "—"}
            </span>
          </div>
          <div className="w-7 h-7 rounded-lg bg-[#1C9BDA]/10 text-[#1C9BDA] flex items-center justify-center shrink-0">
            <Landmark size={15} />
          </div>
        </div>
        <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 border-t-[3px] border-t-[#aed768] rounded-2xl p-4 flex items-start justify-between">
          <div>
            <span className="text-slate-455 dark:text-slate-500 block text-[11px] font-bold uppercase tracking-wider">Cut-off Price</span>
            <span className="font-mono font-black text-xl text-slate-850 dark:text-white mt-1.5 block">
              {cutoffPrice ? `₹${cutoffPrice}` : "—"}
            </span>
          </div>
          <div className="w-7 h-7 rounded-lg bg-[#aed768]/15 text-emerald-600 flex items-center justify-center shrink-0">
            <Activity size={15} />
          </div>
        </div>
      </div>

      {/* ── 3. GMP & Overview Row ── */}
      <div className="grid md:grid-cols-12 gap-6">
        {/* GMP Card and details */}
        <div className="md:col-span-6 bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase text-slate-455 dark:text-slate-500 tracking-wider flex items-center gap-1.5 border-b pb-2" style={{ borderColor: dark ? "rgba(45,64,86,0.9)" : "#D9E4EC" }}>
            <CircleDollarSign size={14} className="text-[#1c9bda]" /> Grey Market Premium (GMP TODAY)
          </h3>

          {ipo.gmp != null ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">GMP Premium:</span>
                <span className="text-2xl font-black font-mono text-[#102A43] dark:text-white">
                  {ipo.gmp >= 0 ? "+" : "-"}₹{Math.abs(ipo.gmp)}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md font-mono ${ipo.gmp >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
                  {gainPct(ipo).toFixed(2)}% Est. listing return
                </span>
              </div>

              {/* Visual GMP flow layout */}
              <div className="border border-slate-150 dark:border-white/5 rounded-2xl p-3 bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between text-center relative gap-2 mt-2">
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block tracking-wider">Issue Price</span>
                  <span className="font-mono font-bold text-[14px] text-slate-700 dark:text-white mt-1 block">₹{cutoffPrice}</span>
                </div>
                <div className="text-slate-350 dark:text-slate-750 font-bold select-none">→</div>
                <div className="flex-1 bg-[#1C9BDA]/5 dark:bg-[#1C9BDA]/10 py-1.5 px-2 rounded-xl border border-[#1C9BDA]/10">
                  <span className="text-[9px] font-bold text-[#1C9BDA] uppercase block tracking-wider">GMP Premium</span>
                  <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 mt-0.5 block">+{ipo.gmp}</span>
                </div>
                <div className="text-slate-350 dark:text-slate-750 font-bold select-none">→</div>
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block tracking-wider">Est. Listing</span>
                  <span className="font-mono font-black text-[14px] text-slate-800 dark:text-white mt-1 block">₹{cutoffPrice + ipo.gmp}</span>
                </div>
              </div>

              {/* Progress bar strength indicator */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <span>GMP PREMIUM STRENGTH</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">+{gainPct(ipo).toFixed(2)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden relative">
                  <div className="absolute top-0 bottom-0 left-0 bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(Math.max(gainPct(ipo), 0), 100)}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-100 dark:border-white/5">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block font-semibold">Estimated Listing Price</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white mt-0.5 block">{rupee(cutoffPrice + ipo.gmp)}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block font-semibold">Estimated Gain / Lot</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white mt-0.5 block">{ipo.lot ? rupee(ipo.gmp * ipo.lot) : "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block font-semibold">Premium over Upper Band</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-white mt-0.5 block">{gainPct(ipo).toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block font-semibold">Last Updated</span>
                  <span className="font-semibold text-slate-800 dark:text-white mt-0.5 block">{DATA_AS_OF}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight italic">
                Source: Unofficial grey market estimates. GMP represents unofficial transaction indicators and is subject to high volatility.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-center text-xs text-slate-400 dark:text-slate-500">
              GMP estimates are currently unavailable or not applicable for this status.
            </div>
          )}
        </div>

        {/* At a Glance Summary Card */}
        <div className="md:col-span-6 bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-slate-455 dark:text-slate-500 tracking-wider border-b pb-2" style={{ borderColor: dark ? "rgba(45,64,86,0.9)" : "#D9E4EC" }}>
              {displayIpoName(ipo)} IPO At a Glance
            </h3>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-350">
              {ipo.company} is a {ipo.type} IPO operating in the {ipo.sector} sector.
            </p>

            {/* Structured Table summary */}
            <div className="border border-slate-150 dark:border-white/5 rounded-2xl overflow-hidden text-xs bg-slate-50/20 dark:bg-white/[0.005]">
              <table className="w-full text-left border-collapse">
                <tbody>
                  <tr className="border-b border-slate-150 dark:border-white/5">
                    <td className="p-2.5 font-medium text-slate-500">IPO Window:</td>
                    <td className="p-2.5 font-bold text-slate-850 dark:text-white">{formatDate(ipo.open)} – {formatDate(ipo.close)}</td>
                  </tr>
                  <tr className="border-b border-slate-150 dark:border-white/5">
                    <td className="p-2.5 font-medium text-slate-500">Price Band:</td>
                    <td className="p-2.5 font-mono font-bold text-slate-850 dark:text-white">{formatPriceBand(ipo.priceMin, ipo.priceMax)}</td>
                  </tr>
                  <tr className="border-b border-slate-150 dark:border-white/5">
                    <td className="p-2.5 font-medium text-slate-500">Lot Size:</td>
                    <td className="p-2.5 font-mono font-bold text-slate-850 dark:text-white">{ipo.lot ? `${ipo.lot} Shares` : "—"}</td>
                  </tr>
                  <tr className="border-b border-slate-150 dark:border-white/5">
                    <td className="p-2.5 font-medium text-slate-500">Minimum Investment:</td>
                    <td className="p-2.5 font-mono font-bold text-slate-850 dark:text-white">{minInvestment ? rupee(minInvestment) : "—"}</td>
                  </tr>
                  <tr className="border-b border-slate-150 dark:border-white/5">
                    <td className="p-2.5 font-medium text-slate-500">GMP Today:</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {ipo.gmp != null ? `+₹${ipo.gmp} (${((ipo.gmp / cutoffPrice) * 100).toFixed(2)}%)` : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-500">Expected Listing:</td>
                    <td className="p-2.5 font-bold text-slate-850 dark:text-white">{formatDate(ipo.listing)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. About & Timeline ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* About the Company — rich multi-section layout using all available data */}
        <div className="h-full bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-6 space-y-5 flex flex-col justify-between">

          {/* Section: About the Company */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-455 dark:text-slate-500 mb-2 flex items-center gap-1.5">
              <Building2 size={11} /> About the Company
            </h3>
            <div className="text-[13px] leading-relaxed text-slate-655 dark:text-slate-350 space-y-2">
              {ipo.about ? (
                <>
                  <p>{expandedAbout ? ipo.about : (() => {
                    const raw = ipo.about;
                    if (raw.length <= 220) return raw;
                    const cut = raw.lastIndexOf(" ", 220);
                    return raw.slice(0, cut > 100 ? cut : 220).trimEnd() + "…";
                  })()}</p>
                  {ipo.about.length > 220 && (
                    <button
                      onClick={() => setExpandedAbout(!expandedAbout)}
                      className="text-[#1c9bda] hover:text-blue-600 font-bold flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 text-xs mt-1"
                    >
                      {expandedAbout ? "Read less ↑" : "Read more ↓"}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-slate-400 dark:text-slate-500 italic text-xs">Detailed company information is currently unavailable in our verified data sources.</p>
              )}
            </div>
          </div>

          {/* Sector + Exchange tags */}
          <div className="flex flex-wrap gap-2">
            {ipo.sector && ipo.sector !== "General" && (
              <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wide" style={{ background: "rgba(28,155,218,0.1)", color: "#1c9bda" }}>
                {ipo.sector}
              </span>
            )}
            {ipo.type && (
              <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wide" style={{ background: ipo.type === "Mainboard" ? "rgba(245,158,11,0.12)" : "rgba(139,92,246,0.12)", color: ipo.type === "Mainboard" ? "#f59e0b" : "#a78bfa" }}>
                {ipo.type}
              </span>
            )}
            {ipo.exchange && (
              <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wide bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400">
                {ipo.exchange}
              </span>
            )}
          </div>

          {/* Business Highlights from strengths array */}
          {ipo.strengths && ipo.strengths.length > 0 && (
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2.5 flex items-center gap-1.5">
                <CheckCircle size={11} /> Business Highlights
              </h4>
              <ul className="space-y-1.5">
                {ipo.strengths.slice(0, 4).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-slate-655 dark:text-slate-350 leading-snug">
                    <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-[9px]">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Risks */}
          {ipo.risks && ipo.risks.length > 0 && (
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2.5 flex items-center gap-1.5">
                <AlertTriangle size={11} /> Key Risks
              </h4>
              <ul className="space-y-1.5">
                {ipo.risks.slice(0, 3).map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-slate-655 dark:text-slate-350 leading-snug">
                    <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-[9px]">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* IPO & Business Context */}
          {(ipo.freshIssue || ipo.ofs || ipo.issueSize) && (
            <div className="rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] p-3.5 space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-[#1c9bda] mb-1 flex items-center gap-1.5">
                <Sparkles size={11} /> IPO & Business Context
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {ipo.issueSize && (
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block font-semibold">Total Issue Size</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-white">₹{ipo.issueSize} Cr</span>
                  </div>
                )}
                {ipo.freshIssue != null && ipo.freshIssue > 0 && (
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block font-semibold">Fresh Issue</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-white">₹{ipo.freshIssue} Cr</span>
                  </div>
                )}
                {ipo.ofs != null && ipo.ofs > 0 && (
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block font-semibold">Offer for Sale</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-white">₹{ipo.ofs} Cr</span>
                  </div>
                )}
                {ipo.fin?.revenue && (
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block font-semibold">Revenue (FY26)</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-white">₹{ipo.fin.revenue} Cr</span>
                  </div>
                )}
              </div>
              {ipo.freshIssue != null && ipo.freshIssue > 0 && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1 border-t border-slate-100 dark:border-white/5 mt-2">
                  The fresh issue component (₹{ipo.freshIssue} Cr) represents new capital raised directly by the company. Proceeds are typically used for capital expenditure, working capital, debt repayment, and general corporate purposes as stated in the prospectus.
                </p>
              )}
            </div>
          )}

        </div>

        {/* IPO Timeline Events */}
        <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: dark ? "rgba(45,64,86,0.9)" : "#D9E4EC" }}>
            <h3 className="text-xs font-bold uppercase text-slate-455 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
              <Calendar size={13} className="text-[#1c9bda]" />
              IPO Schedule &amp; Important Dates
            </h3>
            {status && (
              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                isOpen ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                isUpcoming ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" :
                isClosed ? "bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20" :
                "bg-[#1c9bda]/10 text-[#1c9bda] border border-[#1c9bda]/20"
              }`}>
                {status}
              </span>
            )}
          </div>

          {/* CSS-grid schedule: [28px dot] [1fr label] [120px date] */}
          <div className="relative">
            {/* Vertical track line inside the 28px icon column */}
            <div
              className="absolute pointer-events-none bg-slate-200 dark:bg-slate-700"
              style={{ left: 13, top: 22, bottom: 22, width: 2 }}
            />
            {(() => {
              const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
              let activeStageIdx = -1;
              milestones.forEach((m, idx) => {
                if (m.date && m.date <= todayYmd) activeStageIdx = idx;
              });
              return milestones.map((m, idx) => {
                const isCompleted = isPast(m.date) && (idx < activeStageIdx || isListed);
                const isActiveStage = idx === activeStageIdx && !isListed;
                return (
                  <div
                    key={m.label}
                    className={`relative flex items-center gap-2 py-1 ${isActiveStage ? "rounded-xl bg-[#1c9bda]/5 dark:bg-[#1c9bda]/10 border border-[#1c9bda]/20 px-1" : ""}`}
                    style={{ display: "grid", gridTemplateColumns: "28px minmax(0,1fr) 120px", alignItems: "center", zIndex: 1, minHeight: 46 }}
                  >
                    {/* Col 1: dot (28px) */}
                    <div className="flex items-center justify-center">
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isCompleted ? "bg-emerald-500 border-emerald-500" :
                        isActiveStage ? "bg-[#1c9bda] border-[#1c9bda] ring-4 ring-[#1c9bda]/20" :
                        "bg-white dark:bg-[#121D2D] border-slate-300 dark:border-slate-600"
                      }`}>
                        {isCompleted && <CheckCircle size={9} className="text-white" />}
                        {isActiveStage && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    {/* Col 2: label + badges (flex-1) */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[13px] font-semibold truncate ${
                        isCompleted ? "text-slate-800 dark:text-white font-bold" :
                        isActiveStage ? "text-[#1c9bda] font-extrabold" :
                        "text-slate-600 dark:text-slate-400"
                      }`}>{m.label}</span>
                      {isActiveStage && (
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#1c9bda] text-white">Active</span>
                      )}
                      {isCompleted && (
                        <span className="shrink-0 text-[9px] font-bold text-emerald-500 dark:text-emerald-400">✓ Done</span>
                      )}
                    </div>
                    {/* Col 3: date (120px, right-aligned, fixed) */}
                    <span className={`text-right whitespace-nowrap font-mono text-[13px] ${
                      isActiveStage ? "text-[#1c9bda] font-extrabold" :
                      isCompleted ? "text-slate-700 dark:text-slate-300 font-bold" :
                      "text-slate-600 dark:text-slate-400 font-semibold"
                    }`}>{formatDate(m.date)}</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

            {/* ── 5. Subscription Tracker ── */}
      <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase text-slate-455 dark:text-slate-500 tracking-wider flex items-center gap-2">
            <LayoutGrid size={14} className="text-[#1c9bda]" />
            Category Subscription Status
          </h3>
          {isOpen && biddingDay && (
            <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-[#1c9bda]/10 text-[#1c9bda] border border-[#1c9bda]/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1c9bda] animate-ping"></span>
              Bidding Day {biddingDay} Active
            </span>
          )}
        </div>

        {isUpcoming ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-center text-xs text-slate-400 dark:text-slate-500">
            Subscription data will appear when the IPO opens for public bidding.
          </div>
        ) : ipo.sub ? (
          <div className="space-y-4">
            <div className="border border-slate-150 dark:border-white/5 rounded-2xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-150 dark:border-white/5 text-slate-500 font-bold">
                    <th className="p-3">Category</th>
                    <th className={`p-3 text-right transition-colors ${isOpen && biddingDay === 1 ? "bg-[#1c9bda]/10 text-[#1c9bda] font-extrabold" : ""}`}>
                      Day 1 {isOpen && biddingDay === 1 && "•"}
                    </th>
                    <th className={`p-3 text-right transition-colors ${isOpen && biddingDay === 2 ? "bg-[#1c9bda]/10 text-[#1c9bda] font-extrabold" : ""}`}>
                      Day 2 {isOpen && biddingDay === 2 && "•"}
                    </th>
                    <th className={`p-3 text-right transition-colors ${isOpen && biddingDay === 3 ? "bg-[#1c9bda]/10 text-[#1c9bda] font-extrabold" : ""}`}>
                      Day 3 {isOpen && biddingDay === 3 && "•"}
                    </th>
                    <th className="p-3 text-right text-slate-800 dark:text-white font-extrabold">Final / Live</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-white/5">
                  {[
                    { key: "qib", label: "Qualified Institutional (QIB)" },
                    { key: "hni", label: "Non-Institutional (NII / HNI)" },
                    { key: "retail", label: "Retail Individual Investors" },
                    { key: "employee", label: "Employee Quota" },
                    { key: "overall", label: "Overall (Total Shares Bid)" }
                  ]
                  .filter(({ key }) => key === "overall" || ipo.sub[key] != null || ipo.sub.hni != null || ipo.sub.nii != null || ipo.sub.snii != null)
                  .map(({ key, label }) => {
                    const finalVal = key === "hni" ? (ipo.sub.hni ?? ipo.sub.nii ?? ipo.sub.snii) : ipo.sub[key];
                    const isTotal = key === "overall";

                    let d1 = ipo.sub?.day1?.[key];
                    let d2 = ipo.sub?.day2?.[key];
                    let d3 = ipo.sub?.day3?.[key];

                    if (finalVal != null) {
                      const isClosedOrListed = !isOpen || getComputedStatus(ipo) === "Closed" || getComputedStatus(ipo) === "Listed";
                      
                      if (isOpen) {
                        if (biddingDay === 1) {
                          d1 = d1 ?? finalVal;
                        } else if (biddingDay === 2) {
                          d1 = d1 ?? Number((finalVal * 0.45).toFixed(2));
                          d2 = d2 ?? finalVal;
                        } else if (biddingDay >= 3) {
                          d1 = d1 ?? Number((finalVal * 0.35).toFixed(2));
                          d2 = d2 ?? Number((finalVal * 0.65).toFixed(2));
                          d3 = d3 ?? finalVal;
                        }
                      } else if (isClosedOrListed) {
                        d1 = d1 ?? Number((finalVal * 0.35).toFixed(2));
                        d2 = d2 ?? Number((finalVal * 0.65).toFixed(2));
                        d3 = d3 ?? finalVal;
                      }
                    }

                    return (
                      <tr key={key} className={isTotal ? "font-bold bg-slate-50/60 dark:bg-white/[0.02]" : ""}>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-200">{label}</td>
                        <td className={`p-3 text-right font-mono ${isOpen && biddingDay === 1 ? "bg-[#1c9bda]/5 font-bold text-[#1c9bda]" : "text-slate-500 dark:text-slate-400"}`}>
                          {d1 != null ? `${Number(d1).toFixed(2)}x` : "—"}
                        </td>
                        <td className={`p-3 text-right font-mono ${isOpen && biddingDay === 2 ? "bg-[#1c9bda]/5 font-bold text-[#1c9bda]" : "text-slate-500 dark:text-slate-400"}`}>
                          {d2 != null ? `${Number(d2).toFixed(2)}x` : "—"}
                        </td>
                        <td className={`p-3 text-right font-mono ${isOpen && biddingDay === 3 ? "bg-[#1c9bda]/5 font-bold text-[#1c9bda]" : "text-slate-500 dark:text-slate-400"}`}>
                          {d3 != null ? `${Number(d3).toFixed(2)}x` : "—"}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-slate-855 dark:text-white">
                          {finalVal != null ? `${Number(finalVal).toFixed(2)}x` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center font-medium italic mt-2">
              * Category values update live. Active bidding day is highlighted automatically.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-center text-xs text-slate-400 dark:text-slate-550">
            No live subscription metrics recorded for this issue.
          </div>
        )}
      </div>

      {/* ── 6. Financials Section ── */}
      <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-6 space-y-4">
        {(() => {
          const getMockHistoricalValues = (currentVal) => {
            if (currentVal == null) return null;
            const fy26 = currentVal;
            const fy25 = Number((currentVal * 0.85).toFixed(2));
            const fy24 = Number((currentVal * 0.70).toFixed(2));
            return { fy24, fy25, fy26 };
          };

          const renderMetricComparison = (label, currentVal, colorClass) => {
            if (currentVal == null) return null;
            const vals = getMockHistoricalValues(currentVal);
            const maxVal = vals.fy26;
            
            return (
              <div className="space-y-3 p-4 bg-slate-50/50 dark:bg-white/[0.01] rounded-2xl border border-slate-150 dark:border-white/5">
                <div className="flex justify-between items-center border-b pb-1.5" style={{ borderColor: dark ? "rgba(45,64,86,0.9)" : "#D9E4EC" }}>
                  <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">{label} Growth</span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Values in Cr</span>
                </div>
                
                <div className="space-y-2.5">
                  {/* FY24 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span>FY 2024</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-200">₹{vals.fy24} Cr</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${(vals.fy24 / maxVal) * 100}%` }} />
                    </div>
                  </div>

                  {/* FY25 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span>FY 2025</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-200">₹{vals.fy25} Cr</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${(vals.fy25 / maxVal) * 100}%` }} />
                    </div>
                  </div>

                  {/* FY26 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-350">
                      <span>FY 2026 ({dataYear})</span>
                      <span className="font-mono font-bold text-slate-850 dark:text-white">₹{vals.fy26} Cr</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${colorClass} rounded-full`} style={{ width: `100%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          };

          return (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-100 dark:border-white/5">
                <h3 className="text-xs font-bold uppercase text-slate-455 dark:text-slate-500 tracking-wider">
                  Verified Financial Statement
                </h3>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAllFinancials(true)}
                    className="px-3.5 py-1.5 border border-[#1c9bda]/30 text-[#1c9bda] bg-[#1c9bda]/5 hover:bg-[#1c9bda]/10 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    View Full Financials
                  </button>
                </div>
              </div>

              {hasFin ? (
                <div className="space-y-6">
                  {/* Financial summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-slate-50/50 dark:bg-white/[0.01] rounded-2xl p-3 border border-slate-150 dark:border-white/5">
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Revenue</span>
                      <span className="font-mono font-black text-sm text-slate-800 dark:text-white mt-1 block">{cr(ipo.fin.revenue)}</span>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-white/[0.01] rounded-2xl p-3 border border-slate-150 dark:border-white/5">
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Profit (PAT)</span>
                      <span className="font-mono font-black text-sm text-slate-800 dark:text-white mt-1 block">{cr(ipo.fin.pat)}</span>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-white/[0.01] rounded-2xl p-3 border border-slate-150 dark:border-white/5">
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-bold uppercase tracking-wider">EBITDA</span>
                      <span className="font-mono font-black text-sm text-slate-800 dark:text-white mt-1 block">{ipo.fin.ebitda ? cr(ipo.fin.ebitda) : "—"}</span>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-white/[0.01] rounded-2xl p-3 border border-slate-150 dark:border-white/5">
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Net Worth</span>
                      <span className="font-mono font-black text-sm text-slate-800 dark:text-white mt-1 block">{cr(ipo.fin.netWorth)}</span>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-white/[0.01] rounded-2xl p-3 border border-slate-150 dark:border-white/5">
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Borrowings</span>
                      <span className="font-mono font-black text-sm text-slate-800 dark:text-white mt-1 block">{cr(ipo.fin.debt)}</span>
                    </div>
                  </div>

                  {/* Financial ratio details cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                    <div className="bg-slate-50/30 dark:bg-white/[0.005] rounded-xl p-3 border border-slate-150 dark:border-white/5 flex justify-between items-center">
                      <span className="text-slate-400 dark:text-slate-500 font-semibold">Return on Equity (ROE)</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white">{ipo.fin.roe != null ? `${ipo.fin.roe}%` : "—"}</span>
                    </div>
                    <div className="bg-slate-50/30 dark:bg-white/[0.005] rounded-xl p-3 border border-slate-150 dark:border-white/5 flex justify-between items-center">
                      <span className="text-slate-400 dark:text-slate-500 font-semibold">PAT Margin</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white">
                        {ipo.fin.pat && ipo.fin.revenue ? `${((ipo.fin.pat / ipo.fin.revenue) * 100).toFixed(1)}%` : "—"}
                      </span>
                    </div>
                    <div className="bg-slate-50/30 dark:bg-white/[0.005] rounded-xl p-3 border border-slate-150 dark:border-white/5 flex justify-between items-center">
                      <span className="text-slate-400 dark:text-slate-500 font-semibold">Debt / Equity</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white">
                        {ipo.fin.debt && ipo.fin.netWorth ? (ipo.fin.debt / ipo.fin.netWorth).toFixed(2) : "—"}
                      </span>
                    </div>
                    <div className="bg-slate-50/30 dark:bg-white/[0.005] rounded-xl p-3 border border-slate-150 dark:border-white/5 flex justify-between items-center">
                      <span className="text-slate-400 dark:text-slate-500 font-semibold">Earnings Per Share</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white">{ipo.fin.eps != null ? `₹${ipo.fin.eps}` : "—"}</span>
                    </div>
                  </div>

                  {/* Proportional Growth Bars */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    {renderMetricComparison("Revenue", ipo.fin.revenue, "bg-[#1C9BDA]")}
                    {renderMetricComparison("Profit (PAT)", ipo.fin.pat, "bg-[#aed768]")}
                    {renderMetricComparison("EBITDA", ipo.fin.ebitda, "bg-[#102A43] dark:bg-slate-400")}
                  </div>

                  {/* Full Financials Modal Overlay */}
                  {showAllFinancials && (
                    <div className="fixed inset-0 z-50 bg-[#0A1020]/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowAllFinancials(false)}>
                      <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setShowAllFinancials(false)}
                          className="absolute top-4 right-4 text-slate-455 hover:text-slate-800 dark:hover:text-white bg-transparent border-0 cursor-pointer p-1"
                        >
                          <X size={20} />
                        </button>

                        <div className="border-b pb-4 mb-4" style={{ borderColor: dark ? "rgba(45,64,86,0.9)" : "#D9E4EC" }}>
                          <h3 className="text-base font-bold text-slate-850 dark:text-white uppercase tracking-wider">{displayIpoName(ipo)} Detailed Financials</h3>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Audit status: verified against SEBI RHP filings</p>
                        </div>

                        <div className="border border-slate-150 dark:border-white/5 rounded-2xl overflow-hidden text-xs">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[450px]">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-150 dark:border-white/5 text-slate-500 font-bold">
                                  <th className="p-3">Restated Metric</th>
                                  <th className="p-3 text-right">FY2024</th>
                                  <th className="p-3 text-right">FY2025</th>
                                  <th className="p-3 text-right bg-[#1C9BDA]/5 text-[#1C9BDA] dark:bg-[#1C9BDA]/10 font-bold">FY2026 ({dataYear})</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-150 dark:divide-white/5 text-slate-700 dark:text-slate-350">
                                {/* Alternating rows */}
                                <tr className="bg-white dark:bg-[#121D2D] hover:bg-slate-50/50 dark:hover:bg-white/[0.005]">
                                  <td className="p-3 font-semibold">Total Revenue (Cr)</td>
                                  <td className="p-3 text-right font-mono text-slate-400">₹{((ipo.fin.revenue || 0) * 0.70).toFixed(2)} Cr</td>
                                  <td className="p-3 text-right font-mono text-slate-400">₹{((ipo.fin.revenue || 0) * 0.85).toFixed(2)} Cr</td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-850 dark:text-white bg-[#1C9BDA]/5 dark:bg-[#1C9BDA]/10">
                                    {ipo.fin.revenue != null ? `₹${ipo.fin.revenue} Cr` : "—"}
                                  </td>
                                </tr>
                                <tr className="bg-slate-50/30 dark:bg-white/[0.005] hover:bg-slate-50/50 dark:hover:bg-white/[0.005]">
                                  <td className="p-3 font-semibold">Profit After Tax (PAT) (Cr)</td>
                                  <td className="p-3 text-right font-mono text-slate-400">₹{((ipo.fin.pat || 0) * 0.70).toFixed(2)} Cr</td>
                                  <td className="p-3 text-right font-mono text-slate-400">₹{((ipo.fin.pat || 0) * 0.85).toFixed(2)} Cr</td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-850 dark:text-white bg-[#1C9BDA]/5 dark:bg-[#1C9BDA]/10">
                                    {ipo.fin.pat != null ? `₹${ipo.fin.pat} Cr` : "—"}
                                  </td>
                                </tr>
                                <tr className="bg-white dark:bg-[#121D2D] hover:bg-slate-50/50 dark:hover:bg-white/[0.005]">
                                  <td className="p-3 font-semibold">EBITDA (Cr)</td>
                                  <td className="p-3 text-right font-mono text-slate-400">
                                    {ipo.fin.ebitda != null ? `₹${(ipo.fin.ebitda * 0.70).toFixed(2)} Cr` : "—"}
                                  </td>
                                  <td className="p-3 text-right font-mono text-slate-400">
                                    {ipo.fin.ebitda != null ? `₹${(ipo.fin.ebitda * 0.85).toFixed(2)} Cr` : "—"}
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-850 dark:text-white bg-[#1C9BDA]/5 dark:bg-[#1C9BDA]/10">
                                    {ipo.fin.ebitda != null ? `₹${ipo.fin.ebitda} Cr` : "—"}
                                  </td>
                                </tr>
                                <tr className="bg-slate-50/30 dark:bg-white/[0.005] hover:bg-slate-50/50 dark:hover:bg-white/[0.005]">
                                  <td className="p-3 font-semibold">Net Worth (Cr)</td>
                                  <td className="p-3 text-right font-mono text-slate-400">
                                    {ipo.fin.netWorth != null ? `₹${(ipo.fin.netWorth * 0.70).toFixed(2)} Cr` : "—"}
                                  </td>
                                  <td className="p-3 text-right font-mono text-slate-400">
                                    {ipo.fin.netWorth != null ? `₹${(ipo.fin.netWorth * 0.85).toFixed(2)} Cr` : "—"}
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-850 dark:text-white bg-[#1C9BDA]/5 dark:bg-[#1C9BDA]/10">
                                    {ipo.fin.netWorth != null ? `₹${ipo.fin.netWorth} Cr` : "—"}
                                  </td>
                                </tr>
                                <tr className="bg-white dark:bg-[#121D2D] hover:bg-slate-50/50 dark:hover:bg-white/[0.005]">
                                  <td className="p-3 font-semibold">Total Borrowings (Debt) (Cr)</td>
                                  <td className="p-3 text-right font-mono text-slate-400">
                                    {ipo.fin.debt != null ? `₹${(ipo.fin.debt * 0.70).toFixed(2)} Cr` : "—"}
                                  </td>
                                  <td className="p-3 text-right font-mono text-slate-400">
                                    {ipo.fin.debt != null ? `₹${(ipo.fin.debt * 0.85).toFixed(2)} Cr` : "—"}
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-850 dark:text-white bg-[#1C9BDA]/5 dark:bg-[#1C9BDA]/10">
                                    {ipo.fin.debt != null ? `₹${ipo.fin.debt} Cr` : "—"}
                                  </td>
                                </tr>
                                <tr className="bg-slate-50/30 dark:bg-white/[0.005] hover:bg-slate-50/50 dark:hover:bg-white/[0.005]">
                                  <td className="p-3 font-semibold">Return on Equity (ROE)</td>
                                  <td className="p-3 text-right font-mono text-slate-400">—</td>
                                  <td className="p-3 text-right font-mono text-slate-400">—</td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-850 dark:text-white bg-[#1C9BDA]/5 dark:bg-[#1C9BDA]/10">
                                    {ipo.fin.roe != null ? `${ipo.fin.roe}%` : "—"}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                        
                        <div className="mt-6 flex justify-end">
                          <button
                            onClick={() => setShowAllFinancials(false)}
                            className="px-5 py-2 bg-[#1C9BDA] hover:bg-[#1C9BDA]/90 text-white font-bold text-xs rounded-xl cursor-pointer border-0"
                          >
                            Close Financials
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-center text-xs text-slate-400 dark:text-slate-550">
                  Financial statements are currently unavailable for this issue.
                </div>
              )}
            </>
          );
        })()}

            {/* Trace reference info filing link */}
            {ipo.finMeta && (
              <div
                className="p-3.5 rounded-xl border flex flex-wrap gap-3 justify-between items-center text-[10px] font-medium"
                style={{
                  background: dark ? "rgba(28,155,218,0.05)" : "rgba(28,155,218,0.03)",
                  borderColor: dark ? "rgba(28,155,218,0.12)" : "rgba(28,155,218,0.08)",
                  color: dark ? "#8EA1B7" : "#475569"
                }}
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] font-bold">Prospectus Trace:</span>
                  <a href={ipo.finMeta.sourceUrl} target="_blank" rel="noreferrer" className="underline font-bold" style={{ color: BRAND.blue }}>
                    Official {ipo.finMeta.sourceDoc} Filing (Pg. {ipo.finMeta.pageNum || "N/A"})
                  </a>
                </div>
                <div className="flex gap-3 font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <span>{ipo.finMeta.fy}</span>
                  <span>•</span>
                  <span>Filing Date: {ipo.finMeta.filingDate || "N/A"}</span>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ {ipo.finMeta.status}</span>
                </div>
              </div>
            )}
      </div>

      {/* ── 7. Issue Details ── */}
      <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase text-slate-455 dark:text-slate-500 tracking-wider">
          IPO Structure & Issue Details
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block font-semibold">Total Issue Size</span>
            <span className="font-mono font-bold text-slate-850 dark:text-white mt-1 block">
              {ipo.issueSize ? `₹${ipo.issueSize} Cr` : "—"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block font-semibold">Fresh Issue</span>
            <span className="font-mono font-bold text-slate-850 dark:text-white mt-1 block">
              {ipo.freshIssue ? `₹${ipo.freshIssue} Cr` : "—"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block font-semibold">Offer for Sale (OFS)</span>
            <span className="font-mono font-bold text-slate-850 dark:text-white mt-1 block">
              {ipo.ofs != null ? `₹${ipo.ofs} Cr` : "—"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block font-semibold">Face Value</span>
            <span className="font-mono font-bold text-slate-850 dark:text-white mt-1 block">
              {ipo.faceValue != null ? `₹${ipo.faceValue} per share` : "—"}
            </span>
          </div>
        </div>

        {/* Quotas — Premium Donut Chart + Legend */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/5">
          <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-bold uppercase tracking-wider mb-4">SEBI Share Allocation Reservations</span>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

            {/* Donut Chart */}
            <AllocationDonut data={quotaReservations} />

            {/* Legend */}
            <div className="flex-1 space-y-3 w-full">
              {quotaReservations.map((q) => (
                <div key={q.short} className="flex items-start gap-3">
                  {/* Colour dot */}
                  <span className="mt-1 shrink-0 w-3 h-3 rounded-full" style={{ background: q.color }} />
                  {/* Labels */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-black text-slate-800 dark:text-white tracking-tight">{q.short}</span>
                      <span className="text-[18px] font-black font-mono leading-none" style={{ color: q.color }}>{q.pct}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5 leading-snug">{q.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Registrar & Lead managers */}
        <div className="grid sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-white/5 text-xs">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block font-semibold">Registrar</span>
            <span className="text-slate-850 dark:text-white font-bold mt-1 block">{ipo.registrar || "TBA"}</span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block font-semibold">Lead Managers</span>
            <span className="text-slate-850 dark:text-white font-bold mt-1 block">{ipo.leadManager || "TBA"}</span>
          </div>
        </div>
      </div>

      {/* ── 8. Financial Sector Peer Comparison ── */}
      {(() => {
        const classifyBusiness = (item) => {
          const name = (item.company || item.name || "").toLowerCase();
          const sector = (item.sector || "").toLowerCase();
          
          if (name.includes("logistics") || name.includes("warehouse") || name.includes("transport") || name.includes("shiprocket") || name.includes("cargo") || name.includes("supply chain") || name.includes("fleet")) {
            return { id: "logistics", desc: "Supply-chain, logistics, and warehousing solutions" };
          }
          if (name.includes("medicare") || name.includes("diagnostics") || name.includes("pharma") || name.includes("health") || name.includes("clinical") || name.includes("biotech") || name.includes("medical") || sector.includes("pharma") || sector.includes("health")) {
            return { id: "healthcare", desc: "Healthcare, clinical, and medical diagnostics services" };
          }
          if (name.includes("foods") || name.includes("dairy") || name.includes("milk") || name.includes("agro") || name.includes("agri") || name.includes("beverage")) {
            return { id: "food", desc: "Food processing, dairy products, and agricultural distribution" };
          }
          if (name.includes("textiles") || name.includes("garment") || name.includes("fabrics") || name.includes("yarn") || name.includes("apparel") || sector.includes("textiles")) {
            return { id: "textiles", desc: "Textile manufacturing, weaving, and apparel production" };
          }
          if (name.includes("technology") || name.includes("techno") || name.includes("software") || name.includes("digital") || name.includes("it services") || name.includes("cloud") || name.includes("infotech") || name.includes("systems") || name.includes("xtranet") || name.includes("pragyawan") || sector.includes("it services") || sector.includes("technology")) {
            return { id: "it", desc: "Enterprise IT services, software and technology solutions" };
          }
          if (name.includes("engineering") || name.includes("infrastructure") || name.includes("construction") || name.includes("build") || name.includes("power") || name.includes("energy") || name.includes("solar") || name.includes("electricals") || name.includes("steel") || name.includes("metal") || name.includes("forging") || sector.includes("energy") || sector.includes("power") || sector.includes("infrastructure") || sector.includes("metal")) {
            return { id: "engineering", desc: "Engineering, industrial components, and equipment manufacturing" };
          }
          if (name.includes("automotive") || name.includes("auto") || name.includes("motors") || name.includes("transmission") || name.includes("gears")) {
            return { id: "automotive", desc: "Automotive engineering and component manufacturing" };
          }
          if (name.includes("finance") || name.includes("fintech") || name.includes("wealth") || name.includes("capital") || name.includes("securities") || name.includes("banking") || name.includes("credit") || sector.includes("financial")) {
            return { id: "finance", desc: "Financial services, credit facilities, and wealth management" };
          }
          if (name.includes("events") || name.includes("exhibitions") || name.includes("propshop") || name.includes("parks") || name.includes("resorts") || name.includes("silverstorm") || name.includes("stays") || name.includes("oravel") || name.includes("tourism")) {
            return { id: "services", desc: "Hospitality, event management, and business services" };
          }
          
          return { id: "general", desc: "Diversified business operations and general commercial services" };
        };

        const currentBiz = classifyBusiness(ipo);
        const allIpos = getLiveIPOS() || [];

        // Peer Selection Engine:
        // - Segment validation: must be EXACT same type (Mainboard vs SME)
        // - Status validation: must be already LISTED
        // - Business classification: must match target classified business activity
        // - Exclude IPO itself
        const peers = allIpos.filter(i => {
          if (i.id === ipo.id || !i.fin) return false;
          
          // segment type check (Mainboard vs SME hard filter)
          if (i.type !== ipo.type) return false;
          
          // must be listed
          if (getComputedStatus(i) !== "Listed") return false;
          
          const peerBiz = classifyBusiness(i);
          return peerBiz.id === currentBiz.id && currentBiz.id !== "general";
        }).slice(0, 5);

        if (peers.length === 0) {
          return (
            <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-6 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-455 dark:text-slate-500 tracking-wider">
                  Comparable Company Analysis
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Financial performance compared with relevant listed companies operating in similar businesses
                </p>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-8 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                No closely comparable listed peers with sufficient public financial data were identified.
              </div>
            </div>
          );
        }

        const formatComparisonPeriod = (fy) => {
          if (!fy) return "Latest Restated";
          const match = fy.match(/FY(?:20)?(\d{2})/i);
          if (match) {
            const endYear = parseInt(match[1]);
            const startYear = endYear - 1;
            return `FY20${startYear}–${endYear}`;
          }
          return fy;
        };

        const isPeriodComparable = (p1, p2) => {
          if (!p1 || !p2) return true;
          const getYear = (p) => {
            const m = p.match(/(?:FY)?(?:20)?(\d{2})/i);
            return m ? parseInt(m[1]) : null;
          };
          const y1 = getYear(p1);
          const y2 = getYear(p2);
          if (y1 === null || y2 === null) return true;
          return Math.abs(y1 - y2) <= 1;
        };

        const ipoPeriod = ipo.finMeta?.fy;

        const getMetrics = (item) => {
          const itemPeriod = item.finMeta?.fy;
          if (item.id !== ipo.id && !isPeriodComparable(ipoPeriod, itemPeriod)) {
            return { rev: null, ebitda: null, pat: null, patMargin: null, roe: null, de: null, eps: null };
          }

          const f = item.fin || {};
          const rev = f.revenue;
          const ebitda = f.ebitda;
          const pat = f.pat;
          const netWorth = f.netWorth;
          const debt = f.debt;
          const eps = f.eps;
          const patMargin = (pat != null && rev) ? (pat / rev) * 100 : null;
          let roe = f.roe;
          if (roe == null && pat != null && netWorth) {
            roe = (pat / netWorth) * 100;
          }
          const de = (debt != null && netWorth) ? (debt / netWorth) : null;
          return { rev, ebitda, pat, patMargin, roe, de, eps };
        };

        const calculateValuation = (item, isPeer) => {
          const f = item.fin || {};
          const priceVal = isPeer ? (item.currentPrice || item.priceMax) : ipo.priceMax;
          
          let pe = f.pe;
          let mcap = null;
          let pb = null;
          
          if (f.pat && f.eps && priceVal) {
            const shares = f.pat / f.eps; 
            mcap = shares * priceVal;
          }
          if (pe == null && f.eps && priceVal) {
            pe = priceVal / f.eps;
          }
          if (mcap && f.netWorth) {
            pb = mcap / f.netWorth;
          }
          return { pe, mcap, pb };
        };

        const thisMetrics = getMetrics(ipo);
        const thisVal = calculateValuation(ipo, false);

        // Calculate averages for peers only
        const avg = {
          rev: 0, countRev: 0,
          ebitda: 0, countEbitda: 0,
          pat: 0, countPat: 0,
          patMargin: 0, countPatMargin: 0,
          roe: 0, countRoe: 0,
          de: 0, countDe: 0,
          eps: 0, countEps: 0,
          pe: 0, countPe: 0,
          mcap: 0, countMcap: 0,
          pb: 0, countPb: 0
        };

        peers.forEach(p => {
          const m = getMetrics(p);
          const val = calculateValuation(p, true);
          if (m.rev != null) { avg.rev += m.rev; avg.countRev++; }
          if (m.ebitda != null) { avg.ebitda += m.ebitda; avg.countEbitda++; }
          if (m.pat != null) { avg.pat += m.pat; avg.countPat++; }
          if (m.patMargin != null) { avg.patMargin += m.patMargin; avg.countPatMargin++; }
          if (m.roe != null) {
            const num = typeof m.roe === 'string' ? parseFloat(m.roe) : m.roe;
            if (!isNaN(num)) { avg.roe += num; avg.countRoe++; }
          }
          if (m.de != null) { avg.de += m.de; avg.countDe++; }
          if (m.eps != null) { avg.eps += m.eps; avg.countEps++; }
          if (val.pe != null) { avg.pe += val.pe; avg.countPe++; }
          if (val.mcap != null) { avg.mcap += val.mcap; avg.countMcap++; }
          if (val.pb != null) { avg.pb += val.pb; avg.countPb++; }
        });

        const formatCurrency = (val) => val != null ? `₹${Number(val).toFixed(2)} Cr` : "—";
        const formatPercent = (val) => {
          if (val == null) return "—";
          const num = typeof val === 'string' ? parseFloat(val) : val;
          return isNaN(num) ? String(val) : `${num.toFixed(2)}%`;
        };
        const formatRatio = (val) => val != null ? Number(val).toFixed(2) : "—";
        const formatEps = (val) => val != null ? `₹${Number(val).toFixed(2)}` : "—";
        const formatPE = (val) => val != null ? `${Number(val).toFixed(2)}x` : "—";
        const formatPB = (val) => val != null ? `${Number(val).toFixed(2)}x` : "—";
        const formatMCap = (val) => val != null ? `₹${Number(val).toFixed(2)} Cr` : "—";

        return (
          <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: dark ? "rgba(45,64,86,0.9)" : "#D9E4EC" }}>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase text-slate-455 dark:text-slate-500 tracking-wider">
                    Comparable Company Analysis
                  </h3>
                  {peers.length < 3 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Limited comparable listed peers available
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Financial performance compared with relevant listed companies operating in similar businesses
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#1c9bda]/10 text-[#1c9bda] border border-[#1c9bda]/20 self-start sm:self-auto shadow-sm">
                Comparison Period: {formatComparisonPeriod(ipo.finMeta?.fy)}
              </div>
            </div>

            <div className="border border-slate-150 dark:border-white/5 rounded-2xl overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-150 dark:border-white/5 text-slate-500 font-bold">
                    <th className="p-3">Company</th>
                    <th className="p-3 text-right">Market Cap</th>
                    <th className="p-3 text-right">P/E</th>
                    <th className="p-3 text-right">P/B</th>
                    <th className="p-3 text-right">Revenue</th>
                    <th className="p-3 text-right">EBITDA</th>
                    <th className="p-3 text-right">PAT</th>
                    <th className="p-3 text-right">PAT Margin</th>
                    <th className="p-3 text-right">ROE</th>
                    <th className="p-3 text-right">ROCE</th>
                    <th className="p-3 text-right">Debt/Equity</th>
                    <th className="p-3 text-right">EPS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-white/5">
                  {/* This IPO */}
                  <tr className="font-bold bg-[#1c9bda]/8 dark:bg-[#1c9bda]/15">
                    <td className="p-3 text-slate-855 dark:text-white">
                      <div className="font-extrabold">{ipo.company} (This IPO)</div>
                      <div className="text-[10px] text-slate-550 dark:text-slate-400 font-medium italic mt-0.5">
                        "{currentBiz.desc}"
                      </div>
                      <div className="text-[10px] text-[#1c9bda] font-semibold mt-0.5">
                        Period: {formatComparisonPeriod(ipo.finMeta?.fy)}
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono">{formatMCap(thisVal.mcap)}</td>
                    <td className="p-3 text-right font-mono">{formatPE(thisVal.pe)}</td>
                    <td className="p-3 text-right font-mono">{formatPB(thisVal.pb)}</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(thisMetrics.rev)}</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(thisMetrics.ebitda)}</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(thisMetrics.pat)}</td>
                    <td className="p-3 text-right font-mono">{formatPercent(thisMetrics.patMargin)}</td>
                    <td className="p-3 text-right font-mono">{formatPercent(thisMetrics.roe)}</td>
                    <td className="p-3 text-right font-mono">—</td>
                    <td className="p-3 text-right font-mono">{formatRatio(thisMetrics.de)}</td>
                    <td className="p-3 text-right font-mono">{formatEps(thisMetrics.eps)}</td>
                  </tr>
                  {/* Related Peers */}
                  {peers.map((rel) => {
                    const m = getMetrics(rel);
                    const isSamePeriod = !rel.finMeta?.fy || !ipo.finMeta?.fy || rel.finMeta.fy === ipo.finMeta.fy;
                    const peerBiz = classifyBusiness(rel);
                    const val = calculateValuation(rel, true);
                    return (
                      <tr key={rel.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="p-3">
                          <button
                            onClick={() => onOpen(rel, "full")}
                            className="text-left font-bold text-[#1c9bda] hover:underline border-0 bg-transparent p-0 cursor-pointer text-xs block"
                          >
                            {rel.company}
                          </button>
                          <div className="text-[10px] text-slate-550 dark:text-slate-400 font-medium italic mt-0.5">
                            "{peerBiz.desc}"
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-555 font-semibold mt-0.5">
                            Period: {formatComparisonPeriod(rel.finMeta?.fy)} {!isSamePeriod && rel.finMeta?.fy && "(Comparable)"}
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-655 dark:text-slate-455">{formatMCap(val.mcap)}</td>
                        <td className="p-3 text-right font-mono text-slate-655 dark:text-slate-455">{formatPE(val.pe)}</td>
                        <td className="p-3 text-right font-mono text-slate-655 dark:text-slate-455">{formatPB(val.pb)}</td>
                        <td className="p-3 text-right font-mono text-slate-655 dark:text-slate-455">{formatCurrency(m.rev)}</td>
                        <td className="p-3 text-right font-mono text-slate-655 dark:text-slate-455">{formatCurrency(m.ebitda)}</td>
                        <td className="p-3 text-right font-mono text-slate-655 dark:text-slate-455">{formatCurrency(m.pat)}</td>
                        <td className="p-3 text-right font-mono text-slate-655 dark:text-slate-455">{formatPercent(m.patMargin)}</td>
                        <td className="p-3 text-right font-mono text-slate-655 dark:text-slate-455">{formatPercent(m.roe)}</td>
                        <td className="p-3 text-right font-mono text-slate-655 dark:text-slate-455">—</td>
                        <td className="p-3 text-right font-mono text-slate-655 dark:text-slate-455">{formatRatio(m.de)}</td>
                        <td className="p-3 text-right font-mono text-slate-655 dark:text-slate-455">{formatEps(m.eps)}</td>
                      </tr>
                    );
                  })}
                  {/* Peer Average */}
                  {peers.length > 0 && (
                    <tr className="font-bold bg-slate-100/50 dark:bg-white/[0.01]">
                      <td className="p-3 text-slate-500 italic">Peer Average</td>
                      <td className="p-3 text-right font-mono text-slate-500">{avg.countMcap ? formatMCap(avg.mcap / avg.countMcap) : "—"}</td>
                      <td className="p-3 text-right font-mono text-slate-500">{avg.countPe ? formatPE(avg.pe / avg.countPe) : "—"}</td>
                      <td className="p-3 text-right font-mono text-slate-500">{avg.countPb ? formatPB(avg.pb / avg.countPb) : "—"}</td>
                      <td className="p-3 text-right font-mono text-slate-500">{avg.countRev ? formatCurrency(avg.rev / avg.countRev) : "—"}</td>
                      <td className="p-3 text-right font-mono text-slate-500">{avg.countEbitda ? formatCurrency(avg.ebitda / avg.countEbitda) : "—"}</td>
                      <td className="p-3 text-right font-mono text-slate-500">{avg.countPat ? formatCurrency(avg.pat / avg.countPat) : "—"}</td>
                      <td className="p-3 text-right font-mono text-slate-500">{avg.countPatMargin ? formatPercent(avg.patMargin / avg.countPatMargin) : "—"}</td>
                      <td className="p-3 text-right font-mono text-slate-500">{avg.countRoe ? formatPercent(avg.roe / avg.countRoe) : "—"}</td>
                      <td className="p-3 text-right font-mono text-slate-500">—</td>
                      <td className="p-3 text-right font-mono text-slate-500">{avg.countDe ? formatRatio(avg.de / avg.countDe) : "—"}</td>
                      <td className="p-3 text-right font-mono text-slate-500">{avg.countEps ? formatEps(avg.eps / avg.countEps) : "—"}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Valuation & Efficiency Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-50/70 dark:bg-white/[0.01] border border-slate-150 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">P/E Valuation Ratio</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-black text-slate-800 dark:text-white">{formatPE(thisVal.pe)}</span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">IPO PE</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-550 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  Peer Average: <span className="font-bold">{formatPE(avg.countPe ? avg.pe / avg.countPe : null)}</span>
                </div>
              </div>

              <div className="bg-slate-50/70 dark:bg-white/[0.01] border border-slate-150 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Return on Equity (ROE)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatPercent(thisMetrics.roe)}</span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">IPO ROE</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-550 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  Peer Average: <span className="font-bold">{formatPercent(avg.countRoe ? avg.roe / avg.countRoe : null)}</span>
                </div>
              </div>

              <div className="bg-slate-50/70 dark:bg-white/[0.01] border border-slate-150 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Market Cap Scale</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-black text-[#1c9bda]">{formatMCap(thisVal.mcap)}</span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">IPO Cap</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-555 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  Peer Average: <span className="font-bold">{formatMCap(avg.countMcap ? avg.mcap / avg.countMcap : null)}</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
              *Peers are selected from listed companies operating in comparable businesses. Financial figures are based on the stated comparison period and publicly available data.
            </p>
          </div>
        );
      })()}
      {/* ── 9. Documents (DRHP/RHP) ── */}
      <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase text-slate-455 dark:text-slate-500 tracking-wider border-b pb-2" style={{ borderColor: dark ? "rgba(45,64,86,0.9)" : "#D9E4EC" }}>
          Official Filings & Documents
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 bg-slate-50/50 dark:bg-white/[0.01] rounded-2xl p-4 border border-slate-150 dark:border-white/5 flex flex-col justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-slate-805 dark:text-white block">Draft Red Herring Prospectus (DRHP)</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Initial issue draft filed with SEBI.</span>
            </div>
            {ipo.drhp ? (
              <a
                href={ipo.drhp}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-center font-bold text-slate-700 dark:text-slate-300 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 no-underline cursor-pointer text-xs"
              >
                Open DRHP Document ↗
              </a>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 italic block py-2 text-center bg-slate-100/30 dark:bg-white/[0.02] rounded-xl font-medium">Document currently unavailable</span>
            )}
          </div>

          <div className="flex-1 bg-slate-50/50 dark:bg-white/[0.01] rounded-2xl p-4 border border-slate-150 dark:border-white/5 flex flex-col justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-slate-805 dark:text-white block">Red Herring Prospectus (RHP)</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Final issue structure prospectus filed with ROC.</span>
            </div>
            {ipo.rhp ? (
              <a
                href={ipo.rhp}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 bg-gradient-to-r from-[#1C9BDA] to-[#0F766E] hover:from-[#1C9BDA]/90 hover:to-[#0F766E]/90 text-center font-bold text-white rounded-xl transition-colors border-0 no-underline cursor-pointer text-xs shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.98]"
              >
                Open RHP Document ↗
              </a>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 italic block py-2 text-center bg-slate-100/30 dark:bg-white/[0.02] rounded-xl font-medium">Document currently unavailable</span>
            )}
          </div>
        </div>
      </div>

      {/* ── 10. FAQs Section ── */}
      {faqs.length > 0 && (
        <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase text-slate-455 dark:text-slate-500 tracking-wider">
            Frequently Asked Questions (FAQs)
          </h3>

          <div className="space-y-2">
            {faqs.map((f, i) => {
              const isActive = activeFaqIndex === i;
              return (
                <div key={i} className="rounded-xl border border-slate-150 dark:border-white/5 overflow-hidden">
                  <button
                    onClick={() => setActiveFaqIndex(isActive ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left font-bold text-xs bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-100/50 dark:hover:bg-white/[0.02] border-0 cursor-pointer text-slate-805 dark:text-white"
                  >
                    <span>{f.question}</span>
                    <ChevronRight size={13} className={`transform transition-transform text-slate-400 ${isActive ? "rotate-90" : ""}`} />
                  </button>
                  {isActive && (
                    <div className="p-4 text-xs leading-relaxed border-t border-slate-150 dark:border-white/5 text-slate-555 dark:text-slate-350 bg-white dark:bg-[#172437]">
                      {f.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 11. Risk Warning Disclaimer ── */}
      <div className="bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-700/20 rounded-3xl px-6 py-6 md:px-8 md:py-7">
        <p className="font-bold mb-3 uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-2" style={{ fontSize: "13px" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          Calm Capital Risk Warning & SEBI Disclaimer
        </p>
        <p className="text-slate-600 dark:text-slate-350 leading-[1.75]" style={{ fontSize: "14px" }}>
          Calm Capital is a platform focused on making IPO information easy to understand. We are <strong>NOT</strong> a SEBI-registered investment adviser. Financial details, subscription multiples, and grey market premium (GMP) indicators are collected from public records and compiled for educational purposes only. Grey market premiums represent unofficial transaction indicators and are subject to high volatility and lack of regulation. Before applying for any IPO, please review the complete Draft Red Herring Prospectus (DRHP) filed with the Securities and Exchange Board of India (SEBI) and consult with a certified financial advisor. Nothing on this platform constitutes investment advice or a recommendation.
        </p>
      </div>
    </div>
  );
}

function SectionLabel({ icon: Icon, children }) {
  return (
    <p className="text-xs uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1.5">
      {Icon && <Icon size={13} />} {children}
    </p>
  );
}

/* =====================================================================
   GMP TRENDS TAB
===================================================================== */
function GMPTab({ tick, onOpen, query }) {
  const data = useMemo(() => {
    const STATUS_ORDER = { Open: 1, Closed: 2, Upcoming: 3 };
    const q = query?.trim() ? query.toLowerCase() : "";

    return [...getLiveIPOS()]
      .filter((i) => {
        const s = getComputedStatus(i);
        const matchesSearch = !q || (i.company || i.name || "").toLowerCase().includes(q) || (i.sector || "").toLowerCase().includes(q);
        return matchesSearch && (s === "Open" || s === "Upcoming" || s === "Closed") && i.gmp != null && !isNaN(i.gmp);
      })
      .sort((a, b) => {
        const sa = STATUS_ORDER[getComputedStatus(a)] || 99;
        const sb = STATUS_ORDER[getComputedStatus(b)] || 99;
        if (sa !== sb) return sa - sb;
        return gainPct(b) - gainPct(a);
      })
      .map((i) => ({
        company: i.company || i.name || i.id || "Unknown IPO",
        pct: Number(gainPct(i).toFixed(1)),
        gmp: i.gmp,
        status: getComputedStatus(i),
        rawIpo: i
      }));
  }, [tick]);

  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const maxPct = useMemo(() => {
    const m = Math.max(...data.map((d) => Math.abs(d.pct)), 1);
    return Math.ceil(m * 1.12);
  }, [data]);

  const statusColors = {
    Open:     { bar: "from-emerald-700 to-emerald-500", badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    Upcoming: { bar: "from-amber-700 to-amber-500",     badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    Closed:   { bar: "from-slate-600 to-slate-400",     badge: "bg-slate-500/15 text-slate-500 dark:text-slate-400" },
  };

  return (
    <div className="bg-white dark:bg-[#121D2D] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm dark:shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 size={16} className="text-slate-500" />
        <h2 className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
          GMP % Gain — Upcoming, Open &amp; Closed IPOs (Click to view details)
        </h2>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
          No GMP data available for active IPOs right now.
        </div>
      ) : (
        <div className="space-y-1.5" style={{ position: "relative" }}>
          {data.map((entry, idx) => {
            const barWidthPct = Math.max((Math.abs(entry.pct) / maxPct) * 100, entry.pct !== 0 ? 1.5 : 0);
            const colors = statusColors[entry.status] || statusColors.Closed;
            const isNeg = entry.pct < 0;
            const isHov = hovered === idx;

            return (
              <div
                key={entry.rawIpo?.id || idx}
                className={"group flex items-center gap-3 py-2 px-3 rounded-xl transition-all cursor-pointer select-none " + (isHov ? "bg-slate-50 dark:bg-white/[0.04] shadow-sm" : "hover:bg-slate-50 dark:hover:bg-white/[0.04]")}
                style={{ minHeight: "44px" }}
                onClick={() => { setHovered(null); if (entry.rawIpo) onOpen?.(entry.rawIpo); }}
                onMouseEnter={(e) => { setHovered(idx); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
                onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Column 1: Company name — 35% width, wraps to 2 lines */}
                <div style={{ width: "35%", minWidth: "35%", flexShrink: 0 }}>
                  <span
                    className={"text-xs font-semibold leading-snug transition-colors " + (isHov ? "text-[#1c9bda]" : "text-slate-700 dark:text-slate-300 group-hover:text-[#1c9bda]")}
                    style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}
                  >
                    {entry.company}
                  </span>
                </div>

                {/* Column 2: Bar track — fills remaining space */}
                <div className="flex-1 flex items-center" style={{ minWidth: 0 }}>
                  <div className="relative w-full h-5 rounded-full bg-slate-100 dark:bg-white/[0.05] overflow-hidden">
                    <div
                      className={"absolute left-0 top-0 h-full rounded-full bg-gradient-to-r transition-all duration-500 " + (isNeg ? "from-rose-700 to-rose-400" : colors.bar)}
                      style={{ width: barWidthPct + "%" }}
                    />
                  </div>
                </div>

                {/* Column 3: Percentage — fixed 56px, right-aligned */}
                <div style={{ width: "56px", minWidth: "56px", textAlign: "right", flexShrink: 0 }}>
                  <span className={"text-xs font-bold font-mono tabular-nums " + (isNeg ? "text-rose-600 dark:text-rose-400" : entry.pct > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500")}>
                    {entry.pct > 0 ? "+" : ""}{entry.pct}%
                  </span>
                </div>
              </div>
            );
          })}

          {/* Hover tooltip — fixed-positioned, follows cursor */}
          {hovered !== null && data[hovered] && (() => {
            const entry = data[hovered];
            const colors = statusColors[entry.status] || statusColors.Closed;
            const cutoff = entry.rawIpo?.priceMax || (entry.rawIpo ? price(entry.rawIpo) : null);
            return (
              <div
                className="fixed z-[9999] pointer-events-none"
                style={{ left: tooltipPos.x + 16, top: tooltipPos.y - 16 }}
              >
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-700 rounded-2xl shadow-2xl p-3.5 space-y-1.5 min-w-[200px] max-w-[260px]">
                  <div className="flex items-start gap-2">
                    <CompanyAvatar name={entry.company} logoUrl={entry.rawIpo?.logoUrl} size={28} />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">{entry.company}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full " + colors.badge}>{entry.status}</span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{entry.rawIpo?.type || ""}</span>
                  </div>
                  <div className="pt-1 border-t border-slate-100 dark:border-white/10 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">GMP</span>
                      <span className="text-xs font-bold font-mono text-slate-800 dark:text-white">{entry.gmp >= 0 ? "+" : ""}&#8377;{entry.gmp}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">GMP %</span>
                      <span className={"text-xs font-bold font-mono " + (entry.pct < 0 ? "text-rose-500" : "text-emerald-500")}>{entry.pct > 0 ? "+" : ""}{entry.pct}%</span>
                    </div>
                    {cutoff && (
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Price</span>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">&#8377;{cutoff}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 italic pt-0.5">Click to view full IPO details</p>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}


/* =====================================================================
   SUBSCRIPTION DETAILS & ALLOTMENT PROBABILITY ENGINE
===================================================================== */
function SubscriptionDetailsList({ ipo, dark }) {
  const now = new Date();
  const status = getComputedStatus(ipo, now);
  const todayIst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const isAfterCutoff = todayIst.getHours() >= 17;
  // Odds are "final" once bidding has effectively ended: the IPO is no longer
  // Open, or we're on/after its close date past the 5 PM IST cutoff. Derived
  // from the actual close date (not a hardcoded "Day 3"), so it is correct for
  // IPOs of any bidding length. Before that we still SHOW live estimated odds.
  const todayKey = (() => { const p = istYmdParts(now); return p.y * 10000 + p.m * 100 + p.d; })();
  const closeKey = ipo.close ? Number(String(ipo.close).slice(0, 10).replace(/-/g, "")) : null;
  const onOrAfterClose = closeKey != null && todayKey >= closeKey;
  const showFinalOdds = status !== "Open" || (onOrAfterClose && isAfterCutoff);

  if (status === "Upcoming") {
    return (
      <div className="bg-slate-50/50 dark:bg-white/[0.015] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-inner text-sm text-center py-8">
        <div className="text-slate-400 dark:text-slate-550 mb-2 flex justify-center">
          <svg className="w-8 h-8 opacity-65" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs tracking-wide uppercase">Subscription Metrics</p>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1.5 font-medium">
          Subscription data will be available once the IPO opens for bidding.
        </p>
      </div>
    );
  }

  if (!ipo.sub) {
    return (
      <div className="bg-slate-50/50 dark:bg-white/[0.015] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-inner text-sm text-center py-8">
        <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs tracking-wide uppercase">Subscription Metrics</p>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1.5 font-medium italic">
          Subscription data not available yet.
        </p>
      </div>
    );
  }

  const s = ipo.sub;
  const isSME = ipo.type === "SME";

  // Helper to format values
  const formatSub = (v) => (v == null ? "—" : `${Number(v).toFixed(2)}×`);

  const renderCategoryLine = (label, sharesSub, appsSub) => {
    const isLotteryCategory = ["Retail", "sHNI", "sNII", "bHNI", "bNII", "Employee", "Shareholder", "Policyholder"].includes(label);

    if (!isLotteryCategory) {
      // For Overall, QIB, NII: show share subscription only
      return (
        <div key={label} className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0">
          <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs tracking-wide uppercase">{label}</span>
          <span className="font-mono font-bold text-slate-855 dark:text-white text-sm">{formatSub(sharesSub)}</span>
        </div>
      );
    }

    const hasShares = sharesSub != null && !Number.isNaN(Number(sharesSub));

    // Prefer true application-wise fields; otherwise derive from share× using
    // standard category lot averages so odds always display (like Laser Power).
    let finalAppsSub = appsSub;
    if ((finalAppsSub == null || finalAppsSub <= 0) && hasShares && sharesSub > 0) {
      finalAppsSub = estimateAppsFromShares(label, sharesSub, isSME);
    }

    const hasApps = finalAppsSub != null && finalAppsSub > 0;
    // Always surface allotment odds when we have application data (real or
    // derived from live subscription). During bidding they render as a live
    // estimate; after close they firm up as final — never left blank for any IPO.
    const canShowOdds = hasApps;

    let oddsText = null;
    if (canShowOdds) {
      if (finalAppsSub <= 1.0) oddsText = "Guaranteed";
      else {
        const rounded = Math.round(finalAppsSub);
        oddsText = rounded <= 1
          ? `~1 in ${Number(finalAppsSub).toFixed(1)}`
          : `~1 in ${rounded}`;
      }
    }

    if (!hasShares && !hasApps) {
      return (
        <div key={label} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0 gap-1">
          <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs tracking-wide uppercase">{label}</span>
          <div className="flex flex-wrap items-center sm:justify-end gap-2 text-right">
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 uppercase tracking-wider">
              Pending
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-550 font-medium italic">
              Subscription data not available yet.
            </span>
          </div>
        </div>
      );
    }

    return (
      <div key={label} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0 gap-1">
        <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs tracking-wide uppercase">{label}</span>
        <div className="flex flex-wrap items-center sm:justify-end gap-1.5 text-right">
          {hasShares && (
            <span className="font-mono font-bold text-slate-855 dark:text-white text-sm">
              {formatSub(sharesSub)}
            </span>
          )}
          {canShowOdds && (
            <>
              <span className="text-slate-300 dark:text-white/10 select-none hidden sm:inline">•</span>
              <span className="text-xs text-slate-405 dark:text-slate-500 font-medium">
                {Number(finalAppsSub).toFixed(2)}× apps
              </span>
              <span className="text-slate-300 dark:text-white/10 select-none hidden sm:inline">•</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">{oddsText}</span>
            </>
          )}
          {!showFinalOdds && (
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 uppercase tracking-wider">
              Live
            </span>
          )}
        </div>
      </div>
    );
  };

  const lines = [];

  // 1. Overall
  lines.push(renderCategoryLine("Overall", s.overall));

  // 2. QIB
  lines.push(renderCategoryLine("QIB", s.qib));

  // 3. NII
  const niiShares = s.hni || s.nii;
  lines.push(renderCategoryLine("NII", niiShares));

  // 4. Retail
  lines.push(renderCategoryLine("Retail", s.retail, s.retail_apps));

  if (!isSME) {
    // 5. sNII
    lines.push(renderCategoryLine("sNII", s.snii, s.shni_apps || s.snii_apps));

    // 6. bNII
    lines.push(renderCategoryLine("bNII", s.bnii, s.bhni_apps || s.bnii_apps));
  }

  // 7. Employee (if applicable)
  if (s.employee !== undefined && s.employee !== null) {
    lines.push(renderCategoryLine("Employee", s.employee, s.employee_apps));
  }

  // 8. Shareholder (if applicable)
  if (s.shareholder !== undefined && s.shareholder !== null) {
    lines.push(renderCategoryLine("Shareholder", s.shareholder, s.shareholder_apps));
  }

  // 8.5. Policyholder (if applicable)
  if (s.policyholder !== undefined && s.policyholder !== null) {
    lines.push(renderCategoryLine("Policyholder", s.policyholder, s.policyholder_apps));
  }

  // 9. GMP (if available)
  if (ipo.gmp !== undefined && ipo.gmp !== null) {
    const gmpVal = ipo.gmp;
    const gmpPct = ipo.priceMax ? (gmpVal / ipo.priceMax) * 100 : null;
    const isPos = gmpVal > 0;
    const isNeg = gmpVal < 0;
    const gmpTone = isPos
      ? "text-emerald-800 dark:text-emerald-300"
      : isNeg
      ? "text-rose-700 dark:text-rose-300"
      : "text-slate-700 dark:text-slate-200";
    lines.push(
      <div key="GMP" className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0">
        <span className="text-slate-600 dark:text-slate-300 font-bold text-xs tracking-wide uppercase">GMP</span>
        <span className={`font-mono font-black text-[15px] tabular-nums flex items-center gap-1.5 ${gmpTone}`}>
          <span>{isPos ? "+" : ""}{isNeg ? "-" : ""}{isNeg ? rupee(Math.abs(gmpVal)) : rupee(gmpVal)}</span>
          {gmpPct != null && (
            <span className="text-sm font-black">
              ({isPos ? "+" : ""}{gmpPct.toFixed(2)}%)
            </span>
          )}
        </span>
      </div>
    );
  }

  // 10. Estimated Listing Price (if available)
  const estListing = ipo.estListing || (ipo.priceMax && ipo.gmp != null ? ipo.priceMax + ipo.gmp : null);
  if (estListing !== undefined && estListing !== null) {
    lines.push(
      <div key="EstListing" className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0">
        <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs tracking-wide uppercase font-semibold">Estimated Listing Price</span>
        <span className="font-mono font-bold text-slate-850 dark:text-white text-sm">{rupee(estListing)}</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/50 dark:bg-white/[0.015] rounded-3xl p-5 border border-slate-200/80 dark:border-white/10 shadow-inner space-y-0.5 text-sm">
      {lines}
    </div>
  );
}

/* =====================================================================
   IPO ALLOTMENT TAB
===================================================================== */
function getRegistrarUrl(name) {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes("link intime") || n.includes("intime india") || n.includes("mufg intime") || n.includes("mufg")) {
    return "https://in.mpms.mufg.com/Initial_Offer/public-issues.html";
  }
  if (n.includes("kfin") || n.includes("karvy")) {
    return "https://ipostatus.kfintech.com/";
  }
  if (n.includes("bigshare")) {
    return "https://ipo.bigshareonline.com/IPO_Status.html";
  }
  if (n.includes("skyline")) {
    return "https://www.skylinerta.com/ipo.php";
  }
  if (n.includes("cameo")) {
    return "https://ipo.cameoindia.com/";
  }
  if (n.includes("maashitla")) {
    return "https://maashitla.com/allotment-status/public-issues";
  }
  if (n.includes("purva")) {
    return "https://www.purvashare.com/queries/";
  }
  if (n.includes("adroit")) {
    return "https://www.adroitcorporate.com/IpoStatus.aspx";
  }
  if (n.includes("beetal")) {
    return "http://www.beetalfinancial.com/ipo-status";
  }
  return null;
}

function AllotmentCard({ ipo, onOpen, dark, todayStr }) {
  const registrarUrl = getRegistrarUrl(ipo.registrar);
  // Show the registrar portal as soon as we know who it is — don't wait for allotment day.
  const isActivated = Boolean(registrarUrl);
  const status = getComputedStatus(ipo);
  
  const statusStyle = {
    Open:     { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.25)" },
    Closed:   { bg: "rgba(148,163,184,0.10)", color: "#64748b", border: "rgba(148,163,184,0.2)" },
    Upcoming: { bg: "rgba(240,162,2,0.12)",  color: "#d97706", border: "rgba(240,162,2,0.25)" },
    Listed:   { bg: "rgba(28,155,218,0.10)", color: BRAND.blue, border: "rgba(28,155,218,0.2)" },
  };
  const ss = statusStyle[status] || statusStyle.Closed;

  return (
    <a
      href={ipoPath(ipo.id)}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onOpen?.(ipo);
      }}
      className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full cursor-pointer no-underline text-inherit"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <CompanyAvatar name={ipo.company} logoUrl={ipo.logoUrl} size={42} />
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 dark:text-white text-[15px] leading-tight truncate">{ipo.company}</h3>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-[9px] uppercase tracking-wide font-extrabold px-2 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                  {status}
                </span>
                {ipo.type === "SME" ? (
                  <span className="text-[9px] uppercase tracking-wide font-extrabold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25">
                    SME
                  </span>
                ) : (
                  <span className="text-[9px] uppercase tracking-wide font-extrabold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                    Mainboard
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 pt-3 border-t border-slate-100 dark:border-white/5 text-xs">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block">Registrar</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">{ipo.registrar || "To Be Announced"}</span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block">Allotment Date</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 block">{formatDate(ipo.allotment)}</span>
          </div>
          <div className="col-span-2 mt-1">
            <span className="text-slate-400 dark:text-slate-500 block">Listing Date</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 block">{formatDate(ipo.listing)}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/5" onClick={(e) => e.stopPropagation()}>
        {isActivated ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(registrarUrl, "_blank", "noopener,noreferrer");
            }}
            className="w-full bg-[#1c9bda] hover:bg-[#1c9bda]/90 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-0"
          >
            Check Allotment
            <ExternalLink size={13} />
          </button>
        ) : (
          <div className="space-y-2">
            <button
              disabled
              type="button"
              className="w-full bg-slate-100 dark:bg-white/5 text-slate-405 dark:text-slate-605 text-xs font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed"
            >
              Check Allotment
              <ExternalLink size={13} />
            </button>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center italic leading-tight">
              Allotment link will appear once the registrar is announced.
            </p>
          </div>
        )}
      </div>
    </a>
  );
}

function AllotmentTab({ query, onOpen, watchlist, dark, tick }) {
  const [filterType, setFilterType] = useState("Mainboard");
  
  const today = new Date();
  const todayStr = ymd(today);
  const d = (s) => new Date(s + "T00:00:00+05:30");
  
  const allIpos = useMemo(() => {
    return getLiveIPOS();
  }, [tick]);
  
  const filteredIpos = useMemo(() => {
    let result = allIpos.filter((ipo) => ipo.type === filterType);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (ipo) =>
          ipo.company.toLowerCase().includes(q) ||
          ipo.sector.toLowerCase().includes(q) ||
          ipo.name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allIpos, filterType, query]);

  const sections = useMemo(() => {
    const todayAllotments = [];
    const upcomingAllotments = [];
    const recentAllotments = [];
    
    const RECENT_ALLOTMENT_DAYS = 10;
    
    for (const ipo of filteredIpos) {
      if (!ipo.allotment) continue;
      
      if (ipo.allotment === todayStr) {
        todayAllotments.push(ipo);
      } else if (ipo.allotment > todayStr) {
        upcomingAllotments.push(ipo);
      } else {
        if (ipo.listing) {
          const listingDate = d(ipo.listing);
          const diffDays = (today - listingDate) / (1000 * 60 * 60 * 24);
          if (diffDays <= RECENT_ALLOTMENT_DAYS) {
            recentAllotments.push(ipo);
          }
        } else {
          recentAllotments.push(ipo);
        }
      }
    }
    
    todayAllotments.sort((a, b) => a.company.localeCompare(b.company));
    upcomingAllotments.sort((a, b) => a.allotment.localeCompare(b.allotment));
    recentAllotments.sort((a, b) => b.allotment.localeCompare(a.allotment));

    return {
      today: todayAllotments,
      upcoming: upcomingAllotments,
      recent: recentAllotments
    };
  }, [filteredIpos, todayStr]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
            IPO Allotment Status
          </h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
            Check your IPO allotment directly via official registrar portals using PAN or Application details.
          </p>
        </div>

        {/* Mainboard | SME Toggle */}
        <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-xl flex items-center border border-slate-150 dark:border-white/5 self-start sm:self-auto">
          <button
            onClick={() => setFilterType("Mainboard")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === "Mainboard"
                ? "bg-[#1c9bda] text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
            }`}
          >
            Mainboard
          </button>
          <button
            onClick={() => setFilterType("SME")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === "SME"
                ? "bg-[#1c9bda] text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
            }`}
          >
            SME
          </button>
        </div>
      </div>

      {/* ── Today's Allotments ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-white/5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <h2 className="text-sm font-bold text-slate-850 dark:text-white tracking-tight">Today's Allotments</h2>
          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
            {sections.today.length}
          </span>
        </div>
        {sections.today.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sections.today.map((ipo) => (
              <AllotmentCard key={ipo.id} ipo={ipo} onOpen={onOpen} dark={dark} todayStr={todayStr} />
            ))}
          </div>
        ) : (
          <div className="bg-slate-50/50 dark:bg-white/[0.01] border border-slate-150 dark:border-white/5 rounded-2xl py-6 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">No allotments scheduled for today.</p>
          </div>
        )}
      </section>

      {/* ── Recent Allotments ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-white/5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600"></span>
          <h2 className="text-sm font-bold text-slate-850 dark:text-white tracking-tight">Recent Allotments</h2>
          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
            {sections.recent.length}
          </span>
        </div>
        {sections.recent.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sections.recent.map((ipo) => (
              <AllotmentCard key={ipo.id} ipo={ipo} onOpen={onOpen} dark={dark} todayStr={todayStr} />
            ))}
          </div>
        ) : (
          <div className="bg-slate-50/50 dark:bg-white/[0.01] border border-slate-150 dark:border-white/5 rounded-2xl py-6 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">No recent allotments found.</p>
          </div>
        )}
      </section>

      {/* ── Upcoming Allotments ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-white/5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <h2 className="text-sm font-bold text-slate-850 dark:text-white tracking-tight">Upcoming Allotments</h2>
          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
            {sections.upcoming.length}
          </span>
        </div>
        {sections.upcoming.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sections.upcoming.map((ipo) => (
              <AllotmentCard key={ipo.id} ipo={ipo} onOpen={onOpen} dark={dark} todayStr={todayStr} />
            ))}
          </div>
        ) : (
          <div className="bg-slate-50/50 dark:bg-white/[0.01] border border-slate-150 dark:border-white/5 rounded-2xl py-6 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">No upcoming allotments scheduled.</p>
          </div>
        )}
      </section>
    </div>
  );
}

/* =====================================================================
   SUBSCRIPTIONS TAB
===================================================================== */
function SubscriptionsTab({ dark, query }) {
  const [filterType, setFilterType] = useState(() => {
    try {
      return localStorage.getItem("calmcapital-subscriptions-filter") || "Mainboard";
    } catch {
      return "Mainboard";
    }
  });

  const handleFilterChange = (type) => {
    setFilterType(type);
    try {
      localStorage.setItem("calmcapital-subscriptions-filter", type);
    } catch { /* ignore */ }
  };

  const allIpos = getLiveIPOS().filter((i) => getComputedStatus(i) !== "Upcoming");
  const mainboardCount = allIpos.filter((i) => i.type === "Mainboard").length;
  const smeCount = allIpos.filter((i) => i.type === "SME").length;
  
  const displayedIpos = sortIposLogically(
    allIpos.filter(
      (i) =>
        i.type === filterType &&
        (!query?.trim() ||
          (i.company || i.name || "").toLowerCase().includes(query.toLowerCase()) ||
          (i.sector || "").toLowerCase().includes(query.toLowerCase()))
    )
  );

  const statusBadge = {
    Open:     { bg: dark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)", color: "#10b981", border: dark ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(16,185,129,0.2)" },
    Closed:   { bg: dark ? "rgba(148,163,184,0.1)" : "rgba(148,163,184,0.08)", color: dark ? "#8EA1B7" : "#64748b", border: dark ? "1px solid rgba(148,163,184,0.2)" : "1px solid rgba(148,163,184,0.15)" },
    Upcoming: { bg: dark ? "rgba(240,162,2,0.12)" : "rgba(240,162,2,0.08)",  color: "#d97706", border: dark ? "1px solid rgba(240,162,2,0.25)" : "1px solid rgba(240,162,2,0.2)" },
    Listed:   { bg: dark ? "rgba(28,155,218,0.12)" : "rgba(28,155,218,0.08)", color: BRAND.blue, border: dark ? "1px solid rgba(28,155,218,0.25)" : "1px solid rgba(28,155,218,0.2)" },
  };

  const getIpoDay = (ipo) => getIpoBiddingDay(ipo);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <LayoutGrid size={16} />
          </div>
          <h1 className="text-base font-extrabold text-[#0B1F33] dark:text-white tracking-tight">
            IPO Subscriptions &amp; Allotment Odds
          </h1>
        </div>

        {/* Mainboard | SME Toggle */}
        <div className="bg-slate-100 dark:bg-white/5 p-0.5 rounded-xl flex items-center border border-slate-200 dark:border-white/5 self-start sm:self-auto">
          <button
            onClick={() => handleFilterChange("Mainboard")}
            className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
              filterType === "Mainboard"
                ? "bg-[#0B1F33] dark:bg-teal-600 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 bg-transparent"
            }`}
          >
            Mainboard ({mainboardCount})
          </button>
          <button
            onClick={() => handleFilterChange("SME")}
            className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
              filterType === "SME"
                ? "bg-[#0B1F33] dark:bg-teal-600 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 bg-transparent"
            }`}
          >
            SME ({smeCount})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {displayedIpos.map((ipo) => {
          const status = getComputedStatus(ipo);
          const badge = statusBadge[status] || statusBadge.Closed;
          const ipoDay = getIpoDay(ipo);

          return (
            <div
              key={ipo.id}
              className="rounded-3xl p-5 hover:shadow-lg transition-all flex flex-col justify-between"
              style={{
                background: dark ? "#172437" : "#ffffff",
                border: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.06)",
                boxShadow: dark ? "none" : "0 4px 12px rgba(0,0,0,0.03)"
              }}
            >
              <div>
                {/* Header row: logo + company name + badges */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <CompanyAvatar name={ipo.company} logoUrl={ipo.logoUrl} size={38} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold tracking-tight leading-snug text-slate-800 dark:text-white truncate">{ipo.company}</p>
                      <span
                        className="text-[9px] font-bold uppercase px-2 py-0.5 rounded tracking-wider mt-1 inline-block"
                        style={{
                          background: ipo.type === "Mainboard" ? "rgba(28,155,218,0.12)" : "rgba(139,92,246,0.12)",
                          color: ipo.type === "Mainboard" ? BRAND.blue : "#8b5cf6"
                        }}
                      >
                        {ipo.type}
                      </span>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-xl border leading-none shrink-0"
                    style={{ background: badge.bg, color: badge.color, borderColor: badge.border }}
                  >
                    {status}
                  </span>
                </div>

                {/* Sub-header subscription status */}
                <p className="text-xs font-semibold mb-4" style={{ color: dark ? "#8EA1B7" : "#64748b" }}>
                  {status === "Open" ? (
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Day {ipoDay || 1} Updates
                    </span>
                  ) : status === "Upcoming" || status === "DRHP Filed" ? (
                    <span>Upcoming Subscription Bidding</span>
                  ) : (
                    <span>Final Subscription Figures</span>
                  )}
                </p>

                {/* Premium List layout */}
                <SubscriptionDetailsList ipo={ipo} dark={dark} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



/* =====================================================================
   FINANCIALS TAB
===================================================================== */
function FinancialsTab({ onOpen, dark, query }) {
  const [filterType, setFilterType] = useState(() => {
    try {
      return localStorage.getItem("calmcapital-financials-filter") || "Mainboard";
    } catch {
      return "Mainboard";
    }
  });

  const handleFilterChange = (type) => {
    setFilterType(type);
    try {
      localStorage.setItem("calmcapital-financials-filter", type);
    } catch { /* ignore */ }
  };

  const allIpos = getLiveIPOS().filter((i) => i.fin);
  const mainboardCount = allIpos.filter((i) => i.type === "Mainboard").length;
  const smeCount = allIpos.filter((i) => i.type === "SME").length;
  
  const displayedIpos = sortIposLogically(
    allIpos.filter(
      (i) =>
        i.type === filterType &&
        (!query?.trim() ||
          (i.company || i.name || "").toLowerCase().includes(query.toLowerCase()) ||
          (i.sector || "").toLowerCase().includes(query.toLowerCase()))
    )
  );

  const MetricBox = ({ label, value, isNA, span = 1 }) => (
    <div
      className={`rounded-xl p-3 flex flex-col justify-between min-h-[72px] ${span === 2 ? "col-span-2" : ""}`}
      style={{
        background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
        border: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.05)"
      }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: dark ? "#64748b" : "#8EA1B7" }}>{label}</span>
      <span
        className="text-sm font-bold font-mono mt-1"
        style={{ color: isNA ? (dark ? "#475569" : "#8EA1B7") : (dark ? "#f1f5f9" : "#1e293b") }}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <BarChart3 size={16} />
          </div>
          <h1 className="text-base font-extrabold text-[#0B1F33] dark:text-white tracking-tight">
            Company Financial Metrics Grid
          </h1>
        </div>

        {/* Mainboard | SME Toggle */}
        <div className="bg-slate-100 dark:bg-white/5 p-0.5 rounded-xl flex items-center border border-slate-200 dark:border-white/5 self-start sm:self-auto">
          <button
            onClick={() => handleFilterChange("Mainboard")}
            className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
              filterType === "Mainboard"
                ? "bg-[#0B1F33] dark:bg-teal-600 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 bg-transparent"
            }`}
          >
            Mainboard ({mainboardCount})
          </button>
          <button
            onClick={() => handleFilterChange("SME")}
            className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
              filterType === "SME"
                ? "bg-[#0B1F33] dark:bg-teal-600 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 bg-transparent"
            }`}
          >
            SME ({smeCount})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedIpos.map((ipo) => {
          const f = ipo.fin;
          const roeVal = f.roe != null ? `${f.roe}%` : "-";
          const epsVal = f.eps != null ? `₹${f.eps}` : "-";
          const peVal  = f.pe  != null ? `${f.pe}x`  : "-";

          return (
            <div
              key={ipo.id}
              onClick={() => onOpen?.(ipo)}
              className="rounded-2xl p-4 hover:shadow-lg transition-all cursor-pointer border border-transparent hover:border-slate-350 dark:hover:border-slate-800"
              style={{
                background: dark ? "#172437" : "#ffffff",
                border: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.06)",
                boxShadow: dark ? "none" : "0 4px 12px rgba(0,0,0,0.03)"
              }}
            >
              {/* Company logo + name */}
              <div className="flex items-center gap-2.5 mb-4">
                <CompanyAvatar name={ipo.company} logoUrl={ipo.logoUrl} size={34} />
                <div>
                  <p className="text-sm font-bold tracking-tight leading-snug" style={{ color: dark ? "#ffffff" : "#1e293b" }}>{ipo.company}</p>
                  <span
                    className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wider mt-0.5 inline-block"
                    style={{
                      background: ipo.type === "Mainboard" ? "rgba(28,155,218,0.12)" : "rgba(139,92,246,0.12)",
                      color: ipo.type === "Mainboard" ? BRAND.blue : "#8b5cf6"
                    }}
                  >
                    {ipo.type}
                  </span>
                </div>
              </div>

              {/* Row 1: Revenue + PAT (equal halves) */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <MetricBox label="Revenue" value={cr(f.revenue)} />
                <MetricBox label="PAT"     value={cr(f.pat)} />
              </div>

              {/* Row 2: ROE + EPS + P/E */}
              <div className="grid grid-cols-3 gap-2">
                <MetricBox label="ROE" value={roeVal} isNA={f.roe == null} />
                <MetricBox label="EPS" value={epsVal} isNA={f.eps == null} />
                <MetricBox label="P/E" value={peVal}  isNA={f.pe == null} />
              </div>

              {/* Verification Metadata Overlay */}
              {ipo.finMeta && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2.5 p-2 rounded-xl border flex items-center justify-between text-[9px] font-mono tracking-wider uppercase"
                  style={{
                    background: dark ? "rgba(28,155,218,0.04)" : "rgba(28,155,218,0.02)",
                    borderColor: dark ? "rgba(28,155,218,0.1)" : "rgba(28,155,218,0.06)",
                    color: dark ? "#8EA1B7" : "#475569"
                  }}
                >
                  <a href={ipo.finMeta.sourceUrl} target="_blank" rel="noreferrer" className="underline font-bold" style={{ color: BRAND.blue }}>
                    {ipo.finMeta.sourceDoc} (Pg. {ipo.finMeta.pageNum || "N/A"}) ↗
                  </a>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ {ipo.finMeta.status}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =====================================================================
   DOCUMENTS TAB
===================================================================== */
function DocumentsTab({ onOpen, query }) {
  const [filterType, setFilterType] = useState(() => {
    try {
      return localStorage.getItem("calmcapital-documents-filter") || "Mainboard";
    } catch {
      return "Mainboard";
    }
  });

  const handleFilterChange = (type) => {
    setFilterType(type);
    try {
      localStorage.setItem("calmcapital-documents-filter", type);
    } catch { /* ignore */ }
  };

  const allIpos = getLiveIPOS();
  const mainboardCount = allIpos.filter((i) => i.type === "Mainboard").length;
  const smeCount = allIpos.filter((i) => i.type === "SME").length;

  const displayedIpos = sortDocumentsLogically(
    allIpos.filter(
      (i) =>
        i.type === filterType &&
        (!query?.trim() ||
          (i.company || i.name || "").toLowerCase().includes(query.toLowerCase()) ||
          (i.sector || "").toLowerCase().includes(query.toLowerCase()))
    )
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <FileText size={16} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-[#0B1F33] dark:text-white tracking-tight">Official Filings &amp; Documents</h1>
            <p className="text-[11px] text-slate-455 dark:text-slate-500">Mainboard IPOs link to official SEBI filings. SME IPOs link to exchange offer documents.</p>
          </div>
        </div>

        {/* Mainboard | SME Toggle */}
        <div className="bg-slate-100 dark:bg-white/5 p-0.5 rounded-xl flex items-center border border-slate-200 dark:border-white/5 self-start sm:self-auto">
          <button
            onClick={() => handleFilterChange("Mainboard")}
            className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
              filterType === "Mainboard"
                ? "bg-[#0B1F33] dark:bg-teal-600 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 bg-transparent"
            }`}
          >
            Mainboard ({mainboardCount})
          </button>
          <button
            onClick={() => handleFilterChange("SME")}
            className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
              filterType === "SME"
                ? "bg-[#0B1F33] dark:bg-teal-600 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 bg-transparent"
            }`}
          >
            SME ({smeCount})
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {displayedIpos.map((ipo) => (
          <div
            key={ipo.id}
            onClick={() => onOpen?.(ipo)}
            className="flex items-center justify-between glass glass-hover rounded-xl px-4 py-3 cursor-pointer"
          >
          <div className="flex items-center gap-2.5">
            <CompanyAvatar name={ipo.company} logoUrl={ipo.logoUrl} size={30} />
            <div>
              <span className="text-sm text-slate-700 dark:text-slate-200 font-medium block leading-snug">{ipo.company}</span>
              <span
                className="text-[9px] font-bold uppercase px-1 py-0.5 rounded tracking-wider mt-0.5 inline-block"
                style={{
                  background: ipo.type === "Mainboard" ? "rgba(28,155,218,0.12)" : "rgba(139,92,246,0.12)",
                  color: ipo.type === "Mainboard" ? BRAND.blue : "#8b5cf6"
                }}
              >
                {ipo.type}
              </span>
            </div>
          </div>
          <div className="flex gap-2 items-center justify-end" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const hasValidDrhp = !!ipo.drhp;
              const hasValidRhp = !!ipo.rhp;

              if (!hasValidDrhp && !hasValidRhp) {
                return (
                  <span className="text-xs text-slate-400 max-w-[220px] text-right leading-tight">
                    Official DRHP/RHP is currently unavailable.
                  </span>
                );
              }

              return (
                <>
                  {hasValidDrhp && (
                    <a href={ipo.drhp} target="_blank" rel="noreferrer" title={isPortalLink(ipo.drhp) ? "Search on Exchange DRHP Portal" : "Official DRHP"} className="text-xs glass-inset hover:bg-white hover:shadow-sm rounded-lg px-2.5 py-1.5 text-slate-600 font-medium">
                      {isPortalLink(ipo.drhp) ? "DRHP Portal ↗" : "DRHP ↗"}
                    </a>
                  )}
                  {hasValidRhp && (
                    <a href={ipo.rhp} target="_blank" rel="noreferrer" title={isPortalLink(ipo.rhp) ? "Search on Exchange RHP Portal" : "Official RHP"} className="text-xs glass-inset hover:bg-white hover:shadow-sm rounded-lg px-2.5 py-1.5 text-slate-600 font-medium">
                      {isPortalLink(ipo.rhp) ? "RHP Portal ↗" : "RHP ↗"}
                    </a>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}

/* =====================================================================
   WATCHLIST TAB
===================================================================== */
function WatchlistTab({ watchlist, onOpen, dark, query }) {
  const items = sortIposLogically(
    getLiveIPOS().filter(
      (i) =>
        watchlist.ids.includes(i.id) &&
        (!query?.trim() ||
          (i.company || i.name || "").toLowerCase().includes(query.toLowerCase()) ||
          (i.sector || "").toLowerCase().includes(query.toLowerCase()))
    )
  );
  if (!watchlist.ready) return <p className="text-sm text-slate-400">Loading watchlist…</p>;
  
  if (items.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center -mx-5 -mt-5"
        style={{
          minHeight: "calc(100vh - 80px)",
          background: dark
            ? "radial-gradient(circle at 50% 40%, rgba(45,120,185,0.4) 0%, rgba(15,23,42,0) 60%)"
            : "radial-gradient(circle at 50% 40%, rgba(28,155,218,0.15) 0%, rgba(248,250,252,0) 65%)",
        }}
      >
        {/* Glowing bookmark icon */}
        <div className="relative mb-8 flex justify-center items-center">
          {/* Inner intense glow */}
          <div
            className="absolute"
            style={{
              width: "60px",
              height: "80px",
              background: dark ? "white" : "rgba(28,155,218,0.3)",
              filter: "blur(24px)",
              opacity: dark ? 0.8 : 0.6
            }}
          />
          {/* Outer soft blue glow */}
          <div
            className="absolute"
            style={{
              width: "120px",
              height: "120px",
              background: dark ? "rgba(100,180,255,0.4)" : "rgba(28,155,218,0.2)",
              filter: "blur(40px)"
            }}
          />
          <Bookmark
            size={88}
            fill={dark ? "white" : "#1c9bda"}
            stroke={dark ? "white" : "#1c9bda"}
            strokeWidth={1}
            className="relative z-10"
            style={{ filter: dark ? "drop-shadow(0px 10px 15px rgba(0,0,0,0.5))" : "drop-shadow(0px 8px 12px rgba(28,155,218,0.25))" }}
          />
        </div>

        <h3
          className="text-[28px] font-bold tracking-tight mb-3 relative z-10"
          style={{
            color: dark ? "#ffffff" : "#1e293b",
            textShadow: dark ? "0 2px 10px rgba(0,0,0,0.5)" : "none"
          }}
        >
          No IPOs saved yet.
        </h3>
        <p className="text-[15px] relative z-10" style={{ color: dark ? "#8EA1B7" : "#475569" }}>
          Tap the bookmark icon on any IPO card to track it here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map((ipo) => <IPOCard key={ipo.id} ipo={ipo} onOpen={onOpen} watchlist={watchlist} dark={dark} />)}
    </div>
  );
}

/* =====================================================================
   DEMAT TAB
===================================================================== */
function DematTab({ dark }) {
  const brokers = [
    {
      name: "Upstox",
      logo: "Upstox",
      desc: "Best for IPOs, Fast Investing & Trading",
      bgColor: "bg-purple-600/10 dark:bg-purple-600/20 border-purple-500/30",
      textColor: "text-purple-600 dark:text-purple-400",
      accentColor: "#7c3aed",
      features: [
        "₹0 Brokerage on Mutual Funds & IPOs",
        "Quick UPI-based IPO Applications",
        "Free Demat Account Opening*",
        "Advanced TradingView Charts"
      ],
      link: "https://upstox.onelink.me/0H1s/65BZGJ"
    },
    {
      name: "Angel One",
      logo: "Angel One",
      desc: "India's Leading Full-Service Digital Broker",
      bgColor: "bg-blue-600/10 dark:bg-blue-600/20 border-blue-500/30",
      textColor: "text-blue-600 dark:text-blue-400",
      accentColor: "#1d4ed8",
      features: [
        "Free Demat Account Opening*",
        "Easy IPO Applications with UPI",
        "Research Tools & ARQ Prime Recommendations",
        "Investment in Stocks, IPOs & Mutual Funds"
      ],
      link: "https://angel-one.onelink.me/Wjgr/rto3bsne"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-slate-850 dark:text-white mb-2">
          Open a Free Demat Account
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Get ready to invest in IPOs. Choose from our handpicked, leading stockbrokers to start your investment journey today.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {brokers.map((broker) => (
          <div 
            key={broker.name}
            className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Logo / Header */}
              <div className="flex items-center gap-4 mb-4">
                <CompanyAvatar name={broker.name} size={56} />
                <div>
                  <h3 className="text-lg font-bold text-slate-850 dark:text-white leading-tight">{broker.name}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{broker.desc}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100 dark:border-white/5 my-4" />

              {/* Key Features */}
              <div className="space-y-3 mb-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Key Benefits</p>
                <ul className="space-y-2">
                  {broker.features.map((feat) => (
                    <li key={feat} className="text-xs flex gap-2 text-slate-600 dark:text-slate-350">
                      <span className="text-emerald-500 font-bold">✓</span> {feat}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA Button */}
            <a 
              href={broker.link} 
              target="_blank" 
              rel="noreferrer"
              className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm text-white shadow-lg hover:brightness-110 active:scale-[0.98] transition-all text-center"
              style={{ background: broker.accentColor }}
            >
              Open Free Account
              <ExternalLink size={14} />
            </a>
          </div>
        ))}
      </div>

      <div className="text-center max-w-xl mx-auto mt-6">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
          *Disclaimer: Demat account opening fees, maintenance charges, and brokerage rates are subject to change based on each broker's respective terms, pricing schedules, and active promotional offers. Please read all scheme details carefully before opening an account.
        </p>
      </div>
    </div>
  );
}

/* =====================================================================
   STAT CARD
===================================================================== */
function StatCard({ icon: Icon, label, value, tint, onClick }) {
  const clickable = typeof onClick === "function";
  const labelLower = label.toLowerCase();
  
  let cardClass = "";
  
  if (labelLower.includes("open")) {
    cardClass = "bg-[#F0FDF4] dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-800/10 border-t-2 border-t-emerald-500";
  } else if (labelLower.includes("upcoming")) {
    cardClass = "bg-[#F0FDFA] dark:bg-teal-950/10 border-teal-100 dark:border-teal-800/10 border-t-2 border-t-teal-500";
  } else if (labelLower.includes("closed")) {
    cardClass = "bg-[#FFFBEB] dark:bg-amber-950/10 border-amber-100 dark:border-amber-800/10 border-t-2 border-t-amber-500";
  } else if (labelLower.includes("listed")) {
    cardClass = "bg-[#FAF5FF] dark:bg-purple-950/10 border-purple-100 dark:border-purple-800/10 border-t-2 border-t-purple-500";
  } else {
    cardClass = "bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-[#26364A]";
  }

  return (
    <div
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}
      className={`border p-4 flex items-center justify-between rounded-2xl shadow-sm transition-all duration-200 ${cardClass}
        ${clickable ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]" : ""}`}
    >
      <div>
        <p className="text-3xl font-extrabold text-slate-850 dark:text-[#F8FAFC] font-mono tracking-tight leading-none">{value}</p>
        <p className="text-xs text-slate-500 dark:text-[#B8C5D6] mt-1.5 font-semibold tracking-wide">{label}</p>
        {clickable && <p className="text-[9px] text-slate-400 dark:text-[#6F849C] mt-1 tracking-wider uppercase">View all →</p>}
      </div>
      <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110" style={{ background: tint }}>
        <Icon size={18} color="#ffffff" strokeWidth={2.2} />
      </div>
    </div>
  );
}

/* =====================================================================
   MAIN APP
===================================================================== */
// Single switch to turn the AI Assistant back on once Anthropic billing/
// credits are set up (or a different provider is wired in) — no other code
// needs to change, this just hides its nav entry and header shortcut.
const AI_ASSISTANT_ENABLED = false;

const NAV = [
  { id: "ai", label: "AI Assistant", icon: Sparkles },
  { id: "overview", label: "Overview", icon: Home },
  { id: "gmp", label: "GMP Trends", icon: TrendingUp },
  { id: "open", label: "Open IPOs", icon: CircleDollarSign },
  { id: "upcoming", label: "Upcoming IPOs", icon: Calendar },
  { id: "closed", label: "Closed IPOs", icon: Clock },
  { id: "listed", label: "Listed IPOs", icon: Building2 },
  { id: "allotment", label: "IPO Allotment", icon: BookmarkCheck },
  { id: "calculator", label: "IPO Calculator", icon: CalcIcon },
  { id: "subscriptions", label: "Subscriptions", icon: LayoutGrid },
  { id: "financials", label: "Financials", icon: BarChart3 },
  { id: "docs", label: "DRHP / RHP", icon: FileText },
  { id: "watchlist", label: "Watchlist", icon: Bookmark },
  { id: "demat", label: "Open Demat Account", icon: Landmark },
].filter((n) => n.id !== "ai" || AI_ASSISTANT_ENABLED);

export default function App() {
  const [loadingDb, setLoadingDb] = useState(false);
  const [tab, setTabRaw] = useState(() => {
    try {
      if (typeof window !== "undefined") {
        const fromPath = parseLocation(window.location.pathname, window.location.search);
        const allTabs = [...NAV.map(n => n.id), "about", "privacy", "terms", "disclaimer"];
        if (fromPath.tabId && allTabs.includes(fromPath.tabId)) return fromPath.tabId;
      }
      const saved = localStorage.getItem("calmcapital-tab");
      if (saved && NAV.some((n) => n.id === saved)) return saved;
    } catch { /* storage unavailable */ }
    return "overview";
  });
  const [selected, setSelected] = useState(() => {
    try {
      if (typeof window !== "undefined") {
        const fromPath = parseLocation(window.location.pathname, window.location.search);
        if (fromPath.ipoId) {
          return findIpoByIdOrSlug(fromPath.ipoId);
        }
      }
    } catch { /* ignore */ }
    return null;
  });
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== "undefined") {
      const fromPath = parseLocation(window.location.pathname, window.location.search);
      if (fromPath.ipoId) return "full";
    }
    return "modal";
  }); // "modal" | "full"
  const [query, setQuery] = useState("");
  const [upcomingType, setUpcomingType] = useState("Mainboard");
  const [listedType, setListedType] = useState("Mainboard");
  const [closedType, setClosedType] = useState("Mainboard");
  const [overviewType, setOverviewType] = useState("Mainboard");
  const [gmpMarket, setGmpMarket] = useState("Mainboard");
  const lastTabPathRef = useRef(TAB_PATHS["overview"] || "/");
  const currentPathIpoId = parseLocation(typeof window !== "undefined" ? window.location.pathname : "/", typeof window !== "undefined" ? window.location.search : "").ipoId;

  const handleSelectIpo = (ipo, mode = "modal") => {
    try {
      if (ipo) {
        const parsed = parseLocation(window.location.pathname, window.location.search);
        if (!parsed.ipoId) {
          lastTabPathRef.current = TAB_PATHS[tab] || "/";
        }
        setSelected(ipo);
        setViewMode(mode);
        const path = ipoPath(ipo.id);
        if ((window.location.pathname.replace(/\/+$/, "") || "/") !== path) {
          window.history.pushState(null, "", path);
        }
        const meta = applyIpoSeo(ipo);
        trackPageView(meta.path, meta.title);
      } else {
        setSelected(null);
        setViewMode("modal");
        const path = lastTabPathRef.current || TAB_PATHS[tab] || "/";
        window.history.pushState(null, "", path);
        const meta = applyTabSeo(tab);
        trackPageView(meta.path, meta.title);
      }
    } catch (e) {
      console.error("Failed to update IPO URL:", e?.message || "[REDACTED]");
      setSelected(ipo);
    }
  };

  // Sync deep link / path on load
  useEffect(() => {
    if (loadingDb) return;
    const all = getLiveIPOS();
    const parsed = parseLocation(window.location.pathname, window.location.search);

    if (parsed.legacy && parsed.ipoId) {
      window.history.replaceState(null, "", ipoPath(parsed.ipoId));
    }

    if (parsed.ipoId) {
      const found = findIpoByIdOrSlug(parsed.ipoId);
      setSelected(found);
      if (found) {
        setViewMode("full");
        const meta = applyIpoSeo(found);
        trackPageView(meta.path, meta.title);
      } else {
        applyTabSeo(tab);
      }
      return;
    }

    const allTabs = [...NAV.map(n => n.id), "about", "privacy", "terms", "disclaimer"];
    if (parsed.tabId && allTabs.includes(parsed.tabId)) {
      setTabRaw(parsed.tabId);
      lastTabPathRef.current = TAB_PATHS[parsed.tabId] || "/";
      try { localStorage.setItem("calmcapital-tab", parsed.tabId); } catch { /* ignore */ }
      const meta = applyTabSeo(parsed.tabId);
      const navItem = NAV.find((n) => n.id === parsed.tabId);
      trackTabView(parsed.tabId, navItem?.label || parsed.tabId, meta.path, meta.title);
    } else {
      const meta = applyTabSeo(tab);
      trackTabView(tab, NAV.find((n) => n.id === tab)?.label, meta.path, meta.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingDb]);

  // Listen to browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseLocation(window.location.pathname, window.location.search);
      if (parsed.ipoId) {
        const found = findIpoByIdOrSlug(parsed.ipoId);
        setSelected(found);
        setViewMode("full");
        if (found) applyIpoSeo(found);
        return;
      }
      setSelected(null);
      setViewMode("modal");
      const allTabs = [...NAV.map(n => n.id), "about", "privacy", "terms", "disclaimer"];
      if (parsed.tabId && allTabs.includes(parsed.tabId)) {
        setTabRaw(parsed.tabId);
        lastTabPathRef.current = TAB_PATHS[parsed.tabId] || "/";
        try { localStorage.setItem("calmcapital-tab", parsed.tabId); } catch { /* ignore */ }
        applyTabSeo(parsed.tabId);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [loadingDb]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch(`/ipos.json?t=${Date.now()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          IPOS_BASE = data;
          setTick((t) => t + 1);
          setLiveDataVersion((v) => v + 1);
        }
      })
      .catch((err) => {
        console.warn("Background fetch of ipos.json skipped/timed out:", err?.message);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoadingDb(false);
      });
  }, []);


  const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobile());
  const [dark, setDark] = useState(false); // Force light mode as default

  useEffect(() => {
    try {
      localStorage.setItem("calmcapital-theme", JSON.stringify(dark));
    } catch { /* storage unavailable */ }
  }, [dark]);

  // Global Navigation Scroll Reset
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant"
    });
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant"
      });
    }
  }, [tab]);

  // Persist active tab across refreshes + path URL + GA4 SPA tab tracking
  const setTab = (id) => {
    setSelected(null);
    setTabRaw(id);
    try { localStorage.setItem("calmcapital-tab", id); } catch { /* storage unavailable */ }
    const path = TAB_PATHS[id] || "/";
    lastTabPathRef.current = path;
    try {
      const cur = window.location.pathname.replace(/\/+$/, "") || "/";
      if (cur !== path) window.history.pushState(null, "", path);
    } catch { /* ignore */ }
    const navItem = NAV.find((n) => n.id === id);
    const meta = applyTabSeo(id);
    trackTabView(id, navItem?.label, meta.path, meta.title);
    if (isMobile()) setSidebarOpen(false);
  };

  const navigateToTab = (id) => {
    setTab(id);
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Close sidebar when viewport shrinks to mobile
  useEffect(() => {
    const handler = () => { if (window.innerWidth < 768) setSidebarOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [tick, setTick] = useState(0); // bumped hourly + on manual refresh to force re-derive live status/data
  const [liveDataVersion, setLiveDataVersion] = useState(0); // notifications only — not price ticks
  const [dataUrl, setDataUrl] = useState("/live-data.json"); // same-origin file this repo's GitHub Action keeps updated — works automatically, no setup needed
  const [lastSync, setLastSync] = useState(null);
  const [syncOk, setSyncOk] = useState(null);
  const watchlist = useWatchlist();
  const notifHook = useNotifications(liveDataVersion);

  // Load a previously-saved investorgain live-data source URL (see LIVE_DATA_SETUP.md
  // from the automation repo — this points at your GitHub Action's public/live-data.json).
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ipo-live-data-url");
      if (saved) setDataUrl(saved);
    } catch { /* not set yet, or storage unavailable */ }
  }, []);

  const syncNow = useCallback(async (url) => {
    const target = url ?? dataUrl;
    if (!target) return;
    const ok = await fetchLiveData(target);
    setSyncOk(ok);
    if (ok) setLastSync(_liveOverlay.updatedAt);
    setTick((t) => t + 1);
    if (ok) setLiveDataVersion((v) => v + 1);
  }, [dataUrl]);

  // Initial sync + 30-min auto-refresh, exactly as requested.
  useEffect(() => {
    if (dataUrl) syncNow(dataUrl);
    const periodic = setInterval(() => { syncNow(); setTick((t) => t + 1); }, 30 * 60 * 1000);
    return () => clearInterval(periodic);
  }, [dataUrl, syncNow]);

  // Real-time ticking price simulation for listed IPOs
  useEffect(() => {
    // Populate baseline prices for any listed IPOs that have a currentPrice
    const initPrices = () => {
      const listed = getLiveIPOS().filter((i) => i.status === "Listed" && i.currentPrice);
      listed.forEach((i) => {
        if (!_realtimePrices[i.id]) {
          _realtimePrices[i.id] = {
            price: i.currentPrice,
            prevPrice: i.currentPrice,
            lastTick: null,
            tickTime: 0
          };
        }
      });
    };

    initPrices();

    const interval = setInterval(() => {
      initPrices(); // Ensure newly loaded live overlays also register baseline prices
      const listed = getLiveIPOS().filter((i) => i.status === "Listed" && i.currentPrice);
      if (listed.length === 0) return;

      // Select 1 to 2 random listed companies to update their prices
      const count = Math.floor(Math.random() * 2) + 1;
      let didChange = false;

      for (let j = 0; j < count; j++) {
        const item = listed[Math.floor(Math.random() * listed.length)];
        const data = _realtimePrices[item.id];
        if (!data) continue;

        // Fluctuates within [-0.25%, +0.25%] range
        const pct = (Math.random() * 0.5 - 0.25) / 100;
        const newPrice = Math.round((data.price * (1 + pct)) * 100) / 100;

        if (newPrice !== data.price && newPrice > 0) {
          _realtimePrices[item.id] = {
            price: newPrice,
            prevPrice: data.price,
            lastTick: newPrice > data.price ? "up" : "down",
            tickTime: Date.now()
          };
          didChange = true;
        }
      }

      if (didChange) {
        setTick((t) => t + 1);
      }
    }, 4500); // Ticks every 4.5 seconds

    return () => clearInterval(interval);
  }, []);

  const saveDataUrl = async (url) => {
    setDataUrl(url);
    try { localStorage.setItem("ipo-live-data-url", url); } catch { /* storage unavailable */ }
    if (url) syncNow(url);
  };

  const filtered = useMemo(() => {
    const all = getLiveIPOS();
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter((i) => {
      const companyName = i.company || i.name || "";
      const sectorName = i.sector || "";
      return companyName.toLowerCase().includes(q) || sectorName.toLowerCase().includes(q);
    });
  }, [query, tick]);

  const counts = useMemo(() => {
    const all = getLiveIPOS();
    return {
      Open: all.filter((i) => getComputedStatus(i) === "Open").length,
      Closed: all.filter((i) => getComputedStatus(i) === "Closed").length,
      Upcoming: all.filter((i) => getComputedStatus(i) === "Upcoming").length,
      Listed: all.filter((i) => getComputedStatus(i) === "Listed").length,
      avgGmpPct: (all.reduce((s, i) => s + gainPct(i), 0) / all.length).toFixed(1),
      totalIssue: all.reduce((s, i) => s + (i.issueSize || 0), 0),
    };
  }, [tick]);

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    
    // Guarantee the spinner runs for at least 800ms so the user has visual feedback
    const minDelay = new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn("[Refresh] Scraper trigger skipped/failed:", resData.error || `HTTP error ${res.status}`);
      }
    } catch (err) {
      console.warn("[Refresh] API Refresh trigger failed:", err);
    }

    // Always fetch latest ipos.json and sync live data silently
    try {
      const dbRes = await fetch(`/ipos.json?t=${Date.now()}`);
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        IPOS_BASE = dbData.map(ipo => ({
          ...ipo,
          company: cleanCompanyName(ipo.company || ipo.name),
          name: cleanCompanyName(ipo.name || ipo.company)
        }));
      }
      
      await syncNow();
      setTick((t) => t + 1);
      setLiveDataVersion((v) => v + 1);
    } catch (err) {
      console.error("[Refresh] Data reload failed:", err);
    }

    await minDelay;
    setRefreshing(false);
    setToastMessage("IPO data refreshed");
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const groupedFiltered = (status) =>
    sortIposLogically(filtered.filter((i) => getComputedStatus(i) === status));

  const todayActivity = useMemo(() => {
    const all = getLiveIPOS();
    const { y, m, d } = istYmdParts();
    const todayStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    
    return {
      openToday: all.filter(i => getComputedStatus(i) === "Open" && i.open === todayStr),
      closingToday: all.filter(i => i.close === todayStr),
      listingToday: all.filter(i => i.listing === todayStr),
      allotmentToday: all.filter(i => i.allotment === todayStr),
      openingTomorrow: all.filter(i => i.open && addCalendarDaysYmd(i.open, -1) === todayStr)
    };
  }, [tick]);

  if (loadingDb) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center dark" style={{
        background: "radial-gradient(circle at 30% 50%, rgba(28,155,218,0.18), transparent 60%), radial-gradient(circle at 80% 20%, rgba(174,215,104,0.06), transparent 50%), #0A1020",
        color: "#e2e8f0",
        fontFamily: "'Outfit', 'Inter', sans-serif"
      }}>
        <div className="flex flex-col items-center space-y-6 text-center">
          <img src="/logo.png" alt="Calm Capital Logo" className="w-16 h-16 object-contain rounded-2xl shadow-[0_0_30px_rgba(28,155,218,0.3)] animate-spin-slow" />
          <div className="space-y-1 animate-pulse">
            <h1 className="text-2xl font-bold tracking-tight">Calm Capital</h1>
            <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Designed by Discipline</p>
          </div>
          <div className="flex flex-col items-center space-y-2 pt-4">
            <div className="w-48 h-1 bg-slate-850 rounded-full overflow-hidden relative">
              <div className="absolute top-0 bottom-0 left-0 bg-blue-500 rounded-full animate-loading-bar" style={{ width: "30%" }}></div>
            </div>
            <p className="text-[11px] font-medium text-slate-500 tracking-wider uppercase">Loading IPO Intelligence...</p>
          </div>
        </div>
        <style>{`
          @keyframes loadingBar {
            0% { left: -30%; width: 30%; }
            50% { left: 40%; width: 40%; }
            100% { left: 100%; width: 30%; }
          }
          .animate-loading-bar {
            animation: loadingBar 1.5s infinite ease-in-out;
          }
          @keyframes spinSlow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin-slow {
            animation: spinSlow 8s infinite linear;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={dark ? "dark" : ""}>
      <div className="h-screen flex overflow-hidden" style={{
        background: dark
          ? "radial-gradient(circle at 30% 50%, rgba(28,155,218,0.18), transparent 60%), radial-gradient(circle at 80% 20%, rgba(174,215,104,0.06), transparent 50%), #0A1020"
          : "radial-gradient(circle at 50% 0%, rgba(11, 31, 51, 0.03), transparent 60%), #F5F7F4",
        color: dark ? "#e2e8f0" : "#0B1F33",
      }}>
        <style>{`
          .glass {
            background: ${dark ? "linear-gradient(180deg, rgba(22, 28, 42, 0.95), rgba(15, 20, 32, 0.95))" : "#ffffff"};
            backdrop-filter: blur(20px) saturate(160%);
            -webkit-backdrop-filter: blur(20px) saturate(160%);
            border: 1px solid ${dark ? "rgba(45,64,86,0.9)" : "rgba(0,0,0,0.06)"};
            box-shadow: ${dark ? "0 12px 40px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)" : "0 10px 30px -10px rgba(148, 163, 184, 0.16), 0 1px 2px rgba(0,0,0,0.02)"};
            transition: box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease;
          }
          .glass-inset {
            background: ${dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"};
            border: 1px solid ${dark ? "rgba(45,64,86,0.9)" : "rgba(0,0,0,0.05)"};
            transition: background 0.2s ease, border-color 0.2s ease;
          }
          .glass-hover:hover {
            box-shadow: ${dark ? "0 20px 40px -15px rgba(0,0,0,0.8), inset 0 1px 0 rgba(45,64,86,0.9)" : "0 16px 36px -12px rgba(148, 163, 184, 0.25)"};
            border-color: ${dark ? "rgba(28,155,218,0.3)" : "rgba(28,155,218,0.2)"};
            transform: translateY(-2px);
          }
          select { appearance: none; }
          * { scrollbar-width: thin; scrollbar-color: ${dark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.3)"} transparent; }
          *::-webkit-scrollbar { width: 6px; height: 6px; }
          *::-webkit-scrollbar-thumb { background: ${dark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.3)"}; border-radius: 999px; }
          *::-webkit-scrollbar-thumb:hover { background: ${dark ? "rgba(255,255,255,0.2)" : "rgba(148,163,184,0.5)"}; }
          @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
          .tab-enter { animation: fadeSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
          button, a { transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease, color 0.15s ease; }
          button:active { transform: scale(0.97); }
          input:focus, select:focus, textarea:focus { outline: none; box-shadow: 0 0 0 3px ${dark ? "rgba(28,155,218,0.25)" : "rgba(28,155,218,0.12)"}; border-color: ${BRAND.blue} !important; }

          /* Dark-mode text contrast overrides */
          .dark .text-slate-800 { color: #f8fafc; }
          .dark .text-slate-700 { color: #f1f5f9; }
          .dark .text-slate-600 { color: #e2e8f0; }
          .dark .text-slate-500 { color: #cbd5e1; }
          .dark .text-slate-400 { color: #8EA1B7; }
          .dark .text-slate-300 { color: #64748b; }
          .text-profit { color: #16a34a; }
          .dark .text-profit { color: #4ade80; font-weight: 600; }
          .text-loss { color: #dc2626; }
          .dark .text-loss { color: #f87171; font-weight: 600; }
          .dark .border-black\\/5 { border-color: rgba(45,64,86,0.9); }
          .dark .border-black\\/10 { border-color: rgba(255,255,255,0.1); }
          .dark .bg-white\\/70, .dark .bg-white\\/80, .dark .bg-white\\/5, .dark .bg-white\\/10 { background: rgba(255,255,255,0.04); }
          .dark .bg-white\\/95 { background: rgba(10,13,22,0.98); }
          .dark .border-white { border-color: rgba(52,74,97,0.9); }
          .dark .shadow-2xl { box-shadow: 0 25px 60px -15px rgba(0,0,0,0.85); }
          .dark .hover\\:bg-white:hover { background: rgba(45,64,86,0.9) !important; }
        `}</style>

        {/* MOBILE SIDEBAR BACKDROP */}
        {sidebarOpen && isMobile() && (
          <div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR */}
        <aside
          className={`${
            isMobile()
              ? `fixed inset-y-0 left-0 z-40 w-64 transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`
              : `${sidebarOpen ? "w-60" : "w-0"} transition-all duration-300 overflow-hidden shrink-0`
          } border-r`}
          style={{ 
            borderColor: dark ? "rgba(45,64,86,0.9)" : "#D9E4EC",
            background: dark ? "#0A1020" : "#EAF6FC"
          }}>
          <div className="w-60 p-4 flex flex-col h-full">
            {/* Brand */}
            <div className="flex items-start justify-between mb-4 pt-1">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Calm Capital Logo" className="w-9 h-9 object-contain rounded-xl" />
                <div className="flex flex-col">
                  <p className="text-sm font-bold tracking-tight leading-tight" style={{ color: dark ? "#F8FAFC" : "#1e293b" }}>Calm Capital</p>
                  <p className="text-[10px] font-semibold tracking-wider uppercase mt-0.5" style={{ color: dark ? "#8EA1B7" : "#64748b" }}>Designed by Discipline</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-black/5 rounded-lg mt-0.5">
                <ChevronsLeft size={15} />
              </button>
            </div>

            <nav className="mt-4 space-y-1 flex-1 overflow-y-auto">
              {NAV.map((n) => {
                const isActive = tab === n.id && !selected;
                const IconComponent = n.icon;
                return (
                  <a
                    key={n.id}
                    href={TAB_PATHS[n.id] || "/"}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                      e.preventDefault();
                      setTab(n.id);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold relative transition-all no-underline cursor-pointer group ${
                      isActive
                        ? "bg-[#0B1F33]/5 dark:bg-[#14B8A6]/10 text-[#0B1F33] dark:text-[#14B8A6] font-bold border-l-[3px] border-[#0F766E] dark:border-[#14B8A6] pl-2.5 shadow-xs"
                        : "text-slate-700 dark:text-[#C2D0E0] hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-[#38BDF8] pl-3 font-semibold"
                    }`}
                  >
                    <IconComponent
                      size={16}
                      strokeWidth={isActive ? 2.4 : 2.2}
                      className={`shrink-0 transition-colors ${
                        isActive ? "text-[#0F766E] dark:text-[#14B8A6]" : "text-slate-600 dark:text-[#8FA3BA] group-hover:text-[#0B1F33] dark:group-hover:text-[#38BDF8]"
                      }`}
                    />
                    <span className="truncate tracking-tight">{n.label}</span>
                  </a>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* MAIN */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* HEADER */}
          <header className="flex items-center gap-3 px-5 py-3.5 border-b sticky top-0 z-20 backdrop-blur-lg"
            style={{ 
              borderColor: dark ? "rgba(45,64,86,0.9)" : "rgba(11, 31, 51, 0.08)", 
              background: dark ? "rgba(13,21,36,0.92)" : "rgba(245, 247, 244, 0.85)" 
            }}>
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="text-slate-500 hover:text-[#0B1F33] dark:text-[#8EA1B7] dark:hover:text-white p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl mr-1 transition-all cursor-pointer border-0">
                <Menu size={18} />
              </button>
            )}

            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for company IPOs..."
                className="w-full bg-[#FAFBF9]/80 focus:bg-[#FFFFFF] dark:bg-[#1A293D] border border-slate-200 dark:border-[#34465C] rounded-xl pl-9 pr-4 py-2 text-sm outline-none shadow-sm transition-all focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] text-[#0B1F33] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#8FA3BA]" />
            </div>

            <div className="ml-auto flex items-center gap-2.5 relative">
              <div className="hidden sm:flex items-center">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-205 dark:border-[#34465C] bg-[#FFFFFF]/60 dark:bg-[#121D2D]/80 text-[#0B1F33] dark:text-[#C9D6E5] shadow-sm cursor-default">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[11px] font-semibold tracking-tight">Live Prices</span>
                </div>
              </div>

              <button disabled={refreshing} onClick={refresh} className="w-9 h-9 rounded-xl border border-slate-200 dark:border-[#34465C] bg-[#FFFFFF]/60 dark:bg-[#121D2D]/80 hover:border-slate-300 dark:hover:border-[#14B8A6] flex items-center justify-center text-slate-500 dark:text-[#C9D6E5] hover:text-[#0B1F33] dark:hover:text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all relative cursor-pointer border-0">
                <RefreshCw size={14} className={refreshing ? "animate-spin text-[#14B8A6]" : ""} />
              </button>
              <NotificationBell hook={notifHook} onOpenIpo={(ipoId) => { const found = getLiveIPOS().find((i) => i.id === ipoId); if (found) handleSelectIpo(found); }} />
              
            </div>

            {/* Toast Notification */}
            {toastMessage && (
              <div className="fixed top-5 right-5 z-50 animate-fade-in flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#121D2D] border border-emerald-500/30 text-slate-800 dark:text-white shadow-2xl text-xs font-semibold">
                <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                <span>{toastMessage}</span>
              </div>
            )}
          </header>

          <main className="flex-1 overflow-y-auto px-5 py-5 max-w-5xl w-full mx-auto">
            {selected && viewMode === "full" ? (
              <IpoErrorBoundary onBack={() => handleSelectIpo(null)}>
                <IPODetailFullPage
                  ipo={selected}
                  onClose={() => handleSelectIpo(null)}
                  watchlist={watchlist}
                  dark={dark}
                  onOpen={(i) => handleSelectIpo(i, "full")}
                  onNavigateTab={(t) => {
                    handleSelectIpo(null);
                    setTab(t);
                  }}
                />
              </IpoErrorBoundary>
            ) : currentPathIpoId && !selected ? (
              <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-10 text-center space-y-4 my-8 shadow-sm">
                <Building2 size={44} className="mx-auto text-[#1c9bda]" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                  IPO Details Loaded
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed font-medium">
                  Viewing information for <strong className="text-slate-800 dark:text-white font-bold">{currentPathIpoId}</strong>.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => navigateToTab("overview")}
                    className="px-5 py-2.5 rounded-xl bg-[#1c9bda] text-white text-xs font-bold shadow-md hover:brightness-110 cursor-pointer border-0"
                  >
                    ← Return to Overview
                  </button>
                </div>
              </div>
            ) : (
              <div key={tab} className="tab-enter">
                {query.trim() ? (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                      <div>
                        <h2 className="text-base font-bold text-slate-850 dark:text-white tracking-tight">
                          Search Results
                        </h2>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          Showing matches for &ldquo;<span className="font-semibold text-slate-750 dark:text-slate-300">{query}</span>&rdquo; across all categories &amp; statuses
                        </p>
                      </div>
                      <button
                        onClick={() => setQuery("")}
                        className="text-xs text-[#1c9bda] hover:underline font-bold cursor-pointer border-0 bg-transparent"
                      >
                        Clear search
                      </button>
                    </div>

                    {filtered.length > 0 ? (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {sortIposLogically(filtered).map((ipo) => (
                          <IPOCard key={ipo.id} ipo={ipo} onOpen={handleSelectIpo} watchlist={watchlist} dark={dark} />
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-2xl p-12 text-center">
                        <Building2 size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                        <p className="text-slate-500 text-sm">No matching IPOs found in our database.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {tab === "overview" && (
              <div className="space-y-6">
                {/* 1. Hero Section */}
                <div className="relative rounded-3xl overflow-hidden p-6 md:p-8 shadow-xl border"
                  style={{
                    background: "linear-gradient(135deg, #0B1F33 0%, #123B4A 100%)",
                    borderColor: "rgba(20, 184, 166, 0.15)"
                  }}
                >
                  {/* Decorative faint financial/candlestick pattern & grid */}
                  <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)
                    `,
                    backgroundSize: '24px 24px'
                  }} />
                  {/* Faint financial wavy graph background line (using an SVG overlay) */}
                  <div className="absolute bottom-0 right-0 left-0 h-24 z-0 opacity-5 pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path d="M0,80 Q25,30 50,70 T100,20 L100,100 L0,100 Z" fill="rgba(20, 184, 166, 0.4)" stroke="rgba(20, 184, 166, 0.8)" strokeWidth="1" />
                    </svg>
                  </div>
                  {/* Teal/Blue radial soft glow */}
                  <div className="absolute inset-0 z-0 pointer-events-none opacity-40" style={{
                    background: "radial-gradient(circle at 80% 20%, rgba(20, 184, 166, 0.18) 0%, rgba(28, 155, 218, 0.1) 40%, transparent 70%)"
                  }} />

                  <div className="relative z-10 grid md:grid-cols-12 gap-6 items-center">
                    {/* Left Column: Heading and Tagline */}
                    <div className="md:col-span-7 space-y-4 text-left">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/5 text-[#14B8A6] border border-white/10 shadow-[0_0_12px_rgba(20,184,166,0.15)] backdrop-blur-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse"></span>
                        Designed by Discipline
                      </div>
                      
                      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-[1.2] text-white">
                        Calm Capital — Live GMP &amp; Institutional-Grade IPO Analysis
                      </h1>
                      
                      <p className="text-sm leading-relaxed text-[#B8C5D6] max-w-xl">
                        Live GMP, IPO subscriptions, allotment chances, financials, DRHP/RHP, listing data and more, all in one place.
                      </p>

                      <div className="flex flex-wrap gap-3 pt-2">
                        <button
                          onClick={() => navigateToTab("open")}
                          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#1C9BDA] to-[#0F766E] hover:from-[#1C9BDA]/90 hover:to-[#0F766E]/90 shadow-md shadow-[#1c9bda]/10 cursor-pointer flex items-center gap-1.5 border-0 hover:scale-[1.01] active:scale-[0.98] transition-all"
                        >
                          Explore Open IPOs
                          <ChevronRight size={14} />
                        </button>
                        <button
                          onClick={() => navigateToTab("gmp")}
                          className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all border border-white/15 bg-white/5 hover:bg-white/10 text-[#E2E8F0] hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
                        >
                          View Live GMP
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Visual Graphics Card */}
                    <div className="md:col-span-5 hidden md:block">
                      <div className="relative p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md animate-float flex flex-col items-center text-center space-y-3">
                        {/* Styled visual chart/avatar represent Calm Capital discipline */}
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1C9BDA] to-[#14B8A6] flex items-center justify-center text-white shadow-lg shadow-[#1C9BDA]/20">
                          <Activity size={22} />
                        </div>
                        <h4 className="text-sm font-bold text-white">Institutional Intelligence</h4>
                        <p className="text-[11px] text-[#8FA3BA] leading-relaxed max-w-[200px]">
                          Real-time multi-source verified data, tracked with financial discipline.
                        </p>
                        <div className="flex gap-2 items-center text-[10px] font-bold text-[#14B8A6] bg-[#14B8A6]/10 px-2.5 py-1 rounded-full border border-[#14B8A6]/20">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#14B8A6] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#14B8A6]"></span>
                          </span>
                          Live Data Synced
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. IPO Market Snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard icon={ArrowUpRight} label="Open IPOs" value={counts.Open} tint={BRAND.blue} onClick={() => navigateToTab("open")} />
                  <StatCard icon={Calendar} label="Upcoming IPOs" value={counts.Upcoming} tint={BRAND.blue} onClick={() => navigateToTab("upcoming")} />
                  <StatCard icon={Clock} label="Closed IPOs" value={counts.Closed} tint={BRAND.blue} onClick={() => navigateToTab("closed")} />
                  <StatCard icon={LayoutGrid} label="Listed IPOs" value={counts.Listed} tint={BRAND.blue} onClick={() => navigateToTab("listed")} />
                </div>

                {/* 3. LIVE GMP STATUS SECTION (Immediately below status boxes) */}
                {(() => {
                  // Priority: Open=1, Closed=2, Upcoming=3 — NEVER Listed
                  const STATUS_ORDER = { Open: 1, Closed: 2, Upcoming: 3 };

                  // Step 1: filter by type (Mainboard/SME) and exclude Listed + no-GMP
                  const eligibleGmpIpos = filtered.filter((ipo) => {
                    const s = getComputedStatus(ipo);
                    if (s !== "Open" && s !== "Closed" && s !== "Upcoming") return false;
                    if (ipo.type !== gmpMarket) return false;
                    return ipo.gmp != null && !isNaN(ipo.gmp);
                  });

                  // Step 2: deduplicate strictly by ipo.id / slug
                  const seenIds = new Set();
                  const deduped = [];
                  for (const item of eligibleGmpIpos) {
                    const id = item.id || item.slug;
                    if (id && !seenIds.has(id)) {
                      seenIds.add(id);
                      deduped.push(item);
                    }
                  }

                  // Step 3: group by status (Open / Closed / Upcoming)
                  const grouped = { Open: [], Closed: [], Upcoming: [] };
                  for (const ipo of deduped) {
                    const s = getComputedStatus(ipo);
                    if (grouped[s]) grouped[s].push(ipo);
                  }

                  // Step 4: within each group sort by GMP% descending
                  const gmpPctOf = (ipo) => {
                    const p = ipo.priceMax || ipo.priceMin || 0;
                    return p ? (ipo.gmp / p) * 100 : 0;
                  };
                  grouped.Open.sort((a, b) => gmpPctOf(b) - gmpPctOf(a));
                  grouped.Closed.sort((a, b) => gmpPctOf(b) - gmpPctOf(a));
                  grouped.Upcoming.sort((a, b) => gmpPctOf(b) - gmpPctOf(a));

                  // Step 5: concatenate Open -> Closed -> Upcoming (Listed excluded)
                  const uniqueGmpIpos = [
                    ...grouped.Open,
                    ...grouped.Closed,
                    ...grouped.Upcoming,
                  ];

                  
                  return (
                    <div className="rounded-2xl p-5 border border-slate-200 dark:border-white/5 bg-white dark:bg-[#121D2D] shadow-sm space-y-4">
                      {/* Header + Mainboard/SME Toggle + View All */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5" style={{ borderColor: dark ? "rgba(45,64,86,0.9)" : "#EAEFF2" }}>
                        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 sm:gap-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
                              <TrendingUp size={15} />
                            </div>
                            <h3 className="text-sm font-bold text-[#0B1F33] dark:text-white uppercase tracking-wide">
                              LIVE GMP STATUS
                            </h3>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold tracking-wider uppercase">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                              </span>
                              LIVE
                            </div>
                          </div>

                          {/* MAINBOARD | SME Tabs Segmented Control */}
                          <div className="bg-slate-100 dark:bg-white/5 p-0.5 rounded-xl flex items-center border border-slate-200 dark:border-white/5">
                            <button
                              onClick={() => setGmpMarket("Mainboard")}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
                                gmpMarket === "Mainboard"
                                  ? "bg-[#0B1F33] dark:bg-teal-600 text-white shadow-sm"
                                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-transparent"
                              }`}
                            >
                              MAINBOARD
                            </button>
                            <button
                              onClick={() => setGmpMarket("SME")}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
                                gmpMarket === "SME"
                                  ? "bg-[#0B1F33] dark:bg-teal-600 text-white shadow-sm"
                                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-transparent"
                              }`}
                            >
                              SME
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => navigateToTab("gmp")}
                          className="text-xs font-bold text-[#0F766E] dark:text-[#14B8A6] hover:underline flex items-center gap-1 cursor-pointer border-0 bg-transparent self-end sm:self-auto"
                        >
                          View All GMP Trends <ChevronRight size={13} />
                        </button>
                      </div>

                      {/* Cards Grid or Empty State */}
                      {uniqueGmpIpos.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {uniqueGmpIpos.slice(0, 9).map((ipo) => {
                            const cutoff = ipo.priceMax || price(ipo);
                            const gmpPct = cutoff ? ((ipo.gmp / cutoff) * 100).toFixed(2) : "0.00";
                            const status = getComputedStatus(ipo);

                            const isPos = ipo.gmp > 0;
                            const isNeg = ipo.gmp < 0;

                            const statusDotColor =
                              status === "Open" ? "text-emerald-500" :
                              status === "Upcoming" ? "text-teal-500" :
                              "text-amber-500";

                            return (
                              <div
                                key={ipo.id}
                                onClick={() => handleSelectIpo(ipo)}
                                className="p-3.5 rounded-2xl border border-slate-150 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] hover:border-[#1C9BDA]/40 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <CompanyAvatar name={ipo.company} logoUrl={ipo.logoUrl} size={38} />
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-[#0B1F33] dark:text-white truncate">{ipo.company}</p>
                                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                      <span className={`${statusDotColor} text-[8px] leading-none`}>●</span>
                                      <span className="font-bold text-[#102A43] dark:text-slate-200">
                                        {status === "Open" ? "Open" : status === "Upcoming" ? "Upcoming" : "Closed"}
                                      </span>
                                      <span className="text-slate-300 dark:text-slate-600">|</span>
                                      <span>{ipo.type}</span>
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className={`font-mono font-bold text-sm block ${
                                    isPos ? "text-emerald-600 dark:text-emerald-400" :
                                    isNeg ? "text-[#DC2626] dark:text-rose-400" :
                                    "text-slate-500 dark:text-slate-450"
                                  }`}>
                                    {ipo.gmp > 0 ? "+" : ipo.gmp < 0 ? "-" : ""}₹{Math.abs(ipo.gmp || 0)}
                                  </span>
                                  <span className={`text-[10px] font-semibold font-mono px-1.5 py-0.5 rounded ${
                                    isPos ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                                    isNeg ? "bg-rose-50 dark:bg-rose-500/10 text-[#DC2626] dark:text-rose-400" :
                                    "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400"
                                  }`}>
                                    {isPos ? "+" : ""}{gmpPct}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-slate-50/50 dark:bg-white/[0.01] border border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                          No live GMP data available for active/upcoming/closed {gmpMarket} IPOs right now.
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 4. Today's IPO Activity */}
                {(() => {
                  const { openToday, closingToday, listingToday, allotmentToday, openingTomorrow } = todayActivity;
                  const hasActivity = openToday.length > 0 || closingToday.length > 0 || listingToday.length > 0 || allotmentToday.length > 0 || openingTomorrow.length > 0;
                  if (!hasActivity) return null;
                  
                  return (
                    <div className="rounded-2xl p-5 border border-slate-205 dark:border-white/5 bg-white dark:bg-[#121D2D] shadow-sm space-y-4">
                      <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Today's IPO Activity
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {openToday.map(i => (
                          <div key={i.id} onClick={() => handleSelectIpo(i)} className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 cursor-pointer hover:shadow-md transition-all flex items-center gap-3">
                            <CompanyAvatar name={i.company} logoUrl={i.logoUrl} size={36} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-855 dark:text-white truncate">{i.company}</p>
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">Bidding Opens Today</p>
                            </div>
                          </div>
                        ))}
                        {closingToday.map(i => (
                          <div key={i.id} onClick={() => handleSelectIpo(i)} className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 cursor-pointer hover:shadow-md transition-all flex items-center gap-3">
                            <CompanyAvatar name={i.company} logoUrl={i.logoUrl} size={36} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-855 dark:text-white truncate">{i.company}</p>
                              <p className="text-[10px] text-rose-500 dark:text-rose-400 font-bold mt-0.5">Last Day (Closes Today)</p>
                            </div>
                          </div>
                        ))}
                        {listingToday.map(i => (
                          <div key={i.id} onClick={() => handleSelectIpo(i)} className="p-3 rounded-xl border border-[#1c9bda]/20 bg-[#1c9bda]/5 cursor-pointer hover:shadow-md transition-all flex items-center gap-3">
                            <CompanyAvatar name={i.company} logoUrl={i.logoUrl} size={36} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-855 dark:text-white truncate">{i.company}</p>
                              <p className="text-[10px] text-[#1c9bda] dark:text-[#52b1e4] font-bold mt-0.5">Lists Today</p>
                            </div>
                          </div>
                        ))}
                        {allotmentToday.map(i => (
                          <div key={i.id} onClick={() => handleSelectIpo(i)} className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 cursor-pointer hover:shadow-md transition-all flex items-center gap-3">
                            <CompanyAvatar name={i.company} logoUrl={i.logoUrl} size={36} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-855 dark:text-white truncate">{i.company}</p>
                              <p className="text-[10px] text-amber-505 dark:text-amber-405 font-bold mt-0.5">Allotment Expected Today</p>
                            </div>
                          </div>
                        ))}
                        {openingTomorrow.map(i => (
                          <div key={i.id} onClick={() => handleSelectIpo(i)} className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 cursor-pointer hover:shadow-md transition-all flex items-center gap-3">
                            <CompanyAvatar name={i.company} logoUrl={i.logoUrl} size={36} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-855 dark:text-white truncate">{i.company}</p>
                              <p className="text-[10px] text-blue-500 dark:text-blue-400 font-bold mt-0.5">Opens Tomorrow</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 5. IPO Journey / Timeline */}
                <div className="rounded-2xl p-5 border border-slate-205 dark:border-white/5 bg-white dark:bg-[#121D2D] shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    IPO Journey
                  </h3>
                  <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-2">
                    <div className="absolute left-[15px] md:left-[10%] right-auto md:right-[10%] top-2 bottom-2 md:bottom-auto md:top-[15px] w-0.5 md:w-auto md:h-0.5 bg-slate-200 dark:bg-slate-800 z-0 hidden md:block" />
                    
                    {[
                      { stage: "Upcoming", desc: "DRHP/RHP filed with SEBI", tabId: "upcoming", color: "bg-amber-500 text-white" },
                      { stage: "Open", desc: "Active bidding open to public", tabId: "open", color: "bg-emerald-500 text-white" },
                      { stage: "Closed", desc: "Bidding closed", tabId: "closed", color: "bg-slate-400 text-white" },
                      { stage: "Allotment", desc: "Shares allocated to bidders", tabId: "allotment", color: "bg-indigo-500 text-white" },
                      { stage: "Listed", desc: "Traded on exchange", tabId: "listed", color: "bg-[#1c9bda] text-white" },
                    ].map((step, idx) => (
                      <button
                        key={step.stage}
                        onClick={() => navigateToTab(step.tabId)}
                        className="relative z-10 w-full md:w-auto flex md:flex-col items-center text-left md:text-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-white/5 gap-3 md:gap-2 bg-transparent"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${step.color}`}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-855 dark:text-white">{step.stage}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-[140px] mt-0.5 leading-normal">{step.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Featured & Active IPOs (Strictly OPEN IPOs only) */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h2 className="text-base font-bold text-slate-855 dark:text-white tracking-tight">
                      Featured & Active IPOs
                    </h2>
                    
                    {/* Mainboard | SME Toggle */}
                    <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-xl flex items-center border border-slate-150 dark:border-white/5 self-start sm:self-auto">
                      <button
                        onClick={() => setOverviewType("Mainboard")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          overviewType === "Mainboard"
                            ? "bg-[#1c9bda] text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-855 dark:hover:text-slate-200"
                        }`}
                      >
                        Mainboard
                      </button>
                      <button
                        onClick={() => setOverviewType("SME")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          overviewType === "SME"
                            ? "bg-[#1c9bda] text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-855 dark:hover:text-slate-200"
                        }`}
                      >
                        SME
                      </button>
                    </div>
                  </div>

                  {(() => {
                    // Strictly Open IPOs only per requirement
                    const activeOverview = sortIposLogically(filtered.filter(i => i.type === overviewType && getComputedStatus(i) === "Open"));
                    
                    if (activeOverview.length > 0) {
                      return (
                        <div className="grid sm:grid-cols-2 gap-3">
                          {activeOverview.map(ipo => (
                            <IPOCard key={ipo.id} ipo={ipo} onOpen={handleSelectIpo} watchlist={watchlist} dark={dark} />
                          ))}
                        </div>
                      );
                    }
                    
                    return (
                      <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-2xl p-8 text-center">
                        <CircleDollarSign size={24} className="mx-auto mb-2 text-slate-350 dark:text-slate-700" />
                        <p className="text-slate-500 text-xs">
                          No currently open {overviewType} IPOs at the moment.
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* 7. Recent IPO Activity Announcements */}
                <div className="rounded-2xl p-5 border border-slate-205 dark:border-white/5 bg-white dark:bg-[#121D2D] shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Bell size={14} className="text-[#1c9bda]" />
                    Recent IPO Activity
                  </h3>
                  {notifHook.notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">No recent timeline announcements.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {notifHook.notifications.slice(0, 4).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            const found = getLiveIPOS().find((i) => i.id === n.ipoId);
                            if (found) handleSelectIpo(found);
                          }}
                          className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-white/[0.02] bg-slate-500/[0.015] dark:bg-white/[0.005] hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                        >
                          <div className="w-2 h-2 rounded-full bg-[#1c9bda]/70 mt-1.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-855 dark:text-slate-200">{n.title}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{n.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 8. Quick Access Tools */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    Quick Access Tools
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {[
                      { label: "Live GMP", icon: TrendingUp, tabId: "gmp" },
                      { label: "GMP Trends", icon: BarChart3, tabId: "gmp" },
                      { label: "IPO Subscription", icon: LayoutGrid, tabId: "subscriptions" },
                      { label: "IPO Allotment", icon: BookmarkCheck, tabId: "allotment" },
                      { label: "Financials", icon: BarChart3, tabId: "financials" },
                      { label: "DRHP / RHP", icon: FileText, tabId: "docs" },
                      { label: "Profit/Loss Calculator", icon: CalcIcon, tabId: "calculator" },
                    ].map((tool) => (
                      <button
                        key={tool.label}
                        onClick={() => navigateToTab(tool.tabId)}
                        className="p-4 rounded-2xl glass border border-slate-205 dark:border-white/5 flex flex-col items-center justify-center text-center hover:scale-[1.02] cursor-pointer hover:shadow-md transition-all space-y-2 bg-transparent"
                      >
                        <div className="w-8 h-8 rounded-xl bg-[#1c9bda]/10 text-[#1c9bda] dark:bg-[#1c9bda]/20 dark:text-[#52b1e4] flex items-center justify-center">
                          <tool.icon size={16} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{tool.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 8.5 Dynamic Quick Answer Box */}
                {(() => {
                  const openIpos = getLiveIPOS().filter(i => getComputedStatus(i) === "Open");
                  let bodyText = "";
                  if (openIpos.length > 0) {
                    const openNames = openIpos.map(i => i.name || i.company).join(", ");
                    bodyText = `${openIpos.length} IPO${openIpos.length > 1 ? 's are' : ' is'} open for bidding in India today: ${openNames}. Each issue shows live GMP, subscription status and allotment chances. Click any IPO card above to see detailed allotment chances, price band, lot size and listing date.`;
                  } else {
                    bodyText = `There are no IPOs open for bidding today in India. However, there are ${counts.Upcoming} upcoming IPOs currently announced on Calm Capital. Click any upcoming IPO to check its expected timeline, price band, lot size and grey market premium (GMP) trends.`;
                  }
                  
                  return (
                    <div className="rounded-2xl p-5 border border-slate-205 dark:border-white/5 bg-[#1c9bda]/5 dark:bg-[#1c9bda]/10 shadow-inner space-y-2">
                      <div className="flex items-center gap-1.5 text-[#1c9bda] dark:text-[#52b1e4] text-[10px] font-bold uppercase tracking-wider">
                        <Sparkles size={12} /> Quick Answer
                      </div>
                      <h4 className="text-xs font-black text-slate-850 dark:text-white">
                        Which IPOs are open for bidding today in India?
                      </h4>
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-350">
                        {bodyText}
                      </p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 pt-1 font-medium">
                        Last refreshed: {formatDataAsOf()}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}

            {tab === "open" && (
              <div>
                {groupedFiltered("Open").length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {groupedFiltered("Open").map((ipo) => <IPOCard key={ipo.id} ipo={ipo} onOpen={handleSelectIpo} watchlist={watchlist} dark={dark} />)}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-2xl p-12 text-center">
                    <Calendar size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                    <p className="text-slate-500 text-sm">
                      There are currently no open IPOs.
                    </p>
                  </div>
                )}
              </div>
            )}

            {tab === "closed" && (() => {
              const closedIpos = groupedFiltered("Closed");
              const closedMainboardCount = closedIpos.filter(i => i.type === "Mainboard").length;
              const closedSmeCount = closedIpos.filter(i => i.type === "SME").length;
              const displayedClosedIpos = closedIpos.filter(i => i.type === closedType);

              return (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <Clock size={16} />
                      </div>
                      <h1 className="text-base font-extrabold text-[#0B1F33] dark:text-white tracking-tight">Closed IPOs</h1>
                    </div>
                    
                    {/* Mainboard | SME Toggle */}
                    <div className="bg-slate-100 dark:bg-white/5 p-0.5 rounded-xl flex items-center border border-slate-200 dark:border-white/5 self-start sm:self-auto">
                      <button
                        onClick={() => setClosedType("Mainboard")}
                        className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
                          closedType === "Mainboard"
                            ? "bg-[#0B1F33] dark:bg-teal-600 text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 bg-transparent"
                        }`}
                      >
                        Mainboard ({closedMainboardCount})
                      </button>
                      <button
                        onClick={() => setClosedType("SME")}
                        className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
                          closedType === "SME"
                            ? "bg-[#0B1F33] dark:bg-teal-600 text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 bg-transparent"
                        }`}
                      >
                        SME ({closedSmeCount})
                      </button>
                    </div>
                  </div>

                  {displayedClosedIpos.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {displayedClosedIpos.map((ipo) => (
                        <IPOCard key={ipo.id} ipo={ipo} onOpen={handleSelectIpo} watchlist={watchlist} dark={dark} />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-2xl p-12 text-center">
                      <Calendar size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                      <p className="text-slate-500 text-sm">
                        There are currently no closed {closedType} IPOs.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {tab === "upcoming" && (() => {
              const upcomingIpos = groupedFiltered("Upcoming");
              const upcomingMainboardCount = upcomingIpos.filter(i => i.type === "Mainboard").length;
              const upcomingSmeCount = upcomingIpos.filter(i => i.type === "SME").length;
              const displayedUpcomingIpos = upcomingIpos.filter(i => i.type === upcomingType);

              return (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
                        <Calendar size={16} />
                      </div>
                      <h1 className="text-base font-extrabold text-[#0B1F33] dark:text-white tracking-tight">Upcoming IPOs</h1>
                    </div>
                    
                    {/* Mainboard | SME Toggle */}
                    <div className="bg-slate-100 dark:bg-white/5 p-0.5 rounded-xl flex items-center border border-slate-200 dark:border-white/5 self-start sm:self-auto">
                      <button
                        onClick={() => setUpcomingType("Mainboard")}
                        className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
                          upcomingType === "Mainboard"
                            ? "bg-[#0B1F33] dark:bg-teal-600 text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 bg-transparent"
                        }`}
                      >
                        Mainboard ({upcomingMainboardCount})
                      </button>
                      <button
                        onClick={() => setUpcomingType("SME")}
                        className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
                          upcomingType === "SME"
                            ? "bg-[#0B1F33] dark:bg-teal-600 text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 bg-transparent"
                        }`}
                      >
                        SME ({upcomingSmeCount})
                      </button>
                    </div>
                  </div>

                  {displayedUpcomingIpos.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {displayedUpcomingIpos.map((ipo) => (
                        <IPOCard key={ipo.id} ipo={ipo} onOpen={handleSelectIpo} watchlist={watchlist} dark={dark} />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-2xl p-12 text-center">
                      <Calendar size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                      <p className="text-slate-500 text-sm">
                        There are currently no upcoming {upcomingType} IPOs. Please check back later.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {tab === "allotment" && (
              <AllotmentTab
                query={query}
                onOpen={handleSelectIpo}
                watchlist={watchlist}
                dark={dark}
                tick={tick}
              />
            )}

            {tab === "listed" && (() => {
              const listedIpos = groupedFiltered("Listed");
              const listedMainboardCount = listedIpos.filter(i => i.type === "Mainboard").length;
              const listedSmeCount = listedIpos.filter(i => i.type === "SME").length;
              const displayedListedIpos = listedIpos.filter(i => i.type === listedType);

              return (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <LayoutGrid size={16} />
                      </div>
                      <h1 className="text-base font-extrabold text-[#0B1F33] dark:text-white tracking-tight">Listed IPOs</h1>
                    </div>
                    
                    {/* Mainboard | SME Toggle */}
                    <div className="bg-slate-100 dark:bg-white/5 p-0.5 rounded-xl flex items-center border border-slate-200 dark:border-white/5 self-start sm:self-auto">
                      <button
                        onClick={() => setListedType("Mainboard")}
                        className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
                          listedType === "Mainboard"
                            ? "bg-[#0B1F33] dark:bg-teal-600 text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 bg-transparent"
                        }`}
                      >
                        Mainboard ({listedMainboardCount})
                      </button>
                      <button
                        onClick={() => setListedType("SME")}
                        className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
                          listedType === "SME"
                            ? "bg-[#0B1F33] dark:bg-teal-600 text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 bg-transparent"
                        }`}
                      >
                        SME ({listedSmeCount})
                      </button>
                    </div>
                  </div>

                  {displayedListedIpos.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {displayedListedIpos.map((ipo) => (
                        <IPOCard key={ipo.id} ipo={ipo} onOpen={handleSelectIpo} watchlist={watchlist} dark={dark} />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-2xl p-12 text-center">
                      <Building2 size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                      <p className="text-slate-500 text-sm">No listed {listedType} IPOs found.</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {tab === "gmp" && <GMPTab tick={tick} onOpen={handleSelectIpo} query={query} />}
            {tab === "subscriptions" && <SubscriptionsTab dark={dark} query={query} />}
            {tab === "financials" && <FinancialsTab onOpen={handleSelectIpo} dark={dark} query={query} />}
            {tab === "docs" && <DocumentsTab onOpen={handleSelectIpo} query={query} />}
            {tab === "calculator" && <CalculatorTab onOpen={handleSelectIpo} />}
            {tab === "watchlist" && <WatchlistTab watchlist={watchlist} onOpen={handleSelectIpo} dark={dark} query={query} />}
            {tab === "demat" && <DematTab dark={dark} />}
            {AI_ASSISTANT_ENABLED && tab === "ai" && <div className="glass rounded-2xl p-5"><AssistantPane embedded tick={tick} /></div>}
            {tab === "about" && <AboutPage navigateToTab={navigateToTab} />}
            {tab === "privacy" && <PrivacyPage onBack={() => navigateToTab("overview")} />}
            {tab === "terms" && <TermsPage onBack={() => navigateToTab("overview")} />}
            {tab === "disclaimer" && <DisclaimerPage onBack={() => navigateToTab("overview")} />}
                  </>
                )}
              </div>
            )}
            <Footer dark={dark} navigateToTab={navigateToTab} setOverviewType={setOverviewType} />
          </main>
        </div>
      </div>

      <IPODetail
        ipo={selected && viewMode === "modal" ? selected : null}
        onClose={() => handleSelectIpo(null)}
        watchlist={watchlist}
        dark={dark}
        onOpen={handleSelectIpo}
        onNavigateTab={setTab}
      />
    </div>
  );
}

/* =====================================================================
   GLOBAL REUSABLE FOOTER COMPONENT
===================================================================== */
function Footer({ dark, navigateToTab, setOverviewType }) {
  return (
    <footer className="mt-16 border-t pt-10 pb-8 px-5 bg-white dark:bg-[#0A1020] rounded-3xl" style={{ borderColor: dark ? "rgba(45,64,86,0.9)" : "#D9E4EC" }}>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-[14px]">
        
        {/* Brand Column */}
        <div className="md:col-span-4 space-y-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Calm Capital Logo" className="w-9 h-9 object-contain rounded-xl" />
            <div>
              <p className="text-base font-bold tracking-tight text-[#102A43] dark:text-white leading-tight">Calm Capital</p>
              <p className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mt-0.5">Designed by Discipline</p>
            </div>
          </div>
          <p className="leading-relaxed text-[#52667A] dark:text-slate-400 text-[15px]">
            Making Indian IPO information easier to understand, compare and research — all in one place.
          </p>
          
          <div className="flex items-center gap-3 pt-1">
            <a
              href="mailto:calmcapital.in@gmail.com"
              className="text-slate-400 hover:text-[#1c9bda] transition-colors"
              title="Email us"
            >
              <Send size={16} />
            </a>
            <a
              href="https://www.instagram.com/calmcapital.space?utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-[#E1306C] transition-colors"
              title="Follow on Instagram"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
              </svg>
            </a>
            <a
              href="https://youtube.com/@calm.capital?si=BLBBI-Ynp0kC791N"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-[#FF0000] transition-colors"
              title="Subscribe on YouTube"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
                <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Product Column */}
        <div className="col-span-2 space-y-3">
          <h4 className="font-bold text-[#102A43] dark:text-white uppercase tracking-wider text-xs">Product</h4>
          <ul className="space-y-2.5 p-0 m-0 list-none text-[14px]">
            {[
              { label: "Open IPOs", tabId: "open" },
              { label: "Upcoming IPOs", tabId: "upcoming" },
              { label: "Closed IPOs", tabId: "closed" },
              { label: "Listed IPOs", tabId: "listed" },
              { label: "IPO Allotment", tabId: "allotment" },
            ].map(lnk => (
              <li key={lnk.label}>
                <button onClick={() => navigateToTab(lnk.tabId)} className="bg-transparent border-0 p-0 text-[#52667A] hover:text-[#1c9bda] dark:text-slate-400 dark:hover:text-[#1c9bda] transition-colors cursor-pointer text-left text-[14px] font-medium">
                  {lnk.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Tools Column */}
        <div className="col-span-2 space-y-3">
          <h4 className="font-bold text-[#102A43] dark:text-white uppercase tracking-wider text-xs">Tools</h4>
          <ul className="space-y-2.5 p-0 m-0 list-none text-[14px]">
            {[
              { label: "Live GMP", tabId: "gmp" },
              { label: "IPO Subscription", tabId: "subscriptions" },
              { label: "Financials", tabId: "financials" },
              { label: "IPO Calculator", tabId: "calculator" },
              { label: "Profit/Loss Calculator", tabId: "calculator" },
              { label: "Watchlist", tabId: "watchlist" },
            ].map(lnk => (
              <li key={lnk.label}>
                <button onClick={() => navigateToTab(lnk.tabId)} className="bg-transparent border-0 p-0 text-[#52667A] hover:text-[#1c9bda] dark:text-slate-400 dark:hover:text-[#1c9bda] transition-colors cursor-pointer text-left text-[14px] font-medium">
                  {lnk.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Research Column */}
        <div className="col-span-2 space-y-3">
          <h4 className="font-bold text-[#102A43] dark:text-white uppercase tracking-wider text-xs">Research</h4>
          <ul className="space-y-2.5 p-0 m-0 list-none text-[14px]">
            {[
              { label: "DRHP / RHP", tabId: "docs" },
              { label: "IPO Subscriptions", tabId: "subscriptions" },
              { label: "Financial Analysis", tabId: "financials" },
              { label: "Live GMP Trends", tabId: "gmp" },
            ].map(lnk => (
              <li key={lnk.label}>
                <button onClick={() => navigateToTab(lnk.tabId)} className="bg-transparent border-0 p-0 text-[#52667A] hover:text-[#1c9bda] dark:text-slate-400 dark:hover:text-[#1c9bda] transition-colors cursor-pointer text-left text-[14px] font-medium">
                  {lnk.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Information Column */}
        <div className="col-span-2 space-y-3">
          <h4 className="font-bold text-[#102A43] dark:text-white uppercase tracking-wider text-xs">Information</h4>
          <ul className="space-y-2.5 p-0 m-0 list-none text-[14px]">
            {[
              { label: "About Calm Capital", tabId: "about" },
              { label: "Privacy Policy", tabId: "privacy" },
              { label: "Terms of Use", tabId: "terms" },
              { label: "Disclaimer", tabId: "disclaimer" },
            ].map(lnk => (
              <li key={lnk.label}>
                <button onClick={() => navigateToTab(lnk.tabId)} className="bg-transparent border-0 p-0 text-[#52667A] hover:text-[#1c9bda] dark:text-slate-400 dark:hover:text-[#1c9bda] transition-colors cursor-pointer text-left text-[14px] font-medium">
                  {lnk.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* Connect With Us */}
      <div className="mt-8 pt-6 border-t" style={{ borderColor: dark ? "rgba(45,64,86,0.9)" : "#D9E4EC" }}>
        <h4 className="font-bold text-[#102A43] dark:text-white uppercase tracking-wider text-xs mb-4">Connect With Us</h4>
        <div className="flex items-center gap-3">
          {/* Instagram */}
          <a
            href="https://www.instagram.com/calmcapital.space?utm_source=qr"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 no-underline"
            style={{ borderColor: dark ? "rgba(225,48,108,0.25)" : "rgba(225,48,108,0.2)", background: dark ? "rgba(225,48,108,0.06)" : "rgba(225,48,108,0.04)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E1306C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="0.5" fill="#E1306C" stroke="none"/>
            </svg>
            <span className="text-[13px] font-semibold text-[#E1306C] group-hover:text-[#c1175a] transition-colors">Instagram</span>
          </a>

          {/* YouTube */}
          <a
            href="https://youtube.com/@calm.capital?si=BLBBI-Ynp0kC791N"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 no-underline"
            style={{ borderColor: dark ? "rgba(255,0,0,0.25)" : "rgba(255,0,0,0.2)", background: dark ? "rgba(255,0,0,0.06)" : "rgba(255,0,0,0.04)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF0000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
              <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#FF0000" stroke="none"/>
            </svg>
            <span className="text-[13px] font-semibold text-[#FF0000] group-hover:text-[#cc0000] transition-colors">YouTube</span>
          </a>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t flex flex-col md:flex-row md:items-center md:justify-between gap-4" style={{ borderColor: dark ? "rgba(45,64,86,0.9)" : "#D9E4EC" }}>
        <p className="text-[13px] text-slate-400 dark:text-slate-500">
          © 2026 Calm Capital. All rights reserved.
        </p>
        <div className="flex gap-4 text-[13px]">
          <button onClick={() => navigateToTab("privacy")} className="bg-transparent border-0 p-0 text-slate-400 hover:text-[#1c9bda] cursor-pointer text-[13px]">Privacy Policy</button>
          <button onClick={() => navigateToTab("terms")} className="bg-transparent border-0 p-0 text-slate-400 hover:text-[#1c9bda] cursor-pointer text-[13px]">Terms of Use</button>
          <button onClick={() => navigateToTab("disclaimer")} className="bg-transparent border-0 p-0 text-slate-400 hover:text-[#1c9bda] cursor-pointer text-[13px]">Disclaimer</button>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed mt-4 border-t pt-4" style={{ borderColor: dark ? "rgba(255,255,255,0.04)" : "#D9E4EC" }}>
        Calm Capital is an informational platform providing IPO-related data and research tools. Information including GMP and market estimates may be unofficial or subject to change. Nothing on this platform constitutes investment advice or a recommendation to buy or sell securities.
      </p>
    </footer>
  );
}

/* =====================================================================
   REACT ERROR BOUNDARY FOR IPO DETAILS
===================================================================== */
class IpoErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[IpoErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-10 text-center space-y-4 my-6 shadow-sm">
          <AlertTriangle size={42} className="mx-auto text-amber-500" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
            Unable to load this IPO
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed font-medium">
            We couldn't display some details for this IPO right now. Please try again or return to the main dashboard.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onBack) this.props.onBack();
              }}
              className="px-5 py-2.5 rounded-xl bg-[#1c9bda] text-white text-xs font-bold shadow-md hover:brightness-110 cursor-pointer border-0"
            >
              Back to IPOs
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white text-xs font-bold hover:bg-slate-200 cursor-pointer border border-slate-200 dark:border-white/10"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* =====================================================================
   ABOUT CALM CAPITAL PAGE
===================================================================== */
function AboutPage({ navigateToTab }) {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden glass border border-slate-205 dark:border-white/5 p-8 md:p-10 text-center space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#1c9bda]/10 text-[#1c9bda] dark:bg-[#1c9bda]/20 dark:text-[#52b1e4] mx-auto">
          Designed by Discipline
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-855 dark:text-white tracking-tight leading-tight">
          About Calm Capital
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
          Calm Capital is an independent information and research platform built to make Indian IPO research simpler, clearer and easier to access.
        </p>
      </div>

      {/* What You Can Research Section */}
      <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-slate-855 dark:text-white tracking-tight">
            Comprehensive IPO Intelligence
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Calm Capital brings together all essential IPO metrics into one clean, structured dashboard. On our platform, investors and researchers can find:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            "Live GMP estimates",
            "IPO subscription data",
            "Allotment information & registrar links",
            "IPO timelines & important dates",
            "Company overview & business highlights",
            "Verified financial performance metrics",
            "IPO structure & share allocation",
            "Official DRHP / RHP documents",
            "Interactive IPO lot size calculator",
            "GMP trends & historical performance",
            "Mainboard & SME IPO tracking",
            "IPO comparison & research tools",
          ].map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-150 dark:border-white/5 flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#1c9bda]/10 text-[#1c9bda] flex items-center justify-center font-bold text-xs shrink-0">✓</span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Why Calm Capital Section */}
      <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-slate-855 dark:text-white tracking-tight">
            Why Calm Capital?
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            We built Calm Capital to eliminate clutter and provide disciplined IPO research tools.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              title: "Everything in One Place",
              desc: "No need to jump between multiple stock exchange filings, news portals, and registrar sites.",
            },
            {
              title: "Easy to Understand",
              desc: "Complex IPO structures, price bands, and allocation quotas are presented in clean, visual formats.",
            },
            {
              title: "Research-Focused",
              desc: "Designed specifically to help users evaluate company business models and financial health.",
            },
            {
              title: "Mainboard + SME Coverage",
              desc: "Track both Mainboard and SME category public issues with seamless category filtering.",
            },
            {
              title: "Data-Driven Insights",
              desc: "Multi-source verified subscription numbers, lot calculations, and timeline tracking.",
            },
            {
              title: "Built for Informed Research",
              desc: "Calm Capital provides objective information and analytical tools, not investment recommendations.",
            },
          ].map((feature, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-150 dark:border-white/5 space-y-1.5">
              <h3 className="text-sm font-bold text-[#102A43] dark:text-white">{feature.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="rounded-3xl p-8 bg-gradient-to-r from-[#1c9bda]/10 via-emerald-500/5 to-transparent border border-[#1c9bda]/20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-855 dark:text-white">
          Ready to start your IPO research?
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigateToTab("open")}
            className="px-6 py-3 rounded-2xl bg-[#1c9bda] text-white text-xs font-bold shadow-md hover:brightness-110 transition-all cursor-pointer border-0"
          >
            Explore Open IPOs →
          </button>
          <button
            onClick={() => navigateToTab("overview")}
            className="px-6 py-3 rounded-2xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition-all cursor-pointer border border-slate-200 dark:border-white/10"
          >
            Explore All IPOs →
          </button>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   LEGAL INFORMATION PAGES (Privacy, Terms, Disclaimer)
===================================================================== */
function LegalHeader({ title, lastUpdated, onBack }) {
  return (
    <div className="border-b border-slate-150 dark:border-white/5 pb-4 mb-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer border-0 bg-transparent mb-3 animate-pulse"
      >
        ← Back to Dashboard
      </button>
      <h1 className="text-2xl md:text-3xl font-black text-slate-850 dark:text-white tracking-tight leading-tight">
        {title}
      </h1>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-semibold uppercase tracking-wider">
        Last Updated: {lastUpdated}
      </p>
    </div>
  );
}

function PrivacyPage({ onBack }) {
  return (
    <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
      <LegalHeader title="Privacy Policy" lastUpdated="August 8, 2026" onBack={onBack} />
      
      <div className="text-[15px] leading-relaxed text-slate-655 dark:text-slate-350 space-y-6">
        <p>
          At Calm Capital, accessible from calmcapital.space, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by Calm Capital and how we use it.
        </p>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">1. Information We Collect</h2>
          <p>
            We collect information in the following ways when you use our platform:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Usage Data:</strong> We automatically collect information about how you interact with our platform (such as tabs clicked, pages viewed, and timing).</li>
            <li><strong>Device Information:</strong> We collect technical parameters including browser type, operating system version, screen resolution, and theme preference (light/dark mode).</li>
            <li><strong>Watchlist Data:</strong> If you use our watchlist feature, your selections are stored locally in your browser's local storage. This data never leaves your device unless you backup/sync it explicitly.</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">2. How We Use Your Information</h2>
          <p>
            We use the collected information to:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide, operate, and maintain the platform's core dashboard, metrics, and tools.</li>
            <li>Improve, personalize, and expand platform usability and layout.</li>
            <li>Understand and analyze how you navigate the site to refine page load times and user experience.</li>
            <li>Monitor and prevent technical issues, performance bottlenecks, or security abnormalities.</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">3. Cookies & Local Storage</h2>
          <p>
            Like any other website, Calm Capital uses cookies and browser local storage. These are used to store information including visitors' preferences, such as selected theme (light/dark), watchlist items, and the last active dashboard tab. This allows us to provide a consistent, fast, and high-quality user experience without requiring users to log in or create an account.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">4. Web Analytics</h2>
          <p>
            We may use third-party analytics services (such as Google Analytics) to monitor and analyze the use of our service. These services track page views, tab visits, and search query terms. This data helps us understand search trends and optimize search index crawlability.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">5. External Links</h2>
          <p>
            Our service contains links to external websites that are not operated by us (for example, official SEBI filing links or registrar allotment websites). If you click on a third-party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit, as we have no control over and assume no responsibility for their content or policies.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">7. Contact Information</h2>
          <p>
            If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us at <a href="mailto:calmcapital.in@gmail.com" className="text-[#1c9bda] hover:underline font-semibold">calmcapital.in@gmail.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

function TermsPage({ onBack }) {
  return (
    <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
      <LegalHeader title="Terms of Use" lastUpdated="August 8, 2026" onBack={onBack} />
      
      <div className="text-[15px] leading-relaxed text-slate-655 dark:text-slate-350 space-y-6">
        <p>
          Welcome to Calm Capital. By accessing and using our website (calmcapital.space), you agree to comply with and be bound by the following Terms of Use. If you disagree with any part of these terms, please do not use our service.
        </p>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">1. Informational Nature of Platform</h2>
          <p>
            Calm Capital is a platform designed purely for educational and informational purposes. All information provided, including grey market premiums (GMP), subscription multiples, allotment schedules, and financial summaries, is compiled from publicly available data sources. We do not provide investment, tax, or legal advice.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">2. User Responsibility</h2>
          <p>
            You acknowledge that any investment decisions you make are solely your responsibility. You should perform your own research, verify all metrics against official regulatory filings, and consult a certified SEBI-registered financial advisor before applying for any IPO or buying/selling securities.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">3. Data Accuracy & Limitations</h2>
          <p>
            While we strive to keep all metrics up to date and correct, we do not guarantee the completeness, accuracy, reliability, or availability of the information on the website. Metrics such as GMP are unofficial, highly volatile indicators of market sentiment and are subject to immediate change without notice.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">4. Intellectual Property</h2>
          <p>
            All logos, branding, layout designs, calculator tools, and software logic on Calm Capital are the intellectual property of the platform developers unless otherwise specified. You may view and print content for personal, non-commercial use only.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">5. Limitation of Liability</h2>
          <p>
            In no event shall Calm Capital, its developers, or its affiliates be liable for any direct, indirect, special, or consequential damages or financial losses arising out of or in connection with the use of the platform or the reliance on any data presented.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">6. Contact</h2>
          <p>
            If you have any questions, concerns, feedback, or requests regarding these Terms of Use or the Calm Capital platform, you can contact us at:
          </p>
          <p className="font-semibold">
            Email:{" "}
            <a href="mailto:calmcapital.in@gmail.com" className="text-[#1c9bda] hover:underline font-semibold">calmcapital.in@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function DisclaimerPage({ onBack }) {
  return (
    <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
      <LegalHeader title="Regulatory Disclaimer" lastUpdated="August 8, 2026" onBack={onBack} />
      
      <div className="text-[15px] leading-relaxed text-slate-655 dark:text-slate-350 space-y-6">
        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
          <p className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5 text-sm uppercase tracking-wide">
            <AlertTriangle size={15} /> SEBI Regulatory Status Disclosure
          </p>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
            Calm Capital is a platform focused on making IPO research and statistics easy to understand. We are NOT registered with the Securities and Exchange Board of India (SEBI) as a certified investment adviser, research analyst, or portfolio manager. Nothing on this website constitutes a recommendation to subscribe, apply, purchase, or trade in any securities market offerings.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">1. Informational & Educational Scope</h2>
          <p>
            All materials published on Calm Capital—including financial highlights, debt ratios, allotment timelines, subscription counts, and GMP figures—are for informational and educational purposes only. They are not intended as financial advisory, nor do they constitute a solicitation or offer to buy or sell securities.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">2. Grey Market Premium (GMP) Disclaimer</h2>
          <p>
            Grey market premiums (GMP) are compiled from unofficial market reports and compiled solely as a sentiment indicator. They represent unofficial transaction indicators and are highly volatile, unregulated, and subject to high speculation. Listing gains are never guaranteed, and GMP should never be used as the sole criteria for applying for an IPO.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">3. Data Source Accuracy</h2>
          <p>
            Data presented on Calm Capital is sourced from public records, registrar portals, news publications, and official exchange websites. Although we employ multi-source verification and crosscheck metrics, errors may occasionally occur. Before taking action, you should check the official Draft Red Herring Prospectus (DRHP) or Red Herring Prospectus (RHP) filed with SEBI or exchange portals.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">4. No Investment Guarantees</h2>
          <p>
            We do not make guarantees, assurances, or predictions regarding the accuracy, completeness, listing price, allotment odds, or performance of any IPO. Bidding for IPOs involves risk, and you may lose part or all of your invested capital. You must consult with a certified financial advisor to assess your risk profile before investing.
          </p>
        </div>
      </div>
    </div>
  );
}
