type SummaryCardProps = {
  title: string;
  value: string;
  subtitle?: string;
};

export default function SummaryCard({ title, value, subtitle }: SummaryCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-slate-950/70 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.9)] transition hover:border-sky-500/50 hover:shadow-[0_24px_80px_rgba(8,47,73,0.9)]">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400/90">
          {title}
        </p>
        <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-zinc-500">
            {subtitle}
          </p>
        )}
      </div>

      <div className="mt-4 h-8 w-full rounded-full bg-gradient-to-r from-sky-500/20 via-sky-500/10 to-sky-400/30">
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_0_100%,rgba(16,185,129,0.6),transparent_60%),radial-gradient(circle_at_40%_0,rgba(56,189,248,0.4),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(52,211,153,0.7),transparent_55%)] opacity-80" />
      </div>
    </div>
  );
}

