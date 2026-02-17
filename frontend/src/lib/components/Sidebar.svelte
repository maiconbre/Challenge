<script lang="ts">
    import {
        openCreateModal,
        selectedDateStore,
        setSelectedDate,
        myCalendarsStore,
        otherCalendarsStore,
        toggleMyCalendar,
        toggleOtherCalendar,
        myCalendarsOpenStore,
        otherCalendarsOpenStore,
    } from "$lib/stores";
    import Icon from "./Icon.svelte";
    import { formatDateISO, buildCalendarMonth } from "$lib/utils/dateUtils";
    import { slide } from "svelte/transition";

    // Mini Calendar Logic
    let currentDate = new Date();

    $: year = currentDate.getFullYear();
    $: month = currentDate.getMonth();
    $: monthLabel = currentDate.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
    });

    $: days = buildCalendarMonth(currentDate).map((d) => ({
        day: d.day,
        dateStr: d.dateStr,
        current: d.isCurrentMonth,
        today: d.isToday,
    }));

    function prevMonth() {
        currentDate = new Date(year, month - 1, 1);
    }
    function nextMonth() {
        currentDate = new Date(year, month + 1, 1);
    }

    function handleDateClick(dateStr: string) {
        setSelectedDate(dateStr);
    }

    function handleCreate() {
        openCreateModal("", "");
    }

    function handleToggleMyCalendars() {
        myCalendarsOpenStore.update((v) => !v);
    }

    function handleToggleOtherCalendars() {
        otherCalendarsOpenStore.update((v) => !v);
    }
</script>

<aside
    class="flex flex-col h-full overflow-hidden gcal-bg-color gcal-border-subtle-right"
