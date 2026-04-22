import Link from "next/link";

export const metadata = {
  title: "Terms of use",
};

export default function TermsPage() {
  return (
    <div className="mx-auto min-h-[calc(100dvh-var(--app-header-offset))] w-full min-w-0 max-w-2xl px-4 py-12">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-lg md:p-8">
        <h1 className="mb-6 text-2xl font-semibold text-white">Terms of use</h1>
        <div className="space-y-4 text-sm leading-relaxed text-zinc-300">
          <p>
            Arden is provided for personal journaling, checklists, and related productivity
            features. It is not financial, investment, legal, or tax advice. You are solely
            responsible for your trading and financial decisions.
          </p>
          <p>
            You agree to use the service lawfully, not to misuse or attempt to disrupt the
            service, and to keep your account credentials secure. We may update these terms;
            continued use after changes constitutes acceptance of the updated terms where
            permitted by law.
          </p>
          <p>
            The service is provided &quot;as is&quot; without warranties to the extent allowed by
            law. To the extent permitted, our liability is limited.
          </p>
          <p className="text-xs text-zinc-500">
            This is a concise placeholder summary. Replace with counsel-approved terms before
            production.
          </p>
        </div>
        <p className="mt-8">
          <Link
            href="/"
            className="text-sm font-medium text-sky-400 hover:text-sky-300"
          >
            ← Home
          </Link>
        </p>
      </div>
    </div>
  );
}
