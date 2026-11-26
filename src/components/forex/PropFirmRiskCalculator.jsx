import React, { useState, useMemo } from "react";
import {
  Calculator, ShieldCheck, AlertTriangle, ArrowRight, DollarSign,
  TrendingDown, Percent, Target, HelpCircle, X, Shield, Lock
} from "lucide-react";

const INSTRUMENTS = [
  // G10 USD Majors
  { id: "EURUSD", name: "EUR/USD", pipSize: 0.0001, pipValuePerLot: 10 },
  { id: "GBPUSD", name: "GBP/USD", pipSize: 0.0001, pipValuePerLot: 10 },
  { id: "USDJPY", name: "USD/JPY", pipSize: 0.01, pipValuePerLot: 6.5 },
  { id: "USDCHF", name: "USD/CHF", pipSize: 0.0001, pipValuePerLot: 11.3 },
  { id: "USDCAD", name: "USD/CAD", pipSize: 0.0001, pipValuePerLot: 7.2 },
  { id: "AUDUSD", name: "AUD/USD", pipSize: 0.0001, pipValuePerLot: 10 },
  { id: "NZDUSD", name: "NZD/USD", pipSize: 0.0001, pipValuePerLot: 10 },
  // Commodities & Metals (USD Denominated)
  { id: "XAUUSD", name: "XAU/USD (Gold)", pipSize: 0.1, pipValuePerLot: 10 },
  { id: "XAGUSD", name: "XAG/USD (Silver)", pipSize: 0.01, pipValuePerLot: 50 },
  { id: "WTIUSD", name: "WTI/USD (Crude Oil)", pipSize: 0.01, pipValuePerLot: 10 },
  { id: "BRENTUSD", name: "BRENT/USD (Brent Oil)", pipSize: 0.01, pipValuePerLot: 10 },
  // Emerging & Cross USD Pairs
  { id: "USDINR", name: "USD/INR (Rupee)", pipSize: 0.01, pipValuePerLot: 1.18 },
  { id: "USDAED", name: "USD/AED (Dirham)", pipSize: 0.0001, pipValuePerLot: 2.72 },
  { id: "USDSGD", name: "USD/SGD", pipSize: 0.0001, pipValuePerLot: 7.4 },
  { id: "USDHKD", name: "USD/HKD", pipSize: 0.0001, pipValuePerLot: 1.28 },
  { id: "USDCNH", name: "USD/CNH (Yuan)", pipSize: 0.0001, pipValuePerLot: 1.38 },
  { id: "USDMXN", name: "USD/MXN (Peso)", pipSize: 0.001, pipValuePerLot: 0.49 },
  { id: "USDZAR", name: "USD/ZAR (Rand)", pipSize: 0.001, pipValuePerLot: 0.55 },
  { id: "USDTRY", name: "USD/TRY (Lira)", pipSize: 0.001, pipValuePerLot: 0.29 },
  { id: "USDSEK", name: "USD/SEK (Krona)", pipSize: 0.001, pipValuePerLot: 0.92 },
  { id: "USDNOK", name: "USD/NOK (Krone)", pipSize: 0.001, pipValuePerLot: 0.91 },
  // Crypto USD Majors
  { id: "BTCUSD", name: "BTC/USD (Bitcoin)", pipSize: 1.0, pipValuePerLot: 1.0 },
  { id: "ETHUSD", name: "ETH/USD (Ethereum)", pipSize: 0.1, pipValuePerLot: 1.0 },
  { id: "SOLUSD", name: "SOL/USD (Solana)", pipSize: 0.01, pipValuePerLot: 1.0 }
];

// Presets starting from $5,000 as explicitly required
const FUNDED_PRESETS = [
  { label: "$5K Account", balance: 5000 },
  { label: "$10K Account", balance: 10000 },
  { label: "$25K Account", balance: 25000 },
  { label: "$50K Account", balance: 50000 },
  { label: "$100K Account", balance: 100000 },
  { label: "$200K Account", balance: 200000 }
];

