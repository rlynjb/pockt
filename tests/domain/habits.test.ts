import { describe, expect, it } from "vitest";
import { groupHabitsBySlot, normalizeHabitName, parseSlot } from "@/src/domain/habits";

describe("habit domain", () => {
  it("accepts only approved single slots", () => {
    expect(parseSlot("Morning")).toBe("Morning");
    expect(parseSlot("Midday")).toBe("Midday");
    expect(parseSlot("Evening")).toBe("Evening");
    expect(parseSlot("Anytime")).toBe("Anytime");
    expect(() => parseSlot("Morning, Evening")).toThrow("Slot must be one of Morning, Midday, Evening, Anytime");
    expect(() => parseSlot("")).toThrow("Slot must be one of Morning, Midday, Evening, Anytime");
  });

  it("trims habit names and rejects empty names", () => {
    expect(normalizeHabitName("  Drink water  ")).toBe("Drink water");
    expect(() => normalizeHabitName("   ")).toThrow("Habit name is required");
  });

  it("groups rows in the approved slot order and omits empty groups", () => {
    const groups = groupHabitsBySlot([
      { id: "h2", name: "Read", slot: "Evening", status: "Active", completions: {} },
      { id: "h1", name: "Stretch", slot: "Morning", status: "Active", completions: {} }
    ]);

    expect(groups).toEqual([
      { slot: "Morning", habits: [{ id: "h1", name: "Stretch", slot: "Morning", status: "Active", completions: {} }] },
      { slot: "Evening", habits: [{ id: "h2", name: "Read", slot: "Evening", status: "Active", completions: {} }] }
    ]);
  });

  it("orders habits inside a slot by persisted sort order", () => {
    const groups = groupHabitsBySlot([
      { id: "h3", name: "Plan day", slot: "Morning", status: "Active", sortOrder: 3000, completions: {} },
      { id: "h1", name: "Coffee", slot: "Morning", status: "Active", sortOrder: 1000, completions: {} },
      { id: "h2", name: "Stretch", slot: "Morning", status: "Active", sortOrder: 2000, completions: {} }
    ]);

    expect(groups[0].habits.map((habit) => habit.id)).toEqual(["h1", "h2", "h3"]);
  });
});