>
    <!-- Create Button - Google Style -->
    <div class="px-3 pt-4 pb-2">
        <button class="gcal-create-btn" on:click={handleCreate}>
            <Icon name="plus" size={36} className="text-[#8ab4f8]" />
            <span>Create</span>
        </button>
    </div>

    <!-- Mini Calendar -->
    <div class="px-4 pb-2 pt-2">
        <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium gcal-text-color">{monthLabel}</span
            >
            <div class="flex gap-0">
                <button
                    class="gcal-btn-icon"
                    style="width: 28px; height: 28px;"
                    on:click={prevMonth}
                    aria-label="Previous month"
                >
                    <Icon name="chevron-left" size={16} />
                </button>
                <button
                    class="gcal-btn-icon"
                    style="width: 28px; height: 28px;"
                    on:click={nextMonth}
                    aria-label="Next month"
                >
                    <Icon name="chevron-right" size={16} />
                </button>
            </div>
        </div>

        <!-- Weekday headers -->
        <div class="grid grid-cols-7 text-center mb-1">
            {#each ["S", "M", "T", "W", "T", "F", "S"] as dayLabel}
                <span
                    class="text-[10px] font-medium leading-8 gcal-text-muted-color"
                >
                    {dayLabel}
                </span>
            {/each}
        </div>

        <!-- Days grid -->
        <div class="grid grid-cols-7 text-center text-xs">
            {#each days as { day, dateStr, current, today }}
                <button
                    class="mini-cal-day"
                    class:is-current={current}
                    class:is-other={!current}
                    class:is-today={today}
                    class:is-selected={$selectedDateStore === dateStr && !today}
                    on:click={() => handleDateClick(dateStr)}
                >
                    {day}
                </button>
            {/each}
        </div>
    </div>

    <!-- Divider -->
    <div class="mx-4 gcal-border-subtle-bottom"></div>

    <!-- My Calendars (Collapsible) -->
    <div class="flex-1 overflow-y-auto px-4 pt-4 no-scrollbar">
        <div class="flex items-center justify-between mb-2">
            <h3
                class="text-xs font-medium tracking-wide gcal-text-secondary-color"
            >
                My calendars
            </h3>
            <button
                class="gcal-btn-icon section-toggle"
                style="width: 24px; height: 24px;"
                on:click={handleToggleMyCalendars}
                aria-label="Toggle My calendars"
                aria-expanded={$myCalendarsOpenStore}
            >
                <Icon
                    name="chevron-down"
                    size={12}
                    className="transition-transform duration-200 {!$myCalendarsOpenStore
                        ? 'rotate-180'
                        : ''}"
                />
            </button>
        </div>

        {#if $myCalendarsOpenStore}
            <ul class="space-y-0.5 calendar-section" transition:slide>
                {#each $myCalendarsStore as cal, i}
                    <li>
                        <button
                            class="gcal-sidebar-item"
                            on:click={() => toggleMyCalendar(i)}
                        >
                            <span class="gcal-checkbox-wrapper">
                                <span
                                    class="gcal-checkbox"
                                    class:checked={cal.checked}
                                    style="--cb-color: {cal.color};"
                                >
                                    {#if cal.checked}
                                        <Icon name="check-circle" size={12} />
                                    {/if}
                                </span>
                            </span>
                            <span
                                class="truncate"
                                class:gcal-text-color={cal.checked}
                                class:gcal-text-muted-color={!cal.checked}
                            >
                                {cal.label}
                            </span>
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}

        <!-- Divider -->
        <div class="my-3 gcal-border-subtle-bottom"></div>

        <!-- Other Calendars (Collapsible) -->
        <div class="flex items-center justify-between mb-2">
            <h3
                class="text-xs font-medium tracking-wide gcal-text-secondary-color"
            >
                Other calendars
            </h3>
            <div class="flex gap-0">
                <button
                    class="gcal-btn-icon"
                    style="width: 24px; height: 24px;"
                    aria-label="Add calendar"
                >
                    <Icon name="plus-sm" size={12} />
                </button>
                <button
                    class="gcal-btn-icon section-toggle"
                    style="width: 24px; height: 24px;"
                    on:click={handleToggleOtherCalendars}
                    aria-label="Toggle Other calendars"
                    aria-expanded={$otherCalendarsOpenStore}
                >
                    <Icon
                        name="chevron-down"
                        size={12}
                        className="transition-transform duration-200 {!$otherCalendarsOpenStore
                            ? 'rotate-180'
                            : ''}"
                    />
                </button>
            </div>
        </div>

        {#if $otherCalendarsOpenStore}
            <ul class="space-y-0.5 calendar-section" transition:slide>
                {#each $otherCalendarsStore as cal, i}
                    <li>
                        <button
                            class="gcal-sidebar-item"
                            on:click={() => toggleOtherCalendar(i)}
                        >
                            <span class="gcal-checkbox-wrapper">
                                <span
                                    class="gcal-checkbox"
                                    class:checked={cal.checked}
                                    style="--cb-color: {cal.color};"
                                >
                                    {#if cal.checked}
                                        <Icon name="check-circle" size={12} />
                                    {/if}
                                </span>
                            </span>
                            <span
                                class="truncate"
                                class:gcal-text-color={cal.checked}
                                class:gcal-text-muted-color={!cal.checked}
                            >
                                {cal.label}
                            </span>
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
</aside>

<style>
    .mini-cal-day {
        width: 26px;
        height: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        margin: 0 auto;
        cursor: pointer;
        transition: background-color 0.1s;
        border: none;
        background: transparent;
        font-size: 11px;
    }
    .mini-cal-day.is-current {
        color: var(--gcal-text);
    }
    .mini-cal-day.is-other {
        color: var(--gcal-text-muted);
    }
    .mini-cal-day.is-today {
        background-color: var(--gcal-today-bg) !important;
        color: white !important;
        font-weight: 700;
    }
    .mini-cal-day.is-selected {
        background-color: var(--gcal-blue-surface) !important;
        color: var(--gcal-blue) !important;
    }
    .mini-cal-day:hover:not(.is-today):not(.is-selected) {
        background-color: var(--gcal-hover);
    }

    /* Sidebar item */
    .gcal-sidebar-item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 6px 8px;
        border-radius: 4px;
        text-align: left;
        font-size: 13px;
        transition: background-color 0.1s;
        border: none;
        background: transparent;
        cursor: pointer;
    }
    .gcal-sidebar-item:hover {
        background-color: var(--gcal-hover);
    }

    /* Checkbox */
    .gcal-checkbox-wrapper {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .gcal-checkbox {
        width: 18px;
        height: 18px;
        border-radius: 3px;
        border: 2px solid var(--cb-color, #8ab4f8);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
        background: transparent;
        color: white;
    }
    .gcal-checkbox.checked {
        background-color: var(--cb-color, #8ab4f8);
        border-color: var(--cb-color, #8ab4f8);
    }

    /* Section animation */
    .calendar-section {
        overflow: hidden;
    }
</style>
