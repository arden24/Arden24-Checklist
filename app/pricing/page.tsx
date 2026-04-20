import Link from "next/link";
import PricingCheckoutButtons from "@/components/PricingCheckoutButtons";
import {
  STRIPE_PRICE_BASIC,
  STRIPE_PRICE_ELITE,
  STRIPE_PRICE_PRO,
} from "@/lib/stripe/subscription-plan";
import { createClient } from "@/lib/supabase/server";
import { getActivePlanFromSubscriptionRow, getPlanLabel } from "@/lib/subscriptions/access";

export default async function PricingPage() {
  const basicPriceId = STRIPE_PRICE_BASIC;
  const proPriceId = STRIPE_PRICE_PRO;
  const elitePriceId = STRIPE_PRICE_ELITE;
  const pricesConfigured = Boolean(basicPriceId && proPriceId && elitePriceId);
  let currentPlan = null;
  let subscriptionStatus: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("subscriptions")
        .select("subscription_status, subscription_plan, price_id")
        .eq("user_id", user.id)
        .maybeSingle();
      subscriptionStatus = data?.subscription_status ?? null;
      currentPlan = getActivePlanFromSubscriptionRow(data);
    }
  } catch {
    currentPlan = null;
    subscriptionStatus = null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-white">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {!pricesConfigured ? (
          <div
            className="mb-8 rounded-lg border border-amber-700/80 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
            role="alert"
          >
            <p className="font-medium text-amber-50">Stripe price IDs are not fully configured.</p>
            <p className="mt-2 text-amber-100/90">
              Set <code className="rounded bg-black/30 px-1">STRIPE_PRICE_BASIC</code>,{" "}
              <code className="rounded bg-black/30 px-1">STRIPE_PRICE_PRO</code>, and{" "}
              <code className="rounded bg-black/30 px-1">STRIPE_PRICE_ELITE</code> in{" "}
              <code className="rounded bg-black/30 px-1">.env.local</code>, then restart{" "}
              <code className="rounded bg-black/30 px-1">npm run dev</code>. Subscribe buttons stay
              disabled until all three are set.
            </p>
          </div>
        ) : null}
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-sky-400/80">Pricing</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Choose your plan</h1>
          <p className="mt-3 text-sm text-zinc-400 sm:text-base">
            Pick the tier that fits your journaling and review workflow. You can manage billing in Stripe after
            checkout. Arden24 does not provide financial advice or trade recommendations.
          </p>
          <p className="mt-3 text-xs text-zinc-500">
            Current plan: <span className="text-zinc-200">{getPlanLabel(currentPlan)}</span>
            {" · "}
            Status: <span className="text-zinc-200">{subscriptionStatus ?? "No active subscription"}</span>
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex text-sm font-medium text-sky-300 hover:text-sky-200"
          >
            ← Back to dashboard
          </Link>
        </div>

        <PricingCheckoutButtons
          basicPriceId={basicPriceId}
          proPriceId={proPriceId}
          elitePriceId={elitePriceId}
          currentPlan={currentPlan}
        />

        <div className="mx-auto mt-10 max-w-xl space-y-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-xs text-zinc-400">
          <p>Access to Arden24 requires an active subscription.</p>
          <p>Have a discount code? Enter it at checkout.</p>
          <p className="text-zinc-500">
            Arden24 is a trading journal and self-analysis tool. It does not provide financial advice, trade
            recommendations, or signals. All trading decisions are made solely by the user.
          </p>
        </div>
      </section>
    </main>
  );
}
