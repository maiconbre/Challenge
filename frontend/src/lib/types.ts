export interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    color?: string;
    location?: string;
}

export type NewCalendarEvent = Omit<CalendarEvent, 'id'>;
