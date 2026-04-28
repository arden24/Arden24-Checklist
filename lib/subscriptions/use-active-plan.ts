"use client";

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { getActivePlanFromSubscriptionRow } from "@/lib/subscriptions/access";
import type { PlanKey } from "@/lib/subscriptions/plans";

type ActivePlanValue = {
  plan: PlanKey | null;
  loading: boolean;
};

const ActivePlanContext = createContext<ActivePlanValue | null>(null);

export function ActivePlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const supabase = useMemo(() => createClient(), []);
  const [plan, setPlan] = useState<PlanKey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const commit = (nextPlan: PlanKey | null, nextLoading: boolean) => {
      if (cancelled) return;
      setPlan(nextPlan);
      setLoading(nextLoading);
    };

    if (!supabase || !userId) {
      queueMicrotask(() => commit(null, false));
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
    });

    void (async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("subscription_status, subscription_plan, price_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        commit(null, false);
        return;
      }
      commit(getActivePlanFromSubscriptionRow(data), false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  const value = useMemo<ActivePlanValue>(
    () => ({ plan, loading }),
    [plan, loading]
  );

  return createElement(ActivePlanContext.Provider, { value }, children);
}

export function useActivePlan(): ActivePlanValue {
  const ctx = useContext(ActivePlanContext);
  if (!ctx) {
    throw new Error("useActivePlan must be used within ActivePlanProvider");
  }
  return ctx;
}
