"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function AccountPage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Account</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Your account details and sign out.
          </p>
        </header>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Email
              </dt>
              <dd className="mt-1 text-zinc-200">
                {user?.email ?? "—"}
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-emerald-400/60 hover:text-emerald-300"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <p className="text-xs text-zinc-500">
          This app is designed for trading discipline, journaling and self-review.
          It does not provide financial advice.
        </p>
      </div>
    </main>
  );
}
