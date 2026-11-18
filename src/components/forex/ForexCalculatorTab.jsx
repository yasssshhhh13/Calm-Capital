import React, { useState, useMemo } from "react";
import {
  Calculator, DollarSign, TrendingUp, TrendingDown, ShieldCheck,
  AlertTriangle, Target, Percent, ArrowRight, RefreshCw, BarChart2,
  CheckCircle2, Sparkles, Sliders, ArrowUpRight, ArrowDownRight,
  BookOpen, HelpCircle, Info, Shield, Layers
} from "lucide-react";

/**
 * Institutional Instrument Specifications (Matching OctaFX & MetaTrader contract standards)
 */
const INSTRUMENTS = [
  // G10 USD Majors
  { id: "EURUSD", pair: "EUR/USD", category: "Majors", contractSize: 100000, pipDigits: 4, pipStep: 0.0001, currentPrice: 1.0542, quoteCurrency: "USD" },
  { id: "GBPUSD", pair: "GBP/USD", category: "Majors", contractSize: 100000, pipDigits: 4, pipStep: 0.0001, currentPrice: 1.2685, quoteCurrency: "USD" },
  { id: "USDJPY", pair: "USD/JPY", category: "Majors", contractSize: 100000, pipDigits: 2, pipStep: 0.01, currentPrice: 154.62, quoteCurrency: "JPY" },
  { id: "USDCHF", pair: "USD/CHF", category: "Majors", contractSize: 100000, pipDigits: 4, pipStep: 0.0001, currentPrice: 0.8845, quoteCurrency: "CHF" },
  { id: "USDCAD", pair: "USD/CAD", category: "Majors", contractSize: 100000, pipDigits: 4, pipStep: 0.0001, currentPrice: 1.3980, quoteCurrency: "CAD" },
  { id: "AUDUSD", pair: "AUD/USD", category: "Majors", contractSize: 100000, pipDigits: 4, pipStep: 0.0001, currentPrice: 0.6515, quoteCurrency: "USD" },
  { id: "NZDUSD", pair: "NZD/USD", category: "Majors", contractSize: 100000, pipDigits: 4, pipStep: 0.0001, currentPrice: 0.5872, quoteCurrency: "USD" },

  // Metals & Commodities
  { id: "XAUUSD", pair: "XAU/USD (Gold)", category: "Metals", contractSize: 100, pipDigits: 2, pipStep: 0.1, currentPrice: 2596.40, quoteCurrency: "USD" },
  { id: "XAGUSD", pair: "XAG/USD (Silver)", category: "Metals", contractSize: 5000, pipDigits: 3, pipStep: 0.01, currentPrice: 30.45, quoteCurrency: "USD" },
  { id: "WTIUSD", pair: "WTI/USD (Crude Oil)", category: "Energy", contractSize: 1000, pipDigits: 2, pipStep: 0.01, currentPrice: 68.90, quoteCurrency: "USD" },

  // Crosses
  { id: "EURGBP", pair: "EUR/GBP", category: "Crosses", contractSize: 100000, pipDigits: 4, pipStep: 0.0001, currentPrice: 0.8310, quoteCurrency: "GBP" },
  { id: "EURJPY", pair: "EUR/JPY", category: "Crosses", contractSize: 100000, pipDigits: 2, pipStep: 0.01, currentPrice: 163.05, quoteCurrency: "JPY" },
  { id: "GBPJPY", pair: "GBP/JPY", category: "Crosses", contractSize: 100000, pipDigits: 2, pipStep: 0.01, currentPrice: 196.15, quoteCurrency: "JPY" },

  // Emerging & Crypto
  { id: "USDINR", pair: "USD/INR", category: "Emerging", contractSize: 100000, pipDigits: 2, pipStep: 0.01, currentPrice: 84.42, quoteCurrency: "INR" },
  { id: "USDAED", pair: "USD/AED", category: "Emerging", contractSize: 100000, pipDigits: 4, pipStep: 0.0001, currentPrice: 3.6725, quoteCurrency: "AED" },
  { id: "BTCUSD", pair: "BTC/USD (Bitcoin)", category: "Crypto", contractSize: 1, pipDigits: 2, pipStep: 1.0, currentPrice: 91420.00, quoteCurrency: "USD" },
  { id: "ETHUSD", pair: "ETH/USD (Ethereum)", category: "Crypto", contractSize: 1, pipDigits: 2, pipStep: 0.1, currentPrice: 3120.00, quoteCurrency: "USD" }
];

