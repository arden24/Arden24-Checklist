export type SubscriptionPlanName = "basic" | "pro" | "elite";

const BASIC = process.env.STRIPE_PRICE_BASIC?.trim();
const PRO = process.env.STRIPE_PRICE_PRO?.trim();
const ELITE = process.env.STRIPE_PRICE_ELITE?.trim();

export function planFromPriceId(priceId: string): SubscriptionPlanName | null {
  const id = priceId.trim();
  if (!id) return null;
  if (BASIC && id === BASIC) return "basic";
  if (PRO && id === PRO) return "pro";
  if (ELITE && id === ELITE) return "elite";
  return null;
}

export function getAllowedPriceIds(): string[] {
  return [BASIC, PRO, ELITE].filter((id): id is string => Boolean(id));
}

export function normalizedPlanFromMetadata(value: unknown): SubscriptionPlanName | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  if (s === "basic" || s === "pro" || s === "elite") return s;
  return null;
}
