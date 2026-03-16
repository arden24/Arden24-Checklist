import LotSizeCalculator from "@/components/lot-size-calculator";

export default function CalculatorPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <LotSizeCalculator />
      </div>
    </main>
  );
}
