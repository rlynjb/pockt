import { groupHabitsBySlot, normalizeHabitName, parseSlot, type HabitGridRow, type Slot } from "@/src/domain/habits";
import { assertDateOnly, buildWeek } from "@/src/domain/week";
import { ServiceError } from "@/src/server/errors";
import type { HabitRepository } from "@/src/server/repository";

const completionWriteLocks = new Map<string, Promise<void>>();

async function runWithCompletionLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = completionWriteLocks.get(key) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  const tracked = current.then(
    () => undefined,
    () => undefined
  );

  completionWriteLocks.set(key, tracked);

  try {
    return await current;
  } finally {
    if (completionWriteLocks.get(key) === tracked) {
      completionWriteLocks.delete(key);
    }
  }
}

export async function getWeek(repo: HabitRepository, startDate: string, todayDate: string) {
  const weekStart = assertDateOnly(startDate);
  const days = buildWeek(weekStart, assertDateOnly(todayDate));
  const endDate = days[6].date;
  const [habits, completions] = await Promise.all([
    repo.listActiveHabits(),
    repo.listCompletions(weekStart, endDate)
  ]);

  const rows: HabitGridRow[] = habits.map((habit) => {
    const rowCompletions: Record<string, boolean> = {};
    for (const completion of completions) {
      if (completion.habitId === habit.id) {
        rowCompletions[completion.completedDate] = true;
      }
    }
    return { ...habit, completions: rowCompletions };
  });

  return {
    weekStart,
    days,
    groups: groupHabitsBySlot(rows)
  };
}

export async function createHabit(repo: HabitRepository, input: { name: string; slot: unknown }) {
  return repo.createHabit({
    name: normalizeHabitName(input.name),
    slot: parseSlot(input.slot),
    sortOrder: Date.now()
  });
}

export async function updateHabit(repo: HabitRepository, id: string, input: { name?: string; slot?: unknown }) {
  const update: { name?: string; slot?: Slot } = {};
  if (input.name !== undefined) {
    update.name = normalizeHabitName(input.name);
  }
  if (input.slot !== undefined) {
    update.slot = parseSlot(input.slot);
  }
  return repo.updateHabit(id, update);
}

export async function archiveHabit(repo: HabitRepository, id: string) {
  return repo.archiveHabit(id);
}

export async function reorderHabits(repo: HabitRepository, input: { habitIds: unknown }) {
  if (!Array.isArray(input.habitIds) || input.habitIds.length === 0) {
    throw new ServiceError("bad_request", "Habit order must include at least one habit", 400);
  }

  const habitIds = input.habitIds.map((habitId) => {
    if (typeof habitId !== "string" || habitId.trim() === "") {
      throw new ServiceError("bad_request", "Habit order must contain habit IDs", 400);
    }
    return habitId;
  });

  if (new Set(habitIds).size !== habitIds.length) {
    throw new ServiceError("bad_request", "Habit order must not contain duplicates", 400);
  }

  const activeHabits = await repo.listActiveHabits();
  const habitsById = new Map(activeHabits.map((habit) => [habit.id, habit]));
  const orderedHabits = habitIds.map((id) => {
    const habit = habitsById.get(id);
    if (!habit) {
      throw new ServiceError("bad_request", "Habit order can include only active habits", 400);
    }
    return habit;
  });
  const slot = orderedHabits[0].slot;
  if (orderedHabits.some((habit) => habit.slot !== slot)) {
    throw new ServiceError("bad_request", "Habit order must stay within one slot", 400);
  }

  const activeSlotIds = activeHabits.filter((habit) => habit.slot === slot).map((habit) => habit.id);
  if (activeSlotIds.length !== habitIds.length || activeSlotIds.some((id) => !habitIds.includes(id))) {
    throw new ServiceError("bad_request", "Habit order must include every active habit in the slot", 400);
  }

  await repo.reorderHabits(habitIds.map((id, index) => ({ id, sortOrder: (index + 1) * 1000 })));
}

export async function setCompletion(
  repo: HabitRepository,
  input: { habitId: string; date: string; completed: boolean }
) {
  const date = assertDateOnly(input.date);
  const habit = await repo.getHabit(input.habitId);
  if (!habit) {
    throw new ServiceError("not_found", "Habit not found", 404);
  }
  if (habit.status === "Archived") {
    throw new ServiceError("bad_request", "Archived habits cannot be completed", 400);
  }
  return runWithCompletionLock(`${input.habitId}:${date}`, () =>
    repo.ensureCompletion({ habitId: input.habitId, date, completed: input.completed })
  );
}
