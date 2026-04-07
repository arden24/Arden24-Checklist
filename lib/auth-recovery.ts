/**
 * Password-recovery sessions from Supabase include an AMR entry with method "recovery"
 * on the access token. Used to avoid sending recovery users to /dashboard from auth pages.
 */
export function isPasswordRecoverySession(
  accessToken: string | null | undefined
): boolean {
  if (!accessToken) return false;
  try {
    const part = accessToken.split(".")[1];
    if (!part) return false;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as {
      amr?: Array<{ method?: string }>;
    };
    return (
      Array.isArray(payload.amr) &&
      payload.amr.some((m) => m.method === "recovery")
    );
  } catch {
    return false;
  }
}
