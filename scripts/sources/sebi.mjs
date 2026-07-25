// SEBI source adapter.
//
// SEBI is the canonical source for the DRHP/RHP filing itself. We don't parse
// the (very large) prospectus PDF here; we resolve the official filing URL so
// the app can link users to the primary document. This is the authoritative
// pointer that lets a user verify every other number themselves.

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function getSearchKeywords(company) {
  let name = company.replace(/Limited|Ltd\.|Co\.|Corporation|Trust|InvIT|Private|Pvt|and|&/gi, "").trim();
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 2) return words.slice(0, 2).join(" ");
  return name;
}

/** Search SEBI public-issue filings and return the best-matching filing URL, or null. */
export async function findFilingUrl(companyName, browser) {
  const page = await browser.newPage({ userAgent: UA });
  try {
    const searchKeyword = getSearchKeywords(companyName);
    console.log(`[SEBI SEARCH] Searching SEBI filings for: "${searchKeyword}"`);

    await page.goto("https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=10", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    await page.waitForSelector("#search", { timeout: 5005 });
    await page.fill("#search", searchKeyword);
    await page.click(".go_search");
    await page.waitForTimeout(3000);

    const match = await page.evaluate(() => {
      const linkEl = document.querySelector("#sample_1 tbody tr td a.points");
      if (linkEl) return { title: linkEl.innerText.trim(), href: linkEl.getAttribute("href") };
      return null;
    });

    if (match && match.href) {
      let absoluteUrl = match.href;
      try {
        absoluteUrl = new URL(match.href, "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=10").href;
      } catch (e) {}
      console.log(`[SEBI SUCCESS] Found official URL for ${companyName}: ${absoluteUrl}`);
      return absoluteUrl;
    }
    return null;
  } catch (err) {
    console.warn(`[SEBI WARN] Error searching SEBI for "${companyName}":`, err.message);
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}
