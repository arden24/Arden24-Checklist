export type SubscriptionPlanName = "basic" | "pro" | "elite";

/** Only these Stripe price IDs are valid for subscription checkout. */
export const ALLOWED_CHECKOUT_PRICE_IDS = [
  "price_1TOLRCLlqz2DC4OAYLncBPgy",
  "price_1TOLP6Llqz2DC4OAUeH8ZTXr",
  "price_1TOLRZLlqz2DC4OARWz5Oj8x",
] as const;

export const STRIPE_PRICE_BASIC = ALLOWED_CHECKOUT_PRICE_IDS[0];
export const STRIPE_PRICE_PRO = ALLOWED_CHECKOUT_PRICE_IDS[1];
export const STRIPE_PRICE_ELITE = ALLOWED_CHECKOUT_PRICE_IDS[2];

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
  return [...ALLOWED_CHECKOUT_PRICE_IDS];
}

export function isAllowedCheckoutPriceId(priceId: string): boolean {
  const id = priceId.trim();
  return (ALLOWED_CHECKOUT_PRICE_IDS as readonly string[]).includes(id);
}

export function normalizedPlanFromMetadata(value: unknown): SubscriptionPlanName | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  if (s === "basic" || s === "pro" || s === "elite") return s;
  return null;
}
