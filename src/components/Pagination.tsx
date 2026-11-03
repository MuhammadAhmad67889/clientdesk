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
  return (
    <div className="actions" style={{ marginTop: 16 }}>
      <button disabled={current <= 1} onClick={() => onPage(current - 1)} type="button">Previous</button>
      <span className="hint">Showing {start}–{end} of {total} {label} · Page {current} of {pageCount}</span>
      <button disabled={current >= pageCount} onClick={() => onPage(current + 1)} type="button">Next</button>
    </div>
  );
}
