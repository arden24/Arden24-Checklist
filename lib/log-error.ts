import { isSupabaseSessionExpiredLikeError } from "@/lib/auth-errors";

function formatRecoverableAuthLog(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  if (err != null && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return "session / jwt";
}

/**
 * Log errors in a way that avoids empty `{}` in the console (e.g. from Supabase/client rejections).
 * Supabase access-token expiry (PGRST301 / "JWT expired") is treated as recoverable: callers may
 * still see a single failed request before refresh; we avoid spamming the console in development.
 */
export function logError(err: unknown): void {
  if (isSupabaseSessionExpiredLikeError(err)) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[arden24] Recoverable session/JWT error (refresh or re-sign-in will handle):",
        formatRecoverableAuthLog(err),
      );
    }
    return;
  }

  if (err instanceof Error) {
    console.error(err.message || err.name, err);
    return;
  }
  if (
    err != null &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as { message?: unknown }).message === "string"
  ) {
    console.error((err as { message: string }).message, err);
    return;
  }
  if (err != null && typeof err === "object" && "error_description" in err) {
    console.error(
      (err as { error_description?: unknown }).error_description,
      err,
    );
    return;
  }
  if (
    err != null &&
    (typeof err !== "object" || Object.keys(err as object).length > 0)
  ) {
    console.error(err);
  }
}
