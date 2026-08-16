"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { startOfMondayWeek } from "@/src/domain/week";
import { browserHabitApi } from "@/src/ui/api";
import { HabitGrid } from "@/src/ui/HabitGrid";
import type { CellKey, HabitTrackerApi, WeekResponse } from "@/src/ui/types";

type Props = {
  api?: HabitTrackerApi;
  initialToday?: Date;
};

function formatCellDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(
    new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)))
  );
}

export function HabitTracker({ api = browserHabitApi, initialToday = new Date() }: Props) {
  const weekStart = useMemo(() => startOfMondayWeek(initialToday), [initialToday]);
  const [week, setWeek] = useState<WeekResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingCells, setPendingCells] = useState<Set<CellKey>>(new Set());
  const [failedCells, setFailedCells] = useState<Map<CellKey, string>>(new Map());

  const loadWeek = useCallback(async () => {
    const response = await api.loadWeek(weekStart);
    setWeek(response);
    setLoadError(null);
  }, [api, weekStart]);

  useEffect(() => {
    let alive = true;
    api.loadWeek(weekStart)
      .then((response) => {
        if (alive) {
          setWeek(response);
          setLoadError(null);
        }
      })
      .catch(() => {
        if (alive) {
          setLoadError("The habit tracker is unavailable right now.");
        }
      });
    return () => {
      alive = false;
    };
  }, [api, weekStart]);

  function updateCell(habitId: string, date: string, completed: boolean) {
    setWeek((current) => {
      if (!current) return current;
      return {
        ...current,
        groups: current.groups.map((group) => ({
          ...group,
          habits: group.habits.map((habit) =>
            habit.id === habitId
              ? { ...habit, completions: { ...habit.completions, [date]: completed } }
              : habit
          )
        }))
      };
    });
  }

  async function handleToggle(habitId: string, date: string, completed: boolean) {
    const key: CellKey = `${habitId}:${date}`;
    const habit = week?.groups.flatMap((group) => group.habits).find((row) => row.id === habitId);
    const previous = Boolean(habit?.completions[date]);

    setPendingCells((current) => new Set(current).add(key));
    setFailedCells((current) => {
      const next = new Map(current);
      next.delete(key);
      return next;
    });
    updateCell(habitId, date, completed);

    try {
      await api.setCompletion(habitId, date, completed);
    } catch {
      updateCell(habitId, date, previous);
      setFailedCells((current) =>
        new Map(current).set(key, `Could not save ${formatCellDate(date)} for ${habit?.name ?? "this habit"}.`)
      );
    } finally {
      setPendingCells((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }

  return (
    <main className="appShell">
      <section className="trackerSurface" aria-labelledby="tracker-title">
        <header className="trackerHeader">
          <div>
            <h1 id="tracker-title">pockt habits</h1>
            <p className="muted">Week of {week?.weekStart ?? weekStart}</p>
          </div>
          <button type="button" className="primaryButton" onClick={() => void loadWeek()}>
            <Plus aria-hidden="true" size={16} /> Add habit
          </button>
        </header>

        {loadError ? <p role="alert" className="bannerError">{loadError}</p> : null}
        {!week && !loadError ? <div className="gridSkeleton" aria-label="Loading habit tracker" /> : null}
        {week && week.groups.length === 0 ? (
          <div className="emptyState">
            <p>No active habits yet.</p>
          </div>
        ) : null}
        {week && week.groups.length > 0 ? (
          <HabitGrid
            days={week.days}
            groups={week.groups}
            pendingCells={pendingCells}
            failedCells={failedCells}
            onToggle={handleToggle}
            onEdit={() => undefined}
          />
        ) : null}
      </section>
    </main>
  );
}
