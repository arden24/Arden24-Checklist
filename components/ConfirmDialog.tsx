"use client";

import { useId } from "react";
import { AppModal } from "@/components/AppModal";
import AppButton from "@/components/AppButton";

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** primary = sky CTA; destructive = red CTA */
  confirmVariant?: "primary" | "destructive";
  onConfirm: () => void;
  isLoading?: boolean;
};

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descId}
      panelClassName="max-w-lg"
    >
      <h2 id={titleId} className="text-lg font-semibold tracking-tight text-white">
        {title}
      </h2>
      <p id={descId} className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-400">
        {description}
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
        <AppButton type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
          {cancelLabel}
        </AppButton>
        <AppButton
          type="button"
          variant={confirmVariant === "destructive" ? "destructive" : "primary"}
          onClick={() => {
            onConfirm();
          }}
          disabled={isLoading}
        >
          {isLoading ? "Please wait…" : confirmLabel}
        </AppButton>
      </div>
    </AppModal>
  );
}
