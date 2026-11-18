import { chromium } from "playwright";
import fs from "fs";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:4173/ ...");
  await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // 1. Capture 2-Sided Gateway on Overview
  await page.screenshot({ path: "C:/Users/yash2/.gemini/antigravity/brain/eb7658b9-18a8-4a1a-bf65-875a80ad7367/calmcapital-dual-gateway-overview.png" });
  console.log("Captured calmcapital-dual-gateway-overview.png");

  // 2. Click Forex Hub in the header toggle
  console.log("Clicking Forex Hub...");
  await page.locator("header button:has-text('Forex Hub')").click();
  await page.waitForTimeout(1000);

  // Capture Forex News tab
  await page.screenshot({ path: "C:/Users/yash2/.gemini/antigravity/brain/eb7658b9-18a8-4a1a-bf65-875a80ad7367/calmcapital-forex-news-synced.png" });
  console.log("Captured calmcapital-forex-news-synced.png");

  // Check currency counts and table header count
  const tableHeader = await page.locator("text=Economic Calendar Releases").first().textContent();
  console.log("Table Header text:", tableHeader);

  // 3. Switch to Journal tab
  console.log("Switching to Discipline Trading Journal...");
  await page.locator("button:has-text('Discipline Trading Journal')").first().click();
  await page.waitForTimeout(1000);

  // Capture Journal entries table with aligned columns
  await page.screenshot({ path: "C:/Users/yash2/.gemini/antigravity/brain/eb7658b9-18a8-4a1a-bf65-875a80ad7367/calmcapital-forex-journal-aligned.png" });
  console.log("Captured calmcapital-forex-journal-aligned.png");

  // Open Log New Trade modal to inspect USD pairs
  console.log("Opening Log New Trade modal...");
  await page.locator("button:has-text('Log New Trade')").first().click();
  await page.waitForTimeout(600);

  const pairOptions = await page.locator("select").first().innerText();
  console.log("Pairs available in modal:\n", pairOptions);

  await page.screenshot({ path: "C:/Users/yash2/.gemini/antigravity/brain/eb7658b9-18a8-4a1a-bf65-875a80ad7367/calmcapital-forex-usd-pairs-modal.png" });
  console.log("Captured calmcapital-forex-usd-pairs-modal.png");

  await browser.close();
  console.log("Verification finished successfully!");
})();
