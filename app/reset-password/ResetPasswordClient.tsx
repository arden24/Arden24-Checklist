"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SupabaseConfigHelp from "@/components/SupabaseConfigHelp";
import PasswordInput from "@/components/PasswordInput";
import { getAuthErrorDisplay, logAuthError } from "@/lib/auth-errors";
import AppButton from "@/components/AppButton";

const NOT_CONFIGURED_MESSAGE =
  "Add the environment variables shown above to .env.local and restart the dev server (npm run dev).";

const MIN_PASSWORD_LENGTH = 6;

const isDev = process.env.NODE_ENV === "development";

type Phase = "loading" | "form" | "invalid" | "success" | "config";

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [phase, setPhase] = useState<Phase>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (!supabase) {
      setPhase("config");
      return;
    }

    let cancelled = false;

    (async () => {
      const code = searchParams.get("code");
      if (isDev) {
        console.log("[reset-password] page load", {
          hasCode: Boolean(code),
          codeLength: code?.length ?? 0,
        });
      }

      const { data: before } = await supabase.auth.getSession();
      if (isDev) {
        console.log("[reset-password] session (before exchange)", before.session);
      }

      if (cancelled) return;

      if (before.session) {
        if (code) {
          router.replace("/reset-password");
        }
        setPhase("form");
        return;
      }

      if (code) {
        const { data: exchanged, error: exchangeErr } =
          await supabase.auth.exchangeCodeForSession(code);
        if (isDev) {
          console.log("[reset-password] exchangeCodeForSession", {
            error: exchangeErr,
            hasSession: Boolean(exchanged?.session),
          });
        }
        if (cancelled) return;
        if (exchangeErr) {
          logAuthError("exchangeCodeForSession", exchangeErr);
          setPhase("invalid");
          return;
        }
        router.replace("/reset-password");
      }

      const { data: after } = await supabase.auth.getSession();
      if (isDev) {
        console.log("[reset-password] session (after exchange)", after.session);
      }

      if (cancelled) return;

      if (after.session) {
        setPhase("form");
      } else {
        setPhase("invalid");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, searchParams, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase) {
      setError(NOT_CONFIGURED_MESSAGE);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("This password reset link is invalid or has expired.");
      return;
    }

    console.log("[reset-password] password before submit", password);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        logAuthError("updateUser password (reset)", err);
        setError(getAuthErrorDisplay(err).message);
        setSubmitting(false);
        return;
      }
      setPhase("success");
      setSubmitting(false);
      router.refresh();
    } catch (caught) {
      logAuthError("updateUser password (reset) catch", caught);
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (phase === "config") {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full min-w-0 max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-lg">
          <h1 className="mb-2 text-xl font-semibold text-white">Set new password</h1>
          <p className="mb-4 text-sm text-zinc-400">
            Supabase is not configured in this environment.
          </p>
          <SupabaseConfigHelp />
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full min-w-0 max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 text-center shadow-lg">
          <p className="text-sm text-zinc-400">Checking your reset link...</p>
        </div>
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full min-w-0 max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-lg">
          <h1 className="mb-2 text-xl font-semibold text-white">Reset link</h1>
          <p className="mb-6 text-sm text-zinc-400">
            This password reset link is invalid or has expired.
          </p>
          <Link
            href="/forgot-password"
            className="block w-full rounded-xl bg-sky-600 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-sky-500"
          >
            Request a new link
          </Link>
          <p className="mt-4 text-center text-sm text-zinc-400">
            <Link href="/sign-in" className="font-medium text-sky-400 hover:text-sky-300">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (phase === "success") {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full min-w-0 max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-sky-500/20 bg-slate-900/80 p-6 shadow-lg">
          <h1 className="mb-2 text-xl font-semibold text-white">Password updated</h1>
          <p className="mb-6 text-sm text-zinc-400">
            Your password has been updated successfully.
          </p>
          <Link
            href="/dashboard"
            className="block w-full rounded-xl bg-sky-600 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-sky-500"
          >
            Continue to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full min-w-0 max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-lg">
        <h1 className="mb-2 text-2xl font-semibold text-white">Set new password</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Choose a new password for your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              role="alert"
            >
              {error}
            </div>
          )}

          <PasswordInput
            id="reset-new-password"
            name="new-password"
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            disabled={submitting}
            minLength={MIN_PASSWORD_LENGTH}
          />
          <span className="block text-xs text-zinc-500">
            At least {MIN_PASSWORD_LENGTH} characters
          </span>

          <PasswordInput
            id="reset-confirm-password"
            name="confirm-new-password"
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            disabled={submitting}
            minLength={MIN_PASSWORD_LENGTH}
          />

          <AppButton type="submit" disabled={submitting} className="w-full font-medium">
            {submitting ? "Updating password..." : "Update password"}
          </AppButton>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          <Link href="/sign-in" className="font-medium text-sky-400 hover:text-sky-300">
            Back to sign in
          </Link>
        </p>
        <p className="mt-3 text-center text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-300">
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
