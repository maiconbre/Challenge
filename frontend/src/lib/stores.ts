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

export function openCreateModal(title: string = '', date: string = '') {
    const d = date || new Date().toISOString().split('T')[0];
    createModalStore.set({
        isOpen: true,
        title: title,
        startDate: d,
        endDate: d,
        startTime: '09:00',
        endTime: '10:00'
    });
}

export function closeCreateModal() {
    createModalStore.update(s => ({ ...s, isOpen: false }));
}