export default function PropFirmRiskCalculator({ onClose, dark }) {
  const [instrumentId, setInstrumentId] = useState("EURUSD");
  const [balance, setBalance] = useState(5000); // Defaults to $5K
  const [riskPercent, setRiskPercent] = useState(1.0);
  const [stopLossPips, setStopLossPips] = useState(20);
  const [targetRr, setTargetRr] = useState(2.5);

  const selectedInst = INSTRUMENTS.find((i) => i.id === instrumentId) || INSTRUMENTS[0];

  // Mathematical Risk Calculations
  const metrics = useMemo(() => {
    const riskAmount = balance * (riskPercent / 100);
    const pipCost = selectedInst.pipValuePerLot;
    const totalPipRisk = stopLossPips * pipCost;
    const lotSize = totalPipRisk > 0 ? riskAmount / totalPipRisk : 0;
    const roundedLots = Math.max(0.01, Math.round(lotSize * 100) / 100);

    const projectedProfit = riskAmount * targetRr;
    const dailyLossFloor = balance * 0.05; // 5% daily limit
    const maxDrawdownFloor = balance * 0.10; // 10% max limit
    const remainingDailyBuffer = dailyLossFloor - riskAmount;

    return {
      riskAmount: riskAmount.toFixed(2),
      lotSize: roundedLots.toFixed(2),
      pipValue: (roundedLots * selectedInst.pipValuePerLot).toFixed(2),
      projectedProfit: projectedProfit.toFixed(2),
      dailyLossFloor: dailyLossFloor.toFixed(0),
      maxDrawdownFloor: maxDrawdownFloor.toFixed(0),
      remainingDailyBuffer: remainingDailyBuffer.toFixed(2),
      isSafe: remainingDailyBuffer > 0
    };
  }, [balance, riskPercent, stopLossPips, targetRr, selectedInst]);

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Funded Account Risk &amp; Position Size Engine
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Calculate exact lot sizes, dollar exposure, and capital preservation guardrails before trade execution.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Account Tier Presets (Starting from $5K) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
          Account Tier:
        </span>
        {FUNDED_PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setBalance(p.balance)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
              balance === p.balance
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm"
                : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Instrument */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Instrument
          </label>
          <select
            value={instrumentId}
            onChange={(e) => setInstrumentId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
          >
            {INSTRUMENTS.map((inst) => (
              <option key={inst.id} value={inst.id} className="dark:bg-[#0B1528]">
                {inst.name}
              </option>
            ))}
          </select>
        </div>

        {/* Account Balance */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Account Balance ($)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">$</span>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(Math.max(1, Number(e.target.value)))}
              className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {/* Risk Percentage */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Planned Risk %
            </label>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
              riskPercent <= 2.0 ? "text-emerald-500 bg-emerald-500/10" : "text-amber-500 bg-amber-500/10"
            }`}>
              {riskPercent <= 2.0 ? "≤ 2% Standard" : "> 2% Custom"}
            </span>
          </div>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="100"
              value={riskPercent}
              onChange={(e) => setRiskPercent(Math.max(0.1, Number(e.target.value)))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">%</span>
          </div>
          <div className="flex gap-1 mt-1.5">
            {[0.5, 1.0, 1.5, 2.0, 3.0, 5.0].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRiskPercent(r)}
                className={`flex-1 py-1 rounded-lg text-[9px] font-mono font-bold transition-all cursor-pointer border ${
                  riskPercent === r
                    ? r <= 2.0 ? "bg-teal-500 text-white border-teal-500" : "bg-amber-500 text-white border-amber-500"
                    : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300"
                }`}
              >
                {r}%{r === 2.0 ? "★" : ""}
              </button>
            ))}
          </div>
        </div>

        {/* Stop Loss in Pips */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Stop Loss (Pips)
          </label>
          <input
            type="number"
            value={stopLossPips}
            onChange={(e) => setStopLossPips(Math.max(1, Number(e.target.value)))}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
          />
        </div>

      </div>

      {/* Institutional 2% Max Risk Guidance Banner */}
      {riskPercent <= 2.0 ? (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold flex items-center gap-1.5">
              <span>Institutional Rule: Safe Capital Preservation ({riskPercent}% ≤ 2.0% Recommended Max)</span>
            </div>
            <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/80 mt-0.5 leading-relaxed">
              Top prop firms and institutional funds enforce a maximum <strong>2.0% risk rule</strong> per setup to protect against drawdown ruin. Your current position is disciplined.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
              <span>High Risk Notice: Exceeds Recommended 2.0% Maximum Rule ({riskPercent}%)</span>
            </div>
            <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 mt-0.5 leading-relaxed">
              Institutional best practice recommends risking <strong>max 2.0%</strong> per trade. You have full freedom to set whatever risk percentage you want — at the end of the day, it is your choice — but higher risk accelerates drawdown velocity.
            </p>
          </div>
        </div>
      )}

      {/* Dynamic Results Output Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10">
        
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Amount at Risk
          </span>
          <p className="text-xl font-black font-mono text-rose-500 mt-0.5">
            -${metrics.riskAmount}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">{riskPercent}% of capital</span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            Recommended Volume
          </span>
          <p className="text-2xl font-black font-mono text-teal-600 dark:text-teal-400 mt-0.5">
            {metrics.lotSize} <span className="text-xs font-normal text-slate-400">lots</span>
          </p>
          <span className="text-[10px] text-slate-400">Discipline sizing</span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Pip Value
          </span>
          <p className="text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
            ${metrics.pipValue} <span className="text-xs font-normal text-slate-400">/ pip</span>
          </p>
          <span className="text-[10px] text-slate-400 font-mono">Per 1.0 pip movement</span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
            Target Return ({targetRr}:1 R:R)
          </span>
          <p className="text-xl font-black font-mono text-emerald-500 mt-0.5">
            +${metrics.projectedProfit}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">Projected win target</span>
        </div>

      </div>

      {/* Capital Preservation Floor */}
      <div className="p-4 rounded-2xl bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-teal-500 shrink-0" />
          <div>
            <span className="font-bold text-slate-900 dark:text-white">
              Funded Capital Preservation Guardrail:
            </span>
            <span className="text-slate-500 dark:text-slate-400 ml-1.5">
              Daily Loss Floor: <strong className="text-slate-800 dark:text-slate-200 font-mono">${metrics.dailyLossFloor}</strong> • Remaining Buffer: <strong className="text-teal-600 dark:text-teal-400 font-mono">${metrics.remainingDailyBuffer}</strong>
            </span>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30 font-mono font-bold text-[11px] shrink-0">
          Disciplined Sizing Active ✅
        </span>
      </div>

    </div>
  );
}
