import { describe, expect, it } from "vitest";
import { addMonths, dueTemplates } from "./recurring";
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
