"use client";

import { useEffect } from "react";

/** An accessible dialog: Escape closes it, clicking the backdrop
 * closes it, clicking inside does not. Replaces window.confirm in
 * screens that adopt it. */
export default function Dialog({
  children,
  onClose,
  open,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <div aria-label={title} aria-modal="true" className="dialog" onClick={(e) => e.stopPropagation()} role="dialog">
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** The one dialog most screens need: a message, Cancel, and a
 * confirm button that can show a busy state. */
export function ConfirmDialog({
  busy,
  confirmLabel,
  message,
  onClose,
  onConfirm,
  open,
  title,
}: {
  busy?: boolean;
  confirmLabel: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  return (
    <Dialog onClose={onClose} open={open} title={title}>
      <p>{message}</p>
      <div className="actions">
        <button disabled={busy} onClick={onClose} type="button">Cancel</button>
        <button className="danger" disabled={busy} onClick={onConfirm} type="button">
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
