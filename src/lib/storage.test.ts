import { describe, expect, it } from "vitest";
import { parseStoredData, serializeData } from "./storage";

describe("parseStoredData", () => {
  it("seeds demo data when storage is empty", () => {
    const data = parseStoredData(null, "2026-10-29");
    expect(data.clients.length).toBe(3);
    expect(data.invoices.length).toBe(5);
  });
  it("seeds demo data for corrupt JSON or wrong shape", () => {
    expect(parseStoredData("not json", "2026-10-29").clients.length).toBe(3);
    expect(parseStoredData('{"clients":"nope"}', "2026-10-29").invoices.length).toBe(5);
  });
  it("round-trips real stored data", () => {
    const original = parseStoredData(null, "2026-10-29");
    const parsed = parseStoredData(serializeData(original), "2026-10-29");
    expect(parsed).toEqual(original);
  });
});
