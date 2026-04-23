export const SIGNUP_DRAFT_STORAGE_KEY = "arden24_signup_draft";

export type SignupDraft = {
  email: string;
  password: string;
  agreedToTerms: boolean;
};

function isSignupDraft(value: unknown): value is SignupDraft {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.email === "string" &&
    typeof v.password === "string" &&
    typeof v.agreedToTerms === "boolean"
  );
}

export function readSignupDraft(): SignupDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSignupDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSignupDraft(draft: SignupDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SIGNUP_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore quota / private mode
  }
}

export function clearSignupDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
