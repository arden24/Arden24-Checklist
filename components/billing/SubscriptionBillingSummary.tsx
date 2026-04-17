import {
  getActivePlanFromSubscriptionRow,
  getPlanLabel,
  type SubscriptionPlanRow,
} from "@/lib/subscriptions/access";
import { getScheduledPlanChangeNotice } from "@/lib/subscriptions/scheduled-plan-notice";

function formatStatusLabel(status: string): string {
  const s = status.trim();
  if (!s) return status;
  return s.replace(/_/g, " ");
}

export default function SubscriptionBillingSummary({
  row,
  loading,
}: {
  row: SubscriptionPlanRow | null;
  loading?: boolean;
}) {
  if (loading) {
    return <p className="mt-2 text-sm text-zinc-500">Loading…</p>;
  }

  const activePlan = getActivePlanFromSubscriptionRow(row);
  const statusRaw = row?.subscription_status ?? "";
  const statusText = statusRaw
    ? formatStatusLabel(statusRaw)
    : "No active subscription";
  const periodEnd = row?.current_period_end ?? null;
  const notice = getScheduledPlanChangeNotice(row);

  return (
    <>
      <dl className="mt-3 space-y-3">
        <div>
          <dt className="text-xs text-zinc-500">Current plan</dt>
          <dd className="mt-0.5 text-sm font-medium text-zinc-100">
            {getPlanLabel(activePlan)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Subscription status</dt>
          <dd className="mt-0.5 text-sm capitalize text-zinc-200">{statusText}</dd>
        </div>
        {row && !activePlan ? (
          <p className="text-sm text-zinc-400">
            No active plan access right now. Choose a tier to subscribe with Stripe.
          </p>
        ) : null}
        {periodEnd ? (
          <div>
            <dt className="text-xs text-zinc-500">Current billing period ends</dt>
            <dd className="mt-0.5 text-sm text-zinc-200">
              {new Date(periodEnd).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </dd>
          </div>
        ) : null}
      </dl>
      {notice ? (
        <div
          className="mt-4 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2.5 text-sm leading-snug text-amber-50"
          role="status"
        >
          {notice}
        </div>
      ) : null}
    </>
  );
}
