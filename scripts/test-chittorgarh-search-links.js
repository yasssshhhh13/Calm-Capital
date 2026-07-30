import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://www.chittorgarh.com/", { waitUntil: "networkidle", timeout: 20000 });
  const title = await page.title();
  console.log("Homepage Title:", title);
  
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a")).map(a => ({
      text: a.innerText.trim(),
      href: a.getAttribute("href")
    })).filter(x => x.href && (x.href.includes("search") || x.href.includes("find") || x.text.toLowerCase().includes("search")));
  });
  console.log("Search-related links:", links);
  await browser.close();
}

run().catch(console.error);
