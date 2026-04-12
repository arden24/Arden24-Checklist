import type { SupabaseClient } from "@supabase/supabase-js";
import { devLog } from "@/lib/dev-log";

/**
 * Supabase table for per-user, per-category notes.
 * Default `notes` matches common production setups. If you only have `user_notes`
 * (from an older migration), set NEXT_PUBLIC_SUPABASE_NOTES_TABLE=user_notes.
 */
export function getNotesTableName(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_NOTES_TABLE?.trim() || "notes"
  );
}

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

/** Log full PostgREST / Supabase error for production debugging */
function logNotesSupabaseError(
  operation: string,
  err: { message?: string; code?: string; details?: string; hint?: string },
  context: Record<string, unknown>
): void {
  console.error(`[notes] ${operation} failed`, {
    table: getNotesTableName(),
    ...context,
    code: err.code,
    message: err.message,
    details: err.details,
    hint: err.hint,
  });
}

export async function fetchUserNotes(
  supabase: SupabaseClient,
  userId: string
): Promise<UserNote[]> {
  const table = getNotesTableName();
  const { data, error } = await supabase
    .from(table)
    .select("id,user_id,category,content,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    logNotesSupabaseError("fetchUserNotes", error, { userId });
    throw error;
  }
  return (data ?? []).map((row) => rowToNote(row as UserNoteRow));
}

/**
 * Save one note per user per category: update if a row exists, else insert.
 * Uses explicit select + update/insert instead of upsert so it works without
 * relying on PostgREST conflict targets matching your unique constraint name,
 * and matches a table named `notes` (not `user_notes`).
 */
export async function upsertUserNote(
  supabase: SupabaseClient,
  userId: string,
  category: NoteCategory,
  content: string
): Promise<UserNote> {
  const table = getNotesTableName();
  const updatedAt = new Date().toISOString();

  const { data: existing, error: selectError } = await supabase
    .from(table)
    .select("id,user_id,category,content,updated_at")
    .eq("user_id", userId)
    .eq("category", category)
    .maybeSingle();

  if (selectError) {
    logNotesSupabaseError("select existing note", selectError, {
      userId,
      category,
    });
    throw selectError;
  }

  if (existing) {
    const { data, error } = await supabase
      .from(table)
      .update({ content, updated_at: updatedAt })
      .eq("id", (existing as UserNoteRow).id)
      .eq("user_id", userId)
      .select("id,user_id,category,content,updated_at")
      .single();

    if (error) {
      logNotesSupabaseError("update note", error, {
        userId,
        category,
        noteId: (existing as UserNoteRow).id,
      });
      throw error;
    }
    console.log("[notes] updated row", {
      table,
      id: (data as UserNoteRow)?.id,
      category,
    });
    return rowToNote(data as UserNoteRow);
  }

  const { data, error } = await supabase
    .from(table)
    .insert({
      user_id: userId,
      category,
      content,
      updated_at: updatedAt,
    })
    .select("id,user_id,category,content,updated_at")
    .single();

  if (error) {
    // Rare race: two tabs inserted same user/category — fetch and update
    if (error.code === "23505") {
      devLog("[notes] unique violation on insert, retrying as update", {
        table,
        userId,
        category,
      });
      const { data: row2, error: e2 } = await supabase
        .from(table)
        .select("id,user_id,category,content,updated_at")
        .eq("user_id", userId)
        .eq("category", category)
        .maybeSingle();

      if (e2 || !row2) {
        if (e2) logNotesSupabaseError("retry select after 23505", e2, { userId, category });
        throw e2 ?? error;
      }

      const { data: updated, error: e3 } = await supabase
        .from(table)
        .update({ content, updated_at: updatedAt })
        .eq("id", (row2 as UserNoteRow).id)
        .eq("user_id", userId)
        .select("id,user_id,category,content,updated_at")
        .single();

      if (e3) {
        logNotesSupabaseError("retry update after 23505", e3, {
          userId,
          category,
          noteId: (row2 as UserNoteRow).id,
        });
        throw e3;
      }
      return rowToNote(updated as UserNoteRow);
    }

    logNotesSupabaseError("insert note", error, { userId, category });
    throw error;
  }

  devLog("[notes] inserted row", {
    table,
    id: (data as UserNoteRow)?.id,
    category,
  });
  return rowToNote(data as UserNoteRow);
}
