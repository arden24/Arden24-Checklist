"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  FormEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getStrategiesKey } from "@/lib/storage-keys";
import { createClient } from "@/lib/supabase/client";
import { logError } from "@/lib/log-error";
import {
  clearStrategyDraftFromSession,
  readStrategyDraftForEditPage,
  writeStrategyDraftToSession,
  type StrategyFormFields,
} from "@/lib/strategy-session-draft";
import {
  fetchStrategyById,
  updateStrategy,
  type Strategy,
  type ChecklistItem,
} from "@/lib/supabase/strategies";
import { chooseDraftSource } from "@/lib/draft-conflict";
import {
  fetchUserDraft,
  upsertUserDraft,
  deleteUserDraft,
} from "@/lib/supabase/user-drafts";
import { resolveChecklistImageRefs } from "@/lib/supabase/checklist-images";
import BackButton from "@/components/BackButton";
import PageContainer from "@/components/PageContainer";
import { StrategyBuilderForm } from "@/components/strategy-builder-form";
import {
  snapshotFormFromStrategy,
  withConfluenceRowKeys,
} from "@/lib/strategy-form-helpers";

type EditStrategyFormLoadedProps = {
  strategy: Strategy;
  strategiesKey: string;
  supabase: ReturnType<typeof createClient>;
  user: ReturnType<typeof useAuth>["user"];
};

