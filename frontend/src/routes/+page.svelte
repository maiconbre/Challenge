<script lang="ts">
    import { onMount, tick } from "svelte";
    import type { CalendarEvent } from "$lib/types";
    import { fetchEvents } from "$lib/api";
    import {
        closeCreateModal,
        selectedDateStore,
        setSelectedDate,
        activeColorsStore,
        myCalendarsStore,
    } from "$lib/stores";
    import {
        getTodayISO,
        getMonthLabel,
        addWeeks,
        subWeeks,
        addMonths,
        subMonths,
    } from "$lib/utils/dateUtils";
    import {
        openCreateForDay,
        openEventDetails,
        handleSaveEvent,
        handleDeleteConfirm,
        handleDropConfirm,
        type DropEvent,
    } from "$lib/eventHandlers";

    import CalendarHeader from "$lib/components/CalendarHeader.svelte";
    import WeekView from "$lib/components/WeekView.svelte";
    import MonthView from "$lib/components/MonthView.svelte";
    import EventModal from "$lib/components/EventModal.svelte";
    import DeleteConfirmModal from "$lib/components/DeleteConfirmModal.svelte";
    import ConfirmDropModal from "$lib/components/ConfirmDropModal.svelte";
    import ToastContainer from "$lib/components/ToastContainer.svelte";

    // ─── State ────────────────────────────────────────────────────

    let events: CalendarEvent[] = [];
    let currentDate = new Date();
    let viewMode: "week" | "month" = "week";
    let loading = true;
    let weekViewComponent: WeekView;

    // Event colors
    const eventColors = [
        "#8ab4f8",
        "#81c995",
        "#fdd663",
        "#f28b82",
        "#c58af9",
        "#78d9ec",
        "#fcad70",
    ];

    // Filter events by active calendar colors
    $: filteredEvents = events.filter((e) => {
        const color = e.color || "#8ab4f8";
        return $activeColorsStore.has(color);
    });

    $: console.log("[+page] events updated:", events.length);
    $: console.log("[+page] filteredEvents updated:", filteredEvents.length);

    // Modal state
    let editMode = false;
    let editingEventId: string | null = null;
    let isSaving = false;

    // Drop confirmation state
    let showConfirmModal = false;
    let pendingDropEvent: DropEvent | null = null;

    // Delete confirmation state
    let showDeleteModal = false;
    let eventToDelete: CalendarEvent | null = null;

    // Header label
    $: headerLabel = getMonthLabel(currentDate);

    // Store subscription — navigate when sidebar date is clicked
    $: selectedDate = $selectedDateStore;
    $: if (selectedDate) {
        currentDate = new Date(`${selectedDate}T00:00:00`);
    }

    // ─── Navigation ───────────────────────────────────────────────

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

    async function goToday(): Promise<void> {
        currentDate = new Date();
        setSelectedDate(getTodayISO());
        if (viewMode === "week") {
            await tick();
            weekViewComponent?.scrollToNow();
        }
    }

    function handleViewChange(event: CustomEvent<"week" | "month">) {
        viewMode = event.detail;
    }

    // ─── Week View Handlers ───────────────────────────────────────

    function handleWeekDayClick(
        event: CustomEvent<{ dateStr: string; hour: number; minute: number }>,
    ) {
        openCreateForDay(
            event.detail.dateStr,
            event.detail.hour,
            event.detail.minute,
        );
    }

    function handleWeekEdge(event: CustomEvent<{ direction: -1 | 1 }>) {
        if (event.detail.direction === 1) {
            currentDate = addWeeks(currentDate, 1);
        } else {
            currentDate = subWeeks(currentDate, 1);
        }
    }

    // ─── Month View Handlers ──────────────────────────────────────

    function handleMonthDayClick(event: CustomEvent<string>) {
        setSelectedDate(event.detail);
        currentDate = new Date(event.detail + "T00:00:00");
        viewMode = "week";
    }

    // ─── Event Click ──────────────────────────────────────────────

    function handleEventClick(event: CustomEvent<CalendarEvent>): void {
        const result = openEventDetails(event.detail);
        editMode = result.editMode;
        editingEventId = result.editingEventId;
    }

    // ─── Drag & Drop ──────────────────────────────────────────────

    function handleEventDrop(
        event: CustomEvent<{ event: CalendarEvent; newStart: Date }>,
    ) {
        const { event: calendarEvent, newStart } = event.detail;
        const originalStart = new Date(calendarEvent.start);
        const originalEnd = new Date(calendarEvent.end);
        const durationMs = originalEnd.getTime() - originalStart.getTime();
        const newEnd = new Date(newStart.getTime() + durationMs);

        pendingDropEvent = { event: calendarEvent, newStart, newEnd };
        showConfirmModal = true;
    }

    async function confirmDrop() {
        if (!pendingDropEvent) return;
        events = await handleDropConfirm(events, pendingDropEvent);
        showConfirmModal = false;
        pendingDropEvent = null;
    }

    function cancelDrop() {
        showConfirmModal = false;
        pendingDropEvent = null;
    }

    // ─── Save ─────────────────────────────────────────────────────

    async function handleSave(): Promise<void> {
        isSaving = true;
        try {
            const result = await handleSaveEvent(
                events,
                editMode,
                editingEventId,
            );
            console.log(
                "[+page] handleSaveEvent result count:",
                result.events.length,
            );
            events = result.events;
            if (result.closeModal) {
                closeModal();
            }
        } finally {
            isSaving = false;
        }
    }

    function closeModal() {
        editMode = false;
        editingEventId = null;
        closeCreateModal();
    }

    // ─── Delete ───────────────────────────────────────────────────

    function handleDeleteRequest() {
        if (!editingEventId) return;
        const e = events.find((ev) => ev.id === editingEventId);
        if (!e) return;

        eventToDelete = e;
        showDeleteModal = true;
    }

    async function handleConfirmDelete(deleteSeries: boolean) {
        if (!eventToDelete) return;

        showDeleteModal = false;
        closeModal();

        events = await handleDeleteConfirm(events, eventToDelete, deleteSeries);
        eventToDelete = null;
    }

    // ─── Init ─────────────────────────────────────────────────────

    onMount(async () => {
        // Self-healing: ensure store has all event colors
        myCalendarsStore.update((current) => {
            const currentColors = new Set(current.map((c) => c.color));
            const missing = eventColors.filter((c) => !currentColors.has(c));

            if (missing.length > 0) {
                const newItems = missing.map((color) => {
                    let label = "Calendar";
                    if (color === "#c58af9") label = "Purple";
                    if (color === "#78d9ec") label = "Cyan";
                    if (color === "#fcad70") label = "Orange";
                    return { label, color, checked: true };
                });
                return [...current, ...newItems];
            }
            return current;
        });

        events = await fetchEvents();
        if (!$selectedDateStore) {
            setSelectedDate(getTodayISO());
        }
        loading = false;
    });
