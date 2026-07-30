import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const urls = [
    "https://www.chittorgarh.com/report/mainboard-ipo-list-in-india-bse-nse/84/",
    "https://www.chittorgarh.com/report/sme-ipo-list-in-india-bse-nse-sme/85/"
  ];
  
  for (const url of urls) {
    console.log("Fetching url:", url);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const content = await page.innerText("body");
    console.log("Contains Indo:", content.toLowerCase().includes("indo"));
    console.log("Contains Lohia:", content.toLowerCase().includes("lohia"));
    console.log("Contains Xtranet:", content.toLowerCase().includes("xtranet"));
    
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("a")).map(a => ({ text: a.innerText.trim(), href: a.getAttribute("href") }))
        .filter(x => x.href && x.href.includes("/ipo/"));
    });
    console.log("Number of IPO links found:", links.length);
    console.log("Matching links:", links.filter(x => x.text.toLowerCase().includes("indo") || x.text.toLowerCase().includes("lohia") || x.text.toLowerCase().includes("xtranet")));
  }
  await browser.close();
}

run().catch(console.error);
