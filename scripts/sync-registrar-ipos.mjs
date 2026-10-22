import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9"
};

/**
 * 1. Fetch KFintech Active IPOs
 */
async function syncKfintech() {
  console.log("[Sync] Fetching KFintech live IPOs...");
  const targetFile = path.join(ROOT, "api", "kfintech-ipos.json");
  
  try {
    const pageRes = await fetch("https://ipostatus.kfintech.com/", {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(10000)
    });
    
    if (pageRes.ok) {
      const html = await pageRes.text();
      const scriptMatch = html.match(/src="(\.\/static\/js\/main\.[^"]+\.js)"/);
      if (scriptMatch) {
        const bundleUrl = "https://ipostatus.kfintech.com/" + scriptMatch[1].replace("./", "");
        const bundleRes = await fetch(bundleUrl, {
          headers: {
            ...BROWSER_HEADERS,
            "Referer": "https://ipostatus.kfintech.com/"
          },
          signal: AbortSignal.timeout(12000)
        });
        
        if (bundleRes.ok) {
          const bundleJs = await bundleRes.text();
          const jsonMatch = bundleJs.match(/rf=JSON\.parse\('([^']+)'\)/);
          if (jsonMatch) {
            const list = JSON.parse(jsonMatch[1]);
            if (Array.isArray(list) && list.length > 0) {
              // Merge with existing to preserve historical clientIds
              let existing = [];
              if (fs.existsSync(targetFile)) {
                try {
                  existing = JSON.parse(fs.readFileSync(targetFile, "utf8"));
                } catch {
                  existing = [];
                }
              }
              const map = new Map();
              // Put existing first
              for (const item of existing) {
                if (item.clientId) map.set(String(item.clientId), item);
              }
              // Overlay newly fetched (has priority)
              for (const item of list) {
                if (item.clientId) map.set(String(item.clientId), item);
              }
              
              const merged = [...map.values()];
              fs.writeFileSync(targetFile, JSON.stringify(merged, null, 2), "utf8");
              console.log(`[Sync] Successfully updated KFintech list: ${list.length} live (${merged.length} total preserved)`);
              return list;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("[Sync] Error syncing KFintech:", err.message);
  }
  return null;
}

/**
 * 2. Fetch Bigshare Active IPOs
 */
async function syncBigshare() {
  console.log("[Sync] Fetching Bigshare live IPOs...");
  const targetFile = path.join(ROOT, "api", "bigshare-ipos.json");
  const hosts = ["ipo.bigshareonline.com", "ipo1.bigshareonline.com", "ipo2.bigshareonline.com"];
  
  for (const host of hosts) {
    try {
      const res = await fetch(`https://${host}/ipo_status.html`, {
        headers: BROWSER_HEADERS,
        signal: AbortSignal.timeout(8000)
      });
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
          let existing = [];
          if (fs.existsSync(targetFile)) {
            try {
              existing = JSON.parse(fs.readFileSync(targetFile, "utf8"));
            } catch {
              existing = [];
            }
          }
          const map = new Map();
          for (const item of existing) {
            if (item.code) map.set(String(item.code), item);
          }
          for (const item of list) {
            if (item.code) map.set(String(item.code), item);
          }
          const merged = [...map.values()];
          fs.writeFileSync(targetFile, JSON.stringify(merged, null, 2), "utf8");
          console.log(`[Sync] Successfully updated Bigshare list: ${list.length} live (${merged.length} total preserved) from ${host}`);
          return list;
        }
      }
    } catch (e) {
      // Try next mirror
    }
  }
  console.warn("[Sync] Bigshare sync had no live response from mirrors.");
  return null;
}

/**
 * 3. Fetch Link Intime Active IPOs
 */
async function syncLinkIntime() {
  console.log("[Sync] Fetching Link Intime live IPOs...");
  const targetFile = path.join(ROOT, "api", "linkintime-ipos.json");
  
  try {
    const res = await fetch("https://in.mpms.mufg.com/Initial_Offer/IPO.aspx/GetDetails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        ...BROWSER_HEADERS
      },
      body: "{}",
      signal: AbortSignal.timeout(10000)
    });

    if (res.ok) {
      const data = await res.json();
      const xml = data?.d || "";
      const matches = [...xml.matchAll(/<company_id>([^<]+)<\/company_id>\s*<companyname>([^<]+)<\/companyname>/g)];
      const list = matches.map(m => ({ id: m[1].trim(), name: m[2].trim() }));
      if (list.length > 0) {
        let existing = [];
        if (fs.existsSync(targetFile)) {
          try {
            existing = JSON.parse(fs.readFileSync(targetFile, "utf8"));
          } catch {
            existing = [];
          }
        }
        const map = new Map();
        for (const item of existing) {
          if (item.id) map.set(String(item.id), item);
        }
        for (const item of list) {
          if (item.id) map.set(String(item.id), item);
        }
        const merged = [...map.values()];
        fs.writeFileSync(targetFile, JSON.stringify(merged, null, 2), "utf8");
        console.log(`[Sync] Successfully updated Link Intime list: ${list.length} live (${merged.length} total preserved)`);
        return list;
      }
    }
  } catch (err) {
    console.error("[Sync] Error syncing Link Intime:", err.message);
  }
  return null;
}

/**
 * 4. Fetch Maashitla Active IPOs
 */
async function syncMaashitla() {
  console.log("[Sync] Fetching Maashitla live IPOs...");
  const targetFile = path.join(ROOT, "api", "maashitla-ipos.json");
  
  try {
    const res = await fetch("https://api.maashitla.com/api/public-issue/companies", {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...BROWSER_HEADERS
      },
      signal: AbortSignal.timeout(8000)
    });
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        fs.writeFileSync(targetFile, JSON.stringify(list, null, 2), "utf8");
        console.log(`[Sync] Successfully updated Maashitla list: ${list.length} companies.`);
        return list;
      }
    }
  } catch (err) {
    console.error("[Sync] Error syncing Maashitla:", err.message);
  }
  return null;
}

export async function runRegistrarSync() {
  console.log("=== [START] Syncing All Registrar IPO Registries ===");
  await Promise.allSettled([
    syncKfintech(),
    syncBigshare(),
    syncLinkIntime(),
    syncMaashitla()
  ]);
  console.log("=== [COMPLETE] Registrar IPO Registries Sync Finished ===");
}

// Allow direct CLI invocation
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runRegistrarSync()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Fatal sync error:", err);
      process.exit(1);
    });
}
