import React, { useRef, useState, useEffect, memo } from "react";

/**
 * CalmForexGlobeBackdrop
 * Ultra-high-end ForexNotes-inspired 3D Cyber Globe & Global Telemetry Video Animation.
 * Combines hardware-accelerated video loop with live SVG holographic currency connection arcs.
 */
export const CalmForexGlobeBackdrop = memo(function CalmForexGlobeBackdrop({
  className = "",
  showOverlayText = false,
  intensity = "normal" // "subtle" | "normal" | "vibrant"
}) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.85; // Cinematic slow pace
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay blocked by browser policy (mobile low power), fallback kicks in smoothly
          setVideoFailed(true);
        });
      }
    }
  }, []);

  const opacityClass =
    intensity === "vibrant"
      ? "opacity-55 dark:opacity-65"
      : intensity === "subtle"
      ? "opacity-25 dark:opacity-35"
      : "opacity-40 dark:opacity-50";

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none select-none rounded-[inherit] ${className}`}>
      
      {/* 1. Cinematic Video Loop Background */}
      {!videoFailed && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoFailed(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            videoLoaded ? opacityClass : "opacity-0"
          }`}
          style={{
            mixBlendMode: "screen",
            filter: "hue-rotate(185deg) contrast(1.15) brightness(1.1)"
          }}
        >
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-rotating-earth-globe-with-networks-9092-large.mp4"
            type="video/mp4"
          />
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-planet-earth-rotating-in-space-41584-large.mp4"
            type="video/mp4"
          />
        </video>
      )}

      {/* 2. Procedural Holographic Earth Core & Orbital Currency Telemetry */}
      <div className="absolute inset-0 flex items-center justify-center">
        
        {/* Deep Cyber Radial Glow */}
        <div
          className="absolute w-[460px] h-[460px] rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle at center, rgba(28, 155, 218, 0.22) 0%, rgba(14, 165, 233, 0.08) 50%, transparent 75%)"
          }}
        />

        {/* Holographic Earth Wireframe Sphere (SVG 3D Illusion) */}
        <svg
          className="w-full h-full max-w-[500px] max-h-[500px] opacity-35 dark:opacity-45 animate-spin-slow"
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Latitude Rings */}
          <ellipse cx="200" cy="200" rx="160" ry="160" stroke="#1c9bda" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
          <ellipse cx="200" cy="200" rx="160" ry="120" stroke="#38bdf8" strokeWidth="0.8" opacity="0.4" />
          <ellipse cx="200" cy="200" rx="160" ry="70" stroke="#0284c7" strokeWidth="0.8" opacity="0.5" />
          <ellipse cx="200" cy="200" rx="160" ry="25" stroke="#38bdf8" strokeWidth="1.2" opacity="0.7" />

          {/* Longitude Arcs */}
          <ellipse cx="200" cy="200" rx="120" ry="160" stroke="#0ea5e9" strokeWidth="0.8" opacity="0.4" />
          <ellipse cx="200" cy="200" rx="70" ry="160" stroke="#38bdf8" strokeWidth="0.8" opacity="0.5" />
          <line x1="200" y1="40" x2="200" y2="360" stroke="#1c9bda" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.8" />
          <line x1="40" y1="200" x2="360" y2="200" stroke="#1c9bda" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.8" />

          {/* Interbank Currency Transmission Arcs */}
          <path
            d="M 120 160 Q 200 90 280 170"
            fill="none"
            stroke="url(#globeArcGlow)"
            strokeWidth="2"
            strokeDasharray="6 4"
            className="animate-pulse"
          />
          <path
            d="M 150 250 Q 200 180 290 220"
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.75"
          />

          {/* Institutional Global Financial Nodes */}
          {/* New York */}
          <circle cx="120" cy="160" r="4" fill="#38bdf8" className="animate-ping" opacity="0.8" />
          <circle cx="120" cy="160" r="3" fill="#ffffff" />
          {/* London */}
          <circle cx="200" cy="140" r="4.5" fill="#1c9bda" />
          <circle cx="200" cy="140" r="2" fill="#ffffff" />
          {/* Frankfurt */}
          <circle cx="215" cy="150" r="3" fill="#a855f7" />
          {/* Tokyo */}
          <circle cx="280" cy="170" r="4" fill="#10b981" className="animate-ping" opacity="0.7" />
          <circle cx="280" cy="170" r="3" fill="#ffffff" />

          {/* Gradient definitions */}
          <defs>
            <linearGradient id="globeArcGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#1c9bda" stopOpacity="1" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>

        {/* Counter-Rotating Orbital Data Halo */}
        <div
          className="absolute w-[360px] h-[360px] rounded-full border border-teal-500/20 pointer-events-none"
          style={{
            transform: "rotateX(70deg) rotateZ(35deg)",
            boxShadow: "0 0 35px rgba(28, 155, 218, 0.15)"
          }}
        />

        {/* Floating Kinetic Currency Particle Streams */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[
            { sym: "EUR/USD", val: "1.0542", top: "18%", left: "12%", color: "text-[#38bdf8]" },
            { sym: "XAU/USD", val: "$2,596", top: "72%", left: "15%", color: "text-amber-400" },
            { sym: "GBP/USD", val: "1.2685", top: "22%", right: "14%", color: "text-emerald-400" },
            { sym: "USD/JPY", val: "154.62", top: "68%", right: "12%", color: "text-cyan-400" }
          ].map((item, idx) => (
            <div
              key={idx}
              className={`absolute hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 font-mono text-[9px] font-bold ${item.color} shadow-sm animate-pulse`}
              style={{
                top: item.top,
                left: item.left,
                right: item.right,
                animationDuration: `${3 + idx}s`
              }}
            >
              <span>{item.sym}</span>
              <span className="opacity-90">{item.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. High-Tech Matrix Cyber Scanline Grid Overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(28,155,218,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(28,155,218,0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
      />

      {/* 4. Vignette Shadow Gradients to maintain 100% foreground legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-white/70 dark:from-[#0B1528]/95 dark:via-transparent dark:to-[#071324]/80 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-gradient-to-edges from-transparent via-transparent to-white/60 dark:to-[#071324]/90 pointer-events-none" />

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
