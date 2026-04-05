"use client";

import { forwardRef, useState } from "react";

export type PasswordInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  disabled?: boolean;
  minLength?: number;
  placeholder?: string;
  id?: string;
  name?: string;
};

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      label,
      value,
      onChange,
      autoComplete,
      disabled,
      minLength,
      placeholder = "••••••••",
      id,
      name,
    },
    ref
  ) {
    const [show, setShow] = useState(false);

    return (
      <label className="flex flex-col gap-2">
        <span className="text-sm text-zinc-300">{label}</span>
        <div className="relative">
          <input
            ref={ref}
            id={id}
            name={name}
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onInput={(e) => onChange(e.currentTarget.value)}
            autoComplete={autoComplete}
            disabled={disabled}
            minLength={minLength}
            className="w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 pr-14 text-sm text-white outline-none transition focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 disabled:opacity-60"
            placeholder={placeholder}
          />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-200"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </label>
    );
  }
);

export default PasswordInput;
