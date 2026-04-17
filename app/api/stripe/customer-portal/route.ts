import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const STRIPE_API_VERSION = "2026-03-25.dahlia" as const;

export async function POST() {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secretKey) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY is not set." }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (!siteUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_SITE_URL is not set." }, { status: 500 });
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
      return NextResponse.json(
        { error: "Failed to read subscription customer ID.", details: error.message },
        { status: 500 }
      );
    }

    const stripeCustomerId = data?.stripe_customer_id?.trim() ?? "";
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer ID found for this user." },
        { status: 400 }
      );
    }

    const stripe = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${siteUrl}/account`,
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
