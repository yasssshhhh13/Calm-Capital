import { useState, useMemo, useRef, useEffect, useCallback } from "react";
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

/* =====================================================================
   BRAND TOKENS
===================================================================== */
const BRAND = { blue: "#1c9bda", green: "#aed768", white: "#ffffff" };

/* =====================================================================
   DATA — real, researched figures. Data as of July 3, 2026.
   Estimated profit = GMP × lot size.
===================================================================== */
let IPOS_BASE = [];

const DATA_AS_OF = "July 3, 2026";
const rupee = (n) => (n == null || isNaN(n)) ? "-" : (n < 0 ? `-₹${Number(Math.abs(n)).toLocaleString("en-IN")}` : `₹${Number(n).toLocaleString("en-IN")}`);
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
const labelSources = (arr) => (arr || []).map((s) => SOURCE_LABEL[s] || s).join(", ");
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
    return (
      <span title={`Verified: ${labelSources(v.sources)} agree`} className="inline-flex items-center align-middle ml-1 text-emerald-600 dark:text-emerald-400">
        <ShieldCheck size={12} />
      </span>
    );
  }
  if (v.status === "conflict") {
    const parts = Object.entries(v.candidates || {})
      .map(([val, srcs]) => `${val} (${labelSources(srcs)})`)
      .join("  vs  ");
    return (
      <span title={`Sources disagree - ${parts}`} className="inline-flex items-center align-middle ml-1 text-amber-500">
        <AlertTriangle size={12} />
      </span>
    );
  }
  if (v.status === "unverified") {
    const srcs = labelSources(v.sources);
    return (
      <span title={`Unverified${srcs ? ` - only ${srcs} so far` : ""}. Awaiting a second source.`} className="inline-flex items-center align-middle ml-1 text-slate-400 dark:text-slate-500">
        <HelpCircle size={12} />
      </span>
    );
  }
  return null;
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
  // If listed price or current price exists, it is Listed
  if (ipo.listedAt !== null && ipo.listedAt !== undefined) return "Listed";
  if (ipo.currentPrice !== null && ipo.currentPrice !== undefined) return "Listed";

  if (!ipo.open) return "Upcoming"; // DRHP filed but subscription dates not yet announced
  const d = (s) => new Date(s + "T00:00:00+05:30"); // dates are IST
  const open = d(ipo.open);
  if (today < open) return "Upcoming";
  
  if (!ipo.close) return "Open"; // If open but close is not set, treat as Open
  const closeDeadline = new Date(ipo.close + "T16:50:00+05:30");
  if (today < closeDeadline) return "Open";
  
  if (!ipo.listing) return "Closed"; // If closed but listing not set, treat as Closed
  const listing = d(ipo.listing);
  if (today < listing) return "Closed";
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
  const scored = ipos.map((ipo, idx) => {
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
      if (a.ipo.id === b.ipo.id) continue;
      // Prefer the richer / live-status entry; drop the other (usually a null-date Upcoming stub)
      if (a.score >= b.score) drop.add(b.ipo.id);
      else drop.add(a.ipo.id);
    }
  }

  return ipos.filter((ipo) => !drop.has(ipo.id));
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
  const mergedList = IPOS_BASE.map((ipo) => {
    const patch = _liveOverlay.byId[ipo.id];
    let merged = ipo;
    if (patch) {
      merged = { ...ipo, ...patch };
      if (patch.sub) {
        // Share figures from live win. Keep baseline *_apps unless live
        // explicitly provides them — otherwise correct final odds (e.g. SBI
        // retail_apps 2.32) get wiped every hourly scrape.
        merged.sub = { ...(ipo.sub || {}), ...patch.sub };
      }
    }
    // Overlay real-time simulation price if registered
    if (_realtimePrices[ipo.id]) {
      merged = { ...merged, currentPrice: _realtimePrices[ipo.id].price };
    }
    const finalIpo = { ...merged, status: liveStatus(merged, today) };
    if (finalIpo.fin) {
      finalIpo.fin = validateFinancials(finalIpo);
    }
    return finalIpo;
  });
  return dedupeIpoList(mergedList);
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
            ipo.priceMin != null ? `. Price band set at ₹${ipo.priceMin}–₹${ipo.priceMax}` : ""
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
        message: `Subscription window is now active. Price: ₹${ipo.priceMin}–₹${ipo.priceMax}.`,
        date: ipo.open,
      });
    } else if (ipo.open && stillVisible(ipo.open) && ipo.open < notifDay) {
      candidates.push({
        id: `${ipo.id}-open-${ipo.open}`,
        type: "open",
        ipoId: ipo.id,
        title: `${ipo.company} Opened`,
        message: `Subscription opened on ${formatDate(ipo.open)}. Price: ₹${ipo.priceMin}–₹${ipo.priceMax}.`,
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
        message: `Subscription starts tomorrow, ${formatDate(ipo.open)}. Price band: ₹${ipo.priceMin}–₹${ipo.priceMax}.`,
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
          message: `Subscription closes today. Price band: ₹${ipo.priceMin}–₹${ipo.priceMax}.`,
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
        className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-[#121625]/30 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 relative shadow-sm"
      >
        <Bell size={14} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-[#0a0d16]" />
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
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: "#94a3b8" }}>
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
    `${i.name} (${i.type}, ${i.status}): price ₹${i.priceMin}-₹${i.priceMax}, lot ${i.lot}, GMP ₹${i.gmp} (${gainPct(i).toFixed(1)}%), ` +
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
      <div className="bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/5 rounded-3xl p-12 text-center shadow-sm">
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
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">IPO Profit / Loss Calculator</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Estimate your grey market returns before applying to any IPO</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* ── Input Card ── */}
        <div className="bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm dark:shadow-xl space-y-5">
          
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
              <div className="mt-2 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111520] shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: "340px" }}>

                {/* ── Sticky header: filter tabs + search ── */}
                <div className="sticky top-0 z-20 bg-white dark:bg-[#111520] border-b border-slate-100 dark:border-white/5">

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
                            color: isActive ? "#fff" : "#94a3b8",
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
                        className="w-full bg-slate-50 dark:bg-[#161c28] border border-slate-200 dark:border-white/5 rounded-xl pl-8 pr-3 py-2 text-base md:text-xs outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
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
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">{i.type} · {i.priceMax ? `₹${i.priceMax}` : "TBA"}</p>
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
              <span className="font-mono text-slate-805 dark:text-slate-200 font-bold">{ipo.priceMin && ipo.priceMax ? `₹${ipo.priceMin}–₹${ipo.priceMax}` : "—"}</span>
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
                className="w-12 h-12 rounded-xl border border-blue-500/40 text-blue-500 bg-slate-50 dark:bg-[#111520] hover:bg-slate-100 dark:hover:bg-[#111520]/80 flex items-center justify-center text-lg font-bold transition-all shadow-[0_0_10px_rgba(59,130,246,0.15)] focus:outline-none"
              >
                <Minus size={16} />
              </button>
              <div className="flex-1 bg-slate-50 dark:bg-[#111520] border border-slate-200 dark:border-slate-800 rounded-xl h-12 flex items-center justify-center font-mono text-xl font-bold text-slate-800 dark:text-white">
                {lots}
              </div>
              <button 
                onClick={() => setLots((l) => l + 1)} 
                className="w-12 h-12 rounded-xl border border-blue-500/40 text-blue-500 bg-slate-50 dark:bg-[#111520] hover:bg-slate-100 dark:hover:bg-[#111520]/80 flex items-center justify-center text-lg font-bold transition-all shadow-[0_0_10px_rgba(59,130,246,0.15)] focus:outline-none"
              >
                <span className="text-xl">+</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Result Card ── */}
        <div className="bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm dark:shadow-xl flex flex-col justify-between min-h-[340px]">
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
    return list;
  }, [safeName, logoUrl]);

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

  return (
    <div
      className="bg-white dark:bg-[#161c28] border rounded-2xl overflow-hidden relative group transition-all hover:shadow-md"
      style={{ borderColor: isOpen ? "rgba(28,155,218,0.35)" : "rgba(0,0,0,0.06)", boxShadow: isOpen ? "0 0 0 1px rgba(28,155,218,0.12), 0 4px 16px -4px rgba(28,155,218,0.15)" : "0 1px 4px rgba(0,0,0,0.04)" }}
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
      {/* Blue left accent bar for Open IPOs */}
      {isOpen && (
        <div className="absolute left-0 top-0 bottom-0 w-1 z-[1] bg-gradient-to-b from-[#1c9bda] to-[#0a66c2] pointer-events-none" />
      )}

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
                Listed @ ₹{ipo.listedAt} · {sign}{gain.toFixed(1)}%
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
            : "text-slate-700 dark:text-slate-200";
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
                <span className="font-mono text-sm font-semibold text-slate-500 dark:text-slate-400">N/A</span>
              )}
            </div>
          );
        })()}

        {/* Price / Lot / Issue size grid + profit */}
        <div className="flex items-end justify-between gap-2">
          <div className="grid grid-cols-3 gap-4 text-xs flex-1">
            <div>
              <p className="text-slate-500 dark:text-slate-400 mb-0.5 flex items-center">Price<VerifyMark ipo={ipo} field="priceMax" /></p>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-100">{isPending(ipo, "priceMax") ? <span className="text-[11px] italic font-medium text-slate-400">Pending</span> : (ipo.priceMin ? `₹${ipo.priceMin}-${ipo.priceMax}` : "-")}</p>
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
            <div className="rounded-xl px-3 py-2 text-right shrink-0" style={{ background: "#16a34a" }}>
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
              bg = `${BRAND.green}22`;
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
    <div className="bg-white dark:bg-[#161c28] border border-slate-150 dark:border-white/5 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden relative">
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
                Listed @ ₹{ipo.listedAt} · {sign}{gain.toFixed(1)}% {perfLabel}
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
              {ipo.listedAt ? `₹${ipo.listedAt}` : "—"}
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
              {isPending(ipo, "priceMax") ? <span className="text-[11px] italic font-medium text-slate-400">Pending</span> : (ipo.priceMin ? `₹${ipo.priceMin}-${ipo.priceMax}` : "—")}
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
   IPO DETAIL MODAL
