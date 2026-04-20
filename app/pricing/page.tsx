import Link from "next/link";
import PricingCheckoutButtons from "@/components/PricingCheckoutButtons";
import { createClient } from "@/lib/supabase/server";
import { getActivePlanFromSubscriptionRow, getPlanLabel } from "@/lib/subscriptions/access";

export default async function PricingPage() {
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

        <PricingCheckoutButtons currentPlan={currentPlan} />

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
