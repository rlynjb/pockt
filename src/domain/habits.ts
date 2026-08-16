export const SLOTS = ["Morning", "Midday", "Evening", "Anytime"] as const;
export type Slot = (typeof SLOTS)[number];
export type HabitStatus = "Active" | "Archived";

export type Habit = {
  id: string;
  name: string;
  slot: Slot;
  status: HabitStatus;
  sortOrder?: number;
};

export type Completion = {
  id: string;
  habitId: string;
  completedDate: string;
};

export type HabitGridRow = Habit & {
  completions: Record<string, boolean>;
};

export type SlotGroup = {
  slot: Slot;
  habits: HabitGridRow[];
};

export function parseSlot(value: unknown): Slot {
  if (typeof value === "string" && SLOTS.includes(value as Slot)) {
    return value as Slot;
  }

  throw new Error("Slot must be one of Morning, Midday, Evening, Anytime");
}

export function normalizeHabitName(value: string): string {
  const name = value.trim();
  if (!name) {
    throw new Error("Habit name is required");
  }
  return name;
}

export function groupHabitsBySlot(rows: HabitGridRow[]): SlotGroup[] {
  return SLOTS.map((slot) => ({
    slot,
    habits: rows.filter((row) => row.slot === slot).sort(compareHabitRows)
  })).filter((group) => group.habits.length > 0);
}

function compareHabitRows(a: HabitGridRow, b: HabitGridRow): number {
  const aOrder = typeof a.sortOrder === "number" ? a.sortOrder : Number.POSITIVE_INFINITY;
  const bOrder = typeof b.sortOrder === "number" ? b.sortOrder : Number.POSITIVE_INFINITY;
  if (aOrder !== bOrder) {
    return aOrder - bOrder;
  }
  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}
