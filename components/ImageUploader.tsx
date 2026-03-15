"use client";

import { useEffect, useRef, useState } from "react";

type ImageUploaderProps = {
  storageKey: string;
};

export default function ImageUploader({ storageKey }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        setPreview(saved);
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreview(result);
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, result);
        }
      } catch {
        // ignore
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-xl border border-sky-500/60 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/20"
      >
        Add Image
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {preview && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/60">
          <img
            src={preview}
            alt="Strategy chart preview"
            className="h-40 w-full object-cover"
          />
        </div>
      )}
    </div>
  );
}

