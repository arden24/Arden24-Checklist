type ChecklistItem = {
  text: string;
  timeframe?: string;
  image?: string;
};

type Strategy = {
  id: string;
  name: string;
  description: string;
  market: string;
  timeframes: string;
  checklist: Array<string | ChecklistItem>;
};

type StrategyCardProps = {
  strategy: Strategy;
  onEdit?: () => void;
  onDelete?: () => void;
};

export default function StrategyCard({
  strategy,
  onEdit,
  onDelete,
}: StrategyCardProps) {
  const checklistItems: ChecklistItem[] = (strategy.checklist ?? []).map(
    (item: any) =>
      typeof item === "string"
        ? { text: item, timeframe: "", image: undefined }
        : {
            text: item.text ?? "",
            timeframe: item.timeframe ?? "",
            image: item.image,
          }
  );

  return (
    <article className="flex flex-col justify-between rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-lg">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-white">{strategy.name}</h3>
            <p className="mt-1 text-sm text-zinc-400">
              {strategy.market} · {strategy.timeframes}
            </p>
          </div>
        </div>

        {strategy.description && (
          <p className="mt-3 text-sm text-zinc-300">{strategy.description}</p>
        )}

        {checklistItems.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Checklist
            </p>
            <ul className="mt-2 space-y-1 text-sm text-zinc-200">
              {checklistItems.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between gap-2 rounded-lg bg-zinc-800/60 px-3 py-2"
                >
                  <div className="flex flex-1 items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
                    <span>{item.text}</span>
                  </div>
                  {item.timeframe && (
                    <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300">
                      {item.timeframe}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {(onEdit || onDelete) && (
        <div className="mt-4 flex items-center justify-end gap-2 text-xs">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-white/15 px-3 py-1.5 font-medium text-zinc-200 hover:border-sky-400/60 hover:text-sky-300"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-red-500/40 px-3 py-1.5 font-medium text-red-300 hover:bg-red-500/10"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </article>
  );
}

