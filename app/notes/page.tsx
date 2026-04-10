"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  fetchUserNotes,
  getNotesTableName,
  NOTE_CATEGORIES,
  type NoteCategory,
  upsertUserNote,
} from "@/lib/supabase/notes";
import { logError } from "@/lib/log-error";
import { sessionFormFullKey } from "@/lib/hooks/useSessionFormState";

const NOTES_DRAFT_KEY = sessionFormFullKey("page:notes");

type NotesDraft = {
  contentByCategory: Partial<Record<NoteCategory, string>>;
  activeCategory?: NoteCategory;
};

function parseNotesDraft(raw: string | null): NotesDraft | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    return v as NotesDraft;
  } catch {
    return null;
  }
}

function supabaseErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

const CATEGORY_LABELS: Record<NoteCategory, string> = {
  weekly_market_interest: "Weekly Market Interest",
  markets_to_watch: "Markets to Watch",
  trading_plan: "Trading Plan",
  lessons_mistakes: "Lessons / Mistakes",
  general_notes: "General Notes",
};

const CATEGORY_HELP: Record<NoteCategory, string> = {
  weekly_market_interest: "Track themes you think will matter this week.",
  markets_to_watch: "List charts, levels, or setups you want to monitor.",
  trading_plan: "Write your plan before you trade. Keep it simple.",
  lessons_mistakes: "Capture what went well, what didn’t, and what to fix.",
  general_notes: "Anything else you want to remember.",
};

const CATEGORY_PLACEHOLDERS: Record<NoteCategory, string> = {
  weekly_market_interest:
    "Example:\n- Focus: EUR/USD volatility + US data\n- Bias: cautious until key HTF level breaks",
  markets_to_watch:
    "Example:\n- XAU/USD: watch H1 demand zone\n- NAS100: mark yesterday’s high/low",
  trading_plan:
    "Example:\n- If London breaks level X, wait for retest\n- Risk: fixed %, size later\n- No trade if critical conditions fail",
  lessons_mistakes:
    "Example:\n- Mistake: entered early on confirmation gap\n- Fix: wait for structure shift + HTF alignment",
  general_notes: "Write your notes here…",
};

function buildEmptyByCategory(): Record<NoteCategory, string> {
  return NOTE_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = "";
    return acc;
  }, {} as Record<NoteCategory, string>);
}

export default function NotesPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [activeCategory, setActiveCategory] = useState<NoteCategory>(
    NOTE_CATEGORIES[0] ?? "general_notes"
  );
  const [contentByCategory, setContentByCategory] = useState<Record<NoteCategory, string>>(
    () => buildEmptyByCategory()
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const safeUserId = user?.id;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase || !safeUserId) {
        setLoading(false);
        return;
      }

      try {
        const rows = await fetchUserNotes(supabase, safeUserId);
        if (cancelled) return;

        const next = buildEmptyByCategory();
        rows.forEach((n) => {
          next[n.category] = n.content ?? "";
        });

        // Merge session draft so unsaved edits survive navigation (same tab session).
        if (typeof window !== "undefined") {
          const draft = parseNotesDraft(sessionStorage.getItem(NOTES_DRAFT_KEY));
          if (draft?.contentByCategory) {
            for (const cat of NOTE_CATEGORIES) {
              const local = draft.contentByCategory[cat];
              if (typeof local === "string" && local.length > 0) {
                next[cat] = local;
              }
            }
          }
          if (
            draft?.activeCategory &&
            NOTE_CATEGORIES.includes(draft.activeCategory)
          ) {
            setActiveCategory(draft.activeCategory);
          }
        }

        setContentByCategory(next);
      } catch (err) {
        logError(err);
        console.error("[notes] load failed", {
          table: getNotesTableName(),
          message: supabaseErrorMessage(err),
          err,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, safeUserId]);

  useEffect(() => {
    if (loading || typeof window === "undefined" || !safeUserId) return;
    try {
      sessionStorage.setItem(
        NOTES_DRAFT_KEY,
        JSON.stringify({ contentByCategory, activeCategory })
      );
    } catch {
      // ignore
    }
  }, [contentByCategory, activeCategory, loading, safeUserId]);

  const activeContent = contentByCategory[activeCategory] ?? "";

  const activeLabel = useMemo(() => CATEGORY_LABELS[activeCategory], [activeCategory]);

  async function handleSave() {
    if (!supabase || !safeUserId) return;
    setSaving(true);
    setLastSavedAt(null);
    try {
      const saved = await upsertUserNote(
        supabase,
        safeUserId,
        activeCategory,
        activeContent
      );
      setLastSavedAt(saved.updatedAt);
      try {
        sessionStorage.removeItem(NOTES_DRAFT_KEY);
      } catch {
        // ignore
      }
      alert("Notes saved.");
    } catch (err) {
      logError(err);
      const msg = supabaseErrorMessage(err);
      console.error("[notes] save failed", {
        table: getNotesTableName(),
        category: activeCategory,
        message: msg,
        err,
      });
      alert(
        `Failed to save notes.\n\n${msg}\n\nIf this persists, check the browser console for [notes] logs and confirm your Supabase table name matches (default: notes).`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen min-w-0 bg-slate-950 px-4 py-6 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="text-4xl font-bold">Notes</h1>
          <p className="mt-3 text-zinc-400">
            Organised notes for traders: plan your week, track watchlists, and save
            lessons you can repeat.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400/90">
                Note category
              </p>
              <div className="flex flex-wrap gap-2">
                {NOTE_CATEGORIES.map((cat) => {
                  const isActive = cat === activeCategory;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        isActive
                          ? "border-sky-500/60 bg-sky-500/15 text-sky-200"
                          : "border-white/10 bg-black/30 text-zinc-300 hover:border-sky-400/40 hover:text-sky-200"
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">{activeLabel}</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {CATEGORY_HELP[activeCategory]}
                  </p>
                </div>
                <div className="text-right">
                  {lastSavedAt ? (
                    <p className="text-[11px] text-zinc-500">
                      Saved {new Date(lastSavedAt).toLocaleString("en-GB")}
                    </p>
                  ) : (
                    <p className="text-[11px] text-zinc-500">
                      {loading ? "Loading…" : "Ready"}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <textarea
                  value={activeContent}
                  onChange={(e) =>
                    setContentByCategory((prev) => ({
                      ...prev,
                      [activeCategory]: e.target.value,
                    }))
                  }
                  placeholder={CATEGORY_PLACEHOLDERS[activeCategory]}
                  className="min-h-[220px] w-full resize-none rounded-xl bg-zinc-900 px-3 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-zinc-500"
                  disabled={loading || saving}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={loading || saving}
                  onClick={() => setContentByCategory((prev) => ({ ...prev, [activeCategory]: "" }))}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/5 disabled:opacity-50"
                >
                  Clear
                </button>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={loading || saving}
                    onClick={() => void handleSave()}
                    className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save notes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <p className="text-[11px] text-zinc-500">
          Notes are stored per account (private to you). Not financial advice.
        </p>
      </div>
    </main>
  );
}

