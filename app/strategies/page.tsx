"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import StrategyCard from "@/components/strategy-card";
import PageContainer from "@/components/PageContainer";
import { useAuth } from "@/contexts/AuthContext";
import { getStrategiesKey } from "@/lib/storage-keys";
import { createClient } from "@/lib/supabase/client";
import { logError } from "@/lib/log-error";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAppToast } from "@/contexts/AppToastContext";
import {
  fetchStrategies,
  deleteStrategy as deleteStrategyApi,
  type Strategy,
} from "@/lib/supabase/strategies";

export default function StrategiesPage() {
  const { user } = useAuth();
  const { pushToast } = useAppToast();
  const supabase = useMemo(() => createClient(), []);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
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

  function requestDelete(id: string) {
    setDeleteTargetId(id);
  }

  async function confirmDelete() {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteSubmitting(true);
    try {
      if (supabase && user) {
        try {
          await deleteStrategyApi(supabase, id);
          setStrategies((prev) => prev.filter((s) => s.id !== id));
          pushToast("Strategy deleted.", "success");
          setDeleteTargetId(null);
          return;
        } catch (err) {
          logError(err);
          pushToast("Could not delete on the server. Removing locally if possible.", "error");
        }
      }

      setStrategies((prev) => {
        const next = prev.filter((s) => s.id !== id);
        try {
          window.localStorage.setItem(strategiesKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      pushToast("Strategy removed.", "success");
    } finally {
      setDeleteSubmitting(false);
      setDeleteTargetId(null);
    }
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
            className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-black touch-manipulation transition-colors duration-150 ease-out hover:bg-sky-400 active:bg-sky-600 sm:w-auto sm:min-h-0"
          >
            + New strategy
          </Link>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-8 text-center text-sm text-zinc-400">
            Loading strategies…
          </div>
        ) : strategies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/60 p-8 text-sm leading-relaxed text-zinc-400">
            <p className="font-medium text-zinc-100">No strategies yet.</p>
            <p className="mt-2">
              Save one playbook — then use the checklist before you size a trade.
            </p>
            <Link
              href="/strategies/new"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-semibold text-black transition-colors duration-150 ease-out hover:bg-sky-400 active:bg-sky-600 sm:min-h-0"
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
                onDelete={() => requestDelete(strategy.id)}
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

      <ConfirmDialog
        open={deleteTargetId !== null}
        onClose={() => !deleteSubmitting && setDeleteTargetId(null)}
        title="Delete this strategy?"
        description="This permanently removes the strategy and its checklist. This cannot be undone."
        confirmLabel="Delete strategy"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        isLoading={deleteSubmitting}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  );
}
