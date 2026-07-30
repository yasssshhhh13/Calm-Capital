import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://www.chittorgarh.com/", { waitUntil: "domcontentloaded", timeout: 20000 });
  
  // Find any form elements or inputs related to search
  const searchElements = await page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll("form")).map(form => ({
      action: form.getAttribute("action"),
      method: form.getAttribute("method"),
      inputs: Array.from(form.querySelectorAll("input")).map(input => ({
        name: input.getAttribute("name"),
        type: input.getAttribute("type"),
        placeholder: input.getAttribute("placeholder")
      }))
    }));
    
    const inputs = Array.from(document.querySelectorAll("input")).map(input => ({
      id: input.getAttribute("id"),
      name: input.getAttribute("name"),
      placeholder: input.getAttribute("placeholder")
    }));
    
    return { forms, inputs };
  });
  
  console.log("Search Elements:", JSON.stringify(searchElements, null, 2));
  await browser.close();
}

run().catch(console.error);
