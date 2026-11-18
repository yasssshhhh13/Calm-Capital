import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, TrendingUp, Sparkles, Building2,
  Calendar, ShieldCheck, ArrowUpRight, Zap, Eye
} from "lucide-react";

export default function IpoSpatial3DDeck({ ipos = [], dark, onSelectIpo }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const containerRef = useRef(null);
  const dragStartRef = useRef(null);

  // Pick top 6-8 relevant IPOs (Open, Upcoming, and high GMP)
  const featuredIpos = useMemo(() => {
    if (!ipos || ipos.length === 0) return [];
    // Prioritize Open, then Upcoming with GMP, then Listed
    const sorted = [...ipos].sort((a, b) => {
      const statusWeight = (s) => (s === "Open" ? 3 : s === "Upcoming" ? 2 : 1);
      const diff = statusWeight(b.status) - statusWeight(a.status);
      if (diff !== 0) return diff;
      const gmpA = parseFloat(a.gmp) || 0;
      const gmpB = parseFloat(b.gmp) || 0;
      return gmpB - gmpA;
    });
    return sorted.slice(0, 7);
  }, [ipos]);

  const count = featuredIpos.length;
  const angleStep = count > 0 ? 360 / count : 0;
  const radius = 340; // Depth of 3D cylinder

  // Smooth continuous ambient orbit when not hovered
  useEffect(() => {
    if (isHovered || count === 0) return;
    const interval = setInterval(() => {
      setRotationAngle((prev) => prev - angleStep);
      setActiveIndex((prev) => (prev + 1) % count);
    }, 4200);
    return () => clearInterval(interval);
  }, [isHovered, count, angleStep]);

  const handlePrev = () => {
    setRotationAngle((prev) => prev + angleStep);
    setActiveIndex((prev) => (prev - 1 + count) % count);
  };

  const handleNext = () => {
    setRotationAngle((prev) => prev - angleStep);
    setActiveIndex((prev) => (prev + 1) % count);
  };

  // Drag interaction
  const handlePointerDown = (e) => {
    dragStartRef.current = e.clientX || (e.touches && e.touches[0].clientX);
  };

  const handlePointerUp = (e) => {
    if (!dragStartRef.current) return;
    const clientX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
    const diff = clientX - dragStartRef.current;
    if (diff > 40) handlePrev();
    else if (diff < -40) handleNext();
    dragStartRef.current = null;
  };

  if (count === 0) return null;

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className="relative w-full rounded-3xl p-6 md:p-8 bg-gradient-to-b from-white/90 via-slate-50/70 to-white/90 dark:from-[#0B1528] dark:via-[#070D18] dark:to-[#040812] border border-slate-200/80 dark:border-white/10 shadow-xl overflow-hidden select-none"
    >
      {/* Background Ambient Glow & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:28px_28px] opacity-40 pointer-events-none" />

      {/* Header Info */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#1c9bda]/15 text-[#1c9bda] border border-[#1c9bda]/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Spatial 3D IPO Deck
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Zero-Lag 120 FPS Hardware Accelerated
            </span>
          </div>
          <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Featured Primary Market Offerings
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rotate through live offerings in 3D space. Click any card to inspect valuation, subscription, and allotment odds.
          </p>
        </div>

        {/* Carousel Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="w-9 h-9 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer shadow-sm"
            aria-label="Previous IPO"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="w-9 h-9 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer shadow-sm"
            aria-label="Next IPO"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3D Spatial Carousel Viewport */}
      <div className="relative w-full h-[320px] md:h-[350px] flex items-center justify-center [perspective:1200px] overflow-hidden">
        <div
          className="relative w-[280px] md:w-[320px] h-[260px] [transform-style:preserve-3d] transition-transform duration-700 ease-out cursor-grab active:cursor-grabbing"
          style={{
            transform: `rotateY(${rotationAngle}deg)`
          }}
        >
          {featuredIpos.map((ipo, idx) => {
            const cardAngle = idx * angleStep;
            const isCurrent = idx === ((Math.round(-rotationAngle / angleStep) % count) + count) % count;
            const gmpVal = parseFloat(ipo.gmp) || 0;
            const gmpPct = ipo.gmpPercent || (ipo.price ? ((gmpVal / ipo.price) * 100).toFixed(1) : null);
            const isPositiveGmp = gmpVal > 0;

            return (
              <div
                key={ipo.id || idx}
                onClick={() => onSelectIpo && onSelectIpo(ipo)}
                className={`absolute inset-0 rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between cursor-pointer select-none [backface-visibility:hidden] ${
                  isCurrent
                    ? "bg-white/95 dark:bg-[#121D2D]/95 border-[#1c9bda]/60 dark:border-[#38bdf8]/60 shadow-2xl shadow-[#1c9bda]/20 scale-102"
                    : "bg-white/80 dark:bg-[#0B1524]/85 border-slate-200/80 dark:border-white/10 shadow-lg opacity-70 hover:opacity-95"
                } backdrop-blur-xl`}
                style={{
                  transform: `rotateY(${cardAngle}deg) translateZ(${radius}px)`
                }}
              >
                {/* Card Top: Type & Status */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        ipo.type === "Mainboard"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          : "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20"
                      }`}
                    >
                      {ipo.type || "Mainboard"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        ipo.status === "Open"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse"
                          : ipo.status === "Upcoming"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : "bg-slate-400/15 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {ipo.status}
                    </span>
                  </div>

                  {/* Company Name */}
                  <h4 className="text-base font-black text-slate-900 dark:text-white leading-tight line-clamp-2 mt-1">
                    {ipo.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    {ipo.sector || "Primary Market"}
                  </p>
                </div>

                {/* Card Middle: GMP & Issue Size Highlight */}
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Current GMP</span>
                    <span
                      className={`font-black font-mono text-sm flex items-center gap-1 ${
                        isPositiveGmp ? "text-emerald-500" : "text-slate-400"
                      }`}
                    >
                      {isPositiveGmp ? `+₹${gmpVal}` : "₹0"}
                      {gmpPct && <span className="text-[10px]">({gmpPct}%)</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50 dark:border-white/5">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Issue Size</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200 text-xs">
                      {ipo.issueSize ? `₹${ipo.issueSize} Cr` : "TBD"}
                    </span>
                  </div>
                </div>

                {/* Card Bottom: CalmCapital Score & Click Trigger */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                    <span>Score: {ipo.score ? `${ipo.score}/10` : "Institutional"}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-black text-[#1c9bda] group-hover:translate-x-0.5 transition-transform">
                    <span>Inspect</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Carousel Pagination Dots */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 mt-4">
        {featuredIpos.map((_, i) => {
          const isCurrent = i === ((Math.round(-rotationAngle / angleStep) % count) + count) % count;
          return (
            <button
              key={i}
              onClick={() => {
                setRotationAngle(-i * angleStep);
                setActiveIndex(i);
              }}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                isCurrent ? "w-6 bg-[#1c9bda]" : "w-1.5 bg-slate-300 dark:bg-white/20"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
}
