"use client";

import { useCallback, useEffect, useRef, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getStrategiesKey } from "@/lib/storage-keys";
import { createClient } from "@/lib/supabase/client";
import { logError } from "@/lib/log-error";
import {
  clearStrategyDraftFromSession,
  readStrategyDraftForEditPage,
  writeStrategyDraftToSession,
  type StrategyFormFields,
} from "@/lib/strategy-session-draft";
import {
  fetchStrategyById,
  updateStrategy,
  type Strategy,
  type ChecklistItem,
} from "@/lib/supabase/strategies";
import { uploadChecklistImage } from "@/lib/supabase/checklist-images";
import { chooseDraftSource } from "@/lib/draft-conflict";
import {
  fetchUserDraft,
  upsertUserDraft,
  deleteUserDraft,
} from "@/lib/supabase/user-drafts";
import { resolveChecklistImageRefs } from "@/lib/supabase/checklist-images";
import BackButton from "@/components/BackButton";
import PageContainer from "@/components/PageContainer";
import AppButton from "@/components/AppButton";
import ScreenshotLightbox from "@/components/ScreenshotLightbox";

/** Standard timeframe options for the picker; any number can be attached per confluence. */
const TF_PRESETS = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1H",
  "2H",
  "4H",
  "1D",
  "1W",
] as const;

/** Delimiter for multiple timeframes in the single checklist `timeframe` field (schema unchanged). */
const TF_TAG_SEP = " · ";

function parseTimeframeTags(raw: string): string[] {
  const s = raw.trim();
  if (!s) return [];
  return s
    .split(TF_TAG_SEP)
    .map((t) => t.trim())
    .filter(Boolean);
}

function joinTimeframeTags(tags: string[]): string {
  return tags
    .map((t) => t.trim())
    .filter(Boolean)
    .join(TF_TAG_SEP);
}

type MockGenerateInput = {
  summary: string;
  scratchNotes: string;
  /** From Notes & saved details */
  market: string;
  /** Strategy-level timeframes summary (saved details) */
  timeframes: string;
  checklistItems: ChecklistItem[];
};

/** Optional summary polish from mock — swap for real AI later; not shown unless needed. */
type MockGenerateStrategyResult = {
  keyPoints: string[];
  summarySuggestion?: string;
};

const GENERIC_KEY_POINT_PAD = [
  "Skip the trade if HTF bias and LTF trigger disagree.",
  "Size only after the full checklist is satisfied — no partial-stack gambles.",
  "Reassess if volatility spikes or structure invalidates before fill.",
] as const;

function hasMaterialForKeyPointGenerate(
  description: string,
  scratchNotes: string,
  market: string,
  timeframes: string,
  checklistItems: ChecklistItem[],
): boolean {
  if (description.trim().length >= 20) return true;
  if (scratchNotes.trim().length >= 20) return true;
  if (market.trim().length > 0) return true;
  if (timeframes.trim().length >= 8) return true;
  return checklistItems.some((i) => i.text.trim().length >= 3);
}

/**
 * Rule-based mock: execution-focused key points from summary + confluences.
 * Replace with a real model when ready — local state only, not persisted.
 */
