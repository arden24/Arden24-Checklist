"use client";

import Link from "next/link";
import StrategyForm from "@/components/strategy-form";

export default function NewStrategyPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/strategies"
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← Back to strategies
        </Link>

        <header className="mt-4 space-y-2">
          <h1 className="text-3xl font-bold">Create a new strategy</h1>
          <p className="text-sm text-zinc-400">
            Turn your rules into a checklist you can run before every trade. Be
            specific and honest with the conditions you need to see.
          </p>
        </header>

        <StrategyForm />
      </div>
    </main>
  );
}