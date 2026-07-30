import { chromium } from "playwright";

async function findChittorgarhUrl(page, companyName) {
  const query = companyName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, "+");
  const searchUrl = `https://www.chittorgarh.com/search/?q=${query}`;
  try {
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    const html = await page.content();
    let m = html.match(/href="(\/ipo\/[^"]+-ipo\/\d+\/)"/i);
    if (m) return "https://www.chittorgarh.com" + m[1];
    m = html.match(/href="(\/ipo\/[^"]+)"[^>]*>\s*[^<]*(?:Limited|Ltd)/i);
    if (m) return "https://www.chittorgarh.com" + m[1];
    m = html.match(/href="(https:\/\/www\.chittorgarh\.com\/ipo\/[^"]+)"/i);
    if (m) return m[1];
  } catch (err) {
    console.warn(`[Chittorgarh Search Warn] Failed to search for ${companyName}:`, err.message);
  }
  return null;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const targets = ["Indo-MIM", "Lohia Corp", "Xtranet Technologies"];
  for (const name of targets) {
    const url = await findChittorgarhUrl(page, name);
    console.log(name, "-> Chittorgarh URL:", url);
  }
  await browser.close();
}

run().catch(console.error);
