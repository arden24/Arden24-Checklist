import type { SupabaseClient } from "@supabase/supabase-js";
import { devLog } from "@/lib/dev-log";
import { logError } from "@/lib/log-error";

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
  openingScreenshot?: string;
  closingScreenshot?: string;
  rating?: number;
};

type TradeRow = {
  id: string;
  user_id: string;
  date: string;
  pair: string;
  market: string;
  session: string | null;
  direction: string | null;
  pnl: number;
  rr: string | null;
  description: string | null;
  notes: string | null;
  thoughts: string | null;
  confidence: number | null;
  strategy: string | null;
  created_at: string;
  result: string | null;
  currency: string | null;
  time: string | null;
  screenshot: string | null;
  opening_screenshot: string | null;
  closing_screenshot: string | null;
  rating: number | null;
};

function rowToTrade(row: TradeRow): Trade {
  return {
    id: row.id,
    date: row.date,
    pair: row.pair,
    market: row.market,
    session: row.session ?? undefined,
    direction: row.direction as "Buy" | "Sell" | undefined,
    pnl: Number(row.pnl),
    rr: row.rr ?? undefined,
    description: row.description ?? undefined,
    notes: row.notes ?? undefined,
    thoughts: row.thoughts ?? undefined,
    confidence: row.confidence != null ? Number(row.confidence) : undefined,
    strategy: row.strategy ?? undefined,
    createdAt: row.created_at,
    result: row.result as "win" | "loss" | "breakeven" | undefined,
    currency: row.currency as "USD" | "GBP" | "EUR" | undefined,
    time: row.time ?? undefined,
    openingScreenshot: row.opening_screenshot ?? undefined,
    closingScreenshot: row.closing_screenshot ?? row.screenshot ?? undefined,
    // legacy field kept for compatibility in older UI codepaths
    screenshot: row.screenshot ?? row.closing_screenshot ?? undefined,
    rating: row.rating ?? undefined,
  };
}

export async function fetchTrades(supabase: SupabaseClient): Promise<Trade[]> {
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => rowToTrade(row as TradeRow));
}

export async function insertTrade(
  supabase: SupabaseClient,
  userId: string,
  trade: Omit<Trade, "id" | "createdAt">
): Promise<Trade> {
  // Map to DB snake_case; ensure rating is integer for trades.rating column (int)
  const row = {
    user_id: userId,
    date: trade.date,
    pair: trade.pair,
    market: trade.market,
    session: trade.session ?? null,
    direction: trade.direction ?? null,
    pnl: trade.pnl,
    rr: trade.rr ?? null,
    description: trade.description ?? null,
    notes: trade.notes ?? null,
    thoughts: trade.thoughts ?? null,
    confidence: trade.confidence ?? null,
    strategy: trade.strategy ?? null,
    result: trade.result ?? null,
    currency: trade.currency ?? null,
    time: trade.time ?? null,
    screenshot: trade.screenshot ?? trade.closingScreenshot ?? null,
    opening_screenshot: trade.openingScreenshot ?? null,
    closing_screenshot: trade.closingScreenshot ?? trade.screenshot ?? null,
    rating: trade.rating != null ? Math.round(trade.rating) : null,
  };
  devLog("[insertTrade] Inserting row into trades", row);
  const { data, error } = await supabase.from("trades").insert(row).select().single();
  if (error) {
    logError(error);
    throw error;
  }
  devLog("[insertTrade] Insert succeeded, id:", (data as TradeRow)?.id);
  return rowToTrade(data as TradeRow);
}

export async function deleteTrade(
  supabase: SupabaseClient,
  userId: string,
  tradeId: string
): Promise<void> {
  const { error } = await supabase
    .from("trades")
    .delete()
    .eq("id", tradeId)
    .eq("user_id", userId);

  if (error) throw error;
}
