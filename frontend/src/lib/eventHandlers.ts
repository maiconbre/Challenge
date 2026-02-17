import type { CalendarEvent, NewCalendarEvent } from "./types";
import {
  fetchEvents,
  createEvent,
  deleteEvent,
  deleteEventSeries,
  updateEvent,
  ApiError,
} from "./api";
import {
  createModalStore,
  openCreateModal,
  closeCreateModal,
  showToast,
  setSelectedDate,
} from "./stores";
import {
  formatDateISO,
  getTodayISO,
  getDatePart,
  getTimePart,
} from "./utils/dateUtils";
import { get } from "svelte/store";

// ─── Types ────────────────────────────────────────────────────

export interface DropEvent {
  event: CalendarEvent;
  newStart: Date;
  newEnd: Date;
}

export interface EventState {
  events: CalendarEvent[];
  editMode: boolean;
  editingEventId: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────

export function formatDateTimeLocal(date: Date): string {
  const dateStr = formatDateISO(date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${dateStr}T${hours}:${minutes}:00`;
}

export function openCreateForDay(
  dateStr?: string,
  hour?: number,
  minute?: number,
): void {
  const d = dateStr || getTodayISO();
  const h = hour !== undefined ? String(hour).padStart(2, "0") : "09";
  const m = minute !== undefined ? String(minute).padStart(2, "0") : "00";
  let endH = hour !== undefined ? hour : 9;
  let endM = (minute || 0) + 30;
  if (endM >= 60) {
    endM = 0;
    endH = endH + 1;
  }
  const eh = String(endH).padStart(2, "0");
  const em = String(endM).padStart(2, "0");
  openCreateModal("", d, h, eh, m, em);
}

const defaultEventColor = "#8ab4f8";

export function openEventDetails(event: CalendarEvent): {
  editMode: true;
  editingEventId: string;
} {
  createModalStore.set({
    isOpen: true,
    title: event.title,
    startDate: getDatePart(event.start),
    endDate: getDatePart(event.end),
    startTime: getTimePart(event.start),
    endTime: getTimePart(event.end),
    color: event.color || defaultEventColor,
    location: event.location || "",
    description: event.description || "",
    recurrence: event.recurrence || "none",
    notification: event.notification ?? 30,
  });
  return { editMode: true, editingEventId: event.id };
}

// ─── CRUD Operations ──────────────────────────────────────────

export async function handleSaveEvent(
  events: CalendarEvent[],
  editMode: boolean,
  editingEventId: string | null,
): Promise<{ events: CalendarEvent[]; closeModal: boolean }> {
  const modal = get(createModalStore);

  if (
    !modal.title.trim() ||
    !modal.startDate ||
    !modal.startTime ||
    !modal.endTime
  ) {
    showToast("Please fill all fields", "warning");
    return { events, closeModal: false };
  }

  const endDate = modal.endDate || modal.startDate;
  const payload: NewCalendarEvent = {
    title: modal.title.trim(),
    start: `${modal.startDate}T${modal.startTime}:00`,
    end: `${endDate}T${modal.endTime}:00`,
    color: modal.color,
    location: modal.location.trim(),
    description: modal.description.trim(),
    recurrence: modal.recurrence,
    notification: modal.notification,
  };

  if (editMode && editingEventId) {
    return await handleUpdate(events, editingEventId, payload);
  } else {
    return await handleCreate(events, payload, modal.startDate);
  }
}

async function handleUpdate(
  events: CalendarEvent[],
  editingEventId: string,
  payload: NewCalendarEvent,
): Promise<{ events: CalendarEvent[]; closeModal: boolean }> {
  const previous = events.find((e) => e.id === editingEventId);
  if (!previous) return { events, closeModal: false };

  const updated: CalendarEvent = { ...previous, ...payload };
  let newEvents = events.map((e) => (e.id === editingEventId ? updated : e));

  try {
    await updateEvent(updated);
    showToast("Event updated successfully!", "success", 200);

    if (updated.recurrence && updated.recurrence !== "none") {
      const allEvents = await fetchEvents();
      newEvents = allEvents;
    }
  } catch (error) {
    newEvents = events.map((e) => (e.id === editingEventId ? previous : e));
    const msg =
      error instanceof ApiError ? error.userMessage : "Error updating event";
    const status = error instanceof ApiError ? error.status : 500;
    showToast(msg, "error", status);
  }

  return { events: newEvents, closeModal: true };
}

async function handleCreate(
  events: CalendarEvent[],
  payload: NewCalendarEvent,
  startDate: string,
): Promise<{ events: CalendarEvent[]; closeModal: boolean }> {
  const tempId = `temp-${Date.now()}`;
  const tempEvent: CalendarEvent = { ...payload, id: tempId };

  let newEvents = [...events, tempEvent];
  setSelectedDate(startDate);

  try {
    const created = await createEvent(payload);

    if (created) {
      newEvents = newEvents.map((e) => (e.id === tempId ? created : e));
      showToast("Event created successfully!", "success", 201);

      if (payload.recurrence && payload.recurrence !== "none") {
        const allEvents = await fetchEvents();
        newEvents = allEvents;
      }
    } else {
      newEvents = newEvents.filter((e) => e.id !== tempId);
      showToast("Error creating event", "error", 500);
    }
  } catch (error) {
    newEvents = newEvents.filter((e) => e.id !== tempId);
    const msg =
      error instanceof ApiError ? error.userMessage : "Error creating event";
    const status = error instanceof ApiError ? error.status : 500;
    showToast(msg, "error", status);
  }

  return { events: newEvents, closeModal: true };
}

export async function handleDeleteSingle(
  events: CalendarEvent[],
  id: string,
): Promise<CalendarEvent[]> {
  if (!id) return events;
  const previousEvents = [...events];
  let newEvents = events.filter((e) => e.id !== id);

  try {
    await deleteEvent(id);
    showToast("Event deleted successfully", "success", 200);
  } catch (error) {
    newEvents = previousEvents;
    showToast("Error deleting event", "error", 500);
  }

  return newEvents;
}

export async function handleDeleteConfirm(
  events: CalendarEvent[],
  eventToDelete: CalendarEvent,
  deleteSeries: boolean,
): Promise<CalendarEvent[]> {
  const previousEvents = [...events];

  if (deleteSeries && eventToDelete.groupId) {
    let newEvents = events.filter((e) => e.groupId !== eventToDelete.groupId);

    try {
      await deleteEventSeries(eventToDelete.groupId);
      showToast("Series deleted successfully", "success", 200);
    } catch (error) {
      newEvents = previousEvents;
      showToast("Error deleting series", "error", 500);
    }

    return newEvents;
  } else {
    return await handleDeleteSingle(events, eventToDelete.id);
  }
}

export async function handleDropConfirm(
  events: CalendarEvent[],
  pendingDropEvent: DropEvent,
): Promise<CalendarEvent[]> {
  const { event: calendarEvent, newStart, newEnd } = pendingDropEvent;

  const updated: CalendarEvent = {
    ...calendarEvent,
    start: formatDateTimeLocal(newStart),
    end: formatDateTimeLocal(newEnd),
  };

  let newEvents = events.map((e) => (e.id === calendarEvent.id ? updated : e));

  try {
    await updateEvent(updated);
    showToast("Event updated successfully!", "success", 200);
  } catch (error) {
    newEvents = events.map((e) =>
      e.id === calendarEvent.id ? calendarEvent : e,
    );
    showToast("Error moving event", "error", 500);
  }

  return newEvents;
}
