import fs from "fs";

function run() {
  const html = fs.readFileSync("C:/Users/yash2/.gemini/antigravity-ide/brain/104dc9a8-8ff6-4afb-9155-b1c5766893a5/scratch/search-indomim.html", "utf8");
  
  // Print any text lines containing "indo" or "mim"
  const lines = html.split("\n");
  console.log("Lines with 'indo' or 'mim':");
  for (const line of lines) {
    if (line.toLowerCase().includes("indo") || line.toLowerCase().includes("mim")) {
      console.log(line.trim());
    }
  }
}

run();
