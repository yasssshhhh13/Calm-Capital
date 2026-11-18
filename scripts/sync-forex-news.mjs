/**
 * Sync Forex Factory Live Calendar Data to public/forex-news.json
 * Runs as part of the automated hourly workflow on GitHub Actions.
 */
import { writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "public", "forex-news.json");

async function main() {
  console.log("[Forex Calendar Sync] Fetching live Forex Factory calendar...");
  try {
    const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CalmCapital/1.0"
      }
    });

    if (!res.ok) {
      throw new Error(`Upstream returned status ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Invalid or empty calendar array received");
    }

    await writeFile(OUT_PATH, JSON.stringify(data, null, 2), "utf-8");
    console.log(`[Forex Calendar Sync] Successfully synced ${data.length} economic events to public/forex-news.json`);
  } catch (err) {
    console.warn(`[Forex Calendar Sync] Note: ${err.message}. Preserving existing calendar data.`);
  }
}

main();
