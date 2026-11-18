import React, { useEffect, useRef } from "react";

/**
 * Official TradingView Real-Time Ticker Tape
 * Streams 100% live tick-by-tick institutional exchange prices directly into the application.
 */
export default function TradingViewTickerTape({ dark }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous widget on theme change
    container.innerHTML = "";

    const widgetInner = document.createElement("div");
    widgetInner.className = "tradingview-widget-container__widget";
    container.appendChild(widgetInner);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: "FX_IDC:EURUSD", title: "EUR/USD" },
        { proName: "FX_IDC:GBPUSD", title: "GBP/USD" },
        { proName: "FX_IDC:USDJPY", title: "USD/JPY" },
        { proName: "OANDA:XAUUSD", title: "Gold (XAU/USD)" },
        { proName: "OANDA:XAGUSD", title: "Silver (XAG/USD)" },
        { proName: "TVC:USOIL", title: "Crude Oil" },
        { proName: "BLACKBULL:US30", title: "US 30 / Dow" },
        { proName: "OANDA:NAS100USD", title: "Nasdaq 100" },
        { proName: "OANDA:SPX500USD", title: "S&P 500" },
        { proName: "FX_IDC:USDCHF", title: "USD/CHF" },
        { proName: "FX_IDC:USDCAD", title: "USD/CAD" },
        { proName: "FX_IDC:AUDUSD", title: "AUD/USD" },
        { proName: "FX_IDC:NZDUSD", title: "NZD/USD" },
        { proName: "FX_IDC:USDINR", title: "USD/INR" },
        { proName: "BINANCE:BTCUSDT", title: "Bitcoin" },
        { proName: "BINANCE:ETHUSDT", title: "Ethereum" }
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: dark ? "dark" : "light",
      locale: "en"
    });

    container.appendChild(script);

    return () => {
      if (container) container.innerHTML = "";
    };
  }, [dark]);

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#071324] shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Live Streaming Institutional Market Feed
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#1c9bda] font-bold">
          Tick-by-Tick Live Prices
        </span>
      </div>
      <div className="tradingview-widget-container" ref={containerRef} style={{ minHeight: "46px" }}>
        <div className="tradingview-widget-container__widget" />
      </div>
    </div>
  );
}
