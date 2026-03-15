type StrategyChecklistProps = {
  title?: string;
  items: string[];
};

export default function StrategyChecklist({
  title = "Strategy Checklist",
  items,
}: StrategyChecklistProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Tick off each condition before entering a trade.
      </p>

      <div className="mt-3 space-y-2 text-sm text-zinc-100">
        {items.map((item, index) => (
          <label
            key={index}
            className="flex cursor-pointer items-start gap-2 rounded-xl bg-black/40 px-3 py-2"
          >
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-slate-950 text-sky-500 focus:ring-0"
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

