import React, { useState, useRef, useEffect } from "react";
import {
  TrendingUp, Globe, ShieldCheck, ArrowRight, Activity,
  Sparkles, DollarSign, BarChart3, Clock, Zap, BookOpen, Calendar, Shield, Play
} from "lucide-react";
import CalmIpoBullBackdrop from "./animations/CalmIpoBullBackdrop";
import CalmForexGlobeBackdrop from "./animations/CalmForexGlobeBackdrop";
import { fetchLiveForexRates } from "../services/forexLiveRates.js";

export default function CalmDualGateway3D({ onSelectSection, activeSection = "ipos", dark = true }) {
  const [leftTilt, setLeftTilt] = useState({ x: 0, y: 0 });
  const [rightTilt, setRightTilt] = useState({ x: 0, y: 0 });
  const [hoveredCard, setHoveredCard] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [forexSubtitle, setForexSubtitle] = useState("🌊 EUR/USD 1.0960 · Gold $3,560.50 · USD/JPY 159.24");

  useEffect(() => {
    fetchLiveForexRates()
      .then((rates) => {
        if (!rates) return;
        const eur = rates["EUR/USD"] ? rates["EUR/USD"].toFixed(4) : "1.0960";
        const gold = rates["XAU/USD"]
          ? `$${Number(rates["XAU/USD"]).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "$3,560.50";
        const jpy = rates["USD/JPY"] ? rates["USD/JPY"].toFixed(2) : "159.24";
        setForexSubtitle(`🌊 EUR/USD ${eur} · Gold ${gold} · USD/JPY ${jpy}`);
      })
      .catch(() => {});
  }, []);

  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => {
      const isTouch =
        (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
        (typeof window !== "undefined" && "ontouchstart" in window) ||
        (typeof window !== "undefined" && window.innerWidth < 768);
      setIsMobile(Boolean(isTouch));
    };
    checkMobile();
    window.addEventListener("resize", checkMobile, { passive: true });
    return () => {
      window.removeEventListener("resize", checkMobile);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleMouseMove = (e, ref, setTilt) => {
    if (isMobile || !ref.current || rafRef.current) return;
    const clientX = e.clientX;
    const clientY = e.clientY;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Subtle, buttery 3D tilt without layout recalculation
      const rotX = ((y - centerY) / centerY) * -5;
      const rotY = ((x - centerX) / centerX) * 5;
      setTilt({ x: rotX, y: rotY });
    });
  };

  const handleMouseLeave = (setTilt) => {
    setTilt({ x: 0, y: 0 });
    setHoveredCard(null);
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden p-4 sm:p-6 md:p-8 my-2 border border-slate-200/80 dark:border-white/10 shadow-2xl transition-all"
      style={{
        background: dark
          ? "radial-gradient(ellipse at 50% 0%, #0d1e34 0%, #040914 100%)"
          : "radial-gradient(ellipse at 50% 0%, #E9F4FB 0%, #F5F7FA 100%)"
      }}
    >
      {/* Ambient background glows */}
      <div className="absolute -top-24 left-1/4 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -top-24 right-1/4 w-96 h-96 rounded-full bg-[#1c9bda]/15 blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="relative z-10 flex flex-col items-center text-center mb-6 md:mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest bg-gradient-to-r from-teal-500/20 via-[#1c9bda]/20 to-emerald-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/30 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#1c9bda]" />
          <span>Calm Capital Dual-Market Intelligence Gateway</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Designed by Discipline. Dual-Market Intelligence.
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
          Select your trading desk below: Analyze Indian IPOs with mathematical precision or trade Global Forex with institutional discipline.
        </p>
      </div>

      {/* 2-Sided Gateway Arena */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6" style={{ perspective: isMobile ? "none" : "1200px" }}>

        {/* LEFT GATE: INDIAN IPO INTELLIGENCE */}
        <div
          ref={leftRef}
          onMouseMove={(e) => {
            if (!isMobile) {
              setHoveredCard("ipos");
              handleMouseMove(e, leftRef, setLeftTilt);
            }
          }}
          onMouseLeave={() => !isMobile && handleMouseLeave(setLeftTilt)}
          onClick={() => onSelectSection("ipos")}
          className={`relative group rounded-3xl p-5 sm:p-6 md:p-7 cursor-pointer transition-transform duration-200 border overflow-hidden ${activeSection === "ipos"
              ? "border-emerald-500/80 ring-2 ring-emerald-500/30 shadow-[0_0_35px_rgba(16,185,129,0.25)]"
              : "border-slate-200/80 dark:border-white/10 hover:border-emerald-500/60 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]"
            }`}
          style={{
            background: dark ? "#071322" : "#ffffff",
            transform: isMobile ? "none" : `rotateX(${leftTilt.x}deg) rotateY(${leftTilt.y}deg) translateZ(0)`,
            willChange: isMobile ? "auto" : "transform"
          }}
        >
          {/* Subtle Vector Background */}
          <CalmIpoBullBackdrop dark={dark} intensity="subtle" />

          <div className="relative z-10 space-y-4">
            {/* Top pill & status */}
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>🇮🇳 Primary Markets Desk</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-emerald-400 border border-emerald-500/20">
                14 Analysis Desks
              </span>
            </div>

            {/* Title & Description */}
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Indian IPO Intelligence</span>
                <ArrowRight className="w-5 h-5 text-emerald-400 transform group-hover:translate-x-1.5 transition-transform shrink-0" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 leading-relaxed">
                Live GMP premiums, institutional QIB subscriptions, financial health scoring, and multi-PAN allotment chances.
              </p>
            </div>

            {/* PROMINENT HD LIVE STOCK MARKET & EQUITY TERMINAL SCREEN (Zero Lag, Instant Poster) */}
            <div className="relative w-full h-44 sm:h-48 md:h-52 rounded-2xl overflow-hidden border border-emerald-500/40 shadow-lg bg-[#06121f] group-hover:border-emerald-400 transition-colors">
              {/* Terminal Screen Header Bar */}
              <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-3 py-1.5 bg-slate-950/80 border-b border-emerald-500/30">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-black text-emerald-400 tracking-wider">
                    LIVE PRIMARY MARKET &amp; EQUITY EXCHANGES
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    PRIMARY DESK
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    BSE • NSE
                  </span>
                </div>
              </div>

              {/* CRYSTAL-CLEAR HD EQUITY IPO VIDEO (Instant Poster, No Black Screen) */}
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                poster="/videos/ipo-market-poster.jpg"
                className="w-full h-full object-cover pt-6"
                src="/videos/ipo-market.mp4"
              />
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">Live GMP &amp; Valuations</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="truncate">Multi-PAN Allotment (14 Desks)</span>
              </div>
            </div>

            {/* Enter CTA */}
            <button
              type="button"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer border-0 active:scale-[0.99]"
            >
              <span>Explore Indian IPO Desk</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RIGHT GATE: GLOBAL FOREX MACRO HUB */}
        <div
          ref={rightRef}
          onMouseMove={(e) => {
            if (!isMobile) {
              setHoveredCard("forex");
              handleMouseMove(e, rightRef, setRightTilt);
            }
          }}
          onMouseLeave={() => !isMobile && handleMouseLeave(setRightTilt)}
          onClick={() => onSelectSection("forex")}
          className={`relative group rounded-3xl p-5 sm:p-6 md:p-7 cursor-pointer transition-transform duration-200 border overflow-hidden ${activeSection === "forex"
              ? "border-[#1c9bda]/80 ring-2 ring-[#1c9bda]/30 shadow-[0_0_35px_rgba(28,155,218,0.25)]"
              : "border-slate-200/80 dark:border-white/10 hover:border-[#1c9bda]/60 hover:shadow-[0_0_25px_rgba(28,155,218,0.15)]"
            }`}
          style={{
            background: dark ? "#071322" : "#ffffff",
            transform: isMobile ? "none" : `rotateX(${rightTilt.x}deg) rotateY(${rightTilt.y}deg) translateZ(0)`,
            willChange: isMobile ? "auto" : "transform"
          }}
        >
          {/* Subtle Vector Background */}
          <CalmForexGlobeBackdrop dark={dark} intensity="subtle" />

          <div className="relative z-10 space-y-4">
            {/* Top pill & status */}
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#1c9bda]/20 text-[#1c9bda] dark:text-[#52b1e4] border border-[#1c9bda]/40 flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#1c9bda] animate-ping" />
                <span>🌐 Global Currency Desk</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-[#52b1e4] border border-[#1c9bda]/20">
                3 Focused Desks
              </span>
            </div>

            {/* Title & Description */}
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Global Forex Macro Hub</span>
                <ArrowRight className="w-5 h-5 text-[#1c9bda] transform group-hover:translate-x-1.5 transition-transform shrink-0" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 leading-relaxed">
                Institutional economic calendar, profit &amp; lot size calculator, and precision trading journal designed for prop firm accounts.
              </p>
            </div>

            {/* PROMINENT HD LIVE INTERBANK TRADING MONITORS (Instant Poster, Zero Black Flash) */}
            <div className="relative w-full h-44 sm:h-48 md:h-52 rounded-2xl overflow-hidden border border-[#1c9bda]/40 shadow-lg bg-[#06121f] group-hover:border-[#1c9bda] transition-colors">
              {/* Terminal Screen Header Bar */}
              <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-3 py-1.5 bg-slate-950/80 border-b border-[#1c9bda]/30">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#1c9bda] animate-pulse" />
                  <span className="text-[10px] font-mono font-black text-[#52b1e4] tracking-wider">
                    INTERBANK ORDER FLOW &amp; TERMINALS
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#1c9bda]/20 text-[#52b1e4] border border-[#1c9bda]/40">
                    GLOBAL MACRO
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    NY • LDN • TKO
                  </span>
                </div>
              </div>

              {/* CRYSTAL-CLEAR HD FOREX TERMINALS VIDEO (Instant Poster, No Black Screen) */}
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                poster="/videos/forex-market-poster.jpg"
                className="w-full h-full object-cover pt-6"
                src="/videos/forex-market.mp4"
              />
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="truncate">High-Impact News Calendar</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#1c9bda] shrink-0" />
                <span className="truncate">Discipline Journal ($5K-$200K)</span>
              </div>
            </div>

            {/* Enter CTA */}
            <button
              type="button"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1c9bda] via-blue-600 to-[#1c9bda] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#1c9bda]/25 transition-all flex items-center justify-center gap-2 cursor-pointer border-0 active:scale-[0.99]"
            >
              <span>Launch Forex Desk (3 Desks)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
