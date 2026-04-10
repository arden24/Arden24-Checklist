"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SupabaseConfigHelp from "@/components/SupabaseConfigHelp";
import { getAuthErrorDisplay, logAuthError } from "@/lib/auth-errors";
import { isValidEmail } from "@/lib/auth-validation";
import { isPasswordRecoverySession } from "@/lib/auth-recovery";
import { getAuthCallbackRedirectUrl } from "@/lib/auth-redirect-url";
import AppButton from "@/components/AppButton";

const NOT_CONFIGURED_MESSAGE =
  "Add the environment variables shown above to .env.local and restart the dev server (npm run dev).";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { user, session } = useAuth();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorSuggestion, setErrorSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (isPasswordRecoverySession(session?.access_token)) {
      router.replace("/reset-password");
      return;
    }
    router.replace("/dashboard");
  }, [user, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setError("Please enter your email");
      return;
    }
    if (!isValidEmail(emailTrimmed)) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      if (!supabase) {
        setError(NOT_CONFIGURED_MESSAGE);
        setErrorSuggestion(null);
        setLoading(false);
        return;
      }
      const { error: err } = await supabase.auth.resetPasswordForEmail(
        emailTrimmed,
        { redirectTo: getAuthCallbackRedirectUrl("/reset-password") }
      );
      if (err) {
        logAuthError("resetPasswordForEmail", err);
        const { message: friendlyMessage, suggestion } = getAuthErrorDisplay(err);
        setError(friendlyMessage);
        setErrorSuggestion(suggestion ?? null);
        setLoading(false);
        return;
      }
      setSuccess(true);
      setLoading(false);
    } catch (caught) {
      logAuthError("resetPasswordForEmail catch", caught);
      setError("Something went wrong. Please try again.");
      setErrorSuggestion(null);
      setLoading(false);
    }
  }

  if (user) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--app-header-offset))] w-full min-w-0 max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-lg">
        <h1 className="mb-2 text-2xl font-semibold text-white">Reset password</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Enter your email and we&apos;ll send you a link to choose a new password.
        </p>

        {!supabase && (
          <div className="mb-6">
            <SupabaseConfigHelp />
          </div>
        )}

        {success ? (
          <div
            className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-100"
            role="status"
          >
            If an account exists for that email, we have sent a password reset link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                role="alert"
              >
                <p>{error}</p>
                {errorSuggestion && (
                  <p className="mt-2 border-t border-red-500/20 pt-2 text-xs text-red-200/90">
                    {errorSuggestion}
                  </p>
                )}
              </div>
            )}

            <label className="flex flex-col gap-2">
              <span className="text-sm text-zinc-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
                className="rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 disabled:opacity-60"
                placeholder="you@example.com"
              />
            </label>

            <AppButton type="submit" disabled={loading} className="w-full font-medium">
              {loading ? "Sending reset link..." : "Send reset link"}
            </AppButton>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-zinc-400">
          <Link href="/sign-in" className="font-medium text-sky-400 hover:text-sky-300">
            Back to sign in
          </Link>
        </p>
        <p className="mt-3 text-center">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
            Home
          </Link>
        </p>
      </div>

      <p className="mt-8 text-center text-[10px] uppercase tracking-wider text-zinc-500">
        For journaling and discipline only. Not financial advice.
      </p>
    </div>
  );
}
