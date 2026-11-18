import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Calculator, DollarSign, TrendingUp, TrendingDown, ShieldCheck,
  AlertTriangle, Target, Percent, ArrowRight, RefreshCw, BarChart2,
  CheckCircle2, Sparkles, Sliders, ArrowUpRight, ArrowDownRight,
  BookOpen, HelpCircle, Info, Shield, Layers, Search, ChevronDown, Check, ExternalLink, Activity
} from "lucide-react";
import { fetchLiveForexRates } from "../../services/forexLiveRates.js";

/**
 * Institutional Instrument Specifications (MetaTrader, Bloomberg & Institutional Broker Standards)
 */
const INSTRUMENTS = [
  // G10 USD Majors
  { id: "EURUSD", symbol: "EUR/USD", pair: "EUR/USD", name: "Euro vs US Dollar", category: "Majors", contractSize: 100000, pipDigits: 4, pipStep: 0.0001, defaultPrice: 1.0542, quoteCurrency: "USD", tvSymbol: "FX:EURUSD" },
  { id: "GBPUSD", symbol: "GBP/USD", pair: "GBP/USD", name: "British Pound vs US Dollar", category: "Majors", contractSize: 100000, pipDigits: 4, pipStep: 0.0001, defaultPrice: 1.2685, quoteCurrency: "USD", tvSymbol: "FX:GBPUSD" },
  { id: "USDJPY", symbol: "USD/JPY", pair: "USD/JPY", name: "US Dollar vs Japanese Yen", category: "Majors", contractSize: 100000, pipDigits: 2, pipStep: 0.01, defaultPrice: 154.62, quoteCurrency: "JPY", tvSymbol: "FX:USDJPY" },
  { id: "USDCHF", symbol: "USD/CHF", pair: "USD/CHF", name: "US Dollar vs Swiss Franc", category: "Majors", contractSize: 100000, pipDigits: 4, pipStep: 0.0001, defaultPrice: 0.8845, quoteCurrency: "CHF", tvSymbol: "FX:USDCHF" },
  { id: "USDCAD", symbol: "USD/CAD", pair: "USD/CAD", name: "US Dollar vs Canadian Dollar", category: "Majors", contractSize: 100000, pipDigits: 4, pipStep: 0.0001, defaultPrice: 1.3980, quoteCurrency: "CAD", tvSymbol: "FX:USDCAD" },
  { id: "AUDUSD", symbol: "AUD/USD", pair: "AUD/USD", name: "Australian Dollar vs US Dollar", category: "Majors", contractSize: 100000, pipDigits: 4, pipStep: 0.0001, defaultPrice: 0.6515, quoteCurrency: "USD", tvSymbol: "FX:AUDUSD" },
  { id: "NZDUSD", symbol: "NZD/USD", pair: "NZD/USD", name: "New Zealand Dollar vs US Dollar", category: "Majors", contractSize: 100000, pipDigits: 4, pipStep: 0.0001, defaultPrice: 0.5872, quoteCurrency: "USD", tvSymbol: "FX:NZDUSD" },

  // Global Stock Indices
  { id: "US30", symbol: "US30", pair: "US30", name: "Wall Street 30 / Dow Jones Index", category: "Indices", contractSize: 1, pipDigits: 1, pipStep: 1.0, defaultPrice: 43440.0, quoteCurrency: "USD", tvSymbol: "BLACKBULL:US30" },
  { id: "NAS100", symbol: "NAS100", pair: "NAS100", name: "US Tech 100 / Nasdaq Index", category: "Indices", contractSize: 1, pipDigits: 2, pipStep: 0.1, defaultPrice: 20650.0, quoteCurrency: "USD", tvSymbol: "OANDA:NAS100USD" },
  { id: "SPX500", symbol: "SPX500", pair: "SPX500", name: "US 500 / S&P 500 Index", category: "Indices", contractSize: 10, pipDigits: 2, pipStep: 0.1, defaultPrice: 5870.0, quoteCurrency: "USD", tvSymbol: "OANDA:SPX500USD" },
  { id: "GER40", symbol: "GER40", pair: "GER40", name: "Germany 40 / DAX Index", category: "Indices", contractSize: 1, pipDigits: 1, pipStep: 1.0, defaultPrice: 19250.0, quoteCurrency: "EUR", tvSymbol: "OANDA:DE40EUR" },

  // Precious Metals & Energy
  { id: "XAUUSD", symbol: "XAU/USD", pair: "XAU/USD", name: "Spot Gold (Troy Ounce)", category: "Metals", contractSize: 100, pipDigits: 2, pipStep: 0.1, defaultPrice: 2685.80, quoteCurrency: "USD", tvSymbol: "OANDA:XAUUSD" },
  { id: "XAGUSD", symbol: "XAG/USD", pair: "XAG/USD", name: "Spot Silver (Troy Ounce)", category: "Metals", contractSize: 5000, pipDigits: 3, pipStep: 0.01, defaultPrice: 31.40, quoteCurrency: "USD", tvSymbol: "OANDA:XAGUSD" },
  { id: "WTIUSD", symbol: "WTI/USD", pair: "WTI/USD", name: "US Crude Oil (WTI Light)", category: "Energy", contractSize: 1000, pipDigits: 2, pipStep: 0.01, defaultPrice: 69.20, quoteCurrency: "USD", tvSymbol: "TVC:USOIL" },

  // G10 Crosses
  { id: "EURGBP", symbol: "EUR/GBP", pair: "EUR/GBP", name: "Euro vs British Pound", category: "Crosses", contractSize: 100000, pipDigits: 4, pipStep: 0.0001, defaultPrice: 0.8320, quoteCurrency: "GBP", tvSymbol: "FX:EURGBP" },
  { id: "EURJPY", symbol: "EUR/JPY", pair: "EUR/JPY", name: "Euro vs Japanese Yen", category: "Crosses", contractSize: 100000, pipDigits: 2, pipStep: 0.01, defaultPrice: 163.10, quoteCurrency: "JPY", tvSymbol: "FX:EURJPY" },
  { id: "GBPJPY", symbol: "GBP/JPY", pair: "GBP/JPY", name: "British Pound vs Japanese Yen", category: "Crosses", contractSize: 100000, pipDigits: 2, pipStep: 0.01, defaultPrice: 196.05, quoteCurrency: "JPY", tvSymbol: "FX:GBPJPY" },

  // Emerging & Crypto
  { id: "USDINR", symbol: "USD/INR", pair: "USD/INR", name: "US Dollar vs Indian Rupee", category: "Emerging", contractSize: 100000, pipDigits: 2, pipStep: 0.01, defaultPrice: 84.45, quoteCurrency: "INR", tvSymbol: "FX_IDC:USDINR" },
  { id: "USDAED", symbol: "USD/AED", pair: "USD/AED", name: "US Dollar vs UAE Dirham", category: "Emerging", contractSize: 100000, pipDigits: 4, pipStep: 0.0001, defaultPrice: 3.6725, quoteCurrency: "AED", tvSymbol: "FX_IDC:USDAED" },
  { id: "BTCUSD", symbol: "BTC/USD", pair: "BTC/USD", name: "Bitcoin vs US Dollar", category: "Crypto", contractSize: 1, pipDigits: 2, pipStep: 1.0, defaultPrice: 91850.00, quoteCurrency: "USD", tvSymbol: "BINANCE:BTCUSDT" },
  { id: "ETHUSD", symbol: "ETH/USD", pair: "ETH/USD", name: "Ethereum vs US Dollar", category: "Crypto", contractSize: 1, pipDigits: 2, pipStep: 0.1, defaultPrice: 3140.00, quoteCurrency: "USD", tvSymbol: "BINANCE:ETHUSDT" }
];

