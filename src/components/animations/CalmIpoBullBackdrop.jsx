import React, { memo } from "react";

/**
 * CalmIpoBullBackdrop
 * Ultra-Smooth Dalal Street & Wall Street Charging Bull Financial Animation.
 * Pure GPU-accelerated CSS and SVG vectors with zero video decode lag.
 * Engineered for 120 FPS butter-smooth scrolling and crisp typography.
 */
export const CalmIpoBullBackdrop = memo(function CalmIpoBullBackdrop({
  className = "",
  intensity = "normal", // "subtle" | "normal" | "vibrant"
  dark = true
}) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none select-none rounded-[inherit] ${className}`}>

      {/* Base Tone */}
      {dark ? (
        <div className="absolute inset-0 bg-gradient-to-r from-[#06121E] via-[#091D30] to-[#0D2942] opacity-90" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] via-transparent to-teal-500/[0.04]" />
      )}

      {/* Hardware-Accelerated Ambient Glowing Mesh */}
      {dark && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
          <div
            className="absolute -right-20 -top-20 w-[400px] h-[400px] rounded-full blur-[70px]"
            style={{
              background: "radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, rgba(20, 184, 166, 0.15) 40%, transparent 70%)"
            }}
          />
        </div>
      )}

      {/* Majestic Dalal Street Charging Bull Hologram */}
      <div className="absolute right-0 top-0 bottom-0 w-full md:w-3/5 flex items-center justify-end pr-4 sm:pr-8 lg:pr-14 pointer-events-none">

        {/* Radial Aura */}
        <div
          className={`absolute w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] rounded-full blur-2xl ${dark ? "opacity-60" : "opacity-25"
            }`}
          style={{
            background: dark
              ? "radial-gradient(circle at center, rgba(16, 185, 129, 0.25) 0%, rgba(245, 158, 11, 0.1) 40%, transparent 70%)"
              : "radial-gradient(circle at center, rgba(16, 185, 129, 0.12) 0%, rgba(245, 158, 11, 0.06) 40%, transparent 70%)"
          }}
        />

        {/* Artistic Charging Bull & Ascending Momentum Vector */}
        <svg
          className={`w-full max-w-[380px] h-auto max-h-[300px] transition-transform duration-700 ${dark ? "opacity-65" : "opacity-25"
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

          {/* Muscular Front Leg Surge */}
          <path
            d="M 330 280 L 370 340 M 360 270 L 400 325"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />

          {/* Gradients */}
          <defs>
            <linearGradient id="bullLaserGreen" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.2" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="1" />
            </linearGradient>

            <linearGradient id="bullGoldenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="45%" stopColor="#10b981" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#065f46" stopOpacity="0.3" />
            </linearGradient>

            <linearGradient id="hornGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#fef08a" />
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
    </div>
  );
});

export default CalmIpoBullBackdrop;
