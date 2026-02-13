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
    } from "$lib/stores";

    let events: CalendarEvent[] = [];
    let currentDate = new Date();
    let loading = true;

    // Modal state (Event Details only, Create is in store)
    let showEventModal = false;
    let selectedEvent: CalendarEvent | null = null;

    // Reactive calendar computations

    // Reactive calendar computations
    $: currentYear = currentDate.getFullYear();
    $: currentMonth = currentDate.getMonth();
    $: monthLabel = currentDate.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
    });
    $: calendarDays = buildCalendarDays(currentYear, currentMonth);

    const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // --- Calendar Logic ---

    function buildCalendarDays(
        year: number,
        month: number,
    ): { day: number | null; dateStr: string }[] {
        const firstDayOfWeek = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const days: { day: number | null; dateStr: string }[] = [];

        // Previous month filler
        for (let i = 0; i < firstDayOfWeek; i++) {
            days.push({ day: null, dateStr: "" });
        }

        // Current month days
        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            days.push({ day: d, dateStr });
        }
        return days;
    }

    function getEventsForDay(dateStr: string): CalendarEvent[] {
        if (!dateStr) return [];
        return events.filter((e) => {
            const d = e.start.split("T")[0];
            return d === dateStr;
        });
    }

    function isToday(dateStr: string): boolean {
        if (!dateStr) return false;
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        return dateStr === todayStr;
    }

    // --- Navigation ---

    function prevMonth(): void {
        currentDate = new Date(currentYear, currentMonth - 1, 1);
    }

    function nextMonth(): void {
        currentDate = new Date(currentYear, currentMonth + 1, 1);
    }

    function goToday(): void {
        currentDate = new Date();
    }

    // --- Drag and Drop ---

    let draggedEventId: string | null = null;

    function handleDragStart(event: DragEvent, id: string) {
        if (!id) return;
        draggedEventId = id;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", id);
        }
    }

    function handleDragOver(event: DragEvent) {
        event.preventDefault(); // Necessary to allow dropping
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }
    }

    async function handleDrop(event: DragEvent, targetDateStr: string) {
        event.preventDefault();
        const id = draggedEventId;
        if (!id || !targetDateStr) return;

        const originalEvent = events.find((e) => e.id === id);
        if (!originalEvent) return;

        // Calculate new start and end times preserving duration
        const oldStart = new Date(originalEvent.start);
        const oldEnd = new Date(originalEvent.end);
        const durationMs = oldEnd.getTime() - oldStart.getTime();

        const newStart = new Date(
            `${targetDateStr}T${originalEvent.start.split("T")[1]}`,
        );
        const newEnd = new Date(newStart.getTime() + durationMs);

        // Optimistic UI update
        const updatedEvent = {
            ...originalEvent,
            start: newStart.toISOString(),
            end: newEnd.toISOString(),
        };

        // Remove old event and add updated one immediately
        events = events.map((e) => (e.id === id ? updatedEvent : e));

        // API Call
        const success = await updateEvent(id, {
            start: updatedEvent.start, // Send as ISO string, backend should parse
            end: updatedEvent.end,
        });

        if (!success) {
            // Revert if API fails
            events = events.map((e) => (e.id === id ? originalEvent : e));
            alert("Failed to move event");
        }

        draggedEventId = null;
    }

    // --- Modals & CRUD ---

    function openCreateForDay(dateStr?: string): void {
        const d = dateStr || new Date().toISOString().split("T")[0];
        // Use the store action
        openCreateModal("", d);
    }

    function openEventDetails(event: CalendarEvent): void {
        selectedEvent = event;
        showEventModal = true;
    }

    async function handleCreate(): Promise<void> {
        const { title, startDate, startTime, endDate, endTime } =
            $createModalStore;

        if (!title.trim() || !startDate || !endDate) return;
        const created = await createEvent({
            title: title.trim(),
            start: `${startDate}T${startTime}:00`,
            end: `${endDate}T${endTime}:00`,
        });
        if (created) {
            events = [...events, created];
            closeCreateModal();
        }
    }

    async function handleDelete(): Promise<void> {
        if (!selectedEvent) return;
        const ok = await deleteEvent(selectedEvent.id);
        if (ok) {
            events = events.filter((e) => e.id !== selectedEvent!.id);
            showEventModal = false;
            selectedEvent = null;
        }
    }

    onMount(async () => {
        events = await fetchEvents();
        loading = false;
    });
</script>

