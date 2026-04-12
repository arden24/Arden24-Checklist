"use client";

import { useEffect, useState } from "react";

/**
 * Tracks `window.location.hash` for client-side active states (e.g. `/dashboard#…`).
 * Re-syncs on pathname changes (App Router client navigations) and hash/pop events.
 */
export function useWindowHash(pathname: string): string {
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(typeof window !== "undefined" ? window.location.hash : "");
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [pathname]);

  return hash;
}
