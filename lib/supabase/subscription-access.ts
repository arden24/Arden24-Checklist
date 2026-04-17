import type { SupabaseClient } from "@supabase/supabase-js";

const ACTIVE = new Set(["active", "trialing"]);

/** Stripe subscription statuses that unlock the app (matches middleware). */
export function subscriptionStatusIsActive(status: string | null | undefined): boolean {
  return typeof status === "string" && ACTIVE.has(status);
}

/**
 * Whether the user has a Stripe-backed subscription row in an access-granting status.
 * Used by middleware; relies on RLS (user can read own row) with the anon server client.
 */
export async function hasActiveAppSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("subscription_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.subscription_status) {
    console.log("[subscription-access] decision", {
      userId,
      subscriptionRow: data ?? null,
      subscription_status: data?.subscription_status ?? null,
      access: false,
      error: error
        ? {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          }
        : null,
    });
    return false;
  }
  const access = subscriptionStatusIsActive(data.subscription_status);
  console.log("[subscription-access] decision", {
    userId,
    subscriptionRow: data,
    subscription_status: data.subscription_status,
    access,
    error: null,
  });
  return access;
}

const GATED_PREFIXES = ["/dashboard", "/journal", "/strategies", "/notes", "/checklist"] as const;

export function pathRequiresActiveSubscription(pathname: string): boolean {
  return GATED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
