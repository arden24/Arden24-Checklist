import { Suspense } from "react";
import Link from "next/link";
import PostCheckoutActivation from "@/components/start/PostCheckoutActivation";
import StartMarketing from "./StartMarketing";

function PostCheckoutFallback() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-10 text-center">
      <p className="text-sm text-zinc-300">Loading…</p>
    </div>
  );
}

type StartPageProps = {
  searchParams: Promise<{ success?: string }>;
};

export default async function StartPage({ searchParams }: StartPageProps) {
  const sp = await searchParams;
  const postCheckout = sp.success === "true";

  if (postCheckout) {
    return (
      <main className="flex min-h-screen flex-col bg-gradient-to-b from-black via-slate-950 to-black px-4 py-16 text-white">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center">
          <p className="mb-8 text-xs font-medium uppercase tracking-[0.22em] text-sky-400/80">
            Arden24
          </p>
          <Suspense fallback={<PostCheckoutFallback />}>
            <PostCheckoutActivation />
          </Suspense>
          <Link href="/start" className="mt-10 text-sm text-zinc-500 hover:text-zinc-300">
            Skip to marketing page
          </Link>
        </div>
      </main>
    );
  }

  return <StartMarketing />;
}
