import { writable, derived } from "svelte/store";

// --- Sidebar Store ---
export const sidebarOpenStore = writable<boolean>(true);

export function toggleSidebar() {
  sidebarOpenStore.update((v) => !v);
}

// --- Calendar Categories Store ---
export interface CalendarCategory {
  label: string;
  color: string;
  checked: boolean;
}

export const myCalendarsStore = writable<CalendarCategory[]>([
  { label: "Personal", color: "#8ab4f8", checked: true },
  { label: "Work", color: "#81c995", checked: true },
  { label: "Birthdays", color: "#f28b82", checked: true },
  { label: "Tasks", color: "#fdd663", checked: true },
  { label: "Purple", color: "#c58af9", checked: true },
  { label: "Cyan", color: "#78d9ec", checked: true },
  { label: "Orange", color: "#fcad70", checked: true },
]);

export const otherCalendarsStore = writable<CalendarCategory[]>([
  { label: "Holidays", color: "#a8dab5", checked: true },
]);

export const activeColorsStore = derived(
  [myCalendarsStore, otherCalendarsStore],
  ([$my, $other]) => {
    const active = new Set<string>();
    for (const c of $my) if (c.checked) active.add(c.color);
    for (const c of $other) if (c.checked) active.add(c.color);
    return active;
  },
);

export function toggleMyCalendar(index: number) {
  myCalendarsStore.update((list) => {
    const copy = [...list];
    copy[index] = { ...copy[index], checked: !copy[index].checked };
    return copy;
  });
}

export function toggleOtherCalendar(index: number) {
  otherCalendarsStore.update((list) => {
    const copy = [...list];
    copy[index] = { ...copy[index], checked: !copy[index].checked };
    return copy;
  });
}

// --- Sidebar Section Collapse ---
export const myCalendarsOpenStore = writable<boolean>(true);
export const otherCalendarsOpenStore = writable<boolean>(true);

// --- Modal Store ---
export interface ModalState {
  isOpen: boolean;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  color: string;
  location: string;
  description: string;
  recurrence: "none" | "daily" | "weekly" | "monthly" | "yearly";
  notification: number;
}

const defaultModal: ModalState = {
  isOpen: false,
  title: "",
  startDate: "",
  endDate: "",
  startTime: "09:00",
  endTime: "10:00",
  color: "#8ab4f8",
  location: "",
  description: "",
  recurrence: "none",
  notification: 30,
};

export const createModalStore = writable<ModalState>({ ...defaultModal });

export function openCreateModal(
  title: string = "",
  date: string = "",
  startHour: string = "09",
  endHour: string = "10",
  startMinute: string = "00",
  endMinute: string = "00",
) {
  const d = date || new Date().toISOString().split("T")[0];
  const startTime = `${startHour.padStart(2, "0")}:${startMinute.padStart(2, "0")}`;
  const endTime = `${endHour.padStart(2, "0")}:${endMinute.padStart(2, "0")}`;

  createModalStore.set({
    ...defaultModal,
    isOpen: true,
    title: title,
    startDate: d,
    endDate: d,
    startTime: startTime,
    endTime: endTime,
  });
}

export function closeCreateModal() {
  createModalStore.set({ ...defaultModal });
}

// --- Date Store ---
export const selectedDateStore = writable<string>(
  new Date().toISOString().split("T")[0],
);

export function setSelectedDate(date: string) {
  selectedDateStore.set(date);
}

// --- Toast Store ---
export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  status?: number;
}

export const toastStore = writable<Toast[]>([]);

export function showToast(
  message: string,
  type: "success" | "error" | "info" | "warning" = "info",
  status?: number,
  duration: number = 3000,
) {
  const id = Math.random().toString(36).substring(7);
  const toast: Toast = { id, message, type, status };

  toastStore.update((toasts) => [...toasts, toast]);

  setTimeout(() => {
    toastStore.update((toasts) => toasts.filter((t) => t.id !== id));
  }, duration);

  return id;
}

export function removeToast(id: string) {
  toastStore.update((toasts) => toasts.filter((t) => t.id !== id));
}
