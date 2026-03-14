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
];

function isRateLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return RATE_LIMIT_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

export function getAuthErrorDisplay(error: { message: string }): AuthErrorDisplay {
  const msg = error.message?.trim() || "An error occurred.";

  if (isRateLimitError(msg)) {
    return {
      message: "Email rate limit exceeded. Too many sign-up or sign-in attempts in a short time.",
      suggestion: "Please wait a few minutes and try again. For development, you can disable email confirmation in Supabase: Authentication → Providers → Email → turn off “Confirm email”.",
    };
  }

  return { message: msg };
}
