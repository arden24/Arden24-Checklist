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
        ? {
            text: item,
            timeframe: "",
            image: undefined,
            weight: 1,
            critical: false,
          }
        : {
            text: item.text ?? "",
            timeframe: item.timeframe ?? "",
            image: item.image,
            weight: Number.isFinite(Number(item.weight)) ? Number(item.weight) : 1,
            critical: Boolean(item.critical),
          }
    );
  }

  // Logged-out: marketing landing page
  if (!loading && !user) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-white">
        <section className="relative mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center px-4 pt-10 text-center sm:px-6 sm:pt-16">
          <div className="pointer-events-none absolute inset-x-0 top-10 -z-10 h-56 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_transparent_60%)]" />
          <div className="max-w-3xl w-full">
            <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-[0.25em] text-sky-400/80">
              Arden24
            </p>
            <p className="mb-6 text-[11px] uppercase tracking-[0.25em] text-zinc-500">
              Arden Ventures Ltd
            </p>

            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl md:leading-tight">
              Trade with{" "}
              <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                discipline
              </span>
              , not impulse.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm text-zinc-300 sm:text-base">
              Arden24 keeps your strategy, checklist, risk sizing, and journal
              in one focused workspace so you can execute cleanly in live
              markets.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/sign-in"
                className="rounded-full bg-sky-500 px-7 py-3 text-sm font-semibold text-black shadow-[0_10px_40px_rgba(56,189,248,0.35)] transition hover:bg-sky-400 hover:shadow-[0_10px_45px_rgba(56,189,248,0.45)]"
              >
                Sign in to your journal
              </Link>

              <Link
                href="/sign-up"
                className="rounded-full border border-zinc-700/80 bg-zinc-900/60 px-7 py-3 text-sm font-semibold text-zinc-100 shadow-[0_0_0_1px_rgba(148,163,184,0.35)] transition hover:border-sky-400/60 hover:bg-slate-900/90 hover:text-sky-100"
              >
                Get started in minutes
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[11px] text-zinc-500">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/5 px-3 py-1 text-emerald-300/90">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                Built for live trading
              </span>
              <span className="hidden sm:inline text-zinc-500">•</span>
              <span className="text-zinc-500">
                For journaling, discipline and self‑review only. Not financial advice.
              </span>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-800/80 bg-gradient-to-b from-black/40 via-slate-950/80 to-black pt-12 sm:pt-16">
          <div className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-16">
            <div className="mb-8 flex flex-col gap-2 text-left sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-sky-400/80">
                  Why traders use Arden24
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  Everything you need before, during, and after a trade.
                </p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {LANDING_FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="group flex flex-col rounded-2xl border border-slate-800/80 bg-slate-950/70 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.9)] transition hover:border-sky-500/50 hover:shadow-[0_22px_80px_rgba(8,47,73,0.9)]"
                >
                  <h3 className="text-base font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">
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
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-white">
      <section className="mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center px-4 text-center sm:px-6">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm uppercase tracking-[0.2em] text-sky-400">
            Built for traders
          </p>

          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl md:leading-tight">
            Your trading checklist, risk and journal in one place.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm text-zinc-300 sm:text-base">
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
              href="/notes"
              className="rounded-xl border border-white/20 px-4 py-2 font-medium text-white hover:bg-white/5"
            >
              Notes
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
