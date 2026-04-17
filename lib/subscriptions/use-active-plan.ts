"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { getActivePlanFromSubscriptionRow } from "@/lib/subscriptions/access";
import type { PlanKey } from "@/lib/subscriptions/plans";

export function useActivePlan(): {
  plan: PlanKey | null;
  loading: boolean;
} {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [plan, setPlan] = useState<PlanKey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !user) {
      setPlan(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("subscription_status, subscription_plan, price_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setPlan(null);
        setLoading(false);
        return;
      }
      setPlan(getActivePlanFromSubscriptionRow(data));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  return { plan, loading };
}
