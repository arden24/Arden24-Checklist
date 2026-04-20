import Link from "next/link";
import StartPricingCards from "@/components/start/StartPricingCards";
import { createClient } from "@/lib/supabase/server";
import { getActivePlanFromSubscriptionRow } from "@/lib/subscriptions/access";
import type { PlanKey } from "@/lib/subscriptions/plans";

export default async function StartMarketing() {
  let currentPlan: PlanKey | null = null;

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
      currentPlan = getActivePlanFromSubscriptionRow(data);
    }
  } catch {
    currentPlan = null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-sky-400/80">Arden24</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
            Trade with discipline. Journal with clarity.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            A focused workspace for your setups, checklists, and review—so you build habits, not
            noise.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <a
              href="#pricing"
              className="inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-sky-500 sm:w-auto"
            >
              View plans
            </a>
            <Link
              href="/sign-in"
              className="inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-zinc-200 transition hover:border-sky-400/40 hover:text-white sm:w-auto"
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="mt-20 border-t border-white/10 pt-16">
          <h2 className="text-center text-lg font-semibold text-white sm:text-xl">Why Arden24</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-zinc-500">
            Built for traders who care about process, not hype.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Journal that sticks",
                body: "Capture trades and context in one place so review day stays painless.",
              },
              {
                title: "Strategy discipline",
                body: "Cards and checklists keep your rules visible while you work through your own pre-trade process.",
              },
              {
                title: "Notes & focus",
                body: "Plan sessions without tab sprawl—fewer distractions, clearer next steps.",
              },
              {
                title: "Performance lens",
                body: "See how your logged habits relate to outcomes over time in your own data—not just one lucky week.",
              },
            ].map((c) => (
              <article
                key={c.title}
                className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 text-left"
              >
                <h3 className="text-sm font-semibold text-white">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{c.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 border-t border-white/10 pt-16">
          <h2 className="text-center text-lg font-semibold text-white sm:text-xl">How it works</h2>
          <ol className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "1", title: "Create your account", body: "Sign up with email—quick and private." },
              { step: "2", title: "Pick your plan", body: "Choose Basic, Pro, or Elite—£15, £29, or £49 per month." },
              { step: "3", title: "Pay with Stripe", body: "Secure checkout; promotion codes supported at payment." },
              { step: "4", title: "Open the app", body: "Jump into dashboard, journal, and checklists." },
            ].map((s) => (
              <li
                key={s.step}
                className="flex gap-4 rounded-2xl border border-white/10 bg-slate-900/40 p-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-500/40 bg-sky-500/10 text-sm font-bold text-sky-200">
                  {s.step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{s.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="pricing" className="mt-20 scroll-mt-24 border-t border-white/10 pt-16">
          <h2 className="text-center text-lg font-semibold text-white sm:text-xl">Pricing</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-zinc-500">
            Simple monthly tiers. Cancel any time in the Stripe customer portal.
          </p>

          <div className="mt-10">
            <StartPricingCards currentPlan={currentPlan} />
          </div>

          <div className="mx-auto mt-10 max-w-xl space-y-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-xs text-zinc-400">
            <p>Access to Arden24 requires an active subscription.</p>
            <p>Have a discount code? Enter it at checkout.</p>
            <p className="text-zinc-500">
              After checkout completes, you will land on a short activation screen, then the
              dashboard when your subscription is ready.
            </p>
            <p className="text-zinc-500">
              Arden24 is a trading journal and self-analysis tool. It does not provide financial advice, trade
              recommendations, or signals. All trading decisions are made solely by the user.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/sign-in" className="text-sky-300 hover:text-sky-200">
              Sign in
            </Link>
            <span className="text-zinc-600">·</span>
            <Link href="/pricing" className="text-zinc-400 hover:text-zinc-200">
              Alternate checkout page
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
