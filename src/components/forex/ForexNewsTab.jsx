import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar, Clock, Filter, Search, AlertCircle, RefreshCw,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Globe,
  ShieldAlert, Activity, ChevronDown, ChevronUp, CheckCircle, Info
} from "lucide-react";

// Currency metadata with flags & labels
const CURRENCIES = {
  ALL: { code: "ALL", label: "All Currencies", flag: "🌐" },
  USD: { code: "USD", label: "US Dollar", flag: "🇺🇸" },
  EUR: { code: "EUR", label: "Euro", flag: "🇪🇺" },
  GBP: { code: "GBP", label: "British Pound", flag: "🇬🇧" },
  JPY: { code: "JPY", label: "Japanese Yen", flag: "🇯🇵" },
  CAD: { code: "CAD", label: "Canadian Dollar", flag: "🇨🇦" },
  AUD: { code: "AUD", label: "Australian Dollar", flag: "🇦🇺" },
  NZD: { code: "NZD", label: "New Zealand Dollar", flag: "🇳🇿" },
  CHF: { code: "CHF", label: "Swiss Franc", flag: "🇨🇭" },
  CNY: { code: "CNY", label: "Chinese Yuan", flag: "🇨🇳" }
};

const IMPACT_COLORS = {
  High: {
    badge: "bg-rose-500/15 text-rose-500 border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-400",
    dot: "bg-rose-500",
    label: "High Impact",
    desc: "Major market mover (CPI, Rates, NFP)"
  },
  Medium: {
    badge: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400",
    dot: "bg-amber-500",
    label: "Medium Impact",
    desc: "Moderate volatility expected"
  },
  Low: {
    badge: "bg-slate-400/15 text-slate-600 border-slate-400/30 dark:bg-slate-500/20 dark:text-slate-400",
    dot: "bg-slate-400",
    label: "Low Impact",
    desc: "Minor statistical releases"
  }
};

