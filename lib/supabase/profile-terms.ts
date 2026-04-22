import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Whether the current user has recorded acceptance of Terms & Privacy in public.profiles.
 * Missing row is treated as not accepted (should be rare once the auth trigger runs).
 */
export async function hasAcceptedProfileTerms(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("accepted_terms")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }
  return data.accepted_terms === true;
}

/** Paths reachable without accepting terms (middleware only). */
export function pathnameExemptFromTermsEnforcement(pathname: string): boolean {
  if (pathname === "/legal/accept") return true;
  if (pathname === "/terms" || pathname === "/privacy") return true;
  if (pathname === "/auth/callback") return true;
  if (pathname === "/reset-password") return true;
  if (pathname.startsWith("/api/")) return true;
  return false;
}
