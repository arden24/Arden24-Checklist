import type { ReactNode } from "react";

export type MainNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  showBadge?: boolean;
};

export function getMainNavItems(): MainNavItem[] {
  return [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: (
        <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-sky-400/60 bg-sky-500/10">
          <svg
            viewBox="0 0 20 20"
            className="h-3 w-3 text-sky-300"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="3" y="3" width="5" height="5" rx="0.5" />
            <rect x="12" y="3" width="5" height="5" rx="0.5" />
            <rect x="3" y="12" width="5" height="5" rx="0.5" />
            <rect x="12" y="12" width="5" height="5" rx="0.5" />
          </svg>
        </span>
      ),
    },
    {
      href: "/strategies",
      label: "Strategies",
      icon: (
        <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-blue-400/60 bg-blue-500/10">
          <svg
            viewBox="0 0 20 20"
            className="h-3 w-3 text-blue-300"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M4 6h12M4 10h12M4 14h8" />
          </svg>
        </span>
      ),
    },
    {
      href: "/checklist",
      label: "Checklist",
      icon: (
        <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-purple-400/60 bg-purple-500/10">
          <svg
            viewBox="0 0 20 20"
            className="h-3 w-3 text-purple-300"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M4 5h2v2H4V5z" />
            <path d="M4 9h2v2H4V9z" />
            <path d="M4 13h2v2H4v-2z" />
            <path d="M9 6h7M9 10h7M9 14h4" />
          </svg>
        </span>
      ),
    },
    {
      href: "/open-trades",
      label: "Live Trades",
      showBadge: true,
      icon: (
        <span className="relative flex h-5 w-5 items-center justify-center rounded-sm border border-cyan-400/60 bg-cyan-500/10">
          <svg
            viewBox="0 0 20 20"
            className="h-3 w-3 text-cyan-300"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 14l4-4 3 3 6-8" />
            <path d="M4 16h12" />
          </svg>
        </span>
      ),
    },
    {
      href: "/journal",
      label: "Journal",
      icon: (
        <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-amber-400/60 bg-amber-500/10">
          <svg
            viewBox="0 0 20 20"
            className="h-3 w-3 text-amber-300"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M4 4h12a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
            <path d="M6 8h8M6 11h5" />
          </svg>
        </span>
      ),
    },
    {
      href: "/notes",
      label: "Notes",
      icon: (
        <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-sky-400/60 bg-sky-500/10">
          <svg
            viewBox="0 0 20 20"
            className="h-3 w-3 text-sky-300"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 3h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
            <path d="M8 8h4M8 12h4" />
          </svg>
        </span>
      ),
    },
  ];
}

export const MOBILE_EXTRA_LINKS = [
  { href: "/calculator", label: "Lot size calculator" },
  { href: "/stats", label: "Stats (journal)" },
  { href: "/strategies/new", label: "New strategy" },
] as const;

/** Active state for primary nav (matches desktop pill logic). */
export function isMainNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/" || pathname.startsWith("/dashboard");
  }
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

/** Active state for “More” drawer links (stats groups with journal redirect). */
export function isMobileExtraLinkActive(pathname: string, href: string): boolean {
  if (href === "/stats") {
    return pathname.startsWith("/stats") || pathname.startsWith("/journal");
  }
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}
