import type { SupabaseClient } from "@supabase/supabase-js";
import { devLog } from "@/lib/dev-log";

export const ACCOUNT_PROGRESS_TABLE = "account_progress" as const;

export type AccountProgressType =
  | "challenge"
  | "passed"
  | "funded"
  | "personal_live"
  | "demo";

export type AccountProgress = {
  id: string;
  userId: string;
  accountType: AccountProgressType;
  startingBalance: number;
  currentBalance: number;
  targetAmount: number;
  targetLabel: string;
  targetNotes: string;
  updatedAt: string;
};

type Row = {
  id: string;
  user_id: string;
  account_type: string;
  starting_balance: number | string;
  current_balance: number | string;
  target_amount: number | string;
  target_label: string | null;
  target_notes: string | null;
  updated_at: string;
};

function toNum(v: number | string | null | undefined): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function rowToModel(row: Row): AccountProgress {
  return {
    id: row.id,
    userId: row.user_id,
    accountType: (row.account_type as AccountProgressType) || "challenge",
    startingBalance: toNum(row.starting_balance),
    currentBalance: toNum(row.current_balance),
    targetAmount: toNum(row.target_amount),
    targetLabel: row.target_label ?? "",
    targetNotes: row.target_notes ?? "",
    updatedAt: row.updated_at,
  };
}

function logError(op: string, err: { message?: string; code?: string; details?: string; hint?: string }, ctx: Record<string, unknown>) {
  console.error(`[account_progress] ${op}`, { ...ctx, code: err.code, message: err.message, details: err.details, hint: err.hint });
}

export async function fetchAccountProgress(
  supabase: SupabaseClient,
  userId: string
): Promise<AccountProgress | null> {
  const { data, error } = await supabase
    .from(ACCOUNT_PROGRESS_TABLE)
    .select(
      "id,user_id,account_type,starting_balance,current_balance,target_amount,target_label,target_notes,updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logError("fetch", error, { userId });
    throw error;
  }
  if (!data) return null;
  return rowToModel(data as Row);
}

export type AccountProgressInput = {
  accountType: AccountProgressType;
  startingBalance: number;
  currentBalance: number;
  targetAmount: number;
  targetLabel: string;
  targetNotes: string;
};

export async function saveAccountProgress(
  supabase: SupabaseClient,
  userId: string,
  input: AccountProgressInput
): Promise<AccountProgress> {
  const updatedAt = new Date().toISOString();
  const payload = {
    user_id: userId,
    account_type: input.accountType,
    starting_balance: input.startingBalance,
    current_balance: input.currentBalance,
    target_amount: input.targetAmount,
    target_label: input.targetLabel.trim(),
    target_notes: input.targetNotes.trim(),
    updated_at: updatedAt,
  };

  const { data: existing, error: selErr } = await supabase
    .from(ACCOUNT_PROGRESS_TABLE)
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (selErr) {
    logError("select", selErr, { userId });
    throw selErr;
  }

  if (existing) {
    const { data, error } = await supabase
      .from(ACCOUNT_PROGRESS_TABLE)
      .update({
        account_type: payload.account_type,
        starting_balance: payload.starting_balance,
        current_balance: payload.current_balance,
        target_amount: payload.target_amount,
        target_label: payload.target_label,
        target_notes: payload.target_notes,
        updated_at: payload.updated_at,
      })
      .eq("id", (existing as { id: string }).id)
      .eq("user_id", userId)
      .select(
        "id,user_id,account_type,starting_balance,current_balance,target_amount,target_label,target_notes,updated_at"
      )
      .single();

    if (error) {
      logError("update", error, { userId });
      throw error;
    }
    console.log("[account_progress] updated", { userId });
    return rowToModel(data as Row);
  }

  const { data, error } = await supabase
    .from(ACCOUNT_PROGRESS_TABLE)
    .insert(payload)
    .select(
      "id,user_id,account_type,starting_balance,current_balance,target_amount,target_label,target_notes,updated_at"
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: row2, error: e2 } = await supabase
        .from(ACCOUNT_PROGRESS_TABLE)
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!e2 && row2) {
        const { data: data2, error: e3 } = await supabase
          .from(ACCOUNT_PROGRESS_TABLE)
          .update({
            account_type: payload.account_type,
            starting_balance: payload.starting_balance,
            current_balance: payload.current_balance,
            target_amount: payload.target_amount,
            target_label: payload.target_label,
            target_notes: payload.target_notes,
            updated_at: payload.updated_at,
          })
          .eq("id", (row2 as { id: string }).id)
          .eq("user_id", userId)
          .select(
            "id,user_id,account_type,starting_balance,current_balance,target_amount,target_label,target_notes,updated_at"
          )
          .single();
        if (e3) {
          logError("update after 23505", e3, { userId });
          throw e3;
        }
        return rowToModel(data2 as Row);
      }
    }
    logError("insert", error, { userId });
    throw error;
  }

  devLog("[account_progress] inserted", { userId });
  return rowToModel(data as Row);
}
