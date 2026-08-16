import { describe, expect, it, vi } from "vitest";
import { archiveHabit, createHabit, getWeek, setCompletion, updateHabit } from "@/src/server/habit-service";
import type { HabitRepository } from "@/src/server/repository";

function repo(overrides: Partial<HabitRepository> = {}): HabitRepository {
  return {
    listActiveHabits: vi.fn().mockResolvedValue([]),
    listCompletions: vi.fn().mockResolvedValue([]),
    createHabit: vi.fn(),
    updateHabit: vi.fn(),
    archiveHabit: vi.fn(),
    getHabit: vi.fn(),
    ensureCompletion: vi.fn(),
    ...overrides
  };
}

describe("habit service", () => {
  it("returns a seven-day grid grouped by slot", async () => {
    const fake = repo({
      listActiveHabits: vi.fn().mockResolvedValue([
        { id: "h1", name: "Drink water", slot: "Morning", status: "Active" },
        { id: "h2", name: "Read", slot: "Evening", status: "Active" }
      ]),
      listCompletions: vi.fn().mockResolvedValue([
        { id: "c1", habitId: "h1", completedDate: "2026-08-10" }
      ])
    });

    await expect(getWeek(fake, "2026-08-10", "2026-08-16")).resolves.toEqual({
      weekStart: "2026-08-10",
      days: [
        { date: "2026-08-10", weekday: "Mon", dayOfMonth: 10, isToday: false },
        { date: "2026-08-11", weekday: "Tue", dayOfMonth: 11, isToday: false },
        { date: "2026-08-12", weekday: "Wed", dayOfMonth: 12, isToday: false },
        { date: "2026-08-13", weekday: "Thu", dayOfMonth: 13, isToday: false },
        { date: "2026-08-14", weekday: "Fri", dayOfMonth: 14, isToday: false },
        { date: "2026-08-15", weekday: "Sat", dayOfMonth: 15, isToday: false },
        { date: "2026-08-16", weekday: "Sun", dayOfMonth: 16, isToday: true }
      ],
      groups: [
        {
          slot: "Morning",
          habits: [
            {
              id: "h1",
              name: "Drink water",
              slot: "Morning",
              status: "Active",
              completions: { "2026-08-10": true }
            }
          ]
        },
        {
          slot: "Evening",
          habits: [
            {
              id: "h2",
              name: "Read",
              slot: "Evening",
              status: "Active",
              completions: {}
            }
          ]
        }
      ]
    });
    expect(fake.listCompletions).toHaveBeenCalledWith("2026-08-10", "2026-08-16");
  });

  it("validates habit creation fields", async () => {
    const fake = repo();
    await expect(createHabit(fake, { name: " ", slot: "Morning" })).rejects.toThrow("Habit name is required");
    await expect(createHabit(fake, { name: "Read", slot: "Night" })).rejects.toThrow("Slot must be one of Morning, Midday, Evening, Anytime");
  });

  it("updates only name and slot from edit", async () => {
    const fake = repo({
      updateHabit: vi.fn().mockResolvedValue({ id: "h1", name: "Read", slot: "Evening", status: "Active" })
    });
    await updateHabit(fake, "h1", { name: "Read", slot: "Evening" });
    expect(fake.updateHabit).toHaveBeenCalledWith("h1", { name: "Read", slot: "Evening" });
  });

  it("archives through Status without deleting history", async () => {
    const fake = repo({
      archiveHabit: vi.fn().mockResolvedValue({ id: "h1", name: "Read", slot: "Evening", status: "Archived" })
    });
    await expect(archiveHabit(fake, "h1")).resolves.toEqual({ id: "h1", name: "Read", slot: "Evening", status: "Archived" });
    expect(fake.archiveHabit).toHaveBeenCalledWith("h1");
  });

  it("rejects completion writes for archived habits", async () => {
    const fake = repo({
      getHabit: vi.fn().mockResolvedValue({ id: "h1", name: "Read", slot: "Evening", status: "Archived" })
    });
    await expect(setCompletion(fake, { habitId: "h1", date: "2026-08-16", completed: true })).rejects.toThrow("Archived habits cannot be completed");
  });

  it("serializes concurrent writes for the same habit and date", async () => {
    let activeWrites = 0;
    let maxActiveWrites = 0;
    const fake = repo({
      getHabit: vi.fn().mockResolvedValue({ id: "h1", name: "Read", slot: "Evening", status: "Active" }),
      ensureCompletion: vi.fn().mockImplementation(async () => {
        activeWrites += 1;
        maxActiveWrites = Math.max(maxActiveWrites, activeWrites);
        await new Promise((resolve) => setTimeout(resolve, 5));
        activeWrites -= 1;
        return null;
      })
    });

    await Promise.all([
      setCompletion(fake, { habitId: "h1", date: "2026-08-16", completed: true }),
      setCompletion(fake, { habitId: "h1", date: "2026-08-16", completed: true })
    ]);

    expect(fake.ensureCompletion).toHaveBeenCalledTimes(2);
    expect(maxActiveWrites).toBe(1);
  });
});