function mockGenerateStrategyKeyPoints(
  input: MockGenerateInput,
): MockGenerateStrategyResult {
  const summary = input.summary.trim();
  const notes = input.scratchNotes.trim();
  const market = input.market.trim();
  const tfSummary = input.timeframes.trim();
  const filled = input.checklistItems.filter((i) => i.text.trim());

  const savedDetails = [
    market ? `Market: ${market}` : "",
    tfSummary ? `Timeframes (saved): ${tfSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const blob = [
    summary,
    notes,
    savedDetails,
    filled.map((c) => c.text.trim()).join(" "),
  ]
    .filter(Boolean)
    .join("\n\n");
  const lower = blob.toLowerCase();

  const points: string[] = [];
  const seen = new Set<string>();

  function push(p: string) {
    const k = p.toLowerCase().replace(/\s+/g, " ").slice(0, 160);
    if (k.length < 10 || seen.has(k)) return;
    seen.add(k);
    points.push(p);
  }

  if (market) {
    push(
      `Run this playbook on ${market} — keep sizing and session expectations appropriate for that market.`,
    );
  }
  if (tfSummary) {
    push(
      `HTF vs LTF framing from saved details: ${tfSummary} — align entries with that split.`,
    );
  }

  for (const c of filled) {
    const tag = c.critical ? "Critical" : "Confirm";
    const tf = c.timeframe.trim();
    const tfPart = tf ? ` — ${tf}` : "";
    push(`${tag}: ${c.text.trim()}${tfPart}`);
  }

  if (
    /\bbullish\b|\blong bias\b|\blongs?\b|\bbuy\b/i.test(blob) &&
    !points.some((p) => /long|bullish|buy/i.test(p))
  ) {
    push("Only take longs when higher-timeframe bias clearly supports upside.");
  }
  if (
    /\bbearish\b|\bshort bias\b|\bshorts?\b|\bsell\b/i.test(blob) &&
    !points.some((p) => /short|bearish|sell/i.test(p))
  ) {
    push(
      "Only take shorts when higher-timeframe bias clearly supports downside.",
    );
  }
  if (
    /\baoi\b|area of interest|order block|\bob\b|fvg|supply|demand|zone/i.test(
      lower,
    )
  ) {
    push("Demand a clean AOI / zone — no entries in random mid-range chop.");
  }
  if (/\bliquidity|sweep|ssl|bsl|equal\s*high|equal\s*low/i.test(lower)) {
    push(
      "Liquidity sweep or engineered high/low should precede directional commitment.",
    );
  }
  if (/\bbos\b|break of structure|choch|change of character/i.test(lower)) {
    push(
      "Require structure confirmation (BOS/CHOCH) in trade direction before entry.",
    );
  }
  if (/\bdisplacement\b|impulse|strong candle/i.test(lower)) {
    push(
      "Displacement or decisive impulse must validate the move — no fade on weak prints.",
    );
  }
  if (/\bretest|rejection|mitigation/i.test(lower)) {
    push(
      "Prefer retest or mitigation of the level after sweep/BOS when applicable.",
    );
  }
  if (/\b1\s*:\s*\d|risk.?to.?reward|risk.?reward|\brr\b|target/i.test(lower)) {
    const m = blob.match(/\b1\s*:\s*(\d+(?:\.\d+)?)\b/i);
    push(
      m
        ? `Hold out for at least ~1:${m[1]} R:R; pass if reward is fuzzy.`
        : "Define minimum R:R and targets before entry — skip marginal payoffs.",
    );
  }
  if (/\bstop\b|invalidation|below the|above the.*structure/i.test(lower)) {
    push("Stops beyond structural invalidation, not inside noise.");
  }
  if (
    /\b15m|\b5m|\b1\s*h\b|\b4h|\b1d|\bdaily|\bhtf|\bltf|timeframe/i.test(lower)
  ) {
    push("Bias on HTF; trigger and manage on the agreed execution timeframe.");
  }
  if (/\blondon\b|\bnew york\b|\bny\b|\basia\b|session/i.test(lower)) {
    push("Trade during liquid sessions that match this playbook.");
  }

  if (points.length < 4) {
    const sentences = summary
      .split(/[.!?\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 20 && s.length <= 140);
    for (const s of sentences) {
      if (points.length >= 4) break;
      push(`Rule: ${s}`);
    }
  }
  let padI = 0;
  while (points.length < 4 && padI < GENERIC_KEY_POINT_PAD.length) {
    push(GENERIC_KEY_POINT_PAD[padI]);
    padI += 1;
  }

  return { keyPoints: points.slice(0, 8) };
}

const inputClass =
  "w-full min-w-0 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-sky-500/40";
const rowClass =
  "min-w-0 max-w-full overflow-hidden rounded-lg border border-white/[0.06] bg-zinc-950/40 p-3 sm:p-4";
const hintClass = "text-[11px] text-zinc-500";

/** Compact actions on each confluence card (reorder / insert / remove). */
const confluenceActionBtnClass =
  "inline-flex min-h-9 min-w-0 shrink-0 items-center justify-center rounded-md border border-white/10 bg-zinc-950/60 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:border-white/20 hover:bg-zinc-900 hover:text-white disabled:pointer-events-none disabled:opacity-35 sm:min-h-8";

/** Shared label for Score / Timeframes / Critical metadata blocks */
const metadataLabelClass =
  "mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400";

/** Base shell for metadata cards (Score uses accent variants on top of this) */
const metadataShellBase =
  "min-w-0 rounded-lg border px-3 py-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]";

const generateBtnClass =
  "shrink-0 rounded-lg border border-violet-400/35 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-500/20 disabled:opacity-40 sm:px-4";

const keyPointsSecondaryBtnClass =
  "shrink-0 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-xs font-medium text-zinc-400 hover:border-white/20 hover:text-zinc-200 disabled:opacity-40 sm:px-4";

function confluenceScoreStyles(weight: unknown): {
  w: number;
  shellClass: string;
  valueClass: string;
} {
  const w = Number.isFinite(Number(weight)) ? Number(weight) : 1;
  const shellClass =
    w >= 4
      ? "border-amber-400/35 bg-amber-500/[0.07] shadow-[0_0_0_1px_rgba(251,191,36,0.08)]"
      : w >= 2
        ? "border-sky-400/25 bg-sky-500/[0.06]"
        : "border-white/10 bg-black/40";
  const valueClass =
    w >= 4 ? "text-amber-100" : w >= 2 ? "text-sky-100" : "text-zinc-100";
  return { w, shellClass, valueClass };
}

type TimeframeTagsEditorProps = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
};

function TimeframeTagsEditor({
  value,
  onChange,
  disabled,
}: TimeframeTagsEditorProps) {
  const tags = parseTimeframeTags(value);
  const [custom, setCustom] = useState("");
  const [timeframeSelectKey, setTimeframeSelectKey] = useState(0);

  function setTags(next: string[]) {
    onChange(joinTimeframeTags(next));
  }

  function addTag(t: string) {
    const x = t.trim();
    if (!x) return;
    const lower = x.toLowerCase();
    if (tags.some((a) => a.toLowerCase() === lower)) return;
    setTags([...tags, x]);
  }

  function removeAt(i: number) {
    setTags(tags.filter((_, j) => j !== i));
  }

  const innerSelectClass =
    "w-full min-w-0 rounded-md border border-white/10 bg-zinc-950/90 px-2 py-2.5 text-xs font-medium text-white outline-none focus:border-sky-500/40 sm:w-[7.5rem] sm:shrink-0 sm:py-2";
  const innerInputClass =
    "min-h-[44px] min-w-0 flex-1 rounded-md border border-white/10 bg-zinc-950/90 px-2.5 py-2 text-xs font-medium text-white outline-none placeholder:text-zinc-600 focus:border-sky-500/40 sm:min-h-0";

  return (
    <div
      className={`${metadataShellBase} min-h-0 max-w-full border-white/10 bg-black/40`}
    >
      <span className={`${metadataLabelClass} text-left`}>
        Valid timeframes
      </span>
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
        {tags.length === 0 ? (
          <span className="text-[11px] font-medium text-zinc-500">
            None selected — optional critical rule context
          </span>
        ) : null}
        {tags.map((tag, i) => (
          <span
            key={`${i}-${tag}`}
            className="inline-flex max-w-full min-h-9 items-center gap-1 rounded-md border border-sky-500/25 bg-sky-500/[0.08] px-2.5 py-1 text-xs font-semibold tracking-tight text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.06)]"
          >
            <span className="min-w-0 truncate">{tag}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeAt(i)}
              className="flex h-7 min-h-[28px] w-7 min-w-[28px] shrink-0 items-center justify-center rounded text-sm font-bold leading-none text-sky-200/80 hover:bg-red-500/20 hover:text-red-200 disabled:opacity-40"
              aria-label={`Remove timeframe ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {!disabled ? (
        <div className="mt-3 flex min-w-0 max-w-full flex-col gap-2 border-t border-white/[0.06] pt-3 sm:flex-row sm:flex-wrap sm:items-stretch">
          <select
            key={timeframeSelectKey}
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) {
                addTag(v);
                setTimeframeSelectKey((k) => k + 1);
              }
            }}
            className={innerSelectClass}
            aria-label="Add standard timeframe"
          >
            <option value="">Timeframe…</option>
            {TF_PRESETS.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>
          <div className="flex min-w-0 max-w-full flex-[1_1_12rem] items-stretch gap-2">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(custom);
                  setCustom("");
                }
              }}
              placeholder="Custom label"
              className={innerInputClass}
              aria-label="Custom timeframe"
            />
            <button
              type="button"
              onClick={() => {
                addTag(custom);
                setCustom("");
              }}
              className="min-h-[44px] shrink-0 rounded-md border border-sky-500/35 bg-sky-500/15 px-3 text-xs font-semibold text-sky-100 hover:bg-sky-500/25 sm:min-h-0 sm:py-2"
            >
              Add
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function normaliseChecklist(checklist: Strategy["checklist"]): ChecklistItem[] {
  if (!checklist || checklist.length === 0)
    return [
      { text: "", timeframe: "", image: undefined, weight: 1, critical: false },
    ];
  return checklist.map((item) =>
    typeof item === "string"
      ? {
          text: item,
          timeframe: "",
          image: undefined,
          weight: 1,
          critical: false,
        }
      : {
          text: item.text ?? "",
          timeframe: item.timeframe ?? "",
          image: item.image,
          imageRef: item.imageRef,
          weight: Number.isFinite(Number(item.weight))
            ? Number(item.weight)
            : 1,
          critical: Boolean(item.critical),
        },
  );
}

function newConfluenceRowKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `cf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Ensures each row has a stable client key so reordering does not swap React state. */
function withConfluenceRowKeys(items: ChecklistItem[]): ChecklistItem[] {
  return items.map((item) =>
    item._rowKey && typeof item._rowKey === "string"
      ? item
      : { ...item, _rowKey: newConfluenceRowKey() },
  );
}

function blankConfluence(): ChecklistItem {
  return {
    text: "",
    timeframe: "",
    image: undefined,
    weight: 1,
    critical: false,
    _rowKey: newConfluenceRowKey(),
  };
}

function snapshotFromStrategy(s: Strategy): StrategyFormFields {
  return {
    name: s.name,
    description: s.description,
    market: s.market,
    timeframes: s.timeframes,
    checklistItems: withConfluenceRowKeys(normaliseChecklist(s.checklist)),
  };
}

type EditStrategyFormLoadedProps = {
  strategy: Strategy;
  strategiesKey: string;
  supabase: ReturnType<typeof createClient>;
  user: ReturnType<typeof useAuth>["user"];
};

function EditStrategyFormLoaded({
  strategy,
  strategiesKey,
  supabase,
  user,
}: EditStrategyFormLoadedProps) {
  const router = useRouter();
  const [form, setForm] = useState<StrategyFormFields>(() =>
    snapshotFromStrategy(strategy),
  );
  /** Extra context for mock generator — not persisted */
  const [scratchNotes, setScratchNotes] = useState("");
  /** Mock key points — local only, refreshed by Generate */
  const [generatedKeyPoints, setGeneratedKeyPoints] = useState<string[]>([]);
  /** Soft validation when Generate has nothing useful to read */
  const [generateFeedback, setGenerateFeedback] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  const skipNextStrategyPersistRef = useRef(false);
  const persistTimerRef = useRef<number | null>(null);
  const strategyRef = useRef(strategy);
  strategyRef.current = strategy;
  const { name, description, market, timeframes, checklistItems } = form;
  const [isSaving, setIsSaving] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [screenshotLightbox, setScreenshotLightbox] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  const missingName = !name.trim();
  const canAttemptGenerate = hasMaterialForKeyPointGenerate(
    description,
    scratchNotes,
    market,
    timeframes,
    checklistItems,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = strategyRef.current;
    const baseline = snapshotFromStrategy(s);
    const fromSession = readStrategyDraftForEditPage(s.id, baseline);
    if (supabase && user?.id) {
      fetchUserDraft(supabase, user.id, `strategy:edit:${s.id}:draft`)
        .then(async (row) => {
          const serverPayload = row?.payload as Record<string, unknown> | null;
          const server =
            serverPayload && typeof serverPayload === "object"
              ? serverPayload
              : null;

          const which = chooseDraftSource({
            localUpdatedAt:
              (fromSession as { updatedAt?: string })?.updatedAt ?? null,
            serverUpdatedAt: row?.updatedAt ?? null,
          });

          const candidate =
            which === "server"
              ? server
              : which === "local"
                ? fromSession
                : (server ?? fromSession);

          if (candidate) {
            const next = { ...baseline, ...candidate } as StrategyFormFields;
            next.checklistItems = withConfluenceRowKeys(
              next.checklistItems.length > 0
                ? next.checklistItems
                : baseline.checklistItems,
            );
            const refs = next.checklistItems
              .map((i) => (i as ChecklistItem).imageRef)
              .filter(Boolean) as string[];
            if (refs.length > 0) {
              try {
                const byRef = await resolveChecklistImageRefs(supabase, refs);
                next.checklistItems = next.checklistItems.map((i) => {
                  const it = i as ChecklistItem;
                  return {
                    ...it,
                    image: it.imageRef
                      ? (byRef[it.imageRef] ?? it.image)
                      : it.image,
                  };
                });
              } catch {
                // ignore
              }
            }
            setForm(next);
          }
        })
        .catch(logError)
        .finally(() => setHydrated(true));
      return;
    }

    if (fromSession) {
      const items =
        fromSession.checklistItems.length > 0
          ? fromSession.checklistItems
          : baseline.checklistItems;
      setForm({
        ...fromSession,
        checklistItems: withConfluenceRowKeys(items),
      });
    }
    setHydrated(true);
  }, [strategy.id, supabase, user]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    if (skipNextStrategyPersistRef.current) {
      skipNextStrategyPersistRef.current = false;
      return;
    }
    writeStrategyDraftToSession({
      mode: "edit",
      strategyId: strategy.id,
      ...form,
    });

    if (supabase && user?.id) {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = window.setTimeout(() => {
        const payload = {
          ...form,
          checklistItems: form.checklistItems.map((i) => ({
            ...i,
            image: i.imageRef ? undefined : i.image,
          })),
        };
        upsertUserDraft(
          supabase,
          user.id,
          `strategy:edit:${strategy.id}:draft`,
          payload,
        ).catch(logError);
      }, 600);
    }
  }, [hydrated, form, strategy.id, supabase, user]);

  const resetFormDraft = useCallback(() => {
    skipNextStrategyPersistRef.current = true;
    setForm(snapshotFromStrategy(strategy));
    setScratchNotes("");
    setGeneratedKeyPoints([]);
    setGenerateFeedback(null);
    setSaveAttempted(false);
    clearStrategyDraftFromSession({ editStrategyId: strategy.id });
    if (supabase && user?.id) {
      deleteUserDraft(
        supabase,
        user.id,
        `strategy:edit:${strategy.id}:draft`,
      ).catch(logError);
    }
  }, [strategy, supabase, user]);

  function runGenerate() {
    if (!canAttemptGenerate) {
      setGenerateFeedback(
        "Add a strategy summary (about 20+ characters), optional scratch notes, and/or at least one confluence with text — then generate key points.",
      );
      return;
    }
    setGenerateFeedback(null);
    setIsGenerating(true);
    window.setTimeout(() => {
      const { keyPoints } = mockGenerateStrategyKeyPoints({
        summary: description,
        scratchNotes,
        market,
        timeframes,
        checklistItems,
      });
      setGeneratedKeyPoints(keyPoints.length > 0 ? keyPoints : []);
      if (keyPoints.length === 0) {
        setGenerateFeedback(
          "Could not distill key points from the current text. Add more detail and try again.",
        );
      }
      setIsGenerating(false);
    }, 380);
  }

  function clearKeyPoints() {
    setGeneratedKeyPoints([]);
    setGenerateFeedback(null);
  }

  function updateChecklistItem(index: number, value: string) {
    setForm((f) => ({
      ...f,
      checklistItems: f.checklistItems.map((item, i) =>
        i === index ? { ...item, text: value } : item,
      ),
    }));
  }

  function addConfluence() {
    setForm((f) => ({
      ...f,
      checklistItems: [...f.checklistItems, blankConfluence()],
    }));
  }

  function removeConfluence(index: number) {
    setForm((f) => ({
      ...f,
      checklistItems:
        f.checklistItems.length === 1
          ? f.checklistItems
          : f.checklistItems.filter((_, i) => i !== index),
    }));
  }

  function moveConfluenceUp(index: number) {
    if (index <= 0) return;
    setForm((f) => {
      const items = [...f.checklistItems];
      [items[index - 1], items[index]] = [items[index], items[index - 1]];
      return { ...f, checklistItems: items };
    });
  }

  function moveConfluenceDown(index: number) {
    setForm((f) => {
      if (index >= f.checklistItems.length - 1) return f;
      const items = [...f.checklistItems];
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
      return { ...f, checklistItems: items };
    });
  }

  function insertConfluenceAt(index: number) {
    setForm((f) => ({
      ...f,
      checklistItems: [
        ...f.checklistItems.slice(0, index),
        blankConfluence(),
        ...f.checklistItems.slice(index),
      ],
    }));
  }

  function updateTimeframe(index: number, value: string) {
    setForm((f) => ({
      ...f,
      checklistItems: f.checklistItems.map((item, i) =>
        i === index ? { ...item, timeframe: value } : item,
      ),
    }));
  }

  function updateCriticalRule(index: number, value: boolean) {
    setForm((f) => ({
      ...f,
      checklistItems: f.checklistItems.map((item, i) =>
        i === index ? { ...item, critical: value } : item,
      ),
    }));
  }

  function updateConfluenceWeight(index: number, value: string) {
    const nextWeight = Number(value);
    setForm((f) => ({
      ...f,
      checklistItems: f.checklistItems.map((item, i) =>
        i === index
          ? {
              ...item,
              weight: Number.isFinite(nextWeight) ? nextWeight : 1,
            }
          : item,
      ),
    }));
  }

  function bumpConfluenceWeight(index: number, delta: number) {
    setForm((f) => ({
      ...f,
      checklistItems: f.checklistItems.map((item, i) => {
        if (i !== index) return item;
        const w = Number.isFinite(Number(item.weight))
          ? Number(item.weight)
          : 1;
        return { ...item, weight: Math.max(0, w + delta) };
      }),
    }));
  }

  async function handleChecklistImageChange(
    index: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (supabase && user) {
        const uploaded = await uploadChecklistImage(supabase, user.id, file);
        setForm((f) => ({
          ...f,
          checklistItems: f.checklistItems.map((item, i) =>
            i === index
              ? {
                  ...item,
                  image: uploaded.signedUrl,
                  imageRef: uploaded.imageRef,
                }
              : item,
          ),
        }));
        return;
      }
    } catch (err) {
      logError(err);
      alert("Failed to upload screenshot. Try again.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setForm((f) => ({
        ...f,
        checklistItems: f.checklistItems.map((item, i) =>
          i === index ? { ...item, image: result, imageRef: undefined } : item,
        ),
      }));
    };
    reader.readAsDataURL(file);
  }

  function removeChecklistScreenshot(index: number) {
    setForm((f) => ({
      ...f,
      checklistItems: f.checklistItems.map((item, i) =>
        i === index ? { ...item, image: undefined, imageRef: undefined } : item,
      ),
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveAttempted(true);
    if (!name.trim()) {
      alert("Please add a strategy name.");
      return;
    }

    setIsSaving(true);
    try {
      const serverChecklist = checklistItems
        .map((item) => ({
          text: item.text.trim(),
          timeframe: item.timeframe.trim(),
          image: item.imageRef ?? item.image,
          imageRef: item.imageRef,
          weight: item.weight,
          critical: item.critical,
        }))
        .filter((item) => item.text.length > 0);
      const localChecklist = checklistItems
        .map((item) => ({
          text: item.text.trim(),
          timeframe: item.timeframe.trim(),
          image: item.image,
          imageRef: item.imageRef,
          weight: item.weight,
          critical: item.critical,
        }))
        .filter((item) => item.text.length > 0);

      if (supabase && user) {
        await updateStrategy(supabase, strategy.id, {
          name: name.trim(),
          description: description.trim(),
          market: market.trim(),
          timeframes: timeframes.trim(),
          checklist: serverChecklist,
        });
      } else {
        const updatedStrategy: Strategy = {
          ...strategy,
          name: name.trim(),
          description: description.trim(),
          market: market.trim(),
          timeframes: timeframes.trim(),
          checklist: localChecklist,
        };
        const raw = window.localStorage.getItem(strategiesKey);
        const all = raw ? (JSON.parse(raw) as Strategy[]) : [];
        const next = all.map((s) =>
          s.id === strategy.id ? updatedStrategy : s,
        );
        window.localStorage.setItem(strategiesKey, JSON.stringify(next));
      }

      resetFormDraft();
      router.push("/strategies");
    } catch (err) {
      logError(err);
      alert("Failed to save strategy. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const ringName =
    saveAttempted && missingName ? "ring-1 ring-amber-500/30" : "";

  const filledConfluences = checklistItems.filter((i) => i.text.trim()).length;

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="mt-8 min-w-0 max-w-full space-y-8 overflow-x-hidden sm:mt-10 sm:space-y-10"
      >
        <div className="min-w-0 max-w-full space-y-2">
          <label
            className={`${hintClass} block font-medium uppercase tracking-[0.12em] text-zinc-400`}
          >
            Strategy name
          </label>
          <input
            value={name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={`${inputClass} max-w-full text-[15px] ${ringName}`}
            placeholder="e.g. AOI × ICC"
            autoComplete="off"
          />
          {saveAttempted && missingName ? (
            <p className="text-[11px] text-amber-200/80">
              Name is required to save.
            </p>
          ) : null}
        </div>

        <div className="min-w-0 max-w-full space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Strategy summary
          </h2>
          <textarea
            value={description}
            onChange={(e) => {
              setForm((f) => ({ ...f, description: e.target.value }));
              if (generateFeedback) setGenerateFeedback(null);
            }}
            rows={5}
            className={`${inputClass} resize-y text-[15px] leading-relaxed`}
            placeholder="High-level playbook: bias, what you wait for, how you execute — saved with this strategy."
          />
        </div>

        <div className="min-w-0 max-w-full space-y-2">
          <div className="flex min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Key points
            </h2>
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={runGenerate}
                disabled={isGenerating}
                className={generateBtnClass}
              >
                {isGenerating
                  ? "Generating…"
                  : generatedKeyPoints.length > 0
                    ? "Regenerate"
                    : "Generate"}
              </button>
              <button
                type="button"
                onClick={clearKeyPoints}
                disabled={generatedKeyPoints.length === 0 || isGenerating}
                className={keyPointsSecondaryBtnClass}
              >
                Remove
              </button>
            </div>
          </div>
          <p className={hintClass}>
            Mock helper: builds 4–8 execution-focused bullets from your summary,
            Notes & saved details (scratch notes, market, timeframes), and
            confluence rows. Regenerate refreshes the list; Remove clears it.
            Not saved to the server.
          </p>
          {generateFeedback ? (
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-100/90">
              {generateFeedback}
            </p>
          ) : null}
          {generatedKeyPoints.length > 0 ? (
            <ul className="space-y-1.5 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 sm:px-3.5 sm:py-3">
              {generatedKeyPoints.map((line, i) => (
                <li
                  key={`${i}-${line.slice(0, 24)}`}
                  className="flex min-w-0 max-w-full gap-2 text-[13px] leading-snug text-zinc-200"
                >
                  <span
                    className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400/70"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">{line}</span>
                </li>
              ))}
            </ul>
          ) : !generateFeedback ? (
            <p className="text-[11px] text-zinc-600">
              No key points yet — use Generate after you write a short summary
              and/or confluences.
            </p>
          ) : null}
        </div>

        <p className="text-xs text-zinc-500">
          {filledConfluences > 0
            ? `${filledConfluences} confluence${filledConfluences === 1 ? "" : "s"} in your checklist.`
            : "Add confluences below — they save as your checklist."}
        </p>

        <div className="min-w-0 space-y-3">
          <div className="flex min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
            <div className="min-w-0 max-w-full">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Confluences
              </h2>
              <p className={`${hintClass} mt-1 max-w-xl`}>
                Order matches your execution sequence — use Up/Down on each card,
                or Add above/below to insert steps. + Add confluence appends at
                the bottom. Score, timeframes, critical flag, notes, and
                screenshots stay with each row when you reorder.
              </p>
            </div>
            <button
              type="button"
              onClick={addConfluence}
              className="shrink-0 self-start rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-500/15 sm:self-auto"
            >
              + Add confluence
            </button>
          </div>

          <ul className="min-w-0 max-w-full space-y-2">
            {checklistItems.map((item, index) => {
              const score = confluenceScoreStyles(item.weight);
              const rowKey = item._rowKey ?? `idx-${index}`;
              const isFirst = index === 0;
              const isLast = index === checklistItems.length - 1;
              return (
                <li key={rowKey} className={rowClass}>
                  <div className="grid min-w-0 max-w-full grid-cols-1 gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:gap-3 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-4">
                    <div className="min-w-0 max-w-full">
                      <div className="min-w-0 max-w-full">
                        {item.image ? (
                          <button
                            type="button"
                            onClick={() =>
                              setScreenshotLightbox({
                                src: item.image!,
                                alt: `Confluence ${index + 1}`,
                              })
                            }
                            className="flex max-h-[180px] w-full max-w-full min-w-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/40 md:max-h-[200px] lg:max-h-[220px]"
                          >
                            <img
                              src={item.image}
                              alt=""
                              className="max-h-[180px] max-w-full object-contain md:max-h-[200px] lg:max-h-[220px]"
                            />
                          </button>
                        ) : (
                          <label className="flex max-h-[180px] min-h-[90px] w-full max-w-full min-w-0 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/12 bg-zinc-950/60 p-2 text-center md:max-h-[200px] lg:max-h-[220px]">
                            <span className="text-[10px] leading-tight text-zinc-500">
                              Add screenshot
                            </span>
                            <input
                              key={`n-${rowKey}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleChecklistImageChange(index, e)
                              }
                            />
                          </label>
                        )}
                        {item.image ? (
                          <div className="mt-2 flex min-w-0 max-w-full flex-wrap items-center gap-1.5 gap-y-1">
                            <label className="min-w-0 cursor-pointer text-[10px] text-sky-300/90">
                              <span className="inline-block rounded border border-sky-500/40 bg-sky-500/10 px-2 py-0.5">
                                Change
                              </span>
                              <input
                                key={`img-${rowKey}`}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleChecklistImageChange(index, e)
                                }
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => removeChecklistScreenshot(index)}
                              className="shrink-0 text-[10px] text-red-300/80 hover:text-red-200"
                            >
                              Remove
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex min-w-0 max-w-full flex-col gap-3 md:gap-4">
                      <textarea
                        value={item.text}
                        onChange={(e) =>
                          updateChecklistItem(index, e.target.value)
                        }
                        placeholder="Critical confluence rule — e.g. Liquidity sweep confirmed"
                        rows={2}
                        className={`${inputClass} min-h-[90px] min-w-0 max-h-[140px] w-full max-w-full resize-y sm:max-h-[160px] lg:max-h-[180px]`}
                      />

                      <div className="flex min-w-0 max-w-full flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-4">
                        <div
                          className={`${metadataShellBase} flex w-full min-w-0 shrink-0 flex-col items-stretch lg:w-[12.5rem] lg:max-w-[13.5rem] ${score.shellClass}`}
                        >
                          <span className={`${metadataLabelClass} text-center`}>
                            Score
                          </span>
                          <div className="flex min-w-0 items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => bumpConfluenceWeight(index, -1)}
                              className="flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-md border border-white/10 bg-zinc-950/80 text-lg font-semibold leading-none text-zinc-300 hover:border-white/20 hover:bg-zinc-900 hover:text-white sm:h-10 sm:min-h-0 sm:w-10 sm:min-w-0"
                              aria-label="Decrease score"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              step={1}
                              value={score.w}
                              onChange={(e) =>
                                updateConfluenceWeight(index, e.target.value)
                              }
                              className={`h-11 min-h-[44px] min-w-0 flex-1 rounded-md border border-white/10 bg-zinc-950/90 py-2 text-center text-lg font-semibold tabular-nums outline-none [appearance:textfield] [-moz-appearance:textfield] focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 sm:h-10 sm:min-h-0 sm:w-[4.5rem] sm:flex-none sm:text-base [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${score.valueClass}`}
                              aria-label={`Checklist score for confluence ${index + 1}`}
                            />
                            <button
                              type="button"
                              onClick={() => bumpConfluenceWeight(index, 1)}
                              className="flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-md border border-white/10 bg-zinc-950/80 text-lg font-semibold leading-none text-zinc-300 hover:border-white/20 hover:bg-zinc-900 hover:text-white sm:h-10 sm:min-h-0 sm:w-10 sm:min-w-0"
                              aria-label="Increase score"
                            >
                              +
                            </button>
                          </div>
                          <span className="mt-2 text-center text-[10px] font-medium text-zinc-500">
                            Checklist points
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <TimeframeTagsEditor
                            value={item.timeframe}
                            onChange={(next) => updateTimeframe(index, next)}
                          />
                        </div>

                        <div
                          className={`${metadataShellBase} flex w-full min-w-0 shrink-0 flex-col border-white/10 bg-black/40 lg:w-[12.75rem] lg:max-w-[14rem] ${
                            item.critical
                              ? "border-amber-400/30 bg-amber-500/[0.07] shadow-[0_0_0_1px_rgba(251,191,36,0.06)]"
                              : ""
                          }`}
                        >
                          <span className={`${metadataLabelClass} text-center`}>
                            Critical rule
                          </span>
                          <div className="flex rounded-lg border border-white/10 bg-zinc-950/95 p-1">
                            <button
                              type="button"
                              onClick={() => updateCriticalRule(index, false)}
                              className={`min-h-11 flex-1 rounded-md py-2.5 text-xs font-semibold transition sm:min-h-0 sm:py-2 ${
                                !item.critical
                                  ? "bg-white/12 text-white shadow-[0_1px_0_0_rgba(255,255,255,0.06)]"
                                  : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                              }`}
                            >
                              Standard
                            </button>
                            <button
                              type="button"
                              onClick={() => updateCriticalRule(index, true)}
                              className={`min-h-11 flex-1 rounded-md py-2.5 text-xs font-semibold transition sm:min-h-0 sm:py-2 ${
                                item.critical
                                  ? "border border-amber-500/35 bg-amber-500/20 text-amber-100 shadow-sm"
                                  : "text-zinc-500 hover:bg-amber-500/10 hover:text-amber-200/90"
                              }`}
                            >
                              Critical
                            </button>
                          </div>
                          <span className="mt-2 text-center text-[10px] leading-snug text-zinc-600">
                            Critical confluences must pass on the checklist
                          </span>
                        </div>
                      </div>

                      <div className="flex min-w-0 max-w-full flex-col gap-2 border-t border-white/[0.05] pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1.5 sm:gap-y-2">
                        <span
                          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 sm:mr-1"
                          aria-hidden
                        >
                          Step {index + 1}
                        </span>
                        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 gap-y-2">
                          <button
                            type="button"
                            onClick={() => moveConfluenceUp(index)}
                            disabled={isFirst}
                            className={confluenceActionBtnClass}
                            aria-label="Move this confluence up"
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveConfluenceDown(index)}
                            disabled={isLast}
                            className={confluenceActionBtnClass}
                            aria-label="Move this confluence down"
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            onClick={() => insertConfluenceAt(index)}
                            className={confluenceActionBtnClass}
                            aria-label="Add new confluence above this one"
                          >
                            Add above
                          </button>
                          <button
                            type="button"
                            onClick={() => insertConfluenceAt(index + 1)}
                            className={confluenceActionBtnClass}
                            aria-label="Add new confluence below this one"
                          >
                            Add below
                          </button>
                          <button
                            type="button"
                            onClick={() => removeConfluence(index)}
                            className={`${confluenceActionBtnClass} border-red-500/20 text-red-300/90 hover:border-red-500/35 hover:bg-red-950/40 hover:text-red-200`}
                            aria-label="Remove this confluence"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <details className="min-w-0 rounded-lg border border-white/[0.06] bg-zinc-950/30 [&_summary]:cursor-pointer [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden">
          <summary className="px-4 py-3 text-sm text-zinc-400 hover:text-zinc-200">
            Notes & saved details
          </summary>
          <div className="space-y-4 border-t border-white/[0.06] px-4 py-4">
            <div>
              <label className={`${hintClass} mb-1 block`}>
                Scratch notes (local only — fed into Key points with market &
                timeframes)
              </label>
              <textarea
                value={scratchNotes}
                onChange={(e) => setScratchNotes(e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Optional extra context for key point generation…"
              />
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <div>
                <label className={`${hintClass} mb-1 block`}>Market</label>
                <select
                  value={market}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, market: e.target.value }))
                  }
                  className={inputClass}
                >
                  <option value="">—</option>
                  <option value="Forex">Forex</option>
                  <option value="Stocks">Stocks</option>
                  <option value="Indices">Indices</option>
                  <option value="Commodities">Commodities</option>
                  <option value="Cryptocurrencies">Cryptocurrencies</option>
                  <option value="Bonds">Bonds</option>
                  <option value="Futures">Futures</option>
                  <option value="Options">Options</option>
                  <option value="ETFs">ETFs</option>
                  <option value="CFDs">CFDs</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={`${hintClass} mb-1 block`}>
                  Timeframes (summary)
                </label>
                <input
                  value={timeframes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, timeframes: e.target.value }))
                  }
                  className={inputClass}
                  placeholder="e.g. Daily bias, 15m execution"
                />
              </div>
            </div>
          </div>
        </details>

        <div className="flex min-w-0 flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <AppButton
            type="button"
            variant="secondary"
            onClick={resetFormDraft}
            className="w-full border-white/15 sm:w-auto"
          >
            Reset draft
          </AppButton>
          <AppButton
            type="submit"
            variant="primary"
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            {isSaving ? "Saving…" : "Save"}
          </AppButton>
        </div>
      </form>
      {screenshotLightbox ? (
        <ScreenshotLightbox
          src={screenshotLightbox.src}
          alt={screenshotLightbox.alt}
          onClose={() => setScreenshotLightbox(null)}
        />
      ) : null}
    </>
  );
}

