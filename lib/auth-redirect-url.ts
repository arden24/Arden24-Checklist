/**
 * Builds Supabase auth email/link redirect URLs through `/auth/callback` (PKCE cookie exchange).
 * When `NEXT_PUBLIC_SITE_URL` is set (trimmed, no trailing slash), it is used so production
 * emails always point at the canonical site. Otherwise uses `window.location.origin` in the
 * browser (typical local dev), or the env value on the server when no window exists.
 */
export function getAuthSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) {
    return fromEnv;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

/** Full redirect URL for `signUp`, `resetPasswordForEmail`, `updateUser` email change, etc. */
export function getAuthCallbackRedirectUrl(nextPath: string): string {
  const origin = getAuthSiteOrigin();
  if (!origin) {
    throw new Error(
      "Auth redirect needs a site URL: use these flows in the browser, or set NEXT_PUBLIC_SITE_URL."
    );
  }
  const safe =
    nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";
  return `${origin}/auth/callback?next=${encodeURIComponent(safe)}`;
}
