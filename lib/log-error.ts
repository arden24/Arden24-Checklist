/**
 * Log errors in a way that avoids empty `{}` in the console (e.g. from Supabase/client rejections).
 */
export function logError(err: unknown): void {
  if (err instanceof Error) {
    console.error(err.message || err.name, err);
    return;
  }
  if (err != null && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string") {
    console.error((err as { message: string }).message, err);
    return;
  }
  if (err != null && typeof err === "object" && "error_description" in err) {
    console.error((err as { error_description?: unknown }).error_description, err);
    return;
  }
  if (err != null && (typeof err !== "object" || Object.keys(err as object).length > 0)) {
    console.error(err);
  }
}
