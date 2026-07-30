import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on("console", (msg) => {
    console.log("BROWSER LOG:", msg.text());
  });
  
  const query = "indo mim";
  const url = `https://www.chittorgarh.com/search/?q=${encodeURIComponent(query)}`;
  console.log("Navigating to:", url);
  await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(4000);
  
  const results = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a"));
    return anchors.map(a => ({
      text: a.innerText.trim(),
      href: a.getAttribute("href")
    })).filter(x => x.href && (x.href.includes("/ipo/") || x.href.includes("/report/")));
  });
  
  console.log("Found links:", JSON.stringify(results, null, 2));
  await browser.close();
}

run().catch(console.error);
