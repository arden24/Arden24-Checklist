"use client";

import { useEffect, useId, useState } from "react";
import { AppModal } from "@/components/AppModal";
import AppButton from "@/components/AppButton";

export type TextConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  inputLabel: string;
  placeholder?: string;
  expectedValue: string;
  confirmLabel: string;
  cancelLabel?: string;
  mismatchMessage?: string;
  onConfirmed: () => void;
};

export function TextConfirmDialog({
  open,
  onClose,
  title,
  description,
  inputLabel,
  placeholder,
  expectedValue,
  confirmLabel,
  cancelLabel = "Cancel",
  mismatchMessage = "That does not match. Try again or cancel.",
  onConfirmed,
}: TextConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setError(null);
    }
  }, [open]);

  function handleClose() {
    setValue("");
    setError(null);
    onClose();
  }

  function submit() {
    if (value !== expectedValue) {
      setError(mismatchMessage);
      return;
    }
    setValue("");
    setError(null);
    onConfirmed();
  }

  return (
    <AppModal
      open={open}
      onClose={handleClose}
      labelledBy={titleId}
      describedBy={descId}
      panelClassName="max-w-lg"
    >
      <h2 id={titleId} className="text-lg font-semibold tracking-tight text-white">
        {title}
      </h2>
      <p id={descId} className="mt-3 text-sm leading-relaxed text-zinc-400">
        {description}
      </p>
      <div className="mt-5">
        <label htmlFor="text-confirm-input" className="mb-2 block text-xs font-medium text-zinc-400">
          {inputLabel}
        </label>
        <input
          id="text-confirm-input"
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
        />
        {error ? (
          <p className="mt-2 text-xs text-red-300/95" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
        <AppButton type="button" variant="secondary" onClick={handleClose}>
          {cancelLabel}
        </AppButton>
        <AppButton
          type="button"
          variant="destructive"
          onClick={submit}
          className="border-red-500/50 bg-red-600/90 text-white hover:bg-red-500"
        >
          {confirmLabel}
        </AppButton>
      </div>
    </AppModal>
  );
}
