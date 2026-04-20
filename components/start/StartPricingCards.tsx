"use client";

import { useCallback, useState } from "react";
import AppButton from "@/components/AppButton";
import { requestSubscriptionCheckout } from "@/lib/stripe/client-subscription-checkout";
import {
  STRIPE_PRICE_BASIC,
  STRIPE_PRICE_ELITE,
  STRIPE_PRICE_PRO,
} from "@/lib/stripe/subscription-plan";
import { getPlanActionLabel } from "@/lib/subscriptions/access";
import { PLAN_DETAILS } from "@/lib/subscriptions/plan-details";
import type { PlanKey } from "@/lib/subscriptions/plans";

const PRICE_ID_BY_PLAN: Record<PlanKey, string> = {
  basic: STRIPE_PRICE_BASIC,
  pro: STRIPE_PRICE_PRO,
  elite: STRIPE_PRICE_ELITE,
};

export type StartPricingCardsProps = {
  currentPlan?: PlanKey | null;
};

const START_TIERS: {
  key: PlanKey;
  price: string;
  ctaLabel: string;
  popular?: boolean;
}[] = [
  { key: "basic", price: "£15", ctaLabel: "Start Basic" },
  { key: "pro", price: "£29", ctaLabel: "Start Pro", popular: true },
  { key: "elite", price: "£49", ctaLabel: "Go Elite" },
];

export default function StartPricingCards({ currentPlan = null }: StartPricingCardsProps) {
  const [busy, setBusy] = useState<string | null>(null);

  const onSubscribe = useCallback(async (label: string, priceId: string) => {
    if (busy !== null) return;
    setBusy(label);
    try {
      const result = await requestSubscriptionCheckout(priceId);
      if (!result.ok) {
        alert(result.message);
      }
    } catch (err) {
      console.error("[stripe/checkout]", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }, [busy]);

  return (
    <div className="grid items-stretch gap-6 md:grid-cols-3 md:gap-5">
      {START_TIERS.map((tier) => {
        const detail = PLAN_DETAILS[tier.key];
        const priceId = PRICE_ID_BY_PLAN[tier.key];
        const isBusy = busy !== null;
        const thisBusy = busy === detail.label;
        const isPopular = Boolean(tier.popular);
        const isCurrentPlan = currentPlan === tier.key;
        const ctaLabel = getPlanActionLabel(currentPlan, tier.key, tier.ctaLabel);

        return (
          <article
            key={tier.key}
            className={`relative flex flex-col rounded-2xl border bg-slate-950/70 shadow-[0_18px_60px_rgba(15,23,42,0.9)] ${
              isCurrentPlan
                ? "border-sky-300/80 bg-sky-950/35 p-7 ring-2 ring-sky-400/50 shadow-[0_0_42px_rgba(56,189,248,0.2),0_22px_70px_rgba(15,23,42,0.95)]"
                : isPopular
                  ? "z-[1] border-sky-400/55 p-7 shadow-[0_0_48px_rgba(56,189,248,0.18),0_22px_70px_rgba(15,23,42,0.95)] ring-2 ring-sky-500/30 md:scale-[1.03]"
                  : "border-slate-800/80 p-6"
            }`}
          >
            {isCurrentPlan ? (
              <p className="absolute -top-3 right-4 rounded-full border border-sky-300/70 bg-sky-500/30 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-100">
                Current Plan
              </p>
            ) : null}
            {isPopular ? (
              <p className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-sky-400/50 bg-sky-500/25 px-3.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-100">
                Most popular
              </p>
            ) : null}
            <h3 className="text-lg font-semibold text-white">{detail.label}</h3>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{tier.price}</p>
            <p className="text-xs text-zinc-500">per month</p>
            <p className="mt-3 text-sm leading-snug text-zinc-300">{detail.tagline}</p>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-zinc-400">
              {detail.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-sky-400/90" aria-hidden>
                    ✓
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <AppButton
              type="button"
              variant="primary"
              className="mt-6 w-full"
              disabled={isBusy || isCurrentPlan}
              aria-busy={thisBusy}
              onClick={() => void onSubscribe(detail.label, priceId)}
            >
              {thisBusy ? "Redirecting…" : ctaLabel}
            </AppButton>
          </article>
        );
      })}
    </div>
  );
}
