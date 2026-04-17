import Link from "next/link";
import { getPlanLabel } from "@/lib/subscriptions/access";
import type { PlanKey } from "@/lib/subscriptions/plans";

type FeatureLockCardProps = {
  requiredPlan: PlanKey;
  title: string;
  description: string;
};

export default function FeatureLockCard({
  requiredPlan,
  title,
  description,
}: FeatureLockCardProps) {
  return (
    <div className="rounded-2xl border border-sky-500/35 bg-sky-950/25 p-5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-sky-300">Locked</p>
      <h3 className="mt-2 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-zinc-300">
        {description} This is a {getPlanLabel(requiredPlan)} feature.
      </p>
      <Link
        href="/billing"
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-sky-400/60 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-200 hover:border-sky-300/80 hover:bg-sky-500/20"
      >
        Upgrade in Billing
      </Link>
    </div>
  );
}
