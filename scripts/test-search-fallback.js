import { chromium } from "playwright";

async function googleSearchUrl(page, query) {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    console.log("Searching DuckDuckGo for:", query);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2000);
    
    return await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a.result__url"));
      if (links.length > 0) {
        return links[0].innerText.trim();
      }
      const allLinks = Array.from(document.querySelectorAll("a"));
      for (const a of allLinks) {
        const href = a.getAttribute("href") || "";
        if (href.includes("chittorgarh.com/ipo/")) {
          // Extract actual URL if it is redirecting
          const m = href.match(/uddg=([^&]+)/);
          if (m) return decodeURIComponent(m[1]);
          return href;
        }
      }
      return null;
    });
  } catch (err) {
    console.warn("Search failed:", err.message);
  }
  return null;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const targets = [
    "site:chittorgarh.com/ipo/ \"indo-mim\"",
    "site:chittorgarh.com/ipo/ \"lohia corp\"",
    "site:chittorgarh.com/ipo/ \"xtranet\""
  ];
  
  for (const t of targets) {
    const url = await googleSearchUrl(page, t);
    console.log(t, "-> Found URL:", url);
  }
  await browser.close();
}

run().catch(console.error);