/**
 * Modern Searchable Instrument Selector Dropdown
 */
function SearchableInstrumentSelector({ selectedId, onSelect, label = "Trading Asset", liveRates = {} }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const dropdownRef = useRef(null);

  const selectedItem = useMemo(
    () => INSTRUMENTS.find((i) => i.id === selectedId) || INSTRUMENTS[0],
    [selectedId]
  );

  const categories = ["ALL", "Majors", "Indices", "Metals", "Energy", "Crosses", "Crypto"];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return INSTRUMENTS.filter((i) => {
      const matchCat = category === "ALL" || i.category === category;
      const matchQuery =
        !q ||
        i.symbol.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [search, category]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
          {label}
        </label>
        <span className="text-[10px] font-mono font-bold text-[#1c9bda]">Search &amp; Filter</span>
      </div>

      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 dark:bg-[#071324] dark:hover:bg-[#0A1A32] border border-slate-200/90 dark:border-white/10 text-left transition-all cursor-pointer flex items-center justify-between gap-3 shadow-sm group focus:outline-none focus:ring-2 focus:ring-teal-500/40"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-sm font-black font-mono text-slate-900 dark:text-white tracking-tight">
            {selectedItem.symbol}
          </span>
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Live:{" "}
              {(() => {
                const val = (liveRates && liveRates[selectedItem.symbol]) || selectedItem.defaultPrice;
                if (selectedItem.quoteCurrency === "USD" && (selectedItem.category === "Metals" || selectedItem.category === "Crypto" || selectedItem.category === "Indices" || selectedItem.category === "Energy")) {
                  return `$${Number(val).toLocaleString()}`;
                }
                return Number(val).toFixed(selectedItem.pipDigits);
              })()}
            </span>
          </span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 shrink-0">
            {selectedItem.category}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors">
          <Search size={14} />
          <ChevronDown size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Popover Dropdown Menu */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 p-3.5 rounded-3xl bg-white dark:bg-[#0A1526] border border-slate-200 dark:border-white/15 shadow-2xl space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
          
          {/* Search Box */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol or market (e.g. Gold, XAU, US30, EUR)..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1c9bda]/40 placeholder:text-slate-400"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[10px] font-bold">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer border ${
                  category === cat
                    ? "bg-[#1c9bda] text-white border-[#1c9bda] shadow-xs"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-transparent hover:border-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Results List */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
            {filtered.length > 0 ? (
              filtered.map((item) => {
                const isSelected = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full p-2.5 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between gap-3 border ${
                      isSelected
                        ? "bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-300 font-bold"
                        : "bg-transparent border-transparent hover:bg-slate-100/80 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                          {item.symbol}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 block">
                          {(() => {
                            const val = (liveRates && liveRates[item.symbol]) || item.defaultPrice;
                            if (item.quoteCurrency === "USD" && (item.category === "Metals" || item.category === "Crypto" || item.category === "Indices" || item.category === "Energy")) {
                              return `$${Number(val).toLocaleString()}`;
                            }
                            return Number(val).toFixed(item.pipDigits);
                          })()}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 block">
                          {liveRates && liveRates[item.symbol] ? "Live Spot" : "Market Rate"}
                        </span>
                      </div>
                      {isSelected && <Check size={14} className="text-teal-500 shrink-0" />}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                No matching instruments found for "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const BALANCE_PRESETS = [
  { label: "$5,000", val: 5000 },
  { label: "$10,000", val: 10000 },
  { label: "$25,000", val: 25000 },
  { label: "$50,000", val: 50000 },
  { label: "$100,000", val: 100000 },
  { label: "$200,000", val: 200000 }
];

const LOT_QUICK_PRESETS = [0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 50.0];

export default function ForexCalculatorTab({ dark, onNavigateJournal }) {
  // Active Tab: "profit" (Institutional P/L) | "position_size" (Capital Guard)
  const [activeTab, setActiveTab] = useState("profit");

  // Live Exchange Rates state
  const [liveRates, setLiveRates] = useState({});

  // Shared Instrument
  const [selectedInstId, setSelectedInstId] = useState("EURUSD");
  const inst = useMemo(
    () => INSTRUMENTS.find((i) => i.id === selectedInstId) || INSTRUMENTS[0],
    [selectedInstId]
  );

  // -------------------------------------------------------------
  // TAB 1: PROFIT / LOSS CALCULATOR
  // -------------------------------------------------------------
  const [profitDirection, setProfitDirection] = useState("BUY");
  const [profitLots, setProfitLots] = useState("1.0");
  const [openPrice, setOpenPrice] = useState(String(inst.defaultPrice));
  const [closePrice, setClosePrice] = useState(
    String(Number((inst.defaultPrice + inst.pipStep * 50).toFixed(inst.pipDigits)))
  );

  // Fetch real live prices on load and sync every 25 seconds
  useEffect(() => {
    let isMounted = true;

    fetchLiveForexRates().then((rates) => {
      if (!isMounted || !rates) return;
      setLiveRates(rates);
      const liveP = rates[inst.symbol];
      if (liveP) {
        setOpenPrice(String(liveP));
        if (profitDirection === "BUY") {
          setClosePrice(String(Number((liveP + inst.pipStep * 50).toFixed(inst.pipDigits))));
        } else {
          setClosePrice(String(Number((liveP - inst.pipStep * 50).toFixed(inst.pipDigits))));
        }
      }
    });

    const timer = setInterval(() => {
      fetchLiveForexRates().then((rates) => {
        if (isMounted && rates) setLiveRates(rates);
      });
    }, 25000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  // When instrument changes in Profit Calculator, auto-fill live defaults
  const handleSelectProfitInst = (newId) => {
    setSelectedInstId(newId);
    const newInst = INSTRUMENTS.find((i) => i.id === newId) || INSTRUMENTS[0];
    const baseP = liveRates[newInst.symbol] || newInst.defaultPrice;
    setOpenPrice(String(baseP));
    if (profitDirection === "BUY") {
      setClosePrice(String(Number((baseP + newInst.pipStep * 50).toFixed(newInst.pipDigits))));
    } else {
      setClosePrice(String(Number((baseP - newInst.pipStep * 50).toFixed(newInst.pipDigits))));
    }
  };

  // Flip direction in profit calculator
  const handleToggleProfitDirection = (dir) => {
    if (dir === profitDirection) return;
    setProfitDirection(dir);
    const op = parseFloat(openPrice) || inst.defaultPrice;
    const cp = parseFloat(closePrice) || inst.defaultPrice;
    const diff = Math.abs(cp - op);
    if (dir === "BUY") {
      setClosePrice(String(Number((op + diff).toFixed(inst.pipDigits))));
    } else {
      setClosePrice(String(Number((op - diff).toFixed(inst.pipDigits))));
    }
  };

  // Institutional Standard Profit Formula:
  // For BUY: (Close - Open) * Volume * ContractSize
  // For SELL: (Open - Close) * Volume * ContractSize
  const profitResults = useMemo(() => {
    const isBuy = profitDirection === "BUY";
    const op = parseFloat(openPrice) || inst.defaultPrice;
    const cp = parseFloat(closePrice) || inst.defaultPrice;
    const lots = Math.max(0.001, parseFloat(profitLots) || 0);
    const priceDiff = isBuy ? cp - op : op - cp;

    // Currency conversions for cross pairs
    let quoteToUsdRate = 1.0;
    if (inst.quoteCurrency === "JPY") quoteToUsdRate = 1 / 154.62;
    else if (inst.quoteCurrency === "CHF") quoteToUsdRate = 1 / 0.8845;
    else if (inst.quoteCurrency === "CAD") quoteToUsdRate = 1 / 1.3980;
    else if (inst.quoteCurrency === "GBP") quoteToUsdRate = 1.2685;
    else if (inst.quoteCurrency === "INR") quoteToUsdRate = 1 / 84.42;
    else if (inst.quoteCurrency === "AED") quoteToUsdRate = 1 / 3.6725;

    // Gross Profit in Quote Currency -> USD
    const grossProfitUsd = priceDiff * lots * inst.contractSize * quoteToUsdRate;

    // Pips movement
    const pipsMoved = priceDiff / inst.pipStep;

    // Pip Value for this lot size in USD
    const pipValueUsd = inst.pipStep * lots * inst.contractSize * quoteToUsdRate;

    // Required Margin at standard 1:100 leverage
    const notionalValueUsd = op * lots * inst.contractSize * quoteToUsdRate;
    const marginRequired100 = notionalValueUsd / 100;

    return {
      grossProfitUsd: grossProfitUsd.toFixed(2),
      isProfit: grossProfitUsd >= 0,
      pipsMoved: (Math.round(pipsMoved * 10) / 10).toFixed(1),
      pipValueUsd: pipValueUsd.toFixed(2),
      marginRequired100: marginRequired100.toFixed(2),
      pointDiff: Math.abs(priceDiff).toFixed(inst.pipDigits),
      calculatedLots: lots
    };
  }, [profitDirection, closePrice, openPrice, profitLots, inst]);

  // -------------------------------------------------------------
  // TAB 2: POSITION SIZING & LOT CALCULATOR (Capital Guard)
  // -------------------------------------------------------------
  const [posBalance, setPosBalance] = useState("50000");
  const [posRiskPercent, setPosRiskPercent] = useState(1.0);
  const [posStopLossPips, setPosStopLossPips] = useState("25");
  const [posTargetPips, setPosTargetPips] = useState("50");

  const positionSizingResults = useMemo(() => {
    let quoteToUsdRate = 1.0;
    if (inst.quoteCurrency === "JPY") quoteToUsdRate = 1 / 154.62;
    else if (inst.quoteCurrency === "CHF") quoteToUsdRate = 1 / 0.8845;
    else if (inst.quoteCurrency === "CAD") quoteToUsdRate = 1 / 1.3980;
    else if (inst.quoteCurrency === "GBP") quoteToUsdRate = 1.2685;
    else if (inst.quoteCurrency === "INR") quoteToUsdRate = 1 / 84.42;
    else if (inst.quoteCurrency === "AED") quoteToUsdRate = 1 / 3.6725;

    const balance = parseFloat(posBalance) || 0;
    const slPips = parseFloat(posStopLossPips) || 0;
    const tpPips = parseFloat(posTargetPips) || 0;

    // Pip value per 1.0 standard lot in USD
    const pipValue1Lot = inst.pipStep * inst.contractSize * quoteToUsdRate;

    // Maximum allowed dollar loss based on risk %
    const maxDollarRisk = balance * (posRiskPercent / 100);

    // Exact Lot Size = Dollar Risk / (StopLossPips * PipValuePerLot)
    const exactLots = slPips > 0 ? maxDollarRisk / (slPips * pipValue1Lot) : 0;
    const roundedLots = Math.max(0.01, Math.round(exactLots * 100) / 100);

    // Projected Profit at Target Pips
    const projectedProfitUsd = roundedLots * tpPips * pipValue1Lot;
    const plannedLossUsd = roundedLots * slPips * pipValue1Lot;

    // Risk to Reward
    const rrRatio = slPips > 0 ? tpPips / slPips : 0;

    // Prop firm drawdown limiters
    const dailyDrawdownFloor = balance * 0.05; // 5% daily limit
    const isExceedingDailyDrawdown = plannedLossUsd > dailyDrawdownFloor;

    return {
      maxDollarRisk: maxDollarRisk.toFixed(2),
      recommendedLots: roundedLots.toFixed(2),
      pipValueForPosition: (roundedLots * pipValue1Lot).toFixed(2),
      projectedProfitUsd: projectedProfitUsd.toFixed(2),
      plannedLossUsd: plannedLossUsd.toFixed(2),
      rrRatio: rrRatio.toFixed(2),
      dailyDrawdownFloor: dailyDrawdownFloor.toFixed(0),
      isExceedingDailyDrawdown,
      parsedBalance: balance
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
                Institutional Precision Engine
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
      {/* MODE 1: INSTITUTIONAL PROFIT CALCULATOR (Simple, Intuitive, Fast)          */}
      {/* ========================================================================= */}
      {activeTab === "profit" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
          
          {/* LEFT: Input Form (Pair, Volume, Direction, Open, Close) */}
          <div className="lg:col-span-7 p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Trade Parameters</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-teal-600 dark:text-teal-400">
                Institutional Standard Formula
              </span>
            </div>

            {/* 1. Asset & Direction */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8">
                <SearchableInstrumentSelector
                  selectedId={selectedInstId}
                  onSelect={handleSelectProfitInst}
                  label="Trading Asset / Instrument"
                  liveRates={liveRates}
                />
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

              {/* TradingView Live Quote Link */}
              <div className="sm:col-span-12 flex items-center justify-between text-[11px] px-1">
                <span className="text-slate-500 dark:text-slate-400 font-mono">
                  Live Rate: <strong className="text-emerald-600 dark:text-emerald-400">{(liveRates && liveRates[inst.symbol]) || inst.defaultPrice}</strong>
                </span>
                <a
                  href={`https://www.tradingview.com/symbols/${inst.tvSymbol || inst.id}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1c9bda] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                  title={`Check live real-time rate for ${inst.symbol} on TradingView`}
                >
                  <span>View {inst.symbol} Live on TradingView</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>

            {/* 2. Volume in Lots */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Volume (Lots)
                </label>
                <span className="text-xs font-mono font-black text-teal-600 dark:text-teal-400">
                  {profitResults.calculatedLots} Standard Lot{profitResults.calculatedLots !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Quick Lot Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {LOT_QUICK_PRESETS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setProfitLots(String(l))}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                      parseFloat(profitLots) === l
                        ? "bg-teal-500 text-white border-teal-500 shadow-sm"
                        : "bg-slate-50 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {/* Stepper + Direct Numeric Input */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const current = parseFloat(profitLots) || 0.01;
                    const step = current >= 10 ? 5 : current >= 1 ? 1 : 0.05;
                    const next = Math.max(0.01, Number((current - step).toFixed(2)));
                    setProfitLots(String(next));
                  }}
                  className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-white font-black text-xl flex items-center justify-center border border-slate-200/80 dark:border-white/10 cursor-pointer select-none active:scale-95 transition-all shrink-0 shadow-xs"
                  title="Decrease lots"
                >
                  −
                </button>

                <div className="relative flex-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={profitLots}
                    onChange={(e) => {
                      const val = e.target.value.replace(/,/g, ".");
                      if (val === "" || /^\d*\.?\d*$/.test(val)) {
                        setProfitLots(val);
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => {
                      if (!profitLots || parseFloat(profitLots) <= 0) {
                        setProfitLots("0.01");
                      }
                    }}
                    placeholder="Enter lots (e.g. 20)..."
                    className="w-full h-12 px-4 rounded-2xl bg-slate-50 dark:bg-[#071324] border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white font-mono text-base font-black text-center focus:outline-none focus:ring-2 focus:ring-teal-500/40 shadow-inner"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 pointer-events-none hidden sm:inline">
                    LOTS
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const current = parseFloat(profitLots) || 0.01;
                    const step = current >= 10 ? 5 : current >= 1 ? 1 : 0.05;
                    const next = Number((current + step).toFixed(2));
                    setProfitLots(String(next));
                  }}
                  className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-white font-black text-xl flex items-center justify-center border border-slate-200/80 dark:border-white/10 cursor-pointer select-none active:scale-95 transition-all shrink-0 shadow-xs"
                  title="Increase lots"
                >
                  +
                </button>
              </div>
            </div>

            {/* 3. Open Price & Close Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Open Price (Entry)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const lp = (liveRates && liveRates[inst.symbol]) || inst.defaultPrice;
                        setOpenPrice(String(lp));
                        if (profitDirection === "BUY") {
                          setClosePrice(String(Number((lp + inst.pipStep * 50).toFixed(inst.pipDigits))));
                        } else {
                          setClosePrice(String(Number((lp - inst.pipStep * 50).toFixed(inst.pipDigits))));
                        }
                      }}
                      className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      title="Click to apply live real-time rate"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live Sync: {(liveRates && liveRates[inst.symbol]) || inst.defaultPrice}</span>
                    </button>
                    <a
                      href={`https://www.tradingview.com/symbols/${inst.tvSymbol || inst.id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-[#1c9bda] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      title={`Check live market price on TradingView for ${inst.symbol}`}
                    >
                      <span>TradingView</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={openPrice}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value.replace(/,/g, ".");
                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                      setOpenPrice(val);
                    }
                  }}
                  onBlur={() => {
                    if (!openPrice || parseFloat(openPrice) <= 0) {
                      setOpenPrice(String(inst.defaultPrice));
                    }
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#071324] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                />
                <span className="text-[10px] text-slate-400 font-mono block">
                  Current Market Rate: {(liveRates && liveRates[inst.symbol]) || inst.defaultPrice}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Close Price (Exit)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={closePrice}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value.replace(/,/g, ".");
                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                      setClosePrice(val);
                    }
                  }}
                  onBlur={() => {
                    if (!closePrice || parseFloat(closePrice) <= 0) {
                      setClosePrice(String(inst.currentPrice));
                    }
                  }}
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
                      const base = parseFloat(openPrice) || inst.currentPrice;
                      setClosePrice(
                        String(Number((profitDirection === "BUY" ? base + move : base - move).toFixed(inst.pipDigits)))
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

          {/* RIGHT: Live Profit Results */}
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
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-white/10 text-white border border-white/10">
                  {profitDirection} • {inst.symbol}
                </span>
              </div>

              {/* Main Net Profit Number */}
              <div className="py-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    Net Profit / Loss
                  </span>
                  {profitResults.isProfit ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Profitable Trade
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Loss Scenario
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                    profitResults.isProfit ? "text-emerald-400 drop-shadow-[0_2px_10px_rgba(52,211,153,0.3)]" : "text-rose-400 drop-shadow-[0_2px_10px_rgba(251,113,133,0.3)]"
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
                <span>How Profit is Calculated:</span>
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
                  ${positionSizingResults.parsedBalance.toLocaleString()} USD
                </span>
              </div>

              {/* Presets */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {BALANCE_PRESETS.map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setPosBalance(String(p.val))}
                    className={`py-2 px-1 rounded-xl text-[11px] font-mono font-bold transition-all text-center cursor-pointer border ${
                      parseFloat(posBalance) === p.val
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
                  type="text"
                  inputMode="numeric"
                  value={posBalance}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d*$/.test(val)) setPosBalance(val);
                  }}
                  onBlur={() => {
                    if (!posBalance || parseFloat(posBalance) <= 0) setPosBalance("10000");
                  }}
                  className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#071324] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  placeholder="Enter custom account balance..."
                />
              </div>
            </div>

            {/* 2. Risk Percentage & Asset */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-7">
                <SearchableInstrumentSelector
                  selectedId={selectedInstId}
                  onSelect={setSelectedInstId}
                  label="Trading Asset / Instrument"
                  liveRates={liveRates}
                />
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

              {/* TradingView Live Quote Link */}
              <div className="sm:col-span-12 flex items-center justify-between text-[11px] px-1">
                <span className="text-slate-500 dark:text-slate-400 font-mono">
                  Live Rate: <strong className="text-emerald-600 dark:text-emerald-400">{(liveRates && liveRates[inst.symbol]) || inst.defaultPrice}</strong>
                </span>
                <a
                  href={`https://www.tradingview.com/symbols/${inst.tvSymbol || inst.id}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1c9bda] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                  title={`Check live real-time rate for ${inst.symbol} on TradingView`}
                >
                  <span>View {inst.symbol} Live on TradingView</span>
                  <ExternalLink size={11} />
                </a>
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
                  type="text"
                  inputMode="decimal"
                  value={posStopLossPips}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d*\.?\d*$/.test(val)) setPosStopLossPips(val);
                  }}
                  onBlur={() => {
                    if (!posStopLossPips || parseFloat(posStopLossPips) <= 0) setPosStopLossPips("25");
                  }}
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
                  type="text"
                  inputMode="decimal"
                  value={posTargetPips}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d*\.?\d*$/.test(val)) setPosTargetPips(val);
                  }}
                  onBlur={() => {
                    if (!posTargetPips || parseFloat(posTargetPips) <= 0) setPosTargetPips("50");
                  }}
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
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-white/10 text-white border border-white/10">
                  {inst.symbol}
                </span>
              </div>

              {/* Exact Lots Output Hero */}
              <div className="py-2 space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Enter This Exact Lot Size:
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-[#38bdf8] drop-shadow-[0_2px_10px_rgba(56,189,248,0.3)]">
                    {positionSizingResults.recommendedLots}
                  </span>
                  <span className="text-base font-bold text-slate-300 font-mono">Lots</span>
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
