import React, { useState, useEffect, useRef, memo } from "react";
import {
  Globe, Shield, TrendingUp, TrendingDown, Activity, Zap,
  BarChart2, ArrowRight, Calendar, BookOpen, Layers, CheckCircle2, Calculator
} from "lucide-react";
import CalmForexGlobeBackdrop from "../animations/CalmForexGlobeBackdrop";
import { fetchLiveForexRates } from "../../services/forexLiveRates.js";

// Real Live Trading Pairs (Updated dynamically from institutional exchange feeds)
const INITIAL_TRADING_PAIRS = [
  {
    pairKey: "EUR/USD",
    code: "EUR/USD",
    name: "Euro / US Dollar",
    flag: "🇪🇺🇺🇸",
    rate: "1.0960",
    change: "+0.18%",
    isUp: true,
    session: "London / NY Open",
    type: "Major FX Pair",
    description: "World's primary currency pair with institutional interbank spread."
  },
  {
    pairKey: "GBP/USD",
    code: "GBP/USD",
    name: "British Pound / USD",
    flag: "🇬🇧🇺🇸",
    rate: "1.3102",
    change: "+0.24%",
    isUp: true,
    session: "London Fix Active",
    type: "Major FX Pair",
    description: "Cable pair tracking UK GDP trajectory and Bank of England policy."
  },
  {
    pairKey: "USD/JPY",
    code: "USD/JPY",
    name: "USD / Japanese Yen",
    flag: "🇺🇸🇯🇵",
    rate: "159.24",
    change: "-0.15%",
    isUp: false,
    session: "Tokyo / Interbank",
    type: "Carry Trade Anchor",
    description: "Global risk-sentiment barometer and yen carry liquidity flow."
  },
  {
    pairKey: "XAU/USD",
    code: "XAU/USD",
    name: "Spot Gold Bullion",
    flag: "🥇",
    rate: "$3,560.50",
    change: "+0.85%",
    isUp: true,
    session: "Global Bullion Fix",
    type: "Safe Haven Bullion",
    description: "Physical reserve bullion and global macro inflation hedge."
  },
  {
    pairKey: "USD/INR",
    code: "USD/INR",
    name: "USD / Indian Rupee",
    flag: "🇺🇸🇮🇳",
    rate: "92.93",
    change: "+0.04%",
    isUp: true,
    session: "NSE / Interbank",
    type: "Emerging Market FX",
    description: "RBI reference rate for cross-border Indian capital flows."
  },
  {
    pairKey: "BTC/USD",
    code: "BTC/USD",
    name: "Bitcoin Spot",
    flag: "⚡",
    rate: "$60,670",
    change: "+2.40%",
    isUp: true,
    session: "24/7 Global Liquid",
    type: "Digital Macro Asset",
    description: "Global decentralized liquidity and institutional ETF flow tracker."
  }
];

/**
 * Desktop-Only 3D Kinetic Orbital Stage
 * Isolated in its own component so continuous rotation does NOT re-render the left editorial text or metrics.
 */
