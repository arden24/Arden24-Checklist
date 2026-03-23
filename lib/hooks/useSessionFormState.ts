"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Namespace for all Arden24 session-scoped form drafts (tab closed = cleared). */
export const SESSION_FORM_PREFIX = "arden24:session:v1:";

export function sessionFormFullKey(key: string): string {
  return `${SESSION_FORM_PREFIX}${key}`;
}

function safeParse<T extends Record<string, unknown>>(raw: string | null): Partial<T> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (v != null && typeof v === "object" && !Array.isArray(v)) {
      return v as Partial<T>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persist form-like state in sessionStorage for the current browser tab session.
 * - Hydrates after mount (avoids SSR/client mismatch).
 * - Persists on every state change after hydration.
 * - reset() restores initial state and removes the storage key.
 *
 * Keep `initialState` stable (module constant or useMemo) so reset behaviour is correct.
 */
export function useSessionFormState<T extends Record<string, unknown>>(
  storageKey: string,
  initialState: T
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const fullKey = sessionFormFullKey(storageKey);
  const [state, setState] = useState<T>(initialState);
  /** After first client effect: session read applied (or skipped); safe to persist without clobbering. */
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from sessionStorage once on client
  useEffect(() => {
    if (typeof window === "undefined") return;
    const partial = safeParse<T>(sessionStorage.getItem(fullKey));
    if (partial && Object.keys(partial).length > 0) {
      setState((prev) => ({ ...prev, ...partial }) as T);
    }
    setHydrated(true);
  }, [fullKey]);

  // Persist drafts only after hydration (avoids overwriting storage with defaults before merge)
  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    try {
      sessionStorage.setItem(fullKey, JSON.stringify(state));
    } catch {
      // quota / private mode — ignore
    }
  }, [fullKey, hydrated, state]);

  const reset = useCallback(() => {
    setState(initialState);
    setHydrated(true);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(fullKey);
      } catch {
        // ignore
      }
    }
  }, [fullKey, initialState]);

  return [state, setState, reset];
}
