export type SubscriptionCheckoutResponse = { url?: unknown; error?: unknown };

function alertMessageFromResponse(
  data: SubscriptionCheckoutResponse,
  res: Response,
  fallback: string
): string {
  const err = data.error;
  if (typeof err === "string" && err.trim().length > 0) {
    return err.trim();
  }
  if (!res.ok) {
    return `Request failed (${res.status}). ${fallback}`.trim();
  }
  return fallback;
}

/** Browser-only: POSTs to `/api/stripe/checkout` and returns Stripe Checkout URL or an error message. */
export async function requestSubscriptionCheckout(
  priceId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = priceId.trim();
  if (!trimmed) {
    const message = "Missing price id.";
    console.error("[stripe/checkout]", message);
    return { ok: false, message };
  }

  let res: Response;
  try {
    res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId: trimmed }),
    });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return {
      ok: false,
      message: "Network error. Check your connection and try again.",
    };
  }

  let data: SubscriptionCheckoutResponse;
  try {
    data = (await res.json()) as SubscriptionCheckoutResponse;
  } catch {
    console.error("[stripe/checkout] Invalid JSON response");
    return {
      ok: false,
      message: alertMessageFromResponse({}, res, "Invalid response from server."),
    };
  }

  if (!res.ok) {
    console.error("[stripe/checkout]", data.error ?? res.statusText);
    return {
      ok: false,
      message: alertMessageFromResponse(data, res, "Something went wrong."),
    };
  }

  if (typeof data.url === "string" && data.url.length > 0) {
    window.location.href = data.url;
    return { ok: true };
  }

  console.error("[stripe/checkout] No redirect URL in response");
  return {
    ok: false,
    message: alertMessageFromResponse(data, res, "Checkout did not return a redirect URL."),
  };
}
