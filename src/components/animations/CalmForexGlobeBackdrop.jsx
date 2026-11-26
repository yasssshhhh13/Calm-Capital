import React, { memo } from "react";

/**
 * CalmForexGlobeBackdrop
 * Ultra-Smooth 3D Cyber Globe & Interbank Telemetry Animation.
 * Pure GPU-accelerated CSS and SVG vectors with zero video decode lag.
 * Engineered for 120 FPS butter-smooth scrolling and crisp typography.
 */
export const CalmForexGlobeBackdrop = memo(function CalmForexGlobeBackdrop({
  className = "",
  intensity = "normal", // "subtle" | "normal" | "vibrant"
  dark = true
}) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none select-none rounded-[inherit] ${className}`}>
      
      {/* Base Tone */}
      {dark ? (
        <div className="absolute inset-0 bg-gradient-to-r from-[#040E1B] via-[#07172A] to-[#0A223B] opacity-90" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.03] via-transparent to-blue-500/[0.04]" />
      )}

      {/* Hardware-Accelerated Ambient Glowing Mesh */}
      {dark && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
          <div
            className="absolute -right-20 -top-20 w-[400px] h-[400px] rounded-full blur-[70px]"
            style={{
              background: "radial-gradient(circle, rgba(28, 155, 218, 0.3) 0%, rgba(14, 165, 233, 0.15) 40%, transparent 70%)"
            }}
          />
        </div>
      )}

      {/* Holographic Earth Core & Orbital Telemetry */}
      <div className="absolute right-0 top-0 bottom-0 w-full md:w-3/5 flex items-center justify-end pr-4 sm:pr-8 lg:pr-12 pointer-events-none">
        
        {/* Deep Cyber Radial Glow */}
        <div
          className={`absolute w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] rounded-full blur-2xl ${
            dark ? "opacity-60" : "opacity-25"
          }`}
          style={{
            background: dark
              ? "radial-gradient(circle at center, rgba(28, 155, 218, 0.25) 0%, rgba(14, 165, 233, 0.1) 50%, transparent 75%)"
              : "radial-gradient(circle at center, rgba(28, 155, 218, 0.12) 0%, rgba(14, 165, 233, 0.06) 50%, transparent 75%)"
          }}
        />

        {/* Holographic Earth Wireframe Sphere */}
        <svg
          className={`w-full max-w-[360px] h-auto max-h-[360px] animate-spin-slow transition-transform duration-700 ${
            dark ? "opacity-65" : "opacity-25"
          }`}
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Latitude Rings */}
          <ellipse cx="200" cy="200" rx="160" ry="160" stroke="#1c9bda" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.7" />
          <ellipse cx="200" cy="200" rx="160" ry="110" stroke="#38bdf8" strokeWidth="1" opacity="0.5" />
          <ellipse cx="200" cy="200" rx="160" ry="60" stroke="#0284c7" strokeWidth="1" opacity="0.6" />
          <ellipse cx="200" cy="200" rx="160" ry="20" stroke="#38bdf8" strokeWidth="1.4" opacity="0.8" />

          {/* Longitude Arcs */}
          <ellipse cx="200" cy="200" rx="110" ry="160" stroke="#0ea5e9" strokeWidth="1" opacity="0.5" />
          <ellipse cx="200" cy="200" rx="60" ry="160" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />
          <line x1="200" y1="40" x2="200" y2="360" stroke="#1c9bda" strokeWidth="1.4" strokeDasharray="4 4" opacity="0.8" />
          <line x1="40" y1="200" x2="360" y2="200" stroke="#1c9bda" strokeWidth="1.4" strokeDasharray="4 4" opacity="0.8" />

          {/* Interbank Currency Transmission Arcs */}
          <path
            d="M 120 160 Q 200 90 280 170"
            fill="none"
            stroke="url(#globeArcGlowFast)"
            strokeWidth="2.2"
            strokeDasharray="6 4"
            className="animate-pulse"
          />

          {/* Global Financial Nodes */}
          <circle cx="120" cy="160" r="4" fill="#38bdf8" className="animate-ping" opacity="0.8" />
          <circle cx="120" cy="160" r="3" fill="#ffffff" />
          <circle cx="200" cy="120" r="3.5" fill="#10b981" />
          <circle cx="200" cy="120" r="2" fill="#ffffff" />
          <circle cx="280" cy="170" r="3.5" fill="#f59e0b" />
          <circle cx="280" cy="170" r="2" fill="#ffffff" />

          {/* Gradient definitions */}
          <defs>
            <linearGradient id="globeArcGlowFast" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#1c9bda" stopOpacity="1" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Protective Left Vignette */}
      {dark ? (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to right, rgba(4, 14, 27, 0.95) 0%, rgba(4, 14, 27, 0.75) 45%, rgba(4, 14, 27, 0.15) 75%, transparent 100%)"
          }}
        />
      ) : (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to right, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.8) 45%, rgba(255, 255, 255, 0.2) 75%, transparent 100%)"
          }}
        />
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes spinSlowGlobe {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spinSlowGlobe 60s linear infinite;
        }
      `}</style>
    </div>
  );
});

export default CalmForexGlobeBackdrop;
