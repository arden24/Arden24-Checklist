"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchOpenTrades } from "@/lib/supabase/open-trades";
import { loadOpenTrades } from "@/lib/journal";
import QuickAccess from "@/components/QuickAccess";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  showBadge?: boolean;
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [liveTradesCount, setLiveTradesCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    if (!user) {
      setLiveTradesCount(0);
      return;
    }
    if (supabase) {
      fetchOpenTrades(supabase).then((list) => setLiveTradesCount(list.length)).catch(() => setLiveTradesCount(0));
    } else {
      setLiveTradesCount(loadOpenTrades(user?.id).length);
    }
  }, [user, supabase, pathname]);

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: (
        <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-sky-400/60 bg-sky-500/10">
          <svg viewBox="0 0 20 20" className="h-3 w-3 text-sky-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
          <svg viewBox="0 0 20 20" className="h-3 w-3 text-blue-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
          <svg viewBox="0 0 20 20" className="h-3 w-3 text-purple-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
          <svg viewBox="0 0 20 20" className="h-3 w-3 text-cyan-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
          <svg viewBox="0 0 20 20" className="h-3 w-3 text-amber-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 4h12a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
            <path d="M6 8h8M6 11h5" />
          </svg>
        </span>
      ),
    },
    {
      href: "/stats",
      label: "Stats",
      icon: (
        <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-amber-400/60 bg-amber-500/10">
          <svg viewBox="0 0 20 20" className="h-3 w-3 text-amber-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 14v-4M8 14v-2M12 14v-6M16 14V6" />
          </svg>
        </span>
      ),
    },
  ];

  const isLandingLoggedOut = pathname === "/" && !loading && !user;

  if (isLandingLoggedOut) {
    return (
      <header className="border-b border-gray-700 bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 md:gap-4 md:px-6">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-white hover:text-sky-300"
          >
            Arden24
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="rounded-xl border border-sky-400/60 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 hover:border-sky-400/80 hover:bg-sky-500/20"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-xl border border-sky-400/60 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 hover:border-sky-400/80 hover:bg-sky-500/20"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-gray-700 bg-black">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 md:gap-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard"
            className="shrink-0 text-base font-semibold tracking-tight text-white hover:text-sky-300"
          >
            Arden24
          </Link>
          <div className="hidden sm:block">
            <QuickAccess />
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="ml-1 hidden items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-sky-400/60 hover:text-sky-300 sm:flex"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/10">
              <svg
                viewBox="0 0 20 20"
                className="h-3 w-3 text-sky-400"
                aria-hidden="true"
              >
                <path
                  d="M11.75 4.75 7 9.5l4.75 4.75"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="hidden sm:inline">Back</span>
          </button>
        </div>

        <nav className="hidden flex-1 items-center justify-center md:flex">
          <ul className="flex items-center gap-1 rounded-2xl border border-white/10 bg-black/40 px-1.5 py-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/" || pathname.startsWith("/dashboard")
                  : pathname.startsWith(item.href);
              const badgeCount = item.showBadge ? liveTradesCount : 0;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                      isActive
                        ? "bg-sky-500/15 text-sky-300"
                        : "text-zinc-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="relative flex shrink-0">
                      {item.icon}
                      {badgeCount > 0 && (
                        <span
                          className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] font-bold leading-none text-black"
                          aria-label={`${badgeCount} live trade${badgeCount !== 1 ? "s" : ""}`}
                        >
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex md:items-center md:gap-3">
            {!loading &&
              (user ? (
                <>
                  <Link
                    href="/account"
                    className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-sky-400/60 hover:text-sky-300"
                  >
                    Account
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                      router.push("/");
                      router.refresh();
                    }}
                    className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-red-400/60 hover:text-red-300"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/sign-in"
                    className="rounded-xl border border-sky-400/60 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 hover:border-sky-400/80 hover:bg-sky-500/20"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/sign-up"
                    className="rounded-xl border border-sky-400/60 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 hover:border-sky-400/80 hover:bg-sky-500/20"
                  >
                    Sign up
                  </Link>
                </div>
              ))}
          </div>
        </div>
      </div>
    </header>
  );
}

