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

    $: days = buildCalendarMonth(currentDate);
    $: selectedDate = $selectedDateStore;

    function getEventsForDay(dateStr: string): CalendarEvent[] {
        return events.filter((e) => getDatePart(e.start) === dateStr);
    }

</script>

<div
    class="flex flex-col h-full bg-base-100 border border-base-200 rounded-lg overflow-hidden"
>
    <!-- Header Weekdays -->
    <div class="grid grid-cols-7 border-b border-base-200 bg-base-200/50">
        {#each WEEKDAYS as day}
            <div class="py-2 text-center text-sm font-semibold opacity-70">
                {day}
            </div>
        {/each}
    </div>

    <!-- Calendar Grid -->
    <div class="flex-1 grid grid-cols-7 grid-rows-6">
        {#each days as { day, dateStr, isCurrentMonth, isToday } (dateStr)}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
                class="border-b border-r border-base-200 min-h-[100px] p-1 relative transition-colors hover:bg-base-200/30 group
                {!isCurrentMonth ? 'bg-base-200/10 text-base-content/30' : ''}
                {isToday ? 'bg-primary/5' : ''}
                {selectedDate === dateStr ? 'ring-2 ring-primary ring-inset' : ''}"
                on:click={() => dispatch("dayClick", dateStr)}
            >
                <!-- Date Number -->
                <div class="flex justify-between items-start mb-1">
                    <span
                        class="text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                        {isToday ? 'bg-primary text-primary-content' : ''}"
                    >
                        {day}
                    </span>
                </div>

                <!-- Events List -->
                <div
                    class="flex flex-col gap-1 overflow-hidden max-h-[calc(100%-2rem)]"
                >
                    {#each getEventsForDay(dateStr).slice(0, 4) as event}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div
                            class="text-xs truncate px-1.5 py-0.5 rounded cursor-pointer bg-primary/20 hover:bg-primary/40 text-primary-content font-medium border-l-2 border-primary"
                            on:click|stopPropagation={() =>
                                dispatch("eventClick", event)}
                            title="{event.title} ({getTimePart(event.start)})"
                        >
                            {getTimePart(event.start)}
                            {event.title}
                        </div>
                    {/each}
                    {#if getEventsForDay(dateStr).length > 4}
                        <div
                            class="text-xs text-center text-base-content/50 font-medium hover:text-primary cursor-pointer"
                        >
                            + {getEventsForDay(dateStr).length - 4} mais
                        </div>
                    {/if}
                </div>
            </div>
        {/each}
    </div>
</div>
