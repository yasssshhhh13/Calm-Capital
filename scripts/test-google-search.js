import { chromium } from "playwright";

async function searchGoogle(page, query) {
  try {
    await page.goto("https://www.google.com/search?q=" + encodeURIComponent(query));
    await page.waitForTimeout(3000);
    return await page.evaluate(() => {
      return Array.from(document.querySelectorAll("a"))
        .map(a => a.getAttribute("href"))
        .filter(href => href && href.includes("chittorgarh.com/ipo/"))
        .map(href => {
          // clean google redirect url if present
          const m = href.match(/url\?q=([^&]+)/);
          if (m) return decodeURIComponent(m[1]);
          return href;
        });
    });
  } catch (err) {
    console.warn("Search failed:", err.message);
  }
  return [];
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const lohia = await searchGoogle(page, 'site:chittorgarh.com/ipo/ "lohia"');
  console.log("Lohia matches:", lohia);
  
  const xtranet = await searchGoogle(page, 'site:chittorgarh.com/ipo/ "xtranet"');
  console.log("Xtranet matches:", xtranet);
  
  await browser.close();
}

run().catch(console.error);
