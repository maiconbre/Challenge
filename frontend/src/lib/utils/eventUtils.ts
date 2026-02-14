/**
 * Utilitários para eventos
 */
import type { CalendarEvent } from '../types';

/**
 * Filtra eventos por data
 */
export function getEventsForDay(events: CalendarEvent[], dateStr: string): CalendarEvent[] {
    if (!dateStr) return [];
    return events.filter((e) => {
        const eventDate = e.start.split('T')[0];
        return eventDate === dateStr;
    });
}

/**
 * Filtra eventos por semana (domingo a sábado)
 */
export function getEventsForWeek(events: CalendarEvent[], weekStart: string): CalendarEvent[] {
    if (!weekStart) return [];
    
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    return events.filter((e) => {
        const eventDate = new Date(e.start);
        return eventDate >= startDate && eventDate < endDate;
    });
}

/**
 * Encontra um evento pelo ID
 */
export function findEventById(events: CalendarEvent[], id: string): CalendarEvent | undefined {
    return events.find((e) => e.id === id);
}

/**
 * Remove um evento pela ID
 */
export function removeEventById(events: CalendarEvent[], id: string): CalendarEvent[] {
    return events.filter((e) => e.id !== id);
}

/**
 * Atualiza um evento na lista
 */
export function updateEventInList(
    events: CalendarEvent[],
    id: string,
    updated: Partial<CalendarEvent>,
): CalendarEvent[] {
    return events.map((e) => (e.id === id ? { ...e, ...updated } : e));
}

/**
 * Adiciona um evento à lista (sem duplicatas)
 */
export function addEventToList(events: CalendarEvent[], event: CalendarEvent): CalendarEvent[] {
    // Evita adicionar duplicata se o ID já existe
    if (findEventById(events, event.id)) {
        return updateEventInList(events, event.id, event);
    }
    return [...events, event];
}

/**
 * Valida um evento
 */
export function isValidEvent(event: any): event is CalendarEvent {
    return (
        event &&
        typeof event.id === 'string' &&
        typeof event.title === 'string' &&
        typeof event.start === 'string' &&
        typeof event.end === 'string' &&
        event.id.length > 0 &&
        event.title.trim().length > 0
    );
}

/**
 * Validação de datas de evento
 */
export function validateEventDates(start: string, end: string): boolean {
    try {
        const startDate = new Date(start);
        const endDate = new Date(end);
        return !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate > startDate;
    } catch {
        return false;
    }
}
