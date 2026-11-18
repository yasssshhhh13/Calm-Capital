import React, { useRef, useState, useEffect, memo } from "react";

/**
 * CalmForexGlobeBackdrop
 * Ultra-Aesthetic 3D Cyber Globe & Interbank Telemetry Animation.
 * Engineered for 100% foreground text clarity, rich institutional feel, and zero clutter.
 * Supports both Dark Mode (deep obsidian + neon cyan/teal) and Light Mode (crisp white + soft cyan watermark).
 */
export const CalmForexGlobeBackdrop = memo(function CalmForexGlobeBackdrop({
  className = "",
  intensity = "normal", // "subtle" | "normal" | "vibrant"
  dark = true
}) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (dark && videoRef.current) {
      videoRef.current.playbackRate = 0.8;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          setVideoFailed(true);
        });
      }
    }
  }, [dark]);

  const videoOpacity =
    intensity === "vibrant"
      ? "opacity-30 dark:opacity-40"
      : intensity === "subtle"
      ? "opacity-15 dark:opacity-25"
      : "opacity-20 dark:opacity-30";

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none select-none rounded-[inherit] ${className}`}>
      
      {/* 1. Base Tone: Obsidian Navy in Dark Mode vs Soft Luminous Sky in Light Mode */}
      {dark ? (
        <div className="absolute inset-0 bg-gradient-to-r from-[#040E1B] via-[#07172A] to-[#0A223B] opacity-90" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.03] via-transparent to-blue-500/[0.04]" />
      )}

      {/* 2. Cinematic Earth / Financial Mesh Video Loop (Dark Mode Only) */}
      {dark && !videoFailed && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoFailed(true)}
          className={`absolute right-0 top-0 bottom-0 w-full sm:w-3/4 h-full object-cover transition-opacity duration-1000 ${
            videoLoaded ? videoOpacity : "opacity-0"
          }`}
          style={{
            mixBlendMode: "screen",
            filter: "hue-rotate(185deg) contrast(1.2) brightness(1.1)",
            maskImage: "linear-gradient(to right, transparent 0%, black 50%, black 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 50%, black 100%)"
          }}
        >
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-global-digital-network-connections-41585-large.mp4"
            type="video/mp4"
          />
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-planet-earth-rotating-in-space-41584-large.mp4"
            type="video/mp4"
          />
        </video>
      )}

      {/* 3. Holographic Earth Core & Orbital Currency Telemetry (Positioned on the Right) */}
      <div className="absolute right-0 top-0 bottom-0 w-full md:w-3/5 flex items-center justify-end pr-4 sm:pr-8 lg:pr-12 pointer-events-none">
        
        {/* Deep Cyber Radial Glow */}
        <div
          className={`absolute w-[320px] sm:w-[440px] h-[320px] sm:h-[440px] rounded-full blur-3xl ${
            dark ? "opacity-100" : "opacity-40"
          }`}
          style={{
            background: dark
              ? "radial-gradient(circle at center, rgba(28, 155, 218, 0.22) 0%, rgba(14, 165, 233, 0.08) 50%, transparent 75%)"
              : "radial-gradient(circle at center, rgba(28, 155, 218, 0.14) 0%, rgba(14, 165, 233, 0.06) 50%, transparent 75%)"
          }}
        />

        {/* Holographic Earth Wireframe Sphere */}
        <svg
          className={`w-full max-w-[360px] h-auto max-h-[360px] animate-spin-slow transition-transform duration-700 ${
            dark ? "opacity-50" : "opacity-15"
          }`}
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Latitude Rings */}
          <ellipse cx="200" cy="200" rx="160" ry="160" stroke="#1c9bda" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
          <ellipse cx="200" cy="200" rx="160" ry="110" stroke="#38bdf8" strokeWidth="0.8" opacity="0.4" />
          <ellipse cx="200" cy="200" rx="160" ry="60" stroke="#0284c7" strokeWidth="0.8" opacity="0.5" />
          <ellipse cx="200" cy="200" rx="160" ry="20" stroke="#38bdf8" strokeWidth="1.2" opacity="0.7" />

          {/* Longitude Arcs */}
          <ellipse cx="200" cy="200" rx="110" ry="160" stroke="#0ea5e9" strokeWidth="0.8" opacity="0.4" />
          <ellipse cx="200" cy="200" rx="60" ry="160" stroke="#38bdf8" strokeWidth="0.8" opacity="0.5" />
          <line x1="200" y1="40" x2="200" y2="360" stroke="#1c9bda" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.7" />
          <line x1="40" y1="200" x2="360" y2="200" stroke="#1c9bda" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.7" />

          {/* Interbank Currency Transmission Arcs */}
          <path
            d="M 120 160 Q 200 90 280 170"
            fill="none"
            stroke="url(#globeArcGlow)"
            strokeWidth="2.2"
            strokeDasharray="6 4"
            className="animate-pulse"
          />
          <path
            d="M 150 250 Q 200 180 290 220"
            fill="none"
            stroke="#10b981"
            strokeWidth="1.6"
            strokeDasharray="4 3"
            opacity="0.8"
          />

          {/* Global Financial Nodes */}
          {/* New York */}
          <circle cx="120" cy="160" r="4" fill="#38bdf8" className="animate-ping" opacity="0.8" />
          <circle cx="120" cy="160" r="3" fill="#ffffff" />
          
          {/* London */}
          <circle cx="200" cy="120" r="3.5" fill="#10b981" />
          <circle cx="200" cy="120" r="2" fill="#ffffff" />
          
          {/* Tokyo */}
          <circle cx="280" cy="170" r="3.5" fill="#f59e0b" />
          <circle cx="280" cy="170" r="2" fill="#ffffff" />

          {/* Gradient definitions */}
          <defs>
            <linearGradient id="globeArcGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#1c9bda" stopOpacity="1" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
            </linearGradient>
          </defs>
        </svg>

        {/* Counter-Rotating Orbital Data Halo */}
        <div
          className="absolute w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] rounded-full border border-teal-500/20 pointer-events-none"
          style={{
            transform: "rotateX(72deg) rotateZ(30deg)",
            boxShadow: "0 0 35px rgba(28, 155, 218, 0.15)"
          }}
        />
      </div>

      {/* 4. High-Tech Matrix Scanline Grid Overlay */}
      <div
        className={`absolute inset-0 pointer-events-none ${
          dark ? "opacity-[0.035]" : "opacity-[0.02]"
        }`}
        style={{
          backgroundImage: "linear-gradient(rgba(28,155,218,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(28,155,218,0.4) 1px, transparent 1px)",
          backgroundSize: "28px 28px"
        }}
      />

      {/* 5. Protective Left Vignette: Guarantees 100% Crisp Headline Contrast */}
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

      {/* 6. Subtle Edge Shadow (Dark mode only) */}
      {dark && <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(2,8,16,0.6)] pointer-events-none" />}

      {/* CSS Animation */}
      <style>{`
        @keyframes spinSlowGlobe {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spinSlowGlobe 45s linear infinite;
        }
      `}</style>
    </div>
  );
});

export default CalmForexGlobeBackdrop;
