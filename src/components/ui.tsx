"use client";

import Link from "next/link";

export function StatusBadge({ status }: { status: "paid" | "unpaid" | "overdue" }) {
  const label = status === "paid" ? "Paid" : status === "overdue" ? "Overdue" : "Unpaid";
  return <span className={`badge badge-${status}`}>{label}</span>;
}

export function EmptyState({
  actionHref,
  actionLabel,
  text,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  text: string;
  title: string;
}) {
  return (
    <div className="card empty">
      <h2>{title}</h2>
      <p>{text}</p>
      {actionHref && actionLabel && (
        <Link className="btn btn-primary" href={actionHref}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
