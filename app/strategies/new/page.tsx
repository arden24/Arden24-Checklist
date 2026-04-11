"use client";

import BackButton from "@/components/BackButton";
import PageContainer from "@/components/PageContainer";
import StrategyForm from "@/components/strategy-form";

export default function NewStrategyPage() {
  return (
    <main className="min-h-screen min-w-0 bg-black py-8 text-white sm:py-10">
      <PageContainer maxWidthClass="max-w-2xl">
        <BackButton fallbackHref="/strategies" label="Back" />

        <header className="mt-6 min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create strategy
          </h1>
          <p className="text-sm text-zinc-500">
            Name and summary first, then optional key points (mock),
            confluences, and save — same layout as edit.
          </p>
        </header>

        <StrategyForm />
      </PageContainer>
    </main>
  );
}
