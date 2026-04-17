"use client";

import { useCallback, useState } from "react";
import AppButton from "@/components/AppButton";
import { requestSubscriptionCheckout } from "@/lib/stripe/client-subscription-checkout";
import { getPlanActionLabel } from "@/lib/subscriptions/access";
import { PLAN_DETAILS } from "@/lib/subscriptions/plan-details";
import type { PlanKey } from "@/lib/subscriptions/plans";

export type PricingCheckoutButtonsProps = {
  basicPriceId: string;
  proPriceId: string;
  elitePriceId: string;
  currentPlan?: PlanKey | null;
};

const CHECKOUT_TIERS: {
  key: PlanKey;
  price: string;
  priceIdKey: "basic" | "pro" | "elite";
  ctaLabel: string;
  popular?: boolean;
}[] = [
  { key: "basic", price: "£15", priceIdKey: "basic", ctaLabel: "Start Basic" },
  { key: "pro", price: "£29", priceIdKey: "pro", ctaLabel: "Start Pro", popular: true },
  { key: "elite", price: "£49", priceIdKey: "elite", ctaLabel: "Go Elite" },
];

export default function PricingCheckoutButtons({
  basicPriceId,
  proPriceId,
  elitePriceId,
  currentPlan = null,
}: PricingCheckoutButtonsProps) {
  const ids = { basic: basicPriceId, pro: proPriceId, elite: elitePriceId };
  const [checkingPlan, setCheckingPlan] = useState<string | null>(null);

  const onChoose = useCallback(async (planName: string, priceId: string) => {
    if (checkingPlan !== null) return;
    setCheckingPlan(planName);
    try {
      const result = await requestSubscriptionCheckout(priceId);
      if (!result.ok) {
        alert(result.message);
      }
    } catch (err) {
      console.error("[stripe/checkout]", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setCheckingPlan(null);
    }
  }, [checkingPlan]);

  return (
    <div className="grid items-stretch gap-6 md:grid-cols-3 md:gap-5">
      {CHECKOUT_TIERS.map((tier) => {
        const detail = PLAN_DETAILS[tier.key];
        const priceId = ids[tier.priceIdKey];
        const configured = Boolean(priceId.trim());
        const busy = checkingPlan !== null;
        const thisBusy = checkingPlan === detail.label;
        const isPopular = Boolean(tier.popular);
        const tierPlan = tier.priceIdKey;
        const isCurrentPlan = currentPlan === tierPlan;
        const ctaLabel = getPlanActionLabel(currentPlan, tierPlan, tier.ctaLabel);

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
            <h2 className="text-lg font-semibold text-white">{detail.label}</h2>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {tier.price}
            </p>
            <p className="text-xs text-zinc-500">per month</p>
            <p className="mt-3 text-sm leading-snug text-zinc-300">{detail.tagline}</p>
            <ul className="mt-3 flex-1 space-y-2 text-sm leading-relaxed text-zinc-400">
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
              disabled={busy || !configured || isCurrentPlan}
              aria-busy={thisBusy}
              title={!configured ? "Price ID not configured" : undefined}
              onClick={() => void onChoose(detail.label, priceId)}
            >
              {thisBusy ? "Redirecting..." : ctaLabel}
            </AppButton>
          </article>
        );
      })}
    </div>
  );
}