export default function EditStrategyPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const supabaseClient = createClient();
  const strategiesKey = getStrategiesKey(user?.id);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id;
    if (!id) {
      setLoading(false);
      return;
    }
    if (supabaseClient && user) {
      fetchStrategyById(supabaseClient, id)
        .then((s) => {
          if (s) setStrategy(s);
        })
        .catch(logError)
        .finally(() => setLoading(false));
    } else if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(strategiesKey);
        const parsed = raw ? (JSON.parse(raw) as Strategy[]) : [];
        const found = parsed.find((s) => s.id === id);
        if (found) setStrategy(found);
      } catch {
        // ignore
      }
      setLoading(false);
    }
  }, [params.id, strategiesKey, supabaseClient, user]);

  if (loading || !strategy) {
    return (
      <main className="min-h-screen min-w-0 bg-black py-8 text-white sm:py-10">
        <PageContainer maxWidthClass="max-w-2xl">
          <p className="text-sm text-zinc-400">
            {loading ? "Loading strategy…" : "Strategy not found."}
          </p>
        </PageContainer>
      </main>
    );
  }

  return (
    <main className="min-h-screen min-w-0 bg-black py-8 text-white sm:py-10">
      <PageContainer maxWidthClass="max-w-2xl">
        <BackButton fallbackHref="/strategies" label="Back" />

        <header className="mt-6 min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit strategy
          </h1>
          <p className="text-sm text-zinc-500">
            Name and summary first, then optional key points (mock),
            confluences, and save.
          </p>
        </header>

        <EditStrategyFormLoaded
          key={strategy.id}
          strategy={strategy}
          strategiesKey={strategiesKey}
          supabase={supabaseClient}
          user={user}
        />
      </PageContainer>
    </main>
  );
}
