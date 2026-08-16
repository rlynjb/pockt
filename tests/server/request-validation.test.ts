import { describe, expect, it } from "vitest";
import { parseRequiredBoolean, parseRequiredObject } from "@/src/server/request-validation";

describe("request validation", () => {
  it("accepts real booleans", () => {
    expect(parseRequiredBoolean(true, "completed")).toBe(true);
    expect(parseRequiredBoolean(false, "completed")).toBe(false);
  });

  it("rejects non-boolean values", () => {
    expect(() => parseRequiredBoolean("false", "completed")).toThrow("completed must be a boolean");
    expect(() => parseRequiredBoolean(undefined, "completed")).toThrow("completed must be a boolean");
  });

  it("accepts object request bodies", () => {
    expect(parseRequiredObject({ completed: true }, "request body")).toEqual({ completed: true });
  });

  it("rejects null, arrays, and primitives as request bodies", () => {
    expect(() => parseRequiredObject(null, "request body")).toThrow("request body must be an object");
    expect(() => parseRequiredObject([], "request body")).toThrow("request body must be an object");
    expect(() => parseRequiredObject("{}", "request body")).toThrow("request body must be an object");
  });
});
