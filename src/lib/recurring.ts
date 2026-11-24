import type { RecurringTemplate } from "./types";

/**
 * Add whole calendar months to a YYYY-MM-DD date, clamping the day when
 * the target month is shorter (31 Jan + 1 month = 28 Feb in 2026).
 */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const day = Math.min(d, lastDay);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Templates whose next due date has arrived (inclusive) on `today`. */
export function dueTemplates(
  templates: RecurringTemplate[],
  today: string,
): RecurringTemplate[] {
  return templates.filter((t) => t.nextDueDate <= today);
}

export type DueLabel = { text: string; tone: "due" | "soon" | "ok" };

/** Plain words for when a template's next invoice falls due, so the
 * list can say "Due in 5 days" instead of showing a bare date. */
export function recurringDueLabel(nextDueDate: string, today: string): DueLabel {
  const due = new Date(`${nextDueDate}T12:00:00`).getTime();
  const now = new Date(`${today}T12:00:00`).getTime();
  const days = Math.round((due - now) / 86400000);
  if (days < 0) {
    return { text: `Overdue by ${-days} day${-days === 1 ? "" : "s"}`, tone: "due" };
  }
  if (days === 0) return { text: "Due today", tone: "due" };
  if (days === 1) return { text: "Due tomorrow", tone: "soon" };
  if (days <= 7) return { text: `Due in ${days} days`, tone: "soon" };
  return { text: `Due in ${days} days`, tone: "ok" };
}
