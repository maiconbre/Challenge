import { writable } from 'svelte/store';

// --- Modal Store ---
export const createModalStore = writable({
    isOpen: false,
    title: '',
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '10:00'
});

export function openCreateModal(title: string = '', date: string = '', startHour: string = '09', endHour: string = '10') {
    const d = date || new Date().toISOString().split('T')[0];
    const startTime = `${startHour.padStart(2, '0')}:00`;
    const endTime = `${endHour.padStart(2, '0')}:00`;

    createModalStore.set({
        isOpen: true,
        title: title,
        startDate: d,
        endDate: d,
        startTime: startTime,
        endTime: endTime
    });
}

export function closeCreateModal() {
    createModalStore.set({
        isOpen: false,
        title: '',
        startDate: '',
        endDate: '',
        startTime: '09:00',
        endTime: '10:00'
    });
}

// --- Date Store ---
export const selectedDateStore = writable<string>(new Date().toISOString().split('T')[0]);

export function setSelectedDate(date: string) {
    selectedDateStore.set(date);
}

// --- Toast Store ---
export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    status?: number;
}

export const toastStore = writable<Toast[]>([]);

export function showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', status?: number, duration: number = 3000) {
    const id = Math.random().toString(36).substring(7);
    const toast: Toast = { id, message, type, status };

    toastStore.update(toasts => [...toasts, toast]);

    // Auto remove after duration
    setTimeout(() => {
        toastStore.update(toasts => toasts.filter(t => t.id !== id));
    }, duration);

    return id;
}

export function removeToast(id: string) {
    toastStore.update(toasts => toasts.filter(t => t.id !== id));
}
