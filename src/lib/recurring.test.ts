import { describe, expect, it } from "vitest";
import { addMonths, dueTemplates, recurringDueLabel } from "./recurring";
import type { RecurringTemplate } from "./types";

function template(partial: Partial<RecurringTemplate> & { id: string }): RecurringTemplate {
  return {
    amount: 100,
    clientId: "c1",
    createdAt: "2026-10-01",
    description: "Retainer",
    discountRate: 0,
    nextDueDate: "2026-11-01",
    taxRate: 0,
    userId: "u1",
    ...partial,
  };
}

describe("addMonths", () => {
  it("adds one month in the same year", () => {
    expect(addMonths("2026-11-15", 1)).toBe("2026-12-15");
  });
  it("rolls over the year", () => {
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
  });
  it("clamps to the last day of a shorter month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
  });
  it("keeps the day when the target month has it", () => {
    expect(addMonths("2024-02-29", 1)).toBe("2024-03-29");
  });
});

describe("dueTemplates", () => {
  it("includes templates due today or earlier, and nothing else", () => {
    const templates = [
      template({ id: "past", nextDueDate: "2026-10-31" }),
      template({ id: "today", nextDueDate: "2026-11-01" }),
      template({ id: "future", nextDueDate: "2026-11-02" }),
    ];
    expect(dueTemplates(templates, "2026-11-01").map((t) => t.id)).toEqual(["past", "today"]);
  });
});

describe("recurringDueLabel", () => {
  it("says overdue for past due dates", () => {
    expect(recurringDueLabel("2026-10-30", "2026-11-01")).toEqual({ text: "Overdue by 2 days", tone: "due" });
    expect(recurringDueLabel("2026-10-31", "2026-11-01")).toEqual({ text: "Overdue by 1 day", tone: "due" });
  });
  it("says due today and tomorrow", () => {
    expect(recurringDueLabel("2026-11-01", "2026-11-01")).toEqual({ text: "Due today", tone: "due" });
    expect(recurringDueLabel("2026-11-02", "2026-11-01")).toEqual({ text: "Due tomorrow", tone: "soon" });
  });
  it("says due in N days, soon within a week", () => {
    expect(recurringDueLabel("2026-11-05", "2026-11-01")).toEqual({ text: "Due in 4 days", tone: "soon" });
    expect(recurringDueLabel("2026-11-20", "2026-11-01")).toEqual({ text: "Due in 19 days", tone: "ok" });
  });
});