===================================================================== */
function IPODetail({ ipo, onClose, watchlist, dark, onOpen, onNavigateTab }) {
  if (!ipo) return null;
  const watched = watchlist.ids.includes(ipo.id);
  const today = new Date();
  const faqs = buildIpoFaqs(ipo);
  const related = similarIpos(ipo, getLiveIPOS(), 3);

  // Timeline: determine which milestones have passed
  const milestones = [
    { label: "Open", date: ipo.open },
    { label: "Close", date: ipo.close },
    { label: "Allotment", date: ipo.allotment },
    { label: "Listing", date: ipo.listing },
  ];
  const isPast = (d) => d && new Date(d + "T00:00:00+05:30") <= today;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl transition-colors"
        style={{
          background: dark ? "#111827" : "#ffffff",
          border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
          color: dark ? "#ffffff" : "#1e293b"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top toolbar ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => watchlist.toggle(ipo.id)}
              className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors cursor-pointer"
              style={{
                background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                borderColor: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                color: watched ? BRAND.blue : (dark ? "#94a3b8" : "#475569")
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
          <span className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live Data
          </span>
        </div>

        {/* ── Company header ── */}
        <div className="flex items-start gap-4 px-5 py-4">
          <CompanyAvatar name={ipo.company} logoUrl={ipo.logoUrl} size={52} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-extrabold tracking-tight" style={{ color: dark ? "#ffffff" : "#1e293b" }}>{ipo.company}</h2>
              <span
                className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wider"
                style={
                  ipo.type === "Mainboard"
                    ? { background: "rgba(245,158,11,0.2)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }
                    : { background: "rgba(139,92,246,0.2)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }
                }
              >
                {ipo.type === "Mainboard" ? "MAINBOARD" : "SME"}
              </span>
            </div>
            <p className="text-sm mt-1" style={{ color: dark ? "#94a3b8" : "#475569" }}>
              {ipo.sector} · Exchange: {ipo.exchange} · Lead Manager: {ipo.leadManager}
            </p>
          </div>
        </div>

        <div className="px-5 pb-5 space-y-5">
          {/* About */}
          <p className="text-sm leading-relaxed" style={{ color: dark ? "#94a3b8" : "#475569" }}>{ipo.about}</p>

          {/* ── 3 key metric cards ── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Price band", ipo.priceMin ? `₹${ipo.priceMin}-${ipo.priceMax}` : "-", "priceMax"],
              ["Lot size", ipo.lot || "-", "lot"],
              ["Issue size", ipo.issueSize ? `₹${Number(ipo.issueSize).toLocaleString("en-IN")} Cr` : "-", "issueSize"],
            ].map(([label, value, field]) => {
              const pending = isPending(ipo, field);
              return (
              <div
                key={label}
                className="rounded-2xl p-4"
                style={{
                  background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                  border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)"
                }}
              >
                <p className="text-xs font-medium mb-1.5 flex items-center" style={{ color: "#64748b" }}>{label}<VerifyMark ipo={ipo} field={field} /></p>
                {pending ? (
                  <p className="text-[13px] font-semibold text-slate-400 dark:text-slate-500 italic">Pending verification</p>
                ) : (
                  <p className="text-xl font-extrabold font-mono tracking-tight" style={{ color: dark ? "#ffffff" : "#1e293b" }}>{value}</p>
                )}
              </div>
              );
            })}
          </div>

          {/* Secondary metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ["Face value", ipo.faceValue != null ? `₹${ipo.faceValue}` : "-", "faceValue"],
              ["Min. investment", ipo.lot ? rupee(investment(ipo)) : "-", null],
              ["Fresh issue", ipo.freshIssue ? `₹${ipo.freshIssue} Cr` : "-", "freshIssue"],
              ["OFS", ipo.ofs ? `₹${ipo.ofs} Cr` : "-", "ofs"],
            ].map(([l, v, field]) => (
              <div
                key={l}
                className="rounded-xl p-3"
                style={{
                  background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
                  border: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.04)"
                }}
              >
                <p className="text-[10px] font-medium mb-1 flex items-center" style={{ color: "#64748b" }}>{l}{field && <VerifyMark ipo={ipo} field={field} />}</p>
                <p className="font-mono text-sm font-semibold" style={{ color: dark ? "#ffffff" : "#1e293b" }}>{field ? gatedText(ipo, field, v) : v}</p>
              </div>
            ))}
          </div>

          {/* ── Important Dates timeline ── */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
              border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)"
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: "#64748b" }}>
              Important Dates
            </p>
            {/* Timeline line + dots */}
            <div className="relative mb-3">
              {/* Track line */}
              <div className="absolute top-[9px] left-[10px] right-[10px] h-0.5 rounded-full" style={{ background: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }} />
              {/* Filled progress line */}
              <div
                className="absolute top-[9px] left-[10px] h-0.5 rounded-full transition-all"
                style={{
                  background: BRAND.blue,
                  width: `${(milestones.filter((m) => isPast(m.date)).length / (milestones.length - 1)) * (100 - (100 / milestones.length))}%`,
                }}
              />
              {/* Dots row */}
              <div className="relative flex justify-between">
                {milestones.map((m, i) => {
                  const done = isPast(m.date);
                  return (
                    <div key={m.label} className="flex flex-col items-center">
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                        style={{
                          background: done ? BRAND.blue : "transparent",
                          borderColor: done ? BRAND.blue : (dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"),
                        }}
                      >
                        {done && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Labels row */}
            <div className="flex justify-between">
              {milestones.map((m) => (
                <div key={m.label} className="flex flex-col items-center text-center min-w-0">
                  <p className="text-xs font-semibold" style={{ color: isPast(m.date) ? (dark ? "#e2e8f0" : "#1e293b") : "#64748b" }}>{m.label}</p>
                  <p className="text-[11px] font-mono mt-0.5" style={{ color: "#64748b" }}>{m.date}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Estimated listing profit (pre-listing) ── */}
          {ipo.status !== "Listed" && ipo.lot > 0 && ipo.gmp > 0 && (
            <div
              className="rounded-2xl p-4"
              style={{
                background: dark ? "rgba(22,163,74,0.12)" : "rgba(16,185,129,0.08)",
                border: dark ? "1px solid rgba(22,163,74,0.25)" : "1px solid rgba(16,185,129,0.20)"
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold" style={{ color: dark ? "#ffffff" : "#1b4332" }}>Estimated listing profit (1 lot)</p>
                  <div className="flex items-center gap-4 mt-2 text-sm" style={{ color: dark ? "#94a3b8" : "#2d6a4f" }}>
                    <span>Investment: <span className="font-mono font-semibold" style={{ color: dark ? "#ffffff" : "#1b4332" }}>{rupee(investment(ipo))}</span></span>
                    <span>GMP × lot: <span className="font-mono font-semibold" style={{ color: dark ? "#ffffff" : "#1b4332" }}>{rupee(ipo.gmp * ipo.lot)}</span></span>
                  </div>
                </div>
                <p className="text-2xl font-extrabold font-mono" style={{ color: dark ? "#4ade80" : "#10b981" }}>
                  +{rupee(profitPerLot(ipo))}
                </p>
              </div>
            </div>
          )}

          {/* ── Listing performance (post-listing) ── */}
          {ipo.status === "Listed" && (
            <div
              className="rounded-2xl p-4"
              style={{
                background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)"
              }}
            >
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#64748b" }}>Listing Performance</p>
              {ipo.listedAt ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    ["Issue price", rupee(ipo.priceMax)],
                    ["Listing price", rupee(ipo.listedAt)],
                    ["Listing gain", `${listingGainPct(ipo)?.toFixed(1)}%`],
                    ["P&L / lot", `${listingProfitLossPerLot(ipo) >= 0 ? "+" : ""}${rupee(listingProfitLossPerLot(ipo))}`],
                    ["Listing date", ipo.listing],
                    ...(ipo.currentPrice ? [
                      ["Current price", rupee(ipo.currentPrice)],
                      ["Current return", `${currentReturnPct(ipo)?.toFixed(1)}%`]
                    ] : []),
                  ].map(([l, v]) => (
                    <div
                      key={l}
                      className="rounded-xl p-2.5"
                      style={{
                        background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
                        border: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.04)"
                      }}
                    >
                      <p className="text-[10px] font-medium mb-0.5" style={{ color: "#64748b" }}>{l}</p>
                      <p
                        className="font-mono text-sm font-semibold"
                        style={{
                          color: l === "Listing gain" || l === "P&L / lot" || l === "Current return"
                            ? (() => {
                                const num = parseFloat(v.replace(/[^\d.-]/g, ""));
                                if (num > 0) return dark ? "#4ade80" : "#16a34a";
                                if (num < 0) return dark ? "#f87171" : "#dc2626";
                                return dark ? "#94a3b8" : "#64748b";
                              })()
                            : (dark ? "#e2e8f0" : "#1e293b")
                        }}
                      >
                        {v}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "#64748b" }}>Listed on {ipo.listing} — actual listing price not yet recorded.</p>
              )}
            </div>
          )}

          {/* ── GMP History chart ── */}
          {ipo.gmpHistory?.length > 1 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>GMP History</p>
              <div
                className="rounded-2xl p-3"
                style={{
                  background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                  border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)"
                }}
              >
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={ipo.gmpHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke={dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"} />
                    <XAxis dataKey="d" fontSize={10} stroke={dark ? "#475569" : "#64748b"} tick={{ fill: dark ? "#94a3b8" : "#475569" }} />
                    <YAxis fontSize={10} stroke={dark ? "#475569" : "#64748b"} width={35} tick={{ fill: dark ? "#94a3b8" : "#475569" }} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, background: dark ? "#1e2a3a" : "#ffffff", border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", color: dark ? "#e2e8f0" : "#1e293b" }} />
                    <Line type="monotone" dataKey="v" stroke={BRAND.blue} strokeWidth={2.5} dot={{ r: 3, fill: BRAND.blue }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Subscription Details & Allotment Odds Table ── */}
          {(ipo.sub || ipo.status === "Upcoming" || ipo.status === "DRHP Filed") && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#64748b" }}>Subscription & Allotment Odds</p>
              <SubscriptionDetailsList ipo={ipo} dark={dark} />
            </div>
          )}

          {/* ── Financials ── */}
          {ipo.fin && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#64748b" }}>Financials (latest FY)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[["Revenue", cr(ipo.fin.revenue)], ["PAT", cr(ipo.fin.pat)], ["EBITDA", ipo.fin.ebitda ? cr(ipo.fin.ebitda) : "-"],
                  ["Net worth", cr(ipo.fin.netWorth)], ["Debt", cr(ipo.fin.debt)],
                  ["EPS", ipo.fin.eps != null ? `₹${ipo.fin.eps}` : "-"],
                  ["P/E", ipo.fin.pe != null ? `${ipo.fin.pe}x` : "-"],
                  ["ROE", ipo.fin.roe != null ? `${ipo.fin.roe}%` : "-"]].map(([l, v]) => (
                  <div
                    key={l}
                    className="rounded-xl p-2.5"
                    style={{
                      background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
                      border: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.04)"
                    }}
                  >
                    <p className="text-[10px] font-medium mb-0.5" style={{ color: "#64748b" }}>{l}</p>
                    <p className="font-mono text-sm font-semibold" style={{ color: dark ? "#ffffff" : "#1e293b" }}>{v}</p>
                  </div>
                ))}
              </div>

              {/* ── Verification Metadata Overlay ── */}
              {ipo.finMeta && (
                <div className="mt-2.5 p-3 rounded-xl border flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-medium justify-between items-center"
                  style={{
                    background: dark ? "rgba(28,155,218,0.05)" : "rgba(28,155,218,0.03)",
                    borderColor: dark ? "rgba(28,155,218,0.12)" : "rgba(28,155,218,0.08)",
                    color: dark ? "#94a3b8" : "#475569"
                  }}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] font-bold">Trace</span>
                    <a href={ipo.finMeta.sourceUrl} target="_blank" rel="noreferrer" className="underline font-bold" style={{ color: BRAND.blue }}>
                      Official {ipo.finMeta.sourceDoc} Filing (Pg. {ipo.finMeta.pageNum || "N/A"})
                    </a>
                  </div>
                  <div className="flex gap-3 font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <span>{ipo.finMeta.fy}</span>
                    <span>•</span>
                    <span>Audit Date: {ipo.finMeta.filingDate}</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ {ipo.finMeta.status}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Strengths / Risks ── */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Strengths</p>
              <ul className="space-y-2">
                {ipo.strengths?.map((s) => (
                  <li key={s} className="text-xs flex gap-2" style={{ color: dark ? "#94a3b8" : "#475569" }}>
                    <span style={{ color: "#4ade80" }}>●</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Risks</p>
              <ul className="space-y-2">
                {ipo.risks?.map((s) => (
                  <li key={s} className="text-xs flex gap-2" style={{ color: dark ? "#94a3b8" : "#475569" }}>
                    <span style={{ color: "#f87171" }}>●</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-555">
            Strengths/risks are general analytical notes based on public business descriptions. Read the full DRHP/RHP before investing.
          </p>

          {/* ── Documents ── */}
          <div className="flex flex-col gap-3">
            {(() => {
              const hasValidDrhp = !!ipo.drhp;
              const hasValidRhp = !!ipo.rhp;

              if (!hasValidDrhp && !hasValidRhp) {
                return (
                  <p
                    className="text-sm p-3 rounded-xl text-center text-slate-500"
                    style={{
                      background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
                      border: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.04)"
                    }}
                  >
                    Official DRHP/RHP is currently unavailable.
                  </p>
                );
              }

              return (
                <div className="flex gap-3">
                  {hasValidDrhp && (
                    <a
                      href={ipo.drhp}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                      style={{
                        background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                        border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
                        color: dark ? "#94a3b8" : "#475569"
                      }}
                    >
                      <FileText size={14} />
                      {isPortalLink(ipo.drhp) ? "Exchange DRHP Portal" : "DRHP"}
                      <ExternalLink size={11} />
                    </a>
                  )}
                  {hasValidRhp && (
                    <a
                      href={ipo.rhp}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                      style={{
                        background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                        border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
                        color: dark ? "#94a3b8" : "#475569"
                      }}
                    >
                      <FileText size={14} />
                      {isPortalLink(ipo.rhp) ? "Exchange RHP Portal" : "RHP"}
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Internal links */}
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { tab: "allotment", label: "Allotment" },
              { tab: "subscriptions", label: "Subscription" },
              { tab: "financials", label: "Financials" },
              { tab: "gmp", label: "Live GMP" },
            ].map(({ tab: t, label }) => (
              <a
                key={t}
                href={TAB_PATHS[t]}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  onNavigateTab?.(t);
                }}
                className="px-3 py-1.5 rounded-lg font-semibold no-underline"
                style={{
                  background: dark ? "rgba(28,155,218,0.12)" : "rgba(28,155,218,0.08)",
                  color: BRAND.blue,
                  border: "1px solid rgba(28,155,218,0.25)",
                }}
              >
                {label}
              </a>
            ))}
          </div>

          {/* FAQ */}
          {faqs.length > 0 && (
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{
                background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#64748b" }}>
                FAQ — {displayIpoName(ipo)} IPO
              </p>
              {faqs.map((f) => (
                <div key={f.question}>
                  <p className="text-xs font-bold mb-1" style={{ color: dark ? "#e2e8f0" : "#1e293b" }}>
                    {f.question}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: dark ? "#94a3b8" : "#475569" }}>
                    {f.answer}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Similar IPOs */}
          {related.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>
                Similar IPOs
              </p>
              <div className="flex flex-col gap-2">
                {related.map((rel) => (
                  <a
                    key={rel.id}
                    href={ipoPath(rel.id)}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                      e.preventDefault();
                      onOpen?.(rel);
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl no-underline transition-colors"
                    style={{
                      background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
                      border: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.04)",
                    }}
                  >
                    <CompanyAvatar name={rel.company} logoUrl={rel.logoUrl} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate" style={{ color: dark ? "#fff" : "#1e293b" }}>
                        {rel.company}
                      </p>
                      <p className="text-[10px]" style={{ color: "#64748b" }}>
                        {rel.sector} · {rel.type}
                      </p>
                    </div>
                    <ChevronRight size={14} style={{ color: BRAND.blue }} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
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
function GMPTab({ tick, onOpen }) {
  const data = useMemo(() => {
    return [...getLiveIPOS()]
      .sort((a, b) => gainPct(b) - gainPct(a))
      .map((i) => ({ 
        name: i.name, 
        pct: Number(gainPct(i).toFixed(1)),
        gmp: i.gmp,
        dateRange: `${i.open} to ${i.close}`,
        rawIpo: i
      }));
  }, [tick]);

  return (
    <div className="bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm dark:shadow-xl">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 size={16} className="text-slate-500" />
        <h2 className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
          GMP % gain — all IPOs (Click to view details)
        </h2>
      </div>
      
      {(() => {
        const truncateName = (name) => {
          if (!name) return "";
          return name.length > 22 ? `${name.slice(0, 20)}...` : name;
        };

        return (
          <ResponsiveContainer width="100%" height={Math.max(400, data.length * 36)}>
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 70, top: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="gmpGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1a5d3f" />
                  <stop offset="100%" stopColor="#2eaf73" />
                </linearGradient>
                <linearGradient id="neutralGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#94a3b8" />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" horizontal={false} vertical={true} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} domain={[0, (max) => Math.ceil(max * 1.15)]} />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="#64748b" 
                fontSize={11} 
                fontWeight={600} 
                width={155} 
                interval={0} 
                axisLine={false} 
                tickLine={false}
                tick={(props) => {
                  const { x, y, payload } = props;
                  const item = data.find((d) => d.name === payload.value);
                  return (
                    <g 
                      transform={`translate(${x},${y})`} 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item?.rawIpo) onOpen?.(item.rawIpo);
                      }}
                      className="cursor-pointer group"
                    >
                      <text 
                        x={-145} 
                        y={0} 
                        dy={4} 
                        textAnchor="start" 
                        fill="currentColor" 
                        className="text-slate-600 group-hover:text-[#1c9bda] dark:text-slate-400 dark:group-hover:text-[#1c9bda] transition-colors"
                      >
                        {truncateName(payload.value)}
                      </text>
                    </g>
                  );
                }}
              />
              
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-3 rounded-2xl shadow-xl text-xs space-y-2">
                        <div className="flex items-center gap-2">
                          <CompanyAvatar name={item.name} logoUrl={item.rawIpo?.logoUrl} size={28} />
                          <p className="font-bold text-slate-800 dark:text-slate-100">{item.name}</p>
                        </div>
                        <p className="text-slate-400 dark:text-slate-550 font-mono">{item.dateRange}</p>
                        <p className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">GMP: {item.pct}% (₹{item.gmp})</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">Click to open details</p>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ fill: "rgba(148, 163, 184, 0.04)" }} 
              />
              
              <Bar 
                dataKey="pct" 
                radius={[0, 6, 6, 0]} 
                barSize={20}
                onClick={(entry) => {
                  if (entry?.rawIpo) onOpen?.(entry.rawIpo);
                }}
                style={{ cursor: "pointer" }}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.pct > 0 ? "url(#gmpGradient)" : "url(#neutralGradient)"} 
                  />
                ))}
                <LabelList 
                  dataKey="pct" 
                  position="right" 
                  offset={8}
                  fill="#64748b" 
                  fontSize={10} 
                  fontWeight={700} 
                  formatter={(v) => v > 0 ? `${v}%` : ""} 
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      })()}
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
      className="bg-white dark:bg-[#161c28] border border-slate-150 dark:border-white/5 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full cursor-pointer no-underline text-inherit"
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
function SubscriptionsTab({ dark }) {
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
  
  const displayedIpos = sortIposLogically(allIpos.filter((i) => i.type === filterType));

  const statusBadge = {
    Open:     { bg: dark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)", color: "#10b981", border: dark ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(16,185,129,0.2)" },
    Closed:   { bg: dark ? "rgba(148,163,184,0.1)" : "rgba(148,163,184,0.08)", color: dark ? "#94a3b8" : "#64748b", border: dark ? "1px solid rgba(148,163,184,0.2)" : "1px solid rgba(148,163,184,0.15)" },
    Upcoming: { bg: dark ? "rgba(240,162,2,0.12)" : "rgba(240,162,2,0.08)",  color: "#d97706", border: dark ? "1px solid rgba(240,162,2,0.25)" : "1px solid rgba(240,162,2,0.2)" },
    Listed:   { bg: dark ? "rgba(28,155,218,0.12)" : "rgba(28,155,218,0.08)", color: BRAND.blue, border: dark ? "1px solid rgba(28,155,218,0.25)" : "1px solid rgba(28,155,218,0.2)" },
  };

  const getIpoDay = (ipo) => getIpoBiddingDay(ipo);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
            IPO Subscriptions & Allotment Odds
          </h1>
        </div>

        {/* Mainboard | SME Toggle */}
        <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-xl flex items-center border border-slate-150 dark:border-white/5 self-start sm:self-auto">
          <button
            onClick={() => handleFilterChange("Mainboard")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === "Mainboard"
                ? "bg-[#1c9bda] text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
            }`}
          >
            Mainboard ({mainboardCount})
          </button>
          <button
            onClick={() => handleFilterChange("SME")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === "SME"
                ? "bg-[#1c9bda] text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
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
                background: dark ? "#111827" : "#ffffff",
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
                <p className="text-xs font-semibold mb-4" style={{ color: dark ? "#94a3b8" : "#64748b" }}>
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
function FinancialsTab({ onOpen, dark }) {
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
  
  const displayedIpos = sortIposLogically(allIpos.filter((i) => i.type === filterType));

  const MetricBox = ({ label, value, isNA, span = 1 }) => (
    <div
      className={`rounded-xl p-3 flex flex-col justify-between min-h-[72px] ${span === 2 ? "col-span-2" : ""}`}
      style={{
        background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
        border: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.05)"
      }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: dark ? "#64748b" : "#94a3b8" }}>{label}</span>
      <span
        className="text-sm font-bold font-mono mt-1"
        style={{ color: isNA ? (dark ? "#475569" : "#94a3b8") : (dark ? "#f1f5f9" : "#1e293b") }}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
            Company Financial Metrics Grid
          </h1>
        </div>

        {/* Mainboard | SME Toggle */}
        <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-xl flex items-center border border-slate-150 dark:border-white/5 self-start sm:self-auto">
          <button
            onClick={() => handleFilterChange("Mainboard")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === "Mainboard"
                ? "bg-[#1c9bda] text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
            }`}
          >
            Mainboard ({mainboardCount})
          </button>
          <button
            onClick={() => handleFilterChange("SME")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === "SME"
                ? "bg-[#1c9bda] text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
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
                background: dark ? "#111827" : "#ffffff",
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
                    color: dark ? "#94a3b8" : "#475569"
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
function DocumentsTab({ onOpen }) {
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

  const displayedIpos = sortDocumentsLogically(allIpos.filter((i) => i.type === filterType));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Official Filings & Documents</h1>
          <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">Mainboard IPOs link to official SEBI filings. SME IPOs link to exchange offer documents.</p>
        </div>

        {/* Mainboard | SME Toggle */}
        <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-xl flex items-center border border-slate-150 dark:border-white/5 self-start sm:self-auto">
          <button
            onClick={() => handleFilterChange("Mainboard")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === "Mainboard"
                ? "bg-[#1c9bda] text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
            }`}
          >
            Mainboard ({mainboardCount})
          </button>
          <button
            onClick={() => handleFilterChange("SME")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === "SME"
                ? "bg-[#1c9bda] text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
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
function WatchlistTab({ watchlist, onOpen, dark }) {
  const items = sortIposLogically(getLiveIPOS().filter((i) => watchlist.ids.includes(i.id)));
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
        <p className="text-[15px] relative z-10" style={{ color: dark ? "#94a3b8" : "#475569" }}>
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
            className="bg-white dark:bg-[#161c28] border border-slate-150 dark:border-white/5 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between"
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
  return (
    <div
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}
      className={`bg-white dark:bg-[#161c28] border border-slate-150 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all duration-200
        ${clickable ? "cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-900 active:scale-95" : ""}`}
    >
      <div>
        <p className="text-3xl font-extrabold text-slate-850 dark:text-white font-mono tracking-tight leading-none">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-semibold tracking-wide">{label}</p>
        {clickable && <p className="text-[9px] text-slate-400 dark:text-slate-600 mt-1 tracking-wider uppercase">View all →</p>}
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
  { id: "allotment", label: "IPO Allotment", icon: BookmarkCheck },
  { id: "open", label: "Open IPOs", icon: CircleDollarSign },
  { id: "upcoming", label: "Upcoming IPOs", icon: Calendar },
  { id: "closed", label: "Closed IPOs", icon: Clock },
  { id: "listed", label: "Listed IPOs", icon: Building2 },
  { id: "gmp", label: "GMP Trends", icon: TrendingUp },
  { id: "subscriptions", label: "Subscriptions", icon: LayoutGrid },
  { id: "financials", label: "Financials", icon: BarChart3 },
  { id: "docs", label: "DRHP / RHP", icon: FileText },
  { id: "calculator", label: "IPO Calculator", icon: CalcIcon },
  { id: "watchlist", label: "Watchlist", icon: Bookmark },
  { id: "demat", label: "Open Demat Account", icon: Landmark },
].filter((n) => n.id !== "ai" || AI_ASSISTANT_ENABLED);

export default function App() {
  const [loadingDb, setLoadingDb] = useState(true);
  const [tab, setTabRaw] = useState(() => {
    try {
      if (typeof window !== "undefined") {
        const fromPath = parseLocation(window.location.pathname, window.location.search);
        if (fromPath.tabId && NAV.some((n) => n.id === fromPath.tabId)) return fromPath.tabId;
      }
      const saved = localStorage.getItem("calmcapital-tab");
      if (saved && NAV.some((n) => n.id === saved)) return saved;
    } catch { /* storage unavailable */ }
    return "overview";
  });
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [upcomingType, setUpcomingType] = useState("Mainboard");
  const [listedType, setListedType] = useState("Mainboard");
  const [closedType, setClosedType] = useState("Mainboard");
  const lastTabPathRef = useRef(TAB_PATHS["overview"] || "/");

  const handleSelectIpo = (ipo) => {
    try {
      if (ipo) {
        const parsed = parseLocation(window.location.pathname, window.location.search);
        if (!parsed.ipoId) {
          lastTabPathRef.current = TAB_PATHS[tab] || "/";
        }
        setSelected(ipo);
        const path = ipoPath(ipo.id);
        if ((window.location.pathname.replace(/\/+$/, "") || "/") !== path) {
          window.history.pushState(null, "", path);
        }
        const meta = applyIpoSeo(ipo);
        trackPageView(meta.path, meta.title);
      } else {
        setSelected(null);
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
      const found = all.find((i) => i.id === parsed.ipoId) || null;
      setSelected(found);
      if (found) {
        const meta = applyIpoSeo(found);
        trackPageView(meta.path, meta.title);
      } else {
        applyTabSeo(tab);
      }
      return;
    }

    if (parsed.tabId && NAV.some((n) => n.id === parsed.tabId)) {
      setTabRaw(parsed.tabId);
      lastTabPathRef.current = TAB_PATHS[parsed.tabId] || "/";
      try { localStorage.setItem("calmcapital-tab", parsed.tabId); } catch { /* ignore */ }
      const meta = applyTabSeo(parsed.tabId);
      const navItem = NAV.find((n) => n.id === parsed.tabId);
      trackTabView(parsed.tabId, navItem?.label, meta.path, meta.title);
    } else {
      const meta = applyTabSeo(tab);
      trackTabView(tab, NAV.find((n) => n.id === tab)?.label, meta.path, meta.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingDb]);

  // Listen to browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const all = getLiveIPOS();
      const parsed = parseLocation(window.location.pathname, window.location.search);
      if (parsed.ipoId) {
        const found = all.find((i) => i.id === parsed.ipoId) || null;
        setSelected(found);
        if (found) applyIpoSeo(found);
        return;
      }
      setSelected(null);
      if (parsed.tabId && NAV.some((n) => n.id === parsed.tabId)) {
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
    fetch(`/ipos.json?t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        IPOS_BASE = data;
        setLoadingDb(false);
        setTick((t) => t + 1);
        setLiveDataVersion((v) => v + 1);
      })
      .catch((err) => {
        console.error("Failed to load dynamic IPO database:", err?.message || "[REDACTED]");
        setLoadingDb(false);
      });
  }, []);


  const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobile());
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("calmcapital-theme");
      if (saved !== null) return JSON.parse(saved);
    } catch { /* storage unavailable */ }
    return true; // default default
  });

  useEffect(() => {
    try {
      localStorage.setItem("calmcapital-theme", JSON.stringify(dark));
    } catch { /* storage unavailable */ }
  }, [dark]);

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

  // Close sidebar when viewport shrinks to mobile
  useEffect(() => {
    const handler = () => { if (window.innerWidth < 768) setSidebarOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  const [refreshing, setRefreshing] = useState(false);
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

  const refresh = () => { setRefreshing(true); syncNow().finally(() => setTimeout(() => setRefreshing(false), 900)); };

  const groupedFiltered = (status) =>
    sortIposLogically(filtered.filter((i) => getComputedStatus(i) === status));

  if (loadingDb) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center dark" style={{
        background: "radial-gradient(circle at 30% 50%, rgba(28,155,218,0.18), transparent 60%), radial-gradient(circle at 80% 20%, rgba(174,215,104,0.06), transparent 50%), #0a0d16",
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
          ? "radial-gradient(circle at 30% 50%, rgba(28,155,218,0.18), transparent 60%), radial-gradient(circle at 80% 20%, rgba(174,215,104,0.06), transparent 50%), #0a0d16"
          : "#f1f5f9",
        color: dark ? "#e2e8f0" : "#1e293b",
      }}>
        <style>{`
          .glass {
            background: ${dark ? "linear-gradient(180deg, rgba(22, 28, 42, 0.95), rgba(15, 20, 32, 0.95))" : "#ffffff"};
            backdrop-filter: blur(20px) saturate(160%);
            -webkit-backdrop-filter: blur(20px) saturate(160%);
            border: 1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"};
            box-shadow: ${dark ? "0 12px 40px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)" : "0 10px 30px -10px rgba(148, 163, 184, 0.16), 0 1px 2px rgba(0,0,0,0.02)"};
            transition: box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease;
          }
          .glass-inset {
            background: ${dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"};
            border: 1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"};
            transition: background 0.2s ease, border-color 0.2s ease;
          }
          .glass-hover:hover {
            box-shadow: ${dark ? "0 20px 40px -15px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)" : "0 16px 36px -12px rgba(148, 163, 184, 0.25)"};
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
          .dark .text-slate-400 { color: #94a3b8; }
          .dark .text-slate-300 { color: #64748b; }
          .text-profit { color: #16a34a; }
          .dark .text-profit { color: #4ade80; font-weight: 600; }
          .text-loss { color: #dc2626; }
          .dark .text-loss { color: #f87171; font-weight: 600; }
          .dark .border-black\\/5 { border-color: rgba(255,255,255,0.06); }
          .dark .border-black\\/10 { border-color: rgba(255,255,255,0.1); }
          .dark .bg-white\\/70, .dark .bg-white\\/80, .dark .bg-white\\/5, .dark .bg-white\\/10 { background: rgba(255,255,255,0.04); }
          .dark .bg-white\\/95 { background: rgba(10,13,22,0.98); }
          .dark .border-white { border-color: rgba(255,255,255,0.08); }
          .dark .shadow-2xl { box-shadow: 0 25px 60px -15px rgba(0,0,0,0.85); }
          .dark .hover\\:bg-white:hover { background: rgba(255,255,255,0.06) !important; }
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
            borderColor: dark ? "rgba(255,255,255,0.06)" : "rgba(219,234,254,0.8)",
            background: dark ? "#0a0d16" : "#f0f7ff"
          }}>
          <div className="w-60 p-4 flex flex-col h-full">
            {/* Brand */}
            <div className="flex items-start justify-between mb-4 pt-1">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Calm Capital Logo" className="w-9 h-9 object-contain rounded-xl" />
                <div className="flex flex-col">
                  <p className="text-sm font-bold tracking-tight leading-tight" style={{ color: dark ? "#fff" : "#1e293b" }}>Calm Capital</p>
                  <p className="text-[10px] font-semibold tracking-wider uppercase mt-0.5" style={{ color: dark ? "#94a3b8" : "#64748b" }}>Designed by Discipline</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-black/5 rounded-lg mt-0.5">
                <ChevronsLeft size={15} />
              </button>
            </div>

            <nav className="mt-4 space-y-0.5 flex-1 overflow-y-auto">
              {NAV.map((n) => {
                const isActive = tab === n.id && !selected;
                return (
                  <a
                    key={n.id}
                    href={TAB_PATHS[n.id] || "/"}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                      e.preventDefault();
                      setTab(n.id);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm relative transition-colors no-underline cursor-pointer"
                    style={isActive
                      ? {
                          background: dark ? "rgba(28,155,218,0.12)" : "rgba(28,155,218,0.08)",
                          color: BRAND.blue,
                          fontWeight: 700,
                          borderLeft: `3px solid ${BRAND.blue}`,
                          paddingLeft: "9px",
                        }
                      : {
                          color: dark ? "#94a3b8" : "#475569",
                          fontWeight: 500,
                          paddingLeft: "12px",
                        }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = dark ? "rgba(255,255,255,0.04)" : "rgba(28,155,218,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <n.icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                    {n.label}
                  </a>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* MAIN */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* HEADER */}
          <header className="flex items-center gap-3 px-5 py-4 border-b sticky top-0 z-20 backdrop-blur-lg"
            style={{ 
              borderColor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", 
              background: dark ? "rgba(10,13,22,0.8)" : "rgba(255,255,255,0.8)" 
            }}>
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg mr-1">
                <Menu size={18} />
              </button>
            )}

            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for company IPOs..."
                className="w-full bg-white dark:bg-[#0e1320] border border-slate-200 dark:border-slate-800 rounded-2xl pl-9 pr-4 py-2 text-base md:text-sm outline-none shadow-sm focus:glow-blue placeholder:text-slate-400 text-slate-800 dark:text-slate-200" />
            </div>

            <div className="ml-auto flex items-center gap-2.5 relative">
              <div className="hidden sm:flex items-center">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-[#121625]/30 text-slate-600 dark:text-slate-300 shadow-sm cursor-default">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[11px] font-semibold tracking-tight">Live Prices</span>
                </div>
              </div>

              <button onClick={refresh} className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-[#121625]/30 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 shadow-sm">
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              </button>
              <NotificationBell hook={notifHook} onOpenIpo={(ipoId) => { const found = getLiveIPOS().find((i) => i.id === ipoId); if (found) handleSelectIpo(found); }} />
              <button onClick={() => setDark((d) => !d)} className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-[#121625]/30 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 shadow-sm">
                {dark ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-5 py-5 max-w-5xl w-full mx-auto">
            <div key={tab} className="tab-enter">
            {tab === "overview" && (
              <div className="space-y-5">
                {/* Page title */}
                <div>
                  <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
                    Calm Capital — Live GMP & Institutional-Grade IPO Analysis
                  </h1>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard icon={ArrowUpRight} label="Open IPOs" value={counts.Open} tint={BRAND.blue} onClick={() => setTab("open")} />
                  <StatCard icon={Calendar} label="Upcoming" value={counts.Upcoming} tint={BRAND.blue} onClick={() => setTab("upcoming")} />
                  <StatCard icon={Clock} label="Closed IPOs" value={counts.Closed} tint={BRAND.blue} onClick={() => setTab("closed")} />
                  <StatCard icon={LayoutGrid} label="Listed" value={counts.Listed} tint={BRAND.blue} onClick={() => setTab("listed")} />
                </div>

                {/* IPO lists grouped by status */}
                {["Open", "Upcoming", "Closed", "Listed"].map((status) => groupedFiltered(status).length > 0 && (
                  <section key={status}>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {groupedFiltered(status).map((ipo) => <IPOCard key={ipo.id} ipo={ipo} onOpen={handleSelectIpo} watchlist={watchlist} dark={dark} />)}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {tab === "open" && (
              <div>
                {groupedFiltered("Open").length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {groupedFiltered("Open").map((ipo) => <IPOCard key={ipo.id} ipo={ipo} onOpen={handleSelectIpo} watchlist={watchlist} dark={dark} />)}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#161c28] border border-slate-150 dark:border-white/5 rounded-2xl p-12 text-center">
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
                    <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Closed IPOs</h1>
                    
                    {/* Mainboard | SME Toggle */}
                    <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-xl flex items-center border border-slate-150 dark:border-white/5 self-start sm:self-auto">
                      <button
                        onClick={() => setClosedType("Mainboard")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          closedType === "Mainboard"
                            ? "bg-[#1c9bda] text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
                        }`}
                      >
                        Mainboard ({closedMainboardCount})
                      </button>
                      <button
                        onClick={() => setClosedType("SME")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          closedType === "SME"
                            ? "bg-[#1c9bda] text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
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
                    <div className="bg-white dark:bg-[#161c28] border border-slate-150 dark:border-white/5 rounded-2xl p-12 text-center">
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
                    <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Upcoming IPOs</h1>
                    
                    {/* Mainboard | SME Toggle */}
                    <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-xl flex items-center border border-slate-150 dark:border-white/5 self-start sm:self-auto">
                      <button
                        onClick={() => setUpcomingType("Mainboard")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          upcomingType === "Mainboard"
                            ? "bg-[#1c9bda] text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
                        }`}
                      >
                        Mainboard ({upcomingMainboardCount})
                      </button>
                      <button
                        onClick={() => setUpcomingType("SME")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          upcomingType === "SME"
                            ? "bg-[#1c9bda] text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
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
                    <div className="bg-white dark:bg-[#161c28] border border-slate-150 dark:border-white/5 rounded-2xl p-12 text-center">
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
                    <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Listed IPOs</h1>
                    
                    {/* Mainboard | SME Toggle */}
                    <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-xl flex items-center border border-slate-150 dark:border-white/5 self-start sm:self-auto">
                      <button
                        onClick={() => setListedType("Mainboard")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          listedType === "Mainboard"
                            ? "bg-[#1c9bda] text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
                        }`}
                      >
                        Mainboard ({listedMainboardCount})
                      </button>
                      <button
                        onClick={() => setListedType("SME")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          listedType === "SME"
                            ? "bg-[#1c9bda] text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
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
                    <div className="bg-white dark:bg-[#161c28] border border-slate-150 dark:border-white/5 rounded-2xl p-12 text-center">
                      <Building2 size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                      <p className="text-slate-500 text-sm">No listed {listedType} IPOs found.</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {tab === "gmp" && <GMPTab tick={tick} onOpen={handleSelectIpo} />}
            {tab === "subscriptions" && <SubscriptionsTab dark={dark} />}
            {tab === "financials" && <FinancialsTab onOpen={handleSelectIpo} dark={dark} />}
            {tab === "docs" && <DocumentsTab onOpen={handleSelectIpo} />}
            {tab === "calculator" && <CalculatorTab onOpen={handleSelectIpo} />}
            {tab === "watchlist" && <WatchlistTab watchlist={watchlist} onOpen={handleSelectIpo} dark={dark} />}
            {tab === "demat" && <DematTab dark={dark} />}
            {AI_ASSISTANT_ENABLED && tab === "ai" && <div className="glass rounded-2xl p-5"><AssistantPane embedded tick={tick} /></div>}
            </div>
          </main>
        </div>
      </div>

      <IPODetail
        ipo={selected}
        onClose={() => handleSelectIpo(null)}
        watchlist={watchlist}
        dark={dark}
        onOpen={handleSelectIpo}
        onNavigateTab={setTab}
      />
    </div>
  );
}
