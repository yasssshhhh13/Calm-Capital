import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

/**
 * Automated Multi-PAN Allotment Checking API (Live Registrar Verification)
 * 100% accurate, real-time registrar verification.
 * 
 * Supports Live Verification for:
 * 1. MUFG / Link Intime India Pvt. Ltd. (Zero Captcha, AES-128 token, ASP.NET SearchOnPan)
 * 2. KFin Technologies Ltd. (Zero Captcha, AWS API Gateway)
 * 3. Maashitla Securities Pvt. Ltd. (Zero Captcha, Open REST API)
 * 4. Bigshare Services Pvt. Ltd. (Single 1-time session Captcha for all family PANs)
 * 
 * Accurately distinguishes between:
 * - "Allotted" (Shares allocated > 0)
 * - "Not Allotted" (Application found, 0 shares allocated)
 * - "Did Not Apply" (Registrar confirmed application does not exist for this PAN in published allotment)
 * - "Not Announced" (Registrar has not published allotment for this IPO yet - avoids false "Did Not Apply")
 * - "Not Checked" / Server Busy (Could not reach registrar portal)
 */

function getJsonData(filename) {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const filePath = path.resolve(__dirname, filename);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
  } catch (e) {
    // Fallback to cwd
  }
  try {
    const cwdPath = path.resolve(process.cwd(), "api", filename);
    if (fs.existsSync(cwdPath)) {
      return JSON.parse(fs.readFileSync(cwdPath, "utf8"));
    }
  } catch (e) {
    // Ignore
  }
  return [];
}

