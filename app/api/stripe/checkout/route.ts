import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getAllowedPriceIds, planFromPriceId } from "@/lib/stripe/subscription-plan";

const STRIPE_API_VERSION = "2026-03-25.dahlia" as const;

type ApiErrorBody = { error: string };

async function readJsonBody(request: Request): Promise<
  { ok: true; value: unknown } | { ok: false; response: NextResponse<ApiErrorBody> }
> {
  try {
    const value: unknown = await request.json();
    return { ok: true, value };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }),
    };
  }
}

function extractPriceId(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("priceId" in body)) {
    return null;
  }
  const raw = (body as { priceId: unknown }).priceId;
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY is not set." }, { status: 500 });
    }

    if (
      !process.env.STRIPE_PRICE_BASIC?.trim() ||
      !process.env.STRIPE_PRICE_PRO?.trim() ||
      !process.env.STRIPE_PRICE_ELITE?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Missing Stripe price IDs: STRIPE_PRICE_BASIC, STRIPE_PRICE_PRO, and STRIPE_PRICE_ELITE must all be set.",
        },
        { status: 500 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SITE_URL is not set (required for checkout redirect URLs)." },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You must be signed in to start checkout." }, { status: 401 });
    }

    const parsedBody = await readJsonBody(request);
    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const priceId = extractPriceId(parsedBody.value);
    if (!priceId) {
      return NextResponse.json(
        { error: "Invalid or missing priceId: expected a non-empty string." },
        { status: 400 }
      );
    }

    const allowed = getAllowedPriceIds();
    if (allowed.length === 0) {
      return NextResponse.json(
        { error: "No allowed subscription prices are configured on the server." },
        { status: 500 }
      );
    }

    const allowedSet = new Set(allowed);
    if (!allowedSet.has(priceId)) {
      return NextResponse.json(
        { error: "Invalid priceId: must match a configured subscription price." },
        { status: 400 }
      );
    }

    const planName = planFromPriceId(priceId);
    if (!planName) {
      return NextResponse.json({ error: "Could not resolve plan for price." }, { status: 500 });
    }

    const success_url = `${process.env.NEXT_PUBLIC_SITE_URL}/start?success=true`;
    const cancel_url = `${process.env.NEXT_PUBLIC_SITE_URL}/start?canceled=true`;

    console.log("[stripe/checkout] selected plan:", planName);
    console.log("[stripe/checkout] resolved price ID:", priceId);
    console.log("[stripe/checkout] checkout mode:", "subscription");
    console.log("[stripe/checkout] success_url:", success_url);
    console.log("[stripe/checkout] cancel_url:", cancel_url);

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
    });

    const sessionMetadata = {
      userId: user.id,
      user_id: user.id,
      planName,
      plan: planName,
      source: "arden24",
    } as const;

    const subscriptionDataMetadata = {
      userId: user.id,
      user_id: user.id,
      planName,
      plan: planName,
      source: "arden24",
    } as const;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url,
      cancel_url,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: { ...sessionMetadata },
      subscription_data: {
        metadata: { ...subscriptionDataMetadata },
      },
    });

    console.log("[stripe/checkout][debug] session created — user link fields sent to Stripe", {
      checkoutSessionId: session.id,
      client_reference_id: session.client_reference_id,
      sessionMetadata,
      subscriptionDataMetadata,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Checkout session did not return a URL." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        {
          status:
            error.statusCode && error.statusCode >= 400 && error.statusCode < 600
              ? error.statusCode
              : 502,
        }
      );
    }

    console.error("[stripe/checkout]", error);
    return NextResponse.json({ error: "Failed to create checkout session." }, { status: 500 });
  }
}
