import React, { useState, useEffect, useRef, memo } from "react";
import {
  Globe, Shield, TrendingUp, TrendingDown, Activity, Zap,
  BarChart2, ArrowRight, Calendar, BookOpen, Layers, CheckCircle2, Calculator
} from "lucide-react";
import CalmForexGlobeBackdrop from "../animations/CalmForexGlobeBackdrop";

// Institutional G10 Currency Node Data
const G10_CURRENCIES = [
  { code: "USD", name: "US Dollar", flag: "🇺🇸", rate: "4.75%", bias: "Bullish", vol: "Elevated" },
  { code: "EUR", name: "Euro", flag: "🇪🇺", rate: "3.25%", bias: "Neutral", vol: "Moderate" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧", rate: "4.75%", bias: "Neutral", vol: "Moderate" },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵", rate: "0.25%", bias: "Bearish", vol: "Elevated" },
  { code: "XAU", name: "Gold Bullion", flag: "🥇", rate: "$2,596", bias: "Bullish", vol: "High" },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺", rate: "4.35%", bias: "Bullish", vol: "Normal" }
];

/**
 * Desktop-Only 3D Kinetic Orbital Stage
 * Isolated in its own component so continuous rotation does NOT re-render the left editorial text or metrics.
 */
const DesktopKinetic3DOrbit = memo(function DesktopKinetic3DOrbit({ selectedCurrency, onSelectCurrency }) {
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full max-w-[340px] aspect-square flex items-center justify-center [perspective:1000px] select-none"
    >
      {/* Outer Orbit Ring */}
      <div
        className="absolute inset-0 rounded-full border border-dashed border-teal-500/25 dark:border-teal-400/25 pointer-events-none will-change-transform"
        style={{
          transform: `rotateX(62deg) rotateZ(${rotationAngle * 0.7}deg)`,
          backfaceVisibility: "hidden"
        }}
      />

      {/* Middle Counter-Rotating Ring */}
      <div
        className="absolute inset-6 rounded-full border border-slate-200 dark:border-white/10 pointer-events-none will-change-transform"
        style={{
          transform: `rotateX(62deg) rotateZ(${-rotationAngle * 0.9}deg)`,
          backfaceVisibility: "hidden"
        }}
      />

      {/* Center Core Node */}
      <div className="relative z-20 w-24 h-24 rounded-full bg-gradient-to-tr from-teal-500/10 via-[#1c9bda]/20 to-blue-500/10 dark:from-teal-400/20 dark:to-blue-400/20 border border-teal-500/30 backdrop-blur-xl flex flex-col items-center justify-center text-center p-2 shadow-xl shadow-teal-500/10">
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

      {/* Orbiting 3D Currency Nodes */}
      {G10_CURRENCIES.map((cur, idx) => {
        const angleRad = ((idx * 60 + rotationAngle) * Math.PI) / 180;
        const radius = 115;
        const xPos = Math.cos(angleRad) * radius;
        const yPos = Math.sin(angleRad) * (radius * 0.45);
        const isFront = Math.sin(angleRad) > 0;
        const scale = isFront ? 1.05 : 0.85;
        const isSelected = selectedCurrency.code === cur.code;

        return (
          <div
            key={cur.code}
            onClick={() => onSelectCurrency(cur)}
            style={{
              transform: `translate3d(${xPos.toFixed(1)}px, ${yPos.toFixed(1)}px, 0) scale(${scale})`,
              zIndex: isSelected ? 40 : isFront ? 30 : 10,
              backfaceVisibility: "hidden"
            }}
            className={`absolute p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-2 backdrop-blur-md shadow-md will-change-transform ${isSelected
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
  );
});

/**
 * Mobile-Optimized Executive Currency Matrix
 * 100% Glitch-free, butter-smooth touch interaction with 0% CPU frame drops.
 */
function MobileCurrencyMatrix({ selectedCurrency, onSelectCurrency }) {
  return (
    <div className="w-full space-y-3 pt-2">
      <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100 dark:border-white/5">
        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
          <Activity size={12} className="text-teal-500" />
          Tap to Inspect Central Bank Benchmark
        </span>
        <span className="font-mono text-xs font-black text-teal-600 dark:text-teal-400">
          {selectedCurrency.code} Active
        </span>
      </div>

      {/* 2x3 Grid of Currency Badges (Rock solid on all smartphones) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {G10_CURRENCIES.map((cur) => {
          const isSelected = selectedCurrency.code === cur.code;
          return (
            <button
              key={cur.code}
              type="button"
              onClick={() => onSelectCurrency(cur)}
              className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${isSelected
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-md scale-102 ring-2 ring-teal-500/30"
                  : "bg-slate-50 dark:bg-white/[0.04] border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 active:scale-95"
                }`}
            >
              <span className="text-lg leading-none">{cur.flag}</span>
              <span className="text-xs font-black font-mono leading-none mt-0.5">
                {cur.code}
              </span>
              <span className="text-[10px] font-mono font-bold opacity-80 leading-none">
                {cur.rate}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CalmMacro3DStage({ onSelectTab, dark }) {
  const [selectedCurrency, setSelectedCurrency] = useState(G10_CURRENCIES[0]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMob =
        (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
        (typeof window !== "undefined" && "ontouchstart" in window) ||
        (typeof window !== "undefined" && window.innerWidth < 1024);
      setIsMobile(Boolean(isMob));
    };
    checkMobile();
    window.addEventListener("resize", checkMobile, { passive: true });
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-white dark:bg-[#071324] border border-slate-200/80 dark:border-white/10 shadow-sm p-5 sm:p-8 lg:p-10 select-none transition-all">
      {/* High-Tech Forex Globe Video Loop & Live Interbank Hologram */}
      <CalmForexGlobeBackdrop dark={dark} intensity={dark ? "normal" : "subtle"} />

      {/* Subtle Background Radial Gradient */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500/[0.04] dark:bg-teal-500/[0.07] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#1c9bda]/[0.04] dark:bg-[#1c9bda]/[0.07] rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">

        {/* Left Editorial Narrative Column (Calm Capital Voice) */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-5">

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
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-1">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Macro Regime
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-emerald-600 dark:text-emerald-400 block mt-0.5 truncate">
                Calm · 14.8
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 truncate block">Low systemic panic</span>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Capital Floor
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-[#1c9bda] block mt-0.5 truncate">
                5% Daily Max
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 truncate block">Drawdown guarded</span>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Target R:R
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white block mt-0.5 truncate">
                Min 1 : 2.0
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 truncate block">Expectancy positive</span>
            </div>
          </div>

          {/* Quick Triple Action Navigation */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1 sm:pt-2">
            <button
              onClick={() => onSelectTab("news")}
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer border-0 active:scale-[0.99]"
            >
              <Calendar className="w-4 h-4 text-teal-400 dark:text-teal-600 shrink-0" />
              <span className="truncate">Economic News</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 shrink-0" />
            </button>

            <button
              onClick={() => onSelectTab("journal")}
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs border border-slate-200/80 dark:border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer border-0 active:scale-[0.99]"
            >
              <BookOpen className="w-4 h-4 text-[#1c9bda] shrink-0" />
              <span className="truncate">Trading Journal Suite</span>
            </button>

            <button
              onClick={() => onSelectTab("calculator")}
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-3 rounded-2xl bg-teal-500/10 hover:bg-teal-500/15 text-teal-700 dark:text-teal-400 font-bold text-xs border border-teal-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer border-0 active:scale-[0.99]"
            >
              <Calculator className="w-4 h-4 text-teal-500 shrink-0" />
              <span className="truncate">Profit Calculator</span>
            </button>
          </div>

        </div>

        {/* Right Stage: Desktop 3D Kinetic vs Mobile Executive Matrix */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center w-full">

          {isMobile ? (
            <MobileCurrencyMatrix
              selectedCurrency={selectedCurrency}
              onSelectCurrency={setSelectedCurrency}
            />
          ) : (
            <DesktopKinetic3DOrbit
              selectedCurrency={selectedCurrency}
              onSelectCurrency={setSelectedCurrency}
            />
          )}

          {/* Selected Node Quantitative Detail Card */}
          <div className="mt-3 w-full max-w-[340px] p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {selectedCurrency.name} Central Bank Rate
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                Policy Rate: {selectedCurrency.rate}
              </span>
            </div>
            <div className="text-right">
              <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md ${selectedCurrency.bias === "Bullish"
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
