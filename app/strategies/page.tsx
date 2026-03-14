"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import StrategyCard from "@/components/strategy-card";
import { useAuth } from "@/contexts/AuthContext";
import { getStrategiesKey } from "@/lib/storage-keys";
import { createClient } from "@/lib/supabase/client";
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
    if (supabase && user) {
      setLoading(true);
      fetchStrategies(supabase)
        .then(setStrategies)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else if (typeof window !== "undefined") {
      setLoading(true);
      try {
        const raw = window.localStorage.getItem(strategiesKey);
        setStrategies(raw ? (JSON.parse(raw) as Strategy[]) : []);
      } catch {
        setStrategies([]);
      }
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
      } catch (err) {
        console.error(err);
        alert("Failed to delete strategy. Please try again.");
      }
    } else {
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
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-4xl font-bold">Strategy Builder</h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              Design your playbook, define your conditions, and keep yourself
              accountable before every trade.
            </p>
          </div>
          <Link
            href="/strategies/new"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black"
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
              className="mt-4 inline-flex items-center rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-black"
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
      </div>
    </main>
  );
}
