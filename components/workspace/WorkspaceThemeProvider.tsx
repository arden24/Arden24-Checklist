"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  isWorkspaceThemeId,
  WORKSPACE_THEME_STORAGE_KEY,
  type WorkspaceThemeId,
} from "@/lib/workspace-theme";
import { useActivePlan } from "@/lib/subscriptions/use-active-plan";
import { canUseEliteWorkspaceThemes } from "@/lib/subscriptions/tier-gates";
import type { PlanKey } from "@/lib/subscriptions/plans";

type WorkspaceThemeContextValue = {
  themeId: WorkspaceThemeId;
  setThemeId: (id: WorkspaceThemeId) => void;
  plan: PlanKey | null;
  planLoading: boolean;
};

const WorkspaceThemeContext = createContext<WorkspaceThemeContextValue | null>(
  null
);

function readStoredTheme(): WorkspaceThemeId {
  if (typeof window === "undefined") return "arden";
  try {
    const raw = window.localStorage.getItem(WORKSPACE_THEME_STORAGE_KEY);
    return isWorkspaceThemeId(raw) ? raw : "arden";
  } catch {
    return "arden";
  }
}

export function WorkspaceThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { plan, loading: planLoading } = useActivePlan();
  const [themeId, setThemeIdState] = useState<WorkspaceThemeId>("arden");

  useEffect(() => {
    if (planLoading) return;
    const stored = readStoredTheme();
    const elite = canUseEliteWorkspaceThemes(plan);
    const next = elite ? stored : "arden";
    setThemeIdState(next);
    if (!elite && stored !== "arden") {
      try {
        window.localStorage.removeItem(WORKSPACE_THEME_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, [plan, planLoading]);

  useEffect(() => {
    if (themeId === "arden") {
      delete document.documentElement.dataset.workspaceTheme;
    } else {
      document.documentElement.dataset.workspaceTheme = themeId;
    }
  }, [themeId]);

  const setThemeId = useCallback(
    (id: WorkspaceThemeId) => {
      if (planLoading) return;
      if (!canUseEliteWorkspaceThemes(plan)) return;
      setThemeIdState(id);
      try {
        if (id === "arden") {
          window.localStorage.removeItem(WORKSPACE_THEME_STORAGE_KEY);
        } else {
          window.localStorage.setItem(WORKSPACE_THEME_STORAGE_KEY, id);
        }
      } catch {
        // ignore
      }
    },
    [plan, planLoading]
  );

  const value = useMemo(
    () => ({ themeId, setThemeId, plan, planLoading }),
    [themeId, setThemeId, plan, planLoading]
  );

  return (
    <WorkspaceThemeContext.Provider value={value}>
      {children}
    </WorkspaceThemeContext.Provider>
  );
}

export function useWorkspaceTheme() {
  const ctx = useContext(WorkspaceThemeContext);
  if (!ctx) {
    throw new Error("useWorkspaceTheme must be used within WorkspaceThemeProvider");
  }
  return ctx;
}
