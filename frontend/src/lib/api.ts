import type { CalendarEvent, NewCalendarEvent } from "./types";

const API_BASE = import.meta.env.PUBLIC_API_URL || "/api/events";

/**
 * Custom API error with status code and user-friendly message
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly userMessage: string,
    originalMessage?: string,
  ) {
    super(originalMessage || userMessage);
    this.name = "ApiError";
  }
}

/**
 * Maps HTTP status codes to user-friendly error messages
 */
function getErrorMessage(status: number, operation: string): string {
  switch (status) {
    case 400:
      return `Invalid ${operation} data. Please check your input.`;
    case 404:
      return `Event not found. It may have been deleted.`;
    case 409:
      return `Conflict: the event was modified by someone else.`;
    case 500:
      return `Server error while ${operation}. Please try again.`;
    case 503:
      return `Service unavailable. Please try again later.`;
    default:
      return `Error ${operation} (HTTP ${status}).`;
  }
}

/**
 * Normalizes dates returned from the .NET backend
 * Removes the 'Z' (UTC) suffix to keep as compatible ISO string
 */
function normalizeEvent(event: Record<string, unknown>): CalendarEvent {
  return {
    id: String(event.id ?? ""),
    title: String(event.title ?? ""),
    start: String(event.start ?? "").replace("Z", ""),
    end: String(event.end ?? "").replace("Z", ""),
    color: event.color ? String(event.color) : undefined,
    location: event.location ? String(event.location) : undefined,
    description: event.description ? String(event.description) : undefined,
    recurrence: event.recurrence
      ? (String(event.recurrence) as CalendarEvent["recurrence"])
      : undefined,
    notification:
      typeof event.notification === "number" ? event.notification : undefined,
    groupId: event.groupId ? String(event.groupId) : undefined,
  };
}

export async function fetchEvents(): Promise<CalendarEvent[]> {
  try {
    const res = await fetch(API_BASE, { cache: "no-store" });
    if (!res.ok) {
      throw new ApiError(
        res.status,
        getErrorMessage(res.status, "loading events"),
      );
    }
    const data = await res.json();
    return Array.isArray(data) ? data.map(normalizeEvent) : [];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("[API] Error fetching events:", error);
    return [];
  }
}

export async function createEvent(
  event: NewCalendarEvent,
): Promise<CalendarEvent | null> {
  try {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    if (!res.ok) {
      throw new ApiError(
        res.status,
        getErrorMessage(res.status, "creating event"),
      );
    }

    const data = await res.json();
    return normalizeEvent(data);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("[API] Error creating event:", error);
    return null;
  }
}

export async function deleteEvent(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
    if (!res.ok) {
      throw new ApiError(
        res.status,
        getErrorMessage(res.status, "deleting event"),
      );
    }
    return true;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("[API] Error deleting event:", error);
    return false;
  }
}

export async function deleteEventSeries(groupId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/series/${groupId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new ApiError(
        res.status,
        getErrorMessage(res.status, "deleting series"),
      );
    }
    return true;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("[API] Error deleting series:", error);
    return false;
  }
}

export async function updateEvent(event: CalendarEvent): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/${event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      throw new ApiError(
        res.status,
        getErrorMessage(res.status, "updating event"),
      );
    }
    return true;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("[API] Error updating event:", error);
    return false;
  }
}
