<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import Icon from "./Icon.svelte";
    import { toggleSidebar } from "$lib/stores";

    export let headerLabel: string;
    export let viewMode: "week" | "month";

    const dispatch = createEventDispatcher<{
        prev: void;
        next: void;
        today: void;
        viewChange: "week" | "month";
    }>();

    let showViewDropdown = false;

    function selectView(mode: "week" | "month") {
        dispatch("viewChange", mode);
        showViewDropdown = false;
    }

    function closeViewDropdown() {
        showViewDropdown = false;
    }
</script>

<header
    class="flex-none flex items-center justify-between px-2 py-2"
    style="border-bottom: 1px solid var(--gcal-border); background-color: var(--gcal-bg);"
>
    <div class="flex items-center gap-2">
        <!-- Hamburger Menu -->
        <button class="gcal-btn-icon" on:click={toggleSidebar} title="Menu">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
        </button>

        <!-- Calendar Icon -->
        <div class="flex items-center gap-2 ml-1">
            <svg
                width="36"
                height="36"
                viewBox="0 0 36 36"
                fill="none"
                class="flex-shrink-0"
            >
                <rect
                    x="4"
                    y="6"
                    width="28"
                    height="26"
                    rx="3"
                    fill="#8ab4f8"
                />
                <rect x="4" y="6" width="28" height="8" rx="3" fill="#5e97f6" />
                <text
                    x="18"
                    y="28"
                    text-anchor="middle"
                    fill="#1f1f1f"
                    font-size="14"
                    font-weight="700"
                    font-family="Google Sans, Roboto, sans-serif"
                >
                    {new Date().getDate()}
                </text>
                <rect x="11" y="3" width="2" height="6" rx="1" fill="#5e97f6" />
                <rect x="23" y="3" width="2" height="6" rx="1" fill="#5e97f6" />
            </svg>
            <span
                class="text-xl font-normal hidden sm:inline"
                style="color: var(--gcal-text); font-family: 'Google Sans', sans-serif;"
            >
                Calendar
            </span>
        </div>

        <!-- Today Button -->
        <button
            class="gcal-btn-today ml-4"
            on:click={() => dispatch("today")}
            title="Back to today"
            data-testid="today-btn"
        >
            Today
        </button>

        <!-- Navigation Arrows -->
        <div class="flex items-center gap-0">
            <button
                class="gcal-btn-nav"
                on:click={() => dispatch("prev")}
                title="Previous"
                data-testid="prev-btn"
            >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
            </button>
            <button
                class="gcal-btn-nav"
                on:click={() => dispatch("next")}
                title="Next"
                data-testid="next-btn"
            >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
            </button>
        </div>

        <!-- Month/Year Label -->
        <h2
            class="text-[22px] font-normal ml-2 capitalize whitespace-nowrap"
            style="color: var(--gcal-text); font-family: 'Google Sans', sans-serif;"
            data-testid="header-label"
        >
            {headerLabel}
        </h2>
    </div>

    <!-- Right Side -->
    <div class="flex items-center gap-2">
        <!-- View Mode Dropdown -->
        <div class="relative z-50">
            <button
                class="gcal-view-switcher"
                on:click={() => (showViewDropdown = !showViewDropdown)}
                data-testid="view-switcher"
            >
                {viewMode === "week" ? "Week" : "Month"}
                <Icon name="chevron-down" size={16} />
            </button>

            {#if showViewDropdown}
                <div
                    class="gcal-dropdown-panel absolute right-0 mt-1 py-1 min-w-[140px] rounded shadow-lg z-[60]"
                >
                    <button
                        class="gcal-dropdown-item w-full text-left px-4 py-2 text-sm flex items-center justify-between"
                        class:active={viewMode === "week"}
                        on:click={() => selectView("week")}
                        data-testid="view-week"
                    >
                        Week
                        <span class="text-xs gcal-text-muted-color">W</span>
                    </button>
                    <button
                        class="gcal-dropdown-item w-full text-left px-4 py-2 text-sm flex items-center justify-between"
                        class:active={viewMode === "month"}
                        on:click={() => selectView("month")}
                        data-testid="view-month"
                    >
                        Month
                        <span class="text-xs gcal-text-muted-color">M</span>
                    </button>
                </div>

                <!-- Backdrop to close dropdown -->
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                    class="fixed inset-0 z-[55]"
                    on:click={closeViewDropdown}
                ></div>
            {/if}
        </div>
    </div>
</header>
