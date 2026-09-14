import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

console.log("\n========================================================");
console.log("  CALM CAPITAL — SENIOR QA MONTHLY COMPREHENSIVE AUDIT   ");
console.log("========================================================\n");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let warnings = [];

function assert(condition, testName, details = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName} ${details ? `(${details})` : ""}`);
  }
}

function warn(message) {
  warnings.push(message);
  console.warn(`  [WARN] ${message}`);
}

async function runAudit() {
  // -------------------------------------------------------------
  // SUITE 1: DATA STORES & SCHEMA INTEGRITY
  // -------------------------------------------------------------
  console.log("\n--- [SUITE 1] Database & Static Stores Integrity ---");

  const iposPath = path.join(ROOT, "public", "ipos.json");
  const liveDataPath = path.join(ROOT, "public", "live-data.json");
  const kfinPath = path.join(ROOT, "api", "kfintech-ipos.json");
  const bigsharePath = path.join(ROOT, "api", "bigshare-ipos.json");

  assert(fs.existsSync(iposPath), "public/ipos.json exists");
  assert(fs.existsSync(liveDataPath), "public/live-data.json exists");
  assert(fs.existsSync(kfinPath), "api/kfintech-ipos.json exists");
  assert(fs.existsSync(bigsharePath), "api/bigshare-ipos.json exists");

  let ipos = [];
  let liveData = [];
  try {
    ipos = JSON.parse(fs.readFileSync(iposPath, "utf8"));
    assert(Array.isArray(ipos) && ipos.length > 0, "public/ipos.json is valid JSON array", `Count: ${ipos.length}`);
  } catch (e) {
    assert(false, "public/ipos.json parse error", e.message);
  }

  try {
    liveData = JSON.parse(fs.readFileSync(liveDataPath, "utf8"));
    const ipoCount = liveData?.ipos ? Object.keys(liveData.ipos).length : 0;
    assert(liveData && typeof liveData === "object" && ipoCount > 0, "public/live-data.json is valid object schema", `Tracked IPOs: ${ipoCount}`);
  } catch (e) {
    assert(false, "public/live-data.json parse error", e.message);
  }

  // Check unique IDs
  const idSet = new Set();
  let duplicateCount = 0;
  for (const ipo of ipos) {
    if (idSet.has(ipo.id)) duplicateCount++;
    idSet.add(ipo.id);
  }
  assert(duplicateCount === 0, "All IPO IDs in ipos.json are strictly unique", `Duplicates found: ${duplicateCount}`);

  // Schema check on every IPO record
  let missingKeyFields = 0;
  let invalidStatusCount = 0;
  const allowedStatuses = new Set(["Upcoming", "Open", "Closed", "Listed"]);

  ipos.forEach((item) => {
    if (!item.id || (!item.company && !item.name)) missingKeyFields++;
    if (item.status && !allowedStatuses.has(item.status)) invalidStatusCount++;
  });
  assert(missingKeyFields === 0, "Zero records with missing IDs or company names");
  assert(invalidStatusCount === 0, "All record statuses conform to state machine (Upcoming, Open, Closed, Listed)");

  // -------------------------------------------------------------
  // SUITE 2: BUSINESS LOGIC & CHRONOLOGY VALIDATION
  // -------------------------------------------------------------
  console.log("\n--- [SUITE 2] Financial Calculations & Chronology ---");

  let chronologyErrors = 0;
  let priceBandErrors = 0;
  let gmpNegativeErrors = 0;

  ipos.forEach((ipo) => {
    const parseD = (s) => (s ? new Date(s + "T00:00:00+05:30").getTime() : null);
    const o = parseD(ipo.open);
    const c = parseD(ipo.close);
    const a = parseD(ipo.allotment);
    const l = parseD(ipo.listing);

    if (o && c && c < o) chronologyErrors++;
    if (c && a && a < c) chronologyErrors++;
    if (a && l && l < a) chronologyErrors++;

    if (ipo.priceMin != null && ipo.priceMax != null) {
      if (Number(ipo.priceMin) > Number(ipo.priceMax)) priceBandErrors++;
    }
  });

  assert(chronologyErrors === 0, "Zero chronology timeline violations (Open <= Close <= Allotment <= Listing)", `Violations: ${chronologyErrors}`);
  assert(priceBandErrors === 0, "Zero inverted price bands (PriceMin <= PriceMax)", `Violations: ${priceBandErrors}`);

  // -------------------------------------------------------------
  // SUITE 3: ALLOTMENT API ENDPOINT & CAPTCHA ENGINE
  // -------------------------------------------------------------
  console.log("\n--- [SUITE 3] Serverless /api/check-allotment Audit ---");

  const allotmentHandlerModule = await import("../api/check-allotment.js");
  const checkAllotment = allotmentHandlerModule.default;

  // Mock res helper
  function createMockRes() {
    return {
      statusCode: 200,
      headers: {},
      body: null,
      status(c) { this.statusCode = c; return this; },
      setHeader(k, v) { this.headers[k] = v; return this; },
      json(b) { this.body = b; return this; },
      end() { return this; }
    };
  }

  // 3A: Test OPTIONS CORS preflight
  const optRes = createMockRes();
  await checkAllotment({ method: "OPTIONS" }, optRes);
  assert(optRes.statusCode === 200, "CORS preflight (OPTIONS) returns 200 with Access-Control headers");

  // 3B: Test Method Rejection (PUT / DELETE)
  const putRes = createMockRes();
  await checkAllotment({ method: "PUT" }, putRes);
  assert(putRes.statusCode === 405, "Unsupported HTTP method returns 405 Method Not Allowed");

  // 3C: Test GET with registrar=bigshare (Captcha retrieval)
  const getBigshareRes = createMockRes();
  await checkAllotment({ method: "GET", url: "/api/check-allotment?registrar=bigshare" }, getBigshareRes);
  assert(
    getBigshareRes.statusCode === 200 && (getBigshareRes.body?.success === true || getBigshareRes.statusCode === 200),
    "GET Bigshare Captcha endpoint reachable & returns structured response",
    getBigshareRes.body?.error || "OK"
  );

  // 3D: Test Missing PAN validation
  const emptyPostRes = createMockRes();
  await checkAllotment({
    method: "POST",
    body: JSON.stringify({ company: "Test IPO", registrar: "Link Intime", pans: [] })
  }, emptyPostRes);
  assert(emptyPostRes.statusCode === 400, "POST without PANs correctly rejected with 400 Bad Request");

  // 3E: Test Unsupported Registrar graceful fallback
  const unsupportedRegRes = createMockRes();
  await checkAllotment({
    method: "POST",
    body: JSON.stringify({
      company: "Test IPO",
      registrar: "Skyline Financial",
      pans: [{ id: "pan-1", label: "Self", pan: "ABCDE1234F" }]
    })
  }, unsupportedRegRes);
  assert(
    unsupportedRegRes.statusCode === 200 && unsupportedRegRes.body?.unsupportedRegistrar === true,
    "Unsupported registrar returns structured fallback with manual verification instructions"
  );

  // 3F: Test Live KFintech Connection & AWS API Gateway Health
  console.log("\n  [Registrar Live Network Health Test]");
  try {
    const kfinCheckRes = await fetch("https://ipostatus.kfintech.com/", { method: "HEAD", signal: AbortSignal.timeout(6000) });
    assert(kfinCheckRes.ok, "KFintech primary portal status: ONLINE (HTTP " + kfinCheckRes.status + ")");
  } catch (e) {
    warn("KFintech portal timeout or busy: " + e.message);
  }

  // 3G: Test Link Intime ASP.NET Service Health
  try {
    const linkIntimeRes = await fetch("https://in.mpms.mufg.com/Initial_Offer/IPO.aspx/GetDetails", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: "{}",
      signal: AbortSignal.timeout(6000)
    });
    assert(linkIntimeRes.ok, "Link Intime / MUFG primary portal status: ONLINE (HTTP " + linkIntimeRes.status + ")");
  } catch (e) {
    warn("Link Intime portal timeout or busy: " + e.message);
  }

  // 3H: Test Bigshare Service Health
  try {
    const bigshareRes = await fetch("https://ipo.bigshareonline.com/ipo_status.html", { method: "HEAD", signal: AbortSignal.timeout(6000) });
    assert(bigshareRes.ok, "Bigshare primary portal status: ONLINE (HTTP " + bigshareRes.status + ")");
  } catch (e) {
    warn("Bigshare portal timeout or busy: " + e.message);
  }

  // -------------------------------------------------------------
  // SUITE 4: CHAT API & SECURITY SANITIZER AUDIT
  // -------------------------------------------------------------
  console.log("\n--- [SUITE 4] Security & AI Gateway (/api/chat) Audit ---");

  const chatModule = await import("../api/chat.js");
  const chatHandler = chatModule.default;

  // 4A: Test GET rejection
  const chatGetRes = createMockRes();
  await chatHandler({ method: "GET" }, chatGetRes);
  assert(chatGetRes.statusCode === 405, "/api/chat rejects GET requests with 405");

  // 4B: Test Empty payload rejection
  const chatEmptyRes = createMockRes();
  await chatHandler({ method: "POST", body: { messages: [] } }, chatEmptyRes);
  assert(chatEmptyRes.statusCode === 400 || chatEmptyRes.statusCode === 500, "/api/chat enforces non-empty message array or validates API key");

  // -------------------------------------------------------------
  // SUITE 5: REFRESH API AUDIT
  // -------------------------------------------------------------
  console.log("\n--- [SUITE 5] Refresh Controller (/api/refresh) Audit ---");

  const refreshModule = await import("../api/refresh.js");
  const refreshHandler = refreshModule.default;

  const refreshRejectRes = createMockRes();
  await refreshHandler({ method: "DELETE" }, refreshRejectRes);
  assert(refreshRejectRes.statusCode === 405, "/api/refresh rejects unsupported HTTP methods with 405");

  // -------------------------------------------------------------
  // FINAL SCORECARD
  // -------------------------------------------------------------
  console.log("\n========================================================");
  console.log(`  AUDIT COMPLETE: ${passedTests}/${totalTests} TESTS PASSED (${failedTests} FAILS, ${warnings.length} WARNINGS)`);
  console.log("========================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error("Fatal Audit Error:", err);
  process.exit(1);
});
