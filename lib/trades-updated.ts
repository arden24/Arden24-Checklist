export const ARDEN24_TRADES_UPDATED_EVENT =
  "arden24:trades-updated";

export function dispatchTradesUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ARDEN24_TRADES_UPDATED_EVENT)
  );
}

