<script lang="ts">
    import { onMount } from "svelte";
    import type { CalendarEvent } from "$lib/types";
    import { fetchEvents, createEvent, deleteEvent } from "$lib/api";

    let events: CalendarEvent[] = [];
    let currentDate = new Date();
    let loading = true;

    // Modal state
    let showCreateModal = false;
    let showEventModal = false;
    let selectedEvent: CalendarEvent | null = null;

    // Form state
    let title = "";
    let startDate = "";
    let startTime = "09:00";
    let endDate = "";
    let endTime = "10:00";

    // Reactive calendar computations
    $: currentYear = currentDate.getFullYear();
    $: currentMonth = currentDate.getMonth();
    $: monthLabel = currentDate.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
    });
    $: calendarDays = buildCalendarDays(currentYear, currentMonth);

    const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const BADGE_COLORS = [
        "badge-primary",
        "badge-secondary",
        "badge-accent",
        "badge-info",
        "badge-success",
        "badge-warning",
    ];

    function buildCalendarDays(year: number, month: number): (number | null)[] {
        const firstDayOfWeek = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const days: (number | null)[] = [];
        for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
        for (let d = 1; d <= totalDays; d++) days.push(d);
        return days;
    }

    function getEventsForDay(day: number): CalendarEvent[] {
        return events.filter((e) => {
            const d = new Date(e.start);
            return (
                d.getFullYear() === currentYear &&
                d.getMonth() === currentMonth &&
                d.getDate() === day
            );
        });
    }

    function isToday(day: number): boolean {
        const now = new Date();
        return (
            now.getFullYear() === currentYear &&
            now.getMonth() === currentMonth &&
            now.getDate() === day
        );
    }

    function badgeColor(text: string): string {
        let hash = 0;
        for (let i = 0; i < text.length; i++)
            hash = text.charCodeAt(i) + ((hash << 5) - hash);
        return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
    }

    function prevMonth(): void {
        currentDate = new Date(currentYear, currentMonth - 1, 1);
    }

    function nextMonth(): void {
        currentDate = new Date(currentYear, currentMonth + 1, 1);
    }

    function goToday(): void {
        currentDate = new Date();
    }

    function openCreateForDay(day?: number): void {
        const d = day
            ? `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            : new Date().toISOString().split("T")[0];
        startDate = d;
        endDate = d;
        title = "";
        startTime = "09:00";
        endTime = "10:00";
        showCreateModal = true;
    }

    function openEventDetails(event: CalendarEvent): void {
        selectedEvent = event;
        showEventModal = true;
    }

    async function handleCreate(): Promise<void> {
        if (!title.trim() || !startDate || !endDate) return;
        const created = await createEvent({
            title: title.trim(),
            start: `${startDate}T${startTime}:00`,
            end: `${endDate}T${endTime}:00`,
        });
        if (created) {
            events = [...events, created];
            showCreateModal = false;
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

<!-- Navbar -->
<div class="navbar bg-primary text-primary-content shadow-lg">
    <div class="flex-1 gap-2">
        <span class="text-xl font-bold">📅 Mini Calendar</span>
    </div>
    <div class="flex-none gap-2">
        <button class="btn btn-ghost btn-sm" on:click={goToday}>Today</button>
        <button
            class="btn btn-ghost btn-circle btn-sm"
            on:click={() => openCreateForDay()}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4v16m8-8H4"
                />
            </svg>
        </button>
    </div>
</div>

<main class="min-h-screen bg-base-200 p-4 md:p-8">
    <div class="mx-auto max-w-5xl">
        <!-- Month Navigation -->
        <div class="mb-4 flex items-center justify-between">
            <button class="btn btn-circle btn-ghost" on:click={prevMonth}
                >◀</button
            >
            <h2 class="text-2xl font-bold">{monthLabel}</h2>
            <button class="btn btn-circle btn-ghost" on:click={nextMonth}
                >▶</button
            >
        </div>

        <!-- Calendar -->
        {#if loading}
            <div class="flex justify-center py-20">
                <span class="loading loading-spinner loading-lg text-primary"
                ></span>
            </div>
        {:else}
            <div
                class="grid grid-cols-7 overflow-hidden rounded-xl bg-base-300 shadow-lg"
            >
                <!-- Weekday Headers -->
                {#each WEEKDAYS as wd}
                    <div
                        class="bg-base-100 p-2 text-center text-sm font-semibold"
                    >
                        {wd}
                    </div>
                {/each}

                <!-- Day Cells -->
                {#each calendarDays as day}
                    <button
                        class="min-h-[90px] border border-base-300 bg-base-100 p-1 text-left transition-colors hover:bg-base-200 md:min-h-[110px]"
                        class:opacity-30={day === null}
                        disabled={day === null}
                        on:click={() => day && openCreateForDay(day)}
                    >
                        {#if day}
                            <span
                                class="inline-block rounded-full px-1.5 text-xs font-medium"
                                class:bg-primary={isToday(day)}
                                class:text-primary-content={isToday(day)}
                            >
                                {day}
                            </span>
                            <div class="mt-0.5 space-y-0.5">
                                {#each getEventsForDay(day) as ev}
                                    <button
                                        class="badge badge-sm w-full cursor-pointer justify-start truncate {badgeColor(
                                            ev.title,
                                        )}"
                                        on:click|stopPropagation={() =>
                                            openEventDetails(ev)}
                                    >
                                        {ev.title}
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</main>

<!-- Create Event Modal -->
{#if showCreateModal}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal modal-open">
        <div class="modal-box">
            <h3 class="text-lg font-bold">New Event</h3>
            <div class="form-control mt-4 w-full">
                <label class="label" for="evt-title"
                    ><span class="label-text">Title</span></label
                >
                <input
                    id="evt-title"
                    type="text"
                    bind:value={title}
                    placeholder="Meeting, Lunch…"
                    class="input input-bordered w-full"
                />
            </div>
            <div class="mt-2 grid grid-cols-2 gap-3">
                <div class="form-control">
                    <label class="label" for="evt-sd"
                        ><span class="label-text">Start Date</span></label
                    >
                    <input
                        id="evt-sd"
                        type="date"
                        bind:value={startDate}
                        class="input input-bordered"
                    />
                </div>
                <div class="form-control">
                    <label class="label" for="evt-st"
                        ><span class="label-text">Start Time</span></label
                    >
                    <input
                        id="evt-st"
                        type="time"
                        bind:value={startTime}
                        class="input input-bordered"
                    />
                </div>
            </div>
            <div class="mt-2 grid grid-cols-2 gap-3">
                <div class="form-control">
                    <label class="label" for="evt-ed"
                        ><span class="label-text">End Date</span></label
                    >
                    <input
                        id="evt-ed"
                        type="date"
                        bind:value={endDate}
                        class="input input-bordered"
                    />
                </div>
                <div class="form-control">
                    <label class="label" for="evt-et"
                        ><span class="label-text">End Time</span></label
                    >
                    <input
                        id="evt-et"
                        type="time"
                        bind:value={endTime}
                        class="input input-bordered"
                    />
                </div>
            </div>
            <div class="modal-action">
                <button class="btn" on:click={() => (showCreateModal = false)}
                    >Cancel</button
                >
                <button class="btn btn-primary" on:click={handleCreate}
                    >Create</button
                >
            </div>
        </div>
        <div
            class="modal-backdrop"
            on:click={() => (showCreateModal = false)}
        ></div>
    </div>
{/if}

<!-- Event Details Modal -->
{#if showEventModal && selectedEvent}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal modal-open">
        <div class="modal-box">
            <h3 class="text-lg font-bold">{selectedEvent.title}</h3>
            <div class="mt-2 space-y-1 text-sm">
                <p>
                    <strong>Start:</strong>
                    {new Date(selectedEvent.start).toLocaleString()}
                </p>
                <p>
                    <strong>End:</strong>
                    {new Date(selectedEvent.end).toLocaleString()}
                </p>
            </div>
            <div class="modal-action">
                <button
                    class="btn"
                    on:click={() => {
                        showEventModal = false;
                        selectedEvent = null;
                    }}>Close</button
                >
                <button class="btn btn-error" on:click={handleDelete}
                    >Delete</button
                >
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
