"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SupabaseConfigHelp from "@/components/SupabaseConfigHelp";
import { getAuthErrorDisplay } from "@/lib/auth-errors";

const NOT_CONFIGURED_MESSAGE =
  "Add the environment variables shown above to .env.local and restart the dev server (npm run dev).";

export default function SignInPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorSuggestion, setErrorSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorSuggestion(null);
    setLoading(true);
    try {
      if (!supabase) {
        setError(NOT_CONFIGURED_MESSAGE);
        setLoading(false);
        return;
      }
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        const { message: friendlyMessage, suggestion } = getAuthErrorDisplay(err);
        setError(friendlyMessage);
        setErrorSuggestion(suggestion ?? null);
        setLoading(false);
        return;
      }
      setLoading(false);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setErrorSuggestion(null);
      setLoading(false);
    }
  }

  if (user) {
    return null; // Redirecting to dashboard
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-lg">
        <h1 className="mb-2 text-2xl font-semibold text-white">Sign in</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Sign in to access your trading journal and strategies.
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
              required
              autoComplete="email"
              className="rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-300">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-emerald-400 hover:text-emerald-300"
          >
            Sign up
          </Link>
        </p>
      </div>

      <p className="mt-8 text-center text-[10px] uppercase tracking-wider text-zinc-500">
        For journaling and discipline only. Not financial advice.
      </p>
    </div>
  );
}
