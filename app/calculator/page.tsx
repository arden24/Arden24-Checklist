import LotSizeCalculator from "@/components/lot-size-calculator";
import PageContainer from "@/components/PageContainer";

export default function CalculatorPage() {
  return (
    <main className="min-h-screen min-w-0 bg-black py-6 text-white sm:py-10">
      <PageContainer maxWidthClass="max-w-4xl">
        <LotSizeCalculator />
      </PageContainer>
    </main>
  );
}
