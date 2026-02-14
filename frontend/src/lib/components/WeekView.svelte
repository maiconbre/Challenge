<script lang="ts">
    import { createEventDispatcher, onDestroy, tick } from "svelte";
    import type { CalendarEvent } from "$lib/types";
    import { selectedDateStore } from "$lib/stores";

    import {
        HOURS,
        PIXELS_PER_HOUR,
        formatTime,
        getTimePart,
        getWeekDays,
        formatDateISO,
        getDatePart,
        calculatePixelTop,
        getHourAndMinute,
        formatDayAbbrev,
    } from "$lib/utils/dateUtils";

    export let events: CalendarEvent[] = [];
    export let currentDate: Date;

    const dispatch = createEventDispatcher<{
        eventDrop: { event: CalendarEvent; newStart: Date };
        eventClick: CalendarEvent;
        dayClick: { dateStr: string; hour: number };
        weekEdge: { direction: -1 | 1 };
    }>();

    let weekDays: Date[] = [];
    $: weekDays = getWeekDays(currentDate);
    $: selectedDate = $selectedDateStore;

    const defaultEventColor = "#3b82f6";

    // Slide animation state
    let slideClass = "";
    let prevDateKey = "";

    $: {
        const newKey = formatDateISO(currentDate);
        if (prevDateKey && newKey !== prevDateKey) {
            const oldDate = new Date(prevDateKey + "T00:00:00");
            const direction =
                currentDate > oldDate ? "slide-from-right" : "slide-from-left";
            slideClass = direction;
            // Remove the class after animation completes
            tick().then(() => {
                setTimeout(() => {
                    slideClass = "";
                }, 300);
            });
        }
        prevDateKey = newKey;
    }

    function getEventsForDay(date: Date): CalendarEvent[] {
        const dateStr = formatDateISO(date);
        return events.filter((e) => getDatePart(e.start) === dateStr);
    }

    function getEventTop(event: CalendarEvent) {
        const { hour, minute } = getHourAndMinute(event.start);
        return calculatePixelTop(hour, minute);
    }

    function getEventHeight(event: CalendarEvent) {
        const start = new Date(event.start);
        const end = new Date(event.end);
        const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
        return Math.max(durationMinutes, 30);
    }

    // Drag and Drop State
    let draggingId: string | null = null;
    let draggingEvent: CalendarEvent | null = null;
    let initialY: number = 0;
    let initialTop: number = 0;
    let currentTop: number = 0;
    let initialDayIndex: number = 0;
    let currentDayIndex: number = 0;
    let dragTranslateX: number = 0;
    let gridEl: HTMLDivElement | null = null;
    let timeAxisEl: HTMLDivElement | null = null;
    let hasSwitchedWeek = false;
    const edgeThreshold = 32;

    function getDayWidth(): number {
        if (!gridEl || !timeAxisEl || weekDays.length === 0) {
            return 0;
        }
        const rect = gridEl.getBoundingClientRect();
        const axisWidth = timeAxisEl.getBoundingClientRect().width;
        const availableWidth = rect.width - axisWidth;
        if (availableWidth <= 0) {
            return 0;
        }
        return availableWidth / weekDays.length;
    }

    function getDayIndexFromMouse(clientX: number): number {
        if (!gridEl || !timeAxisEl || weekDays.length === 0) {
            return initialDayIndex;
        }
        const rect = gridEl.getBoundingClientRect();
        const axisWidth = timeAxisEl.getBoundingClientRect().width;
        const availableWidth = rect.width - axisWidth;
        if (availableWidth <= 0) {
            return initialDayIndex;
        }
        const x = clientX - rect.left - axisWidth;
        const dayWidth = availableWidth / weekDays.length;
        const index = Math.floor(x / dayWidth);
        return Math.max(0, Math.min(weekDays.length - 1, index));
    }

    function getEdgeDirection(clientX: number): -1 | 1 | 0 {
        if (!gridEl || !timeAxisEl) {
            return 0;
        }
        const rect = gridEl.getBoundingClientRect();
        const axisWidth = timeAxisEl.getBoundingClientRect().width;
        const leftEdge = rect.left + axisWidth;
        const rightEdge = rect.right;
        if (clientX <= leftEdge + edgeThreshold) {
            return -1;
        }
        if (clientX >= rightEdge - edgeThreshold) {
            return 1;
        }
        return 0;
    }

    function handleMouseDown(e: MouseEvent, event: CalendarEvent) {
        e.preventDefault();
        e.stopPropagation();

        draggingId = event.id;
        draggingEvent = event;
        initialY = e.clientY;
        initialTop = getEventTop(event);
        currentTop = initialTop;
        initialDayIndex = weekDays.findIndex(
            (day) => formatDateISO(day) === getDatePart(event.start),
        );
        if (initialDayIndex < 0) {
            initialDayIndex = 0;
        }
        currentDayIndex = initialDayIndex;
        dragTranslateX = 0;
        hasSwitchedWeek = false;

        window.addEventListener("mousemove", handleWindowMouseMove);
        window.addEventListener("mouseup", handleWindowMouseUp);
    }

    function handleWindowMouseMove(e: MouseEvent) {
        if (!draggingId) return;

        const deltaY = e.clientY - initialY;
        const rawTop = initialTop + deltaY;

        // Snap to hour (PIXELS_PER_HOUR)
        const snapGrid = PIXELS_PER_HOUR;
        currentTop = Math.round(rawTop / snapGrid) * snapGrid;
        currentDayIndex = getDayIndexFromMouse(e.clientX);
        const dayWidth = getDayWidth();
        dragTranslateX = (currentDayIndex - initialDayIndex) * dayWidth;

        const direction = getEdgeDirection(e.clientX);

        // Single switch per drag session
        if (direction !== 0 && !hasSwitchedWeek) {
            hasSwitchedWeek = true;
            initialDayIndex = currentDayIndex;
            dragTranslateX = 0;
            dispatch("weekEdge", { direction });
        }
    }

    function handleWindowMouseUp(e: MouseEvent) {
        if (!draggingId) return;

        const event = draggingEvent || events.find((e) => e.id === draggingId);

        window.removeEventListener("mousemove", handleWindowMouseMove);
        window.removeEventListener("mouseup", handleWindowMouseUp);

        if (event) {
            const totalMinutes = (currentTop / PIXELS_PER_HOUR) * 60;
            const newHour = Math.floor(totalMinutes / 60);
            const newMinute = Math.floor(totalMinutes % 60);
            const finalDayIndex = getDayIndexFromMouse(e.clientX);
            const targetDay =
                weekDays[finalDayIndex] || weekDays[initialDayIndex];
            const hasTimeChange = currentTop !== initialTop;
            const hasDayChange = finalDayIndex !== initialDayIndex;

            if (hasTimeChange || hasDayChange) {
                const newStart = new Date(event.start);
                newStart.setFullYear(
                    targetDay.getFullYear(),
                    targetDay.getMonth(),
                    targetDay.getDate(),
                );
                newStart.setHours(
                    Math.max(0, Math.min(23, newHour)),
                    newMinute,
                    0,
                    0,
                );

                dispatch("eventDrop", {
                    event: event,
                    newStart: newStart,
                });
            } else {
                dispatch("eventClick", event);
            }
        }
        draggingId = null;
        draggingEvent = null;
        dragTranslateX = 0;
    }

    onDestroy(() => {
        if (typeof window !== "undefined") {
            window.removeEventListener("mousemove", handleWindowMouseMove);
            window.removeEventListener("mouseup", handleWindowMouseUp);
        }
    });
