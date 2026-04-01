import type { SupabaseClient } from "@supabase/supabase-js";

export const USER_DRAFTS_TABLE = "user_drafts" as const;

export type UserDraftRow = {
  id: string;
  userId: string;
  draftKey: string;
  payload: unknown;
  updatedAt: string;
  createdAt: string;
};

type Row = {
  id: string;
  user_id: string;
  draft_key: string;
  payload: unknown;
  updated_at: string;
  created_at: string;
};

function rowToModel(r: Row): UserDraftRow {
  return {
    id: r.id,
    userId: r.user_id,
    draftKey: r.draft_key,
    payload: r.payload,
    updatedAt: r.updated_at,
    createdAt: r.created_at,
  };
}

export async function fetchUserDraft(
  supabase: SupabaseClient,
  userId: string,
  draftKey: string
): Promise<UserDraftRow | null> {
  const { data, error } = await supabase
    .from(USER_DRAFTS_TABLE)
    .select("id,user_id,draft_key,payload,updated_at,created_at")
    .eq("user_id", userId)
    .eq("draft_key", draftKey)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToModel(data as Row) : null;
}

export async function upsertUserDraft(
  supabase: SupabaseClient,
  userId: string,
  draftKey: string,
  payload: unknown
): Promise<UserDraftRow> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(USER_DRAFTS_TABLE)
    .upsert(
      {
        user_id: userId,
        draft_key: draftKey,
        payload,
        updated_at: now,
      },
      { onConflict: "user_id,draft_key" }
    )
    .select("id,user_id,draft_key,payload,updated_at,created_at")
    .single();
  if (error) throw error;
  return rowToModel(data as Row);
}

export async function deleteUserDraft(
  supabase: SupabaseClient,
  userId: string,
  draftKey: string
): Promise<void> {
  const { error } = await supabase
    .from(USER_DRAFTS_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("draft_key", draftKey);
  if (error) throw error;
}

