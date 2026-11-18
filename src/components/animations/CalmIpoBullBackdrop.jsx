import React, { useRef, useState, useEffect, memo } from "react";

/**
 * CalmIpoBullBackdrop
 * Ultra-Aesthetic Dalal Street & Wall Street Charging Bull Financial Animation.
 * Engineered for 100% foreground text clarity, rich institutional feel, and zero clutter.
 * Supports both Dark Mode (deep obsidian + neon gold/emerald) and Light Mode (crisp white + soft emerald watermark).
 */
export const CalmIpoBullBackdrop = memo(function CalmIpoBullBackdrop({
  className = "",
  intensity = "normal", // "subtle" | "normal" | "vibrant"
  dark = true
}) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (dark && videoRef.current) {
      videoRef.current.playbackRate = 0.85;
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
      ? "opacity-35 dark:opacity-45"
      : intensity === "subtle"
      ? "opacity-15 dark:opacity-25"
      : "opacity-25 dark:opacity-35";

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none select-none rounded-[inherit] ${className}`}>
      
      {/* 1. Base Tone: Obsidian Navy in Dark Mode vs Soft Luminous Mint in Light Mode */}
      {dark ? (
        <div className="absolute inset-0 bg-gradient-to-r from-[#06121E] via-[#091D30] to-[#0D2942] opacity-90" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] via-transparent to-teal-500/[0.04]" />
      )}

      {/* 2. Cinematic Golden/Emerald Financial Surge Video Loop (Dark Mode Only to prevent light-mode smudges) */}
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
            filter: "hue-rotate(65deg) contrast(1.25) brightness(1.1)",
            maskImage: "linear-gradient(to right, transparent 0%, black 50%, black 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 50%, black 100%)"
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

      {/* 3. Majestic Dalal Street Charging Bull Hologram (Positioned on the Right) */}
      <div className="absolute right-0 top-0 bottom-0 w-full md:w-3/5 flex items-center justify-end pr-4 sm:pr-8 lg:pr-14 pointer-events-none">
        
        {/* Ambient Emerald & Gold Radial Aura */}
        <div
          className={`absolute w-[320px] sm:w-[440px] h-[320px] sm:h-[440px] rounded-full blur-3xl ${
            dark ? "opacity-100" : "opacity-40"
          }`}
          style={{
            background: dark
              ? "radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, rgba(245, 158, 11, 0.12) 40%, transparent 70%)"
              : "radial-gradient(circle, rgba(16, 185, 129, 0.14) 0%, rgba(245, 158, 11, 0.08) 40%, transparent 70%)"
          }}
        />

        {/* Artistic Charging Bull & Ascending Momentum Vector */}
        <svg
          className={`w-full max-w-[400px] h-auto max-h-[300px] transition-transform duration-700 ${
            dark ? "opacity-55" : "opacity-15"
          }`}
          viewBox="0 0 500 360"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ascending Trend Velocity Laser Line */}
          <path
            d="M 20 320 Q 150 300 240 220 T 460 60"
            stroke="url(#bullLaserGreen)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          
          {/* Laser Glow Shadow */}
          <path
            d="M 20 320 Q 150 300 240 220 T 460 60"
            stroke="#10b981"
            strokeWidth="8"
            strokeOpacity={dark ? "0.25" : "0.1"}
            strokeLinecap="round"
          />

          {/* Peak Market Breakout Star */}
          <circle cx="460" cy="60" r="5" fill="#34d399" />
          <circle cx="460" cy="60" r="10" fill="#10b981" opacity={dark ? "0.4" : "0.2"} className="animate-ping" />

          {/* Majestic Charging Bull Torso & Power Lines */}
          <path
            d="M 140 260 C 150 200, 180 150, 230 140 C 270 130, 300 110, 330 80 C 350 55, 380 60, 400 85 C 430 120, 440 160, 430 210 C 410 260, 360 290, 300 300 C 220 310, 160 290, 140 260 Z"
            stroke="url(#bullGoldenGradient)"
            strokeWidth="1.8"
            strokeDasharray="6 3"
            opacity="0.85"
          />

          {/* Golden Electric Horns */}
          <path
            d="M 350 75 C 365 40, 395 18, 430 15 C 425 35, 415 58, 395 72"
            fill="url(#hornGradient)"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M 365 85 C 380 60, 410 45, 445 42"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Muscular Spine & Rib Velocity Arcs */}
          <path d="M 230 145 C 280 140, 340 165, 390 200" stroke="#34d399" strokeWidth="1.5" opacity="0.6" />
          <path d="M 200 180 C 240 175, 290 195, 340 230" stroke="#10b981" strokeWidth="1.2" opacity="0.5" />
          <path d="M 170 215 C 210 210, 260 225, 300 255" stroke="#fbbf24" strokeWidth="1" opacity="0.5" />

          {/* Foreleg Driving Force */}
          <path d="M 370 240 L 410 320" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 330 250 L 350 330" stroke="#10b981" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          
          {/* Ground Impact Rings */}
          <ellipse cx="410" cy="325" rx="20" ry="5" stroke="#34d399" strokeWidth="1.2" opacity="0.6" />
          <ellipse cx="350" cy="335" rx="16" ry="4" stroke="#fbbf24" strokeWidth="1" opacity="0.5" />

          {/* Gradients */}
          <defs>
            <linearGradient id="bullGoldenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#34d399" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="bullLaserGreen" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#34d399" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#a7f3d0" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="hornGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* 4. Fine Institutional Financial Grid Coordinates */}
      <div
        className={`absolute inset-0 pointer-events-none ${
          dark ? "opacity-[0.035]" : "opacity-[0.02]"
        }`}
        style={{
          backgroundImage: "linear-gradient(rgba(20, 184, 166, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(20, 184, 166, 0.4) 1px, transparent 1px)",
          backgroundSize: "28px 28px"
        }}
      />

      {/* 5. Protective Left Vignette: Guarantees 100% Crisp Headline Contrast */}
      {dark ? (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to right, rgba(6, 18, 30, 0.95) 0%, rgba(6, 18, 30, 0.75) 45%, rgba(6, 18, 30, 0.15) 75%, transparent 100%)"
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
      {dark && <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(3,10,18,0.6)] pointer-events-none" />}
    </div>
  );
});

export default CalmIpoBullBackdrop;
