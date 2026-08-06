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

  // Check if we are running in Vercel Serverless environment
  if (process.env.VERCEL) {
    const pat = process.env.GITHUB_PAT;
    const owner = process.env.VERCEL_GIT_REPO_OWNER;
    const repo = process.env.VERCEL_GIT_REPO_SLUG;

    if (pat && owner && repo) {
      isScraping = true;
      console.log(`[API Refresh] Triggering GitHub workflow dispatch for ${owner}/${repo}...`);
      try {
        const fetchRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/actions/workflows/update-ipo-data.yml/dispatches`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${pat}`,
              "Accept": "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
              "User-Agent": "Vercel-Serverless-Refresh",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              ref: "main"
            })
          }
        );

        isScraping = false;
        if (!fetchRes.ok) {
          const rawText = await fetchRes.text();
          console.error(`[API Refresh] GitHub API returned status ${fetchRes.status}: ${rawText}`);
          return res.status(502).json({
            error: `GitHub API error (status ${fetchRes.status}): ${rawText || "Failed to trigger workflow"}`
          });
        }

        return res.status(200).json({
          success: true,
          message: "GitHub Action workflow successfully triggered. The data will update in 1-2 minutes.",
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        isScraping = false;
        console.error("[API Refresh] Failed to trigger GitHub Action:", err);
        return res.status(500).json({
          error: "Failed to trigger GitHub Action: " + err.message
        });
      }
    } else {
      // Vercel environment but missing token or repository information
      return res.status(400).json({
        error: "Direct scraping is not supported in Vercel's serverless environment due to lack of a headless browser. However, data updates automatically every hour. To trigger manually, please configure a 'GITHUB_PAT' environment variable in Vercel with a GitHub Personal Access Token (classic, with 'repo' and 'workflow' scopes)."
      });
    }
  }

  // Local environment execution
  isScraping = true;
  console.log("[API Refresh] Starting local scraper...");

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
