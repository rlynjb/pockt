import type { Completion, Habit, HabitStatus, Slot } from "@/src/domain/habits";

export type CreateHabitInput = {
  name: string;
  slot: Slot;
  sortOrder?: number;
};

export type UpdateHabitInput = {
  name?: string;
  slot?: Slot;
  status?: HabitStatus;
  sortOrder?: number;
};

export type ReorderHabitInput = {
  id: string;
  sortOrder: number;
};

export type SetCompletionInput = {
  habitId: string;
  date: string;
  completed: boolean;
};

export interface HabitRepository {
  listActiveHabits(): Promise<Habit[]>;
  listCompletions(startDate: string, endDate: string): Promise<Completion[]>;
  createHabit(input: CreateHabitInput): Promise<Habit>;
  updateHabit(id: string, input: UpdateHabitInput): Promise<Habit>;
  archiveHabit(id: string): Promise<Habit>;
  getHabit(id: string): Promise<Habit | null>;
  ensureCompletion(input: SetCompletionInput): Promise<Completion | null>;
  reorderHabits(input: ReorderHabitInput[]): Promise<void>;
}
