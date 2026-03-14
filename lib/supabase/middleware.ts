import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
    pathname === "/sign-up";
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

  if (!isPublicRoute && !user) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    return NextResponse.redirect(signInUrl);
  }

  if (user && (pathname === "/sign-in" || pathname === "/sign-up")) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}
