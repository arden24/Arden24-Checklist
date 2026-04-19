import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { resolveSiteBaseForStripe } from "@/lib/stripe/resolve-site-base";

const STRIPE_API_VERSION = "2026-03-25.dahlia" as const;

export async function POST(request: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secretKey) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY is not set." }, { status: 500 });
    }

    const siteBase = resolveSiteBaseForStripe(request);
    if (!siteBase) {
      return NextResponse.json(
        {
          error:
            "Could not determine site URL for return_url. Set NEXT_PUBLIC_SITE_URL or use a request with a valid Host / X-Forwarded-Host.",
        },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to open the billing portal." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[stripe/customer-portal] Supabase read subscriptions", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId: user.id,
      });
      return NextResponse.json(
        { error: "Failed to read subscription data.", details: error.message },
        { status: 500 }
      );
    }

    const stripeCustomerId = data?.stripe_customer_id?.trim() ?? "";
    if (!stripeCustomerId) {
      console.warn("[stripe/customer-portal] missing stripe_customer_id", { userId: user.id });
      return NextResponse.json(
        {
          error:
            "No Stripe customer on file yet. Complete checkout on this environment first, or wait a moment for the subscription to sync.",
        },
        { status: 400 }
      );
    }

    const stripe = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
    const returnUrl = `${siteBase}/account`;

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Billing portal session did not return a URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error("[stripe/customer-portal] StripeError", {
        type: error.type,
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        doc_url: error.doc_url,
      });
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

    console.error("[stripe/customer-portal]", error);
    return NextResponse.json(
      { error: "Failed to create Stripe customer portal session." },
      { status: 500 }
    );
  }
}
