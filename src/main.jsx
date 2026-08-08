import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { initAnalytics } from "./analytics.js";

try {
  initAnalytics();
} catch (e) {
  console.warn("Analytics init skipped:", e);
}

function mount() {
  const rootEl = document.getElementById("root");
  if (!rootEl) return;

  const seoContent = document.getElementById("seo-content");
  if (seoContent) {
    seoContent.setAttribute("hidden", "");
    seoContent.style.display = "none";
  }

  try {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error("Fatal React render error:", err);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
