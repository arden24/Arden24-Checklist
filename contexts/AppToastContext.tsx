"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppToastTone = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  tone: AppToastTone;
};

type AppToastContextValue = {
  pushToast: (message: string, tone?: AppToastTone) => void;
};

const AppToastContext = createContext<AppToastContextValue | null>(null);

const toneStyles: Record<AppToastTone, string> = {
  success:
    "border-emerald-500/35 bg-emerald-950/80 text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.12)]",
  error:
    "border-red-500/35 bg-red-950/80 text-red-100 shadow-[0_0_24px_rgba(239,68,68,0.12)]",
  info: "border-sky-500/30 bg-slate-950/95 text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.1)]",
};

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((message: string, tone: AppToastTone = "info") => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `t-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4800);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <AppToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-[200] flex max-h-[40vh] flex-col-reverse gap-2 overflow-hidden p-4 sm:left-auto sm:right-4 sm:top-[calc(var(--app-header-offset)+0.75rem)] sm:bottom-auto sm:w-full sm:max-w-sm sm:flex-col"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm leading-snug backdrop-blur-md ${toneStyles[t.tone]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </AppToastContext.Provider>
  );
}

export function useAppToast(): AppToastContextValue {
  const ctx = useContext(AppToastContext);
  if (!ctx) {
    throw new Error("useAppToast must be used within AppToastProvider");
  }
  return ctx;
}
