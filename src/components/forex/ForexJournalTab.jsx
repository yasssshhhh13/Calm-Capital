import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  TrendingUp, TrendingDown, PlusCircle, Trash2, Edit2, Download,
  Upload, Search, Filter, CheckCircle2, XCircle, Clock, AlertTriangle,
  ArrowUpRight, ArrowDownRight, DollarSign, BarChart2, PieChart,
  ShieldCheck, Award, Calendar as CalendarIcon, FileText, ChevronRight,
  Check, X, Zap, Target, Flame, Brain, Shield, Lock, ChevronLeft, Cloud, RefreshCw
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, AreaChart, Area
} from "recharts";
import PropFirmRiskCalculator from "./PropFirmRiskCalculator";
import { useAuth } from "../../auth.jsx";
import {
  saveUserForexJournal,
  loadUserForexJournal,
  subscribeUserForexJournal
} from "../../firebase.js";
import { fetchLiveForexRates } from "../../services/forexLiveRates.js";

const LOCAL_STORAGE_KEY = "calm_capital_forex_journal_v4";

// Clean default user customizable trading account
const DEFAULT_USER_ACCOUNTS = [
  { id: "REAL_MAIN", name: "Personal Real Account", startingBalance: 2500, type: "Real / Live" }
];

// Automatically wipe all legacy dummy trades and old sample accounts from localStorage on load
function purgeLegacyDummyTrades() {
  try {
    const dummyIds = new Set(["trade-1", "trade-2", "trade-3", "trade-4", "trade-5"]);
    const dummyPropIds = new Set(["FUNDED_5K", "FUNDED_10K", "FUNDED_25K", "FUNDED_50K", "FUNDED_100K", "FUNDED_200K"]);

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;

      if (k.includes("forex_trades") || k.includes("forex_journal")) {
        try {
          const raw = JSON.parse(localStorage.getItem(k));
          if (Array.isArray(raw)) {
            const cleaned = raw.filter(t => t && t.id && !dummyIds.has(t.id));
            localStorage.setItem(k, JSON.stringify(cleaned));
          }
        } catch {}
      }

      if (k.includes("forex_accounts")) {
        try {
          const raw = JSON.parse(localStorage.getItem(k));
          if (Array.isArray(raw)) {
            const cleaned = raw.filter(a => a && a.id && !dummyPropIds.has(a.id));
            localStorage.setItem(k, JSON.stringify(cleaned.length > 0 ? cleaned : DEFAULT_USER_ACCOUNTS));
          }
        } catch {}
      }
    }
  } catch {}
}

purgeLegacyDummyTrades();

// Ensure no dummy trades or auto numbers from old sample presets ever leak into the journal
function sanitizeLoadedTrades(raw) {
  if (!Array.isArray(raw)) return [];
  const dummyIds = new Set(["trade-1", "trade-2", "trade-3", "trade-4", "trade-5"]);
  return raw.filter((t) => t && t.id && !dummyIds.has(t.id));
}

// Ensure no dummy tiers from old prop presets leak into the user's real account list
function sanitizeLoadedAccounts(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_USER_ACCOUNTS;
  const dummyPropIds = new Set(["FUNDED_5K", "FUNDED_10K", "FUNDED_25K", "FUNDED_50K", "FUNDED_100K", "FUNDED_200K"]);
  const filtered = raw.filter((a) => a && a.id && !dummyPropIds.has(a.id));
  return filtered.length > 0 ? filtered : DEFAULT_USER_ACCOUNTS;
}

const MAJOR_PAIRS = [
  // G10 USD Majors
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "USD/CAD", "AUD/USD", "NZD/USD",
  // Commodities & Metals
  "XAU/USD", "XAG/USD", "WTI/USD", "BRENT/USD",
  // Emerging & Cross USD Pairs
  "USD/INR", "USD/AED", "USD/SGD", "USD/HKD", "USD/CNH", "USD/MXN", "USD/ZAR", "USD/TRY", "USD/SEK", "USD/NOK", "USD/BRL",
  // Crypto USD Majors
  "BTC/USD", "ETH/USD", "SOL/USD",
  // Cross Majors
  "EUR/JPY", "GBP/JPY", "EUR/GBP"
];

const STRATEGIES = [
  "Fair Value Gap (FVG)", "Order Block / POI", "Liquidity Sweep",
  "Break & Retest", "Silver Bullet Setup", "Breaker Block Retest",
  "Trend Continuation", "Range Expansion", "London Open Breakout"
];

const SESSIONS = ["London", "New York", "Asian", "London/NY Overlap"];

const PSYCHOLOGY_TAGS = [
  "Disciplined ✅", "Followed Rules 📜", "Calm Execution 🧘",
  "Early Exit 🏃", "FOMO Entry 😬", "Revenge Trade ⚠️", "Overleveraged 💣"
];

const DEFAULT_PRE_TRADE_RULES = [
  "Higher-Timeframe market structure & trend bias confirmed (4H / 1H)",
  "Clear Liquidity Sweep or Fair Value Gap displacement identified",
  "Strict minimum 1:2.0 Planned Risk:Reward ratio before entry",
  "Zero high-impact macroeconomic releases scheduled within next 20 minutes",
  "Emotionally grounded — zero revenge bias, adhering strictly to max lot size"
];
const PRE_TRADE_CHECKLIST_RULES = DEFAULT_PRE_TRADE_RULES;

