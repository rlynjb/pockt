import { describe, expect, it } from "vitest";
import { parseRequiredBoolean } from "@/src/server/request-validation";

describe("request validation", () => {
  it("accepts real booleans", () => {
    expect(parseRequiredBoolean(true, "completed")).toBe(true);
    expect(parseRequiredBoolean(false, "completed")).toBe(false);
  });

  it("rejects non-boolean values", () => {
    expect(() => parseRequiredBoolean("false", "completed")).toThrow("completed must be a boolean");
    expect(() => parseRequiredBoolean(undefined, "completed")).toThrow("completed must be a boolean");
  });
});
