/**
 * Session-scoped draft keys (sessionStorage). Tab closed = cleared.
 * Use these literals as the storage key — no extra prefix.
 */

export const ARDEN24_TRADE_ENTRY_DRAFT_KEY = "arden24:trade-entry:draft" as const;
export const ARDEN24_LOT_SIZE_DRAFT_KEY = "arden24:lot-size:draft" as const;
export const ARDEN24_CHECKLIST_DRAFT_KEY = "arden24:checklist:draft" as const;

/** Previous keys (arden24:session:v1:…) — read once and migrate to the keys above. */
export const LEGACY_TRADE_ENTRY_DRAFT_KEYS = ["arden24:session:v1:form:trade-log"] as const;
export const LEGACY_LOT_SIZE_DRAFT_KEYS = ["arden24:session:v1:page:lot-calculator"] as const;
export const LEGACY_CHECKLIST_DRAFT_KEYS = ["arden24:session:v1:page:checklist"] as const;
