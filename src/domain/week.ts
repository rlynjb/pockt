export type WeekDay = {
  date: string;
  weekday: string;
  dayOfMonth: number;
  isToday: boolean;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function assertDateOnly(value: string): string {
  if (!DATE_ONLY_PATTERN.test(value)) {
    throw new Error("Expected YYYY-MM-DD date");
  }
  return value;
}

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfMondayWeek(date: Date): string {
  const copy = new Date(date);
  const day = copy.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + offset);
  return toLocalDateString(copy);
}

export function buildWeek(startDate: string, todayDate: string): WeekDay[] {
  assertDateOnly(startDate);
  assertDateOnly(todayDate);

  const [year, month, day] = startDate.split("-").map(Number);
  const start = new Date(year, month - 1, day);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateOnly = toLocalDateString(date);
    return {
      date: dateOnly,
      weekday: WEEKDAYS[date.getDay()],
      dayOfMonth: date.getDate(),
      isToday: dateOnly === todayDate
    };
  });
}
