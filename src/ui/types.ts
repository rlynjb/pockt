import type { Habit, HabitGridRow, Slot, SlotGroup } from "@/src/domain/habits";
import type { WeekDay } from "@/src/domain/week";

export type WeekResponse = {
  weekStart: string;
  days: WeekDay[];
  groups: SlotGroup[];
};

export type HabitFormValues = {
  name: string;
  slot: Slot;
};

export type HabitTrackerApi = {
  loadWeek(startDate: string, todayDate: string): Promise<WeekResponse>;
  setCompletion(habitId: string, date: string, completed: boolean): Promise<void>;
  createHabit(values: HabitFormValues): Promise<Habit>;
  updateHabit(id: string, values: HabitFormValues): Promise<Habit>;
  archiveHabit(id: string): Promise<Habit>;
  reorderHabits(habitIds: string[]): Promise<void>;
};

export type CellKey = `${string}:${string}`;

export type EditableHabit = HabitGridRow;
