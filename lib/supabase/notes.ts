import type { SupabaseClient } from "@supabase/supabase-js";

export const NOTE_CATEGORIES = [
  "weekly_market_interest",
  "markets_to_watch",
  "trading_plan",
  "lessons_mistakes",
  "general_notes",
] as const;

export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

export type UserNote = {
  id: string;
  userId: string;
  category: NoteCategory;
  content: string;
  updatedAt: string;
};

type UserNoteRow = {
  id: string;
  user_id: string;
  category: string;
  content: string;
  updated_at: string;
};

function rowToNote(row: UserNoteRow): UserNote {
  const category = row.category as NoteCategory;
  return {
    id: row.id,
    userId: row.user_id,
    category,
    content: row.content ?? "",
    updatedAt: row.updated_at,
  };
}

export async function fetchUserNotes(
  supabase: SupabaseClient,
  userId: string
): Promise<UserNote[]> {
  const { data, error } = await supabase
    .from("user_notes")
    .select("id,user_id,category,content,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToNote);
}

export async function upsertUserNote(
  supabase: SupabaseClient,
  userId: string,
  category: NoteCategory,
  content: string
): Promise<UserNote> {
  const updatedAt = new Date().toISOString();

  const payload = {
    user_id: userId,
    category,
    content,
    updated_at: updatedAt,
  };

  const { data, error } = await supabase
    .from("user_notes")
    .upsert(payload, { onConflict: "user_id,category" })
    .select("id,user_id,category,content,updated_at")
    .single();

  if (error) throw error;
  return rowToNote(data as UserNoteRow);
}

