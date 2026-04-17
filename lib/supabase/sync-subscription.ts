import type { SupabaseClient } from "@supabase/supabase-js";

export type SubscriptionRow = {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string;
  subscription_plan: string | null;
  current_period_end: string | null;
  /** Primary Stripe price id on the subscription item (current period). */
  price_id: string | null;
  /** Plan tier that will apply after `current_period_end` when a schedule changes the price (e.g. portal switch). */
  scheduled_plan: string | null;
};

export async function upsertUserSubscription(
  admin: SupabaseClient,
  row: SubscriptionRow
): Promise<{ ok: true } | { ok: false; message: string }> {
  const payload = {
    ...row,
    updated_at: new Date().toISOString(),
  };
  console.log("[subscriptions][debug] upsert payload → public.subscriptions", payload);

  const { error } = await admin.from("subscriptions").upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.error("[subscriptions] upsert", error);
    console.error("[subscriptions][debug] upsert failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { ok: false, message: error.message };
  }
  console.log("[subscriptions][debug] upsert ok (no error returned)");
  return { ok: true };
}

export async function getUserIdByStripeCustomerId(
  admin: SupabaseClient,
  stripeCustomerId: string
): Promise<string | null> {
  const { data, error } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (error) {
    console.error("[subscriptions] lookup by customer", error);
    return null;
  }
  console.log("[subscriptions][debug] lookup by stripe_customer_id", {
    stripeCustomerId,
    foundUserId: data?.user_id ?? null,
  });
  return data?.user_id ?? null;
}
