import type { CalendarEvent, NewCalendarEvent } from './types';

const API_BASE = import.meta.env.PUBLIC_API_URL || '/api/events';

/**
 * Normalizes dates returned from the .NET backend
 * Removes the 'Z' (UTC) suffix to keep as compatible ISO string
 */
function normalizeEvent(event: Record<string, unknown>): CalendarEvent {
    return {
        id: String(event.id ?? ''),
        title: String(event.title ?? ''),
        start: String(event.start ?? '').replace('Z', ''),
        end: String(event.end ?? '').replace('Z', ''),
        color: event.color ? String(event.color) : undefined,
        location: event.location ? String(event.location) : undefined
    };
}

export async function fetchEvents(): Promise<CalendarEvent[]> {
    try {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return Array.isArray(data) ? data.map(normalizeEvent) : [];
    } catch (error) {
        console.error('[API] Error fetching events:', error);
        return [];
    }
}

export async function createEvent(event: NewCalendarEvent): Promise<CalendarEvent | null> {
    try {
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        return normalizeEvent(data);
    } catch (error) {
        console.error('[API] Error creating event:', error);
        return null;
    }
}

export async function deleteEvent(id: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
        return res.ok;
    } catch (error) {
        console.error('[API] Error deleting event:', error);
        return false;
    }
}

export async function updateEvent(event: CalendarEvent): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/${event.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
        });
        return res.ok;
    } catch (error) {
        console.error('[API] Error updating event:', error);
        return false;
    }
}
