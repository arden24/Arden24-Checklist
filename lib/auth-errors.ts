/**
 * Maps Supabase auth errors to user-friendly messages and optional suggestions.
 */

export type AuthErrorDisplay = {
  message: string;
  suggestion?: string;
};

const RATE_LIMIT_PATTERNS = [
  "rate limit",
  "rate_limit",
  "429",
  "too many",
  "per hour",
  "email rate limit",
  "rate limit exceeded",
  "over_email_send_rate_limit",
  "too_many_requests",
];

function isRateLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return RATE_LIMIT_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

type AuthErr = {
  message?: string;
  status?: number;
  code?: string;
  name?: string;
};

function normalizeMessage(error: AuthErr): string {
  return (error.message ?? "").trim();
}

/**
 * PostgREST / GoTrue style errors where the access JWT is missing, expired, or
 * invalid. Used to avoid noisy devtools output and to treat failures as session
 * recovery rather than app bugs.
 */
export function isSupabaseSessionExpiredLikeError(err: unknown): boolean {
  if (err == null) return false;

  if (typeof err === "object") {
    const o = err as Record<string, unknown>;
    const code =
      typeof o.code === "string" ? o.code.toUpperCase() : String(o.code ?? "");
    if (code === "PGRST301" || code === "PGRST303") return true;

    const msg =
      typeof o.message === "string"
        ? o.message
        : typeof o.error_description === "string"
          ? o.error_description
          : "";
    const lower = msg.toLowerCase();
    if (
      lower.includes("jwt expired") ||
      lower.includes("invalid jwt") ||
      lower.includes("jwt is expired") ||
      lower.includes("expired jwt") ||
      lower.includes("token is expired") ||
      lower.includes("session missing") ||
      lower.includes("session not found") ||
      lower.includes("invalid_grant") ||
      lower.includes("refresh token") ||
      lower.includes("refresh_token") ||
      lower.includes("auth session missing")
    ) {
      return true;
    }
  }

  if (err instanceof Error) {
    const lower = err.message.toLowerCase();
    return (
      lower.includes("jwt expired") ||
      lower.includes("invalid jwt") ||
      lower.includes("session missing")
    );
  }

  return false;
}

/** Log raw auth errors in development without showing them to users. */
export function logAuthError(context: string, error: unknown): void {
  console.error(`[auth] ${context}`, error);
}

export function getAuthErrorDisplay(error: AuthErr): AuthErrorDisplay {
  const msg = normalizeMessage(error) || "error";
  const code = (error.code ?? "").toLowerCase();
  const lower = msg.toLowerCase();

  if (isRateLimitError(msg) || error.status === 429) {
    return {
      message: "Too many attempts. Please wait a moment and try again.",
    };
  }

  if (
    code === "invalid_credentials" ||
    lower.includes("invalid login credentials") ||
    lower.includes("invalid email or password") ||
    lower.includes("email or password")
  ) {
    return { message: "Email or password is incorrect." };
  }

  if (
    code === "email_not_confirmed" ||
    lower.includes("email not confirmed")
  ) {
    return {
      message: "Please confirm your email before signing in.",
      suggestion:
        "Check your inbox for the confirmation link, or ask your administrator to adjust email confirmation settings.",
    };
  }

  if (
    lower.includes("jwt expired") ||
    lower.includes("invalid jwt") ||
    lower.includes("token expired") ||
    lower.includes("invalid_grant") ||
    code === "otp_expired" ||
    lower.includes("flow state expired") ||
    (lower.includes("invalid request") && lower.includes("token"))
  ) {
    return {
      message: "This password reset link is invalid or has expired.",
    };
  }

  if (
    lower.includes("password") &&
    (lower.includes("should be at least") ||
      lower.includes("too short") ||
      lower.includes("weak") ||
      code === "weak_password")
  ) {
    return {
      message: "Choose a stronger password (at least 6 characters).",
    };
  }

  if (
    code === "same_password" ||
    lower.includes("same_password") ||
    lower.includes("same password") ||
    lower.includes("different from the old password")
  ) {
    return {
      message: "Your new password must be different from your old password.",
    };
  }

  if (
    lower.includes("user already registered") ||
    lower.includes("already been registered") ||
    code === "user_already_exists"
  ) {
    return { message: "An account with this email may already exist. Try signing in instead." };
  }

  if (lower.includes("invalid email")) {
    return { message: "Please enter a valid email address." };
  }

  if (
    error.status === 503 ||
    lower.includes("service unavailable") ||
    lower.includes("network") ||
    lower.includes("fetch")
  ) {
    return { message: "Something went wrong. Please try again." };
  }

  return { message: "Something went wrong. Please try again." };
}
