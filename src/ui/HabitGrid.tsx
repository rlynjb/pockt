import { GripVertical } from "lucide-react";
import { Fragment, useState } from "react";
import type { Slot, SlotGroup } from "@/src/domain/habits";
import type { WeekDay } from "@/src/domain/week";
import type { CellKey } from "@/src/ui/types";

type Props = {
  days: WeekDay[];
  groups: SlotGroup[];
  pendingCells: Set<CellKey>;
  failedCells: Map<CellKey, string>;
  onToggle(habitId: string, date: string, completed: boolean): void;
  onEdit(habitId: string): void;
  onReorder(slot: Slot, habitIds: string[]): void;
  reorderSaving: boolean;
};

function longDate(dateOnly: string): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(new Date(year, month - 1, day));
}

export function HabitGrid({ days, groups, pendingCells, failedCells, onToggle, onEdit, onReorder, reorderSaving }: Props) {
  const [draggedHabit, setDraggedHabit] = useState<{ slot: Slot; id: string } | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<string | null>(null);

  function endTargetKey(slot: Slot): string {
    return `${slot}:end`;
  }

  function dropHabit(slot: Slot, habitIds: string[], targetHabitId: string) {
    if (reorderSaving || !draggedHabit || draggedHabit.slot !== slot || draggedHabit.id === targetHabitId) {
      return;
    }

    const nextIds = habitIds.filter((id) => id !== draggedHabit.id);
    const targetIndex = nextIds.indexOf(targetHabitId);
    if (targetIndex === -1) {
      return;
    }
    nextIds.splice(targetIndex, 0, draggedHabit.id);
    onReorder(slot, nextIds);
    setDraggedHabit(null);
    setActiveDropTarget(null);
  }

  function dropHabitAtEnd(slot: Slot, habitIds: string[]) {
    if (reorderSaving || !draggedHabit || draggedHabit.slot !== slot) {
      return;
    }

    const nextIds = habitIds.filter((id) => id !== draggedHabit.id);
    if (nextIds.at(-1) === draggedHabit.id) {
      return;
    }
    nextIds.push(draggedHabit.id);
    onReorder(slot, nextIds);
    setDraggedHabit(null);
    setActiveDropTarget(null);
  }

  return (
    <div className="gridScroller">
      <table className="habitGrid">
        <thead>
          <tr>
            <th scope="col" className="habitColumn">
              Habit
            </th>
            {days.map((day) => (
              <th
                key={day.date}
                scope="col"
                className={day.isToday ? "todayColumn" : undefined}
                aria-label={`${day.weekday} ${day.dayOfMonth}${day.isToday ? " Today" : ""}`}
              >
                <span>{day.weekday}</span>
                <strong>{day.dayOfMonth}</strong>
                {day.isToday ? <em>Today</em> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <Fragment key={group.slot}>
              <tr className="slotRow">
                <th scope="rowgroup" colSpan={days.length + 1}>
                  {group.slot}
                </th>
              </tr>
              {group.habits.map((habit) => (
                <tr
                  key={habit.id}
                  className={[
                    draggedHabit?.id === habit.id ? "draggingRow" : "",
                    activeDropTarget === habit.id ? "dropTargetRow" : ""
                  ].filter(Boolean).join(" ") || undefined}
                >
                  <th scope="row" className="habitName">
                    <div className="habitNameContent">
                      <button
                        type="button"
                        className="dragHandle"
                        draggable
                        disabled={reorderSaving}
                        aria-label={`Drag ${habit.name}`}
                        title={`Drag ${habit.name}`}
                        onDragStart={(event) => {
                          if (reorderSaving) {
                            event.preventDefault();
                            return;
                          }
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", habit.id);
                          setDraggedHabit({ slot: group.slot, id: habit.id });
                          setActiveDropTarget(null);
                        }}
                        onDragOver={(event) => {
                          if (draggedHabit?.slot === group.slot && draggedHabit.id !== habit.id) {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                            setActiveDropTarget(habit.id);
                          }
                        }}
                        onDragLeave={() => {
                          if (activeDropTarget === habit.id) {
                            setActiveDropTarget(null);
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          dropHabit(group.slot, group.habits.map((row) => row.id), habit.id);
                        }}
                        onDragEnd={() => {
                          setDraggedHabit(null);
                          setActiveDropTarget(null);
                        }}
                      >
                        <GripVertical aria-hidden="true" size={14} />
                      </button>
                      <button type="button" className="textButton" onClick={() => onEdit(habit.id)}>
                        {habit.name}
                      </button>
                    </div>
                  </th>
                  {days.map((day) => {
                    const key: CellKey = `${habit.id}:${day.date}`;
                    const completed = Boolean(habit.completions[day.date]);
                    const pending = pendingCells.has(key);
                    const failed = failedCells.get(key);
                    return (
                      <td key={day.date} className={day.isToday ? "todayColumn" : undefined}>
                        <button
                          type="button"
                          className={completed ? "completionCell completed" : "completionCell"}
                          aria-pressed={completed}
                          aria-label={`${habit.name} on ${longDate(day.date)}: ${completed ? "completed" : "incomplete"}`}
                          disabled={pending}
                          onClick={() => onToggle(habit.id, day.date, !completed)}
                        >
                          {completed ? "✓" : ""}
                        </button>
                        {failed ? <p className="cellError">{failed}</p> : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="dropEndRow">
                <td colSpan={days.length + 1}>
                  <div
                    className={activeDropTarget === endTargetKey(group.slot) ? "dropEndTarget dropEndTargetActive" : "dropEndTarget"}
                    aria-label={`Drop at end of ${group.slot}`}
                    onDragOver={(event) => {
                      if (draggedHabit?.slot === group.slot && !reorderSaving) {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setActiveDropTarget(endTargetKey(group.slot));
                      }
                    }}
                    onDragLeave={() => {
                      if (activeDropTarget === endTargetKey(group.slot)) {
                        setActiveDropTarget(null);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      dropHabitAtEnd(group.slot, group.habits.map((row) => row.id));
                    }}
                  />
                </td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