<!-- Main Calendar Layout -->
<!-- Header -->
<header
    class="flex-none flex items-center justify-between px-6 py-4 border-b border-base-200"
>
    <div class="flex items-center gap-4">
        <h2 class="text-2xl font-normal text-base-content">{monthLabel}</h2>
        <div class="flex items-center gap-1 bg-base-200 rounded-full p-0.5">
            <button
                class="btn btn-sm btn-circle btn-ghost"
                on:click={prevMonth}
            >
                <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 19l-7-7 7-7"
                    ></path></svg
                >
            </button>
            <button
                class="btn btn-sm btn-ghost normal-case font-medium"
                on:click={goToday}>Today</button
            >
            <button
                class="btn btn-sm btn-circle btn-ghost"
                on:click={nextMonth}
            >
                <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5l7 7-7 7"
                    ></path></svg
                >
            </button>
        </div>
    </div>
    <div>
        <!-- Right side header options (view switch, settings, etc.) could go here -->
        <select class="select select-bordered select-sm">
            <option>Month</option>
            <option disabled>Week</option>
            <option disabled>Day</option>
        </select>
    </div>
</header>

<!-- Calendar Grid -->
<div class="flex-1 flex flex-col overflow-hidden relative">
    <!-- Weekday Headers -->
    <div
        class="grid grid-cols-8 border-b border-base-200 bg-base-100 flex-none ml-14"
    >
        {#each WEEKDAYS as wd, i}
            <div class="py-2 text-center border-l border-base-200">
                <div
                    class="text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-1"
                >
                    {wd}
                </div>
                <!-- Display date number for the current week (simplified for now to match current month view logic, but ideally this should be a week view) -->
                <!-- For this specific challenge request "Google Calendar Time Grid", I will stick to a week-like view or day columns -->
                <div class="text-2xl font-normal text-base-content/80">
                    {calendarDays[i]?.day || ""}
                </div>
            </div>
        {/each}
    </div>

    <!-- Time Grid Scrollable Area -->
    <div class="flex-1 overflow-y-auto relative flex">
        <!-- Time Labels Column -->
        <div
            class="w-14 flex-none bg-base-100 border-r border-base-200 text-xs text-base-content/60 text-right pr-2 pt-2 gap-[50px] flex flex-col"
        >
            {#each Array(24) as _, i}
                <div class="h-[60px] relative -top-2">
                    {String(i).padStart(2, "0")}:00
                </div>
            {/each}
        </div>

        <!-- Grid Lines & Events -->
        <div class="flex-1 grid grid-cols-7 relative">
            <!-- Background Grid Lines -->
            <div
                class="absolute inset-0 grid grid-rows-[repeat(24,60px)] z-0 pointer-events-none"
            >
                {#each Array(24) as _, i}
                    <div class="border-b border-base-200 w-full h-[60px]"></div>
                {/each}
            </div>
            <div
                class="absolute inset-0 grid grid-cols-7 z-0 pointer-events-none"
            >
                {#each Array(7) as _, i}
                    <div class="border-r border-base-200 w-full h-full"></div>
                {/each}
            </div>

            <!-- Days Columns for Events -->
            {#each Array(7) as _, dayIndex}
                <!-- We use the first 7 days of the generated calendarDays for this week view demo, 
                         or logic to select specific week. For now, taking first 7 for visualization as per prompt request structure over logic depth -->
                {@const currentDayDateStr = calendarDays[dayIndex]?.dateStr}
                <div
                    class="relative h-[1440px] group z-10"
                    on:drop={(e) => handleDrop(e, currentDayDateStr)}
                    on:dragover={handleDragOver}
                    on:click={(e) => {
                        // Calculate time based on click Y position
                        const rect = e.currentTarget.getBoundingClientRect();
                        const y =
                            e.clientY - rect.top + e.currentTarget.scrollTop; // Adjust for scroll if needed
                        const hour = Math.floor(y / 60);
                        openCreateForDay(currentDayDateStr);
                    }}
                >
                    {#if currentDayDateStr}
                        {#each getEventsForDay(currentDayDateStr) as ev (ev.id)}
                            {@const startHour = parseInt(
                                ev.start.split("T")[1].split(":")[0],
                            )}
                            {@const startMin = parseInt(
                                ev.start.split("T")[1].split(":")[1],
                            )}
                            {@const endHour = parseInt(
                                ev.end.split("T")[1].split(":")[0],
                            )}
                            {@const endMin = parseInt(
                                ev.end.split("T")[1].split(":")[1],
                            )}
                            {@const top = startHour * 60 + startMin}
                            {@const durationMinutes =
                                endHour * 60 + endMin - top}
                            {@const height = Math.max(durationMinutes, 30)}
                            <!-- Min height -->

                            <div
                                class="absolute left-1 right-1 rounded px-2 py-1 text-xs font-medium cursor-pointer bg-primary/20 text-primary-content border-l-2 border-primary hover:brightness-110 z-20 overflow-hidden"
                                style="top: {top}px; height: {height}px;"
                                draggable="true"
                                on:dragstart={(e) => handleDragStart(e, ev.id)}
                                on:click|stopPropagation={() =>
                                    openEventDetails(ev)}
                            >
                                <div class="font-bold">{ev.title}</div>
                                <div>
                                    {ev.start.split("T")[1].substring(0, 5)}
                                    - {ev.end.split("T")[1].substring(0, 5)}
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>

<!-- Create Event Modal -->
{#if $createModalStore.isOpen}
    <div class="modal modal-open">
        <div class="modal-box">
            <h3 class="text-lg font-bold">New Event</h3>
            <div class="form-control mt-4 w-full">
                <label class="label" for="evt-title">
                    <span class="label-text">Title</span>
                </label>
                <input
                    id="evt-title"
                    type="text"
                    bind:value={$createModalStore.title}
                    placeholder="Meeting, Lunch…"
                    class="input input-bordered w-full"
                />
            </div>
            <div class="mt-2 grid grid-cols-2 gap-3">
                <div class="form-control">
                    <label class="label" for="evt-sd">
                        <span class="label-text">Start Date</span>
                    </label>
                    <input
                        id="evt-sd"
                        type="date"
                        bind:value={$createModalStore.startDate}
                        class="input input-bordered"
                    />
                </div>
                <div class="form-control">
                    <label class="label" for="evt-st">
                        <span class="label-text">Start Time</span>
                    </label>
                    <input
                        id="evt-st"
                        type="time"
                        bind:value={$createModalStore.startTime}
                        class="input input-bordered"
                    />
                </div>
            </div>
            <div class="mt-2 grid grid-cols-2 gap-3">
                <div class="form-control">
                    <label class="label" for="evt-ed">
                        <span class="label-text">End Date</span>
                    </label>
                    <input
                        id="evt-ed"
                        type="date"
                        bind:value={$createModalStore.endDate}
                        class="input input-bordered"
                    />
                </div>
                <div class="form-control">
                    <label class="label" for="evt-et">
                        <span class="label-text">End Time</span>
                    </label>
                    <input
                        id="evt-et"
                        type="time"
                        bind:value={$createModalStore.endTime}
                        class="input input-bordered"
                    />
                </div>
            </div>
            <div class="modal-action">
                <button class="btn" on:click={closeCreateModal}>Cancel</button>
                <button class="btn btn-primary" on:click={handleCreate}
                    >Create</button
                >
            </div>
        </div>
        <div class="modal-backdrop" on:click={closeCreateModal}></div>
    </div>
{/if}

<!-- Event Details Modal -->
{#if showEventModal && selectedEvent}
    <div class="modal modal-open">
        <div class="modal-box">
            <div class="flex justify-between items-start">
                <h3 class="text-xl font-bold">{selectedEvent.title}</h3>
                <button
                    class="btn btn-sm btn-ghost btn-circle"
                    on:click={() => {
                        showEventModal = false;
                        selectedEvent = null;
                    }}>✕</button
                >
            </div>

            <div class="mt-4 space-y-3 text-sm">
                <div class="flex items-center gap-2 text-base-content/70">
                    <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path></svg
                    >
                    <span>
                        {new Date(selectedEvent.start).toLocaleDateString()}
                        {new Date(selectedEvent.start).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                        -
                        {new Date(selectedEvent.end).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </span>
                </div>
            </div>
            <div class="modal-action">
                <button
                    class="btn btn-outline btn-error btn-sm"
                    on:click={handleDelete}
                >
                    <svg
                        class="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        ></path></svg
                    >
                    Delete
                </button>
            </div>
        </div>
        <div
            class="modal-backdrop"
            on:click={() => {
                showEventModal = false;
                selectedEvent = null;
            }}
        ></div>
    </div>
{/if}

<style>
    /* Add any custom Google-like stylings here if Tailwind isn't enough */
</style>
