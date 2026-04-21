/**
 * Stripe subscription → Supabase sync helpers. Called only after the webhook route validates
 * `STRIPE_WEBHOOK_SECRET` and constructs the event. There is no Stripe webhook-secret guard here;
 * failures to create the Supabase admin client are handled in `app/api/stripe/webhook/route.ts`.
 */
import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizedPlanFromMetadata,
  planFromPriceId,
} from "@/lib/stripe/subscription-plan";
import {
  getUserIdByStripeCustomerId,
  upsertUserSubscription,
} from "@/lib/supabase/sync-subscription";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function extractPrimaryPriceIdFromSubscription(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0];
  const price = item?.price;
  if (!price) return null;
  return typeof price === "string" ? price : price.id;
}

export function unixSecondsToIso(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

/** Stripe API field; cast avoids SDK typing drift across API versions. */
function subscriptionCurrentPeriodEndUnix(sub: Stripe.Subscription): number | null {
  const raw = (sub as unknown as Record<string, unknown>)["current_period_end"];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

async function resolveUserIdForSubscription(
  admin: SupabaseClient,
  sub: Stripe.Subscription
): Promise<string | null> {
  let metaRawUserId: string | undefined;
  let metaKeyUsed: string | null = null;
  if (typeof sub.metadata?.userId === "string") {
    metaRawUserId = sub.metadata.userId;
    metaKeyUsed = "subscription.metadata.userId";
  } else if (typeof sub.metadata?.user_id === "string") {
    metaRawUserId = sub.metadata.user_id;
    metaKeyUsed = "subscription.metadata.user_id";
  }

  if (typeof metaRawUserId === "string" && isUuid(metaRawUserId)) {
    console.log("[stripe/webhook][debug] resolveUserId: from subscription metadata (UUID ok)", {
      subscriptionId: sub.id,
      source: metaKeyUsed,
      userId: metaRawUserId,
    });
    return metaRawUserId;
  }
  if (typeof metaRawUserId === "string") {
    console.warn("[stripe/webhook][debug] resolveUserId: metadata user id not a valid UUID", {
      subscriptionId: sub.id,
      metaKeyUsed,
      metaRawUserId,
    });
  } else {
    console.log("[stripe/webhook][debug] resolveUserId: no userId/user_id on subscription.metadata", {
      subscriptionId: sub.id,
      subscriptionMetadata: sub.metadata ?? null,
    });
  }

  const customerRef = sub.customer;
  const customerId = typeof customerRef === "string" ? customerRef : customerRef?.id ?? null;
  if (!customerId) {
    console.warn("[stripe/webhook][debug] resolveUserId: no stripe customer on subscription", {
      subscriptionId: sub.id,
    });
    return null;
  }
  console.log("[stripe/webhook][debug] resolveUserId: trying Supabase lookup by stripe_customer_id", {
    subscriptionId: sub.id,
    customerId,
  });
  return getUserIdByStripeCustomerId(admin, customerId);
}

function resolvePlan(sub: Stripe.Subscription, priceId: string | null): string | null {
  const fromPrice = priceId ? planFromPriceId(priceId) : null;
  if (fromPrice) return fromPrice;
  return normalizedPlanFromMetadata(sub.metadata?.planName ?? sub.metadata?.plan);
}

/**
 * When Stripe attaches a subscription schedule (e.g. Billing Portal “switch at end of period”),
 * the phase that starts at `current_period_end` usually carries the next price tier.
 */
export async function resolveScheduledPlanAtPeriodEnd(
  stripe: Stripe,
  sub: Stripe.Subscription
): Promise<string | null> {
  if (sub.status !== "active" && sub.status !== "trialing") return null;

  const scheduleRef = sub.schedule;
  const scheduleId =
    typeof scheduleRef === "string"
      ? scheduleRef
      : scheduleRef &&
          typeof scheduleRef === "object" &&
          scheduleRef !== null &&
          "id" in scheduleRef
        ? (scheduleRef as { id: string }).id
        : null;
  if (!scheduleId) return null;

  let schedule: Stripe.SubscriptionSchedule;
  try {
    schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
  } catch (err) {
    console.warn("[stripe/webhook] subscription schedule retrieve failed", { scheduleId, err });
    return null;
  }

  const periodEnd = subscriptionCurrentPeriodEndUnix(sub);
  if (periodEnd == null) return null;

  const currentPriceId = extractPrimaryPriceIdFromSubscription(sub);
  const currentPlan =
    (currentPriceId ? planFromPriceId(currentPriceId) : null) ??
    normalizedPlanFromMetadata(sub.metadata?.planName ?? sub.metadata?.plan);

  for (const phase of schedule.phases ?? []) {
    const start = phase.start_date;
    if (start == null) continue;
    if (Math.abs(start - periodEnd) > 1) continue;

    const item = phase.items?.[0];
    if (!item) continue;
    const priceField = item.price;
    const phasePriceId =
      typeof priceField === "string"
        ? priceField
        : priceField &&
            typeof priceField === "object" &&
            priceField !== null &&
            "id" in priceField
          ? (priceField as { id: string }).id
          : null;
    if (!phasePriceId) continue;

    const nextPlan = planFromPriceId(phasePriceId);
    if (!nextPlan) continue;
    if (!currentPlan || nextPlan !== currentPlan) return nextPlan;
  }

  return null;
}

export async function syncSubscriptionFromStripeObject(
  admin: SupabaseClient,
  sub: Stripe.Subscription,
  options?: { userIdOverride?: string | null; stripe?: Stripe }
): Promise<void> {
  const override =
    typeof options?.userIdOverride === "string" && isUuid(options.userIdOverride)
      ? options.userIdOverride
      : null;

  const resolvedFromStripe = await resolveUserIdForSubscription(admin, sub);
  const userId = override ?? resolvedFromStripe;
  console.log("[stripe/webhook][debug] syncSubscriptionFromStripeObject user_id resolution", {
    subscriptionId: sub.id,
    userIdOverride: options?.userIdOverride ?? null,
    resolvedFromStripe,
    finalUserId: userId,
    usedOverride: Boolean(override),
  });

  if (!userId) {
    console.warn("[stripe/webhook] missing user for subscription", sub.id);
    return;
  }

  const customerRef = sub.customer;
  const customerId = typeof customerRef === "string" ? customerRef : customerRef?.id ?? null;
  const priceId = extractPrimaryPriceIdFromSubscription(sub);
  const plan = resolvePlan(sub, priceId);
  const periodEndIso = unixSecondsToIso(subscriptionCurrentPeriodEndUnix(sub));

  let scheduledPlan: string | null = null;
  if (sub.status === "active" || sub.status === "trialing") {
    if (options?.stripe) {
      try {
        scheduledPlan = await resolveScheduledPlanAtPeriodEnd(options.stripe, sub);
      } catch (err) {
        console.warn("[stripe/webhook] resolveScheduledPlanAtPeriodEnd threw", err);
      }
    }
  }

  const result = await upsertUserSubscription(admin, {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    subscription_plan: plan,
    current_period_end: periodEndIso,
    price_id: priceId,
    scheduled_plan: scheduledPlan,
  });

  if (!result.ok) {
    console.error("[stripe/webhook][debug] upsertUserSubscription failed", {
      subscriptionId: sub.id,
      message: result.message,
    });
    throw new Error(result.message);
  }
  console.log("[stripe/webhook][debug] syncSubscriptionFromStripeObject completed", {
    subscriptionId: sub.id,
    userId,
  });
}

export async function syncCheckoutSessionCompleted(
  admin: SupabaseClient,
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<void> {
  const sessionCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer && typeof session.customer === "object" && "id" in session.customer
        ? (session.customer as { id: string }).id
        : null;
  const sessionSubRef = session.subscription;
  const sessionSubscriptionId =
    typeof sessionSubRef === "string" ? sessionSubRef : sessionSubRef?.id ?? null;

  console.log("[stripe/webhook][debug] syncCheckoutSessionCompleted entry", {
    checkoutSessionId: session.id,
    mode: session.mode,
    client_reference_id: session.client_reference_id ?? null,
    sessionMetadata: session.metadata ?? null,
    stripeCustomerId: sessionCustomerId,
    stripeSubscriptionId: sessionSubscriptionId,
  });

  if (session.mode !== "subscription") {
    console.log("[stripe/webhook][debug] syncCheckoutSessionCompleted skip: mode is not subscription");
    return;
  }

  const ref = session.client_reference_id;
  const metaUid = session.metadata?.userId ?? session.metadata?.user_id;
  const userIdFromRef = typeof ref === "string" && isUuid(ref) ? ref : null;
  const userIdFromMeta = typeof metaUid === "string" && isUuid(metaUid) ? metaUid : null;
  const userId = userIdFromRef ?? userIdFromMeta;

  let resolvedFrom = "nowhere (invalid or missing)";
  if (userIdFromRef != null) {
    resolvedFrom = "session.client_reference_id";
  } else if (userIdFromMeta != null) {
    resolvedFrom =
      session.metadata?.userId === userId ? "session.metadata.userId" : "session.metadata.user_id";
  }

  console.log("[stripe/webhook][debug] syncCheckoutSessionCompleted resolved Supabase user_id", {
    checkoutSessionId: session.id,
    resolvedFrom,
    userIdFromRef: ref ?? null,
    userIdFromMeta: metaUid ?? null,
    resolvedUserId: userId,
    refIsUuid: typeof ref === "string" && isUuid(ref),
    metaIsUuid: typeof metaUid === "string" && isUuid(metaUid),
  });

  if (!userId) {
    console.warn("[stripe/webhook] checkout.session.completed missing valid user id", session.id);
    return;
  }

  const subRef = session.subscription;
  const subscriptionId = typeof subRef === "string" ? subRef : subRef?.id ?? null;
  if (!subscriptionId) {
    console.warn("[stripe/webhook] checkout.session.completed missing subscription id", session.id);
    return;
  }

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  console.log("[stripe/webhook][debug] retrieved subscription for checkout.session.completed", {
    checkoutSessionId: session.id,
    subscriptionId: sub.id,
    subscriptionMetadata: sub.metadata ?? null,
    subscriptionStatus: sub.status,
  });
  await syncSubscriptionFromStripeObject(admin, sub, { userIdOverride: userId, stripe });
}
