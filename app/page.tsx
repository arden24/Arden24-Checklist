"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getStrategiesKey } from "@/lib/storage-keys";
import { logError } from "@/lib/log-error";
import { createClient } from "@/lib/supabase/client";
import { fetchStrategies, type Strategy, type ChecklistItem } from "@/lib/supabase/strategies";

const LANDING_FEATURES = [
  {
    title: "Strategy Builder",
    description:
      "Create your own trading playbook with custom rules, checklist items, and setup structure.",
  },
  {
    title: "Trade Journal",
    description:
      "Log trades, screenshots, notes, and outcomes so you can review performance properly.",
  },
  {
    title: "Performance Dashboard",
    description:
      "Track profit and loss, win rate, confidence, and discipline in one clean dashboard.",
  },
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const supabase = createClient();
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  const load = useCallback(() => {
    if (supabase && user) {
      fetchStrategies(supabase).then(setStrategies).catch(logError);
    } else if (typeof window !== "undefined") {
      const key = getStrategiesKey(user?.id);
      try {
        const raw = window.localStorage.getItem(key);
        setStrategies(raw ? (JSON.parse(raw) as Strategy[]) : []);
      } catch {
        setStrategies([]);
      }
    }
  }, [supabase, user]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  function normaliseChecklistItems(strategy: Strategy): ChecklistItem[] {
    return (strategy.checklist ?? []).map((item: any) =>
      typeof item === "string"
        ? { text: item, timeframe: "", image: undefined }
        : {
            text: item.text ?? "",
            timeframe: item.timeframe ?? "",
            image: item.image,
          }
    );
  }

  // Logged-out: marketing landing page
  if (!loading && !user) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center px-6 pt-12 text-center">
          <div className="max-w-3xl w-full">
            <p className="mb-4 mt-6 text-sm uppercase tracking-[0.2em] text-sky-400">
              Arden24
            </p>
            <p className="mb-6 text-sm uppercase tracking-[0.2em] text-gray-400">
              Arden Ventures Ltd
            </p>

            <h1 className="text-5xl font-bold leading-tight md:text-7xl">
              Your trading checklist, calculator and journal in one place
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-300">
              Build your strategy checklist, calculate lot size, log trades, and
              track performance with a clean dashboard.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/sign-in"
                className="rounded-xl border border-sky-400/60 bg-sky-500/10 px-6 py-3 font-semibold text-sky-200 hover:border-sky-400/80 hover:bg-sky-500/20"
              >
                Sign In
              </Link>

              <Link
                href="/sign-up"
                className="rounded-xl border border-sky-400/60 bg-sky-500/10 px-6 py-3 font-semibold text-sky-200 hover:border-sky-400/80 hover:bg-sky-500/20"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-black/60 pt-16">
          <div className="mx-auto max-w-6xl px-6 pb-16">
            <div className="grid gap-6 md:grid-cols-3">
              {LANDING_FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="flex flex-col rounded-2xl border border-gray-700 bg-gray-900/80 p-6 shadow-lg"
                >
                  <h3 className="text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-400">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
            <p className="mt-10 text-center text-xs text-gray-400">
              Arden24 is a product of Arden Ventures Ltd. For journaling, discipline and self-review only. Not financial advice.
            </p>
          </div>
        </section>
      </main>
    );
  }

  // Logged-in: existing app homepage with strategies
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm uppercase tracking-[0.2em] text-sky-400">
            Built for traders
          </p>

          <h1 className="text-5xl font-bold leading-tight md:text-7xl">
            Your trading checklist, calculator and journal in one place
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-300">
            Build your strategy checklist, calculate lot size, log trades, and
            track performance with a clean dashboard.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-sky-500 px-6 py-3 font-semibold text-black"
            >
              Open Dashboard
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
            <Link
              href="/strategies"
              className="rounded-xl border border-white/20 px-4 py-2 font-medium text-white hover:bg-white/5"
            >
              Strategies
            </Link>
            <Link
              href="/checklist"
              className="rounded-xl border border-white/20 px-4 py-2 font-medium text-white hover:bg-white/5"
            >
              Checklist
            </Link>
            <Link
              href="/open-trades"
              className="rounded-xl border border-white/20 px-4 py-2 font-medium text-white hover:bg-white/5"
            >
              Live Trades
            </Link>
            <Link
              href="/journal"
              className="rounded-xl border border-white/20 px-4 py-2 font-medium text-white hover:bg-white/5"
            >
              Journal
            </Link>
            <Link
              href="/stats"
              className="rounded-xl border border-white/20 px-4 py-2 font-medium text-white hover:bg-white/5"
            >
              Stats
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
