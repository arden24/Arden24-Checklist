"use client";

import { useLayoutEffect } from "react";
import { applyTextSizeToDocument, readTextSizeFromStorage } from "@/lib/text-size-preference";

/**
 * Applies saved text-size preference before paint to avoid a flash of wrong sizing.
 */
export default function TextSizeHydration() {
  useLayoutEffect(() => {
    applyTextSizeToDocument(readTextSizeFromStorage());
  }, []);

  return null;
}
