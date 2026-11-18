import React, { useState, useEffect, useRef } from "react";
import {
  Globe, Shield, TrendingUp, TrendingDown, Activity, Zap,
  BarChart2, ArrowRight, Calendar, BookOpen, Layers, CheckCircle2
} from "lucide-react";

// Institutional G10 Currency Node Data
const G10_CURRENCIES = [
  { code: "USD", name: "US Dollar", flag: "🇺🇸", rate: "4.75%", bias: "Bullish", vol: "Elevated", x: 0, y: -75, z: 20 },
  { code: "EUR", name: "Euro", flag: "🇪🇺", rate: "3.25%", bias: "Neutral", vol: "Moderate", x: 75, y: -30, z: -30 },
  { code: "GBP", name: "British Pound", flag: "🇬🇧", rate: "4.75%", bias: "Neutral", vol: "Moderate", x: 65, y: 55, z: 15 },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵", rate: "0.25%", bias: "Bearish", vol: "Elevated", x: -65, y: 55, z: -20 },
  { code: "XAU", name: "Gold Bullion", flag: "🥇", rate: "$2,596", bias: "Bullish", vol: "High", x: -75, y: -30, z: 35 },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺", rate: "4.35%", bias: "Bullish", vol: "Normal", x: 0, y: 80, z: -10 }
];

export default function CalmMacro3DStage({ onSelectTab, dark }) {
  const [selectedCurrency, setSelectedCurrency] = useState(G10_CURRENCIES[0]);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef(null);

  // Smooth continuous orbital rotation
  useEffect(() => {
    let animId;
    let lastTime = performance.now();

    const loop = (currentTime) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      if (!isHovered) {
        setRotationAngle((prev) => (prev + delta * 12) % 360);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isHovered]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full rounded-3xl overflow-hidden bg-white dark:bg-[#071324] border border-slate-200/80 dark:border-white/10 shadow-sm p-6 sm:p-10 select-none transition-all"
    >
      {/* Subtle Background Radial Gradient */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500/[0.04] dark:bg-teal-500/[0.07] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#1c9bda]/[0.04] dark:bg-[#1c9bda]/[0.07] rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Editorial Narrative Column (Calm Capital Voice) */}
        <div className="lg:col-span-7 space-y-5">
          
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              Institutional Macro Desk
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Discipline-Engineered Execution
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.12]">
              Macro Intelligence &amp; <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-[#1c9bda] to-blue-600 dark:from-teal-400 dark:via-cyan-300 dark:to-blue-400">
                Discipline-First Trading.
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              Calm Capital unifies institutional economic calendar radar with a full-suite digital journal.
              Designed for quantitative execution, capital preservation, and zero revenge trading.
            </p>
          </div>

          {/* Calm Institutional Metric Ribbons */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Macro Regime
              </span>
              <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 block mt-0.5">
                Calm · 14.8
              </span>
              <span className="text-[10px] text-slate-500">Low systemic panic</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Capital Floor
              </span>
              <span className="text-base font-black font-mono text-[#1c9bda] block mt-0.5">
                5% Daily Max
              </span>
              <span className="text-[10px] text-slate-500">Drawdown guarded</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Target R:R
              </span>
              <span className="text-base font-black font-mono text-slate-900 dark:text-white block mt-0.5">
                Min 1 : 2.0
              </span>
              <span className="text-[10px] text-slate-500">Expectancy positive</span>
            </div>
          </div>

          {/* Quick Dual Action Navigation */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onSelectTab("news")}
              className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-teal-400 dark:text-teal-600" />
              <span>Economic News &amp; Calendar</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>

            <button
              onClick={() => onSelectTab("journal")}
              className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs border border-slate-200/80 dark:border-white/10 transition-all flex items-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#1c9bda]" />
              <span>Trading Journal Suite</span>
            </button>
          </div>

        </div>

        {/* Right 3D Spatial Currency Matrix (Mathematical, Institutional Kinetic 3D) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          
          <div className="relative w-full max-w-[340px] aspect-square flex items-center justify-center [perspective:1000px]">
            
            {/* Outer Subtle Orbit Ring */}
            <div
              className="absolute inset-0 rounded-full border border-dashed border-teal-500/20 dark:border-teal-400/20 pointer-events-none transition-transform"
              style={{
                transform: `rotateX(62deg) rotateZ(${rotationAngle * 0.7}deg)`
              }}
            />

            {/* Middle Counter-Rotating Precision Ring */}
            <div
              className="absolute inset-6 rounded-full border border-slate-200 dark:border-white/10 pointer-events-none transition-transform"
              style={{
                transform: `rotateX(62deg) rotateZ(${-rotationAngle * 0.9}deg)`
              }}
            />

            {/* Inner Core Kinetic Glow Node */}
            <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-tr from-teal-500/10 via-[#1c9bda]/20 to-blue-500/10 dark:from-teal-400/20 dark:to-blue-400/20 border border-teal-500/30 backdrop-blur-xl flex flex-col items-center justify-center text-center p-2 shadow-xl shadow-teal-500/10">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
                ACTIVE
              </span>
              <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                {selectedCurrency.code} {selectedCurrency.flag}
              </span>
              <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400 font-bold">
                {selectedCurrency.rate}
              </span>
            </div>

            {/* Orbiting 3D Spatial Currency Nodes */}
            {G10_CURRENCIES.map((cur, idx) => {
              // Calculate spatial orbit coordinates using trigonometric polar angles
              const angleRad = ((idx * 60 + rotationAngle) * Math.PI) / 180;
              const radius = 115;
              const xPos = Math.cos(angleRad) * radius;
              const yPos = Math.sin(angleRad) * (radius * 0.45); // Foreshortened elliptical orbit
              const isFront = Math.sin(angleRad) > 0;
              const scale = isFront ? 1.05 : 0.85;
              const isSelected = selectedCurrency.code === cur.code;

              return (
                <div
                  key={cur.code}
                  onClick={() => setSelectedCurrency(cur)}
                  style={{
                    transform: `translate3d(${xPos}px, ${yPos}px, 0) scale(${scale})`,
                    zIndex: isFront ? 30 : 5
                  }}
                  className={`absolute p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-2 backdrop-blur-md shadow-md ${
                    isSelected
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-lg scale-110"
                      : isFront
                      ? "bg-white/90 dark:bg-[#0E1E36]/90 border-slate-200/80 dark:border-white/15 text-slate-800 dark:text-slate-200 hover:border-teal-400"
                      : "bg-white/60 dark:bg-[#0E1E36]/60 border-slate-200/40 dark:border-white/5 text-slate-500 opacity-75 hover:opacity-100"
                  }`}
                >
                  <span className="text-sm leading-none">{cur.flag}</span>
                  <div>
                    <span className="text-xs font-black font-mono block leading-none">
                      {cur.code}
                    </span>
                    <span className="text-[9px] font-mono opacity-80 block mt-0.5">
                      {cur.rate}
                    </span>
                  </div>
                </div>
              );
            })}

          </div>

          {/* Selected Node Quantitative Detail Card */}
          <div className="mt-2 w-full max-w-[320px] p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {selectedCurrency.name} Central Bank Rate
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                Policy Rate: {selectedCurrency.rate}
              </span>
            </div>
            <div className="text-right">
              <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md ${
                selectedCurrency.bias === "Bullish"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : selectedCurrency.bias === "Bearish"
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300"
              }`}>
                {selectedCurrency.bias}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                Vol: {selectedCurrency.vol}
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
