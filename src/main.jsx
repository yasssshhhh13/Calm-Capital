import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { initAnalytics } from "./analytics.js";

try {
  initAnalytics();
} catch (e) {
  console.warn("Analytics init skipped:", e);
}

const rootEl = document.getElementById("root");
if (rootEl) {
  const seoContent = document.getElementById("seo-content");
  if (seoContent) {
    seoContent.setAttribute("hidden", "");
    seoContent.style.display = "none";
  }

  try {
    ReactDOM.createRoot(rootEl).render(<App />);
  } catch (err) {
    console.error("Fatal React render error:", err);
  }
}
