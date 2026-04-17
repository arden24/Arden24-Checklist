"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { subscriptionStatusIsActive } from "@/lib/supabase/subscription-access";

const POLL_MS = 2_000;

type UiPhase = "auth_loading" | "need_sign_in" | "activating";

export default function PostCheckoutActivation() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const { user, loading: authLoading } = useAuth();
  console.log("[PostCheckoutActivation] auth state", { authLoading, userId: user?.id ?? null });
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [phase, setPhase] = useState<UiPhase>("auth_loading");
  const [lastStatus, setLastStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;

    console.log("[PostCheckoutActivation] authLoading", authLoading);
    if (authLoading) {
      setPhase("auth_loading");
      return;
    }

    console.log("[PostCheckoutActivation] user?.id", user?.id ?? null);
    if (!user) {
      setPhase("need_sign_in");
      return;
    }

    setPhase("activating");
    let cancelled = false;

    const checkSubscription = async () => {
      if (cancelled) return;
      if (!supabase) return;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("subscription_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error("[PostCheckoutActivation] subscriptions read failed", error);
        setLastStatus("read_error");
        return;
      }

      const subscriptionStatus = data?.subscription_status ?? null;
      console.log("[PostCheckoutActivation] subscription_status", subscriptionStatus);
      setLastStatus(subscriptionStatus);

      if (subscriptionStatusIsActive(subscriptionStatus)) {
        console.log("[PostCheckoutActivation] redirecting to /dashboard");
        router.replace("/dashboard");
        router.refresh();
      }
    };

    void checkSubscription();
    const interval = setInterval(() => {
      void checkSubscription();
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [success, authLoading, user, router, supabase]);

  if (!success) {
    return null;
  }

  const signInHref = `/sign-in?next=${encodeURIComponent("/start?success=true")}`;

  if (phase === "auth_loading") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-10 text-center">
        <p className="text-sm text-zinc-300">Checking your session…</p>
      </div>
    );
  }

  if (phase === "need_sign_in") {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-10 text-center">
        <h1 className="text-lg font-semibold text-white">Please sign in</h1>
        <p className="text-sm leading-relaxed text-zinc-400">
          Your payment was received by Stripe. Sign in with the <strong className="text-zinc-200">same account</strong>{" "}
          you used at checkout so we can link your subscription to this app.
        </p>
        <Link
          href={signInHref}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-sky-500/80 bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
        >
          Sign in
        </Link>
        <p className="text-xs text-zinc-500">
          After signing in, you will return here while we activate your access.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-3 rounded-2xl border border-sky-500/25 bg-sky-950/30 px-6 py-10 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-sky-300/90">Payment received</p>
      <h1 className="text-lg font-semibold text-white">Activating your access…</h1>
      <p className="text-sm leading-relaxed text-zinc-400">
        We are confirming your subscription with Stripe. You will be redirected to the dashboard
        automatically.
      </p>
      {lastStatus ? (
        <p className="text-xs text-zinc-500">Status: {lastStatus}</p>
      ) : (
        <p className="text-xs text-zinc-500">Waiting for subscription record…</p>
      )}
    </div>
  );
}
