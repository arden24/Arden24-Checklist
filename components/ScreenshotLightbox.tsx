"use client";

import { useEffect } from "react";

type ScreenshotLightboxProps = {
  src: string;
  alt: string;
  onClose: () => void;
};

export default function ScreenshotLightbox({ src, alt, onClose }: ScreenshotLightboxProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Screenshot preview"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-sm text-white hover:bg-black/70"
      >
        Close
      </button>
      <div
        className="max-h-[90vh] w-full max-w-5xl rounded-xl border border-white/10 bg-black/40 p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-[80vh] w-full items-center justify-center rounded-lg bg-black/40">
          <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
        </div>
      </div>
    </div>
  );
}
