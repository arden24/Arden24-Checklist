import { getTradesKey, getOpenTradesKey } from "./storage-keys";

export const TRADES_STORAGE_KEY = "tradechecklist_trades";
export const OPEN_TRADES_STORAGE_KEY = "tradechecklist_open_trades";

export type OpenTrade = {
  id: string;
  date: string;
  pair: string;
  market: string;
  session?: string;
  direction?: "Buy" | "Sell";
  lotSize?: string;
  strategy?: string;
  notes?: string;
  createdAt: string;
  time?: string;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
};

export type Trade = {
  id: string;
  date: string;
  pair: string;
  market: string;
  session?: string;
  direction?: "Buy" | "Sell";
  pnl: number;
  rr?: string;
  description?: string;
  notes?: string;
  thoughts?: string;
  confidence?: number;
  strategy?: string;
  createdAt: string;
  result?: "win" | "loss" | "breakeven";
  currency?: "USD" | "GBP" | "EUR";
  time?: string;
  screenshot?: string;
  rating?: number;
};

export function loadTrades(userId?: string | null): Trade[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getTradesKey(userId);
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Trade[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getSampleTrades(): Trade[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");

  return [
    {
      id: "s1",
      date: `${y}-${pad(m + 1)}-07`,
      pair: "GBP/USD",
      market: "Forex",
      session: "London",
      direction: "Buy",
      pnl: 125.5,
      rr: "2.5:1",
      result: "win",
      currency: "GBP",
      createdAt: new Date().toISOString(),
      thoughts: "Clean breakout on 1H. Waited for retest of level.",
      time: "09:45",
    },
    {
      id: "s2",
      date: `${y}-${pad(m + 1)}-07`,
      pair: "EUR/JPY",
      market: "Forex",
      session: "NY",
      direction: "Sell",
      pnl: -42,
      rr: "1:1.2",
      result: "loss",
      currency: "GBP",
      createdAt: new Date().toISOString(),
      thoughts: "Entered too early before confirmation.",
      time: "14:20",
    },
    {
      id: "s3",
      date: `${y}-${pad(m + 1)}-08`,
      pair: "XAU/USD",
      market: "Commodities",
      session: "London",
      direction: "Buy",
      pnl: 88,
      rr: "2:1",
      result: "win",
      currency: "USD",
      createdAt: new Date().toISOString(),
      time: "10:15",
    },
    {
      id: "s4",
      date: `${y}-${pad(m + 1)}-08`,
      pair: "NAS100",
      market: "Indices",
      session: "NY",
      direction: "Sell",
      pnl: 210,
      rr: "3:1",
      result: "win",
      currency: "USD",
      createdAt: new Date().toISOString(),
      thoughts: "Strong rejection at daily high. Perfect R:R.",
      time: "15:30",
    },
    {
      id: "s5",
      date: `${y}-${pad(m + 1)}-12`,
      pair: "GBP/USD",
      market: "Forex",
      session: "London",
      direction: "Sell",
      pnl: -65,
      rr: "1:1",
      result: "loss",
      currency: "GBP",
      createdAt: new Date().toISOString(),
      notes: "Stopped out on false break.",
      time: "09:00",
    },
    {
      id: "s6",
      date: `${y}-${pad(m + 1)}-12`,
      pair: "EUR/USD",
      market: "Forex",
      session: "NY",
      direction: "Buy",
      pnl: 95.5,
      rr: "1.5:1",
      result: "win",
      currency: "USD",
      createdAt: new Date().toISOString(),
      time: "13:45",
    },
    {
      id: "s7",
      date: `${y}-${pad(m + 1)}-15`,
      pair: "AUD/USD",
      market: "Forex",
      session: "Asian",
      direction: "Buy",
      pnl: 0,
      rr: "0:0",
      result: "breakeven",
      currency: "USD",
      createdAt: new Date().toISOString(),
      thoughts: "Moved stop to breakeven. Price reversed.",
      time: "02:30",
    },
    {
      id: "s8",
      date: `${y}-${pad(m + 1)}-18`,
      pair: "USD/JPY",
      market: "Forex",
      session: "London",
      direction: "Sell",
      pnl: 156,
      rr: "2:1",
      result: "win",
      currency: "USD",
      createdAt: new Date().toISOString(),
      thoughts: "Trend continuation on 4H. Clean entry on 15m.",
      time: "08:20",
    },
  ];
}

export function getTradesForJournal(userId?: string | null): Trade[] {
  const saved = loadTrades(userId);
  if (saved.length > 0) return saved;
  return getSampleTrades();
}

export function loadOpenTrades(userId?: string | null): OpenTrade[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getOpenTradesKey(userId);
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OpenTrade[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOpenTrades(trades: OpenTrade[], userId?: string | null) {
  if (typeof window === "undefined") return;
  const key = getOpenTradesKey(userId);
  window.localStorage.setItem(key, JSON.stringify(trades));
}

export function addOpenTrade(trade: OpenTrade, userId?: string | null) {
  const existing = loadOpenTrades(userId);
  saveOpenTrades([trade, ...existing], userId);
}

export function removeOpenTrade(id: string, userId?: string | null) {
  const existing = loadOpenTrades(userId).filter((t) => t.id !== id);
  saveOpenTrades(existing, userId);
}

export async function closeTrade(
  open: OpenTrade,
  outcome: {
    result: "win" | "loss" | "breakeven";
    pnl: number;
    currency: "USD" | "GBP" | "EUR";
    thoughts?: string;
    rr?: string;
    time?: string;
    screenshot?: string;
    rating?: number;
  },
  userId?: string | null,
  supabase?: import("@supabase/supabase-js").SupabaseClient | null
): Promise<void> {
  const closedDate = new Date();
  const y = closedDate.getFullYear();
  const m = String(closedDate.getMonth() + 1).padStart(2, "0");
  const d = String(closedDate.getDate()).padStart(2, "0");
  const date = `${y}-${m}-${d}`;

  const trade: Omit<Trade, "id" | "createdAt"> = {
    date,
    pair: open.pair,
    market: open.market,
    session: open.session,
    direction: open.direction,
    pnl: outcome.pnl,
    rr: outcome.rr,
    thoughts: outcome.thoughts,
    result: outcome.result,
    currency: outcome.currency,
    time: outcome.time ?? open.time,
    screenshot: outcome.screenshot,
    rating: outcome.rating,
  };

  // Primary production path: Supabase as source of truth
  if (supabase && userId) {
    const { insertTrade } = await import("@/lib/supabase/trades");
    const { deleteOpenTrade } = await import("@/lib/supabase/open-trades");

    try {
      console.log("[closeTrade] Inserting closed trade into trades table", { openId: open.id, date: trade.date, pair: trade.pair, market: trade.market, pnl: trade.pnl });
      // 1) Insert closed trade into trades table
      await insertTrade(supabase, userId, trade);
      console.log("[closeTrade] Insert into trades succeeded");
      // 2) Only after successful insert, delete from open_trades
      await deleteOpenTrade(supabase, open.id);
      console.log("[closeTrade] Delete from open_trades succeeded");
    } catch (err) {
      console.error("[closeTrade] Supabase error", err);
      // Surface Supabase errors to the caller (UI will show a clear message)
      throw err;
    }
    return;
  }

  // Dev / offline fallback: use localStorage when Supabase or userId are not available
  const fullTrade: Trade = {
    ...trade,
    id: open.id,
    createdAt: new Date().toISOString(),
  };
  const existing = loadTrades(userId);
  const key = getTradesKey(userId);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify([fullTrade, ...existing]));
  }
  removeOpenTrade(open.id, userId);
}

/**
 * Cancel a closed trade (remove from dashboard/journal/performance).
 * - Supabase: deletes the row from `trades`.
 * - Offline: removes from the localStorage trade list for the user.
 */
export async function cancelClosedTrade(
  tradeId: string,
  userId?: string | null,
  supabase?: import("@supabase/supabase-js").SupabaseClient | null
): Promise<void> {
  // Supabase as source of truth
  if (supabase && userId) {
    const { deleteTrade } = await import("@/lib/supabase/trades");
    await deleteTrade(supabase, userId, tradeId);
    return;
  }

  // Dev / offline fallback
  if (typeof window === "undefined") return;
  try {
    const key = getTradesKey(userId);
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as Trade[]) : [];
    const next = Array.isArray(parsed) ? parsed.filter((t) => t.id !== tradeId) : [];
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore localStorage issues
  }
}
