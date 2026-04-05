"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import StrategyCard from "@/components/strategy-card";
import PageContainer from "@/components/PageContainer";
import { useAuth } from "@/contexts/AuthContext";
import { getStrategiesKey } from "@/lib/storage-keys";
import { createClient } from "@/lib/supabase/client";
import { logError } from "@/lib/log-error";
import {
  fetchStrategies,
  deleteStrategy as deleteStrategyApi,
  type Strategy,
} from "@/lib/supabase/strategies";

export default function StrategiesPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const strategiesKey = getStrategiesKey(user?.id);

  const load = useCallback(() => {
    setLoading(true);

    if (supabase && user) {
      fetchStrategies(supabase)
        .then(setStrategies)
        .catch((err) => {
          // If Supabase fetch fails (e.g. auth / RLS issue), fall back to local storage
          logError(err);
          if (typeof window !== "undefined") {
            try {
              const raw = window.localStorage.getItem(strategiesKey);
              setStrategies(raw ? (JSON.parse(raw) as Strategy[]) : []);
            } catch {
              setStrategies([]);
            }
          } else {
            setStrategies([]);
          }
        })
        .finally(() => setLoading(false));
    } else if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(strategiesKey);
        setStrategies(raw ? (JSON.parse(raw) as Strategy[]) : []);
      } catch {
        setStrategies([]);
      }
      setLoading(false);
    } else {
      setStrategies([]);
      setLoading(false);
    }
  }, [supabase, user, strategiesKey]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    if (
      !window.confirm(
        "Are you sure you want to delete this strategy? This cannot be undone."
      )
    ) {
      return;
    }

    if (supabase && user) {
      try {
        await deleteStrategyApi(supabase, id);
        setStrategies((prev) => prev.filter((s) => s.id !== id));
        return;
      } catch (err) {
        // If Supabase delete fails (e.g. auth / RLS issue), fall back to local storage
        logError(err);
      }
    }

    // Local fallback (or primary path when no Supabase/user)
    setStrategies((prev) => {
      const next = prev.filter((s) => s.id !== id);
      try {
        window.localStorage.setItem(strategiesKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <main className="min-h-screen min-w-0 bg-black py-8 text-white sm:py-10">
      <PageContainer className="flex flex-col gap-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start sm:gap-6 md:items-center">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold sm:text-4xl">Strategy Builder</h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              Design your playbook, define your conditions, and keep yourself
              accountable before every trade.
            </p>
          </div>
          <Link
            href="/strategies/new"
            className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-black touch-manipulation sm:w-auto sm:min-h-0"
          >
            + New strategy
          </Link>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-8 text-center text-sm text-zinc-400">
            Loading strategies…
          </div>
        ) : strategies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/60 p-8 text-sm text-zinc-300">
            <p className="font-medium text-zinc-100">
              No strategies saved yet.
            </p>
            <p className="mt-2">
              Start by creating your first strategy checklist so you can run
              through it before every trade.
            </p>
            <Link
              href="/strategies/new"
              className="mt-4 inline-flex items-center rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-black"
            >
              Build a strategy
            </Link>
          </div>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {strategies.map((strategy) => (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
                onEdit={() => {
                  window.location.href = `/strategies/${strategy.id}/edit`;
                }}
                onDelete={() => handleDelete(strategy.id)}
              />
            ))}
          </section>
        )}

        <p className="mt-4 text-xs text-zinc-500">
          This app is for journaling, discipline, and self-review only. It does
          not provide financial advice, signals, or any recommendation to buy or
          sell financial instruments.
        </p>
      </PageContainer>
    </main>
  );
}
