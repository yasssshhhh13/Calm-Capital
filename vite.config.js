import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { exec } from "child_process";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "api-refresh-middleware",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith("/api/refresh")) {
            console.log("[Vite Middleware] /api/refresh received. Starting scraper...");
            const scriptPath = path.resolve(process.cwd(), "scripts", "scrape-ipo-data.mjs");
            
            exec(`"${process.execPath}" "${scriptPath}"`, (error, stdout, stderr) => {
              if (error) {
                console.error("[Vite Middleware] Scraper execution failed:", error);
                console.error(stderr);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Scraper execution failed: " + error.message, stderr }));
                return;
              }
              console.log("[Vite Middleware] Scraper completed successfully.");
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: true, message: "Database refreshed successfully", updatedAt: new Date().toISOString() }));
            });
            return;
          }
          next();
        });
      }
    }
  ],
  build: {
    chunkSizeWarningLimit: 1200,
  },
});
