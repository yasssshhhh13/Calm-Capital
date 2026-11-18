import React, { useState, useRef, useEffect } from "react";
import {
  TrendingUp, Globe, ShieldCheck, ArrowRight, Activity,
  Sparkles, DollarSign, BarChart3, Clock, Zap, BookOpen, Calendar, Shield
} from "lucide-react";
import CalmIpoBullBackdrop from "./animations/CalmIpoBullBackdrop";
import CalmForexGlobeBackdrop from "./animations/CalmForexGlobeBackdrop";

export default function CalmDualGateway3D({ onSelectSection, activeSection = "ipos", dark = true }) {
  const [leftTilt, setLeftTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 });
  const [rightTilt, setRightTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 });
  const [hoveredCard, setHoveredCard] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const leftRef = useRef(null);
  const rightRef = useRef(null);

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
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleMouseMove = (e, ref, setTilt) => {
    if (isMobile) return;
    if (e.pointerType === "touch") return;
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -10;
    const rotY = ((x - centerX) / centerX) * 10;
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTilt({ x: rotX, y: rotY, glareX, glareY });
  };

  const handleMouseLeave = (setTilt) => {
    setTilt({ x: 0, y: 0, glareX: 50, glareY: 50 });
    setHoveredCard(null);
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden p-5 sm:p-6 md:p-8 my-2 border border-slate-200/80 dark:border-white/10 shadow-2xl transition-all"
      style={{
        background: dark
          ? "radial-gradient(ellipse at 50% 0%, #0F233B 0%, #060D1A 100%)"
          : "radial-gradient(ellipse at 50% 0%, #E9F4FB 0%, #F5F7FA 100%)"
      }}
    >
      {/* Ambient background glows */}
      <div className="absolute -top-24 left-1/4 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -top-24 right-1/4 w-96 h-96 rounded-full bg-[#1c9bda]/15 blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="relative z-10 flex flex-col items-center text-center mb-6 md:mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-gradient-to-r from-teal-500/15 via-[#1c9bda]/15 to-emerald-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#1c9bda]" />
          <span>Calm Capital Institutional Gateway</span>
        </div>
        <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Designed by Discipline. Dual-Market Intelligence.
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
          Select your trading desk below: Analyze Indian IPOs with mathematical precision or trade Global Forex with institutional discipline.
        </p>
      </div>

      {/* 2-Sided Gateway Arena */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6" style={{ perspective: isMobile ? "none" : "1400px" }}>

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
          className={`relative group rounded-3xl p-5 sm:p-6 md:p-8 cursor-pointer transition-all duration-300 border ${
            activeSection === "ipos"
              ? "border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-2xl shadow-emerald-500/10"
              : "border-slate-200/80 dark:border-white/10 hover:border-emerald-500/40"
          }`}
          style={{
            background: dark
              ? "linear-gradient(135deg, rgba(11, 31, 51, 0.85) 0%, rgba(6, 17, 30, 0.95) 100%)"
              : "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 248, 255, 0.9) 100%)",
            transform: isMobile ? "none" : `rotateX(${leftTilt.x}deg) rotateY(${leftTilt.y}deg) translateZ(10px)`,
            transformStyle: isMobile ? "flat" : "preserve-3d",
            willChange: isMobile ? "auto" : "transform"
          }}
        >
          {/* Dynamic Dalal Street Charging Bull & Market Surge Animation */}
          <CalmIpoBullBackdrop intensity={dark ? "vibrant" : "normal"} />

          {/* Specular Glare overlay */}
          {!isMobile && (
            <div
              className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-25 transition-opacity duration-300 pointer-events-none"
              style={{
                background: `radial-gradient(circle at ${leftTilt.glareX}% ${leftTilt.glareY}%, rgba(16, 185, 129, 0.8), transparent 60%)`
              }}
            />
          )}

          <div className="relative z-10 space-y-5 sm:space-y-6">
            {/* Top pill & status */}
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>🇮🇳 Primary Markets Desk</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-400">
                14 Analysis Desks
              </span>
            </div>

            {/* Title & Description */}
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Indian IPO Intelligence</span>
                <ArrowRight className="w-5 h-5 text-emerald-500 transform group-hover:translate-x-1.5 transition-transform shrink-0" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Comprehensive data, live GMP premiums, institutional QIB subscriptions, financial health scoring, and allotment checking for Mainboard &amp; SME issues.
              </p>
            </div>

            {/* Visual Bar Graph Element */}
            <div className="relative h-24 sm:h-28 rounded-2xl bg-black/5 dark:bg-black/30 border border-emerald-500/20 p-3 overflow-hidden flex items-end justify-between gap-2">
              <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:12px_12px] opacity-15 pointer-events-none" />
              
              {/* Animated bar columns */}
              {[
                { h: "55%", gmp: "+32%", label: "Tech" },
                { h: "82%", gmp: "+68%", label: "Solar", hot: true },
                { h: "40%", gmp: "+18%", label: "Pharma" },
                { h: "95%", gmp: "+84%", label: "Defence", hot: true },
                { h: "65%", gmp: "+45%", label: "Infra" },
                { h: "75%", gmp: "+52%", label: "FMCG" }
              ].map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full relative z-10">
                  <span className={`text-[9px] font-mono font-bold mb-1 ${bar.hot ? "text-emerald-400" : "text-slate-400"}`}>
                    {bar.gmp}
                  </span>
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      bar.hot
                        ? "bg-gradient-to-t from-emerald-600 to-teal-400 shadow-md shadow-emerald-500/30"
                        : "bg-slate-300 dark:bg-slate-700 group-hover:bg-teal-600/60"
                    }`}
                    style={{ height: bar.h }}
                  />
                  <span className="text-[8px] text-slate-400 font-semibold mt-1">
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="truncate">CalmCapital Score™</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-500 shrink-0" />
                <span className="truncate">Live Grey Market (GMP)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#1c9bda] shrink-0" />
                <span className="truncate">50X QIB Radar</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">Batch Allotment Check</span>
              </div>
            </div>

            {/* Enter CTA */}
            <button
              type="button"
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer border-0 active:scale-[0.99]"
            >
              <span>Explore Indian IPOs (14 Desks)</span>
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
          className={`relative group rounded-3xl p-5 sm:p-6 md:p-8 cursor-pointer transition-all duration-300 border ${
            activeSection === "forex"
              ? "border-[#1c9bda]/70 ring-2 ring-[#1c9bda]/30 shadow-2xl shadow-[#1c9bda]/15"
              : "border-slate-200/80 dark:border-white/10 hover:border-[#1c9bda]/40"
          }`}
          style={{
            background: dark
              ? "linear-gradient(135deg, rgba(8, 26, 45, 0.85) 0%, rgba(4, 13, 24, 0.95) 100%)"
              : "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 249, 255, 0.9) 100%)",
            transform: isMobile ? "none" : `rotateX(${rightTilt.x}deg) rotateY(${rightTilt.y}deg) translateZ(10px)`,
            transformStyle: isMobile ? "flat" : "preserve-3d",
            willChange: isMobile ? "auto" : "transform"
          }}
        >
          {/* Dynamic 3D Cyber Globe & Global Telemetry Animation */}
          <CalmForexGlobeBackdrop intensity={dark ? "vibrant" : "normal"} />

          {/* Specular Glare overlay */}
          {!isMobile && (
            <div
              className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-25 transition-opacity duration-300 pointer-events-none"
              style={{
                background: `radial-gradient(circle at ${rightTilt.glareX}% ${rightTilt.glareY}%, rgba(28, 155, 218, 0.9), transparent 60%)`
              }}
            />
          )}

          <div className="relative z-10 space-y-5 sm:space-y-6">
            {/* Top pill & status */}
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#1c9bda]/15 text-[#1c9bda] dark:text-[#52b1e4] border border-[#1c9bda]/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1c9bda] animate-ping" />
                <span>🌐 Global Currency Desk</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-400">
                2 Focused Desks
              </span>
            </div>

            {/* Title & Description */}
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Global Forex Macro Hub</span>
                <ArrowRight className="w-5 h-5 text-[#1c9bda] transform group-hover:translate-x-1.5 transition-transform shrink-0" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Institutional economic calendar, central bank interest rate telemetry, and a precision trading journal designed for prop firm challenges from $5,000.
              </p>
            </div>

            {/* Ticker Row */}
            <div className="relative h-24 sm:h-28 rounded-2xl bg-black/5 dark:bg-black/30 border border-[#1c9bda]/20 p-3 overflow-hidden flex items-center justify-around">
              <div className="absolute inset-0 bg-[radial-gradient(#1c9bda_1px,transparent_1px)] [background-size:12px_12px] opacity-15 pointer-events-none" />

              {/* Ticking live currency tickers */}
              {[
                { pair: "EUR/USD", val: "1.0542", chg: "+0.18%", up: true },
                { pair: "XAU/USD", val: "$2,596", chg: "+0.85%", up: true },
                { pair: "USD/JPY", val: "154.62", chg: "+0.35%", up: true },
                { pair: "BTC/USD", val: "$91,450", chg: "+2.40%", up: true }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl bg-white/40 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 text-center shrink-0">
                  <span className="text-[10px] font-mono font-black text-slate-900 dark:text-white">
                    {item.pair}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200">
                    {item.val}
                  </span>
                  <span className={`text-[9px] font-mono font-bold ${item.up ? "text-emerald-500" : "text-rose-500"}`}>
                    {item.chg}
                  </span>
                </div>
              ))}
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="truncate">High-Impact News Calendar</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#1c9bda] shrink-0" />
                <span className="truncate">Discipline Journal</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-500 shrink-0" />
                <span className="truncate">Multi-Account from $5K</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">Risk &amp; Lot Size Engine</span>
              </div>
            </div>

            {/* Enter CTA */}
            <button
              type="button"
              className="w-full py-3.5 rounded-xl bg-[#1c9bda] hover:bg-[#1688c2] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#1c9bda]/25 transition-all flex items-center justify-center gap-2 cursor-pointer border-0 active:scale-[0.99]"
            >
              <span>Launch Forex Desk (News &amp; Journal)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
