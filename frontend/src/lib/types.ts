export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  color?: string;
  location?: string;
  description?: string;
  recurrence?: "none" | "daily" | "weekly" | "monthly" | "yearly";
  notification?: number; // minutes before
  groupId?: string;
}

export type NewCalendarEvent = Omit<CalendarEvent, "id">;
