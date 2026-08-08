import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ipos = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "public", "ipos.json"), "utf-8"));

console.log("Total baseline IPOs:", ipos.length);

const targetSlug = "optimystix-entertainment";
const found = ipos.find(i => {
  const id = String(i.id || "").toLowerCase();
  const slug = String(i.slug || "").toLowerCase();
  const company = String(i.company || i.name || "").toLowerCase();
  return id.includes("optimystix") || slug.includes("optimystix") || company.includes("optimystix");
});

console.log("Found Optimystix IPO Object:");
console.log(JSON.stringify(found, null, 2));
