import { chromium } from "playwright";

async function checkHytechGmp() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("Checking InvestorGain for Hy-Tech Engineers GMP...");
  const igUrl = "https://www.investorgain.com/gmp/hy-tech-engineers-ipo/1876/";
  await page.goto(igUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);

  const igData = await page.evaluate(() => {
    const res = { url: location.href };
    const tables = Array.from(document.querySelectorAll("table"));
    const textRows = [];
    
    for (const tbl of tables) {
      const trs = Array.from(tbl.querySelectorAll("tr"));
      for (const tr of trs) {
        const cells = Array.from(tr.querySelectorAll("th, td")).map(c => c.innerText.trim());
        if (cells.length >= 2) {
          textRows.push(cells.join(" | "));
        }
      }
    }
    res.tableData = textRows;
    return res;
  });

  console.log("INVESTORGAIN HY-TECH GMP TABLE:\n", igData.tableData.slice(0, 30).join("\n"));

  console.log("\nChecking Chittorgarh for Hy-Tech Engineers IPO details...");
  const cgUrl = "https://www.chittorgarh.com/ipo/hy-tech-engineers-ipo/2591/";
  await page.goto(cgUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);

  const cgData = await page.evaluate(() => {
    const text = document.body.innerText;
    const gmpMatch = text.match(/GMP\s*[:\-]?\s*₹?\s*(\d+)/i) || text.match(/Grey\s*Market\s*Premium\s*[:\-]?\s*₹?\s*(\d+)/i);
    return { gmpMatch: gmpMatch ? gmpMatch[0] : "Not found" };
  });

  console.log("CHITTORGARH GMP MATCH:", cgData.gmpMatch);

  await browser.close();
}

checkHytechGmp().catch(console.error);
