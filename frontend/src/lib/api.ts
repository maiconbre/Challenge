import type { CalendarEvent, NewCalendarEvent } from './types';

const API_BASE = import.meta.env.PUBLIC_API_URL || '/api/events';

/**
 * Normaliza datas retornadas do backend .NET
 * Remove o sufixo 'Z' (UTC) para manter como ISO string compatível
 */
function normalizeEvent(event: any): CalendarEvent {
    return {
        id: event.id,
        title: event.title,
        start: event.start?.replace('Z', '') || event.start,
        end: event.end?.replace('Z', '') || event.end,
        color: event.color,
        location: event.location
    };
}

export async function fetchEvents(): Promise<CalendarEvent[]> {
    try {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return Array.isArray(data) ? data.map(normalizeEvent) : [];
    } catch (error) {
        console.error('[API] Erro ao buscar eventos:', error);
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
        console.error('[API] Erro ao criar evento:', error);
        return null;
    }
}

export async function deleteEvent(id: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
        return res.ok;
    } catch (error) {
        console.error('[API] Erro ao deletar evento:', error);
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
        console.error('[API] Erro ao atualizar evento:', error);
        return false;
    }
}
