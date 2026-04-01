import type { SupabaseClient } from "@supabase/supabase-js";

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
  openingScreenshot?: string;
};

type OpenTradeRow = {
  id: string;
  user_id: string;
  pair: string;
  market: string;
  direction: string | null;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  lot_size: string | null;
  notes: string | null;
  date: string | null;
  created_at: string;
  opening_screenshot: string | null;
};

function rowToOpenTrade(row: OpenTradeRow): OpenTrade {
  const date = row.date ?? row.created_at.slice(0, 10);
  return {
    id: row.id,
    date,
    pair: row.pair,
    market: row.market,
    direction: row.direction as "Buy" | "Sell" | undefined,
    lotSize: row.lot_size ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    entryPrice: row.entry_price != null ? Number(row.entry_price) : undefined,
    stopLoss: row.stop_loss != null ? Number(row.stop_loss) : undefined,
    takeProfit: row.take_profit != null ? Number(row.take_profit) : undefined,
    openingScreenshot: row.opening_screenshot ?? undefined,
  };
}

export async function fetchOpenTrades(
  supabase: SupabaseClient
): Promise<OpenTrade[]> {
  const { data, error } = await supabase
    .from("open_trades")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => rowToOpenTrade(row as OpenTradeRow));
}

export async function insertOpenTrade(
  supabase: SupabaseClient,
  userId: string,
  open: Omit<OpenTrade, "id" | "createdAt">
): Promise<OpenTrade> {
  const { data, error } = await supabase
    .from("open_trades")
    .insert({
      user_id: userId,
      pair: open.pair,
      market: open.market,
      direction: open.direction ?? null,
      entry_price: open.entryPrice ?? null,
      stop_loss: open.stopLoss ?? null,
      take_profit: open.takeProfit ?? null,
      lot_size: open.lotSize ?? null,
      notes: open.notes ?? null,
      date: open.date ?? null,
      opening_screenshot: open.openingScreenshot ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToOpenTrade(data as OpenTradeRow);
}

export async function deleteOpenTrade(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  console.log("[deleteOpenTrade] Deleting open_trades row id:", id);
  const { error } = await supabase.from("open_trades").delete().eq("id", id);
  if (error) {
    console.error("[deleteOpenTrade] Supabase delete error", error.code, error.message, error.details);
    throw error;
  }
}
