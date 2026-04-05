import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full min-w-0 max-w-md flex-col justify-center px-4 py-12">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 text-center shadow-lg">
            <p className="text-sm text-zinc-400">Loading...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}
