import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseSessionExpiredLikeError } from "@/lib/auth-errors";

function stripTrailingSlash(u: string): string {
  return u.replace(/\/$/, "");
}

function requestHref(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/** Same project (REST, Storage, etc.) — excludes `/auth/v1/` to avoid recursion during refresh. */
function isProjectApiRequest(input: RequestInfo | URL, projectOrigin: string): boolean {
  const href = requestHref(input);
  const origin = stripTrailingSlash(projectOrigin);
  if (!href.startsWith(origin)) return false;
  if (href.includes("/auth/v1/")) return false;
  return true;
}

function responseBodySuggestsExpiredAccessJwt(body: string): boolean {
  const lower = body.toLowerCase();
  return (
    lower.includes("jwt expired") ||
    lower.includes("invalid jwt") ||
    lower.includes("jwt is expired") ||
    lower.includes("token is expired") ||
    lower.includes("expired jwt") ||
    lower.includes('"code":"pgrst301"') ||
    lower.includes('"code":"pgrst303"') ||
    lower.includes("pgrst301") ||
    lower.includes("pgrst303")
  );
}

let supabaseForFetchRetry: SupabaseClient | null = null;
let authRecoveryRedirectScheduled = false;

function scheduleAuthRecoveryRedirect(): void {
  if (typeof window === "undefined" || authRecoveryRedirectScheduled) return;
  authRecoveryRedirectScheduled = true;
  void (async () => {
    try {
      await supabaseForFetchRetry?.auth.signOut();
    } catch {
      // ignore
    }
    window.location.assign("/sign-in?reason=session");
  })();
}

function buildAuthAwareFetch(
  supabaseOrigin: string,
  anonKey: string,
): typeof fetch {
  const nativeFetch = globalThis.fetch.bind(globalThis);

  return async function authAwareFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const res = await nativeFetch(input, init);
    if (res.status !== 401) return res;
    if (!supabaseForFetchRetry) return res;
    if (!isProjectApiRequest(input, supabaseOrigin)) return res;

    let bodyText = "";
    try {
      bodyText = await res.clone().text();
    } catch {
      return res;
    }
    if (!responseBodySuggestsExpiredAccessJwt(bodyText)) return res;

    const { data, error } = await supabaseForFetchRetry.auth.refreshSession();
    if (error || !data.session?.access_token) {
      scheduleAuthRecoveryRedirect();
      return res;
    }

    const token = data.session.access_token;

    if (input instanceof Request) {
      const headers = new Headers(input.headers);
      headers.set("Authorization", `Bearer ${token}`);
      headers.set("apikey", anonKey);
      return nativeFetch(new Request(input, { headers }));
    }

    const headers = new Headers(init?.headers ?? undefined);
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("apikey", anonKey);
    return nativeFetch(input, { ...init, headers });
  };
}

export function createClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  const customFetch = buildAuthAwareFetch(url, key);
  const client = createBrowserClient(url, key, {
    global: { fetch: customFetch },
  });
  supabaseForFetchRetry = client;
  return client;
}

/** Clears one-shot redirect state after a successful sign-in in the same tab. */
export function resetAuthRecoveryRedirectState(): void {
  authRecoveryRedirectScheduled = false;
}

export function registerUnhandledRejectionAuthFilter(): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: PromiseRejectionEvent) => {
    if (isSupabaseSessionExpiredLikeError(event.reason)) {
      event.preventDefault();
    }
  };
  window.addEventListener("unhandledrejection", handler);
  return () => window.removeEventListener("unhandledrejection", handler);
}
