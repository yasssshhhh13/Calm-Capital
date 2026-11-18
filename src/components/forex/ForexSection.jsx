import React, { useState } from "react";
import {
  Globe, Calendar, BookOpen, TrendingUp, TrendingDown,
  ArrowRight, ShieldCheck, Activity, DollarSign, Calculator
} from "lucide-react";
import CalmForex3DStage from "./CalmForex3DStage";
import ForexNewsTab from "./ForexNewsTab";
import ForexJournalTab from "./ForexJournalTab";
import ForexCalculatorTab from "./ForexCalculatorTab";

// Curated live FX benchmark rates ticker with all USD pairs
const BENCHMARK_RATES = [
  { pair: "EUR/USD", rate: "1.0542", change: "+0.18%", up: true },
  { pair: "GBP/USD", rate: "1.2685", change: "-0.12%", up: false },
  { pair: "USD/JPY", rate: "154.62", change: "+0.35%", up: true },
  { pair: "USD/CHF", rate: "0.8845", change: "-0.08%", up: false },
  { pair: "USD/CAD", rate: "1.3980", change: "-0.05%", up: false },
  { pair: "AUD/USD", rate: "0.6515", change: "+0.22%", up: true },
  { pair: "NZD/USD", rate: "0.5872", change: "+0.15%", up: true },
  { pair: "XAU/USD", rate: "2,596.40", change: "+0.85%", up: true },
  { pair: "XAG/USD", rate: "30.45", change: "+1.12%", up: true },
  { pair: "WTI/USD", rate: "68.90", change: "+0.45%", up: true },
  { pair: "USD/INR", rate: "84.42", change: "+0.04%", up: true },
  { pair: "USD/AED", rate: "3.6725", change: "+0.00%", up: true },
  { pair: "BTC/USD", rate: "91,420", change: "+2.35%", up: true },
  { pair: "ETH/USD", rate: "3,120", change: "+1.90%", up: true }
];

export default function ForexSection({ dark, initialSubTab = "news", onSubTabChange }) {
  const [internalSubTab, setInternalSubTab] = useState(initialSubTab);

  const activeSubTab = onSubTabChange ? initialSubTab : internalSubTab;
  const setActiveSubTab = (t) => {
    if (onSubTabChange) onSubTabChange(t);
    else setInternalSubTab(t);
  };

  return (
    <div className="space-y-6">
      
      {/* Calm Capital 3D Kinetic Macro & Currency Orbital Stage */}
      <CalmForex3DStage
        dark={dark}
        onSelectTab={(tab) => {
          setActiveSubTab(tab);
          const el = document.getElementById("forex-subnav");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
      />

      {/* Forex Sub-navigation & Live Ticker */}
      <div id="forex-subnav" className="p-4 rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
        {/* Spot FX Ticker Ribbon */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-100 dark:border-white/5 pt-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 px-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Spot FX:
          </span>
          {BENCHMARK_RATES.map((item) => (
            <div
              key={item.pair}
              className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 shrink-0"
            >
              <span className="text-xs font-mono font-black text-slate-800 dark:text-white">
                {item.pair}
              </span>
              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                {item.rate}
              </span>
              <span
                className={`text-[10px] font-mono font-bold ${
                  item.up ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {item.change}
              </span>
            </div>
          ))}
        </div>

        {/* Section Tabs Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-white/5 w-fit border border-slate-200/60 dark:border-white/5">
            <button
              onClick={() => setActiveSubTab("news")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === "news"
                  ? "bg-white dark:bg-[#121D2D] text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Economic News &amp; Calendar</span>
            </button>

            <button
              onClick={() => setActiveSubTab("journal")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === "journal"
                  ? "bg-white dark:bg-[#121D2D] text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#1c9bda]" />
              <span>Discipline Trading Journal</span>
            </button>

            <button
              onClick={() => setActiveSubTab("calculator")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === "calculator"
                  ? "bg-white dark:bg-[#121D2D] text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Profit &amp; Risk Calculator</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Calm Capital Institutional Execution Desk</span>
          </div>
        </div>
      </div>

      {/* Active Tab View */}
      {activeSubTab === "news" ? (
        <ForexNewsTab dark={dark} />
      ) : activeSubTab === "calculator" ? (
        <ForexCalculatorTab
          dark={dark}
          onNavigateJournal={() => setActiveSubTab("journal")}
        />
      ) : (
        <ForexJournalTab dark={dark} />
      )}
    </div>
  );
}
