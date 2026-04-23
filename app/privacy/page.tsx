import LegalDocumentBackButton from "@/components/LegalDocumentBackButton";

export const metadata = {
  title: "Privacy policy",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto min-h-[calc(100dvh-var(--app-header-offset))] w-full min-w-0 max-w-2xl px-4 py-12">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-lg md:p-8">
        <h1 className="mb-6 text-2xl font-semibold text-white">Privacy policy</h1>
        <div className="space-y-4 text-sm leading-relaxed text-zinc-300">
          <p>
            We collect account information you provide (such as email) and data you store in
            the product (for example journal entries and strategies) to operate the service.
          </p>
          <p>
            We use service providers (such as hosting and authentication) as needed to run
            Arden. We do not sell your personal information.
          </p>
          <p>
            You may request access or deletion of your account data where applicable law
            requires. Contact details should be added here for production.
          </p>
          <p className="text-xs text-zinc-500">
            This is a concise placeholder summary. Replace with counsel-approved privacy policy
            before production.
          </p>
        </div>
        <p className="mt-8">
          <LegalDocumentBackButton />
        </p>
      </div>
    </div>
  );
}
