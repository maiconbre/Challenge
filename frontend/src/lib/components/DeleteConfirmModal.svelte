<script lang="ts">
    import { createModalStore } from "$lib/stores";
    import Icon from "./Icon.svelte";

    export let isOpen = false;
    export let isRecurring = false;
    export let onClose: () => void;
    export let onConfirm: (deleteSeries: boolean) => void;

    let deleteMode: "single" | "series" = "single";

    function handleConfirm() {
        onConfirm(deleteMode === "series");
    }
</script>

{#if isOpen}
    <div
        class="gcal-modal-overlay"
        on:click={onClose}
        on:keydown={(e) => {
            if (e.key === "Escape") onClose();
        }}
        role="presentation"
    >
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            class="gcal-modal"
            style="width: 400px; max-width: 90vw;"
            role="dialog"
            aria-modal="true"
            data-testid="delete-confirm-modal"
            tabindex="-1"
            on:click|stopPropagation
        >
            <div class="gcal-modal-header">
                <h3 class="text-lg font-medium text-gray-100">Delete event?</h3>
                <button class="gcal-btn-icon" on:click={onClose}>
                    <Icon name="close" size={20} />
                </button>
            </div>

            <div class="gcal-modal-body text-gray-300">
                {#if isRecurring}
                    <p class="mb-4">This is a recurring event.</p>
                    <div class="flex flex-col gap-2">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                bind:group={deleteMode}
                                value="single"
                                class="gcal-radio"
                            />
                            <span>This event only</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                bind:group={deleteMode}
                                value="series"
                                class="gcal-radio"
                            />
                            <span>All events in this series</span>
                        </label>
                    </div>
                {:else}
                    <p>Are you sure you want to delete this event?</p>
                {/if}
            </div>

            <div class="gcal-modal-footer">
                <button class="gcal-btn-secondary" on:click={onClose}>
                    Cancel
                </button>
                <button
                    class="gcal-btn-delete"
                    on:click={handleConfirm}
                    data-testid="confirm-delete-btn"
                >
                    Delete
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .gcal-radio {
        accent-color: var(--gcal-primary);
        width: 18px;
        height: 18px;
    }
    .gcal-btn-delete {
        background-color: transparent;
        color: #f28b82;
        padding: 8px 16px;
        border-radius: 4px;
        font-weight: 500;
        transition: background-color 0.2s;
    }
    .gcal-btn-delete:hover {
        background-color: rgba(242, 139, 130, 0.1);
    }
    .gcal-btn-secondary {
        color: #e8eaed;
        padding: 8px 16px;
        border-radius: 4px;
        font-weight: 500;
    }
    .gcal-btn-secondary:hover {
        background-color: rgba(255, 255, 255, 0.04);
    }
</style>
