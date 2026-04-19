import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPasswordRecoverySession } from "@/lib/auth-recovery";
import {
  hasActiveAppSubscription,
  pathRequiresActiveSubscription,
} from "@/lib/supabase/subscription-access";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const pathname = request.nextUrl.pathname;
  // Public routes: anyone can access
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/auth/callback" ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/stripe/checkout") ||
    pathname.startsWith("/api/stripe/customer-portal");
  // Protected routes: redirect to sign-in if not authenticated
  // (dashboard, strategies, checklist, journal, open-trades, stats, account, calculator, etc.)

  // If Supabase is not configured, only allow public routes
  if (!url || !key) {
    if (!isPublicRoute) {
      const signInUrl = request.nextUrl.clone();
      signInUrl.pathname = "/sign-in";
      return NextResponse.redirect(signInUrl);
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refreshes session if expired; required for SSR
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("[middleware] auth user", {
    pathname,
    userId: user?.id ?? null,
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!isPublicRoute && !user) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    return NextResponse.redirect(signInUrl);
  }

  if (user && (pathname === "/sign-in" || pathname === "/sign-up")) {
    const recoveryFromQuery =
      request.nextUrl.searchParams.get("type") === "recovery";
    if (
      recoveryFromQuery ||
      isPasswordRecoverySession(session?.access_token)
    ) {
      const resetUrl = request.nextUrl.clone();
      resetUrl.pathname = "/reset-password";
      resetUrl.search = "";
      return NextResponse.redirect(resetUrl);
    }
    const subscribed = await hasActiveAppSubscription(supabase, user.id);
    console.log("[middleware] redirect from auth page", {
      pathname,
      userId: user.id,
      subscribed,
      destination: subscribed ? "/dashboard" : "/start",
    });
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = subscribed ? "/dashboard" : "/start";
    nextUrl.search = "";
    return NextResponse.redirect(nextUrl);
  }

  if (user && pathname === "/start") {
    const subscribed = await hasActiveAppSubscription(supabase, user.id);
    console.log("[middleware] start route gate", {
      pathname,
      userId: user.id,
      subscribed,
      redirectToDashboard: subscribed,
    });
    if (subscribed) {
      const dash = request.nextUrl.clone();
      dash.pathname = "/dashboard";
      dash.search = "";
      return NextResponse.redirect(dash);
    }
  }

  if (
    user &&
    pathRequiresActiveSubscription(pathname) &&
    !(await hasActiveAppSubscription(supabase, user.id))
  ) {
    console.log("[middleware] protected route blocked", {
      pathname,
      userId: user.id,
      subscribed: false,
      destination: "/start",
    });
    const startUrl = request.nextUrl.clone();
    startUrl.pathname = "/start";
    startUrl.search = "";
    return NextResponse.redirect(startUrl);
  }

  return response;
}
