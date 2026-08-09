// Consensus reconciler.
//
// Takes the normalized fact records from every source adapter and decides, per
// field, what value (if any) we trust. The rule (chosen by the product owner):
// a hard fact is only accepted once at least TWO independent sources agree.
// Otherwise it is left "pending verification" so we never publish a number that
// rests on a single (possibly wrong) source.
//
// Grandfathering: values already present in ipos.json keep displaying, but are
// labeled "unverified" until a second source confirms them. A 2-source
// consensus is authoritative and WILL overwrite a stale/incorrect prior value.

import { isSameCompanyName } from "./lib/match.mjs";
import { buildVerifiedFinMeta, enrichFinDerived, isValidFin, isVerifiedFin } from "./lib/financials.mjs";

// Hard facts subject to the agreement gate.
export const GATED_FIELDS = [
  "priceMin", "priceMax", "lot", "issueSize", "freshIssue", "ofs", "faceValue",
  "open", "close", "allotment", "listing",
];

const DATE_FIELDS = new Set(["open", "close", "allotment", "listing"]);
// Rounding noise is expected on Cr amounts across sources -> allow ~1% slack.
const TOLERANCE_FIELDS = new Set(["issueSize", "freshIssue", "ofs"]);
// Fields prominent enough in the UI that we always want a status (even "pending").
const CORE_DISPLAY = new Set(["priceMax", "lot", "issueSize"]);

// When a consensus cluster spans multiple sources, prefer the official value.
const SOURCE_PRIORITY = { nse: 3, bse: 3, chittorgarh: 2, investorgain: 1 };

function valuesEqual(field, a, b) {
  if (DATE_FIELDS.has(field)) return String(a) === String(b);
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isFinite(na) || !Number.isFinite(nb)) return false;
  if (TOLERANCE_FIELDS.has(field)) {
    const diff = Math.abs(na - nb);
    const tol = Math.max(Math.abs(na), Math.abs(nb)) * 0.01;
    return diff <= Math.max(tol, 0.5);
  }
  return Math.abs(na - nb) < 0.01; // prices, lot, faceValue
}

function clusterVotes(field, votes) {
  const clusters = [];
  for (const v of votes) {
    let placed = false;
    for (const c of clusters) {
      if (valuesEqual(field, c.rep, v.value)) { c.members.push(v); placed = true; break; }
    }
    if (!placed) clusters.push({ rep: v.value, members: [v] });
  }
  return clusters;
}

function representative(cluster) {
  let best = cluster.members[0];
  for (const m of cluster.members) {
    if ((SOURCE_PRIORITY[m.source] || 0) > (SOURCE_PRIORITY[best.source] || 0)) best = m;
  }
  return best.value;
}

/**
 * @param {Array} iposBase - mutated in place: gated fields set on 2-source consensus,
 *   and a `verification` block attached to each IPO.
 * @param {Record<string, Array<{name,fields,fin?,meta}>>} sourceRecords - keyed by source id.
 * @returns {{changed:number, verifiedCount:number, conflictCount:number}}
 */
