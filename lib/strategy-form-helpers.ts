import type { StrategyFormFields } from "@/lib/strategy-session-draft";
import type { ChecklistItem, Strategy } from "@/lib/supabase/strategies";

export function newConfluenceRowKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `cf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Ensures each row has a stable client key so reordering does not swap React state. */
export function withConfluenceRowKeys(items: ChecklistItem[]): ChecklistItem[] {
  return items.map((item) =>
    item._rowKey && typeof item._rowKey === "string"
      ? item
      : { ...item, _rowKey: newConfluenceRowKey() },
  );
}

export function blankConfluence(): ChecklistItem {
  return {
    text: "",
    timeframe: "",
    image: undefined,
    weight: 1,
    critical: false,
    _rowKey: newConfluenceRowKey(),
  };
}

/** One blank confluence row — use for new strategy drafts. */
export function emptyStrategyFormFields(): StrategyFormFields {
  return {
    name: "",
    description: "",
    market: "",
    timeframes: "",
    checklistItems: [blankConfluence()],
  };
}

export function normaliseChecklistFromStrategy(
  checklist: Strategy["checklist"],
): ChecklistItem[] {
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

export function snapshotFormFromStrategy(s: Strategy): StrategyFormFields {
  return {
    name: s.name,
    description: s.description,
    market: s.market,
    timeframes: s.timeframes,
    checklistItems: withConfluenceRowKeys(
      normaliseChecklistFromStrategy(s.checklist),
    ),
  };
}
