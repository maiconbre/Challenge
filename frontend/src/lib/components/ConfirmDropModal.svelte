<script lang="ts">
    import type { CalendarEvent } from "$lib/types";

    export let isOpen = false;
    export let pendingEvent: {
        event: CalendarEvent;
        newStart: Date;
        newEnd: Date;
    } | null = null;
    export let onConfirm: () => void;
    export let onCancel: () => void;
</script>

{#if isOpen && pendingEvent}
    <div
        class="gcal-modal-overlay"
        on:click={onCancel}
        on:keydown={(e) => {
            if (e.key === "Escape") onCancel();
        }}
        role="presentation"
    >
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <div
            class="gcal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-drop-title"
            style="max-width: 380px;"
            tabindex="-1"
            on:click|stopPropagation
            on:keydown={(e) => e.stopPropagation()}
        >
            <div class="p-6">
                <h3
                    id="confirm-drop-title"
                    class="text-base font-medium mb-3"
                    style="color: var(--gcal-text);"
                >
                    Confirm Change
                </h3>
                <p class="text-sm" style="color: var(--gcal-text-secondary);">
                    Move <strong style="color: var(--gcal-text);"
                        >"{pendingEvent.event.title}"</strong
                    >
                    to
                    <strong style="color: var(--gcal-blue);">
                        {pendingEvent.newStart.toLocaleDateString("en-US")} at
                        {pendingEvent.newStart.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </strong>?
                </p>
            </div>
            <div class="gcal-modal-footer">
                <button class="gcal-btn-secondary" on:click={onCancel}
                    >Cancel</button
                >
                <button class="gcal-btn-primary" on:click={onConfirm}
                    >Confirm</button
                >
            </div>
        </div>
    </div>
{/if}
