"use client";

/** Prev/Next pager for a client-side list, 20 rows per page.
 * Renders nothing when everything fits on one page. */
export const PAGE_SIZE = 20;

export default function Pagination({
  label,
  onPage,
  page,
  total,
}: {
  label: string;
  onPage: (page: number) => void;
  page: number;
  total: number;
}) {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  if (pageCount <= 1) return null;
  const start = (current - 1) * PAGE_SIZE + 1;
  const end = Math.min(current * PAGE_SIZE, total);
  // Pill buttons with a small hover lift. The lift uses the
  // standalone translate property, not Tailwind's translate
  // utilities: those need the CSS-variable defaults preflight
  // normally provides, and this app runs with preflight off, so
  // they silently compute to no transform. The transition list
  // keeps the button's existing hover transitions alongside it.
  const buttonClass =
    "rounded-full transition-[translate,background,border-color,box-shadow,transform] hover:[translate:0_-2px]";
  return (
    <div className="actions" style={{ marginTop: 16 }}>
      <button className={buttonClass} disabled={current <= 1} onClick={() => onPage(current - 1)} type="button">Previous</button>
      <span className="hint num">Showing {start}–{end} of {total} {label} · Page {current} of {pageCount}</span>
      <button className={buttonClass} disabled={current >= pageCount} onClick={() => onPage(current + 1)} type="button">Next</button>
    </div>
  );
}
