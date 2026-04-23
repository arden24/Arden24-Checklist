"use client";

import { useRouter } from "next/navigation";

type Props = {
  /** Used when `history.length` suggests there is nowhere sensible to go back. */
  fallbackHref?: string;
};

/**
 * Back navigation for legal pages: prefers browser history, then a safe fallback
 * (defaults to sign-up so draft restore still applies).
 */
export default function LegalDocumentBackButton({
  fallbackHref = "/sign-up",
}: Props) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="text-sm font-medium text-sky-400 transition hover:text-sky-300"
    >
      ← Back
    </button>
  );
}
