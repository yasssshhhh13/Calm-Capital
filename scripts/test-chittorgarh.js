import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://www.chittorgarh.com/report/mainboard-ipo-list-in-india-bse-nse/84/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const rows = await page.$$eval("table tbody tr", (trs) =>
    trs
      .map((tr) => {
        const a = tr.querySelector("td a[href*='/ipo/']");
        if (!a) return null;
        return { name: a.innerText.trim(), href: a.getAttribute("href") };
      })
      .filter(Boolean)
  );
  console.log("Rows:", JSON.stringify(rows, null, 2));
  await browser.close();
}

run().catch(console.error);
