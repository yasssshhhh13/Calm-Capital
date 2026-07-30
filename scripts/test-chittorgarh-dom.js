import { chromium } from "playwright";

async function findChittorgarhUrl(page, companyName) {
  const query = companyName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, "+");
  const searchUrl = `https://www.chittorgarh.com/search/?q=${query}`;
  try {
    console.log(`Searching for: ${companyName} at ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(3000); // Wait for Next.js hydration and API call
    
    return await page.evaluate((compName) => {
      const links = Array.from(document.querySelectorAll("a"));
      const ipoLinks = links.map(a => ({
        text: a.innerText.trim(),
        href: a.getAttribute("href")
      })).filter(x => x.href && (x.href.includes("/ipo/") || x.href.includes("/report/")));
      
      console.log("All IPO/Report links on page:", JSON.stringify(ipoLinks));
      
      // Look for the best match
      const nameNorm = compName.toLowerCase().replace(/[^a-z0-9]+/g, "");
      
      // First pass: exact or close match in link text
      for (const l of ipoLinks) {
        if (!l.href.includes("/ipo/")) continue;
        const textNorm = l.text.toLowerCase().replace(/[^a-z0-9]+/g, "");
        if (textNorm.includes(nameNorm) || nameNorm.includes(textNorm)) {
          return l.href.startsWith("http") ? l.href : "https://www.chittorgarh.com" + l.href;
        }
      }
      
      // Second pass: match any link that has the company name in it
      for (const l of ipoLinks) {
        if (!l.href.includes("/ipo/")) continue;
        if (l.href.toLowerCase().includes(nameNorm)) {
          return l.href.startsWith("http") ? l.href : "https://www.chittorgarh.com" + l.href;
        }
      }
      
      return null;
    }, companyName);
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
