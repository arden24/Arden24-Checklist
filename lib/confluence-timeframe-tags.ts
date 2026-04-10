/** Delimiter for multiple timeframes in the single checklist `timeframe` field (schema unchanged). */
export const TF_TAG_SEP = " · ";

export function parseTimeframeTags(raw: string): string[] {
  const s = raw.trim();
  if (!s) return [];
  return s
    .split(TF_TAG_SEP)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function joinTimeframeTags(tags: string[]): string {
  return tags
    .map((t) => t.trim())
    .filter(Boolean)
    .join(TF_TAG_SEP);
}
