/**
 * Utilitários para manipulação de datas
 * Padroniza o uso de datas através da aplicação
 */
import {
    format,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    startOfMonth,
    endOfMonth,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    addDays,
    subDays,
    parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
export const HOURS = Array.from({ length: 24 }, (_, i) => i);
export const MINUTES_PER_HOUR = 60;
export const PIXELS_PER_HOUR = 60;

/**
 * Formata uma data para string YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
    return format(date, 'yyyy-MM-dd');
}

/**
 * Formata hora como HH:mm
 */
export function formatTime(hour: number, minute: number = 0): string {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Obtém a data de hoje em formato ISO
 */
export function getTodayISO(): string {
    return formatDateISO(new Date());
}

/**
 * Verifica se uma data ISO é hoje
 */
export function isToday(dateStr: string): boolean {
    return dateStr === getTodayISO();
}

/**
 * Extrai apenas a data (YYYY-MM-DD) de um datetime ISO
 */
export function getDatePart(isoDateTime: string): string {
    return isoDateTime.split('T')[0];
}

/**
 * Extrai apenas a hora (HH:mm) de um datetime ISO
 */
export function getTimePart(isoDateTime: string): string {
    return isoDateTime.split('T')[1]?.substring(0, 5) || '00:00';
}

/**
 * Extrai horas e minutos de um datetime ISO
 */
export function getHourAndMinute(isoDateTime: string): { hour: number; minute: number } {
    const timePart = isoDateTime.split('T')[1] || '00:00:00';
    const [hour, minute] = timePart.split(':').map(Number);
    return { hour, minute };
}

/**
 * Calcula posição vertical em pixels para um horário
 */
export function calculatePixelTop(hour: number, minute: number = 0): number {
    return hour * PIXELS_PER_HOUR + (minute / MINUTES_PER_HOUR) * PIXELS_PER_HOUR;
}

/**
 * Calcula altura em pixels para uma duração
 */
export function calculateHeight(durationMinutes: number): number {
    return Math.max(durationMinutes, 30);
}

/**
 * Calcula duração em minutos entre dois datetimes ISO
 */
export function calculateDurationMinutes(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return (endDate.getTime() - startDate.getTime()) / (1000 * 60);
}

/**
 * Constrói calendário para um mês específico
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
    const startDate = startOfWeek(monthStart, { locale: ptBR });
    const endDate = endOfWeek(monthEnd, { locale: ptBR });

    const days = eachDayOfInterval({
        start: startDate,
        end: endDate
    });

    return days.map(day => ({
        day: day.getDate(),
        dateStr: formatDateISO(day),
        isCurrentMonth: isSameMonth(day, monthStart),
        isToday: isSameDay(day, new Date())
    }));
}

export function getWeekDays(date: Date): Date[] {
    return eachDayOfInterval({
        start: startOfWeek(date, { locale: ptBR }),
        end: endOfWeek(date, { locale: ptBR })
    });
}

/**
 * Obtém label formatado do mês (ex: "Fevereiro 2026")
 */
export function getMonthLabel(date: Date): string {
    return format(date, 'MMMM yyyy', { locale: ptBR });
}

export {
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    addDays,
    subDays,
    startOfWeek,
    endOfWeek,
    format,
    parseISO
};
