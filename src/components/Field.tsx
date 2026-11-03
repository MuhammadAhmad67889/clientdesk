import type { ReactNode } from "react";

/** One form row: label, control, optional hint, optional error.
 * Screens that adopt it stop repeating the label/error markup. */
export default function Field({
  children,
  className = "",
  error,
  hint,
  label,
}: {
  children: ReactNode;
  className?: string;
  error?: string;
  hint?: string;
  label: string;
}) {
  return (
    <label className={className}>
      {label}
      {children}
      {hint && <span className="hint">{hint}</span>}
      {error && <span className="error">{error}</span>}
    </label>
  );
}
