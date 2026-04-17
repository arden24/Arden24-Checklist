import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  syncCheckoutSessionCompleted,
  syncSubscriptionFromStripeObject,
} from "@/lib/stripe/webhook-subscription-sync";

export const runtime = "nodejs";

const STRIPE_API_VERSION = "2026-03-25.dahlia" as const;

export async function POST(request: Request) {
  console.log("🚨 WEBHOOK HIT START");
  console.log("1. entered POST");

  try {
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    console.log("2. read STRIPE_SECRET_KEY", Boolean(secretKey));
    if (!secretKey) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY." }, { status: 500 });
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
      return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET." }, { status: 500 });
    }
    console.log("3. read STRIPE_WEBHOOK_SECRET", Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()));

    let rawBody: string;

    try {
      rawBody = await request.text();
      console.log("4. got raw body", rawBody.length);
    } catch (err) {
      console.error("🚨 FAILED TO READ RAW BODY", err);
      return new Response(
        JSON.stringify({ error: "Failed to read request body" }),
        { status: 500 }
      );
    }
    const signature = request.headers.get("stripe-signature");
    console.log("5. got signature", Boolean(signature));

    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing Stripe-Signature header." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const stripe = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
    console.log("6. stripe client created");

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log("7. event constructed", event.type);
      console.log("========== STRIPE EVENT TYPE ==========");
      console.log(event.type);
      console.log("======================================");
    } catch (err) {
      console.error("[stripe/webhook] signature verification failed", err);
      return new Response(JSON.stringify({ error: "Invalid Stripe signature." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    console.log("Stripe event received:", event.type);

    let admin;
    try {
      console.log("8. creating admin client");
      admin = createAdminClient();
      console.log("9. admin client created");
    } catch (err) {
      console.error("[stripe/webhook] admin client", err);
      return NextResponse.json({ error: "Server is not configured for webhooks." }, { status: 500 });
    }

    try {
      console.log("10. entering switch");
      switch (event.type) {
        case "checkout.session.completed": {
          console.log("[stripe/webhook] switch case entered:", "checkout.session.completed");
          console.log("Stripe webhook: checkout.session.completed");
          const session = event.data.object as Stripe.Checkout.Session;
          console.log("Stripe checkout session object:", JSON.stringify(session, null, 2));
          {
            const cust =
              typeof session.customer === "string"
                ? session.customer
                : session.customer &&
                    typeof session.customer === "object" &&
                    session.customer !== null &&
                    "id" in session.customer
                  ? (session.customer as { id: string }).id
                  : null;
            const subId =
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription?.id ?? null;
            console.log("[stripe/webhook][debug] checkout.session.completed", {
              eventType: event.type,
              checkoutSessionId: session.id,
              stripeCustomerId: cust,
              stripeSubscriptionId: subId,
              sessionMetadata: session.metadata ?? null,
              client_reference_id: session.client_reference_id ?? null,
              mode: session.mode,
            });
          }
          await syncCheckoutSessionCompleted(admin, stripe, session);
          break;
        }
        case "customer.subscription.created": {
          console.log("Stripe webhook: customer.subscription.created");
          const subscription = event.data.object as Stripe.Subscription;
          {
            const cust =
              typeof subscription.customer === "string"
                ? subscription.customer
                : subscription.customer?.id ?? null;
            console.log("[stripe/webhook][debug] customer.subscription.created", {
              eventType: event.type,
              checkoutSessionId: null,
              stripeCustomerId: cust,
              stripeSubscriptionId: subscription.id,
              sessionMetadata: null,
              subscriptionMetadata: subscription.metadata ?? null,
            });
          }
          await syncSubscriptionFromStripeObject(admin, subscription, { stripe });
          break;
        }
        case "customer.subscription.updated": {
          console.log("[stripe/webhook] switch case entered:", "customer.subscription.updated");
          console.log("Stripe webhook: customer.subscription.updated");
          const subscription = event.data.object as Stripe.Subscription;
          {
            const cust =
              typeof subscription.customer === "string"
                ? subscription.customer
                : subscription.customer?.id ?? null;
            console.log("[stripe/webhook][debug] customer.subscription.updated", {
              eventType: event.type,
              checkoutSessionId: null,
              stripeCustomerId: cust,
              stripeSubscriptionId: subscription.id,
              sessionMetadata: null,
              subscriptionMetadata: subscription.metadata ?? null,
            });
          }
          await syncSubscriptionFromStripeObject(admin, subscription, { stripe });
          break;
        }
        case "customer.subscription.deleted": {
          console.log("Stripe webhook: customer.subscription.deleted");
          const subscription = event.data.object as Stripe.Subscription;
          {
            const cust =
              typeof subscription.customer === "string"
                ? subscription.customer
                : subscription.customer?.id ?? null;
            console.log("[stripe/webhook][debug] customer.subscription.deleted", {
              eventType: event.type,
              checkoutSessionId: null,
              stripeSubscriptionId: subscription.id,
              stripeCustomerId: cust,
              sessionMetadata: null,
              subscriptionMetadata: subscription.metadata ?? null,
            });
          }
          await syncSubscriptionFromStripeObject(admin, subscription, { stripe });
          break;
        }
        default:
          console.log("Unhandled Stripe event type:", event.type);
          break;
      }
    } catch (err) {
      console.error("[stripe/webhook] FULL ERROR:", err);
      console.error("[stripe/webhook] EVENT TYPE:", event.type);

      if (err instanceof Error) {
        console.error("[stripe/webhook] MESSAGE:", err.message);
        console.error("[stripe/webhook] STACK:", err.stack);
      }

      return new Response(
        JSON.stringify({ error: "Webhook handler failed", details: String(err) }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error("🚨 UNCAUGHT WEBHOOK ERROR:", err);

    if (err instanceof Error) {
      console.error("🚨 MESSAGE:", err.message);
      console.error("🚨 STACK:", err.stack);
    }

    return new Response(
      JSON.stringify({ error: "CRASHED BEFORE HANDLER", details: String(err) }),
      { status: 500 }
    );
  }
}
