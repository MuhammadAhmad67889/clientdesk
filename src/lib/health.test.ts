import { describe, expect, it } from "vitest";
import { checkHealth } from "./health";

describe("checkHealth", () => {
  it("reports ok when the database answers", async () => {
    await expect(checkHealth(async () => undefined)).resolves.toEqual({ database: "up", status: "ok" });
  });

  it("reports degraded when the database does not answer", async () => {
    await expect(
      checkHealth(async () => {
        throw new Error("connection refused");
      }),
    ).resolves.toEqual({ database: "down", status: "degraded" });
  });
});
