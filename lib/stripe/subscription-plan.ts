export type SubscriptionPlanName = "basic" | "pro" | "elite";

/** Live Stripe price IDs (Arden24 production). */
export const STRIPE_PRICE_BASIC = "price_1TOLRCLlqz2DC4OAYLncBPgy";
export const STRIPE_PRICE_PRO = "price_1TOLP6Llqz2DC4OAUeH8ZTXr";
export const STRIPE_PRICE_ELITE = "price_1TOLRZLlqz2DC4OARWz5Oj8x";

const BASIC = STRIPE_PRICE_BASIC;
const PRO = STRIPE_PRICE_PRO;
const ELITE = STRIPE_PRICE_ELITE;

export function planFromPriceId(priceId: string): SubscriptionPlanName | null {
  const id = priceId.trim();
  if (!id) return null;
  if (id === BASIC) return "basic";
  if (id === PRO) return "pro";
  if (id === ELITE) return "elite";
  return null;
}

export function getAllowedPriceIds(): string[] {
  return [BASIC, PRO, ELITE];
}

export function normalizedPlanFromMetadata(value: unknown): SubscriptionPlanName | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  if (s === "basic" || s === "pro" || s === "elite") return s;
  return null;
}
