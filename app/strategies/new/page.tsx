"use client";

import Link from "next/link";
import StrategyForm from "@/components/strategy-form";
import PageContainer from "@/components/PageContainer";

export default function NewStrategyPage() {
  return (
    <main className="min-h-screen min-w-0 bg-black py-8 text-white sm:py-10">
      <PageContainer maxWidthClass="max-w-3xl">
        <Link
          href="/strategies"
          className="inline-flex min-h-11 items-center text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← Back to strategies
        </Link>

        <header className="mt-4 space-y-2">
          <h1 className="text-2xl font-bold sm:text-3xl">Create a new strategy</h1>
          <p className="text-sm text-zinc-400">
            Turn your rules into a checklist you can run before every trade. Be
            specific and honest with the conditions you need to see.
          </p>
        </header>

        <StrategyForm />
      </PageContainer>
    </main>
  );
}