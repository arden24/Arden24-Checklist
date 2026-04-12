"use client";

import type { ReactNode } from "react";

const ic = "h-3.5 w-3.5 shrink-0 text-sky-300";

function IconLogTrade() {
  return (
    <svg viewBox="0 0 20 20" className={ic} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 12h12M4 8l3 3 3-3 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCalculator() {
  return (
    <svg viewBox="0 0 20 20" className={ic} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M5 5h10v10H5z" strokeLinejoin="round" />
      <path d="M8 8h4M8 12h4" strokeLinecap="round" />
    </svg>
  );
}

function IconNewStrategy() {
  return (
    <svg viewBox="0 0 20 20" className={ic} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M10 5v10M5 10h10" strokeLinecap="round" />
    </svg>
  );
}

function IconChecklist() {
  return (
    <svg viewBox="0 0 20 20" className={ic} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M5 6l2 2 4-4M5 10h10M5 14h7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg viewBox="0 0 20 20" className={ic} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="3" width="5" height="5" rx="0.5" strokeLinejoin="round" />
      <rect x="12" y="3" width="5" height="5" rx="0.5" strokeLinejoin="round" />
      <rect x="3" y="12" width="5" height="5" rx="0.5" strokeLinejoin="round" />
      <rect x="12" y="12" width="5" height="5" rx="0.5" strokeLinejoin="round" />
    </svg>
  );
}

export type QuickActionEntry = {
  id: string;
  href: string;
  /** Desktop menu & default */
  label: string;
  /** Mobile drawer — falls back to `label` */
  labelCompact?: string;
  icon: ReactNode;
  /** Primary CTA — subtle emphasis (Log a trade) */
  primary?: boolean;
};

/** Shared shortcuts: same order and copy for mobile Quick actions + desktop Quick access (subset). */
export const QUICK_ACTIONS_CORE: QuickActionEntry[] = [
  {
    id: "log-trade",
    href: "/dashboard#dashboard-calculator",
    label: "Log a trade",
    primary: true,
    icon: <IconLogTrade />,
  },
  {
    id: "calculator",
    href: "/calculator",
    label: "Lot size calculator",
    labelCompact: "Lot calculator",
    icon: <IconCalculator />,
  },
  {
    id: "new-strategy",
    href: "/strategies/new",
    label: "New strategy",
    icon: <IconNewStrategy />,
  },
  {
    id: "checklist",
    href: "/checklist",
    label: "Checklist & log trade",
    labelCompact: "Checklist",
    icon: <IconChecklist />,
  },
];

/** Desktop Quick access menu = core shortcuts + home dashboard link. */
export const QUICK_ACTIONS_DESKTOP_MENU: QuickActionEntry[] = [
  ...QUICK_ACTIONS_CORE,
  {
    id: "dashboard",
    href: "/dashboard",
    label: "Dashboard",
    icon: <IconDashboard />,
  },
];

/**
 * @param windowHash — from `useWindowHash()` / `window.location.hash` (may include leading `#`).
 */
export function isQuickActionActive(pathname: string, href: string, windowHash = ""): boolean {
  const [path, fragment] = href.split("#");
  const normalized = windowHash.startsWith("#") ? windowHash.slice(1) : windowHash;

  if (fragment) {
    const pathOk = pathname === path || pathname.startsWith(`${path}/`);
    if (!pathOk) return false;
    return normalized === fragment;
  }

  const pathOk = pathname === href || pathname.startsWith(`${href}/`);
  if (!pathOk) return false;

  /** Avoid marking "Dashboard" current when a section hash is present on the same path. */
  if (href === "/dashboard" && normalized) {
    return false;
  }

  return true;
}

/** Subtle emphasis for the primary quick action (Log a trade). */
export const quickActionPrimaryShellClass =
  "border-sky-400/45 bg-sky-500/[0.14] shadow-[0_0_24px_rgba(56,189,248,0.12),inset_0_1px_0_0_rgba(255,255,255,0.06)] ring-1 ring-sky-400/20";