const BALANCE_PRESETS = [
  { label: "$5,000", val: 5000 },
  { label: "$10,000", val: 10000 },
  { label: "$25,000", val: 25000 },
  { label: "$50,000", val: 50000 },
  { label: "$100,000", val: 100000 },
  { label: "$200,000", val: 200000 }
];

const LOT_QUICK_PRESETS = [0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0];

export default function ForexCalculatorTab({ dark, onNavigateJournal }) {
  // Active Tab: "profit" (OctaFX style) | "position_size" (Lot size engine) | "pips_table"
  const [activeTab, setActiveTab] = useState("profit");

  // Shared Instrument
  const [selectedInstId, setSelectedInstId] = useState("EURUSD");
  const inst = useMemo(
    () => INSTRUMENTS.find((i) => i.id === selectedInstId) || INSTRUMENTS[0],
    [selectedInstId]
  );

  // -------------------------------------------------------------
  // TAB 1: PROFIT / LOSS CALCULATOR (OctaFX Style)
  // -------------------------------------------------------------
  const [profitDirection, setProfitDirection] = useState("BUY");
  const [profitLots, setProfitLots] = useState(1.0);
  const [openPrice, setOpenPrice] = useState(inst.currentPrice);
  const [closePrice, setClosePrice] = useState(
    Number((inst.currentPrice + inst.pipStep * 50).toFixed(inst.pipDigits))
  );

  // When instrument changes in Profit Calculator, auto-fill live defaults
  const handleSelectProfitInst = (newId) => {
    setSelectedInstId(newId);
    const newInst = INSTRUMENTS.find((i) => i.id === newId) || INSTRUMENTS[0];
    const baseP = newInst.currentPrice;
    setOpenPrice(baseP);
    if (profitDirection === "BUY") {
      setClosePrice(Number((baseP + newInst.pipStep * 50).toFixed(newInst.pipDigits)));
    } else {
      setClosePrice(Number((baseP - newInst.pipStep * 50).toFixed(newInst.pipDigits)));
    }
  };

  // Flip direction in profit calculator
  const handleToggleProfitDirection = (dir) => {
    if (dir === profitDirection) return;
    setProfitDirection(dir);
    const diff = Math.abs(closePrice - openPrice);
    if (dir === "BUY") {
      setClosePrice(Number((openPrice + diff).toFixed(inst.pipDigits)));
    } else {
      setClosePrice(Number((openPrice - diff).toFixed(inst.pipDigits)));
    }
  };

  // OctaFX Profit Formula:
  // For BUY: (Close - Open) * Volume * ContractSize
  // For SELL: (Open - Close) * Volume * ContractSize
  const profitResults = useMemo(() => {
    const isBuy = profitDirection === "BUY";
    const priceDiff = isBuy ? closePrice - openPrice : openPrice - closePrice;

    // Currency conversions for cross pairs
    let quoteToUsdRate = 1.0;
    if (inst.quoteCurrency === "JPY") quoteToUsdRate = 1 / 154.62;
    else if (inst.quoteCurrency === "CHF") quoteToUsdRate = 1 / 0.8845;
    else if (inst.quoteCurrency === "CAD") quoteToUsdRate = 1 / 1.3980;
    else if (inst.quoteCurrency === "GBP") quoteToUsdRate = 1.2685;
    else if (inst.quoteCurrency === "INR") quoteToUsdRate = 1 / 84.42;
    else if (inst.quoteCurrency === "AED") quoteToUsdRate = 1 / 3.6725;

    // Gross Profit in Quote Currency -> USD
    const grossProfitUsd = priceDiff * profitLots * inst.contractSize * quoteToUsdRate;

    // Pips movement
    const pipsMoved = priceDiff / inst.pipStep;

    // Pip Value for this lot size in USD
    const pipValueUsd = inst.pipStep * profitLots * inst.contractSize * quoteToUsdRate;

    // Required Margin at standard 1:100 leverage
    const notionalValueUsd = openPrice * profitLots * inst.contractSize * quoteToUsdRate;
    const marginRequired100 = notionalValueUsd / 100;

    return {
      grossProfitUsd: grossProfitUsd.toFixed(2),
      isProfit: grossProfitUsd >= 0,
      pipsMoved: (Math.round(pipsMoved * 10) / 10).toFixed(1),
      pipValueUsd: pipValueUsd.toFixed(2),
      marginRequired100: marginRequired100.toFixed(2),
      pointDiff: Math.abs(priceDiff).toFixed(inst.pipDigits)
    };
  }, [profitDirection, closePrice, openPrice, profitLots, inst]);

  // -------------------------------------------------------------
  // TAB 2: POSITION SIZING & LOT CALCULATOR (Capital Guard)
  // -------------------------------------------------------------
  const [posBalance, setPosBalance] = useState(50000);
  const [posRiskPercent, setPosRiskPercent] = useState(1.0);
  const [posStopLossPips, setPosStopLossPips] = useState(25);
  const [posTargetPips, setPosTargetPips] = useState(50);

  const positionSizingResults = useMemo(() => {
    let quoteToUsdRate = 1.0;
    if (inst.quoteCurrency === "JPY") quoteToUsdRate = 1 / 154.62;
    else if (inst.quoteCurrency === "CHF") quoteToUsdRate = 1 / 0.8845;
    else if (inst.quoteCurrency === "CAD") quoteToUsdRate = 1 / 1.3980;
    else if (inst.quoteCurrency === "GBP") quoteToUsdRate = 1.2685;
    else if (inst.quoteCurrency === "INR") quoteToUsdRate = 1 / 84.42;
    else if (inst.quoteCurrency === "AED") quoteToUsdRate = 1 / 3.6725;

    // Pip value per 1.0 standard lot in USD
    const pipValue1Lot = inst.pipStep * inst.contractSize * quoteToUsdRate;

    // Maximum allowed dollar loss based on risk %
    const maxDollarRisk = posBalance * (posRiskPercent / 100);

    // Exact Lot Size = Dollar Risk / (StopLossPips * PipValuePerLot)
    const exactLots = posStopLossPips > 0 ? maxDollarRisk / (posStopLossPips * pipValue1Lot) : 0;
    const roundedLots = Math.max(0.01, Math.round(exactLots * 100) / 100);

    // Projected Profit at Target Pips
    const projectedProfitUsd = roundedLots * posTargetPips * pipValue1Lot;
    const plannedLossUsd = roundedLots * posStopLossPips * pipValue1Lot;

    // Risk to Reward
    const rrRatio = posStopLossPips > 0 ? posTargetPips / posStopLossPips : 0;

    // Prop firm drawdown limiters
    const dailyDrawdownFloor = posBalance * 0.05; // 5% daily limit
    const isExceedingDailyDrawdown = plannedLossUsd > dailyDrawdownFloor;

    return {
      maxDollarRisk: maxDollarRisk.toFixed(2),
      recommendedLots: roundedLots.toFixed(2),
      pipValueForPosition: (roundedLots * pipValue1Lot).toFixed(2),
      projectedProfitUsd: projectedProfitUsd.toFixed(2),
      plannedLossUsd: plannedLossUsd.toFixed(2),
      rrRatio: rrRatio.toFixed(2),
      dailyDrawdownFloor: dailyDrawdownFloor.toFixed(0),
      isExceedingDailyDrawdown
    };
  }, [posBalance, posRiskPercent, posStopLossPips, posTargetPips, inst]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner & Mode Selector */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" />
                <span>Feature #3 • Institutional Quantitative Engine</span>
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                OctaFX-Inspired Easy Precision
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Forex Profit &amp;{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-[#1c9bda] to-blue-600 dark:from-teal-400 dark:via-cyan-300 dark:to-blue-400">
                Position Size Calculator
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Simple, instantaneous calculation of net profit, pip valuation, and recommended lot sizing across all currency pairs, gold, and commodities.
            </p>
          </div>

          {/* Clean 2-Way Tab Switcher (Actually toggles distinct calculators) */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("profit")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "profit"
                  ? "bg-white dark:bg-[#121D2D] text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>Profit Calculator (P/L)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("position_size")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "position_size"
                  ? "bg-white dark:bg-[#121D2D] text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Sliders className="w-4 h-4 text-[#1c9bda]" />
              <span>Position Size (Lots)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: OCTAFX-STYLE PROFIT CALCULATOR (Simple, Intuitive, Fast)          */}
      {/* ========================================================================= */}
      {activeTab === "profit" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
          
          {/* LEFT: Input Form (OctaFX Style: Pair, Volume, Direction, Open, Close) */}
          <div className="lg:col-span-7 p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Trade Parameters</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-teal-600 dark:text-teal-400">
                OctaFX Standard Formula
              </span>
            </div>

            {/* 1. Asset & Direction */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Trading Asset / Currency Pair
                </label>
                <select
                  value={selectedInstId}
                  onChange={(e) => handleSelectProfitInst(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#071324] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/40 cursor-pointer"
                >
                  {INSTRUMENTS.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.pair} • Current: {i.currentPrice}
                    </option>
                  ))}
                </select>
              </div>

              {/* Order Direction: Buy / Sell */}
              <div className="sm:col-span-4 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Direction
                </label>
                <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-[#071324] border border-slate-200/80 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => handleToggleProfitDirection("BUY")}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      profitDirection === "BUY"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>BUY</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleProfitDirection("SELL")}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      profitDirection === "SELL"
                        ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>SELL</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Volume in Lots */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Volume (Lots)
                </label>
                <span className="text-xs font-mono font-black text-teal-600 dark:text-teal-400">
                  {profitLots} Standard Lot{profitLots !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Quick Lot Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {LOT_QUICK_PRESETS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setProfitLots(l)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                      profitLots === l
                        ? "bg-teal-500 text-white border-teal-500 shadow-sm"
                        : "bg-slate-50 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <input
                type="number"
                step="0.01"
                min="0.01"
                value={profitLots}
                onChange={(e) => setProfitLots(Math.max(0.01, Number(e.target.value)))}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#071324] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              />
            </div>

            {/* 3. Open Price & Close Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Open Price (Entry)
                </label>
                <input
                  type="number"
                  step={inst.pipStep}
                  value={openPrice}
                  onChange={(e) => setOpenPrice(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#071324] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                />
                <span className="text-[10px] text-slate-400 font-mono block">
                  Benchmark rate: {inst.currentPrice}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Close Price (Exit)
                </label>
                <input
                  type="number"
                  step={inst.pipStep}
                  value={closePrice}
                  onChange={(e) => setClosePrice(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#071324] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                />
                <span className={`text-[10px] font-mono block font-bold ${profitResults.isProfit ? "text-emerald-500" : "text-rose-500"}`}>
                  Move: {profitResults.isProfit ? "+" : ""}{profitResults.pipsMoved} pips ({profitResults.pointDiff} points)
                </span>
              </div>
            </div>

            {/* Quick Price Bump Buttons */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center justify-between gap-2 flex-wrap text-xs">
              <span className="text-slate-500 text-[11px] font-medium">Quick Close Adjust:</span>
              <div className="flex gap-1.5">
                {[10, 25, 50, 100].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      const move = p * inst.pipStep;
                      setClosePrice(
                        Number((profitDirection === "BUY" ? openPrice + move : openPrice - move).toFixed(inst.pipDigits))
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold hover:border-teal-500 transition-colors"
                  >
                    +{p} pips
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT: Live Profit Results (Clean, high-impact OctaFX result card) */}
          <div className="lg:col-span-5 space-y-5">
            
            <div className={`p-6 sm:p-7 rounded-3xl border shadow-xl relative overflow-hidden transition-all ${
              profitResults.isProfit
                ? "bg-slate-900 dark:bg-[#071324] border-emerald-500/30 text-white"
                : "bg-slate-900 dark:bg-[#071324] border-rose-500/30 text-white"
            }`}>
              
              {/* Radial Glow */}
              <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20 ${
                profitResults.isProfit ? "bg-emerald-500" : "bg-rose-500"
              }`} />

              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Calculated Net P&amp;L</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-slate-300">
                  {profitDirection} {inst.pair}
                </span>
              </div>

              {/* Main Net Profit Number */}
              <div className="py-3 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Net Profit / Loss
                </span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                    profitResults.isProfit ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {profitResults.isProfit ? "+" : ""}${profitResults.grossProfitUsd}
                  </span>
                  <span className="text-sm font-bold text-slate-400 font-mono">USD</span>
                </div>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Pips Movement
                  </span>
                  <span className={`text-base font-black font-mono block mt-0.5 ${
                    profitResults.isProfit ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {profitResults.isProfit ? "+" : ""}{profitResults.pipsMoved} pips
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Pip Value
                  </span>
                  <span className="text-base font-black font-mono text-slate-200 block mt-0.5">
                    ${profitResults.pipValueUsd} / pip
                  </span>
                </div>
              </div>

              {/* Margin & Contract Details */}
              <div className="space-y-2 pt-3 border-t border-white/10 text-xs text-slate-300">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Required Margin (1:100):</span>
                  <span className="font-mono font-bold text-white">${profitResults.marginRequired100} USD</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Contract Size:</span>
                  <span className="font-mono font-bold text-white">{inst.contractSize.toLocaleString()} units</span>
                </div>
              </div>

              {/* Quick Action: Log into Journal */}
              {onNavigateJournal && (
                <button
                  type="button"
                  onClick={onNavigateJournal}
                  className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-[#1c9bda] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer border-0 active:scale-[0.99]"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Log Setup to Trading Journal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

            </div>

            {/* Formula Explainer Card */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 text-xs">
                <Info className="w-4 h-4 text-[#1c9bda]" />
                <span>How OctaFX Profit is Calculated:</span>
              </span>
              <p className="text-[11px] leading-relaxed font-mono bg-slate-50 dark:bg-white/[0.03] p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
                Profit = (Close Price − Open Price) × Lots × Contract Size
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                For EUR/USD, 1 lot = 100,000 EUR. For Gold (XAU/USD), 1 lot = 100 ounces. Results update live as you type.
              </p>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: POSITION SIZING & RISK ENGINE (Capital Guard / Prop Firm)          */}
      {/* ========================================================================= */}
      {activeTab === "position_size" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
          
          {/* LEFT: Position Sizing Input Form */}
          <div className="lg:col-span-7 p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#1c9bda]" />
                <span>Position Sizing &amp; Capital Protection</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                Zero Overleveraging
              </span>
            </div>

            {/* 1. Account Balance & Prop Firm Presets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Account Balance
                </label>
                <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
                  ${posBalance.toLocaleString()} USD
                </span>
              </div>

              {/* Presets */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {BALANCE_PRESETS.map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setPosBalance(p.val)}
                    className={`py-2 px-1 rounded-xl text-[11px] font-mono font-bold transition-all text-center cursor-pointer border ${
                      posBalance === p.val
                        ? "bg-teal-500/15 border-teal-500 text-teal-700 dark:text-teal-300 shadow-sm"
                        : "bg-slate-50 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-slate-400 font-bold text-xs">$</span>
                <input
                  type="number"
                  value={posBalance}
                  onChange={(e) => setPosBalance(Math.max(100, Number(e.target.value)))}
                  className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#071324] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  placeholder="Enter custom account balance..."
                />
              </div>
            </div>

            {/* 2. Risk Percentage & Asset */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-7 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Trading Asset
                </label>
                <select
                  value={selectedInstId}
                  onChange={(e) => setSelectedInstId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#071324] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/40 cursor-pointer"
                >
                  {INSTRUMENTS.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.pair}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Risk Percentage
                  </label>
                  <span className="text-xs font-mono font-black text-rose-500">
                    {posRiskPercent}%
                  </span>
                </div>
                <div className="flex gap-1">
                  {[0.5, 1.0, 1.5, 2.0].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setPosRiskPercent(r)}
                      className={`flex-1 py-2 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                        posRiskPercent === r
                          ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                          : "bg-slate-50 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Stop Loss (Pips) and Target (Pips) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Stop Loss Distance (Pips)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={posStopLossPips}
                  onChange={(e) => setPosStopLossPips(Math.max(1, Number(e.target.value)))}
                  className="w-full px-4 py-3 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
                <span className="text-[10px] text-slate-400 font-mono block">
                  Example: 20 or 30 pips
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  <span>Target Distance (Pips)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={posTargetPips}
                  onChange={(e) => setPosTargetPips(Math.max(1, Number(e.target.value)))}
                  className="w-full px-4 py-3 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <span className="text-[10px] text-slate-400 font-mono block">
                  R:R: 1 : {positionSizingResults.rrRatio}
                </span>
              </div>
            </div>

          </div>

          {/* RIGHT: Calculated Lot Sizing & Safety Telemetry Card */}
          <div className="lg:col-span-5 space-y-5">
            
            <div className="p-6 sm:p-7 rounded-3xl bg-slate-900 dark:bg-[#071324] border border-[#1c9bda]/30 text-white shadow-xl space-y-5 relative overflow-hidden">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#1c9bda] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Recommended Position Size</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-slate-300">
                  {inst.pair}
                </span>
              </div>

              {/* Exact Lots Output Hero */}
              <div className="py-2 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Enter This Exact Lot Size:
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-[#38bdf8]">
                    {positionSizingResults.recommendedLots}
                  </span>
                  <span className="text-base font-bold text-slate-400 font-mono">Lots</span>
                </div>
                <span className="text-xs text-slate-400 font-mono block">
                  Pip Value: ${positionSizingResults.pipValueForPosition} USD / pip
                </span>
              </div>

              {/* Risk vs Reward Metrics */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Dollar Risk at SL
                  </span>
                  <span className="text-base font-black font-mono text-rose-400 block mt-0.5">
                    -${positionSizingResults.plannedLossUsd}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-mono">
                    ({posRiskPercent}% of balance)
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Projected Gain at TP
                  </span>
                  <span className="text-base font-black font-mono text-emerald-400 block mt-0.5">
                    +${positionSizingResults.projectedProfitUsd}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-mono">
                    (1 : {positionSizingResults.rrRatio} R:R)
                  </span>
                </div>
              </div>

              {/* Prop Firm Drawdown Guard */}
              <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Daily Drawdown Floor (5%):</span>
                  <span className="font-mono font-bold text-slate-200">
                    ${positionSizingResults.dailyDrawdownFloor} USD
                  </span>
                </div>

                {positionSizingResults.isExceedingDailyDrawdown ? (
                  <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-[11px] text-rose-300 font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Risk exceeds daily 5% limit! Reduce risk percentage.</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-[11px] text-emerald-300 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Capital safe within prop firm daily buffer.</span>
                  </div>
                )}
              </div>

              {/* Log into Journal */}
              {onNavigateJournal && (
                <button
                  type="button"
                  onClick={onNavigateJournal}
                  className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-[#1c9bda] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer border-0 active:scale-[0.99]"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Execute in Discipline Journal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
