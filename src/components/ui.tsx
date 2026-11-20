"use client";

import gsap from "gsap";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export function StatusBadge({ status }: { status: "paid" | "unpaid" | "overdue" }) {
  const label = status === "paid" ? "Paid" : status === "overdue" ? "Overdue" : "Unpaid";
  return <span className={`badge badge-${status}`}>{label}</span>;
}

export function EmptyState({
  actionHref,
  actionLabel,
  icon,
  text,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  /** Optional Lucide icon shown in a soft circle above the title. */
  icon?: ReactNode;
  text: string;
  title: string;
}) {
  return (
    <div className="card empty">
      {icon && <span className="empty-icon">{icon}</span>}
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

/**
 * A number that counts up to its real value when it first appears,
 * and tweens to the new value when the data changes (a refresh
 * after saving, for example). The server-rendered text is always
 * the final value, so no-JS and reduced-motion visitors simply see
 * the number — the animation only ever replaces text that is
 * already correct. The tween is killed on unmount.
 */
export function CountUp({
  format,
  value,
}: {
  /** Turns the running number into display text, e.g. formatMoney. */
  format: (n: number) => string;
  value: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  // The formatter can be a fresh arrow function on every render;
  // keep it in a ref so the effect below only re-runs when the
  // value itself changes.
  const formatRef = useRef(format);
  formatRef.current = format;
  const displayed = useRef(0);
  const firstRun = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = (n: number) => {
      displayed.current = n;
      el.textContent = formatRef.current(n);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      firstRun.current = false;
      show(value);
      return;
    }
    const from = firstRun.current ? 0 : displayed.current;
    firstRun.current = false;
    const state = { n: from };
    const tween = gsap.to(state, {
      duration: 0.9,
      ease: "power2.out",
      n: value,
      onComplete: () => show(value),
      onUpdate: () => show(state.n),
    });
    return () => {
      tween.kill();
    };
  }, [value]);

  return <span ref={ref}>{format(value)}</span>;
}
