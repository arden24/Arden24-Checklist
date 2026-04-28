import type { SupabaseClient } from "@supabase/supabase-js";
import {
  asChecklistImageRefIfPathLike,
  resolveChecklistImageRefs,
} from "@/lib/supabase/checklist-images";

export type ChecklistItem = {
  text: string;
  timeframe: string;
  image?: string;
  /** Stable storage pointer for cross-device checklist screenshots. */
  imageRef?: string;
  weight: number;
  critical: boolean;
  /**
   * Client-only stable id for list UI (drafts / edit form). Not read from or
   * written to the database checklist JSON.
   */
  _rowKey?: string;
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

type StrategyListRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  market: string | null;
  timeframes: string | null;
  created_at: string;
};

function rowToStrategy(row: StrategyRow): Strategy {
  const checklist = normaliseChecklist(row.checklist);
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

function rowToStrategyList(row: StrategyListRow): Omit<Strategy, "checklist"> & { checklist?: ChecklistItem[] } {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    market: row.market ?? "",
    timeframes: row.timeframes ?? "",
    createdAt: row.created_at,
  };
}

function normaliseChecklist(checklist: unknown): ChecklistItem[] {
  if (!Array.isArray(checklist)) return [];

  const inferredByText: Record<
    string,
    { weight: number; critical: boolean }
  > = {
    "HTF bias is clear and aligned (Weekly & Daily structure)": {
      weight: 20,
      critical: true,
    },
    "Price is within a valid HTF AOI (4H / Daily zone)": {
      weight: 20,
      critical: true,
    },
    "15 minute liquidity has been swept (opposite to HTF bias)": {
      weight: 20,
      critical: true,
    },
    "Clear break of structure: candle CLOSE beyond the most recent pivot following liquidity sweep, with strong displacement": {
      weight: 20,
      critical: true,
    },
    "Strong displacement candle (momentum / FVG / engulfing)": {
      weight: 10,
      critical: false,
    },
    "Entry forms within or near AOI and aligns with bias": {
      weight: 10,
      critical: false,
    },
    "Trade is within London or New York session": {
      weight: 10,
      critical: false,
    },
    "Stop loss placed beyond valid 15 minute pivot (structure invalidation)": {
      weight: 5,
      critical: false,
    },
    "Risk-to-reward is minimum 1:2 (ideal 1:3+) and aligns with 4H target/liquidity": {
      weight: 5,
      critical: false,
    },
    "Price is not mid-range (must be at AOI)": {
      weight: 10,
      critical: false,
    },
  };

  return checklist
    .map((item: unknown) => {
      if (typeof item === "string") {
        const inferred = inferredByText[item];
        return {
          text: item,
          timeframe: "",
          image: undefined,
          weight: inferred?.weight ?? 1,
          critical: inferred?.critical ?? false,
        } satisfies ChecklistItem;
      }

      const obj = item as Record<string, unknown>;
      const text = typeof obj.text === "string" ? obj.text : "";
      const timeframe = typeof obj.timeframe === "string" ? obj.timeframe : "";
      const image = typeof obj.image === "string" ? obj.image : undefined;
      const imageRefCandidate =
        typeof obj.imageRef === "string"
          ? obj.imageRef
          : typeof obj.image === "string"
          ? obj.image
          : undefined;
      const imageRef = asChecklistImageRefIfPathLike(imageRefCandidate) ?? undefined;
      const inferred = inferredByText[text];

      const rawWeight = obj.weight;
      const weight = Number.isFinite(Number(rawWeight))
        ? Number(rawWeight)
        : inferred?.weight ?? 1;

      const rawCritical = obj.critical;
      const critical =
        typeof rawCritical === "boolean"
          ? rawCritical
          : inferred?.critical ?? false;

      return {
        text,
        timeframe,
        image,
        imageRef,
        weight,
        critical,
      } satisfies ChecklistItem;
    })
    .filter((it) => it.text.trim().length > 0);
}

export async function fetchStrategies(
  supabase: SupabaseClient
): Promise<Strategy[]> {
  const { data, error } = await supabase
    .from("strategies")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const base = (data ?? []).map(rowToStrategy);
  const refs = base.flatMap((s) => s.checklist.map((i) => i.imageRef).filter(Boolean)) as string[];
  if (refs.length === 0) return base;
  try {
    const byRef = await resolveChecklistImageRefs(supabase, refs);
    return base.map((s) => ({
      ...s,
      checklist: s.checklist.map((i) => ({
        ...i,
        image: i.imageRef ? byRef[i.imageRef] ?? i.image : i.image,
      })),
    }));
  } catch {
    return base;
  }
}

/** Metadata-only list query for lightweight listing views. */
export async function fetchStrategiesList(
  supabase: SupabaseClient
): Promise<Array<Omit<Strategy, "checklist"> & { checklist?: ChecklistItem[] }>> {
  const { data, error } = await supabase
    .from("strategies")
    .select("id,user_id,name,description,market,timeframes,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => rowToStrategyList(row as StrategyListRow));
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
  if (!data) return null;
  const strategy = rowToStrategy(data as StrategyRow);
  const refs = strategy.checklist
    .map((i) => i.imageRef)
    .filter(Boolean) as string[];
  if (refs.length === 0) return strategy;
  try {
    const byRef = await resolveChecklistImageRefs(supabase, refs);
    return {
      ...strategy,
      checklist: strategy.checklist.map((i) => ({
        ...i,
        image: i.imageRef ? byRef[i.imageRef] ?? i.image : i.image,
      })),
    };
  } catch {
    return strategy;
  }
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
