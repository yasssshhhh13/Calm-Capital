import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const url = "https://www.chittorgarh.com/ipo/manipal-health-enterprises-ipo/2956/";
  console.log("Going to:", url);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  const tables = await page.evaluate(() => {
    const results = [];
    const tableEls = document.querySelectorAll("table");
    tableEls.forEach((table, idx) => {
      const headers = Array.from(table.querySelectorAll("th")).map(th => th.innerText.trim());
      const rows = Array.from(table.querySelectorAll("tr")).map(tr => 
        Array.from(tr.querySelectorAll("td")).map(td => td.innerText.trim())
      ).filter(r => r.length > 0);
      
      const text = table.innerText.toLowerCase();
      if (text.includes("qib") || text.includes("retail") || text.includes("reservation") || text.includes("shares offered")) {
        results.push({ idx, headers, rowsSnippet: rows.slice(0, 15) });
      }
    });
    return results;
  });

  console.log("Found tables related to reservations:");
  console.log(JSON.stringify(tables, null, 2));

  await browser.close();
}

run().catch(console.error);
