"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { startOfMondayWeek } from "@/src/domain/week";
import { ArchiveDialog } from "@/src/ui/ArchiveDialog";
import { browserHabitApi } from "@/src/ui/api";
import { HabitFormDialog } from "@/src/ui/HabitFormDialog";
import { HabitGrid } from "@/src/ui/HabitGrid";
import type { CellKey, HabitFormValues, HabitTrackerApi, WeekResponse } from "@/src/ui/types";

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
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const selectedHabit = week?.groups.flatMap((group) => group.habits).find((habit) => habit.id === selectedHabitId);
  const modalOpen = formMode !== null || archiveOpen;

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

  function openAddForm() {
    setSelectedHabitId(null);
    setFormError(null);
    setFormMode("add");
  }

  async function submitHabit(values: HabitFormValues) {
    setFormSaving(true);
    setFormError(null);
    try {
      if (formMode === "add") {
        await api.createHabit(values);
      } else if (formMode === "edit" && selectedHabitId) {
        await api.updateHabit(selectedHabitId, values);
      }
      await loadWeek();
      setFormMode(null);
      setSelectedHabitId(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save habit.");
    } finally {
      setFormSaving(false);
    }
  }

  async function confirmArchive() {
    if (!selectedHabitId) return;

    setFormSaving(true);
    setFormError(null);
    try {
      await api.archiveHabit(selectedHabitId);
      await loadWeek();
      setArchiveOpen(false);
      setFormMode(null);
      setSelectedHabitId(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not archive habit.");
      setArchiveOpen(false);
      setFormMode("edit");
    } finally {
      setFormSaving(false);
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
          <button
            type="button"
            className="primaryButton"
            onClick={openAddForm}
            aria-hidden={modalOpen}
            tabIndex={modalOpen ? -1 : undefined}
          >
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
            onEdit={(habitId) => {
              setSelectedHabitId(habitId);
              setFormError(null);
              setFormMode("edit");
            }}
          />
        ) : null}
        <HabitFormDialog
          key={`${formMode ?? "closed"}-${selectedHabitId ?? "new"}`}
          mode={formMode ?? "add"}
          open={formMode !== null && !archiveOpen}
          habit={selectedHabit}
          saving={formSaving}
          error={formError}
          onClose={() => {
            setFormMode(null);
            setSelectedHabitId(null);
          }}
          onSubmit={submitHabit}
          onArchive={formMode === "edit" ? () => setArchiveOpen(true) : undefined}
        />
        <ArchiveDialog
          open={archiveOpen}
          habitName={selectedHabit?.name ?? "This habit"}
          saving={formSaving}
          error={formError}
          onCancel={() => setArchiveOpen(false)}
          onConfirm={confirmArchive}
        />
      </section>
    </main>
  );
}
