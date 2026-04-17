"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getStrategiesKey } from "@/lib/storage-keys";
import { createClient } from "@/lib/supabase/client";
import { insertStrategy } from "@/lib/supabase/strategies";
import type { Strategy } from "@/lib/supabase/strategies";
import { chooseDraftSource } from "@/lib/draft-conflict";
import {
  fetchUserDraft,
  upsertUserDraft,
  deleteUserDraft,
} from "@/lib/supabase/user-drafts";
import { resolveChecklistImageRefs } from "@/lib/supabase/checklist-images";
import {
  clearStrategyDraftFromSession,
  readStrategyDraftForNewPage,
  writeStrategyDraftToSession,
  type StrategyFormFields,
} from "@/lib/strategy-session-draft";
import { logError } from "@/lib/log-error";
import { useAppToast } from "@/contexts/AppToastContext";
import { StrategyBuilderForm } from "@/components/strategy-builder-form";
import {
  emptyStrategyFormFields,
  withConfluenceRowKeys,
} from "@/lib/strategy-form-helpers";
import { useActivePlan } from "@/lib/subscriptions/use-active-plan";
import {
  BASIC_MAX_STRATEGIES,
  isBasicTier,
  normalizeChecklistForPlan,
  persistedChecklistFromNormalized,
} from "@/lib/subscriptions/tier-gates";

function loadStrategies(key: string): Strategy[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as Strategy[];
  } catch {
    return [];
  }
}

function saveStrategies(strategies: Strategy[], key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(strategies));
}

const STRATEGY_NEW_INITIAL = emptyStrategyFormFields();

export default function StrategyForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { pushToast } = useAppToast();
  const supabase = createClient();
  const strategiesKey = getStrategiesKey(user?.id);
  const { plan: subscriptionPlan, loading: planLoading } = useActivePlan();

  const [form, setForm] = useState<StrategyFormFields>(STRATEGY_NEW_INITIAL);
  const [scratchNotes, setScratchNotes] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const skipNextStrategyPersistRef = useRef(false);
  const persistTimerRef = useRef<number | null>(null);
  const { name, description, market, timeframes, checklistItems } = form;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [builderRemountKey, setBuilderRemountKey] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromSession = readStrategyDraftForNewPage(STRATEGY_NEW_INITIAL);

    if (supabase && user?.id) {
      fetchUserDraft(supabase, user.id, "strategy:new:draft")
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
            const next = {
              ...STRATEGY_NEW_INITIAL,
              ...candidate,
            } as StrategyFormFields;
            next.checklistItems = withConfluenceRowKeys(
              next.checklistItems.length > 0
                ? next.checklistItems
                : STRATEGY_NEW_INITIAL.checklistItems,
            );
            const refs = next.checklistItems
              .map((i) => i.imageRef)
              .filter(Boolean) as string[];
            if (refs.length > 0) {
              try {
                const byRef = await resolveChecklistImageRefs(supabase, refs);
                next.checklistItems = next.checklistItems.map((i) => ({
                  ...i,
                  image: i.imageRef ? (byRef[i.imageRef] ?? i.image) : i.image,
                }));
              } catch {
                // ignore resolution failures
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
          : STRATEGY_NEW_INITIAL.checklistItems;
      setForm({
        ...fromSession,
        checklistItems: withConfluenceRowKeys(items),
      });
    }
    setHydrated(true);
  }, [supabase, user?.id]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    if (skipNextStrategyPersistRef.current) {
      skipNextStrategyPersistRef.current = false;
      return;
    }
    writeStrategyDraftToSession({ mode: "new", ...form });

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
        upsertUserDraft(supabase, user.id, "strategy:new:draft", payload).catch(
          logError,
        );
      }, 600);
    }
  }, [hydrated, form, supabase, user?.id]);

  const resetFormDraft = useCallback(() => {
    skipNextStrategyPersistRef.current = true;
    setForm(emptyStrategyFormFields());
    setScratchNotes("");
    setSaveAttempted(false);
    setBuilderRemountKey((k) => k + 1);
    clearStrategyDraftFromSession();
    if (supabase && user?.id) {
      deleteUserDraft(supabase, user.id, "strategy:new:draft").catch(logError);
    }
  }, [supabase, user?.id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveAttempted(true);
    if (!name.trim()) {
      pushToast("Please add a strategy name.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (planLoading) {
        pushToast("Still loading your subscription. Please try again in a moment.", "error");
        return;
      }

      const tierForSave = subscriptionPlan ?? "basic";
      const rawServerChecklist = checklistItems
        .map((item) => ({
          text: item.text.trim(),
          timeframe: item.timeframe.trim(),
          image: item.imageRef ?? item.image,
          imageRef: item.imageRef,
          weight: item.weight,
          critical: item.critical,
        }))
        .filter((item) => item.text.length > 0);
      const serverChecklist = persistedChecklistFromNormalized(
        normalizeChecklistForPlan(tierForSave, rawServerChecklist)
      );
      const rawLocalChecklist = checklistItems
        .map((item) => ({
          text: item.text.trim(),
          timeframe: item.timeframe.trim(),
          image: item.image,
          imageRef: item.imageRef,
          weight: item.weight,
          critical: item.critical,
        }))
        .filter((item) => item.text.length > 0);
      const localChecklist = persistedChecklistFromNormalized(
        normalizeChecklistForPlan(tierForSave, rawLocalChecklist)
      );

      let savedToSupabase = false;

      if (supabase && user) {
        try {
          if (isBasicTier(subscriptionPlan)) {
            const { count, error: countError } = await supabase
              .from("strategies")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id);
            if (countError) throw countError;
            if ((count ?? 0) >= BASIC_MAX_STRATEGIES) {
              pushToast(
                `Basic includes up to ${BASIC_MAX_STRATEGIES} strategies. Upgrade to Pro for unlimited.`,
                "error",
              );
              return;
            }
          }
          await insertStrategy(supabase, user.id, {
            name: name.trim(),
            description: description.trim(),
            market: market.trim(),
            timeframes: timeframes.trim(),
            checklist: serverChecklist,
          });
          savedToSupabase = true;
        } catch (err) {
          logError(err);
        }
      }

      if (!savedToSupabase) {
        const nextStrategy: Strategy = {
          id: crypto.randomUUID(),
          name: name.trim(),
          description: description.trim(),
          market: market.trim(),
          timeframes: timeframes.trim(),
          checklist: localChecklist,
          createdAt: new Date().toISOString(),
        };
        const existing = loadStrategies(strategiesKey);
        saveStrategies([nextStrategy, ...existing], strategiesKey);
      }

      resetFormDraft();
      router.push("/strategies");
    } catch (err) {
      logError(err);
      pushToast("Failed to save strategy. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
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
      subscriptionPlan={subscriptionPlan}
      planLoading={planLoading}
      saveAttempted={saveAttempted}
      setSaveAttempted={setSaveAttempted}
      onSubmit={handleSubmit}
      submitLabel="Save strategy"
      isSubmitting={isSubmitting}
      onResetDraft={resetFormDraft}
    />
  );
}
