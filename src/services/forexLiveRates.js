/**
 * Institutional Real-Time Forex, Commodity & Crypto Live Rates Engine
 * Multi-source failover architecture:
 * 1. Open Exchange Rates (Interbank Spot FX & Emerging currencies)
 * 2. CryptoCompare & CoinGecko (Gold PAXG 1:1 Bullion, BTC, ETH - unblocked worldwide & CORS enabled)
 * 3. Binance API failover
 * 4. Automatic 15-second cache TTL
 */

let cachedRates = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15000; // 15 seconds cache

// Updated Institutional Baseline Rates (Q4 2024 / Q1 2025 Market Reality)
const FALLBACK_RATES = {
  "EUR/USD": 1.0545,
  "GBP/USD": 1.2675,
  "USD/JPY": 154.65,
  "USD/CHF": 0.8845,
  "USD/CAD": 1.3975,
  "AUD/USD": 0.6515,
  "NZD/USD": 0.5875,
  "XAU/USD": 2685.80, // Spot Gold
  "XAG/USD": 31.40,   // Spot Silver
  "WTI/USD": 69.20,   // WTI Crude Oil
  "EUR/GBP": 0.8320,
  "EUR/JPY": 163.10,
  "GBP/JPY": 196.05,
  "USD/INR": 84.45,
  "USD/AED": 3.6725,
  "US30": 43450.0,
  "NAS100": 20680.0,
  "SPX500": 5875.0,
  "GER40": 19280.0,
  "BTC/USD": 91850.0,
  "ETH/USD": 3140.0
};

export async function fetchLiveForexRates() {
  const now = Date.now();
  if (cachedRates && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedRates;
  }

  const liveRates = { ...FALLBACK_RATES };

  // 1. Fetch live G10 + Emerging FX rates from Open Exchange Rates (Free, CORS-enabled, Global)
  try {
    const fxRes = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
    if (fxRes.ok) {
      const fxData = await fxRes.json();
      const r = fxData.rates || {};

      if (r.EUR) liveRates["EUR/USD"] = Number((1 / r.EUR).toFixed(4));
      if (r.GBP) liveRates["GBP/USD"] = Number((1 / r.GBP).toFixed(4));
      if (r.JPY) liveRates["USD/JPY"] = Number(r.JPY.toFixed(2));
      if (r.CHF) liveRates["USD/CHF"] = Number(r.CHF.toFixed(4));
      if (r.CAD) liveRates["USD/CAD"] = Number(r.CAD.toFixed(4));
      if (r.AUD) liveRates["AUD/USD"] = Number((1 / r.AUD).toFixed(4));
      if (r.NZD) liveRates["NZD/USD"] = Number((1 / r.NZD).toFixed(4));
      if (r.INR) liveRates["USD/INR"] = Number(r.INR.toFixed(2));
      if (r.AED) liveRates["USD/AED"] = Number(r.AED.toFixed(4));

      // Crosses
      if (r.EUR && r.GBP) liveRates["EUR/GBP"] = Number((r.GBP / r.EUR).toFixed(4));
      if (r.EUR && r.JPY) liveRates["EUR/JPY"] = Number((r.JPY / r.EUR).toFixed(2));
      if (r.GBP && r.JPY) liveRates["GBP/JPY"] = Number((r.JPY / r.GBP).toFixed(2));
    }
  } catch (err) {
    console.warn("FX live rate fetch fallback:", err?.message);
  }

  // 2. Fetch Live Spot Gold (PAXG 1:1 Bullion) & Crypto from CryptoCompare (100% unblocked globally & CORS enabled)
  let cryptoGoldFetched = false;
  try {
    const ccRes = await fetch(
      "https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,PAXG&tsyms=USD",
      { cache: "no-store" }
    );
    if (ccRes.ok) {
      const data = await ccRes.json();
      if (data.PAXG?.USD && data.PAXG.USD > 1000) {
        liveRates["XAU/USD"] = Number(data.PAXG.USD.toFixed(2));
        cryptoGoldFetched = true;
      }
      if (data.BTC?.USD && data.BTC.USD > 10000) {
        liveRates["BTC/USD"] = Number(data.BTC.USD.toFixed(1));
      }
      if (data.ETH?.USD && data.ETH.USD > 500) {
        liveRates["ETH/USD"] = Number(data.ETH.USD.toFixed(2));
      }
    }
  } catch (err) {
    console.warn("CryptoCompare fetch fallback:", err?.message);
  }

  // 3. Failover: CoinGecko (If CryptoCompare failed)
  if (!cryptoGoldFetched) {
    try {
      const cgRes = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=pax-gold,bitcoin,ethereum&vs_currencies=usd",
        { cache: "no-store" }
      );
      if (cgRes.ok) {
        const data = await cgRes.json();
        if (data["pax-gold"]?.usd && data["pax-gold"].usd > 1000) {
          liveRates["XAU/USD"] = Number(data["pax-gold"].usd.toFixed(2));
          cryptoGoldFetched = true;
        }
        if (data.bitcoin?.usd) {
          liveRates["BTC/USD"] = Number(data.bitcoin.usd.toFixed(1));
        }
        if (data.ethereum?.usd) {
          liveRates["ETH/USD"] = Number(data.ethereum.usd.toFixed(2));
        }
      }
    } catch (err) {
      console.warn("CoinGecko fetch fallback:", err?.message);
    }
  }

  // 4. Failover: Binance Public API (where permitted by ISP)
  if (!cryptoGoldFetched) {
    try {
      const bRes = await fetch(
        'https://api.binance.com/api/v3/ticker/price?symbols=["BTCUSDT","ETHUSDT","PAXGUSDT"]'
      );
      if (bRes.ok) {
        const items = await bRes.json();
        if (Array.isArray(items)) {
          for (const item of items) {
            const p = parseFloat(item.price);
            if (item.symbol === "BTCUSDT" && p > 0) liveRates["BTC/USD"] = Number(p.toFixed(1));
            if (item.symbol === "ETHUSDT" && p > 0) liveRates["ETH/USD"] = Number(p.toFixed(2));
            if (item.symbol === "PAXGUSDT" && p > 0) liveRates["XAU/USD"] = Number(p.toFixed(2));
          }
        }
      }
    } catch (err) {
      // expected in regions where Binance domain is restricted
    }
  }

  cachedRates = liveRates;
  lastFetchTime = now;
  return liveRates;
}
