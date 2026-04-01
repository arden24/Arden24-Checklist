import type { ChecklistItem } from "@/lib/supabase/strategies";
import {
  ARDEN24_STRATEGY_DRAFT_KEY,
  LEGACY_STRATEGY_NEW_DRAFT_KEY,
} from "@/lib/session-draft-keys";

const SESSION_FORM_PREFIX = "arden24:session:v1:";

function sessionFormFullKey(key: string): string {
  return `${SESSION_FORM_PREFIX}${key}`;
}

export type StrategyFormFields = {
  name: string;
  description: string;
  market: string;
  timeframes: string;
  checklistItems: ChecklistItem[];
};

export type StrategyDraftEnvelope =
  | ({ mode: "new" } & StrategyFormFields)
  | ({ mode: "edit"; strategyId: string } & StrategyFormFields);

function safeParseRecord(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (v != null && typeof v === "object" && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function parseChecklistItems(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") {
      return {
        text: item,
        timeframe: "",
        image: undefined,
        weight: 1,
        critical: false,
      };
    }
    const o = item as Record<string, unknown>;
    return {
      text: typeof o.text === "string" ? o.text : "",
      timeframe: typeof o.timeframe === "string" ? o.timeframe : "",
      image: typeof o.image === "string" ? o.image : undefined,
      imageRef: typeof o.imageRef === "string" ? o.imageRef : undefined,
      weight: Number.isFinite(Number(o.weight)) ? Number(o.weight) : 1,
      critical: Boolean(o.critical),
    };
  });
}

function checklistWithDefaultRow(items: ChecklistItem[]): ChecklistItem[] {
  if (items.length > 0) return items;
  return [
    {
      text: "",
      timeframe: "",
      image: undefined,
      weight: 1,
      critical: false,
    },
  ];
}

function fieldsFromRecord(o: Record<string, unknown>): StrategyFormFields {
  const checklistItems = checklistWithDefaultRow(parseChecklistItems(o.checklistItems));
  return {
    name: typeof o.name === "string" ? o.name : "",
    description: typeof o.description === "string" ? o.description : "",
    market: typeof o.market === "string" ? o.market : "",
    timeframes: typeof o.timeframes === "string" ? o.timeframes : "",
    checklistItems,
  };
}

function mergeFormFields(
  partial: Partial<StrategyFormFields> & Record<string, unknown>,
  fallback: StrategyFormFields
): StrategyFormFields {
  const base = { ...fallback };
  if (typeof partial.name === "string") base.name = partial.name;
  if (typeof partial.description === "string") base.description = partial.description;
  if (typeof partial.market === "string") base.market = partial.market;
  if (typeof partial.timeframes === "string") base.timeframes = partial.timeframes;
  if (Array.isArray(partial.checklistItems)) {
    base.checklistItems = checklistWithDefaultRow(
      parseChecklistItems(partial.checklistItems)
    );
  }
  return base;
}

export function parseStrategyDraftEnvelope(
  raw: string | null
): StrategyDraftEnvelope | null {
  if (!raw) return null;
  try {
    const o = safeParseRecord(raw);
    if (!o) return null;
    const mode = o.mode;
    if (mode !== "new" && mode !== "edit") return null;
    const fields = fieldsFromRecord(o);
    if (mode === "edit") {
      if (typeof o.strategyId !== "string" || !o.strategyId.trim()) return null;
      return { mode: "edit", strategyId: o.strategyId, ...fields };
    }
    return { mode: "new", ...fields };
  } catch {
    return null;
  }
}

export function readStrategyDraftForNewPage(
  emptyDefault: StrategyFormFields
): StrategyFormFields | null {
  if (typeof window === "undefined") return null;

  const env = parseStrategyDraftEnvelope(
    sessionStorage.getItem(ARDEN24_STRATEGY_DRAFT_KEY)
  );
  if (env?.mode === "new") {
    const { mode: _m, ...fields } = env;
    return fields;
  }

  const legacy = safeParseRecord(
    sessionStorage.getItem(LEGACY_STRATEGY_NEW_DRAFT_KEY)
  );
  if (legacy && Object.keys(legacy).length > 0) {
    const merged = mergeFormFields(legacy, emptyDefault);
    writeStrategyDraftToSession({ mode: "new", ...merged });
    try {
      sessionStorage.removeItem(LEGACY_STRATEGY_NEW_DRAFT_KEY);
    } catch {
      // ignore
    }
    return merged;
  }

  return null;
}

export function readStrategyDraftForEditPage(
  strategyId: string,
  dbSnapshot: StrategyFormFields
): StrategyFormFields | null {
  if (typeof window === "undefined") return null;

  const env = parseStrategyDraftEnvelope(
    sessionStorage.getItem(ARDEN24_STRATEGY_DRAFT_KEY)
  );
  if (env?.mode === "edit" && env.strategyId === strategyId) {
    const { mode: _m, strategyId: _id, ...fields } = env;
    return fields;
  }

  const legacyKey = sessionFormFullKey(`page:strategy-edit:${strategyId}`);
  const legacy = safeParseRecord(sessionStorage.getItem(legacyKey));
  if (legacy && Object.keys(legacy).length > 0) {
    const merged = mergeFormFields(legacy, dbSnapshot);
    writeStrategyDraftToSession({ mode: "edit", strategyId, ...merged });
    try {
      sessionStorage.removeItem(legacyKey);
    } catch {
      // ignore
    }
    return merged;
  }

  return null;
}

export function writeStrategyDraftToSession(draft: StrategyDraftEnvelope): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ARDEN24_STRATEGY_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // quota / private mode
  }
}

export function clearStrategyDraftFromSession(options?: {
  editStrategyId?: string;
}): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ARDEN24_STRATEGY_DRAFT_KEY);
    sessionStorage.removeItem(LEGACY_STRATEGY_NEW_DRAFT_KEY);
    if (options?.editStrategyId) {
      sessionStorage.removeItem(
        sessionFormFullKey(`page:strategy-edit:${options.editStrategyId}`)
      );
    }
  } catch {
    // ignore
  }
}
