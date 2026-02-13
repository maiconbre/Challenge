import type { CalendarEvent, NewCalendarEvent } from './types';

const API_BASE = import.meta.env.PUBLIC_API_URL || '/api/events';

export async function fetchEvents(): Promise<CalendarEvent[]> {
    const res = await fetch(API_BASE);
    if (!res.ok) return [];
    return res.json();
}

export async function createEvent(event: NewCalendarEvent): Promise<CalendarEvent | null> {
    const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
    });
    if (!res.ok) return null;
    return res.json();
}

export async function deleteEvent(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    return res.ok;
}
