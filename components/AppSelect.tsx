"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export type AppSelectOption<T extends string = string> = {
  value: T;
  label: string;
};

type AppSelectProps<T extends string> = {
  id?: string;
  "aria-label"?: string;
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: AppSelectOption<T>[];
  disabled?: boolean;
  className?: string;
  /** default = full-width form control; compact = tighter padding (e.g. timeframe row) */
  size?: "default" | "compact";
};

const shellDefault =
  "flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-white/10 bg-zinc-900/90 px-3 py-2.5 text-left text-sm text-white shadow-inner shadow-black/20 outline-none transition hover:border-white/20 focus-visible:border-sky-500/50 focus-visible:ring-2 focus-visible:ring-sky-500/35 disabled:cursor-not-allowed disabled:opacity-45";
const shellCompact =
  "flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-white/10 bg-zinc-950/90 px-2 py-2.5 text-left text-xs font-medium text-white outline-none transition hover:border-white/20 focus-visible:border-sky-500/40 focus-visible:ring-1 focus-visible:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-45 sm:py-2";

export function AppSelect<T extends string>({
  id: idProp,
  "aria-label": ariaLabel,
  label,
  value,
  onChange,
  options,
  disabled,
  className = "",
  size = "default",
}: AppSelectProps<T>) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const listId = `${id}-listbox`;
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const indexOfValue = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const selected = options[indexOfValue] ?? options[0];

  useEffect(() => {
    if (!open) return;
    setHighlight(indexOfValue);
  }, [open, indexOfValue]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = useCallback(
    (i: number) => {
      const opt = options[i];
      if (!opt) return;
      onChange(opt.value);
      setOpen(false);
    },
    [onChange, options],
  );

  const onKeyButton = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((o) => !o);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((h) => Math.min(options.length - 1, h + 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((h) => Math.max(0, h - 1));
    }
    if (e.key === "Escape") setOpen(false);
  };

  const onKeyList = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(options.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(highlight);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${highlight}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  useLayoutEffect(() => {
    if (open && listRef.current) {
      listRef.current.focus();
    }
  }, [open]);

  const shell = size === "compact" ? shellCompact : shellDefault;

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`.trim()}>
      {label ? (
        <label id={`${id}-label`} htmlFor={id} className="mb-1.5 block text-xs font-medium text-zinc-400">
          {label}
        </label>
      ) : null}
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={label ? `${id}-label` : undefined}
        aria-label={!label ? ariaLabel : undefined}
        className={shell}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyButton}
      >
        <span className="min-w-0 truncate">{selected?.label ?? "—"}</span>
        <span className="shrink-0 text-zinc-500" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && !disabled ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={0}
          aria-activedescendant={`${id}-opt-${highlight}`}
          onKeyDown={onKeyList}
          className="absolute left-0 right-0 top-full z-[130] mt-1 max-h-[min(15rem,70dvh)] min-w-0 overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-zinc-950 py-1 shadow-[0_16px_48px_rgba(0,0,0,0.75)]"
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isHi = i === highlight;
            return (
              <li
                key={`${opt.value}-${i}`}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                data-idx={i}
                className={`cursor-pointer px-3 py-2.5 text-sm outline-none ${
                  isHi ? "bg-sky-500/15 text-sky-100" : "text-zinc-200"
                } ${isSelected ? "font-semibold" : "font-normal"}`}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(i)}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
