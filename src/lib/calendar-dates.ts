import { ASSEMBLY_TIMEZONE } from "@/lib/assembly-filters";

export { ASSEMBLY_TIMEZONE };

export const WEEK_HOUR_START = 7;
export const WEEK_HOUR_END = 20;

export type CalendarView = "month" | "week";

type DateParts = { year: number; month: number; day: number };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function partsToStoredDate(parts: DateParts): Date {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function parseIsoDateKey(value: string): DateParts | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function getLondonParts(date = new Date()): DateParts {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: ASSEMBLY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const [year, month, day] = formatted.split("-").map(Number);
  return { year, month, day };
}

function londonWeekdayIndex(storedDate: Date): number {
  const label = new Intl.DateTimeFormat("en-GB", {
    timeZone: ASSEMBLY_TIMEZONE,
    weekday: "short",
  }).format(storedDate);
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return map[label] ?? 0;
}

export function dateKeyFromParts(parts: DateParts): string {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

/** London calendar day key (`yyyy-mm-dd`) for a stored @db.Date. */
export function londonDateKey(date: Date | null | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ASSEMBLY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function currentLondonDateKey(): string {
  return dateKeyFromParts(getLondonParts());
}

export function currentMonthKey(): string {
  const { year, month } = getLondonParts();
  return `${year}-${pad(month)}`;
}

export function currentWeekKey(): string {
  const parts = getLondonParts();
  const date = partsToStoredDate(parts);
  const weekday = londonWeekdayIndex(date);
  date.setUTCDate(date.getUTCDate() - weekday);
  return dateKeyFromParts({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

export function normalizeMonth(value: string | undefined): string {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : currentMonthKey();
}

export function normalizeWeek(value: string | undefined): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : currentWeekKey();
}

export function normalizeView(value: string | undefined): CalendarView {
  return value === "week" ? "week" : "month";
}

export function buildMonthGrid(month: string): Date[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const firstWeekday = (first.getUTCDay() + 6) % 7;
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - firstWeekday);

  const days: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    days.push(day);
  }
  return days;
}

export function buildWeekGrid(weekKey: string): string[] {
  const parts = parseIsoDateKey(weekKey);
  if (!parts) return [];
  const start = partsToStoredDate(parts);
  const keys: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    keys.push(
      dateKeyFromParts({
        year: day.getUTCFullYear(),
        month: day.getUTCMonth() + 1,
        day: day.getUTCDate(),
      }),
    );
  }
  return keys;
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

export function shiftWeek(weekKey: string, deltaWeeks: number): string {
  const parts = parseIsoDateKey(weekKey);
  if (!parts) return currentWeekKey();
  const date = partsToStoredDate(parts);
  date.setUTCDate(date.getUTCDate() + deltaWeeks * 7);
  return dateKeyFromParts({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

export function monthKeyFromWeekKey(weekKey: string): string {
  const parts = parseIsoDateKey(weekKey);
  if (!parts) return currentMonthKey();
  return `${parts.year}-${pad(parts.month)}`;
}

export function weekKeyFromMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const today = getLondonParts();
  if (today.year === year && today.month === monthNumber) {
    return currentWeekKey();
  }
  const first = partsToStoredDate({ year, month: monthNumber, day: 1 });
  const weekday = londonWeekdayIndex(first);
  first.setUTCDate(first.getUTCDate() - weekday);
  return dateKeyFromParts({
    year: first.getUTCFullYear(),
    month: first.getUTCMonth() + 1,
    day: first.getUTCDate(),
  });
}

export function gridRangeForMonth(month: string): { start: Date; end: Date } {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const firstWeekday = (first.getUTCDay() + 6) % 7;
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - firstWeekday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 41);
  return { start, end };
}

export function gridRangeForWeek(weekKey: string): { start: Date; end: Date } {
  const keys = buildWeekGrid(weekKey);
  if (keys.length === 0) {
    const today = currentWeekKey();
    return gridRangeForWeek(today);
  }
  const startParts = parseIsoDateKey(keys[0])!;
  const endParts = parseIsoDateKey(keys[keys.length - 1])!;
  return {
    start: partsToStoredDate(startParts),
    end: partsToStoredDate(endParts),
  };
}

/** Hour 7–20 for week slots; `null` for all-day (no time or outside range). */
export function parseTimeSlot(time: string | null | undefined): number | null {
  const trimmed = (time ?? "").trim();
  if (!trimmed || !/^\d{2}:\d{2}$/.test(trimmed)) return null;
  const hour = Number(trimmed.split(":")[0]);
  if (Number.isNaN(hour) || hour < WEEK_HOUR_START || hour > WEEK_HOUR_END) return null;
  return hour;
}

export function formatTimeLabel(time: string | null | undefined): string {
  const trimmed = (time ?? "").trim();
  return trimmed || "";
}

export function weekHourLabels(): number[] {
  const hours: number[] = [];
  for (let hour = WEEK_HOUR_START; hour <= WEEK_HOUR_END; hour += 1) {
    hours.push(hour);
  }
  return hours;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return `${MONTH_NAMES[monthNumber - 1]} ${year}`;
}

export function formatWeekLabel(weekKey: string): string {
  const keys = buildWeekGrid(weekKey);
  if (keys.length < 7) return weekKey;
  const start = parseIsoDateKey(keys[0])!;
  const end = parseIsoDateKey(keys[6])!;
  const startLabel = `${start.day} ${MONTH_NAMES[start.month - 1].slice(0, 3)}`;
  const endLabel = `${end.day} ${MONTH_NAMES[end.month - 1].slice(0, 3)} ${end.year}`;
  return `${startLabel} – ${endLabel}`;
}

export function formatDayHeading(dateKey: string): string {
  const parts = parseIsoDateKey(dateKey);
  if (!parts) return dateKey;
  return `${MONTH_NAMES[parts.month - 1]} ${parts.day}, ${parts.year}`;
}

export function slotKey(dateKey: string, hour: number | null): string {
  return `${dateKey}:${hour ?? "all"}`;
}
