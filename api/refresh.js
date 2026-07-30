import { exec } from "child_process";
import path from "path";

let isScraping = false;

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (isScraping) {
    return res.status(429).json({ error: "Refresh already in progress. Please wait." });
  }

  isScraping = true;
  console.log("[API Refresh] Starting scraper...");

  const scriptPath = path.resolve(process.cwd(), "scripts", "scrape-ipo-data.mjs");
  
  exec(`"${process.execPath}" "${scriptPath}"`, (error, stdout, stderr) => {
    isScraping = false;
    if (error) {
      console.error("[API Refresh] Scraper failed:", error);
      console.error(stderr);
      return res.status(500).json({ error: "Scraper execution failed: " + error.message, stderr });
    }
    console.log("[API Refresh] Scraper completed successfully.");
    return res.status(200).json({
      success: true,
      message: "Database refreshed successfully",
      updatedAt: new Date().toISOString()
    });
  });
}
