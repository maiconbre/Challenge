/**
 * Date manipulation utilities
 * Standardizes date usage across the application
 * Uses only native JS Date APIs (no external dependencies)
 */

export const WEEKDAYS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;
export const HOURS = Array.from({ length: 24 }, (_, i) => i);
export const MINUTES_PER_HOUR = 60;
export const PIXELS_PER_HOUR = 60;

/**
 * Formats a date to YYYY-MM-DD string
 */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formats hour as HH:mm
 */
export function formatTime(hour: number, minute: number = 0): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Gets today's date in ISO format
 */
export function getTodayISO(): string {
  return formatDateISO(new Date());
}

/**
 * Checks if an ISO date string is today
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getTodayISO();
}

/**
 * Extracts the date part (YYYY-MM-DD) from an ISO datetime
 */
export function getDatePart(isoDateTime: string): string {
  return isoDateTime.split("T")[0];
}

/**
 * Extracts the time part (HH:mm) from an ISO datetime
 */
export function getTimePart(isoDateTime: string): string {
  return isoDateTime.split("T")[1]?.substring(0, 5) || "00:00";
}

/**
 * Extracts hours and minutes from an ISO datetime
 */
export function getHourAndMinute(isoDateTime: string): {
  hour: number;
  minute: number;
} {
  const timePart = isoDateTime.split("T")[1] || "00:00:00";
  const [hour, minute] = timePart.split(":").map(Number);
  return { hour, minute };
}

/**
 * Calculates vertical pixel position for a given time
 */
export function calculatePixelTop(hour: number, minute: number = 0): number {
  return hour * PIXELS_PER_HOUR + (minute / MINUTES_PER_HOUR) * PIXELS_PER_HOUR;
}

/**
 * Calculates duration in minutes between two ISO datetimes
 */
export function calculateDurationMinutes(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60);
}

/**
 * Gets the start of the week (Sunday) for a given date
 */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Gets the end of the week (Saturday) for a given date
 */
export function endOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + (6 - d.getDay()));
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Gets the start of the month for a given date
 */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Gets the end of the month for a given date
 */
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Returns an array of dates between start and end (inclusive)
 */
export function eachDayOfInterval(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endTime = new Date(end);
  endTime.setHours(23, 59, 59, 999);

  while (current <= endTime) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/**
 * Checks if two dates are in the same month
 */
export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/**
 * Checks if two dates are the same day
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Adds N months to a date
 */
export function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

/**
 * Subtracts N months from a date
 */
export function subMonths(date: Date, n: number): Date {
  return addMonths(date, -n);
}

/**
 * Adds N weeks to a date
 */
export function addWeeks(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n * 7);
  return d;
}

/**
 * Subtracts N weeks from a date
 */
export function subWeeks(date: Date, n: number): Date {
  return addWeeks(date, -n);
}

/**
 * Builds calendar grid for a specific month
 */
export interface CalendarDay {
  day: number | null;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function buildCalendarMonth(date: Date): CalendarDay[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval(calStart, calEnd);

  return days.map((day) => ({
    day: day.getDate(),
    dateStr: formatDateISO(day),
    isCurrentMonth: isSameMonth(day, monthStart),
    isToday: isSameDay(day, new Date()),
  }));
}

/**
 * Gets the days of the week containing the given date
 */
export function getWeekDays(date: Date): Date[] {
  return eachDayOfInterval(startOfWeek(date), endOfWeek(date));
}

/**
 * Gets formatted month label (e.g., "February 2026")
 */
export function getMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Formats a day abbreviation (e.g., "Mon", "Tue")
 */
export function formatDayAbbrev(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}
