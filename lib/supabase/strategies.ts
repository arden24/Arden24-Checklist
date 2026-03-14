import type { SupabaseClient } from "@supabase/supabase-js";

export type ChecklistItem = {
  text: string;
  timeframe: string;
  image?: string;
};

export type Strategy = {
  id: string;
  name: string;
  description: string;
  market: string;
  timeframes: string;
  checklist: ChecklistItem[];
  createdAt: string;
};

type StrategyRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  market: string | null;
  timeframes: string | null;
  checklist: unknown;
  created_at: string;
};

function rowToStrategy(row: StrategyRow): Strategy {
  const checklist = Array.isArray(row.checklist)
    ? (row.checklist as ChecklistItem[])
    : [];
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    market: row.market ?? "",
    timeframes: row.timeframes ?? "",
    checklist,
    createdAt: row.created_at,
  };
}

export async function fetchStrategies(
  supabase: SupabaseClient
): Promise<Strategy[]> {
  const { data, error } = await supabase
    .from("strategies")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToStrategy);
}

export async function fetchStrategyById(
  supabase: SupabaseClient,
  id: string
): Promise<Strategy | null> {
  const { data, error } = await supabase
    .from("strategies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToStrategy(data as StrategyRow) : null;
}

export async function insertStrategy(
  supabase: SupabaseClient,
  userId: string,
  strategy: Omit<Strategy, "id" | "createdAt">
): Promise<Strategy> {
  const { data, error } = await supabase
    .from("strategies")
    .insert({
      user_id: userId,
      name: strategy.name,
      description: strategy.description,
      market: strategy.market,
      timeframes: strategy.timeframes,
      checklist: strategy.checklist,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToStrategy(data as StrategyRow);
}

export async function updateStrategy(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Omit<Strategy, "id" | "createdAt">>
): Promise<Strategy> {
  const { data, error } = await supabase
    .from("strategies")
    .update({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.market !== undefined && { market: updates.market }),
      ...(updates.timeframes !== undefined && { timeframes: updates.timeframes }),
      ...(updates.checklist !== undefined && { checklist: updates.checklist }),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToStrategy(data as StrategyRow);
}

export async function deleteStrategy(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("strategies").delete().eq("id", id);
  if (error) throw error;
}