const DesktopKinetic3DOrbit = memo(function DesktopKinetic3DOrbit({ selectedCurrency, onSelectCurrency, currencies = INITIAL_TRADING_PAIRS }) {
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setRotationAngle((prev) => (prev + 0.5) % 360);
    }, 50);
    return () => clearInterval(interval);
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
      <div className="relative z-20 w-28 h-28 rounded-full bg-slate-900/90 text-white dark:bg-white/10 border border-teal-500/40 backdrop-blur-md flex flex-col items-center justify-center text-center p-2 shadow-xl shadow-teal-500/10">
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-teal-400">
          LIVE FEED
        </span>
        <span className="text-xs font-black font-mono text-white mt-0.5">
          {selectedCurrency.code}
        </span>
        <span className="text-[11px] font-mono font-bold text-teal-300">
          {selectedCurrency.rate}
        </span>
        <span className="text-[9px] font-mono text-emerald-400 mt-0.5">
          {selectedCurrency.change}
        </span>
      </div>

      {/* Orbiting 3D Currency Nodes */}
      {currencies.map((cur, idx) => {
        const angleRad = ((idx * 60 + rotationAngle) * Math.PI) / 180;
        const radius = 120;
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
            className={`absolute p-2 sm:p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-2 shadow-md will-change-transform ${isSelected
              ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 border-teal-400 shadow-xl scale-110 ring-2 ring-teal-500/40"
              : isFront
                ? "bg-white/95 dark:bg-[#0E1E36]/95 border-slate-200/90 dark:border-white/15 text-slate-800 dark:text-slate-200 hover:border-teal-400"
                : "bg-white/70 dark:bg-[#0E1E36]/70 border-slate-200/50 dark:border-white/10 text-slate-600 dark:text-slate-400 opacity-80 hover:opacity-100"
              }`}
          >
            <span className="text-base leading-none">{cur.flag}</span>
            <div>
              <span className="text-xs font-black font-mono block leading-none">
                {cur.code}
              </span>
              <span className="text-[10px] font-mono font-bold block mt-0.5 text-teal-600 dark:text-teal-400">
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
 */
function MobileCurrencyMatrix({ selectedCurrency, onSelectCurrency, currencies = INITIAL_TRADING_PAIRS }) {
  return (
    <div className="w-full space-y-3 pt-2">
      <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100 dark:border-white/5">
        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
          <Activity size={12} className="text-teal-500" />
          Live Currency &amp; Commodity Feeds
        </span>
        <span className="font-mono text-xs font-black text-teal-600 dark:text-teal-400">
          {selectedCurrency.code}: {selectedCurrency.rate}
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {currencies.map((cur) => {
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
              <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400 leading-none">
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
  const [currencies, setCurrencies] = useState(INITIAL_TRADING_PAIRS);
  const [selectedCurrency, setSelectedCurrency] = useState(INITIAL_TRADING_PAIRS[0]);
  const [isMobile, setIsMobile] = useState(false);

  // Poll live rates every 15 seconds
  useEffect(() => {
    let isMounted = true;

    const loadRates = () => {
      fetchLiveForexRates()
        .then((rates) => {
          if (!isMounted || !rates) return;
          setCurrencies((prev) =>
            prev.map((c) => {
              const liveVal = rates[c.pairKey];
              if (!liveVal) return c;

              let formattedRate = String(liveVal);
              if (c.pairKey === "XAU/USD") {
                formattedRate = `$${Number(liveVal).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              } else if (c.pairKey === "BTC/USD") {
                formattedRate = `$${Math.round(liveVal).toLocaleString("en-US")}`;
              } else if (c.pairKey.includes("JPY") || c.pairKey.includes("INR")) {
                formattedRate = Number(liveVal).toFixed(2);
              } else {
                formattedRate = Number(liveVal).toFixed(4);
              }

              return { ...c, rate: formattedRate };
            })
          );

          setSelectedCurrency((currentSelected) => {
            const liveVal = rates[currentSelected.pairKey];
            if (!liveVal) return currentSelected;

            let formattedRate = String(liveVal);
            if (currentSelected.pairKey === "XAU/USD") {
              formattedRate = `$${Number(liveVal).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            } else if (currentSelected.pairKey === "BTC/USD") {
              formattedRate = `$${Math.round(liveVal).toLocaleString("en-US")}`;
            } else if (currentSelected.pairKey.includes("JPY") || currentSelected.pairKey.includes("INR")) {
              formattedRate = Number(liveVal).toFixed(2);
            } else {
              formattedRate = Number(liveVal).toFixed(4);
            }

            return { ...currentSelected, rate: formattedRate };
          });
        })
        .catch(() => { });
    };

    loadRates();
    const interval = setInterval(loadRates, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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
    <div className="relative w-full rounded-3xl overflow-hidden bg-white dark:bg-[#071324] border border-slate-200/80 dark:border-white/10 shadow-xl p-5 sm:p-8 lg:p-10 select-none transition-all">

      {/* 1. REAL HD INTERBANK TRADING VIDEO BACKDROP (Bold & Clearly Visible) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
        <video
          autoPlay
          loop
          muted
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-700 ${dark ? "opacity-60" : "opacity-55"
            }`}
          src="/videos/forex-market.mp4"
        />
        {/* Soft Vignette Overlay: 100% crisp text on left, 85% open vibrant video on right */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: dark
              ? "linear-gradient(to right, rgba(7, 19, 36, 0.95) 0%, rgba(7, 19, 36, 0.80) 45%, rgba(7, 19, 36, 0.20) 100%)"
              : "linear-gradient(to right, rgba(255, 255, 255, 0.94) 0%, rgba(245, 250, 255, 0.70) 45%, rgba(255, 255, 255, 0.15) 100%)"
          }}
        />
      </div>

      {/* 2. Ambient Radial Accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500/[0.04] dark:bg-teal-500/[0.07] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#1c9bda]/[0.04] dark:bg-[#1c9bda]/[0.07] rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">

        {/* Left Editorial Narrative Column (Calm Capital Voice) */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-5">

          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 flex items-center gap-1.5 shadow-sm">
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
            <div className="p-3 sm:p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Macro Regime
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-emerald-600 dark:text-emerald-400 block mt-0.5 truncate">
                Calm · 14.8
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 truncate block">Low systemic panic</span>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Capital Floor
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-[#1c9bda] block mt-0.5 truncate">
                5% Daily Max
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 truncate block">Drawdown guarded</span>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 shadow-sm">
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
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 pt-1 sm:pt-2">
            <button
              onClick={() => onSelectTab("news")}
              className="px-2 sm:px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer border-0 active:scale-[0.99]"
            >
              <Calendar className="w-4 h-4 text-teal-400 dark:text-teal-600 shrink-0" />
              <span className="truncate sm:hidden">News</span>
              <span className="hidden sm:inline">Economic News</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 shrink-0 hidden sm:inline" />
            </button>

            <button
              onClick={() => onSelectTab("journal")}
              className="px-2 sm:px-5 py-3 rounded-2xl bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-900 dark:text-white font-bold text-xs border border-slate-200/80 dark:border-white/10 transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer active:scale-[0.99]"
            >
              <BookOpen className="w-4 h-4 text-[#1c9bda] shrink-0" />
              <span className="truncate sm:hidden">Journal</span>
              <span className="hidden sm:inline">Journal Suite</span>
            </button>

            <button
              onClick={() => onSelectTab("calculator")}
              className="px-2 sm:px-5 py-3 rounded-2xl bg-teal-500/10 hover:bg-teal-500/15 text-teal-700 dark:text-teal-400 font-bold text-xs border border-teal-500/30 transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer border-0 active:scale-[0.99]"
            >
              <Calculator className="w-4 h-4 text-teal-500 shrink-0" />
              <span className="truncate sm:hidden">Calculator</span>
              <span className="hidden sm:inline">Profit Calculator</span>
            </button>
          </div>

        </div>

        {/* Right Stage: Desktop 3D Kinetic vs Mobile Executive Matrix */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center w-full">

          {isMobile ? (
            <MobileCurrencyMatrix
              selectedCurrency={selectedCurrency}
              onSelectCurrency={setSelectedCurrency}
              currencies={currencies}
            />
          ) : (
            <DesktopKinetic3DOrbit
              selectedCurrency={selectedCurrency}
              onSelectCurrency={setSelectedCurrency}
              currencies={currencies}
            />
          )}

          {/* Selected Node Quantitative Detail Card */}
          <div className="mt-3 w-full max-w-[340px] p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 shadow-lg flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                  {selectedCurrency.name} • {selectedCurrency.session}
                </span>
                <span className="font-mono font-black text-slate-900 dark:text-white text-base">
                  {selectedCurrency.code}: {selectedCurrency.rate}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {selectedCurrency.change}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
                  LIVE INTERBANK
                </span>
              </div>
            </div>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/5 pt-1.5 mt-0.5 leading-relaxed">
              {selectedCurrency.description}
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
