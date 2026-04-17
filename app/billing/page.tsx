import PageContainer from "@/components/PageContainer";
import ManageSubscriptionButton from "@/components/billing/ManageSubscriptionButton";
import SubscriptionBillingSummary from "@/components/billing/SubscriptionBillingSummary";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionPlanRow } from "@/lib/subscriptions/access";

export default async function BillingPage() {
  let subscriptionRow: SubscriptionPlanRow | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("subscriptions")
        .select(
          "subscription_status, subscription_plan, price_id, current_period_end, scheduled_plan"
        )
        .eq("user_id", user.id)
        .maybeSingle();
      subscriptionRow = (data ?? null) as SubscriptionPlanRow | null;
    }
  } catch {
    subscriptionRow = null;
  }

  return (
    <main className="min-h-screen min-w-0 bg-slate-950 py-6 text-white sm:py-8">
      <PageContainer maxWidthClass="max-w-2xl" className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold sm:text-3xl">Billing &amp; plan</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Manage your Stripe subscription and review your current billing state.
          </p>
        </header>
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Subscription overview
          </h2>
          <SubscriptionBillingSummary row={subscriptionRow} />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <ManageSubscriptionButton />
        </div>
      </PageContainer>
    </main>
  );
}
