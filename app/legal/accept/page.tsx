"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppButton from "@/components/AppButton";
import SupabaseConfigHelp from "@/components/SupabaseConfigHelp";
import { isPasswordRecoverySession } from "@/lib/auth-recovery";

export default function LegalAcceptPage() {
  const router = useRouter();
  const { user, session, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/sign-in");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || !session || !supabase) return;
    if (isPasswordRecoverySession(session.access_token)) {
      router.replace("/reset-password");
    }
  }, [user, session, supabase, router]);

  async function handleAccept() {
    if (!user || !supabase) return;
    setError(null);
    setLoading(true);
    const acceptedAt = new Date().toISOString();
    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        accepted_terms: true,
        accepted_terms_at: acceptedAt,
      },
      { onConflict: "user_id" }
    );
    setLoading(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    router.refresh();
    router.replace("/dashboard");
  }

  if (authLoading || !user) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-var(--app-header-offset))] w-full min-w-0 max-w-md flex-col justify-center px-4 py-12">
        <p className="text-center text-sm text-zinc-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--app-header-offset))] w-full min-w-0 max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-lg">
        <h1 className="mb-2 text-2xl font-semibold text-white">Terms &amp; privacy</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Before continuing, confirm you have read and agree to our{" "}
          <Link href="/terms" className="font-medium text-sky-400 hover:text-sky-300">
            Terms of use
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-sky-400 hover:text-sky-300">
            Privacy policy
          </Link>
          .
        </p>

        {!supabase && (
          <div className="mb-6">
            <SupabaseConfigHelp />
          </div>
        )}

        {error && (
          <div
            className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            role="alert"
          >
            {error}
          </div>
        )}

        <AppButton
          type="button"
          disabled={loading || !supabase}
          className="w-full font-medium"
          onClick={handleAccept}
        >
          {loading ? "Saving…" : "I agree — continue"}
        </AppButton>

        <p className="mt-6 text-center text-xs text-zinc-500">
          For journaling and discipline only. Not financial advice.
        </p>
      </div>
    </div>
  );
}
