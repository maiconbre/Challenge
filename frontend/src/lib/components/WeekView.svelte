<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount, tick } from "svelte";
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
        dayClick: { dateStr: string; hour: number; minute: number };
        weekEdge: { direction: -1 | 1 };
    }>();

    let weekDays: Date[] = [];
    $: weekDays = getWeekDays(currentDate);
    $: selectedDate = $selectedDateStore;

    const defaultEventColor = "#8ab4f8";

    // Snap interval in minutes (30min = half hour)
    const SNAP_MINUTES = 30;
    const PIXELS_PER_SNAP = PIXELS_PER_HOUR / (60 / SNAP_MINUTES);

    // Current time indicator
    let currentTimeTop = 0;
    let currentTimeDayIndex = -1;
    let timeIntervalId: ReturnType<typeof setInterval>;

    function updateCurrentTime() {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        currentTimeTop = calculatePixelTop(hour, minute);

        const todayStr = formatDateISO(now);
        currentTimeDayIndex = weekDays.findIndex(
            (day) => formatDateISO(day) === todayStr,
        );
    }

    $: if (weekDays.length > 0) {
        updateCurrentTime();
    }

    // Scroll state
    let scrollContainer: HTMLDivElement;

    export function scrollToNow() {
        if (scrollContainer && currentTimeTop > 0) {
            const containerHeight = scrollContainer.clientHeight;
            // Center the time: top - half height
            const targetTop = Math.max(0, currentTimeTop - containerHeight / 2);
            scrollContainer.scrollTo({ top: targetTop, behavior: "smooth" });
        }
    }

    onMount(() => {
        updateCurrentTime();
        // Wait for DOM
        tick().then(() => {
            scrollToNow();
        });
        timeIntervalId = setInterval(updateCurrentTime, 60000);
    });

    onDestroy(() => {
        if (timeIntervalId) clearInterval(timeIntervalId);
    });

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
            tick().then(() => {
                setTimeout(() => {
                    slideClass = "";
                }, 300);
            });
        }
        prevDateKey = newKey;
    }

    // Reactively index events by day for O(1) lookups and ensured reactivity
    let eventsByDay: Record<string, CalendarEvent[]> = {};
    $: {
        eventsByDay = {};
        console.log(
            "[WeekView] Recalculating eventsByDay. Total events:",
            events.length,
        );
        events.forEach((e) => {
            const dateStr = getDatePart(e.start);
            if (!eventsByDay[dateStr]) {
                eventsByDay[dateStr] = [];
            }
            eventsByDay[dateStr].push(e);
        });
    }

    function getEventsForDay(
        date: Date,
        _cache: Record<string, CalendarEvent[]>,
    ): CalendarEvent[] {
        const dateStr = formatDateISO(date);
        return _cache[dateStr] || [];
    }

    function getEventTop(event: CalendarEvent) {
        const { hour, minute } = getHourAndMinute(event.start);
        return calculatePixelTop(hour, minute);
    }

    function getEventHeight(event: CalendarEvent) {
        const start = new Date(event.start);
        const end = new Date(event.end);
        const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
        return Math.max(
            (durationMinutes / 60) * PIXELS_PER_HOUR,
            PIXELS_PER_SNAP,
        );
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

    // Edge switching state
    let lastSwitchTime = 0;
    let edgeCheckInterval: ReturnType<typeof setInterval> | null = null;
    let lastClientX = 0;

    function getDayWidth(): number {
        if (!gridEl || !timeAxisEl || weekDays.length === 0) return 0;
        const rect = gridEl.getBoundingClientRect();
        const axisWidth = timeAxisEl.getBoundingClientRect().width;
        const availableWidth = rect.width - axisWidth;
        if (availableWidth <= 0) return 0;
        return availableWidth / weekDays.length;
    }

    function getDayIndexFromMouse(clientX: number): number {
        if (!gridEl || !timeAxisEl || weekDays.length === 0)
            return initialDayIndex;
        const rect = gridEl.getBoundingClientRect();
        const axisWidth = timeAxisEl.getBoundingClientRect().width;
        const availableWidth = rect.width - axisWidth;
        if (availableWidth <= 0) return initialDayIndex;
        const x = clientX - rect.left - axisWidth;
        const dayWidth = availableWidth / weekDays.length;
        const index = Math.floor(x / dayWidth);
        return Math.max(0, Math.min(weekDays.length - 1, index));
    }

    function getEdgeDirection(clientX: number): -1 | 1 | 0 {
        if (!gridEl || !timeAxisEl) return 0;
        const rect = gridEl.getBoundingClientRect();
        const axisWidth = timeAxisEl.getBoundingClientRect().width;
        const leftEdge = rect.left + axisWidth;
        const rightEdge = rect.right;
        if (clientX <= leftEdge + edgeThreshold) return -1;
        if (clientX >= rightEdge - edgeThreshold) return 1;
        return 0;
    }

    function checkEdgeSwitch() {
        const direction = getEdgeDirection(lastClientX);
        if (direction === 0) {
            if (edgeCheckInterval) {
                clearInterval(edgeCheckInterval);
                edgeCheckInterval = null;
            }
            return;
        }

        const now = Date.now();
        if (now - lastSwitchTime > 1000) {
            performSwitch(direction);
        }
    }

    function performSwitch(direction: -1 | 1) {
        lastSwitchTime = Date.now();
        hasSwitchedWeek = true;
        initialDayIndex = currentDayIndex;
        dragTranslateX = 0;
        dispatch("weekEdge", { direction });
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
        if (initialDayIndex < 0) initialDayIndex = 0;
        currentDayIndex = initialDayIndex;
        dragTranslateX = 0;
        hasSwitchedWeek = false;

        // Reset edge switching state
        lastSwitchTime = 0;
        if (edgeCheckInterval) clearInterval(edgeCheckInterval);
        edgeCheckInterval = null;

        window.addEventListener("mousemove", handleWindowMouseMove);
        window.addEventListener("mouseup", handleWindowMouseUp);
    }

    function handleWindowMouseMove(e: MouseEvent) {
        if (!draggingId) return;

        lastClientX = e.clientX;

        const deltaY = e.clientY - initialY;
        const rawTop = initialTop + deltaY;

        // Snap to 30-minute intervals
        currentTop = Math.round(rawTop / PIXELS_PER_SNAP) * PIXELS_PER_SNAP;
        // Clamp to grid bounds
        currentTop = Math.max(
            0,
            Math.min(currentTop, 24 * PIXELS_PER_HOUR - PIXELS_PER_SNAP),
        );

        currentDayIndex = getDayIndexFromMouse(e.clientX);
        const dayWidth = getDayWidth();
        dragTranslateX = (currentDayIndex - initialDayIndex) * dayWidth;

        const direction = getEdgeDirection(e.clientX);

        if (direction !== 0) {
            if (!edgeCheckInterval) {
                // Try to switch immediately if cooldown allows
                checkEdgeSwitch();
                // Then start interval for continuous switching
                edgeCheckInterval = setInterval(checkEdgeSwitch, 100);
            }
        } else {
            if (edgeCheckInterval) {
                clearInterval(edgeCheckInterval);
                edgeCheckInterval = null;
            }
        }
    }

    function handleWindowMouseUp(e: MouseEvent) {
        if (!draggingId) return;

        const event =
            draggingEvent || events.find((ev) => ev.id === draggingId);

        if (edgeCheckInterval) {
            clearInterval(edgeCheckInterval);
            edgeCheckInterval = null;
        }

        window.removeEventListener("mousemove", handleWindowMouseMove);
        window.removeEventListener("mouseup", handleWindowMouseUp);

        if (event) {
            const totalMinutes = (currentTop / PIXELS_PER_HOUR) * 60;
            const newHour = Math.floor(totalMinutes / 60);
            const newMinute = Math.round(totalMinutes % 60);
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
        if (edgeCheckInterval) clearInterval(edgeCheckInterval);
    });

    // 30-minute slot click handler
    function handleSlotClick(day: Date, hour: number, half: 0 | 1) {
        const minute = half * 30;
        dispatch("dayClick", {
            dateStr: formatDateISO(day),
            hour,
            minute,
        });
    }

    // Format time label for 30min slots
    function formatSlotTime(hour: number, half: 0 | 1): string {
        const h = hour.toString().padStart(2, "0");
        const m = half === 0 ? "00" : "30";
        return `${h}:${m}`;
    }
</script>

<div
    class="flex flex-col h-full overflow-hidden select-none"
    style="background-color: var(--gcal-bg);"
    data-testid="week-view"
>
    <!-- Header Weekdays -->
    <div
        class="flex pl-14 pr-2 flex-shrink-0"
        style="border-bottom: 1px solid var(--gcal-border);"
    >
        {#each weekDays as day}
            <div
                class="flex-1 text-center py-2"
                style="border-left: 1px solid var(--gcal-border);"
                data-testid="day-header"
            >
                <div
                    class="text-[11px] font-medium tracking-wide"
                    style="color: {formatDateISO(day) ===
                    formatDateISO(new Date())
                        ? 'var(--gcal-blue)'
                        : 'var(--gcal-text-muted)'};"
                >
                    {formatDayAbbrev(day).toUpperCase()}
                </div>
                <div
                    class="text-2xl font-normal mx-auto flex items-center justify-center"
                    style="width: 44px; height: 44px; border-radius: 50%;
                        {formatDateISO(day) === formatDateISO(new Date())
                        ? 'background-color: var(--gcal-today-bg); color: white; font-weight: 500;'
                        : `color: var(--gcal-text); cursor: pointer;`}"
                >
                    {day.getDate()}
                </div>
            </div>
        {/each}
    </div>

    <!-- Scrollable Grid -->
    <div
        class="flex-1 overflow-y-auto relative no-scrollbar"
        bind:this={scrollContainer}
    >
        <div
            class="flex relative {slideClass}"
            style="height: {24 * PIXELS_PER_HOUR}px; min-height: {24 *
                PIXELS_PER_HOUR}px;"
            bind:this={gridEl}
        >
            <!-- Time Axis -->
            <div
                class="flex-none sticky left-0 z-20"
                style="width: 56px; border-right: 1px solid var(--gcal-border); background-color: var(--gcal-bg);"
                bind:this={timeAxisEl}
            >
                {#each HOURS as hour}
                    <div class="relative" style="height: {PIXELS_PER_HOUR}px;">
                        {#if hour > 0}
                            <span
                                class="absolute right-2 text-[10px]"
                                style="top: -7px; color: var(--gcal-text-muted);"
                            >
                                {formatTime(hour)}
                            </span>
                        {/if}
                    </div>
                {/each}

                <!-- Current Time Dot on axis -->
                {#if currentTimeDayIndex >= 0}
                    <div
                        class="absolute right-0 z-30"
                        style="top: {currentTimeTop - 5}px;"
                    >
                        <div
                            style="width: 10px; height: 10px; border-radius: 50%; background-color: #ea4335; position: absolute; right: -5px;"
                        ></div>
                    </div>
                {/if}
            </div>

            <!-- Day Columns -->
            {#each weekDays as day, dayIndex}
                <div
                    class="flex-1 relative"
                    style="border-left: 1px solid var(--gcal-border); min-width: 120px;"
                >
                    <!-- 30-minute slots (2 per hour) -->
                    {#each HOURS as hour}
                        <!-- First half: :00 - :30 -->
                        <div
                            class="absolute w-full slot-half"
                            style="top: {hour *
                                PIXELS_PER_HOUR}px; height: {PIXELS_PER_SNAP}px; border-bottom: 1px dashed var(--gcal-border-subtle);"
                            on:click={() => handleSlotClick(day, hour, 0)}
                            role="gridcell"
                            tabindex="0"
                            aria-label="{formatSlotTime(hour, 0)} slot"
                            data-testid="time-slot"
                            on:keydown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    handleSlotClick(day, hour, 0);
                                    e.preventDefault();
                                }
                            }}
                        >
                            <div class="slot-hover"></div>
                        </div>
                        <!-- Second half: :30 - :00 -->
                        <div
                            class="absolute w-full slot-half"
                            style="top: {hour * PIXELS_PER_HOUR +
                                PIXELS_PER_SNAP}px; height: {PIXELS_PER_SNAP}px; border-bottom: 1px solid var(--gcal-border-subtle);"
                            on:click={() => handleSlotClick(day, hour, 1)}
                            role="gridcell"
                            tabindex="0"
                            aria-label="{formatSlotTime(hour, 1)} slot"
                            on:keydown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    handleSlotClick(day, hour, 1);
                                    e.preventDefault();
                                }
                            }}
                        >
                            <div class="slot-hover"></div>
                        </div>
                    {/each}

                    <!-- Current Time Line -->
                    {#if currentTimeDayIndex === dayIndex}
                        <div
                            class="current-time-line"
                            style="top: {currentTimeTop}px;"
                        >
                            <div class="current-time-dot"></div>
                        </div>
                    {/if}

                    <!-- Events -->
                    {#each getEventsForDay(day, eventsByDay) as event (event.id)}
                        {@const height = getEventHeight(event)}
                        {@const isSmall = height <= 30}
                        <div
                            class="absolute rounded cursor-move z-10 overflow-hidden text-xs event-card"
                            style="
                                left: 2px;
                                right: 2px;
                                top: {draggingId === event.id
                                ? currentTop
                                : getEventTop(event)}px;
                                height: {height}px;
                                z-index: {draggingId === event.id ? 50 : 10};
                                opacity: {draggingId === event.id ? 0.9 : 1};
                                transform: {draggingId === event.id
                                ? `translateX(${dragTranslateX}px) scale(1.02)`
                                : 'scale(1)'};
                                box-shadow: {draggingId === event.id
                                ? '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                                : '0 1px 2px rgba(0,0,0,.2)'};
                                transition: {draggingId === event.id
                                ? 'none'
                                : 'top 0.15s ease-out, height 0.15s ease-out'};
                                background-color: {event.color ||
                                defaultEventColor};
                                border-radius: var(--gcal-event-radius);
                                border-left: 4px solid {event.color ||
                                defaultEventColor};
                            "
                            on:mousedown={(e) => handleMouseDown(e, event)}
                            on:click|stopPropagation
                            role="button"
                            tabindex="0"
                            on:keydown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    dispatch("eventClick", event);
                                    e.preventDefault();
                                }
                            }}
                        >
                            <div
                                class="h-full {isSmall
                                    ? 'p-0.5 flex flex-row items-center gap-1'
                                    : 'p-1.5 flex flex-col'}"
                                style="background-color: rgba(0,0,0,0.1);"
                            >
                                <div
                                    class="font-medium truncate pointer-events-none text-white"
                                    style="font-size: {isSmall
                                        ? '11px'
                                        : '12px'}; flex-shrink: 0; max-width: {isSmall
                                        ? '60%'
                                        : '100%'};"
                                >
                                    {event.title}
                                </div>
                                {#if isSmall}
                                    <div
                                        class="truncate pointer-events-none text-white/80"
                                        style="font-size: 10px;"
                                    >
                                        {getTimePart(event.start)}
                                    </div>
                                {:else}
                                    <div
                                        class="truncate pointer-events-none text-white/80"
                                        style="font-size: 11px;"
                                    >
                                        {getTimePart(event.start)} – {getTimePart(
                                            event.end,
                                        )}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/each}

                    <!-- Ghost event during drag to different day -->
                    {#if draggingEvent && draggingId === draggingEvent.id && dayIndex === currentDayIndex && !getEventsForDay(day, eventsByDay).some((e) => e.id === draggingEvent?.id)}
                        {@const height = getEventHeight(draggingEvent)}
                        {@const isSmall = height <= 30}
                        <div
                            class="absolute rounded z-10 overflow-hidden text-xs pointer-events-none event-card"
                            style="
                                left: 2px;
                                right: 2px;
                                top: {currentTop}px;
                                height: {height}px;
                                z-index: 50;
                                opacity: 0.9;
                                transform: scale(1.02);
                                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
                                background-color: {draggingEvent.color ||
                                defaultEventColor};
                                border-radius: var(--gcal-event-radius);
                                border-left: 4px solid {draggingEvent.color ||
                                defaultEventColor};
                            "
                            role="button"
                            tabindex="0"
                        >
                            <div
                                class="h-full {isSmall
                                    ? 'p-0.5 flex flex-row items-center gap-1'
                                    : 'p-1.5 flex flex-col'}"
                                style="background-color: rgba(0,0,0,0.1);"
                            >
                                <div
                                    class="font-medium truncate pointer-events-none text-white"
                                    style="font-size: {isSmall
                                        ? '11px'
                                        : '12px'}; flex-shrink: 0; max-width: {isSmall
                                        ? '60%'
                                        : '100%'};"
                                >
                                    {draggingEvent.title}
                                </div>
                                {#if isSmall}
                                    <div
                                        class="truncate pointer-events-none text-white/80"
                                        style="font-size: 10px;"
                                    >
                                        {getTimePart(draggingEvent.start)}
                                    </div>
                                {:else}
                                    <div
                                        class="truncate pointer-events-none text-white/80"
                                        style="font-size: 11px;"
                                    >
                                        {getTimePart(draggingEvent.start)} – {getTimePart(
                                            draggingEvent.end,
                                        )}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>

<style>
    /* 30-min slot hover */
    .slot-half {
        position: absolute;
        cursor: pointer;
    }
    .slot-hover {
        position: absolute;
        inset: 0;
        background-color: var(--gcal-hover);
        opacity: 0;
        transition: opacity 0.1s;
        pointer-events: none;
    }

    /* Force hide scrollbar locally */
    .no-scrollbar::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        background: transparent !important;
    }
    .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none !important;
    }
    .slot-half:hover .slot-hover {
        opacity: 1;
    }

    /* Event card hover */
    .event-card {
        transition: filter 0.15s ease;
    }
    .event-card:hover {
        filter: brightness(1.1);
    }

    /* Current time indicator */
    .current-time-line {
        position: absolute;
        left: 0;
        right: 0;
        height: 2px;
        background-color: #ea4335;
        z-index: 60;
        pointer-events: none;
        display: block !important;
    }
    .current-time-dot {
        position: absolute;
        left: -6px;
        top: -4px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: #ea4335;
        z-index: 61;
        display: block !important;
    }
</style>
