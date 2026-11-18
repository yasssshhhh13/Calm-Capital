import React, { useState } from "react";
import {
  Globe, Calendar, BookOpen, TrendingUp, TrendingDown,
  ArrowRight, ShieldCheck, Activity, DollarSign, Calculator
} from "lucide-react";
import CalmForex3DStage from "./CalmForex3DStage";
import ForexNewsTab from "./ForexNewsTab";
import ForexJournalTab from "./ForexJournalTab";
import ForexCalculatorTab from "./ForexCalculatorTab";
import TradingViewTickerTape from "./TradingViewTickerTape";

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

      {/* Official TradingView Real-Time Market Ticker */}
      <TradingViewTickerTape dark={dark} />

      {/* Forex Sub-navigation */}
      <div id="forex-subnav" className="p-4 rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm">
        {/* Section Tabs Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-white/5 w-fit border border-slate-200/60 dark:border-white/5">
            <button
              onClick={() => setActiveSubTab("news")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${activeSubTab === "news"
                ? "bg-white dark:bg-[#121D2D] text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
            >
              <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Economic News &amp; Calendar</span>
            </button>

            <button
              onClick={() => setActiveSubTab("journal")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${activeSubTab === "journal"
                ? "bg-white dark:bg-[#121D2D] text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#1c9bda]" />
              <span>Discipline Trading Journal</span>
            </button>

            <button
              onClick={() => setActiveSubTab("calculator")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${activeSubTab === "calculator"
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
