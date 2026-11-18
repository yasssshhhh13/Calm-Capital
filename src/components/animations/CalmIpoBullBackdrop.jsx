import React, { useRef, useState, useEffect, memo } from "react";

/**
 * CalmIpoBullBackdrop
 * Cinematic Dalal Street & Wall Street Charging Bull Financial Animation.
 * Features golden-emerald market surge video loop, holographic bull aura, and laser candlestick grid.
 */
export const CalmIpoBullBackdrop = memo(function CalmIpoBullBackdrop({
  className = "",
  intensity = "normal" // "subtle" | "normal" | "vibrant"
}) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.9;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          setVideoFailed(true);
        });
      }
    }
  }, []);

  const opacityClass =
    intensity === "vibrant"
      ? "opacity-60 dark:opacity-70"
      : intensity === "subtle"
      ? "opacity-25 dark:opacity-35"
      : "opacity-45 dark:opacity-55";

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none select-none rounded-[inherit] ${className}`}>
      
      {/* 1. Cinematic Financial Market Surge Video Loop */}
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
            filter: "hue-rotate(65deg) contrast(1.2) brightness(1.15)"
          }}
        >
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-with-charts-31913-large.mp4"
            type="video/mp4"
          />
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-golden-particles-rising-in-the-dark-42407-large.mp4"
            type="video/mp4"
          />
        </video>
      )}

      {/* 2. Procedural Holographic Dalal Street Bull Hologram & Rising Market Energy */}
      <div className="absolute inset-0 flex items-center justify-center">
        
        {/* Emerald Golden Aura Core */}
        <div
          className="absolute w-[440px] h-[440px] rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle at center, rgba(16, 185, 129, 0.25) 0%, rgba(245, 158, 11, 0.12) 50%, transparent 75%)"
          }}
        />

        {/* Powerful Holographic Charging Bull Silhouette (SVG Wireframe) */}
        <svg
          className="w-full h-full max-w-[460px] max-h-[460px] opacity-30 dark:opacity-45"
          viewBox="0 0 500 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Glowing Bull Energy Field Outlines */}
          <path
            d="M 120 280 C 130 220, 160 170, 210 160 C 250 150, 280 130, 310 90 C 330 65, 360 70, 380 95 C 410 130, 420 170, 410 220 C 390 280, 340 310, 280 320 C 200 330, 140 310, 120 280 Z"
            stroke="url(#bullGoldenGradient)"
            strokeWidth="1.5"
            strokeDasharray="6 3"
            className="animate-pulse"
          />

          {/* Majestic Horns with Electric Charge */}
          <path
            d="M 330 85 C 345 50, 375 25, 410 20 C 405 40, 395 65, 375 80"
            fill="none"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 315 105 C 330 75, 355 45, 390 35 C 380 60, 365 85, 345 105"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Muscular Shoulders & Forward Momentum Spine */}
          <path
            d="M 210 160 Q 280 140 340 180 T 400 240"
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            opacity="0.8"
          />
          <path
            d="M 150 240 Q 220 200 290 230"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.65"
          />

          {/* Charging Front Legs */}
          <line x1="340" y1="260" x2="380" y2="350" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="290" y1="270" x2="310" y2="360" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />

          {/* Powerful Back Stance */}
          <line x1="160" y1="270" x2="130" y2="360" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="200" y1="280" x2="190" y2="360" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />

          {/* Ascending Market Trendline piercing through */}
          <path
            d="M 60 330 L 160 270 L 230 290 L 320 200 L 400 220 L 460 110"
            fill="none"
            stroke="url(#bullLaserGreen)"
            strokeWidth="3"
            strokeLinecap="round"
            className="animate-pulse"
          />

          {/* Upward Bullish Arrow at Apex */}
          <polygon points="460,95 475,120 445,120" fill="#10b981" />

          {/* Ground Impact Particle Rings */}
          <ellipse cx="380" cy="350" rx="25" ry="6" stroke="#10b981" strokeWidth="1.5" opacity="0.6" />
          <ellipse cx="130" cy="360" rx="30" ry="7" stroke="#fbbf24" strokeWidth="1.2" opacity="0.5" />

          {/* Gradient Definitions */}
          <defs>
            <linearGradient id="bullGoldenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="bullLaserGreen" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="60%" stopColor="#34d399" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
            </linearGradient>
          </defs>
        </svg>

        {/* Upward Velocity Green Candlestick Bars */}
        <div className="absolute inset-0 flex items-end justify-between px-8 pb-4 opacity-25 dark:opacity-35 pointer-events-none">
          {[
            { h: "35%", color: "bg-emerald-500", glow: "shadow-emerald-500/50" },
            { h: "52%", color: "bg-emerald-400", glow: "shadow-emerald-400/50" },
            { h: "44%", color: "bg-teal-500", glow: "shadow-teal-500/50" },
            { h: "68%", color: "bg-emerald-500", glow: "shadow-emerald-500/50" },
            { h: "85%", color: "bg-emerald-400", glow: "shadow-emerald-400/80" },
            { h: "98%", color: "bg-emerald-300", glow: "shadow-emerald-300/90" }
          ].map((bar, idx) => (
            <div key={idx} className="flex flex-col items-center justify-end h-full w-5">
              <div
                className={`w-full rounded-t-md ${bar.color} shadow-lg ${bar.glow} transition-all duration-700`}
                style={{ height: bar.h }}
              />
            </div>
          ))}
        </div>

        {/* Floating Kinetic IPO Badges */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[
            { tag: "MAINBOARD 50X", val: "QIB Radar", top: "16%", left: "14%", color: "text-emerald-400 border-emerald-500/30" },
            { tag: "NSE / BSE SME", val: "+84% GMP", top: "74%", left: "12%", color: "text-amber-400 border-amber-500/30" },
            { tag: "ALLOTMENT LIVE", val: "Multi-PAN", top: "20%", right: "12%", color: "text-teal-400 border-teal-500/30" },
            { tag: "BULL REGIME", val: "Expectancy +", top: "70%", right: "14%", color: "text-emerald-400 border-emerald-500/30" }
          ].map((item, idx) => (
            <div
              key={idx}
              className={`absolute hidden md:flex flex-col px-2.5 py-1 rounded-xl bg-black/40 backdrop-blur-md border ${item.color} font-mono text-[9px] shadow-sm animate-pulse`}
              style={{
                top: item.top,
                left: item.left,
                right: item.right,
                animationDuration: `${3.5 + idx}s`
              }}
            >
              <span className="font-black tracking-wider leading-none">{item.tag}</span>
              <span className="opacity-80 text-[8px] mt-0.5">{item.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. High-Tech Grid Coordinates Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(16,185,129,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
      />

      {/* 4. Protective Glass Vignette Gradients for 100% Foreground Text Contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-white/70 dark:from-[#0B1F33]/95 dark:via-transparent dark:to-[#06111E]/80 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-gradient-to-edges from-transparent via-transparent to-white/60 dark:to-[#06111E]/90 pointer-events-none" />
    </div>
  );
});

export default CalmIpoBullBackdrop;
