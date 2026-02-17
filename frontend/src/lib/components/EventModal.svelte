<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import {
        createModalStore,
        closeCreateModal,
        toastStore,
        showToast,
    } from "$lib/stores";
    import Icon from "./Icon.svelte";

    export let editMode: boolean = false;
    export let editingEventId: string | null = null;
    export let eventColors: string[] = [];
    export let isSaving: boolean = false;

    const dispatch = createEventDispatcher<{
        save: void;
        delete: void;
    }>();

    const recurrenceLabels: Record<string, string> = {
        none: "Does not repeat",
        daily: "Daily",
        weekly: "Weekly",
        monthly: "Monthly",
        yearly: "Annually",
    };

    const notificationOptions = [
        { value: 0, label: "None" },
        { value: 5, label: "5 minutes before" },
        { value: 10, label: "10 minutes before" },
        { value: 15, label: "15 minutes before" },
        { value: 30, label: "30 minutes before" },
        { value: 60, label: "1 hour before" },
    ];

    function closeModal() {
        editMode = false;
        editingEventId = null;
        closeCreateModal();
    }

    function handleSaveClick() {
        dispatch("save");
    }

    function handleDeleteClick() {
        dispatch("delete");
    }

    function focus(node: HTMLElement) {
        node.focus();
    }
</script>

{#if $createModalStore.isOpen}
    <div
        class="gcal-modal-overlay"
        on:click={closeModal}
        on:keydown={(e) => {
            if (e.key === "Escape") closeModal();
        }}
        role="presentation"
    >
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            class="gcal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-modal-title"
            data-testid="event-modal"
            tabindex="-1"
            on:click|stopPropagation
        >
            <!-- Color bar on top for edit mode -->
            {#if editMode}
                <div
                    class="gcal-modal-color-bar"
                    style="background-color: {$createModalStore.color};"
                ></div>
            {/if}

            <!-- Header -->
            <div class="gcal-modal-header">
                <div class="gcal-drag-handle">
                    <div class="drag-dots"></div>
                </div>
                <button
                    class="gcal-btn-icon"
                    on:click={closeModal}
                    aria-label="Close"
                >
                    <Icon name="close" size={20} />
                </button>
            </div>

            <div class="gcal-modal-body">
                <!-- Title -->
                <label for="event-title" class="sr-only">Event title</label>
                <input
                    id="event-title"
                    type="text"
                    class="gcal-title-input"
                    bind:value={$createModalStore.title}
                    placeholder="Add title"
                    data-testid="event-title-input"
                    use:focus
                />

                <!-- Date/Time -->
                <div class="gcal-datetime-row">
                    <Icon
                        name="clock"
                        size={24}
                        className="gcal-row-icon flex-shrink-0"
                    />
                    <div class="gcal-datetime-content">
                        <div class="gcal-datetime-line">
                            <label for="event-start-date" class="sr-only"
                                >Start date</label
                            >
                            <input
                                id="event-start-date"
                                type="date"
                                class="gcal-date-input"
                                bind:value={$createModalStore.startDate}
                                on:change={() => {
                                    $createModalStore.endDate =
                                        $createModalStore.startDate;
                                }}
                            />
                            <span class="gcal-time-separator">&nbsp;</span>
                            <label for="event-start-time" class="sr-only"
                                >Start time</label
                            >
                            <input
                                id="event-start-time"
                                type="time"
                                class="gcal-time-input"
                                bind:value={$createModalStore.startTime}
                            />
                            <span class="gcal-time-dash">–</span>
                            <label for="event-end-time" class="sr-only"
                                >End time</label
                            >
                            <input
                                id="event-end-time"
                                type="time"
                                class="gcal-time-input"
                                bind:value={$createModalStore.endTime}
                            />
                        </div>
                        <div class="gcal-timezone-hint">
                            Time zone · {recurrenceLabels[
                                $createModalStore.recurrence
                            ]}
                        </div>
                    </div>
                </div>

                <!-- Recurrence -->
                <div class="gcal-field-row">
                    <Icon
                        name="calendar"
                        size={24}
                        className="gcal-row-icon flex-shrink-0"
                    />
                    <label for="event-recurrence" class="sr-only"
                        >Recurrence</label
                    >
                    <select
                        id="event-recurrence"
                        class="gcal-select"
                        bind:value={$createModalStore.recurrence}
                    >
                        <option value="none">Does not repeat</option>

                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Annually</option>
                    </select>
                </div>

                <!-- Location -->
                <div class="gcal-field-row">
                    <Icon
                        name="location"
                        size={24}
                        className="gcal-row-icon flex-shrink-0"
                    />
                    <label for="event-location" class="sr-only">Location</label>
                    <input
                        id="event-location"
                        type="text"
                        class="gcal-field-input"
                        bind:value={$createModalStore.location}
                        placeholder="Add location"
                    />
                </div>

                <!-- Notification -->
                <div class="gcal-field-row">
                    <Icon
                        name="bell"
                        size={24}
                        className="gcal-row-icon flex-shrink-0"
                    />
                    <label for="event-notification" class="sr-only"
                        >Notification</label
                    >
                    <select
                        id="event-notification"
                        class="gcal-select"
                        bind:value={$createModalStore.notification}
                    >
                        {#each notificationOptions as opt}
                            <option value={opt.value}>{opt.label}</option>
                        {/each}
                    </select>
                </div>

                <!-- Description -->
                <div class="gcal-field-row" style="align-items: flex-start;">
                    <Icon
                        name="description"
                        size={24}
                        className="gcal-row-icon flex-shrink-0"
                    />
                    <label for="event-description" class="sr-only"
                        >Description</label
                    >
                    <textarea
                        id="event-description"
                        class="gcal-textarea"
                        bind:value={$createModalStore.description}
                        placeholder="Add description"
                        rows="3"
                    ></textarea>
                </div>

                <!-- Color -->
                <div class="gcal-field-row">
                    <Icon
                        name="palette"
                        size={24}
                        className="gcal-row-icon flex-shrink-0"
                    />
                    <div class="gcal-color-row">
                        {#each eventColors as color}
                            <button
                                class="gcal-color-dot"
                                class:selected={$createModalStore.color ===
                                    color}
                                style="background-color: {color}; box-shadow: {$createModalStore.color ===
                                color
                                    ? `0 0 0 2px var(--gcal-bg), 0 0 0 3.5px ${color}`
                                    : 'none'};"
                                on:click={() =>
                                    ($createModalStore = {
                                        ...$createModalStore,
                                        color,
                                    })}
                                aria-label="Select color {color}"
                            />
                        {/each}
                    </div>
                </div>
            </div>

            <div class="gcal-modal-footer">
                {#if editMode}
                    <button
                        class="gcal-btn-danger"
                        on:click={handleDeleteClick}
                        data-testid="event-delete-btn">Delete</button
                    >
                    <div class="flex-1"></div>
                {/if}
                <button
                    class="gcal-btn-save"
                    on:click={handleSaveClick}
                    data-testid="event-save-btn"
                    disabled={isSaving}
                    class:opacity-50={isSaving}
                    class:cursor-not-allowed={isSaving}
                >
                    {#if isSaving}
                        Saving...
                    {:else}
                        {editMode ? "Update" : "Save"}
                    {/if}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
    }
</style>
