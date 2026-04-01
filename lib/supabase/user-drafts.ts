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
  updated_at?: string | null;
  created_at?: string | null;
};

function rowToModel(r: Row): UserDraftRow {
  const updatedAt = r.updated_at ?? new Date().toISOString();
  const createdAt = r.created_at ?? updatedAt;
  return {
    id: r.id,
    userId: r.user_id,
    draftKey: r.draft_key,
    payload: r.payload,
    updatedAt,
    createdAt,
  };
}

export async function fetchUserDraft(
  supabase: SupabaseClient,
  userId: string,
  draftKey: string
): Promise<UserDraftRow | null> {
  const { data, error } = await supabase
    .from(USER_DRAFTS_TABLE)
    .select("id,user_id,draft_key,payload,updated_at")
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
    .select("id,user_id,draft_key,payload,updated_at")
    .single();
  if (error) {
    // Fallback for drifted local schemas lacking the unique conflict key.
    const isConflictSpecError =
      (error as any)?.code === "42P10" ||
      String((error as any)?.message ?? "").includes(
        "no unique or exclusion constraint matching the ON CONFLICT specification"
      );
    if (!isConflictSpecError) throw error;

    const { data: existing, error: selErr } = await supabase
      .from(USER_DRAFTS_TABLE)
      .select("id,user_id,draft_key,payload,updated_at")
      .eq("user_id", userId)
      .eq("draft_key", draftKey)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (selErr) throw selErr;

    if (existing) {
      const { data: updated, error: updErr } = await supabase
        .from(USER_DRAFTS_TABLE)
        .update({ payload, updated_at: now })
        .eq("id", (existing as any).id)
        .eq("user_id", userId)
        .select("id,user_id,draft_key,payload,updated_at")
        .single();
      if (updErr) throw updErr;
      return rowToModel(updated as Row);
    }

    const { data: inserted, error: insErr } = await supabase
      .from(USER_DRAFTS_TABLE)
      .insert({
        user_id: userId,
        draft_key: draftKey,
        payload,
        updated_at: now,
      })
      .select("id,user_id,draft_key,payload,updated_at")
      .single();
    if (insErr) throw insErr;
    return rowToModel(inserted as Row);
  }
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