export default function ForexJournalTab({ dark }) {
  const { user, isLoggedIn, openAuthModal, signInWithGoogle } = useAuth();
  const userGmailKey = user ? (user.email || user.uid) : null;
  const storageKey = userGmailKey ? `calm_capital_forex_trades_${userGmailKey}` : LOCAL_STORAGE_KEY;
  const accountStorageKey = userGmailKey ? `calm_capital_forex_accounts_${userGmailKey}` : "calm_capital_forex_accounts_v4";

  // Trades state: Starts completely EMPTY (0 auto numbers, 0 fake trades)
  const [trades, setTrades] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return sanitizeLoadedTrades(JSON.parse(saved));
    } catch { /* ignore */ }
    return [];
  });

  // Accounts state: Sanitized real user accounts (no hardcoded prop tiers)
  const [accounts, setAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem(accountStorageKey);
      if (saved) return sanitizeLoadedAccounts(JSON.parse(saved));
    } catch { /* ignore */ }
    return DEFAULT_USER_ACCOUNTS;
  });

  // Cloud sync status across devices ("synced" | "saving" | "offline")
  const [cloudSyncStatus, setCloudSyncStatus] = useState("synced");
  const isInitialCloudLoadDone = useRef(false);

  // 1. Initial Cloud Fetch & Real-Time Cross-Device Sync (keyed to user's Gmail)
  useEffect(() => {
    if (!userGmailKey) {
      isInitialCloudLoadDone.current = false;
      return;
    }

    let isMounted = true;
    let unsubscribe = null;

    // Load from Firebase Firestore for this Gmail
    loadUserForexJournal(userGmailKey).then((cloudData) => {
      if (!isMounted) return;
      isInitialCloudLoadDone.current = true;
      if (cloudData) {
        if (Array.isArray(cloudData.trades)) {
          const cleanTrades = sanitizeLoadedTrades(cloudData.trades);
          setTrades(cleanTrades);
          try { localStorage.setItem(storageKey, JSON.stringify(cleanTrades)); } catch {}
        }
        if (Array.isArray(cloudData.accounts) && cloudData.accounts.length > 0) {
          const cleanAccounts = sanitizeLoadedAccounts(cloudData.accounts);
          setAccounts(cleanAccounts);
          try { localStorage.setItem(accountStorageKey, JSON.stringify(cleanAccounts)); } catch {}
        }
        if (Array.isArray(cloudData.checklistRules) && cloudData.checklistRules.length > 0) {
          setChecklistRules(cloudData.checklistRules);
        }
      }
    });

    // Real-time Firestore onSnapshot for multi-device sync
    subscribeUserForexJournal(userGmailKey, (liveData) => {
      if (!isMounted || !liveData) return;
      if (Array.isArray(liveData.trades)) {
        setTrades(sanitizeLoadedTrades(liveData.trades));
      }
      if (Array.isArray(liveData.accounts) && liveData.accounts.length > 0) {
        setAccounts(sanitizeLoadedAccounts(liveData.accounts));
      }
      if (Array.isArray(liveData.checklistRules)) {
        setChecklistRules(liveData.checklistRules);
      }
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      isMounted = false;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [userGmailKey, storageKey, accountStorageKey]);

  // 2. Persist trades & accounts locally and push to Firebase Firestore across all devices
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(trades));
    } catch {}

    if (!userGmailKey) return;

    setCloudSyncStatus("saving");
    const timer = setTimeout(() => {
      saveUserForexJournal(userGmailKey, {
        email: user?.email || userGmailKey,
        trades,
        accounts,
        checklistRules
      }).then((ok) => {
        setCloudSyncStatus(ok ? "synced" : "offline");
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [trades, accounts, checklistRules, userGmailKey, storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(accountStorageKey, JSON.stringify(accounts));
    } catch {}
  }, [accounts, accountStorageKey]);

  // Account Setup & Capital Management Modal State
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accFormName, setAccFormName] = useState("");
  const [accFormBalance, setAccFormBalance] = useState("2500");
  const [accFormType, setAccFormType] = useState("Real / Live");

  const handleSaveAccount = (e) => {
    e.preventDefault();
    const bal = Math.max(1, parseFloat(accFormBalance) || 1000);
    const cleanName = accFormName.trim() || "My Trading Account";

    if (editingAccount) {
      setAccounts(prev => prev.map(a => a.id === editingAccount.id ? { ...a, name: cleanName, startingBalance: bal, type: accFormType } : a));
    } else {
      const newAcc = {
        id: "acc_" + Date.now(),
        name: cleanName,
        startingBalance: bal,
        type: accFormType
      };
      setAccounts(prev => [newAcc, ...prev]);
      setSelectedAccount(newAcc.id);
    }
    setAccountModalOpen(false);
  };

  const handleDeleteAccount = (accId) => {
    if (accounts.length <= 1) return;
    setAccounts(prev => prev.filter(a => a.id !== accId));
    if (selectedAccount === accId) setSelectedAccount("ALL");
  };

  const [selectedAccount, setSelectedAccount] = useState("ALL");
  const [activeViewMode, setActiveViewMode] = useState("TABLE"); // "TABLE" | "CALENDAR"
  const [showCalculator, setShowCalculator] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTradeId, setEditingTradeId] = useState(null);
  const [filterPair, setFilterPair] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterSession, setFilterSession] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Pre-Trade Checklist State (User Customizable with LocalStorage persistence)
  const [checklistRules, setChecklistRules] = useState(() => {
    try {
      const saved = localStorage.getItem("calmcapital_forex_checklist_rules");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return DEFAULT_PRE_TRADE_RULES;
  });
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [checklistChecks, setChecklistChecks] = useState(() => new Array(checklistRules.length).fill(true));
  const [showChecklistModal, setShowChecklistModal] = useState(false);

  // Sync checklist checks whenever rules length changes
  useEffect(() => {
    setChecklistChecks(prev => {
      const next = new Array(checklistRules.length).fill(true);
      for (let i = 0; i < checklistRules.length; i++) {
        if (prev[i] !== undefined) next[i] = prev[i];
      }
      return next;
    });
  }, [checklistRules.length]);

  const saveCustomRules = (newRules) => {
    setChecklistRules(newRules);
    try {
      localStorage.setItem("calmcapital_forex_checklist_rules", JSON.stringify(newRules));
    } catch { /* ignore */ }
  };

  const handleUpdateRule = (index, newText) => {
    const updated = [...checklistRules];
    updated[index] = newText;
    saveCustomRules(updated);
  };

  const handleAddRule = () => {
    const updated = [...checklistRules, "New custom execution rule"];
    saveCustomRules(updated);
  };

  const handleDeleteRule = (index) => {
    if (checklistRules.length <= 1) return;
    const updated = checklistRules.filter((_, i) => i !== index);
    saveCustomRules(updated);
  };

  const handleResetDefaultRules = () => {
    saveCustomRules(DEFAULT_PRE_TRADE_RULES);
  };

  // Form State
  const defaultForm = {
    account: "REAL_MAIN",
    pair: "EUR/USD",
    type: "LONG",
    date: new Date().toISOString().slice(0, 16),
    session: "London",
    strategy: "Fair Value Gap (FVG)",
    entryPrice: "",
    stopLoss: "",
    takeProfit: "",
    exitPrice: "",
    lotSize: "1.0",
    riskAmount: "",
    rewardAmount: "",
    status: "WIN",
    pnl: "",
    pips: "",
    psychology: "Disciplined ✅",
    notes: "",
    chartUrl: ""
  };
  const [form, setForm] = useState(defaultForm);
  const [journalLiveRates, setJournalLiveRates] = useState({});

  useEffect(() => {
    let isMounted = true;
    fetchLiveForexRates()
      .then((rates) => {
        if (isMounted && rates) setJournalLiveRates(rates);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync to LocalStorage (User isolated)
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(trades));
    } catch (e) {
      console.error("Failed to save trades to localStorage:", e);
    }
  }, [trades, storageKey]);

  // Account-Filtered Trades
  const accountTrades = useMemo(() => {
    if (selectedAccount === "ALL") return trades;
    return trades.filter((t) => t.account === selectedAccount || !t.account);
  }, [trades, selectedAccount]);

  // Dynamic Risk-Reward Ratio Calculation
  const computedRR = useMemo(() => {
    const entry = parseFloat(form.entryPrice);
    const sl = parseFloat(form.stopLoss);
    const tp = parseFloat(form.takeProfit);

    if (!isNaN(entry) && !isNaN(sl) && !isNaN(tp)) {
      const risk = Math.abs(entry - sl);
      const reward = Math.abs(tp - entry);
      if (risk > 0) {
        return (reward / risk).toFixed(2);
      }
    }
    return null;
  }, [form.entryPrice, form.stopLoss, form.takeProfit]);

  // Executive Journal Statistics (for active account)
  const stats = useMemo(() => {
    const closed = accountTrades.filter((t) => t.status !== "OPEN");
    const wins = accountTrades.filter((t) => t.status === "WIN");
    const losses = accountTrades.filter((t) => t.status === "LOSS");
    const breakevens = accountTrades.filter((t) => t.status === "BREAKEVEN");

    const totalPnl = accountTrades.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0);
    const totalPips = accountTrades.reduce((acc, t) => acc + (parseFloat(t.pips) || 0), 0);

    const winRate = closed.length > 0 ? ((wins.length / closed.length) * 100).toFixed(1) : 0;

    const grossProfit = wins.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0));
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? "MAX" : "0.00";

    const avgRR =
      closed.length > 0
        ? (closed.reduce((acc, t) => acc + (parseFloat(t.rrRatio) || 1), 0) / closed.length).toFixed(2)
        : "0.00";

    const avgWin = wins.length > 0 ? (grossProfit / wins.length).toFixed(0) : 0;
    const avgLoss = losses.length > 0 ? (grossLoss / losses.length).toFixed(0) : 0;

    // Check if recent trades have consecutive losses (Circuit Breaker)
    const recentTrades = [...accountTrades].slice(0, 3);
    const isTiltRisk = recentTrades.length >= 2 && recentTrades.every((t) => t.status === "LOSS");

    return {
      total: accountTrades.length,
      closedCount: closed.length,
      winCount: wins.length,
      lossCount: losses.length,
      beCount: breakevens.length,
      totalPnl,
      totalPips,
      winRate,
      profitFactor,
      avgRR,
      avgWin,
      avgLoss,
      isTiltRisk
    };
  }, [accountTrades]);

  const activeAccountObj = useMemo(() => {
    if (selectedAccount === "ALL") {
      const totalInitial = accounts.reduce((sum, a) => sum + (parseFloat(a.startingBalance) || 0), 0);
      return { id: "ALL", name: "All Accounts Portfolio", startingBalance: totalInitial, type: "Portfolio" };
    }
    return accounts.find((a) => a.id === selectedAccount) || accounts[0] || { id: "REAL_MAIN", name: "Real Live Account", startingBalance: 2500, type: "Real / Live" };
  }, [accounts, selectedAccount]);

  const liveEquity = (activeAccountObj?.startingBalance || 0) + stats.totalPnl;
  const growthRoiPct = (activeAccountObj?.startingBalance || 0) > 0
    ? ((stats.totalPnl / activeAccountObj.startingBalance) * 100).toFixed(1)
    : "0.0";

  // Equity Curve Data (Anchored to Real Deposited Capital)
  const equityCurveData = useMemo(() => {
    const baseBalance = activeAccountObj?.startingBalance || 0;
    let runningEquity = baseBalance;
    const sorted = [...accountTrades].sort((a, b) => new Date(a.date) - new Date(b.date));
    return [
      { trade: "Deposit", pnl: baseBalance, date: "" },
      ...sorted.map((t, idx) => {
        runningEquity += parseFloat(t.pnl) || 0;
        return {
          trade: `#${idx + 1} ${t.pair}`,
          pnl: runningEquity,
          date: t.date?.split("T")[0] || ""
        };
      })
    ];
  }, [accountTrades, activeAccountObj]);

  // Monthly Calendar Heatmap Grid Generation (November 2026)
  const calendarData = useMemo(() => {
    const days = [];
    for (let day = 1; day <= 30; day++) {
      const dateStr = `2026-11-${String(day).padStart(2, "0")}`;
      const dayTrades = accountTrades.filter((t) => t.date && t.date.startsWith(dateStr));
      const dayPnl = dayTrades.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0);
      days.push({
        day,
        dateStr,
        trades: dayTrades,
        count: dayTrades.length,
        pnl: dayPnl,
        status: dayTrades.length === 0 ? "NONE" : dayPnl > 0 ? "PROFIT" : dayPnl < 0 ? "LOSS" : "BREAKEVEN"
      });
    }
    return days;
  }, [accountTrades]);

  // Session Breakdown
  const sessionStats = useMemo(() => {
    return SESSIONS.map((sess) => {
      const sessTrades = accountTrades.filter((t) => t.session === sess);
      const wins = sessTrades.filter((t) => t.status === "WIN").length;
      const winRate = sessTrades.length > 0 ? Math.round((wins / sessTrades.length) * 100) : 0;
      const pnl = sessTrades.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0);
      return { session: sess, count: sessTrades.length, winRate, pnl };
    });
  }, [accountTrades]);

  // Filtered Trades for Table
  const filteredTrades = useMemo(() => {
    return accountTrades.filter((t) => {
      if (filterPair !== "ALL" && t.pair !== filterPair) return false;
      if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
      if (filterSession !== "ALL" && t.session !== filterSession) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mPair = t.pair?.toLowerCase().includes(q);
        const mStrat = t.strategy?.toLowerCase().includes(q);
        const mNotes = t.notes?.toLowerCase().includes(q);
        if (!mPair && !mStrat && !mNotes) return false;
      }
      return true;
    });
  }, [accountTrades, filterPair, filterStatus, filterSession, searchQuery]);

  // Handlers
  const handleOpenAddModal = () => {
    if (!isLoggedIn) {
      openAuthModal("signin");
      return;
    }
    setEditingTradeId(null);
    setForm({
      ...defaultForm,
      account: selectedAccount !== "ALL" ? selectedAccount : (accounts[0]?.id || "REAL_MAIN")
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (t) => {
    setEditingTradeId(t.id);
    setForm({
      account: t.account || "FUNDED_5K",
      pair: t.pair || "EUR/USD",
      type: t.type || "LONG",
      date: t.date || new Date().toISOString().slice(0, 16),
      session: t.session || "London",
      strategy: t.strategy || "Fair Value Gap (FVG)",
      entryPrice: t.entryPrice || "",
      stopLoss: t.stopLoss || "",
      takeProfit: t.takeProfit || "",
      exitPrice: t.exitPrice || "",
      lotSize: t.lotSize || "1.0",
      riskAmount: t.riskAmount || "",
      rewardAmount: t.rewardAmount || "",
      status: t.status || "WIN",
      pnl: t.pnl || "",
      pips: t.pips || "",
      psychology: t.psychology || "Disciplined ✅",
      notes: t.notes || "",
      chartUrl: t.chartUrl || ""
    });
    setModalOpen(true);
  };

  const handleSaveTrade = (e) => {
    e.preventDefault();
    const finalRR = computedRR || form.rrRatio || 2.0;

    const newTrade = {
      id: editingTradeId || `trade-${Date.now()}`,
      account: form.account,
      pair: form.pair,
      type: form.type,
      date: form.date,
      session: form.session,
      strategy: form.strategy,
      entryPrice: parseFloat(form.entryPrice) || 0,
      stopLoss: parseFloat(form.stopLoss) || 0,
      takeProfit: parseFloat(form.takeProfit) || 0,
      exitPrice: parseFloat(form.exitPrice) || 0,
      lotSize: parseFloat(form.lotSize) || 1.0,
      riskAmount: parseFloat(form.riskAmount) || 0,
      rewardAmount: parseFloat(form.rewardAmount) || 0,
      rrRatio: parseFloat(finalRR),
      status: form.status,
      pnl: parseFloat(form.pnl) || 0,
      pips: parseFloat(form.pips) || 0,
      psychology: form.psychology,
      notes: form.notes,
      chartUrl: form.chartUrl
    };

    if (editingTradeId) {
      setTrades((prev) => prev.map((t) => (t.id === editingTradeId ? newTrade : t)));
    } else {
      setTrades((prev) => [newTrade, ...prev]);
    }
    setModalOpen(false);
  };

  const handleDeleteTrade = (id) => {
    if (confirm("Delete this journal entry?")) {
      setTrades((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Account", "Date", "Pair", "Type", "Session", "Strategy", "Entry", "SL", "TP",
      "LotSize", "RR", "Status", "P&L ($)", "Pips", "Discipline", "Notes"
    ];
    const rows = accountTrades.map((t) => [
      t.account || "Default", t.date, t.pair, t.type, t.session, `"${t.strategy}"`,
      t.entryPrice, t.stopLoss, t.takeProfit, t.lotSize, t.rrRatio, t.status,
      t.pnl, t.pips, `"${t.psychology}"`, `"${(t.notes || "").replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `calm_capital_forex_journal_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">

      {/* Calm Capital Discipline Overview Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
                Institutional Journal
              </span>
              {isLoggedIn ? (
                <>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{user.name || user.email}</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center gap-1.5" title="Synced to Firebase Firestore across all devices">
                    <Cloud className="w-3 h-3 text-teal-500" />
                    <span>{cloudSyncStatus === "saving" ? "Syncing..." : "Saved to Gmail (All Devices)"}</span>
                  </span>
                </>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Sign In Required
                </span>
              )}
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Discipline-Engineered Execution
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Forex Execution &amp; Discipline Journal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Track currency setups, automatic risk-to-reward ratios, session expectancy, and emotional composure.
              Audit every trade with zero hindsight bias.
            </p>
          </div>

          {/* Action Button Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className="px-3.5 py-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-400 border border-teal-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{showCalculator ? "Hide Calculator" : "Position Sizing Engine"}</span>
            </button>

            <button
              onClick={() => setShowChecklistModal(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Brain className="w-3.5 h-3.5 text-purple-500" />
              <span>Pre-Trade Checklist</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200/80 dark:border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {trades.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Clear all trades and reset your journal to 0?")) {
                    setTrades([]);
                    try { localStorage.setItem(storageKey, JSON.stringify([])); } catch {}
                    if (userGmailKey) {
                      saveUserForexJournal(userGmailKey, {
                        email: user?.email || userGmailKey,
                        trades: [],
                        accounts,
                        checklistRules
                      });
                    }
                  }
                }}
                className="px-3 py-2.5 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Reset all trades to zero"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Trades</span>
              </button>
            )}

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-teal-400 dark:text-teal-600" />
              <span>+ Log Trade</span>
            </button>
          </div>
        </div>

        {/* AI Psychology Active Circuit Breaker Notice */}
        {stats.isTiltRisk && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs flex items-center gap-3 text-rose-600 dark:text-rose-400 animate-pulse">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="flex-1">
              <strong>Capital Preservation Alert: Consecutive Loss Pattern Detected.</strong>
              <span className="block text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                Revenge trading circuit breaker engaged. Take a 2-hour timeout before entering new setups to protect funded capital buffer.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Gated Journal Notice with 1-Click Google / Gmail Sign In */}
      {!isLoggedIn && (
        <div className="relative rounded-3xl p-6 md:p-8 overflow-hidden border border-teal-500/30 bg-gradient-to-br from-white via-slate-50 to-teal-50/20 dark:from-[#0B1528] dark:via-[#0E1A33] dark:to-[#071324] shadow-xl text-center space-y-6">
          <div className="max-w-xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-xs font-black uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5 text-teal-500" />
              <span>Private Encrypted Trading Desk</span>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Sign In to Access Your Trading Journal
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Discipline trading data is strictly private. Sign in smoothly via your Google / Gmail account to unlock your personal trade log, equity curve, multi-account allocations, and custom pre-trade rules.
            </p>
          </div>

          {/* 1-Click Google / Gmail Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <button
              type="button"
              onClick={async () => {
                try {
                  await signInWithGoogle();
                } catch {
                  openAuthModal("signin");
                }
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 dark:bg-white dark:hover:bg-slate-100 text-slate-900 font-black text-xs shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer border border-slate-200 dark:border-white/20"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google (Gmail)</span>
            </button>

            <button
              type="button"
              onClick={() => openAuthModal("signin")}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200/80 dark:border-white/10 transition-all cursor-pointer"
            >
              Sign In with Password
            </button>
          </div>

          {/* Perks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto pt-4 border-t border-slate-200/60 dark:border-white/5 text-left">
            <div className="p-3.5 rounded-xl bg-white/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
              <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Cross-Device Cloud Sync
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Saved to your Gmail and synced across all your login devices.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
              <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-purple-500" />
                Custom Discipline Rules
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Edit &amp; enforce your personal execution rules before logging.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
              <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#1c9bda]" />
                P&amp;L Calendar &amp; Curve
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Institutional win rate, risk-reward ratios, and session data.</p>
            </div>
          </div>
        </div>
      )}

      {/* Lot Size & Risk Engine Drawer */}
      {showCalculator && (
        <PropFirmRiskCalculator
          dark={dark}
          onClose={() => setShowCalculator(false)}
        />
      )}

      {/* Account Switcher Bar & Real Capital Config */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-teal-500" />
            Account:
          </span>

          <button
            type="button"
            onClick={() => setSelectedAccount("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              selectedAccount === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm"
                : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100"
            }`}
          >
            <span>All Portfolio</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 font-bold">
              {trades.length}
            </span>
          </button>

          {accounts.map((acc) => (
            <div key={acc.id} className="relative group flex items-center">
              <button
                type="button"
                onClick={() => setSelectedAccount(acc.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                  selectedAccount === acc.id
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm"
                    : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100"
                }`}
              >
                <span>{acc.name}</span>
                <span className={`text-[10px] font-mono font-black px-1.5 py-0.2 rounded-md ${
                  selectedAccount === acc.id
                    ? "bg-white/20 dark:bg-black/20 text-white dark:text-slate-900"
                    : "bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold"
                }`}>
                  ${(acc.startingBalance || 0).toLocaleString()}
                </span>
              </button>

              {/* Quick Edit Capital Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingAccount(acc);
                  setAccFormName(acc.name);
                  setAccFormBalance(String(acc.startingBalance || 0));
                  setAccFormType(acc.type || "Real / Live");
                  setAccountModalOpen(true);
                }}
                className="ml-1 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                title={`Edit Capital for ${acc.name}`}
              >
                <Edit2 size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Add Real Account Button */}
        <button
          type="button"
          onClick={() => {
            setEditingAccount(null);
            setAccFormName("My Real Live Account");
            setAccFormBalance("1500");
            setAccFormType("Real / Live");
            setAccountModalOpen(true);
          }}
          className="px-3.5 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
        >
          <PlusCircle size={14} className="text-teal-500" />
          <span>+ Add Account / Set Capital ($)</span>
        </button>
      </div>

      {/* Primary Executive KPI Ribbon (With Real Account Capital & Live Equity) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm relative group">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Initial Capital</p>
            {selectedAccount !== "ALL" && (
              <button
                type="button"
                onClick={() => {
                  setEditingAccount(activeAccountObj);
                  setAccFormName(activeAccountObj.name);
                  setAccFormBalance(String(activeAccountObj.startingBalance || 0));
                  setAccFormType(activeAccountObj.type || "Real / Live");
                  setAccountModalOpen(true);
                }}
                className="text-[10px] font-bold text-[#1c9bda] hover:underline cursor-pointer flex items-center gap-1"
                title="Edit Starting Deposit"
              >
                <Edit2 size={10} />
                <span>Edit</span>
              </button>
            )}
          </div>
          <p className="text-2xl font-black font-mono mt-1 text-slate-900 dark:text-white">
            ${(activeAccountObj.startingBalance || 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">
            {activeAccountObj.name}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1528] border border-teal-500/30 shadow-sm">
          <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-wider">Current Equity</p>
          <p className="text-2xl font-black font-mono mt-1 text-slate-900 dark:text-white">
            ${liveEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className={`text-[10px] font-mono font-bold ${stats.totalPnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {growthRoiPct >= 0 ? "+" : ""}{growthRoiPct}% Net ROI
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Net Realized P&amp;L</p>
          <p
            className={`text-2xl font-black font-mono mt-1 ${stats.totalPnl >= 0 ? "text-emerald-500" : "text-rose-500"
              }`}
          >
            {stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">
            {stats.totalPips >= 0 ? "+" : ""}{stats.totalPips} pips
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Win Rate</p>
          <p className="text-2xl font-black font-mono text-teal-600 dark:text-teal-400 mt-1">
            {stats.winRate}%
          </p>
          <span className="text-[10px] text-slate-400">
            {stats.winCount}W / {stats.lossCount}L / {stats.beCount}BE
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Trades</p>
          <p className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {stats.total}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">{stats.closedCount} Closed</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Profit Factor</p>
          <p className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {stats.profitFactor}
          </p>
          <span className="text-[10px] text-slate-400">Planned R:R 1 : {stats.avgRR}</span>
        </div>
        </div>

      </div>

      {/* Cumulative Equity Growth Chart */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-500" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Cumulative Equity Growth Curve ($)
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {accountTrades.length} Trades Executed
          </span>
        </div>

        {accountTrades.length === 0 ? (
          <div className="h-60 w-full rounded-2xl border border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-50/50 dark:bg-white/[0.01]">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                No Trades Logged Yet
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Starting Capital: <strong>${(activeAccountObj?.startingBalance || 0).toLocaleString()} USD</strong>. Your real performance curve will automatically graph here as you log executions.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border-0"
            >
              <PlusCircle className="w-3.5 h-3.5 text-teal-400 dark:text-teal-600" />
              <span>+ Log First Trade</span>
            </button>
          </div>
        ) : (
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurveData}>
                <defs>
                  <linearGradient id="calmEquityGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#ffffff10" : "#00000010"} />
                <XAxis dataKey="trade" stroke={dark ? "#64748b" : "#94a3b8"} fontSize={10} />
                <YAxis stroke={dark ? "#64748b" : "#94a3b8"} fontSize={10} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: dark ? "#0F172A" : "#FFFFFF",
                    borderColor: dark ? "#334155" : "#E2E8F0",
                    borderRadius: "12px",
                    fontSize: "12px"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pnl"
                  stroke="#14b8a6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#calmEquityGlow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Session Analytics Matrix */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {sessionStats.map((s) => (
          <div
            key={s.session}
            className="p-4 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {s.session}
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-500">
                {s.count} trades
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-lg font-black font-mono ${s.pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {s.pnl >= 0 ? "+" : ""}${s.pnl}
              </span>
              <span className="text-xs font-mono text-teal-600 dark:text-teal-400 font-bold">
                {s.winRate}% Win
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* View Switcher: Table vs Calendar Heatmap */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
          <button
            onClick={() => setActiveViewMode("TABLE")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeViewMode === "TABLE"
              ? "bg-white dark:bg-[#0B1528] text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              }`}
          >
            Detailed Trade Log
          </button>
          <button
            onClick={() => setActiveViewMode("CALENDAR")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeViewMode === "CALENDAR"
              ? "bg-white dark:bg-[#0B1528] text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              }`}
          >
            Monthly P&amp;L Calendar
          </button>
        </div>

        <span className="text-xs text-slate-400">
          Viewing: <strong className="text-slate-700 dark:text-slate-200">{accountTrades.length}</strong> entries
        </span>
      </div>

      {/* MONTHLY CALENDAR HEATMAP VIEW */}
      {activeViewMode === "CALENDAR" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-teal-500" />
              <span>November 2026 — Daily P&amp;L Grid</span>
            </h3>
            <span className="text-xs font-mono text-emerald-500 font-bold">
              Month Total: +${stats.totalPnl.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-white/5">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarData.map((d) => (
              <div
                key={d.day}
                className={`p-2.5 rounded-xl border min-h-[72px] flex flex-col justify-between transition-all ${d.status === "PROFIT"
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/10"
                  : d.status === "LOSS"
                    ? "bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 shadow-sm shadow-rose-500/10"
                    : d.status === "BREAKEVEN"
                      ? "bg-slate-500/10 border-slate-400/40 text-slate-400"
                      : "bg-slate-50/50 dark:bg-white/[0.02] border-slate-100 dark:border-white/5 text-slate-400"
                  }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>{d.day}</span>
                  {d.count > 0 && (
                    <span className="text-[9px] px-1 rounded bg-black/10 dark:bg-white/10 font-mono">
                      {d.count}t
                    </span>
                  )}
                </div>

                {d.count > 0 ? (
                  <div className="mt-1 text-right">
                    <span className="text-xs font-black font-mono block">
                      {d.pnl >= 0 ? "+" : ""}${d.pnl}
                    </span>
                    <span className="text-[9px] opacity-75 font-sans block truncate">
                      {d.trades[0]?.pair}
                    </span>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-300 dark:text-slate-600 text-center py-2">
                    —
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABLE VIEW */}
      {activeViewMode === "TABLE" && (
        <div className="space-y-4">

          {/* Filters and Search Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by pair, strategy, notes..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={filterPair}
                onChange={(e) => setFilterPair(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
              >
                <option value="ALL">All Pairs</option>
                {MAJOR_PAIRS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
              >
                <option value="ALL">All Outcomes</option>
                <option value="WIN">Wins Only</option>
                <option value="LOSS">Losses Only</option>
                <option value="BREAKEVEN">Breakeven</option>
              </select>

              <select
                value={filterSession}
                onChange={(e) => setFilterSession(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
              >
                <option value="ALL">All Sessions</option>
                {SESSIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Trade History Log Table */}
          <div className="rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Journal Entries ({filteredTrades.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Net P&amp;L:{" "}
                <strong className={stats.totalPnl >= 0 ? "text-emerald-500" : "text-rose-500"}>
                  {stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toLocaleString()}
                </strong>
              </span>
            </div>

            {filteredTrades.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {trades.length === 0 ? "No Trades Logged Yet" : "No trades matching criteria"}
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {trades.length === 0
                      ? "Your journal is completely clean with zero dummy trades. Click below to log your real trade execution."
                      : "Try clearing your search query or pair/session filters."}
                  </p>
                </div>
                <button
                  onClick={handleOpenAddModal}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold cursor-pointer transition-all hover:bg-slate-800"
                >
                  + Log Your First Trade
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse text-xs min-w-[1020px]">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] text-[10px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">
                      <th className="p-3.5 min-w-[130px]">Date &amp; Pair</th>
                      <th className="p-3.5 min-w-[155px]">Type &amp; Session</th>
                      <th className="p-3.5 min-w-[200px]">Strategy</th>
                      <th className="p-3.5 text-center min-w-[210px]">Entry / SL / TP</th>
                      <th className="p-3.5 text-center min-w-[110px]">R:R Ratio</th>
                      <th className="p-3.5 text-center min-w-[90px]">Status</th>
                      <th className="p-3.5 text-right min-w-[110px]">Net P&amp;L</th>
                      <th className="p-3.5 min-w-[140px]">Discipline</th>
                      <th className="p-3.5 text-center min-w-[80px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {filteredTrades.map((t) => {
                      const isWin = t.status === "WIN";
                      const isLoss = t.status === "LOSS";
                      const pnlNum = parseFloat(t.pnl) || 0;

                      return (
                        <tr
                          key={t.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="font-black text-slate-900 dark:text-white font-mono block">
                              {t.pair}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {t.date?.replace("T", " ")}
                            </span>
                          </td>

                          <td className="p-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono uppercase ${t.type === "LONG"
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                                  : "bg-rose-500/10 text-rose-500 border border-rose-500/30"
                                  }`}
                              >
                                {t.type}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                                {t.session}
                              </span>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[240px]">
                              {t.strategy}
                            </span>
                            {t.notes && (
                              <span className="text-[10px] text-slate-400 line-clamp-1 max-w-[240px]">
                                {t.notes}
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 whitespace-nowrap">
                            <div className="flex flex-col items-center justify-center gap-1 min-w-[190px]">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] uppercase font-black text-slate-400">Entry</span>
                                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 font-black font-mono text-slate-900 dark:text-white text-xs border border-slate-200/60 dark:border-white/10 tracking-tight">
                                  {t.entryPrice}
                                </span>
                              </div>
                              <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono">
                                <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20 whitespace-nowrap">
                                  SL: {t.stopLoss}
                                </span>
                                <span className="text-slate-300 dark:text-white/20">|</span>
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 whitespace-nowrap">
                                  TP: {t.takeProfit}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 font-mono font-black text-xs shadow-xs">
                              1 : {t.rrRatio || "—"}
                            </span>
                          </td>

                          <td className="p-3.5 text-center whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isWin
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : isLoss
                                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                  : "bg-slate-400/15 text-slate-500"
                                }`}
                            >
                              {t.status}
                            </span>
                          </td>

                          <td className="p-3.5 text-right whitespace-nowrap">
                            <span
                              className={`font-black font-mono text-sm block ${pnlNum >= 0 ? "text-emerald-500" : "text-rose-500"
                                }`}
                            >
                              {pnlNum >= 0 ? "+" : ""}${pnlNum.toLocaleString()}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block">
                              {t.pips >= 0 ? "+" : ""}{t.pips} pips
                            </span>
                          </td>

                          <td className="p-3.5 whitespace-nowrap">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                              {t.psychology}
                            </span>
                          </td>

                          <td className="p-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditModal(t)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTrade(t.id)}
                                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRE-TRADE CHECKLIST MODAL (USER CUSTOMIZABLE) */}
      {showChecklistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Brain className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {isEditingRules ? "Customize Execution Rules" : "Pre-Trade Execution Checklist"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingRules(!isEditingRules)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs border flex items-center gap-1.5 transition-all cursor-pointer ${isEditingRules
                      ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30"
                      : "bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10"
                    }`}
                  title={isEditingRules ? "Done Editing" : "Edit your personal rules"}
                >
                  {isEditingRules ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Done</span>
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-3.5 h-3.5 text-teal-500" />
                      <span>Edit Rules</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsEditingRules(false);
                    setShowChecklistModal(false);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Subtitle / Instructions */}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEditingRules
                ? "Personalize your discipline rules. Edit existing rules, add your own setups, or remove rules:"
                : `Calm Capital discipline protocol: verify all ${checklistRules.length} rules before executing on your funded allocation.`}
            </p>

            {/* Content: Edit Mode vs Checklist Mode */}
            {isEditingRules ? (
              <div className="space-y-3">
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {checklistRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus-within:border-teal-500/50 transition-all"
                    >
                      <span className="w-6 h-6 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-mono font-black flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={rule}
                        onChange={(e) => handleUpdateRule(idx, e.target.value)}
                        className="flex-1 bg-transparent text-xs font-semibold text-slate-900 dark:text-white border-none outline-none px-1"
                        placeholder="Enter rule description..."
                      />
                      {checklistRules.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Edit Controls Toolbar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="px-3.5 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-bold border border-teal-500/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Add Custom Rule</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetDefaultRules}
                    className="px-3 py-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingRules(false)}
                  className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer border-0"
                >
                  Save Rules &amp; Return to Checklist
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {checklistRules.map((rule, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        const next = [...checklistChecks];
                        next[idx] = !next[idx];
                        setChecklistChecks(next);
                      }}
                      className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${checklistChecks[idx]
                          ? "bg-teal-500/10 border-teal-500/40 text-teal-700 dark:text-teal-300"
                          : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400"
                        }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${checklistChecks[idx]
                            ? "bg-teal-600 border-teal-600 text-white"
                            : "border-slate-300 dark:border-slate-600"
                          }`}
                      >
                        {checklistChecks[idx] && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-xs font-semibold leading-relaxed">{rule}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowChecklistModal(false);
                    handleOpenAddModal();
                  }}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-sm transition-all cursor-pointer border-0"
                >
                  Checklist Verified — Proceed to Log Trade
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LOG / EDIT TRADE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-2xl p-6 sm:p-8 space-y-6 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {editingTradeId ? "Edit Journal Entry" : "Log New Trade"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Record exact execution parameters and psychological state.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTrade} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Account
                  </label>
                  <select
                    value={form.account}
                    onChange={(e) => setForm({ ...form, account: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id} className="dark:bg-[#0B1528]">
                        {acc.name} (${Number(acc.startingBalance || 0).toLocaleString()} USD)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Pair
                  </label>
                  <select
                    value={form.pair}
                    onChange={(e) => {
                      const newPair = e.target.value;
                      const live = journalLiveRates[newPair];
                      setForm((prev) => ({
                        ...prev,
                        pair: newPair,
                        entryPrice: (!prev.entryPrice || prev.entryPrice === "0") && live ? String(live) : prev.entryPrice
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {MAJOR_PAIRS.map((p) => (
                      <option key={p} value={p} className="dark:bg-[#0B1528]">{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Direction
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: "LONG" })}
                      className={`py-2 rounded-xl text-xs font-black font-mono transition-all cursor-pointer ${form.type === "LONG"
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-white/5 text-slate-500"
                        }`}
                    >
                      LONG
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: "SHORT" })}
                      className={`py-2 rounded-xl text-xs font-black font-mono transition-all cursor-pointer ${form.type === "SHORT"
                        ? "bg-rose-500 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-white/5 text-slate-500"
                        }`}
                    >
                      SHORT
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Session
                  </label>
                  <select
                    value={form.session}
                    onChange={(e) => setForm({ ...form, session: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {SESSIONS.map((s) => (
                      <option key={s} value={s} className="dark:bg-[#0B1528]">{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Strategy &amp; Setup
                  </label>
                  <select
                    value={form.strategy}
                    onChange={(e) => setForm({ ...form, strategy: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {STRATEGIES.map((s) => (
                      <option key={s} value={s} className="dark:bg-[#0B1528]">{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price Stack */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Entry Price
                    </label>
                    {journalLiveRates[form.pair] && (
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, entryPrice: String(journalLiveRates[form.pair]) }))}
                        className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer active:scale-95"
                        title="Click to paste live market price"
                      >
                        Live: {journalLiveRates[form.pair]}
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    value={form.entryPrice}
                    onChange={(e) => setForm({ ...form, entryPrice: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-500 mb-1">
                    Stop Loss (SL)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={form.stopLoss}
                    onChange={(e) => setForm({ ...form, stopLoss: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-rose-500/30 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">
                    Take Profit (TP)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={form.takeProfit}
                    onChange={(e) => setForm({ ...form, takeProfit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-emerald-500/30 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* RR Pill display */}
              {computedRR && (
                <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs font-mono text-teal-700 dark:text-teal-300 flex items-center justify-between">
                  <span>Computed Risk:Reward:</span>
                  <strong className="text-sm">1 : {computedRR}</strong>
                </div>
              )}

              {/* PnL and Pips */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Lot Size
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.lotSize}
                    onChange={(e) => setForm({ ...form, lotSize: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Outcome
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="WIN">WIN</option>
                    <option value="LOSS">LOSS</option>
                    <option value="BREAKEVEN">BREAKEVEN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Realized P&amp;L ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={form.pnl}
                    onChange={(e) => setForm({ ...form, pnl: e.target.value })}
                    placeholder="e.g. 1250 or -250"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Net Pips
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={form.pips}
                    onChange={(e) => setForm({ ...form, pips: e.target.value })}
                    placeholder="e.g. 60 or -30"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Psychology / Emotional Discipline Tag
                </label>
                <select
                  value={form.psychology}
                  onChange={(e) => setForm({ ...form, psychology: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white"
                >
                  {PSYCHOLOGY_TAGS.map((tag) => (
                    <option key={tag} value={tag} className="dark:bg-[#0B1528]">{tag}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Trade Notes &amp; Confluence
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Reason for entry, liquidity pools swept, emotional state..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-sm cursor-pointer"
                >
                  {editingTradeId ? "Update Entry" : "Save Trade Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACCOUNT SETUP & REAL CAPITAL MANAGEMENT MODAL */}
      {accountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-white/10 shadow-2xl p-6 sm:p-8 space-y-6 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {editingAccount ? "Edit Account & Starting Capital" : "Add Trading Account / Set Real Capital"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Deposit real capital amount ($XY) to track live equity &amp; ROI.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccountModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-5">
              {/* Account Label */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Account Name / Broker Label
                </label>
                <input
                  type="text"
                  required
                  value={accFormName}
                  onChange={(e) => setAccFormName(e.target.value)}
                  placeholder="e.g. Real Live Broker, Exness Zero, FTMO Challenge"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                />
              </div>

              {/* Capital Amount */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
                    Starting Capital / Real Account Deposit ($ USD)
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">Real XY amount</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold font-mono text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    value={accFormBalance}
                    onChange={(e) => setAccFormBalance(e.target.value)}
                    placeholder="Enter custom amount, e.g. 500, 1500, 2500..."
                    className="w-full pl-8 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-white/5 border-2 border-teal-500/40 dark:border-teal-500/30 text-base font-mono font-black text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Fast Preset Chips */}
                <div className="mt-2.5 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Capital Presets:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[500, 1000, 2500, 5000, 10000, 25000, 50000, 100000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAccFormBalance(String(amt))}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                          parseFloat(accFormBalance) === amt
                            ? "bg-teal-500 text-white border-teal-500 shadow-sm"
                            : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-slate-200"
                        }`}
                      >
                        ${amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Account Category */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Account Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["Real / Live", "Prop Challenge", "Prop Funded", "Demo Practice"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAccFormType(type)}
                      className={`p-2.5 rounded-xl text-center text-xs font-bold transition-all cursor-pointer border ${
                        accFormType === type
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm"
                          : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Informational Card */}
              <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-800 dark:text-teal-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Real Account Equity Baseline</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Your live equity will dynamically compute as: <strong>${(parseFloat(accFormBalance) || 0).toLocaleString()} (Deposited) + Realized P&amp;L</strong>. Every trade logged under this account will accurately update your growth % and drawdowns.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/10">
                {editingAccount && accounts.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteAccount(editingAccount.id);
                      setAccountModalOpen(false);
                    }}
                    className="px-3.5 py-2.5 rounded-xl text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Account</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black shadow-md transition-all cursor-pointer border-0"
                  >
                    {editingAccount ? "Save Account Changes" : "Save & Activate Account"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
