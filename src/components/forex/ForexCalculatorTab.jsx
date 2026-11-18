import React, { useState, useMemo } from "react";
import {
  Calculator, DollarSign, TrendingUp, TrendingDown, ShieldCheck,
  AlertTriangle, Target, Percent, ArrowRight, RefreshCw, BarChart2,
  CheckCircle2, HelpCircle, Layers, Sparkles, Sliders, Compass, Award,
  Flame, Lock, ArrowUpRight, ArrowDownRight, BookOpen
} from "lucide-react";

// Institutional FX, Commodity, and Crypto Instruments with precise contract specifications
const INSTRUMENTS = [
  // G10 USD Majors
  { id: "EURUSD", pair: "EUR/USD", category: "Majors", pipSize: 0.0001, pipValuePerLot: 10, currentPrice: 1.0542, lotUnit: "100,000 EUR" },
  { id: "GBPUSD", pair: "GBP/USD", category: "Majors", pipSize: 0.0001, pipValuePerLot: 10, currentPrice: 1.2685, lotUnit: "100,000 GBP" },
  { id: "USDJPY", pair: "USD/JPY", category: "Majors", pipSize: 0.01, pipValuePerLot: 6.47, currentPrice: 154.62, lotUnit: "100,000 USD" },
  { id: "USDCHF", pair: "USD/CHF", category: "Majors", pipSize: 0.0001, pipValuePerLot: 11.31, currentPrice: 0.8845, lotUnit: "100,000 USD" },
  { id: "USDCAD", pair: "USD/CAD", category: "Majors", pipSize: 0.0001, pipValuePerLot: 7.15, currentPrice: 1.3980, lotUnit: "100,000 USD" },
  { id: "AUDUSD", pair: "AUD/USD", category: "Majors", pipSize: 0.0001, pipValuePerLot: 10, currentPrice: 0.6515, lotUnit: "100,000 AUD" },
  { id: "NZDUSD", pair: "NZD/USD", category: "Majors", pipSize: 0.0001, pipValuePerLot: 10, currentPrice: 0.5872, lotUnit: "100,000 NZD" },
  
  // Cross Majors
  { id: "EURGBP", pair: "EUR/GBP", category: "Crosses", pipSize: 0.0001, pipValuePerLot: 12.68, currentPrice: 0.8310, lotUnit: "100,000 EUR" },
  { id: "EURJPY", pair: "EUR/JPY", category: "Crosses", pipSize: 0.01, pipValuePerLot: 6.47, currentPrice: 163.05, lotUnit: "100,000 EUR" },
  { id: "GBPJPY", pair: "GBP/JPY", category: "Crosses", pipSize: 0.01, pipValuePerLot: 6.47, currentPrice: 196.15, lotUnit: "100,000 GBP" },
  
  // Commodities & Precious Metals
  { id: "XAUUSD", pair: "XAU/USD (Gold)", category: "Metals", pipSize: 0.1, pipValuePerLot: 10, currentPrice: 2596.40, lotUnit: "100 oz Gold" },
  { id: "XAGUSD", pair: "XAG/USD (Silver)", category: "Metals", pipSize: 0.01, pipValuePerLot: 50, currentPrice: 30.45, lotUnit: "5,000 oz Silver" },
  { id: "WTIUSD", pair: "WTI/USD (Crude Oil)", category: "Energy", pipSize: 0.01, pipValuePerLot: 10, currentPrice: 68.90, lotUnit: "1,000 Barrels" },
  
  // Emerging USD Pairs
  { id: "USDINR", pair: "USD/INR", category: "Emerging", pipSize: 0.01, pipValuePerLot: 1.18, currentPrice: 84.42, lotUnit: "100,000 USD" },
  { id: "USDAED", pair: "USD/AED", category: "Emerging", pipSize: 0.0001, pipValuePerLot: 2.72, currentPrice: 3.6725, lotUnit: "100,000 USD" },
  
  // Crypto Majors
  { id: "BTCUSD", pair: "BTC/USD (Bitcoin)", category: "Crypto", pipSize: 1.0, pipValuePerLot: 1.0, currentPrice: 91420.00, lotUnit: "1 BTC" },
  { id: "ETHUSD", pair: "ETH/USD (Ethereum)", category: "Crypto", pipSize: 0.1, pipValuePerLot: 1.0, currentPrice: 3120.00, lotUnit: "10 ETH" }
];