function EditStrategyFormLoaded({
  strategy,
  strategiesKey,
  supabase,
  user,
}: EditStrategyFormLoadedProps) {
  const router = useRouter();
  const [form, setForm] = useState<StrategyFormFields>(() =>
    snapshotFormFromStrategy(strategy),
  );
  const [scratchNotes, setScratchNotes] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const skipNextStrategyPersistRef = useRef(false);
  const persistTimerRef = useRef<number | null>(null);
  const strategyRef = useRef(strategy);
  strategyRef.current = strategy;
  const { name, description, market, timeframes, checklistItems } = form;
  const [isSaving, setIsSaving] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [builderRemountKey, setBuilderRemountKey] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = strategyRef.current;
    const baseline = snapshotFormFromStrategy(s);
    const fromSession = readStrategyDraftForEditPage(s.id, baseline);
    if (supabase && user?.id) {
      fetchUserDraft(supabase, user.id, `strategy:edit:${s.id}:draft`)
        .then(async (row) => {
          const serverPayload = row?.payload as Record<string, unknown> | null;
          const server =
            serverPayload && typeof serverPayload === "object"
              ? serverPayload
              : null;

          const which = chooseDraftSource({
            localUpdatedAt:
              (fromSession as { updatedAt?: string })?.updatedAt ?? null,
            serverUpdatedAt: row?.updatedAt ?? null,
          });

          const candidate =
            which === "server"
              ? server
              : which === "local"
                ? fromSession
                : (server ?? fromSession);

          if (candidate) {
            const next = { ...baseline, ...candidate } as StrategyFormFields;
            next.checklistItems = withConfluenceRowKeys(
              next.checklistItems.length > 0
                ? next.checklistItems
                : baseline.checklistItems,
            );
            const refs = next.checklistItems
              .map((i) => (i as ChecklistItem).imageRef)
              .filter(Boolean) as string[];
            if (refs.length > 0) {
              try {
                const byRef = await resolveChecklistImageRefs(supabase, refs);
                next.checklistItems = next.checklistItems.map((i) => {
                  const it = i as ChecklistItem;
                  return {
                    ...it,
                    image: it.imageRef
                      ? (byRef[it.imageRef] ?? it.image)
                      : it.image,
                  };
                });
              } catch {
                // ignore
              }
            }
            setForm(next);
          }
        })
        .catch(logError)
        .finally(() => setHydrated(true));
      return;
    }

    if (fromSession) {
      const items =
        fromSession.checklistItems.length > 0
          ? fromSession.checklistItems
          : baseline.checklistItems;
      setForm({
        ...fromSession,
        checklistItems: withConfluenceRowKeys(items),
      });
    }
    setHydrated(true);
  }, [strategy.id, supabase, user]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    if (skipNextStrategyPersistRef.current) {
      skipNextStrategyPersistRef.current = false;
      return;
    }
    writeStrategyDraftToSession({
      mode: "edit",
      strategyId: strategy.id,
      ...form,
    });

    if (supabase && user?.id) {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = window.setTimeout(() => {
        const payload = {
          ...form,
          checklistItems: form.checklistItems.map((i) => ({
            ...i,
            image: i.imageRef ? undefined : i.image,
          })),
        };
        upsertUserDraft(
          supabase,
          user.id,
          `strategy:edit:${strategy.id}:draft`,
          payload,
        ).catch(logError);
      }, 600);
    }
  }, [hydrated, form, strategy.id, supabase, user]);

  const resetFormDraft = useCallback(() => {
    skipNextStrategyPersistRef.current = true;
    setForm(snapshotFormFromStrategy(strategy));
    setScratchNotes("");
    setSaveAttempted(false);
    setBuilderRemountKey((k) => k + 1);
    clearStrategyDraftFromSession({ editStrategyId: strategy.id });
    if (supabase && user?.id) {
      deleteUserDraft(
        supabase,
        user.id,
        `strategy:edit:${strategy.id}:draft`,
      ).catch(logError);
    }
  }, [strategy, supabase, user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveAttempted(true);
    if (!name.trim()) {
      alert("Please add a strategy name.");
      return;
    }

    setIsSaving(true);
    try {
      const serverChecklist = checklistItems
        .map((item) => ({
          text: item.text.trim(),
          timeframe: item.timeframe.trim(),
          image: item.imageRef ?? item.image,
          imageRef: item.imageRef,
          weight: item.weight,
          critical: item.critical,
        }))
        .filter((item) => item.text.length > 0);
      const localChecklist = checklistItems
        .map((item) => ({
          text: item.text.trim(),
          timeframe: item.timeframe.trim(),
          image: item.image,
          imageRef: item.imageRef,
          weight: item.weight,
          critical: item.critical,
        }))
        .filter((item) => item.text.length > 0);

      if (supabase && user) {
        await updateStrategy(supabase, strategy.id, {
          name: name.trim(),
          description: description.trim(),
          market: market.trim(),
          timeframes: timeframes.trim(),
          checklist: serverChecklist,
        });
      } else {
        const updatedStrategy: Strategy = {
          ...strategy,
          name: name.trim(),
          description: description.trim(),
          market: market.trim(),
          timeframes: timeframes.trim(),
          checklist: localChecklist,
        };
        const raw = window.localStorage.getItem(strategiesKey);
        const all = raw ? (JSON.parse(raw) as Strategy[]) : [];
        const next = all.map((s) =>
          s.id === strategy.id ? updatedStrategy : s,
        );
        window.localStorage.setItem(strategiesKey, JSON.stringify(next));
      }

      resetFormDraft();
      router.push("/strategies");
    } catch (err) {
      logError(err);
      alert("Failed to save strategy. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <StrategyBuilderForm
      key={builderRemountKey}
      form={form}
      setForm={setForm}
      scratchNotes={scratchNotes}
      setScratchNotes={setScratchNotes}
      supabase={supabase}
      user={user ? { id: user.id } : null}
      saveAttempted={saveAttempted}
      setSaveAttempted={setSaveAttempted}
      onSubmit={handleSubmit}
      submitLabel="Save"
      isSubmitting={isSaving}
      onResetDraft={resetFormDraft}
    />
  );
}

export default function EditStrategyPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const supabaseClient = useMemo(() => createClient(), []);
  const strategiesKey = getStrategiesKey(user?.id);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id;
    if (!id) {
      setLoading(false);
      return;
    }
    if (supabaseClient && user) {
      fetchStrategyById(supabaseClient, id)
        .then((s) => {
          if (s) setStrategy(s);
        })
        .catch(logError)
        .finally(() => setLoading(false));
    } else if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(strategiesKey);
        const parsed = raw ? (JSON.parse(raw) as Strategy[]) : [];
        const found = parsed.find((s) => s.id === id);
        if (found) setStrategy(found);
      } catch {
        // ignore
      }
      setLoading(false);
    }
  }, [params.id, strategiesKey, supabaseClient, user]);

  if (loading || !strategy) {
    return (
      <main className="min-h-screen min-w-0 bg-black py-8 text-white sm:py-10">
        <PageContainer maxWidthClass="max-w-2xl">
          <p className="text-sm text-zinc-400">
            {loading ? "Loading strategy…" : "Strategy not found."}
          </p>
        </PageContainer>
      </main>
    );
  }

  return (
    <main className="min-h-screen min-w-0 bg-black py-8 text-white sm:py-10">
      <PageContainer maxWidthClass="max-w-2xl">
        <BackButton fallbackHref="/strategies" label="Back" />

        <header className="mt-6 min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit strategy
          </h1>
          <p className="text-sm text-zinc-500">
            Name and summary first, then optional key points (mock),
            confluences, and save.
          </p>
        </header>

        <EditStrategyFormLoaded
          key={strategy.id}
          strategy={strategy}
          strategiesKey={strategiesKey}
          supabase={supabaseClient}
          user={user}
        />
      </PageContainer>
    </main>
  );
}
