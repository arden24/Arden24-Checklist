"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SupabaseConfigHelp from "@/components/SupabaseConfigHelp";
import PasswordInput from "@/components/PasswordInput";
import { getAuthErrorDisplay, logAuthError } from "@/lib/auth-errors";
import AppButton from "@/components/AppButton";
import { isValidEmail } from "@/lib/auth-validation";
import { isPasswordRecoverySession } from "@/lib/auth-recovery";

const NOT_CONFIGURED_MESSAGE =
  "Add the environment variables shown above to .env.local and restart the dev server (npm run dev).";

export default function SignUpPage() {
  const router = useRouter();
  const { user, session } = useAuth();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorSuggestion, setErrorSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<"signed_in" | "confirm_email" | null>(null);

  // If already logged in: recovery sessions must finish on /reset-password, not /dashboard
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
    setErrorSuggestion(null);
    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setError("Please enter your email");
      return;
    }
    if (!isValidEmail(emailTrimmed)) {
      setError("Please enter a valid email address");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }
    setEmail(emailTrimmed);
    setLoading(true);
    try {
      if (!supabase) {
        setError(NOT_CONFIGURED_MESSAGE);
        setLoading(false);
        return;
      }
      const { data, error: err } = await supabase.auth.signUp({
        email: emailTrimmed,
        password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (err) {
        logAuthError("signUp", err);
        const { message: friendlyMessage, suggestion } = getAuthErrorDisplay(err);
        setError(friendlyMessage);
        setErrorSuggestion(suggestion ?? null);
        setLoading(false);
        return;
      }
      if (data.session) {
        setLoading(false);
        setSuccess("signed_in");
        router.push("/dashboard");
        router.refresh();
        return;
      }
      setSuccess("confirm_email");
      setLoading(false);
      router.refresh();
    } catch (caught) {
      logAuthError("signUp catch", caught);
      setError("Something went wrong. Please try again.");
      setErrorSuggestion(null);
      setLoading(false);
    }
  }

  if (user) {
    return null;
  }

  // Success: email confirmation required — show clear success state and CTA to sign in
  if (success === "confirm_email") {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full min-w-0 max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-sky-500/20 bg-slate-900/80 p-6 shadow-lg">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/20">
            <svg className="h-6 w-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-semibold text-white">Check your email</h1>
          <p className="mb-6 text-sm text-zinc-400">
            We&apos;ve sent a confirmation link to <span className="font-medium text-zinc-300">{email}</span>. Click the link to activate your account, then sign in to continue.
          </p>
          <Link
            href="/sign-in"
            className="block w-full rounded-xl bg-sky-600 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-sky-500"
          >
            Go to sign in
          </Link>
          <p className="mt-4 text-center text-xs text-zinc-500">
            Didn&apos;t get the email? Check spam or{" "}
            <button type="button" onClick={() => setSuccess(null)} className="font-medium text-sky-400 hover:text-sky-300">
              try again
            </button>
          </p>
          <p className="mt-4 text-center">
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

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full min-w-0 max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-lg">
        <h1 className="mb-2 text-2xl font-semibold text-white">Sign up</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Create an account to save your strategies and journal data.
        </p>

        {!supabase && (
          <div className="mb-6">
            <SupabaseConfigHelp />
          </div>
        )}

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
              className="rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
              placeholder="you@example.com"
            />
          </label>

          <div className="space-y-1">
            <PasswordInput
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              disabled={loading}
              minLength={6}
            />
            <span className="text-xs text-zinc-500">At least 6 characters</span>
          </div>

          <AppButton type="submit" disabled={loading} className="w-full font-medium">
            {loading ? "Creating account..." : "Sign up"}
          </AppButton>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-sky-400 hover:text-sky-300"
          >
            Sign in
          </Link>
        </p>
        <p className="mt-4 text-center">
          <Link href="/" className="inline-flex min-h-11 items-center text-sm text-zinc-500 hover:text-zinc-300">
            Home
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-[10px] text-zinc-500">
        For development: you can turn off email confirmation in Supabase Dashboard → Authentication → Providers → Email.
      </p>
      <p className="mt-2 text-center text-[10px] uppercase tracking-wider text-zinc-500">
        For journaling and discipline only. Not financial advice.
      </p>
    </div>
  );
}