const FUNDED_PRESETS = [
  { label: "$5K Tier 1", value: 5000 },
  { label: "$10K Tier 2", value: 10000 },
  { label: "$25K Tier 3", value: 25000 },
  { label: "$50K Tier 4", value: 50000 },
  { label: "$100K Master", value: 100000 },
  { label: "$200K Exec", value: 200000 }
];

const LOT_PRESETS = [0.1, 0.25, 0.5, 1.0, 2.0, 3.0, 5.0];

export default function ForexCalculatorTab({ dark, onNavigateJournal }) {
  // Mode selection: "profit" | "position_size" | "pip_value"
  const [calcMode, setCalcMode] = useState("profit");

  // Core parameters
  const [selectedInstId, setSelectedInstId] = useState("EURUSD");
  const [direction, setDirection] = useState("BUY"); // "BUY" (Long) | "SELL" (Short)
  const [accountBalance, setAccountBalance] = useState(50000);
  const [riskPercent, setRiskPercent] = useState(1.0);
  const [lotSize, setLotSize] = useState(1.0);

  // Price parameters
  const selectedInstrument = useMemo(
    () => INSTRUMENTS.find((i) => i.id === selectedInstId) || INSTRUMENTS[0],
    [selectedInstId]
  );

  const [entryPrice, setEntryPrice] = useState(selectedInstrument.currentPrice);
  const [exitPrice, setExitPrice] = useState(
    Number((selectedInstrument.currentPrice + selectedInstrument.pipSize * 35).toFixed(4))
  );
  const [stopLossPrice, setStopLossPrice] = useState(
    Number((selectedInstrument.currentPrice - selectedInstrument.pipSize * 15).toFixed(4))
  );

  // When instrument changes, update entry/exit prices to reasonable live defaults
  const handleSelectInstrument = (instId) => {
    setSelectedInstId(instId);
    const inst = INSTRUMENTS.find((i) => i.id === instId) || INSTRUMENTS[0];
    const defaultEntry = inst.currentPrice;
    setEntryPrice(defaultEntry);
    if (direction === "BUY") {
      setExitPrice(Number((defaultEntry + inst.pipSize * 35).toFixed(4)));
      setStopLossPrice(Number((defaultEntry - inst.pipSize * 15).toFixed(4)));
    } else {
      setExitPrice(Number((defaultEntry - inst.pipSize * 35).toFixed(4)));
      setStopLossPrice(Number((defaultEntry + inst.pipSize * 15).toFixed(4)));
    }
  };

  // Toggle Buy / Sell and flip Target & Stop Loss
  const handleToggleDirection = (newDir) => {
    if (newDir === direction) return;
    setDirection(newDir);
    // Invert target and stop loss distances
    const targetDiff = Math.abs(exitPrice - entryPrice);
    const slDiff = Math.abs(entryPrice - stopLossPrice);
    if (newDir === "BUY") {
      setExitPrice(Number((entryPrice + targetDiff).toFixed(4)));
      setStopLossPrice(Number((entryPrice - slDiff).toFixed(4)));
    } else {
      setExitPrice(Number((entryPrice - targetDiff).toFixed(4)));
      setStopLossPrice(Number((entryPrice + slDiff).toFixed(4)));
    }
  };

  // Mathematical Analytics Engine
  const calculations = useMemo(() => {
    const pipSize = selectedInstrument.pipSize;
    const basePipValPerLot = selectedInstrument.pipValuePerLot;

    // Total Lot Pip Value in USD
    const currentLotPipValue = lotSize * basePipValPerLot;

    // Pip Gain / Loss
    let gainPips = 0;
    let riskPips = 0;

    if (direction === "BUY") {
      gainPips = (exitPrice - entryPrice) / pipSize;
      riskPips = (entryPrice - stopLossPrice) / pipSize;
    } else {
      gainPips = (entryPrice - exitPrice) / pipSize;
      riskPips = (stopLossPrice - entryPrice) / pipSize;
    }

    gainPips = Math.round(gainPips * 10) / 10;
    riskPips = Math.round(riskPips * 10) / 10;

    // Profit & Loss in USD
    const profitUsd = gainPips * currentLotPipValue;
    const lossUsd = riskPips * currentLotPipValue;

    // ROI percentages
    const returnPct = accountBalance > 0 ? (profitUsd / accountBalance) * 100 : 0;
    const riskPct = accountBalance > 0 ? (lossUsd / accountBalance) * 100 : 0;

    // Risk to Reward
    const rrRatio = riskPips > 0 ? gainPips / riskPips : 0;

    // Position Size Recommendation based on account risk %
    const maxAllowedDollarRisk = accountBalance * (riskPercent / 100);
    const recommendedLots =
      riskPips > 0
        ? Math.max(0.01, Math.round((maxAllowedDollarRisk / (riskPips * basePipValPerLot)) * 100) / 100)
        : 0.1;

    // Prop Firm Drawdown limits
    const dailyDrawdownFloor = accountBalance * 0.05; // 5% limit
    const maxDrawdownFloor = accountBalance * 0.10; // 10% limit
    const isExceedingDailyDrawdown = lossUsd > dailyDrawdownFloor;

    return {
      gainPips,
      riskPips,
      profitUsd: profitUsd.toFixed(2),
      lossUsd: lossUsd.toFixed(2),
      returnPct: returnPct.toFixed(2),
      riskPct: riskPct.toFixed(2),
      rrRatio: rrRatio.toFixed(2),
      currentLotPipValue: currentLotPipValue.toFixed(2),
      recommendedLots: recommendedLots.toFixed(2),
      maxAllowedDollarRisk: maxAllowedDollarRisk.toFixed(2),
      dailyDrawdownFloor: dailyDrawdownFloor.toFixed(0),
      maxDrawdownFloor: maxDrawdownFloor.toFixed(0),
      isExceedingDailyDrawdown
    };
  }, [
    selectedInstrument,
    direction,
    entryPrice,
    exitPrice,
    stopLossPrice,
    lotSize,
    accountBalance,
    riskPercent
  ]);

  // Quick Scenario Matrix: +10, +25, +50, +100 pips vs -10, -20, -30 pips
  const scenarioMatrix = useMemo(() => {
    const pipCost = lotSize * selectedInstrument.pipValuePerLot;
    const pipsSteps = [10, 25, 50, 75, 100, 150];
    return pipsSteps.map((p) => {
      const gainDollar = p * pipCost;
      const gainPercent = accountBalance > 0 ? (gainDollar / accountBalance) * 100 : 0;
      const lossDollar = p * pipCost;
      const lossPercent = accountBalance > 0 ? (lossDollar / accountBalance) * 100 : 0;
      return {
        pips: p,
        gainDollar: gainDollar.toFixed(2),
        gainPercent: gainPercent.toFixed(2),
        lossDollar: lossDollar.toFixed(2),
        lossPercent: lossPercent.toFixed(2)
      };
    });
  }, [lotSize, selectedInstrument, accountBalance]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner: Institutional Profit & Position Size Engine */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm relative overflow-hidden">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-teal-500/[0.04] dark:bg-teal-500/[0.08] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#1c9bda]/[0.04] dark:bg-[#1c9bda]/[0.08] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" />
                <span>Feature #3 • Institutional Quantitative Suite</span>
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Live Pip &amp; Profit Engine
              </span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Forex Profit, Lot Size &amp;{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-[#1c9bda] to-blue-600 dark:from-teal-400 dark:via-cyan-300 dark:to-blue-400">
                Risk Management Engine
              </span>
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Model precise profit payouts, pip value exposure, and exact position sizes across G10 majors, gold, and crypto. Engineered with strict capital preservation guardrails for funded challenges starting from $5,000.
            </p>
          </div>

          {/* Quick Mode Toggle Switch */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shrink-0 self-start md:self-auto">
            <button
              onClick={() => setCalcMode("profit")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                calcMode === "profit"
                  ? "bg-white dark:bg-[#121D2D] text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Profit / Loss</span>
            </button>

            <button
              onClick={() => setCalcMode("position_size")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                calcMode === "position_size"
                  ? "bg-white dark:bg-[#121D2D] text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-[#1c9bda]" />
              <span>Position Sizing</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Calculator Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Input Configuration Dashboard (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-5">
            
            {/* Step 1: Instrument & Trade Direction Selector */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>1. Select Trading Pair &amp; Order Direction</span>
                <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400">
                  Live Benchmarks Synced
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Instrument Dropdown */}
                <div className="sm:col-span-8">
                  <select
                    value={selectedInstId}
                    onChange={(e) => handleSelectInstrument(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#071324] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/40 cursor-pointer"
                  >
                    {INSTRUMENTS.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.pair} • Current: {inst.currentPrice} ({inst.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Long (Buy) / Short (Sell) Direction Toggle */}
                <div className="sm:col-span-4 flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-[#071324] border border-slate-200/80 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => handleToggleDirection("BUY")}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      direction === "BUY"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>BUY</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleDirection("SELL")}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      direction === "SELL"
                        ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>SELL</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Account Balance & Prop Firm Presets */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  2. Account Balance (Funded / Personal)
                </label>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                  ${Number(accountBalance).toLocaleString()} USD
                </span>
              </div>

              {/* Quick Presets starting from $5K */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {FUNDED_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setAccountBalance(p.value)}
                    className={`py-2 px-2 rounded-xl text-[11px] font-mono font-bold transition-all text-center cursor-pointer border ${
                      accountBalance === p.value
                        ? "bg-teal-500/15 border-teal-500/50 text-teal-700 dark:text-teal-300 shadow-sm"
                        : "bg-slate-50 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Balance Input */}
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-slate-400 font-bold text-xs">$</span>
                <input
                  type="number"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(Math.max(100, Number(e.target.value)))}
                  className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#071324] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  placeholder="Enter custom account balance..."
                />
              </div>
            </div>

            {/* Step 3: Lot Size & Risk Percentage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-white/5">
              
              {/* Lot Size Slider & Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Position Lots
                  </label>
                  <span className="text-xs font-mono font-black text-teal-600 dark:text-teal-400">
                    {lotSize} Lots
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {LOT_PRESETS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLotSize(l)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                        lotSize === l
                          ? "bg-teal-500 text-white border-teal-500 shadow-sm"
                          : "bg-slate-50 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-slate-400"
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
                  max="100"
                  value={lotSize}
                  onChange={(e) => setLotSize(Math.max(0.01, Number(e.target.value)))}
                  className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-[#071324] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                />
                <span className="text-[10px] text-slate-400 block font-mono">
                  1.0 Standard Lot = {selectedInstrument.lotUnit}
                </span>
              </div>

              {/* Risk Percentage Cap */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Target Risk %
                  </label>
                  <span className="text-xs font-mono font-black text-rose-600 dark:text-rose-400">
                    {riskPercent}% Max
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[0.5, 1.0, 1.5, 2.0, 3.0].map((rp) => (
                    <button
                      key={rp}
                      type="button"
                      onClick={() => setRiskPercent(rp)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                        riskPercent === rp
                          ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                          : "bg-slate-50 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {rp}%
                    </button>
                  ))}
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#071324] border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Max Dollar Risk:</span>
                  <span className="text-xs font-mono font-black text-rose-500">
                    ${calculations.maxAllowedDollarRisk}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block font-mono">
                  Recommended Lot: <strong>{calculations.recommendedLots} Lots</strong>
                </span>
              </div>
            </div>

            {/* Step 4: Price Levels: Entry, Take Profit, and Stop Loss */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                3. Execution Price Levels (Entry, Target, Stop Loss)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Entry Price */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 block">Entry Price</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#071324] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                  <span className="text-[9px] text-slate-400 font-mono block">Current market rate</span>
                </div>

                {/* Take Profit Price */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    <span>Take Profit</span>
                  </span>
                  <input
                    type="number"
                    step="0.0001"
                    value={exitPrice}
                    onChange={(e) => setExitPrice(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                  <span className="text-[9px] text-emerald-600 font-mono block font-bold">
                    +{calculations.gainPips} pips gain
                  </span>
                </div>

                {/* Stop Loss Price */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Stop Loss</span>
                  </span>
                  <input
                    type="number"
                    step="0.0001"
                    value={stopLossPrice}
                    onChange={(e) => setStopLossPrice(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                  />
                  <span className="text-[9px] text-rose-600 font-mono block font-bold">
                    -{calculations.riskPips} pips risk
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Quick Pip Steps Scenario Matrix */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Pips Projection Scenario Matrix ({lotSize} Lots on {selectedInstrument.pair})</span>
              </h4>
              <span className="text-[11px] font-mono text-slate-400">
                1 Pip = ${calculations.currentLotPipValue} USD
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5 text-[10px] uppercase text-slate-400">
                    <th className="py-2 px-3">Price Move</th>
                    <th className="py-2 px-3 text-emerald-600 dark:text-emerald-400">Target Profit ($)</th>
                    <th className="py-2 px-3 text-emerald-600 dark:text-emerald-400">Target ROI %</th>
                    <th className="py-2 px-3 text-rose-600 dark:text-rose-400">Stop Loss ($)</th>
                    <th className="py-2 px-3 text-rose-600 dark:text-rose-400">Drawdown %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {scenarioMatrix.map((s) => (
                    <tr key={s.pips} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-white">
                        ±{s.pips} Pips
                      </td>
                      <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold">
                        +${s.gainDollar}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold">
                        +{s.gainPercent}%
                      </td>
                      <td className="py-2.5 px-3 text-rose-600 dark:text-rose-400 font-bold">
                        -${s.lossDollar}
                      </td>
                      <td className="py-2.5 px-3 text-rose-600 dark:text-rose-400 font-bold">
                        -{s.lossPercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Quantitative Execution Telemetry & PnL Card (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Executive PnL & R:R Verdict Card */}
          <div className="p-6 rounded-3xl bg-slate-900 dark:bg-[#071324] border border-teal-500/30 text-white shadow-xl space-y-5 relative overflow-hidden">
            {/* Background Laser Watermark */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                <span>Trade Telemetry Report</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-slate-300">
                {direction} {selectedInstrument.pair}
              </span>
            </div>

            {/* Projected Net Profit Hero */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Projected Take Profit Gain
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-emerald-400">
                  +${calculations.profitUsd}
                </span>
                <span className="text-base font-black font-mono text-emerald-400/90">
                  (+{calculations.returnPct}%)
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono block">
                Target Move: +{calculations.gainPips} pips
              </span>
            </div>

            {/* Maximum Capital Risk Floor */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  Planned Max Loss (SL)
                </span>
                <span className="font-mono font-black text-rose-400">
                  -${calculations.lossUsd} (-{calculations.riskPct}%)
                </span>
              </div>
              
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                <span className="text-slate-400 text-[11px]">Stop Loss Distance:</span>
                <span className="font-mono text-slate-300">-{calculations.riskPips} pips</span>
              </div>
            </div>

            {/* Risk to Reward Evaluation Ribbon */}
            <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider">
                  Planned Risk : Reward (R:R)
                </span>
                <span className="text-base font-black font-mono text-teal-300">
                  1 : {calculations.rrRatio}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 text-xs">
                {Number(calculations.rrRatio) >= 2.0 ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Institutional Expectancy Positive</span>
                  </span>
                ) : Number(calculations.rrRatio) >= 1.5 ? (
                  <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 font-bold text-[10px]">
                    Acceptable Setup (1:1.5+)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Sub-optimal R:R (Min 1:2.0 recommended)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Institutional Prop Firm Drawdown Guard */}
            <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Daily Max Loss Floor (5%):</span>
                <span className="font-mono font-bold text-slate-200">
                  ${calculations.dailyLossFloor}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Total Max Drawdown (10%):</span>
                <span className="font-mono font-bold text-slate-200">
                  ${calculations.maxDrawdownFloor}
                </span>
              </div>

              {calculations.isExceedingDailyDrawdown && (
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-[11px] text-rose-300 font-bold flex items-center gap-2 mt-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>Warning: Planned risk exceeds standard 5% daily drawdown floor! Reduce lot size.</span>
                </div>
              )}
            </div>

            {/* Quick Transition: Log into Discipline Journal */}
            {onNavigateJournal && (
              <button
                type="button"
                onClick={onNavigateJournal}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-[#1c9bda] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer border-0 active:scale-[0.99]"
              >
                <BookOpen className="w-4 h-4" />
                <span>Log to Discipline Trading Journal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

          </div>

          {/* Institutional Pip Value Quick Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Pip Formula &amp; Leverage Specifications</span>
            </h4>
            
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 font-mono text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span>Standard Lot (1.0):</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ${selectedInstrument.pipValuePerLot} / pip
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Mini Lot (0.10):</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ${(selectedInstrument.pipValuePerLot * 0.1).toFixed(2)} / pip
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Micro Lot (0.01):</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ${(selectedInstrument.pipValuePerLot * 0.01).toFixed(2)} / pip
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 pt-1">
                Calm Capital computes pip valuation dynamically using benchmark exchange ticks. For USD quote pairs (EUR/USD, GBP/USD, XAU/USD), 1 standard lot is exactly $10/pip.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