export default function ForexNewsTab({ dark }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState("ALL");
  const [selectedImpact, setSelectedImpact] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [activeDateFilter, setActiveDateFilter] = useState("TODAY"); // Defaults to TODAY per user requirement

  // Fetch Forex Factory Calendar Data
  const loadData = async () => {
    setLoading(true);
    try {
      // First try live official endpoint if accessible, fallback to local cached JSON
      let res;
      try {
        res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", { cache: "no-store" });
        if (!res.ok) throw new Error("Remote failed");
      } catch (e) {
        res = await fetch("/forex-news.json");
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setEvents(data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error("Failed to load Forex Factory calendar:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Summary Statistics
  const stats = useMemo(() => {
    const total = events.length;
    const high = events.filter((e) => e.impact === "High").length;
    const medium = events.filter((e) => e.impact === "Medium").length;
    const low = events.filter((e) => e.impact === "Low").length;

    return { total, high, medium, low };
  }, [events]);

  // Helper date matchers
  const isEventToday = (evDateStr) => {
    if (!evDateStr) return false;
    const now = new Date();
    const evDate = new Date(evDateStr);
    return evDate.toDateString() === now.toDateString() ||
      evDateStr.startsWith(now.toISOString().split("T")[0]);
  };

  const isEventUpcoming = (evDateStr) => {
    if (!evDateStr) return false;
    return new Date(evDateStr) >= new Date();
  };

  // Base events matching selected impact and search query
  const baseEvents = useMemo(() => {
    return events.filter((ev) => {
      // Impact filter
      if (selectedImpact !== "ALL" && ev.impact !== selectedImpact) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = ev.title?.toLowerCase().includes(q);
        const matchCur = ev.country?.toLowerCase().includes(q);
        if (!matchTitle && !matchCur) return false;
      }

      return true;
    });
  }, [events, selectedImpact, searchQuery]);

  // Events matching the active Date filter
  const dateFilteredEvents = useMemo(() => {
    if (activeDateFilter === "TODAY") {
      return baseEvents.filter(ev => isEventToday(ev.date));
    }
    if (activeDateFilter === "UPCOMING") {
      return baseEvents.filter(ev => isEventUpcoming(ev.date));
    }
    return baseEvents;
  }, [baseEvents, activeDateFilter]);

  // Dynamic currency counts based on active date filter so counts match the current view exactly
  const currencyCounts = useMemo(() => {
    const byCur = { ALL: dateFilteredEvents.length };
    dateFilteredEvents.forEach((e) => {
      byCur[e.country] = (byCur[e.country] || 0) + 1;
    });
    return byCur;
  }, [dateFilteredEvents]);

  // Events for selected currency
  const currencyFilteredEvents = useMemo(() => {
    if (selectedCurrency === "ALL") return baseEvents;
    return baseEvents.filter((ev) => ev.country === selectedCurrency);
  }, [baseEvents, selectedCurrency]);

  // Dynamic date counts matching the currently selected currency
  const dateCounts = useMemo(() => {
    const today = currencyFilteredEvents.filter(ev => isEventToday(ev.date)).length;
    const upcoming = currencyFilteredEvents.filter(ev => isEventUpcoming(ev.date)).length;
    const all = currencyFilteredEvents.length;

    return { today, upcoming, all };
  }, [currencyFilteredEvents]);

  // Final Filtered & Sorted Events (Currency + Date + Impact + Search combined)
  const filteredEvents = useMemo(() => {
    if (selectedCurrency === "ALL") return dateFilteredEvents;
    return dateFilteredEvents.filter(ev => ev.country === selectedCurrency);
  }, [dateFilteredEvents, selectedCurrency]);

  // Format Helper
  const formatEventDate = (isoStr) => {
    if (!isoStr) return { dateStr: "-", timeStr: "-" };
    try {
      const d = new Date(isoStr);
      const dateStr = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric"
      });
      const timeStr = d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
      return { dateStr, timeStr };
    } catch {
      return { dateStr: isoStr, timeStr: "" };
    }
  };

  const getRelativeStatus = (isoStr) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      const diffMs = d - new Date();
      const diffMin = Math.round(diffMs / 60000);

      if (diffMin < -120) return "Released";
      if (diffMin < 0) return "Just Released";
      if (diffMin < 60) return `In ${diffMin}m`;
      const diffHours = Math.round(diffMin / 60);
      if (diffHours < 24) return `In ${diffHours}h`;
      return `In ${Math.round(diffHours / 24)}d`;
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              Live Feed
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Real-Time Central Bank &amp; Macro Intelligence
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Institutional Macro Calendar &amp; Volatility Radar
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Monitor real-time economic data releases, interest rate decisions, CPI prints, and central bank commentary across all major G10 currencies to manage trading risk before high-impact events.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/80 dark:border-white/10 transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#1c9bda]" : ""}`} />
            <span>{loading ? "Refreshing..." : "Refresh Calendar"}</span>
          </button>
        </div>
      </div>

      {/* KPI Impact Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Releases
            </span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {stats.total}
          </p>
          <span className="text-[10px] text-slate-400">This week's calendar</span>
        </div>

        <div
          onClick={() => setSelectedImpact(selectedImpact === "High" ? "ALL" : "High")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedImpact === "High"
            ? "bg-rose-500/10 border-rose-500/50 shadow-md shadow-rose-500/10"
            : "bg-white dark:bg-[#0B1528] border-slate-200/80 dark:border-white/10 hover:border-rose-400/40"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              High Impact
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
            {stats.high}
          </p>
          <span className="text-[10px] text-slate-400">Extreme volatility events</span>
        </div>

        <div
          onClick={() => setSelectedImpact(selectedImpact === "Medium" ? "ALL" : "Medium")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedImpact === "Medium"
            ? "bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10"
            : "bg-white dark:bg-[#0B1528] border-slate-200/80 dark:border-white/10 hover:border-amber-400/40"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Medium Impact
            </span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            {stats.medium}
          </p>
          <span className="text-[10px] text-slate-400">Moderate swings expected</span>
        </div>

        <div
          onClick={() => setSelectedImpact(selectedImpact === "Low" ? "ALL" : "Low")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedImpact === "Low"
            ? "bg-slate-500/10 border-slate-400/50 shadow-md"
            : "bg-white dark:bg-[#0B1528] border-slate-200/80 dark:border-white/10 hover:border-slate-400/40"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Low Impact
            </span>
            <Info className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black font-mono text-slate-700 dark:text-slate-300 mt-1">
            {stats.low}
          </p>
          <span className="text-[10px] text-slate-400">Routine statistics</span>
        </div>
      </div>

      {/* Currency Selector Pills */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            Filter by Currency
          </span>
          <span className="text-[11px] text-slate-400 font-semibold">
            {activeDateFilter === "TODAY" ? "Today's releases by currency" : activeDateFilter === "UPCOMING" ? "Upcoming releases by currency" : "Weekly releases by currency"}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {Object.entries(CURRENCIES).map(([code, cur]) => {
            const count = currencyCounts[code] || 0;
            const isSelected = selectedCurrency === code;
            return (
              <button
                key={code}
                onClick={() => setSelectedCurrency(code)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer border ${isSelected
                  ? "bg-[#1c9bda] text-white border-[#1c9bda] shadow-md shadow-[#1c9bda]/20"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/5"
                  }`}
              >
                <span>{cur.flag}</span>
                <span>{code}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                    }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events (e.g. CPI, Powell, PMI, NFP)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1c9bda] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {[
            { id: "TODAY", label: "Today", count: dateCounts.today },
            { id: "UPCOMING", label: "Upcoming", count: dateCounts.upcoming },
            { id: "ALL", label: "All Week", count: dateCounts.all }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveDateFilter(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${activeDateFilter === t.id
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm"
                : "bg-white dark:bg-[#0B1528] text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                }`}
            >
              <span>{t.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeDateFilter === t.id
                  ? "bg-white/20 text-white dark:bg-black/20 dark:text-slate-900 font-bold"
                  : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                  }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Economic Calendar Event List / Table */}
      <div className="rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-[#1c9bda]" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
              Economic Calendar Releases ({filteredEvents.length})
            </span>
          </div>
          {lastRefreshed && (
            <span className="text-[11px] text-slate-400">
              Synced: {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 text-[#1c9bda] animate-spin" />
            <p className="text-xs font-semibold text-slate-400">Fetching macro economic calendar data...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No events found matching filters</p>
            <p className="text-xs text-slate-400">Try clearing your search query or selecting "All Currencies".</p>
            <button
              onClick={() => {
                setSelectedCurrency("ALL");
                setSelectedImpact("ALL");
                setSearchQuery("");
                setActiveDateFilter("ALL");
              }}
              className="mt-3 px-4 py-2 rounded-xl bg-[#1c9bda] text-white text-xs font-bold cursor-pointer hover:brightness-110"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {filteredEvents.map((ev, idx) => {
              const { dateStr, timeStr } = formatEventDate(ev.date);
              const relStatus = getRelativeStatus(ev.date);
              const isExpanded = expandedId === idx;
              const impactCfg = IMPACT_COLORS[ev.impact] || IMPACT_COLORS.Low;
              const curCfg = CURRENCIES[ev.country] || { flag: "🌐", label: ev.country };

              return (
                <div
                  key={idx}
                  className={`p-4 md:p-5 transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.02] ${ev.impact === "High" ? "border-l-4 border-l-rose-500" : ""
                    }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left: Time & Currency */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-20 shrink-0 text-left">
                        <p className="text-xs font-black font-mono text-slate-900 dark:text-white">
                          {timeStr}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400">
                          {dateStr}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                        <span className="text-base">{curCfg.flag}</span>
                        <span className="text-xs font-black font-mono text-slate-900 dark:text-white">
                          {ev.country}
                        </span>
                      </div>

                      {/* Impact Pill */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${impactCfg.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${impactCfg.dot}`} />
                        {ev.impact}
                      </span>
                    </div>

                    {/* Middle: Event Title */}
                    <div className="flex-1 md:px-4">
                      <p className="text-xs md:text-sm font-bold text-slate-850 dark:text-white">
                        {ev.title}
                      </p>
                      {relStatus && (
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          {relStatus}
                        </span>
                      )}
                    </div>

                    {/* Right: Actual vs Forecast vs Previous */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="grid grid-cols-2 gap-3 text-right">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Forecast</p>
                          <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                            {ev.forecast || "--"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Previous</p>
                          <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                            {ev.previous || "--"}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Indicator Intel Details */}
                  {isExpanded && (
                    <div className="mt-3.5 pt-3.5 border-t border-slate-100 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300 grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50/50 dark:bg-white/[0.01] p-3 rounded-xl">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Currency Pair Exposure</span>
                        <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                          {ev.country === "USD"
                            ? "EUR/USD, GBP/USD, USD/JPY, USD/CAD"
                            : ev.country === "EUR"
                              ? "EUR/USD, EUR/GBP, EUR/JPY"
                              : ev.country === "GBP"
                                ? "GBP/USD, EUR/GBP, GBP/JPY"
                                : ev.country === "JPY"
                                  ? "USD/JPY, EUR/JPY, GBP/JPY"
                                  : `${ev.country}/USD, EUR/${ev.country}`}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Macro Definition</span>
                        <p className="font-medium mt-0.5">
                          {ev.title} measures changes in underlying economic conditions and guides central bank rate expectations.
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Trading Guidance</span>
                        <p className="font-medium text-amber-600 dark:text-amber-400 mt-0.5">
                          {ev.impact === "High"
                            ? "Expect wide spreads and slippage during release. Consider reducing position size or waiting 15m post-data."
                            : "Standard volatility expected. Respect established technical levels."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
