import type { HabitFormValues, HabitTrackerApi, WeekResponse } from "@/src/ui/types";

async function parseJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }
  return body as T;
}

export const browserHabitApi: HabitTrackerApi = {
  async loadWeek(startDate: string, todayDate: string): Promise<WeekResponse> {
    const params = new URLSearchParams({ start: startDate, today: todayDate });
    return parseJson(await fetch(`/api/habits/week?${params.toString()}`));
  },
  async setCompletion(habitId: string, date: string, completed: boolean): Promise<void> {
    await parseJson(
      await fetch(`/api/completions/${encodeURIComponent(habitId)}/${encodeURIComponent(date)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ completed })
      })
    );
  },
  async createHabit(values: HabitFormValues) {
    return parseJson(
      await fetch("/api/habits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values)
      })
    );
  },
  async updateHabit(id: string, values: HabitFormValues) {
    return parseJson(
      await fetch(`/api/habits/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values)
      })
    );
  },
  async archiveHabit(id: string) {
    return parseJson(
      await fetch(`/api/habits/${encodeURIComponent(id)}`, {
        method: "DELETE"
      })
    );
  }
};

export type { HabitTrackerApi };
