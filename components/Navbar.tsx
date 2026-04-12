"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchOpenTrades } from "@/lib/supabase/open-trades";
import { loadOpenTrades } from "@/lib/journal";
import QuickAccess from "@/components/QuickAccess";
import BackButton from "@/components/BackButton";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import PublicMobileMenu from "@/components/PublicMobileMenu";
import { getMainNavItems, isMainNavItemActive } from "@/components/main-nav";
import { ARDEN24_TRADES_UPDATED_EVENT } from "@/lib/trades-updated";

/** Fixed app bar; main padding uses `globals.css` `--app-header-offset`. Drawers sit above (higher z-index). */
const appHeaderShellClass =
  "fixed inset-x-0 top-0 z-50 w-full border-b border-white/10 bg-black/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md shadow-[0_12px_40px_rgba(15,23,42,0.9)]";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [liveTradesCount, setLiveTradesCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileDrawerOnScreen, setMobileDrawerOnScreen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const supabase = useMemo(() => createClient(), []);
  const navItems = getMainNavItems();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!user) {
      setLiveTradesCount(0);
      return;
    }
    function refreshLiveCount() {
      if (supabase) {
        fetchOpenTrades(supabase)
          .then((list) => setLiveTradesCount(list.length))
          .catch(() => setLiveTradesCount(0));
      } else {
        setLiveTradesCount(loadOpenTrades(user?.id).length);
      }
    }
    refreshLiveCount();
    window.addEventListener(ARDEN24_TRADES_UPDATED_EVENT, refreshLiveCount);
    return () =>
      window.removeEventListener(
        ARDEN24_TRADES_UPDATED_EVENT,
        refreshLiveCount,
      );
  }, [user, supabase]);

  const isLandingLoggedOut = pathname === "/" && !loading && !user;

  const hideBackButton =
    pathname === "/dashboard" ||
    (pathname === "/" && Boolean(user)) ||
    ["/sign-in", "/sign-up", "/forgot-password"].includes(pathname);

  if (isLandingLoggedOut) {
    return (
      <header className={appHeaderShellClass}>
        <div className="mx-auto flex w-full min-w-0 max-w-6xl items-center justify-between gap-2 px-4 py-3 md:gap-4 md:px-6">
          <Link
            href="/"
            className="min-h-11 min-w-0 shrink text-lg font-semibold tracking-tight text-white hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:min-h-0"
          >
            Arden24
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/sign-in"
                className="rounded-xl border border-sky-400/60 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-200 hover:border-sky-400/80 hover:bg-sky-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:py-1.5"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-xl border border-sky-400/60 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-200 hover:border-sky-400/80 hover:bg-sky-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:py-1.5"
              >
                Sign up
              </Link>
            </div>
            <PublicMobileMenu />
          </div>
        </div>
      </header>
    );
  }

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className={appHeaderShellClass}>
      <div className="mx-auto flex w-full min-w-0 max-w-6xl items-center justify-between gap-2 px-4 py-2.5 md:gap-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 md:flex-none md:flex-initial">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-zinc-200 touch-manipulation hover:border-sky-400/60 hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black md:hidden"
            aria-label="Open navigation menu"
            aria-haspopup="dialog"
            aria-expanded={mobileOpen || mobileDrawerOnScreen}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>

          <Link
            href="/dashboard"
            className="flex min-h-11 shrink-0 items-center text-base font-semibold tracking-tight text-white hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:min-h-0"
          >
            Arden24
          </Link>

          <div className="hidden sm:block">
            <QuickAccess />
          </div>

          {!hideBackButton && <BackButton className="ml-0 sm:ml-1" />}
        </div>

        <nav className="hidden flex-1 items-center justify-center md:flex">
          <ul className="flex items-center gap-1 rounded-2xl border border-white/10 bg-black/60 px-1.5 py-1 shadow-[0_0_0_1px_rgba(30,64,175,0.4)]">
            {navItems.map((item) => {
              const isActive = isMainNavItemActive(pathname, item.href);
              const badgeCount = item.showBadge ? liveTradesCount : 0;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-9 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black md:py-1.5 ${
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

        <div className="hidden shrink-0 items-center gap-2 sm:gap-3 md:flex">
          {!loading &&
            (user ? (
              <>
                <Link
                  href="/account"
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-sky-400/60 hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:py-1.5"
                >
                  Account
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-red-400/60 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:py-1.5"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/sign-in"
                  className="rounded-xl border border-sky-400/60 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-200 hover:border-sky-400/80 hover:bg-sky-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:py-1.5"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-xl border border-sky-400/60 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-200 hover:border-sky-400/80 hover:bg-sky-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:py-1.5"
                >
                  Sign up
                </Link>
              </div>
            ))}
        </div>
      </div>

      <MobileNavDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        pathname={pathname}
        navItems={navItems}
        liveTradesCount={liveTradesCount}
        user={user}
        loading={loading}
        onSignOut={handleSignOut}
        menuButtonRef={menuButtonRef}
        onDrawerVisibleChange={setMobileDrawerOnScreen}
      />
    </header>
  );
}
