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

function hideSplash() {
  const seoContent = document.getElementById("seo-content");
  if (seoContent) {
    seoContent.setAttribute("hidden", "");
    seoContent.style.display = "none";
  }
}

// Global maximum fallback timeout: force release splash/prerender elements after 3s max
if (typeof window !== "undefined") {
  setTimeout(hideSplash, 3000);
}

function mount() {
  const rootEl = document.getElementById("root");
  if (!rootEl) return;

  hideSplash();

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
