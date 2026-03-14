"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <span className="inline-block h-4 w-4 rounded-sm border border-emerald-400/60 bg-emerald-500/10" />
    ),
  },
  {
    href: "/strategies",
    label: "Strategies",
    icon: (
      <span className="inline-block h-4 w-4 rounded-sm border border-blue-400/60 bg-blue-500/10" />
    ),
  },
  {
    href: "/checklist",
    label: "Checklist",
    icon: (
      <span className="inline-block h-4 w-4 rounded-sm border border-purple-400/60 bg-purple-500/10" />
    ),
  },
  {
    href: "/journal",
    label: "Journal",
    icon: (
      <span className="inline-block h-4 w-4 rounded-sm border border-amber-400/60 bg-amber-500/10" />
    ),
  },
  {
    href: "/open-trades",
    label: "Open Trades",
    icon: (
      <span className="inline-block h-4 w-4 rounded-sm border border-cyan-400/60 bg-cyan-500/10" />
    ),
  },
  {
    href: "/stats",
    label: "Stats",
    icon: (
      <span className="inline-block h-4 w-4 rounded-sm border border-amber-400/60 bg-amber-500/10" />
    ),
  },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  const isLandingLoggedOut = pathname === "/" && !loading && !user;

  if (isLandingLoggedOut) {
    return (
      <header className="border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-white hover:text-emerald-300"
          >
            BluPrintsTrading
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-emerald-400/60 hover:text-emerald-300"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-emerald-400/60 hover:text-emerald-300"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10">
            <svg
              viewBox="0 0 20 20"
              className="h-3 w-3 text-emerald-400"
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

        <nav className="flex flex-1 items-center justify-center">
          <ul className="flex items-center gap-1 rounded-2xl border border-white/10 bg-black/40 px-1.5 py-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/" || pathname.startsWith("/dashboard")
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "text-zinc-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          {!loading &&
            (user ? (
              <>
                <Link
                  href="/account"
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-emerald-400/60 hover:text-emerald-300"
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
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-emerald-400/60 hover:text-emerald-300"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
                >
                  Sign up
                </Link>
              </div>
            ))}
          <span className="hidden text-[10px] uppercase tracking-[0.16em] text-zinc-500 md:block">
            Trade Checklist
          </span>
        </div>
      </div>
    </header>
  );
}