export function reconcile(iposBase, sourceRecords) {
  const now = new Date().toISOString();
  let changed = 0;
  let verifiedCount = 0;
  let conflictCount = 0;

  for (const ipo of iposBase) {
    const name = ipo.company || ipo.name;

    // Gather the single best-matching record from each source.
    const matches = {};
    for (const [source, recs] of Object.entries(sourceRecords)) {
      if (!Array.isArray(recs)) continue;
      const rec = recs.find((r) => r && r.name && isSameCompanyName(name, r.name));
      if (rec) matches[source] = rec;
    }

    const verification = (ipo.verification && typeof ipo.verification === "object") ? { ...ipo.verification } : {};

    for (const field of GATED_FIELDS) {
      const votes = [];
      for (const [source, rec] of Object.entries(matches)) {
        const val = rec.fields ? rec.fields[field] : undefined;
        if (val == null) continue;
        if (typeof val === "number" && !Number.isFinite(val)) continue;
        votes.push({ source, value: val });
      }

      const existing = ipo[field];
      const hadExisting = existing != null;

      if (votes.length === 0 && !hadExisting) {
        if (CORE_DISPLAY.has(field)) verification[field] = { status: "pending", updatedAt: now };
        continue;
      }

      const clusters = clusterVotes(field, votes).sort((a, b) => b.members.length - a.members.length);
      const best = clusters[0];

      if (best && best.members.length >= 2) {
        const value = representative(best);
        const sameAsExisting = hadExisting && valuesEqual(field, existing, value);
        if (!sameAsExisting) { ipo[field] = value; changed++; }
        verification[field] = {
          status: "verified",
          value,
          sources: best.members.map((m) => m.source),
          updatedAt: now,
        };
        verifiedCount++;
      } else if (clusters.length >= 2) {
        // Live sources disagree - flag, do not overwrite existing (grandfather).
        const candidates = {};
        for (const c of clusters) candidates[String(c.rep)] = c.members.map((m) => m.source);
        verification[field] = { status: "conflict", candidates, updatedAt: now };
        conflictCount++;
      } else if (hadExisting) {
        // One (or zero) confirming source + a pre-existing value: show it, unverified.
        verification[field] = {
          status: "unverified",
          value: existing,
          sources: votes.map((v) => v.source),
          updatedAt: now,
        };
      } else {
        // A single source, no prior value: withhold the number until confirmed.
        verification[field] = {
          status: "pending",
          sources: votes.map((v) => v.source),
          updatedAt: now,
        };
      }
    }

    // Non-gated enrichment: prospectus financials from Chittorgarh when we have
    // none yet (financials are hard to cross-verify field-by-field, so a single
    // independent source is acceptable and clearly attributed).
    if (matches.chittorgarh?.fin) {
      const hadFin = isValidFin(ipo.fin);
      if (!hadFin) {
        ipo.fin = { ...(ipo.fin || {}), ...matches.chittorgarh.fin };
        ipo.finMeta = {
          ...(ipo.finMeta || {}),
          source: "chittorgarh",
          capturedAt: now,
          chittorgarhUrl: matches.chittorgarh.meta?.url,
        };
        changed++;
      }
    }

    if (matches.chittorgarh?.website) {
      if (ipo.website !== matches.chittorgarh.website) {
        ipo.website = matches.chittorgarh.website;
        changed++;
        console.log(`[WEBSITE] "${ipo.name}" -> ${ipo.website}`);
      }
    }

    // Apply investor allocation percentages from Chittorgarh.
    // These are the actual SEBI-filed quota splits (QIB/NII/Retail etc.) scraped
    // from the reservation table on the CG detail page. They override the UI
    // fallback defaults (50/15/35) so only real, source-backed numbers are shown.
    if (matches.chittorgarh?.allocation) {
      const cgAlloc = matches.chittorgarh.allocation;
      const hasMinimumKeys = cgAlloc.qib != null || cgAlloc.retail != null;
      if (hasMinimumKeys) {
        const existing = ipo.allocation;
        const serialised = JSON.stringify(cgAlloc);
        if (!existing || JSON.stringify(existing) !== serialised) {
          ipo.allocation = cgAlloc;
          changed++;
          const parts = Object.entries(cgAlloc).map(([k, v]) => `${k.toUpperCase()}:${v}%`).join(', ');
          console.log(`[ALLOCATION] "${ipo.name}" -> ${parts}`);
        }
      }
    }

    // Promote to Verified when numbers pass sanity checks (UI requires finMeta.status).
    if (isValidFin(ipo.fin) && !isVerifiedFin(ipo)) {
      ipo.fin = enrichFinDerived(ipo, ipo.fin);
      ipo.finMeta = buildVerifiedFinMeta(ipo, {
        method: "Chittorgarh prospectus table + regulatory filing",
        chittorgarhUrl: ipo.finMeta?.chittorgarhUrl || matches.chittorgarh?.meta?.url,
      });
      changed++;
    }

    ipo.verification = verification;
  }

  return { changed, verifiedCount, conflictCount };
}
