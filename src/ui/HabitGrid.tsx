import { Fragment } from "react";
import type { SlotGroup } from "@/src/domain/habits";
import type { WeekDay } from "@/src/domain/week";
import type { CellKey } from "@/src/ui/types";

type Props = {
  days: WeekDay[];
  groups: SlotGroup[];
  pendingCells: Set<CellKey>;
  failedCells: Map<CellKey, string>;
  onToggle(habitId: string, date: string, completed: boolean): void;
  onEdit(habitId: string): void;
};

function longDate(dateOnly: string): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(new Date(year, month - 1, day));
}

export function HabitGrid({ days, groups, pendingCells, failedCells, onToggle, onEdit }: Props) {
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
                <tr key={habit.id}>
                  <th scope="row" className="habitName">
                    <button type="button" className="textButton" onClick={() => onEdit(habit.id)}>
                      {habit.name}
                    </button>
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
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