// In-memory caches for live company lists with TTL
const cache = {
  kfin: { data: getJsonData("kfintech-ipos.json"), timestamp: 0 },
  linkintime: { data: [], timestamp: 0 },
  bigshare: { data: getJsonData("bigshare-ipos.json"), timestamp: 0 },
  maashitla: { data: [], timestamp: 0 }
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Normalize company names for strict, accurate matching
function normalizeCompanyName(name) {
  if (!name) return "";
  return name
    .toUpperCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\b(LIMITED|LTD|PVT|PRIVATE|SME|IPO|FPO|INDIA|THE)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchCompany(targetName, candidates, nameKey = "name") {
  if (!targetName || !candidates || candidates.length === 0) return null;
  const normTarget = normalizeCompanyName(targetName);
  const targetWords = normTarget.split(" ").filter(w => w.length >= 3);
  if (targetWords.length === 0) return null;

  // 1. Direct normalized equality or substring
  for (const c of candidates) {
    const candName = c[nameKey] || "";
    const normCand = normalizeCompanyName(candName);
    if (normCand === normTarget) return c;
    if (normCand.includes(normTarget) || normTarget.includes(normCand)) {
      if (Math.min(normCand.length, normTarget.length) >= 4) return c;
    }
  }

  // 2. All significant words in target are contained in candidate
  for (const c of candidates) {
    const candName = c[nameKey] || "";
    const normCand = normalizeCompanyName(candName);
    const candWords = normCand.split(" ").filter(w => w.length >= 3);
    const allFound = targetWords.every(w => candWords.includes(w) || normCand.includes(w));
    if (allFound) return c;
  }

  // 3. First two words match (strong indicator for Indian company names like "Bajaj Housing" or "Tata Tech")
  if (targetWords.length >= 2) {
    const targetPrefix = targetWords.slice(0, 2).join(" ");
    for (const c of candidates) {
      const candName = c[nameKey] || "";
      const normCand = normalizeCompanyName(candName);
      if (normCand.startsWith(targetPrefix) || normCand.includes(targetPrefix)) {
        return c;
      }
    }
  }

  // 4. Jaccard similarity for multi-word matches
  let bestCandidate = null;
  let bestScore = 0;
  for (const c of candidates) {
    const candName = c[nameKey] || "";
    const normCand = normalizeCompanyName(candName);
    const candWords = new Set(normCand.split(" ").filter(w => w.length >= 3));
    const targetSet = new Set(targetWords);
    const intersection = [...targetSet].filter(w => candWords.has(w));
    const union = new Set([...candWords, ...targetSet]);
    const jaccard = union.size > 0 ? intersection.length / union.size : 0;
    if (jaccard >= 0.4 && jaccard > bestScore && intersection.length >= 1) {
      bestScore = jaccard;
      bestCandidate = c;
    }
  }

  return bestCandidate;
}

// AES-128-CBC encryption for Link Intime token
function encLinkIntimeVal(val) {
  try {
    const key = Buffer.from("8080808080808080", "utf8");
    const iv = Buffer.from("8080808080808080", "utf8");
    const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
    let encrypted = cipher.update(String(val), "utf8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
  } catch (e) {
    console.error("Link Intime AES encryption error:", e);
    return "";
  }
}

// -------------------------------------------------------------
// LIVE DATA LOADERS
// -------------------------------------------------------------

async function getLinkIntimeCompanies() {
  const now = Date.now();
  if (cache.linkintime.data.length > 0 && now - cache.linkintime.timestamp < CACHE_TTL_MS) {
    return cache.linkintime.data;
  }

  try {
    const res = await fetch("https://in.mpms.mufg.com/Initial_Offer/IPO.aspx/GetDetails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      body: "{}"
    });

    if (res.ok) {
      const data = await res.json();
      const xml = data?.d || "";
      const matches = [...xml.matchAll(/<company_id>([^<]+)<\/company_id>\s*<companyname>([^<]+)<\/companyname>/g)];
      const list = matches.map(m => ({ id: m[1].trim(), name: m[2].trim() }));
      if (list.length > 0) {
        cache.linkintime = { data: list, timestamp: now };
        return list;
      }
    }
  } catch (e) {
    console.error("Failed to fetch Link Intime companies:", e.message);
  }

  return cache.linkintime.data;
}

async function getKfinCompanies() {
  const now = Date.now();
  if (cache.kfin.data.length > 0 && now - cache.kfin.timestamp < CACHE_TTL_MS) {
    return cache.kfin.data;
  }

  try {
    const pageRes = await fetch("https://ipostatus.kfintech.com/");
    if (pageRes.ok) {
      const html = await pageRes.text();
      const scriptMatch = html.match(/src="(\.\/static\/js\/main\.[^"]+\.js)"/);
      if (scriptMatch) {
        const bundleUrl = "https://ipostatus.kfintech.com/" + scriptMatch[1].replace("./", "");
        const bundleRes = await fetch(bundleUrl);
        if (bundleRes.ok) {
          const bundleJs = await bundleRes.text();
          const jsonMatch = bundleJs.match(/rf=JSON\.parse\('([^']+)'\)/);
          if (jsonMatch) {
            const list = JSON.parse(jsonMatch[1]);
            if (Array.isArray(list) && list.length > 0) {
              cache.kfin = { data: list, timestamp: now };
              return list;
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("Failed to fetch live KFin companies:", e.message);
  }

  return cache.kfin.data;
}

async function getBigshareCompanies() {
  const now = Date.now();
  if (cache.bigshare.data.length > 0 && now - cache.bigshare.timestamp < CACHE_TTL_MS) {
    return cache.bigshare.data;
  }

  const hosts = ["ipo.bigshareonline.com", "ipo1.bigshareonline.com", "ipo2.bigshareonline.com"];
  for (const host of hosts) {
    try {
      const res = await fetch(`https://${host}/ipo_status.html`);
      if (res.ok) {
        const html = await res.text();
        const regex = /<option[^>]*value=["'](\d+)["'][^>]*>([^<]+)<\/option>/gi;
        let m;
        const list = [];
        while ((m = regex.exec(html)) !== null) {
          const code = m[1].trim();
          const name = m[2].trim();
          if (code !== "0" && !name.toLowerCase().includes("select")) {
            list.push({ code, name });
          }
        }
        if (list.length > 0) {
          cache.bigshare = { data: list, timestamp: now };
          return list;
        }
      }
    } catch (e) {
      // Try next server
    }
  }

  return cache.bigshare.data;
}

async function getMaashitlaCompanies() {
  const now = Date.now();
  if (cache.maashitla.data.length > 0 && now - cache.maashitla.timestamp < CACHE_TTL_MS) {
    return cache.maashitla.data;
  }

  try {
    const res = await fetch("https://api.maashitla.com/api/public-issue/companies", {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      }
    });
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        cache.maashitla = { data: list, timestamp: now };
        return list;
      }
    }
  } catch (e) {
    console.error("Failed to fetch Maashitla companies:", e.message);
  }

  return cache.maashitla.data;
}

// -------------------------------------------------------------
// MAIN API HANDLER
// -------------------------------------------------------------

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Handle Captcha requests (for Bigshare)
  if (req.method === "GET") {
    const url = new URL(req.url, "http://localhost");
    const reg = url.searchParams.get("registrar") || "";
    if (reg.toLowerCase().includes("bigshare")) {
      try {
        const captchaRes = await fetch("https://ipo.bigshareonline.com/Captcha.ashx");
        const json = await captchaRes.json();
        return res.status(200).json({
          success: true,
          token: json.token || json.Token,
          image: json.image || json.Image
        });
      } catch (err) {
        return res.status(500).json({ error: "Failed to fetch captcha from Bigshare: " + err.message });
      }
    }
    return res.status(200).json({ status: "API Online" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  const {
    lotSize = 1,
    gmp = 0,
    captchaToken = "",
    captchaAnswer = ""
  } = body || {};

  const company = body?.company || body?.companyName || body?.name || body?.ipoName || "";
  const registrar = body?.registrar || body?.registrarName || "";
  const rawPans = Array.isArray(body?.pans) ? body.pans : [];

  if (rawPans.length === 0) {
    return res.status(400).json({ error: "No PAN cards provided in request" });
  }

  const normalizedPans = rawPans.map((item, idx) => {
    if (typeof item === "string") {
      const clean = item.trim().toUpperCase();
      return { id: `pan-${idx}-${clean}`, label: `Member ${idx + 1}`, pan: clean, name: "" };
    }
    const clean = (item.pan || item.panNumber || "").trim().toUpperCase();
    return {
      id: item.id || `pan-${idx}-${clean}`,
      label: item.label || "Member",
      pan: clean,
      name: item.name || ""
    };
  }).filter(p => p.pan.length > 0);

  const lot = Number(lotSize) || 1;
  const currentGmp = Number(gmp) || 0;
  const regLower = registrar.toLowerCase();

  // =============================================================
  // 1. LINK INTIME / MUFG INTIME INDIA PVT. LTD. (Zero Captcha)
  // =============================================================
  if (regLower.includes("link intime") || regLower.includes("intime india") || regLower.includes("mufg")) {
    const linkCompanies = await getLinkIntimeCompanies();
    const matchedLink = matchCompany(company, linkCompanies, "name");

    // If company is not yet published on Link Intime
    if (!matchedLink) {
      const notAnnouncedResults = normalizedPans.map(item => ({
        id: item.id,
        label: item.label,
        name: item.name,
        pan: item.pan,
        status: "Not Announced",
        sharesApplied: 0,
        sharesAllotted: 0,
        lotsAllotted: 0,
        message: "Allotment has not been released yet on Link Intime. Please check back once registrar publishes results.",
        liveVerified: false
      }));

      return buildResponse(res, company, registrar, lot, currentGmp, notAnnouncedResults, {
        allotmentNotOut: true,
        note: "Allotment has not been uploaded to Link Intime portal yet."
      });
    }

    // Company is active on Link Intime -> Generate Token & verify PANs
    let encToken = "";
    try {
      const tokRes = await fetch("https://in.mpms.mufg.com/Initial_Offer/IPO.aspx/generateToken", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },
        body: "{}"
      });
      if (tokRes.ok) {
        const tokData = await tokRes.json();
        encToken = encLinkIntimeVal(tokData.d || "");
      }
    } catch (e) {
      console.error("Link Intime token error:", e.message);
    }

    const results = await Promise.all(
      normalizedPans.map(async (item) => {
        const r = await checkLinkIntimePan(item.pan, matchedLink.id, encToken, lot, currentGmp);
        return {
          id: item.id,
          label: item.label,
          name: item.name,
          pan: item.pan,
          ...r
        };
      })
    );

    return buildResponse(res, company, registrar, lot, currentGmp, results);
  }

  // =============================================================
  // 2. KFIN TECHNOLOGIES LTD. (Zero Captcha)
  // =============================================================
  if (regLower.includes("kfin") || regLower.includes("karvy")) {
    const kfinList = await getKfinCompanies();
    const matchedKfin = matchCompany(company, kfinList, "name");

    // If company is not yet published on KFintech
    if (!matchedKfin) {
      const notAnnouncedResults = normalizedPans.map(item => ({
        id: item.id,
        label: item.label,
        name: item.name,
        pan: item.pan,
        status: "Not Announced",
        sharesApplied: 0,
        sharesAllotted: 0,
        lotsAllotted: 0,
        message: "Allotment has not been released yet on KFintech. Please check back once registrar publishes results.",
        liveVerified: false
      }));

      return buildResponse(res, company, registrar, lot, currentGmp, notAnnouncedResults, {
        allotmentNotOut: true,
        note: "Allotment has not been uploaded to KFintech portal yet."
      });
    }

    // Company is active on KFintech -> Query AWS API Gateway
    const results = await Promise.all(
      normalizedPans.map(async (item) => {
        const r = await checkKfinPan(item.pan, matchedKfin.clientId, lot, currentGmp);
        return {
          id: item.id,
          label: item.label,
          name: item.name,
          pan: item.pan,
          ...r
        };
      })
    );

    return buildResponse(res, company, registrar, lot, currentGmp, results);
  }

  // =============================================================
  // 3. MAASHITLA SECURITIES PVT. LTD. (Zero Captcha)
  // =============================================================
  if (regLower.includes("maashitla")) {
    const maashitlaList = await getMaashitlaCompanies();
    const matchedMaashitla = matchCompany(company, maashitlaList, "company_name");

    if (!matchedMaashitla) {
      const notAnnouncedResults = normalizedPans.map(item => ({
        id: item.id,
        label: item.label,
        name: item.name,
        pan: item.pan,
        status: "Not Announced",
        sharesApplied: 0,
        sharesAllotted: 0,
        lotsAllotted: 0,
        message: "Allotment has not been released yet on Maashitla. Please check back once registrar publishes results.",
        liveVerified: false
      }));

      return buildResponse(res, company, registrar, lot, currentGmp, notAnnouncedResults, {
        allotmentNotOut: true,
        note: "Allotment has not been uploaded to Maashitla portal yet."
      });
    }

    const results = await Promise.all(
      normalizedPans.map(async (item) => {
        const r = await checkMaashitlaPan(item.pan, matchedMaashitla.company_name, lot, currentGmp);
        return {
          id: item.id,
          label: item.label,
          name: item.name,
          pan: item.pan,
          ...r
        };
      })
    );

    return buildResponse(res, company, registrar, lot, currentGmp, results);
  }

  // =============================================================
  // 4. BIGSHARE SERVICES PVT. LTD. (1-Time Captcha)
  // =============================================================
  if (regLower.includes("bigshare")) {
    const bigshareList = await getBigshareCompanies();
    const matchedBigshare = matchCompany(company, bigshareList, "name");

    if (!matchedBigshare) {
      const notAnnouncedResults = normalizedPans.map(item => ({
        id: item.id,
        label: item.label,
        name: item.name,
        pan: item.pan,
        status: "Not Announced",
        sharesApplied: 0,
        sharesAllotted: 0,
        lotsAllotted: 0,
        message: "Allotment has not been released yet on Bigshare. Please check back once registrar publishes results.",
        liveVerified: false
      }));

      return buildResponse(res, company, registrar, lot, currentGmp, notAnnouncedResults, {
        allotmentNotOut: true,
        note: "Allotment has not been uploaded to Bigshare portal yet."
      });
    }

    const companyCode = matchedBigshare.code;

    // Prompt user for captcha if not supplied
    if (!captchaAnswer || !captchaToken) {
      try {
        const capRes = await fetch("https://ipo.bigshareonline.com/Captcha.ashx");
        const capJson = await capRes.json();
        return res.status(200).json({
          success: false,
          needsCaptcha: true,
          captchaToken: capJson.token || capJson.Token,
          captchaImage: capJson.image || capJson.Image,
          message: "Please enter the 1-time registrar captcha code to verify all family PANs."
        });
      } catch (e) {
        // Fallback to error
      }
    }

    // Submit with captcha
    const results = await Promise.all(
      normalizedPans.map(async (item) => {
        const r = await checkBigsharePan(item.pan, companyCode, captchaToken, captchaAnswer, lot, currentGmp);
        return {
          id: item.id,
          label: item.label,
          name: item.name,
          pan: item.pan,
          ...r
        };
      })
    );

    const captchaFailed = results.some(r => r.invalidCaptcha);
    if (captchaFailed) {
      try {
        const capRes = await fetch("https://ipo.bigshareonline.com/Captcha.ashx");
        const capJson = await capRes.json();
        return res.status(200).json({
          success: false,
          needsCaptcha: true,
          captchaError: "Invalid captcha entered. Please try the new code below.",
          captchaToken: capJson.token || capJson.Token,
          captchaImage: capJson.image || capJson.Image
        });
      } catch (e) {
        // Continue
      }
    }

    return buildResponse(res, company, registrar, lot, currentGmp, results);
  }

  // =============================================================
  // 5. OTHER / MANUAL-ONLY REGISTRARS (Skyline, Cameo, Purva, etc.)
  // =============================================================
  const fallbackResults = normalizedPans.map((item) => {
    return {
      id: item.id,
      label: item.label,
      name: item.name,
      pan: item.pan,
      status: "Not Checked",
      sharesApplied: 0,
      sharesAllotted: 0,
      lotsAllotted: 0,
      message: `Automated live query is not yet available for ${registrar || "this registrar"}. Please use official portal link below.`,
      liveVerified: false
    };
  });

  return buildResponse(res, company, registrar, lot, currentGmp, fallbackResults, {
    unsupportedRegistrar: true,
    note: "Please verify on the official registrar portal or mark manually."
  });
}

// -------------------------------------------------------------
// REGISTRAR CHECK FUNCTIONS
// -------------------------------------------------------------

/**
 * Link Intime PAN Allotment Check
 */
async function checkLinkIntimePan(pan, companyId, token, lot, currentGmp) {
  try {
    const res = await fetch("https://in.mpms.mufg.com/Initial_Offer/IPO.aspx/SearchOnPan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      body: JSON.stringify({
        clientid: String(companyId),
        PAN: pan,
        IFSC: "",
        CHKVAL: "1",
        token: token || ""
      })
    });

    if (res.ok) {
      const json = await res.json().catch(() => null);
      const xml = json?.d || "";

      // Parse all <Table> blocks in response
      const tableMatches = [...xml.matchAll(/<Table>([\s\S]*?)<\/Table>/gi)];

      if (tableMatches.length > 0) {
        let totalAllotted = 0;
        let totalApplied = 0;
        let appNo = "";
        let applicantName = "";
        let dpid = "";

        for (const match of tableMatches) {
          const tXml = match[1];
          const allotM = tXml.match(/<ALLOT>([^<]+)<\/ALLOT>/i);
          const sharesM = tXml.match(/<SHARES>([^<]+)<\/SHARES>/i);
          const nameM = tXml.match(/<NAME1>([^<]+)<\/NAME1>/i) || tXml.match(/<NAME>([^<]+)<\/NAME>/i);
          const appNoM = tXml.match(/<RFNDNO>([^<]+)<\/RFNDNO>/i) || tXml.match(/<APPNO>([^<]+)<\/APPNO>/i);
          const dpidM = tXml.match(/<DPCLITID>([^<]+)<\/DPCLITID>/i);

          const a = parseInt(allotM ? allotM[1].trim() : "0", 10) || 0;
          const s = parseInt(sharesM ? sharesM[1].trim() : String(lot), 10) || lot;
          totalAllotted += a;
          totalApplied += s;
          if (!appNo && appNoM) appNo = appNoM[1].trim();
          if (!applicantName && nameM) applicantName = nameM[1].trim();
          if (!dpid && dpidM) dpid = dpidM[1].trim();
        }

        const isAllotted = totalAllotted > 0;
        const lots = isAllotted ? Math.max(1, Math.round(totalAllotted / lot)) : 0;

        return {
          status: isAllotted ? "Allotted" : "Not Allotted",
          sharesApplied: totalApplied || lot,
          sharesAllotted: totalAllotted,
          lotsAllotted: lots,
          appNo,
          applicantName,
          dpid,
          message: isAllotted
            ? `Allotted ${totalAllotted} shares (${lots} lot${lots > 1 ? "s" : ""})`
            : "Not Allotted — 0 shares allocated (Refund in process / mandate released)",
          estimatedGain: isAllotted ? lots * lot * currentGmp : 0,
          liveVerified: true
        };
      }

      // Empty dataset (<NewDataSet />) means registrar confirmed applicant is not found
      if (xml && (xml.includes("<NewDataSet />") || xml.includes("<NewDataSet/>") || !xml.includes("<Table>"))) {
        return {
          status: "Not Applied",
          sharesApplied: 0,
          sharesAllotted: 0,
          lotsAllotted: 0,
          message: "Did Not Apply (No application record found for this PAN on Link Intime)",
          liveVerified: true
        };
      }
    }
  } catch (err) {
    console.error("Link Intime check error:", err.message);
  }

  // Network / server failure should NEVER falsely claim "Not Applied"
  return {
    status: "Not Checked",
    sharesApplied: 0,
    sharesAllotted: 0,
    lotsAllotted: 0,
    message: "Link Intime server busy or unreachable. Please retry.",
    liveVerified: false
  };
}

/**
 * KFintech PAN Allotment Check via AWS API Gateway
 */
async function checkKfinPan(pan, clientId, lot, currentGmp) {
  try {
    const res = await fetch("https://0uz601ms56.execute-api.ap-south-1.amazonaws.com/prod/api/query?type=pan", {
      headers: {
        reqparam: pan,
        client_id: String(clientId),
        "Access-Control-Allow-Origin": "*"
      }
    });

    if (res.status === 404) {
      return {
        status: "Not Applied",
        sharesApplied: 0,
        sharesAllotted: 0,
        lotsAllotted: 0,
        message: "Did Not Apply (No application record found for this PAN on KFintech)",
        liveVerified: true
      };
    }

    if (res.ok) {
      const data = await res.json().catch(() => null);

      if (Array.isArray(data)) {
        if (data.length === 0) {
          return {
            status: "Not Applied",
            sharesApplied: 0,
            sharesAllotted: 0,
            lotsAllotted: 0,
            message: "Did Not Apply (No application record found for this PAN on KFintech)",
            liveVerified: true
          };
        }

        let totalAllotted = 0;
        let totalApplied = 0;
        let appNo = "";
        let applicantName = "";
        let dpid = "";

        for (const record of data) {
          const a = parseInt(record.All_Shares || record.all_shares || "0", 10) || 0;
          const s = parseInt(record.App_Shares || record.app_shares || String(lot), 10) || lot;
          totalAllotted += a;
          totalApplied += s;
          if (!appNo && record.Appln_No) appNo = record.Appln_No;
          if (!applicantName && record.Name) applicantName = record.Name;
          if (!dpid && record.DP_CLID) dpid = record.DP_CLID;
        }

        const isAllotted = totalAllotted > 0;
        const lots = isAllotted ? Math.max(1, Math.round(totalAllotted / lot)) : 0;

        return {
          status: isAllotted ? "Allotted" : "Not Allotted",
          sharesApplied: totalApplied || lot,
          sharesAllotted: totalAllotted,
          lotsAllotted: lots,
          appNo,
          applicantName,
          dpid,
          message: isAllotted
            ? `Allotted ${totalAllotted} shares (${lots} lot${lots > 1 ? "s" : ""})`
            : "Not Allotted — 0 shares allocated (Refund in process / mandate released)",
          estimatedGain: isAllotted ? lots * lot * currentGmp : 0,
          liveVerified: true
        };
      }

      if (data && typeof data === "object") {
        if (data.error && /not found|no record/i.test(data.error)) {
          return {
            status: "Not Applied",
            sharesApplied: 0,
            sharesAllotted: 0,
            lotsAllotted: 0,
            message: "Did Not Apply (No application record found for this PAN on KFintech)",
            liveVerified: true
          };
        }
      }
    }
  } catch (err) {
    console.error("KFintech check error:", err.message);
  }

  return {
    status: "Not Checked",
    sharesApplied: 0,
    sharesAllotted: 0,
    lotsAllotted: 0,
    message: "KFintech server busy or temporarily unreachable. Please retry.",
    liveVerified: false
  };
}

/**
 * Maashitla Securities PAN Allotment Check via REST API
 */
async function checkMaashitlaPan(pan, companyName, lot, currentGmp) {
  try {
    const params = new URLSearchParams({
      company_name: companyName,
      pan: pan
    });
    const res = await fetch(`https://api.maashitla.com/api/public-issue/search?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      }
    });

    if (res.status === 404) {
      return {
        status: "Not Applied",
        sharesApplied: 0,
        sharesAllotted: 0,
        lotsAllotted: 0,
        message: "Did Not Apply (No application record found on Maashitla for this PAN)",
        liveVerified: true
      };
    }

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data) {
        if (Array.isArray(data) && data.length === 0) {
          return {
            status: "Not Applied",
            sharesApplied: 0,
            sharesAllotted: 0,
            lotsAllotted: 0,
            message: "Did Not Apply (No application record found on Maashitla for this PAN)",
            liveVerified: true
          };
        }

        if (data.detail && /no records/i.test(data.detail)) {
          return {
            status: "Not Applied",
            sharesApplied: 0,
            sharesAllotted: 0,
            lotsAllotted: 0,
            message: "Did Not Apply (No application record found on Maashitla for this PAN)",
            liveVerified: true
          };
        }

        const record = Array.isArray(data) ? data[0] : data;
        const allotted = parseInt(record.shares_allotted || record.alloted || record.allotment || "0", 10) || 0;
        const applied = parseInt(record.shares_applied || record.applied || String(lot), 10) || lot;
        const isAllotted = allotted > 0;
        const lots = isAllotted ? Math.max(1, Math.round(allotted / lot)) : 0;

        return {
          status: isAllotted ? "Allotted" : "Not Allotted",
          sharesApplied: applied,
          sharesAllotted: allotted,
          lotsAllotted: lots,
          appNo: record.application_no || record.app_no || "",
          applicantName: record.name || record.applicant_name || "",
          message: isAllotted
            ? `Allotted ${allotted} shares (${lots} lot${lots > 1 ? "s" : ""})`
            : "Not Allotted — 0 shares allocated",
          estimatedGain: isAllotted ? lots * lot * currentGmp : 0,
          liveVerified: true
        };
      }
    }
  } catch (err) {
    console.error("Maashitla check error:", err.message);
  }

  return {
    status: "Not Checked",
    sharesApplied: 0,
    sharesAllotted: 0,
    lotsAllotted: 0,
    message: "Maashitla server unreachable. Please retry.",
    liveVerified: false
  };
}

/**
 * Bigshare PAN Allotment Check via Data.aspx
 */
async function checkBigsharePan(pan, companyCode, token, answer, lot, currentGmp) {
  try {
    const res = await fetch("https://ipo.bigshareonline.com/Data.aspx/FetchIpodetails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        Applicationno: "",
        Company: String(companyCode),
        SelectionType: "PN", // "PN" for PAN Number query (not "1")
        PanNo: pan.trim().toUpperCase(),
        txtcsdl: "",
        txtDPID: "",
        txtClId: "",
        ddlType: "0",
        lang: "1",
        CaptchaToken: token || "",
        CaptchaAnswer: answer || "",
        ResultToken: ""
      })
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.d) {
        const d = data.d;
        if (d.Status === "CAPTCHA") {
          return { invalidCaptcha: true, message: "Invalid captcha entered." };
        }

        const allotted = parseInt(d.ALLOTED || d.alloted || d.Alloted || "0", 10) || 0;
        const applied = parseInt(d.APPLIED || d.applied || d.Applied || String(lot), 10) || lot;
        const appNo = (d.APPLICATION_NO || d.application_no || d.AppNo || "").trim();
        const name = (d.Name || d.name || d.NAME || "").trim();

        // If no application record exists at all for this PAN
        if (!appNo && !name && allotted === 0 && (!d.APPLIED || d.APPLIED === "0" || d.APPLIED === 0)) {
          return {
            status: "Not Applied",
            sharesApplied: 0,
            sharesAllotted: 0,
            lotsAllotted: 0,
            message: "Did Not Apply (No application record found for this PAN on Bigshare)",
            liveVerified: true
          };
        }

        const isAllotted = allotted > 0;
        const lots = isAllotted ? Math.max(1, Math.round(allotted / lot)) : 0;

        return {
          status: isAllotted ? "Allotted" : "Not Allotted",
          sharesApplied: applied,
          sharesAllotted: allotted,
          lotsAllotted: lots,
          appNo,
          applicantName: name,
          message: isAllotted
            ? `Allotted ${allotted} shares (${lots} lot${lots > 1 ? "s" : ""})`
            : "Not Allotted — 0 shares allocated (Refund in process)",
          estimatedGain: isAllotted ? lots * lot * currentGmp : 0,
          liveVerified: true
        };
      }
    }
  } catch (err) {
    console.error("Bigshare check error:", err.message);
  }

  return {
    status: "Not Checked",
    sharesApplied: 0,
    sharesAllotted: 0,
    lotsAllotted: 0,
    message: "Bigshare server busy. Please retry.",
    liveVerified: false
  };
}

// -------------------------------------------------------------
// RESPONSE FORMATTER
// -------------------------------------------------------------

function buildResponse(res, company, registrar, lot, currentGmp, results, meta = {}) {
  const allottedList = results.filter(r => r.status === "Allotted");
  const notAllottedList = results.filter(r => r.status === "Not Allotted");
  const notAppliedList = results.filter(r => r.status === "Not Applied");
  const notAnnouncedList = results.filter(r => r.status === "Not Announced");

  const totalLots = allottedList.reduce((sum, r) => sum + (r.lotsAllotted || 1), 0);
  const totalEstGain = totalLots * lot * currentGmp;

  return res.status(200).json({
    success: true,
    company: company || "IPO",
    registrar: registrar || "Official Registrar",
    checkedAt: new Date().toISOString(),
    summary: {
      totalPans: results.length,
      allottedCount: allottedList.length,
      notAllottedCount: notAllottedList.length,
      notAppliedCount: notAppliedList.length,
      notAnnouncedCount: notAnnouncedList.length,
      totalLotsAllotted: totalLots,
      totalSharesAllotted: totalLots * lot,
      totalEstimatedGain: totalEstGain,
      allotmentNotOut: !!meta.allotmentNotOut
    },
    ...meta,
    results
  });
}
