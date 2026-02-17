<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { CalendarEvent } from "$lib/types";
    import {
        buildCalendarMonth,
        type CalendarDay,
        WEEKDAYS,
        getDatePart,
        isToday,
        getTimePart,
    } from "$lib/utils/dateUtils";
    import { selectedDateStore } from "$lib/stores";

    export let events: CalendarEvent[] = [];
    export let currentDate: Date;

    const dispatch = createEventDispatcher<{
        eventClick: CalendarEvent;
        dayClick: string;
    }>();

    let days: CalendarDay[] = [];
    const defaultEventColor = "#8ab4f8";

    $: days = buildCalendarMonth(currentDate);
    $: selectedDate = $selectedDateStore;

    let eventsByDay: Record<string, CalendarEvent[]> = {};

    $: {
        eventsByDay = {};
        events.forEach((e) => {
            const dateStr = getDatePart(e.start);
            if (!eventsByDay[dateStr]) eventsByDay[dateStr] = [];
            eventsByDay[dateStr].push(e);
        });
    }

    function getEventsForDay(dateStr: string): CalendarEvent[] {
        return eventsByDay[dateStr] || [];
    }
</script>

<div
    class="flex flex-col h-full overflow-hidden"
    style="background-color: var(--gcal-bg); border: 1px solid var(--gcal-border); border-radius: 8px;"
>
    <!-- Header Weekdays -->
    <div
        class="grid grid-cols-7"
        style="border-bottom: 1px solid var(--gcal-border);"
    >
        {#each WEEKDAYS as day}
            <div
                class="py-2.5 text-center text-[11px] font-medium tracking-wider"
                style="color: var(--gcal-text-muted);"
            >
                {day.toUpperCase()}
            </div>
        {/each}
    </div>

    <!-- Calendar Grid -->
    <div class="flex-1 grid grid-cols-7 grid-rows-6">
        {#each days as { day, dateStr, isCurrentMonth, isToday } (dateStr)}
            <button
                class="gcal-month-cell min-h-[100px] p-1.5 relative group text-left w-full align-top"
                class:is-other-month={!isCurrentMonth}
                class:is-selected={selectedDate === dateStr}
                on:click={() => dispatch("dayClick", dateStr)}
                type="button"
            >
                <!-- Date Number -->
                <div class="flex justify-start items-start mb-1">
                    <span
                        class="gcal-date-bubble text-xs font-medium"
                        class:is-today={isToday}
                        class:gcal-text-color={isCurrentMonth && !isToday}
                        class:gcal-text-muted-color={!isCurrentMonth}
                    >
                        {day}
                    </span>
                </div>

                <!-- Events List -->
                <div
                    class="flex flex-col gap-0.5 overflow-hidden max-h-[calc(100%-2rem)]"
                >
                    {#each getEventsForDay(dateStr).slice(0, 3) as event}
                        <button
                            class="gcal-text-color text-[11px] truncate px-1.5 py-0.5 rounded cursor-pointer font-medium transition-opacity hover:opacity-90 w-full text-left block mb-0.5 border-0"
                            style="
                                background-color: {event.color ||
                                defaultEventColor}33;
                                border-left: 3px solid {event.color ||
                                defaultEventColor};
                            "
                            on:click|stopPropagation={() =>
                                dispatch("eventClick", event)}
                            title="{event.title} ({getTimePart(event.start)})"
                            type="button"
                        >
                            <span
                                class="gcal-text-secondary-color"
                                style="margin-right: 2px;"
                                >{getTimePart(event.start)}</span
                            >
                            {event.title}
                        </button>
                    {/each}
                    {#if getEventsForDay(dateStr).length > 3}
                        <div
                            class="gcal-more-link text-[10px] text-center font-medium cursor-pointer px-1 py-0.5 rounded"
                        >
                            + {getEventsForDay(dateStr).length - 3} more
                        </div>
                    {/if}
                </div>
            </button>
        {/each}
    </div>
</div>
