import React, { Component } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { initAnalytics } from "./analytics.js";

try {
  initAnalytics();
} catch (e) {
  console.warn("Analytics init skipped:", e);
}

class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[GlobalErrorBoundary] App crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A1020",
          color: "#e2e8f0",
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          padding: "24px",
          textAlign: "center"
        }}>
          <div style={{
            maxWidth: "480px",
            width: "100%",
            backgroundColor: "#121D2D",
            border: "1px solid #2D4056",
            borderRadius: "24px",
            padding: "32px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              backgroundColor: "rgba(28,155,218,0.15)",
              color: "#1C9BDA",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: "bold"
            }}>
              CC
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: "#ffffff" }}>
              Calm Capital
            </h2>
            <p style={{ fontSize: "13px", color: "#8EA1B7", margin: 0, lineHeight: 1.6 }}>
              A temporary display error occurred. Click below to reset state and reload the platform.
            </p>
            <button
              onClick={() => {
                try { localStorage.clear(); } catch { /* ignore */ }
                window.location.href = "/";
              }}
              style={{
                marginTop: "8px",
                padding: "12px 24px",
                borderRadius: "12px",
                backgroundColor: "#1C9BDA",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "13px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(28,155,218,0.3)"
              }}
            >
              Reload Platform
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById("root");
if (rootEl) {
  const seoContent = document.getElementById("seo-content");
  if (seoContent) {
    seoContent.setAttribute("hidden", "");
    seoContent.style.display = "none";
  }

  try {
    ReactDOM.createRoot(rootEl).render(
      <GlobalErrorBoundary>
        <App />
      </GlobalErrorBoundary>
    );
  } catch (err) {
    console.error("Fatal React render error:", err);
  }
}
