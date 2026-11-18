// Serverless API: Forex Factory Live Macroeconomic Calendar Proxy
// Solves browser CORS restrictions and provides edge caching.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const upstream = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (upstream.ok) {
      const data = await upstream.json();
      return res.status(200).json(data);
    }
  } catch (err) {
    console.warn("[Forex Calendar API] Upstream fetch warning:", err?.message);
  }

  // Fallback to local static json if upstream times out
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const localPath = path.resolve(process.cwd(), "public", "forex-news.json");
    const localData = JSON.parse(await fs.readFile(localPath, "utf-8"));
    return res.status(200).json(localData);
  } catch (fallbackErr) {
    return res.status(500).json({ error: "Failed to retrieve economic calendar data." });
  }
}