</script>

<!-- Main Layout -->
<div
    class="flex flex-col h-full overflow-hidden"
    style="background-color: var(--gcal-bg);"
>
    <CalendarHeader
        {headerLabel}
        {viewMode}
        on:prev={prevPeriod}
        on:next={nextPeriod}
        on:today={goToday}
        on:viewChange={handleViewChange}
    />

    {#if loading}
        <div class="flex-1 flex items-center justify-center">
            <div class="flex flex-col items-center gap-3">
                <div
                    class="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
                    style="border-color: var(--gcal-blue); border-top-color: transparent;"
                ></div>
                <span class="text-sm" style="color: var(--gcal-text-muted);"
                    >Loading...</span
                >
            </div>
        </div>
    {:else}
        <div class="flex-1 overflow-hidden relative flex flex-col">
            {#if viewMode === "week"}
                <WeekView
                    bind:this={weekViewComponent}
                    events={filteredEvents}
                    {currentDate}
                    on:eventDrop={handleEventDrop}
                    on:eventClick={handleEventClick}
                    on:dayClick={handleWeekDayClick}
                    on:weekEdge={handleWeekEdge}
                />
            {:else}
                <MonthView
                    events={filteredEvents}
                    {currentDate}
                    on:eventClick={handleEventClick}
                    on:dayClick={handleMonthDayClick}
                />
            {/if}
        </div>
    {/if}
</div>

<EventModal
    bind:editMode
    bind:editingEventId
    {eventColors}
    {isSaving}
    on:save={handleSave}
    on:delete={handleDeleteRequest}
/>

<DeleteConfirmModal
    isOpen={showDeleteModal}
    isRecurring={!!(
        eventToDelete?.recurrence && eventToDelete.recurrence !== "none"
    ) || !!eventToDelete?.groupId}
    onClose={() => {
        showDeleteModal = false;
        eventToDelete = null;
    }}
    onConfirm={handleConfirmDelete}
/>

<ConfirmDropModal
    isOpen={showConfirmModal}
    pendingEvent={pendingDropEvent}
    onConfirm={confirmDrop}
    onCancel={cancelDrop}
/>

<ToastContainer />

<style>
    :global(html, body) {
        height: 100%;
    }
</style>
