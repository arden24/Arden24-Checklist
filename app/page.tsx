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

          <div className="mt-8 flex flex-col items-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-xl bg-sky-500 px-6 py-3 font-semibold text-black"
            >
              Open Dashboard
            </Link>
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              <Link
                href="/strategies"
                className="rounded-xl border border-white/20 px-4 py-2 font-medium text-white hover:border-sky-400/70 hover:text-sky-200"
              >
                Strategies
              </Link>
              <Link
                href="/checklist"
                className="rounded-xl border border-white/20 px-4 py-2 font-medium text-white hover:border-sky-400/70 hover:text-sky-200"
              >
                Checklist
              </Link>
              <Link
                href="/open-trades"
                className="rounded-xl border border-white/20 px-4 py-2 font-medium text-white hover:border-sky-400/70 hover:text-sky-200"
              >
                Live trades
              </Link>
              <Link
                href="/journal"
                className="rounded-xl border border-white/20 px-4 py-2 font-medium text-white hover:border-sky-400/70 hover:text-sky-200"
              >
                Journal
              </Link>
              <Link
                href="/stats"
                className="rounded-xl border border-white/20 px-4 py-2 font-medium text-white hover:border-sky-400/70 hover:text-sky-200"
              >
                Stats
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-700/50 bg-black/60">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-semibold">Your Strategies</h2>
              <p className="mt-2 text-sm text-gray-400">
                Keep your playbook visible on your landing page so you can
                review it before you even open a chart.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/strategies/new"
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-black"
              >
                + New strategy
              </Link>
              <Link
                href="/strategies"
                className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white"
              >
                View all strategies
              </Link>
            </div>
          </div>

          {strategies.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-gray-700 bg-gray-900/60 p-6 text-sm text-zinc-300">
              <p className="font-medium text-gray-100">
                No strategies saved yet.
              </p>
              <p className="mt-2">
                Build your first checklist so you can hold yourself accountable
                before every trade.
              </p>
              <Link
                href="/strategies/new"
                className="mt-4 inline-flex items-center rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-black"
              >
                Create a strategy
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {strategies.map((strategy) => (
                <article
                  key={strategy.id}
                  className="flex flex-col justify-between rounded-2xl border border-gray-700 bg-gray-900 p-5 shadow-lg"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {strategy.name}
                        </h3>
                        {(strategy.market || strategy.timeframes) && (
                          <p className="mt-1 text-xs text-gray-400">
                            {[strategy.market, strategy.timeframes]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>

                    {strategy.description && (
                      <p className="mt-3 line-clamp-3 text-sm text-zinc-300">
                        {strategy.description}
                      </p>
                    )}

                    {strategy.checklist && strategy.checklist.length > 0 && (
                      <ul className="mt-4 space-y-1 text-xs text-gray-200">
                        {normaliseChecklistItems(strategy)
                          .slice(0, 3)
                          .map((item, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 rounded-lg bg-gray-800/60 px-3 py-2"
                            >
                              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
                              <span>{item.text}</span>
                            </li>
                          ))}
                        {strategy.checklist.length > 3 && (
                          <li className="px-3 pt-1 text-[11px] text-gray-400">
                            + {strategy.checklist.length - 3} more items
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="mt-6 text-xs text-gray-400">
            Arden24 is a product of Arden Ventures Ltd. For journaling, discipline and self-review only. Not financial advice.
          </p>
        </div>
      </section>
    </main>
  );
}