</script>

<div class="flex flex-col h-full bg-base-100 overflow-hidden select-none">
    <!-- Header Weekdays -->
    <div class="flex border-b border-base-200 pl-12 pr-4 bg-base-100/95 z-10">
        {#each weekDays as day}
            <div
                class="flex-1 text-center py-2 border-l border-base-200 first:border-l-0"
            >
                <div
                    class="text-xs uppercase font-semibold text-base-content/60"
                >
                    {formatDayAbbrev(day)}
                </div>
                <div
                    class="text-lg font-normal rounded-full w-8 h-8 flex items-center justify-center mx-auto
                    {formatDateISO(day) === formatDateISO(new Date())
                        ? 'bg-primary text-primary-content'
                        : ''}"
                >
                    {day.getDate()}
                </div>
            </div>
        {/each}
    </div>

    <!-- Scrollable Grid -->
    <div class="flex-1 overflow-y-auto relative custom-scrollbar">
        <div
            class="flex relative min-h-[1440px] {slideClass}"
            style="height: {24 * PIXELS_PER_HOUR}px;"
            bind:this={gridEl}
        >
            <div
                class="w-12 flex-none border-r border-base-200 bg-base-100 sticky left-0 z-20"
                bind:this={timeAxisEl}
            >
                {#each HOURS as hour}
                    <div class="h-[60px] relative">
                        <span
                            class="absolute -top-3 right-1 text-xs text-base-content/50 pr-1"
                        >
                            {formatTime(hour)}
                        </span>
                    </div>
                {/each}
            </div>

            {#each weekDays as day, dayIndex}
                <div
                    class="flex-1 border-l border-base-200 first:border-l-0 relative min-w-[120px]
                        {selectedDate === formatDateISO(day)
                        ? 'ring-1 ring-primary/40 ring-inset'
                        : ''}"
                >
                    {#each HOURS as hour}
                        <div
                            class="absolute w-full border-b border-base-200/50 h-[60px] group transition-colors hover:bg-base-200/20"
                            style="top: {hour * PIXELS_PER_HOUR}px;"
                            on:click={() =>
                                dispatch("dayClick", {
                                    dateStr: formatDateISO(day),
                                    hour,
                                })}
                            role="gridcell"
                            tabindex="0"
                            aria-label="Time slot"
                            on:keydown={() => {}}
                        >
                            <div
                                class="absolute top-1/2 w-full border-t border-base-200/30 border-dashed"
                            ></div>
                        </div>
                    {/each}

                    {#each getEventsForDay(day) as event (event.id)}
                        <div
                            class="absolute left-1 right-1 rounded text-primary-content p-1 hover:brightness-110 transition-colors cursor-move z-10 overflow-hidden shadow-sm text-xs border"
                            style="
                                    top: {draggingId === event.id
                                ? currentTop
                                : getEventTop(event)}px;
                                    height: {getEventHeight(event)}px;
                                    z-index: {draggingId === event.id
                                ? 50
                                : 10};
                                    opacity: {draggingId === event.id
                                ? 0.9
                                : 1};
                                    transform: {draggingId === event.id
                                ? `translateX(${dragTranslateX}px) scale(1.02)`
                                : 'scale(1)'};
                                    box-shadow: {draggingId === event.id
                                ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                : ''};
                                    transition: {draggingId === event.id
                                ? 'none'
                                : 'top 0.1s ease-out, background-color 0.15s ease'};
                                    background-color: {event.color ||
                                defaultEventColor};
                                    border-color: {event.color ||
                                defaultEventColor};
                                "
                            on:mousedown={(e) => handleMouseDown(e, event)}
                            on:click|stopPropagation
                            role="button"
                            tabindex="0"
                            on:keydown={() => {}}
                        >
                            <div class="font-bold truncate pointer-events-none">
                                {event.title}
                            </div>
                            <div
                                class="opacity-80 truncate pointer-events-none"
                            >
                                {getTimePart(event.start)} - {getTimePart(
                                    event.end,
                                )}
                            </div>
                        </div>
                    {/each}
                    {#if draggingEvent && draggingId === draggingEvent.id && dayIndex === currentDayIndex && !getEventsForDay(day).some((e) => e.id === draggingEvent?.id)}
                        <div
                            class="absolute left-1 right-1 rounded text-primary-content p-1 hover:brightness-110 transition-colors cursor-move z-10 overflow-hidden shadow-sm text-xs border pointer-events-none"
                            style="
                                    top: {currentTop}px;
                                    height: {getEventHeight(draggingEvent)}px;
                                    z-index: 50;
                                    opacity: 0.9;
                                    transform: scale(1.02);
                                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                                    transition: none;
                                    background-color: {draggingEvent.color ||
                                defaultEventColor};
                                    border-color: {draggingEvent.color ||
                                defaultEventColor};
                                "
                            role="button"
                            tabindex="0"
                        >
                            <div class="font-bold truncate pointer-events-none">
                                {draggingEvent.title}
                            </div>
                            <div
                                class="opacity-80 truncate pointer-events-none"
                            >
                                {getTimePart(draggingEvent.start)} - {getTimePart(
                                    draggingEvent.end,
                                )}
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: rgba(156, 163, 175, 0.3);
        border-radius: 4px;
    }

    /* Week slide animations */
    :global(.slide-from-right) {
        animation: slideInRight 0.28s ease-out;
    }
    :global(.slide-from-left) {
        animation: slideInLeft 0.28s ease-out;
    }

    @keyframes slideInRight {
        from {
            opacity: 0.6;
            transform: translateX(40px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    @keyframes slideInLeft {
        from {
            opacity: 0.6;
            transform: translateX(-40px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
</style>
