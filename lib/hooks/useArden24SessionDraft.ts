"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

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

function readMergedDraft<T extends Record<string, unknown>>(
  primaryKey: string,
  legacyKeys: readonly string[],
  initialState: T
): T {
  if (typeof window === "undefined") return initialState;

  const order = [primaryKey, ...legacyKeys];
  for (const key of order) {
    const partial = safeParse<T>(sessionStorage.getItem(key));
    if (partial && Object.keys(partial).length > 0) {
      const merged = { ...initialState, ...partial } as T;
      if (key !== primaryKey) {
        try {
          sessionStorage.setItem(primaryKey, JSON.stringify(merged));
          sessionStorage.removeItem(key);
        } catch {
          // ignore quota / private mode
        }
      }
      return merged;
    }
  }
  return initialState;
}

function writeDraft<T extends Record<string, unknown>>(storageKey: string, state: T) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // ignore
  }
}

/**
 * Draft state in sessionStorage for Arden24 (client-only).
 * - Hydrates in useLayoutEffect (before paint) so values return quickly after route changes.
 * - Persists on every update via the returned setter (sync sessionStorage.write) so navigating
 *   away immediately after typing still keeps the latest draft. Hydration uses the internal
 *   setter only (no write) so we never overwrite storage with empty defaults before merge.
 * - reset() clears React state and removes the primary storage key.
 */
const EMPTY_LEGACY: readonly string[] = [];

export function useArden24SessionDraft<T extends Record<string, unknown>>(
  storageKey: string,
  initialState: T,
  legacyReadKeys: readonly string[] = EMPTY_LEGACY
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const [state, setStateInternal] = useState<T>(initialState);
  const readyRef = useRef(false);
  const initialRef = useRef(initialState);
  initialRef.current = initialState;
  const legacyRef = useRef(legacyReadKeys);
  legacyRef.current = legacyReadKeys;

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const merged = readMergedDraft(storageKey, legacyRef.current, initialRef.current);
    setStateInternal(merged);
    readyRef.current = true;
  }, [storageKey]);

  const setState = useCallback(
    (action: React.SetStateAction<T>) => {
      setStateInternal((prev) => {
        const next = typeof action === "function" ? (action as (p: T) => T)(prev) : action;
        if (typeof window !== "undefined" && readyRef.current) {
          writeDraft(storageKey, next);
        }
        return next;
      });
    },
    [storageKey]
  );

  const reset = useCallback(() => {
    const init = initialRef.current;
    setStateInternal(init);
    readyRef.current = true;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
  }, [storageKey]);

  return [state, setState, reset];
}
