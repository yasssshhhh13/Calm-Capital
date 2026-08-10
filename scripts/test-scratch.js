import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const url = "http://localhost:5173/ipo/molbio-diagnostics";
  console.log("Navigating to:", url);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  const tables = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("table")).map((table, idx) => {
      const headers = Array.from(table.querySelectorAll("th")).map(th => th.innerText.trim());
      const rows = Array.from(table.querySelectorAll("tbody tr")).map(tr => {
        return Array.from(tr.querySelectorAll("td")).map(td => td.innerText.trim().replace(/\n+/g, " "));
      });
      return { idx, headers, rows };
    });
  });

  tables.forEach((tbl) => {
    console.log(`\nTable #${tbl.idx}:`);
    console.log("Headers:", tbl.headers);
    tbl.rows.slice(0, 5).forEach((row, i) => {
      console.log(`Row ${i + 1}:`, row);
    });
  });

  await browser.close();
}

run().catch(console.error);
