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
