export const TEXT_SIZE_STORAGE_KEY = "arden24_text_size";

export type TextSizePreference = "normal" | "large" | "extra-large";

const VALID: ReadonlySet<TextSizePreference> = new Set(["normal", "large", "extra-large"]);

export function parseTextSizePreference(raw: string | null): TextSizePreference {
  if (!raw) return "normal";
  const v = raw.trim().toLowerCase().replace(/\s+/g, "-") as TextSizePreference;
  return VALID.has(v) ? v : "normal";
}

export function readTextSizeFromStorage(): TextSizePreference {
  if (typeof window === "undefined") return "normal";
  try {
    return parseTextSizePreference(window.localStorage.getItem(TEXT_SIZE_STORAGE_KEY));
  } catch {
    return "normal";
  }
}

/** Syncs `<html data-text-size>` for global CSS (`normal` clears the attribute). */
export function applyTextSizeToDocument(value: TextSizePreference): void {
  if (typeof document === "undefined") return;
  if (value === "normal") {
    document.documentElement.removeAttribute("data-text-size");
  } else {
    document.documentElement.dataset.textSize = value;
  }
}

export function persistTextSizePreference(value: TextSizePreference): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, value);
  } catch {
    // ignore quota / private mode
  }
  applyTextSizeToDocument(value);
}
