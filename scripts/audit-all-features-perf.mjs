import { chromium } from "playwright";

async function run() {
  console.log("=== COMPREHENSIVE SITE-WIDE PERFORMANCE AUDIT ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const results = [];
  function logPerf(feature, durationMs, targetMs = 300) {
    const passed = durationMs <= targetMs;
    results.push({ feature, durationMs, passed, targetMs });
    const status = passed ? "✓ SMOOTH" : "⚠ SLOW";
    console.log(`[${status}] ${feature}: ${durationMs}ms (target: <=${targetMs}ms)`);
  }

  // 1. Initial Page Load
  const t0 = Date.now();
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
  logPerf("Initial Page Load (Overview)", Date.now() - t0, 3000);

  // 2. Tab Navigation: Open IPOs
  let t = Date.now();
  await page.click('button:has-text("Open"), a[href*="open"]');
  await page.waitForSelector('text=Open IPOs', { timeout: 3000 });
  logPerf("Switch to Open IPOs tab", Date.now() - t, 200);

  // Toggle Mainboard / SME in Open tab
  const smeBtn = page.locator('button:has-text("SME (")').first();
  await smeBtn.scrollIntoViewIfNeeded();
  t = Date.now();
  await smeBtn.click();
  logPerf("Toggle SME in Open tab", Date.now() - t, 200);

  // 3. Tab Navigation: Upcoming IPOs
  t = Date.now();
  await page.click('button:has-text("Upcoming"), a[href*="upcoming"]');
  await page.waitForSelector('text=Upcoming IPOs', { timeout: 3000 });
  logPerf("Switch to Upcoming IPOs tab", Date.now() - t, 200);

  // 4. Tab Navigation: Closed IPOs
  t = Date.now();
  await page.click('button:has-text("Closed"), a[href*="closed"]');
  await page.waitForSelector('text=Closed IPOs', { timeout: 3000 });
  logPerf("Switch to Closed IPOs tab", Date.now() - t, 200);

  // 5. Tab Navigation: Listed IPOs
  t = Date.now();
  await page.click('button:has-text("Listed"), a[href*="listed"]');
  await page.waitForSelector('text=Listed IPOs', { timeout: 3000 });
  logPerf("Switch to Listed IPOs tab", Date.now() - t, 200);

  // 6. Tab Navigation: GMP Trends Tab
  t = Date.now();
  await page.click('button:has-text("GMP"), a[href*="gmp"]');
  await page.waitForSelector('text=GMP % Gain', { timeout: 3000 });
  logPerf("Switch to GMP Trends tab", Date.now() - t, 250);

  // 7. Tab Navigation: Compare Tab
  t = Date.now();
  await page.click('button:has-text("Compare"), a[href*="compare"]');
  await page.waitForSelector('text=IPO Comparison', { timeout: 3000 });
  logPerf("Switch to Compare tab", Date.now() - t, 250);

  // Swap IPOs in Compare tab
  const swapBtn = page.locator('button[title*="Swap"]');
  if (await swapBtn.count()) {
    await swapBtn.scrollIntoViewIfNeeded();
    t = Date.now();
    await swapBtn.click();
    logPerf("Swap IPOs in Compare tab", Date.now() - t, 200);
  }

  // 8. Tab Navigation: Subscriptions Tab
  t = Date.now();
  await page.click('button:has-text("Subscriptions"), a[href*="subscriptions"]');
  await page.waitForSelector('text=IPO Subscriptions', { timeout: 3000 });
  logPerf("Switch to Subscriptions tab", Date.now() - t, 250);

  // 9. Tab Navigation: Financials Tab
  t = Date.now();
  await page.click('button:has-text("Financials"), a[href*="financials"]');
  await page.waitForSelector('text=Company Financial Metrics Grid', { timeout: 3000 });
  logPerf("Switch to Financials tab", Date.now() - t, 250);

  // 10. Tab Navigation: Documents Tab
  t = Date.now();
  await page.click('button:has-text("DRHP / RHP"), button:has-text("Documents"), a[href*="docs"]');
  await page.waitForSelector('text=Official Filings & Documents', { timeout: 3000 });
  logPerf("Switch to Documents tab", Date.now() - t, 250);

  // 11. Tab Navigation: Profit Calculator
  t = Date.now();
  await page.click('button:has-text("Profit Calculator"), a[href*="calculator"]');
  await page.waitForSelector('text=IPO Profit Calculator', { timeout: 3000 });
  logPerf("Switch to Profit Calculator tab", Date.now() - t, 250);

  // Profit Calculator: Open Dropdown
  const dropdownTrigger = page.locator('button:has(svg.lucide-chevron-right)').first();
  await dropdownTrigger.scrollIntoViewIfNeeded();
  t = Date.now();
  await dropdownTrigger.click();
  await page.locator('div[style*="max-height"]').waitFor({ state: "visible", timeout: 2000 });
  logPerf("Calculator: Open IPO Dropdown", Date.now() - t, 200);

  // Profit Calculator: Select 1st IPO
  t = Date.now();
  const ipoBtn1 = page.locator('div[style*="max-height"] button:has(p)').first();
  await ipoBtn1.click();
  await page.locator('div[style*="max-height"]').waitFor({ state: "detached", timeout: 2000 });
  logPerf("Calculator: Select IPO 1", Date.now() - t, 150);

  // Profit Calculator: Lot counter click
  t = Date.now();
  await page.locator('button:has-text("+")').click();
  logPerf("Calculator: Increment lot counter", Date.now() - t, 100);

  // 12. Modal Open & Close: Click IPO Card
  await page.click('button:has-text("Overview"), a[href="/"]');
  await page.waitForSelector('text=Designed by Discipline');
  
  const firstCard = page.locator('div.group a[aria-label*="View"]').first();
  await firstCard.scrollIntoViewIfNeeded();
  t = Date.now();
  await firstCard.click();
  await page.waitForSelector('text=IPO Summary Preview', { timeout: 2000 });
  logPerf("Open IPO Detail Modal", Date.now() - t, 200);

  // Close modal
  t = Date.now();
  await page.locator('button:has(svg.lucide-x)').first().click();
  await page.waitForSelector('text=IPO Summary Preview', { state: "detached", timeout: 2000 });
  logPerf("Close IPO Detail Modal", Date.now() - t, 150);

  // 13. Global Search Input Responsiveness
  t = Date.now();
  const searchInput = page.locator('header input[placeholder*="Search"]').first();
  await searchInput.fill("solar");
  logPerf("Global Search keystroke & filter", Date.now() - t, 250);

  await searchInput.fill("");

  await browser.close();

  const allPassed = results.every(r => r.passed);
  console.log("\n=== AUDIT SUMMARY ===");
  console.log(`Total checks: ${results.length}`);
  console.log(`All checks passed within smooth budget: ${allPassed ? "YES! 100% LAG FREE" : "SOME FAILED"}`);
}

run().catch((err) => {
  console.error("Audit test error:", err);
  process.exit(1);
});
