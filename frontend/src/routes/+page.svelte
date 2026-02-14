<script lang="ts">
    import { onMount } from "svelte";
    import type { CalendarEvent } from "$lib/types";
    import {
        fetchEvents,
        createEvent,
        deleteEvent,
        updateEvent,
    } from "$lib/api";
    import {
        createModalStore,
        openCreateModal,
        closeCreateModal,
        toastStore,
        showToast,
        selectedDateStore,
        setSelectedDate,
    } from "$lib/stores";
    import {
        formatDateISO,
        getTodayISO,
        getMonthLabel,
        getDatePart,
        getTimePart,
        addWeeks,
        subWeeks,
        addMonths,
        subMonths,
    } from "$lib/utils/dateUtils";

    import WeekView from "$lib/components/WeekView.svelte";
    import MonthView from "$lib/components/MonthView.svelte";

    let events: CalendarEvent[] = [];
    let currentDate = new Date();
    let viewMode: "week" | "month" = "week";
    let loading = true;
    let eventsVersion = 0;
    const eventColors = [
        "#3b82f6",
        "#10b981",
        "#f59e0b",
        "#ef4444",
        "#8b5cf6",
        "#14b8a6",
        "#f97316",
    ];
    const defaultEventColor = "#3b82f6";

    // Modal state
    let showEventModal = false;
    let selectedEvent: CalendarEvent | null = null;
    let selectedEventColor = defaultEventColor;
    let editStartDate = "";
    let editStartTime = "";
    let editEndDate = "";
    let editEndTime = "";
    let editLocation = "";

    // Confirmation Modal State
    let showConfirmModal = false;
    let pendingDropEvent: {
        event: CalendarEvent;
        newStart: Date;
        newEnd: Date;
    } | null = null;

    // Header label
    $: headerLabel = getMonthLabel(currentDate);

    // Store subscription
    $: selectedDate = $selectedDateStore;
    $: if (selectedDate) {
        currentDate = new Date(`${selectedDate}T00:00:00`);
    }

    // Navigation
    function prevPeriod(): void {
        if (viewMode === "week") {
            currentDate = subWeeks(currentDate, 1);
        } else {
            currentDate = subMonths(currentDate, 1);
        }
    }

    function nextPeriod(): void {
        if (viewMode === "week") {
            currentDate = addWeeks(currentDate, 1);
        } else {
            currentDate = addMonths(currentDate, 1);
        }
    }

    function goToday(): void {
        const today = new Date();
        currentDate = today;
        setSelectedDate(getTodayISO());
    }

    function formatDateTimeLocal(date: Date): string {
        const dateStr = formatDateISO(date);
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${dateStr}T${hours}:${minutes}:00`;
    }

    // Drag & drop: receive event drop from WeekView
    function handleEventDrop(
        event: CustomEvent<{ event: CalendarEvent; newStart: Date }>,
    ) {
        const { event: calendarEvent, newStart } = event.detail;

        const originalStart = new Date(calendarEvent.start);
        const originalEnd = new Date(calendarEvent.end);
        const durationMs = originalEnd.getTime() - originalStart.getTime();

        const newEnd = new Date(newStart.getTime() + durationMs);

        pendingDropEvent = {
            event: calendarEvent,
            newStart,
            newEnd,
        };
        showConfirmModal = true;
    }

    async function confirmDrop() {
        if (!pendingDropEvent) return;

        const { event: calendarEvent, newStart, newEnd } = pendingDropEvent;

        const updated = {
            ...calendarEvent,
            start: formatDateTimeLocal(newStart),
            end: formatDateTimeLocal(newEnd),
        };

        // Optimistic update
        events = events.map((e) => (e.id === calendarEvent.id ? updated : e));
        eventsVersion += 1;

        // Reset modal state immediately
        showConfirmModal = false;
        pendingDropEvent = null;

        try {
            // API Call
            await updateEvent(updated);

            showToast("Event updated successfully!", "success", 200);
        } catch (error) {
            // Revert
            events = events.map((e) =>
                e.id === calendarEvent.id ? calendarEvent : e,
            );
            eventsVersion += 1;
            showToast("Error moving event", "error", 500);
        }
    }

    function cancelDrop() {
        showConfirmModal = false;
        pendingDropEvent = null;
    }

    // Modal handlers
    function openCreateForDay(dateStr?: string, hour?: number): void {
        const d = dateStr || getTodayISO();
        const h = hour !== undefined ? String(hour).padStart(2, "0") : "09";
        const eh = (hour !== undefined ? hour + 1 : 10).toString();
        openCreateModal("", d, h, eh);
    }

    function openEventDetails(event: CalendarEvent): void {
        selectedEvent = event;
        selectedEventColor = event.color || defaultEventColor;
        editStartDate = getDatePart(event.start);
        editStartTime = getTimePart(event.start);
        editEndDate = getDatePart(event.end);
        editEndTime = getTimePart(event.end);
        editLocation = event.location || "";
        showEventModal = true;
    }

    // Handle day click from views
    function handleDayClick(dateStr: string) {
        setSelectedDate(dateStr);
        currentDate = new Date(dateStr + "T00:00:00");
        viewMode = "week";
    }

    // Wrapper for MonthView dispatch
    function handleMonthDayClick(event: CustomEvent<string>) {
        handleDayClick(event.detail);
    }

    // Wrapper for WeekView dispatch
    function handleWeekDayClick(
        event: CustomEvent<{ dateStr: string; hour: number }>,
    ) {
        openCreateForDay(event.detail.dateStr, event.detail.hour);
    }

    function handleWeekEdge(event: CustomEvent<{ direction: -1 | 1 }>) {
        if (event.detail.direction === 1) {
            currentDate = addWeeks(currentDate, 1);
        } else {
            currentDate = subWeeks(currentDate, 1);
        }
    }

    async function handleCreate(): Promise<void> {
        const {
            title,
            startDate,
            startTime,
            endDate,
            endTime,
            color,
            location,
        } = $createModalStore;

        if (!title.trim() || !startDate || !endDate || !startTime || !endTime) {
            showToast("Please fill all fields", "warning");
            return;
        }

        try {
            const created = await createEvent({
                title: title.trim(),
                start: `${startDate}T${startTime}:00`,
                end: `${endDate}T${endTime}:00`,
                color,
                location: location.trim(),
            });

            if (created) {
                events = [...events, created];

                setSelectedDate(startDate);
                currentDate = new Date(startDate + "T00:00:00");

                showToast(
                    `Event "${created.title}" created successfully!`,
                    "success",
                    200,
                    4000,
                );

                closeCreateModal();
            } else {
                showToast(
                    "Error creating event - empty server response",
                    "error",
                    500,
                );
            }
        } catch (error) {
            console.error("[handleCreate]", error);
            showToast("Error creating event", "error", 500);
        }
    }

    async function handleDelete(): Promise<void> {
        if (!selectedEvent) return;

        if (!confirm(`Delete event "${selectedEvent.title}"?`)) return;

        const previousEvents = events;
        const deletingEvent = selectedEvent;
        events = events.filter((e) => e.id !== deletingEvent.id);
        eventsVersion += 1;
        showEventModal = false;
        selectedEvent = null;

        const success = await deleteEvent(deletingEvent.id);
        if (success) {
            showToast(
                `Event "${deletingEvent.title}" deleted successfully!`,
                "success",
                200,
                3000,
            );
        } else {
            events = previousEvents;
            eventsVersion += 1;
            showToast("Error deleting event", "error", 500);
        }
    }

    async function handleEventUpdate(): Promise<void> {
        if (!selectedEvent) return;
        if (!editStartDate || !editStartTime || !editEndDate || !editEndTime) {
            showToast("Fill date and time", "warning");
            return;
        }
        const updatedStart = `${editStartDate}T${editStartTime}:00`;
        const updatedEnd = `${editEndDate}T${editEndTime}:00`;
        const startDate = new Date(updatedStart);
        const endDate = new Date(updatedEnd);
        if (
            Number.isNaN(startDate.getTime()) ||
            Number.isNaN(endDate.getTime()) ||
            endDate <= startDate
        ) {
            showToast("Invalid period", "warning");
            return;
        }
        const previous = selectedEvent;
        const updated = {
            ...selectedEvent,
            start: updatedStart,
            end: updatedEnd,
            color: selectedEventColor,
            location: editLocation.trim(),
        };
        events = events.map((e) => (e.id === updated.id ? updated : e));
        eventsVersion += 1;
        showEventModal = false;
        selectedEvent = null;

        try {
            await updateEvent(updated);
            showToast("Event updated successfully!", "success", 200);
        } catch (error) {
            events = events.map((e) => (e.id === previous.id ? previous : e));
            eventsVersion += 1;
            showToast("Error updating event", "error", 500);
        }
    }

    function handleEventClick(event: CustomEvent<CalendarEvent>): void {
        openEventDetails(event.detail);
    }

    onMount(async () => {
        events = await fetchEvents();
        // If no date selected, select today?
        if (!$selectedDateStore) {
            setSelectedDate(getTodayISO());
        }
        loading = false;
    });
</script>

<!-- Main Layout -->
<div class="flex flex-col h-screen bg-base-100">
    <!-- Header -->
    <header
        class="flex-none flex items-center justify-between px-6 py-4 border-b border-base-200"
    >
        <div class="flex items-center gap-4">
            <div class="flex items-center gap-4">
                <button
                    class="btn btn-sm btn-outline px-4"
                    on:click={goToday}
                    title="Back to today"
                >
                    Today
                </button>

                <!-- Navigation -->
                <div class="flex items-center gap-1">
                    <button
                        class="btn btn-sm btn-ghost btn-circle"
                        on:click={prevPeriod}
                        title="Previous"
                    >
                        <svg
                            class="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                    <button
                        class="btn btn-sm btn-ghost btn-circle"
                        on:click={nextPeriod}
                        title="Next"
                    >
                        <svg
                            class="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </button>
                </div>

                <!-- Display formatted selected date -->
                <h2 class="text-xl font-normal capitalize min-w-[200px]">
                    {headerLabel}
                </h2>
            </div>
        </div>

        <!-- View Switcher -->
        <div class="flex items-center gap-2">
            <!-- Removed search and settings buttons -->

            <!-- View Mode Dropdown -->
            <div class="dropdown dropdown-end z-50">
                <label
                    tabindex="0"
                    class="btn btn-outline btn-sm m-1 min-w-[100px] justify-between"
                >
                    {viewMode === "week" ? "Week" : "Month"}
                    <svg
                        class="w-4 h-4 ml-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 9l-7 7-7-7"
                        /></svg
                    >
                </label>
                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                <ul
                    tabindex="0"
                    class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 border border-base-200"
                >
                    <li>
                        <button
                            class={viewMode === "week" ? "active" : ""}
                            on:click={() => (viewMode = "week")}
                            >Week <span class="text-xs opacity-50 ml-auto"
                                >W</span
                            ></button
                        >
                    </li>
                    <li>
                        <button
                            class={viewMode === "month" ? "active" : ""}
                            on:click={() => (viewMode = "month")}
                            >Month <span class="text-xs opacity-50 ml-auto"
                                >M</span
                            ></button
                        >
                    </li>
                </ul>
            </div>
        </div>
    </header>

    {#if loading}
        <div class="flex-1 flex items-center justify-center">
            <span class="loading loading-spinner loading-lg"></span>
        </div>
    {:else}
        <!-- Main Content -->
        <div class="flex-1 overflow-hidden relative p-4 flex flex-col">
            {#key eventsVersion}
                <!-- Week View -->
                {#if viewMode === "week"}
                    <WeekView
                        {events}
                        {currentDate}
                        on:eventDrop={handleEventDrop}
                        on:eventClick={handleEventClick}
                        on:dayClick={handleWeekDayClick}
                        on:weekEdge={handleWeekEdge}
                    />

                    <!-- Month View -->
                {:else}
                    <MonthView
                        {events}
                        {currentDate}
                        on:eventClick={handleEventClick}
                        on:dayClick={handleMonthDayClick}
                    />
                {/if}
            {/key}
            <!-- Removed Floating Action Button -->
        </div>
    {/if}
</div>

<!-- Create Event Modal -->
{#if $createModalStore.isOpen}
    <div class="modal modal-open z-50">
        <div
            class="modal-box max-w-md"
            role="dialog"
            aria-labelledby="create-modal-title"
        >
            <h3 id="create-modal-title" class="text-lg font-bold mb-4">
                Create Event
            </h3>

            <div class="form-control w-full">
                <label class="label" for="event-title">
                    <span class="label-text font-semibold">Title</span>
                </label>
                <input
                    id="event-title"
                    type="text"
                    bind:value={$createModalStore.title}
                    placeholder="Ex: Meeting, Lunch..."
                    class="input input-bordered w-full"
                    autofocus
                />
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3">
                <div class="form-control">
                    <label class="label" for="event-start-date">
                        <span class="label-text text-sm">Start Date</span>
                    </label>
                    <input
                        id="event-start-date"
                        type="date"
                        bind:value={$createModalStore.startDate}
                        class="input input-bordered input-sm"
                    />
                </div>
                <div class="form-control">
                    <label class="label" for="event-start-time">
                        <span class="label-text text-sm">Start Time</span>
                    </label>
                    <input
                        id="event-start-time"
                        type="time"
                        bind:value={$createModalStore.startTime}
                        class="input input-bordered input-sm"
                    />
                </div>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-3">
                <div class="form-control">
                    <label class="label" for="event-end-date">
                        <span class="label-text text-sm">End Date</span>
                    </label>
                    <input
                        id="event-end-date"
                        type="date"
                        bind:value={$createModalStore.endDate}
                        class="input input-bordered input-sm"
                    />
                </div>
                <div class="form-control">
                    <label class="label" for="event-end-time">
                        <span class="label-text text-sm">End Time</span>
                    </label>
                    <input
                        id="event-end-time"
                        type="time"
                        bind:value={$createModalStore.endTime}
                        class="input input-bordered input-sm"
                    />
                </div>
            </div>

            <div class="mt-4">
                <div class="text-xs font-semibold text-base-content/60 mb-2">
                    Event Color
                </div>
                <div class="flex flex-wrap gap-2">
                    {#each eventColors as color}
                        <button
                            class="w-7 h-7 rounded-full border border-base-200"
                            style="background-color: {color}; box-shadow: {$createModalStore.color ===
                            color
                                ? '0 0 0 2px rgba(59, 130, 246, 0.5)'
                                : 'none'};"
                            on:click={() =>
                                ($createModalStore = {
                                    ...$createModalStore,
                                    color,
                                })}
                            aria-label="Select color"
                        />
                    {/each}
                </div>
            </div>

            <div class="form-control mt-4">
                <label class="label" for="event-location">
                    <span class="label-text text-sm">Location</span>
                </label>
                <input
                    id="event-location"
                    type="text"
                    bind:value={$createModalStore.location}
                    class="input input-bordered input-sm"
                    placeholder="Ex: Room 3"
                />
            </div>

            <div class="modal-action mt-6">
                <button class="btn btn-outline" on:click={closeCreateModal}
                    >Cancel</button
                >
                <button class="btn btn-primary" on:click={handleCreate}
                    >Create</button
                >
            </div>
        </div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="modal-backdrop" on:click={closeCreateModal} />
    </div>
{/if}

<!-- Confirmation Modal -->
{#if showConfirmModal && pendingDropEvent}
    <div class="modal modal-open z-50">
        <div class="modal-box">
            <h3 class="font-bold text-lg">Confirm Change</h3>
            <p class="py-4">
                Do you want to move the event <b
                    >"{pendingDropEvent.event.title}"</b
                >
                to:
                <br />
                <b>
                    {pendingDropEvent.newStart.toLocaleDateString("en-US")} at {pendingDropEvent.newStart.toLocaleTimeString(
                        "en-US",
                        { hour: "2-digit", minute: "2-digit" },
                    )}
                </b>
                ?
            </p>
            <div class="modal-action">
                <button class="btn btn-outline" on:click={cancelDrop}
                    >Cancel</button
                >
                <button class="btn btn-primary" on:click={confirmDrop}
                    >Confirm</button
                >
            </div>
        </div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="modal-backdrop" on:click={cancelDrop}></div>
    </div>
{/if}

<!-- Event Update Modal -->
{#if showEventModal && selectedEvent}
    <div class="modal modal-open z-50">
        <div
            class="modal-box max-w-sm"
            role="dialog"
            aria-labelledby="event-details-title"
        >
            <div class="flex justify-between items-start mb-4">
                <h3
                    id="event-details-title"
                    class="text-lg font-semibold text-base-content"
                >
                    {selectedEvent.title}
                </h3>
                <button
                    class="btn btn-sm btn-ghost btn-circle"
                    on:click={() => {
                        showEventModal = false;
                        selectedEvent = null;
                    }}
                    aria-label="Close"
                >
                    ✕
                </button>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="form-control">
                    <label class="label" for="event-edit-start-date">
                        <span class="label-text text-sm">Start Date</span>
                    </label>
                    <input
                        id="event-edit-start-date"
                        type="date"
                        bind:value={editStartDate}
                        class="input input-bordered input-sm"
                    />
                </div>
                <div class="form-control">
                    <label class="label" for="event-edit-start-time">
                        <span class="label-text text-sm">Start Time</span>
                    </label>
                    <input
                        id="event-edit-start-time"
                        type="time"
                        bind:value={editStartTime}
                        class="input input-bordered input-sm"
                    />
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="form-control">
                    <label class="label" for="event-edit-end-date">
                        <span class="label-text text-sm">End Date</span>
                    </label>
                    <input
                        id="event-edit-end-date"
                        type="date"
                        bind:value={editEndDate}
                        class="input input-bordered input-sm"
                    />
                </div>
                <div class="form-control">
                    <label class="label" for="event-edit-end-time">
                        <span class="label-text text-sm">End Time</span>
                    </label>
                    <input
                        id="event-edit-end-time"
                        type="time"
                        bind:value={editEndTime}
                        class="input input-bordered input-sm"
                    />
                </div>
            </div>

            <div class="form-control mb-4">
                <label class="label" for="event-edit-location">
                    <span class="label-text text-sm">Location</span>
                </label>
                <input
                    id="event-edit-location"
                    type="text"
                    bind:value={editLocation}
                    class="input input-bordered input-sm"
                    placeholder="Ex: Room 3"
                />
            </div>

            <div class="mb-4">
                <div class="text-xs font-semibold text-base-content/60 mb-2">
                    Event Color
                </div>
                <div class="flex flex-wrap gap-2">
                    {#each eventColors as color}
                        <button
                            class="w-7 h-7 rounded-full border border-base-200"
                            style="background-color: {color}; box-shadow: {selectedEventColor ===
                            color
                                ? '0 0 0 2px rgba(59, 130, 246, 0.5)'
                                : 'none'};"
                            on:click={() => (selectedEventColor = color)}
                            aria-label="Select color"
                        />
                    {/each}
                </div>
            </div>

            <div class="modal-action">
                <button
                    class="btn btn-outline"
                    on:click={() => {
                        showEventModal = false;
                        selectedEvent = null;
                    }}
                >
                    Cancel
                </button>
                <button
                    class="btn btn-error btn-outline"
                    on:click={handleDelete}
                >
                    Delete
                </button>
                <button class="btn btn-primary" on:click={handleEventUpdate}>
                    Update
                </button>
            </div>
        </div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
            class="modal-backdrop"
            on:click={() => {
                showEventModal = false;
                selectedEvent = null;
            }}
        />
    </div>
{/if}

<!-- Toast Container -->
<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
    {#each $toastStore as toast (toast.id)}
        <div
            class="alert {toast.type === 'success'
                ? 'alert-success'
                : toast.type === 'error'
                  ? 'alert-error'
                  : toast.type === 'warning'
                    ? 'alert-warning'
                    : 'alert-info'} shadow-lg animate-in slide-in-from-right-4"
        >
            <div class="flex items-start gap-3">
                <div>
                    {#if toast.type === "success"}
                        <svg
                            class="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    {:else if toast.type === "error"}
                        <svg
                            class="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    {:else}
                        <svg
                            class="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    {/if}
                </div>
                <div class="flex-1">
                    <p class="font-semibold">{toast.message}</p>
                    {#if toast.status}
                        <p class="text-xs opacity-75">
                            HTTP {toast.status}
                        </p>
                    {/if}
                </div>
            </div>
        </div>
    {/each}
</div>

<style>
    :global(html, body) {
        height: 100%;
    }
</style>
