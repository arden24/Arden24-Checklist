/**
 * Canonical site origin for Stripe redirect/return URLs.
 * Prefer NEXT_PUBLIC_SITE_URL; otherwise infer from proxy headers or the incoming request URL.
 */
export function resolveSiteBaseForStripe(request: Request): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    return `${proto}://${forwardedHost}`.replace(/\/+$/, "");
  }

  try {
    return new URL(request.url).origin.replace(/\/+$/, "");
  } catch {
    return null;
  }
}
