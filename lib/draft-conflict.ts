export function parseIsoMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Decide whether to use local or server draft.
 * - Picks the higher `updatedAt` timestamp.
 * - Server wins ties (prevents re-persisting identical local payload over server).
 */
export function chooseDraftSource(opts: {
  localUpdatedAt?: string | null;
  serverUpdatedAt?: string | null;
}): "server" | "local" | "none" {
  const l = parseIsoMs(opts.localUpdatedAt);
  const s = parseIsoMs(opts.serverUpdatedAt);
  if (l <= 0 && s <= 0) return "none";
  if (s >= l) return "server";
  return "local";
}

