import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { logAuthError } from "@/lib/auth-errors";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/reset-password";
  }
  return next;
}

/**
 * OAuth / email link PKCE callback. Exchanges `code` for a session and writes auth cookies
 * onto the redirect response (required in Route Handlers — avoids AuthPKCECodeVerifierMissingError).
 */
export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get("code");
  const nextPath = safeNextPath(requestUrl.searchParams.get("next"));

  const redirectTarget = new URL(nextPath, requestUrl.origin);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL("/sign-in", requestUrl.origin));
  }

  if (!code) {
    return NextResponse.redirect(redirectTarget);
  }

  let response = NextResponse.redirect(redirectTarget);

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logAuthError("auth/callback exchangeCodeForSession", error);
    return NextResponse.redirect(new URL("/reset-password", requestUrl.origin));
  }

  return response;
}
